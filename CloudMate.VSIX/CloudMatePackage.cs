using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using EnvDTE;
using Microsoft.VisualStudio;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Interop;
using Microsoft.VisualStudio.Threading;

namespace AngryMonkey.CloudMate.VisualStudio;

/// <summary>
/// CloudMate VS package. Registers the command table resource and initializes all commands.
/// The package GUID must match the <c>guidCloudMatePackage</c> symbol in <c>CloudMatePackage.vsct</c>
/// and the <c>[PackageRegistration]</c> entry in the generated <c>.pkgdef</c>.
/// </summary>
[PackageRegistration(UseManagedResourcesOnly = true, AllowsBackgroundLoading = true)]
[Guid(PackageGuidString)]
[ProvideMenuResource("Menus.ctmenu", 1)]
// Auto-load so BeforeQueryStatus visibility filtering works before any command is executed.
// Without this the package stays unloaded and VS shows the raw VSCT defaults on right-click.
[ProvideAutoLoad(VSConstants.UICONTEXT.SolutionExistsAndFullyLoaded_string, PackageAutoLoadFlags.BackgroundLoad)]
[ProvideAutoLoad(VSConstants.UICONTEXT.SolutionHasSingleProject_string, PackageAutoLoadFlags.BackgroundLoad)]
[ProvideAutoLoad(VSConstants.UICONTEXT.SolutionHasMultipleProjects_string, PackageAutoLoadFlags.BackgroundLoad)]
public sealed class CloudMatePackage : AsyncPackage, IVsSolutionEvents
{
    public const string PackageGuidString = "A1B2C3D4-E5F6-7890-ABCD-EF1234567890";

    private IVsSolution? _solution;
    private uint _solutionEventsCookie;
    private Timer? _watchSyncTimer;
    private readonly object _watchSyncLock = new();

    /// <summary>
    /// Projects load one by one and each load raises an event. Waiting out a short quiet period means
    /// a solution with many projects arms the watch once, with the complete project set.
    /// </summary>
    private static readonly TimeSpan WatchSyncDelay = TimeSpan.FromSeconds(2);

    protected override async Task InitializeAsync(CancellationToken cancellationToken, IProgress<ServiceProgressData> progress)
    {
        await base.InitializeAsync(cancellationToken, progress);

        // Switch to the UI thread before touching VS services.
        await JoinableTaskFactory.SwitchToMainThreadAsync(cancellationToken);

        await Commands.CompileVsCommand.InitializeAsync(this);
        await Commands.StopCompilingVsCommand.InitializeAsync(this);
        await Commands.CompressFolderVsCommand.InitializeAsync(this);
        await Commands.RecompressFolderVsCommand.InitializeAsync(this);
        await Commands.StopCompressingVsCommand.InitializeAsync(this);
        await Commands.BuildVsCommand.InitializeAsync(this);
        await Commands.CleanConfigVsCommand.InitializeAsync(this);
        await Commands.AutoConfigureVsCommand.InitializeAsync(this);

        // Solution events keep watch in sync with what is actually open: projects that finish loading
        // after this point are picked up, and closing the solution stops watching.
        if (await GetServiceAsync(typeof(SVsSolution)) is IVsSolution solution)
        {
            _solution = solution;
            solution.AdviseSolutionEvents(this, out _solutionEventsCookie);
        }

        AsyncPackage package = this;
        _ = Task.Run(() => MateRunner.KillOrphanedWatchProcesses(line => OutputLine(package, line)));

        ScheduleWatchSync();
    }

    // ─── Output pane ─────────────────────────────────────────────────────────

    private static IVsOutputWindowPane? _outputPane;
    private static readonly Guid OutputPaneGuid = new("C7F54A2E-1B3D-4E8F-9A0B-2D5E6F789012");
    private static readonly ConcurrentQueue<string> OutputQueue = new();
    private static int _outputFlushScheduled;

    /// <summary>
    /// Writes a line to the "CloudMate" output pane, creating it on first use.
    /// Safe to call from any thread: pane creation and activation are marshaled to the UI
    /// thread via fire-and-forget so the calling thread is never blocked.
    /// </summary>
    internal static void OutputLine(AsyncPackage package, string message)
    {
        OutputQueue.Enqueue(message);
        ScheduleOutputFlush(package);
    }

    private static void ScheduleOutputFlush(AsyncPackage package)
    {
        if (Interlocked.CompareExchange(ref _outputFlushScheduled, 1, 0) != 0)
            return;

        package.JoinableTaskFactory.RunAsync(async () =>
        {
            try
            {
                // Coalesce compiler bursts into one UI dispatch instead of one dispatch per output line.
                await Task.Delay(75);
                await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();

                if (_outputPane is null
                    && Microsoft.VisualStudio.Shell.Package.GetGlobalService(typeof(SVsOutputWindow)) is IVsOutputWindow outputWindow)
                {
                    Guid paneGuid = OutputPaneGuid;
                    outputWindow.CreatePane(ref paneGuid, "CloudMate", fInitVisible: 1, fClearWithSolution: 0);
                    outputWindow.GetPane(ref paneGuid, out _outputPane);
                }

                StringBuilder batch = new();
                while (OutputQueue.TryDequeue(out string? line))
                    batch.AppendLine(line);

                if (batch.Length > 0)
                    _outputPane?.OutputStringThreadSafe(batch.ToString());
            }
            finally
            {
                Interlocked.Exchange(ref _outputFlushScheduled, 0);
                if (!OutputQueue.IsEmpty)
                    ScheduleOutputFlush(package);
            }
        }).FileAndForget("CloudMate/Output");
    }

    // ─── Always-on watch ─────────────────────────────────────────────────────

    /// <summary>Queues a watch synchronization, coalescing the burst of events a solution load produces.</summary>
    private void ScheduleWatchSync()
    {
        lock (_watchSyncLock)
        {
            if (DisposalToken.IsCancellationRequested)
                return;

            if (_watchSyncTimer is null)
                _watchSyncTimer = new Timer(_ => SyncWatch(), null, WatchSyncDelay, Timeout.InfiniteTimeSpan);
            else
                _watchSyncTimer.Change(WatchSyncDelay, Timeout.InfiniteTimeSpan);
        }
    }

    /// <summary>
    /// Points the watch process at every project in the open solution that has a mateconfig file.
    /// One process covers them all, so saving a file in any project compiles it — a solution with
    /// several configured projects is the normal case, not an exception.
    /// </summary>
    private void SyncWatch()
        => JoinableTaskFactory.RunAsync(SyncWatchAsync).FileAndForget("CloudMate/SyncWatch");

    private async Task SyncWatchAsync()
    {
        AsyncPackage package = this;

        try
        {
            object? dteService = await GetServiceAsync(typeof(SDTE));

            await JoinableTaskFactory.SwitchToMainThreadAsync(DisposalToken);

            if (dteService is not DTE dte)
                return;

            string solutionPath;
            try { solutionPath = dte.Solution?.FullName ?? string.Empty; }
            catch { return; }

            if (string.IsNullOrEmpty(solutionPath))
            {
                MateRunner.StopWatch();
                return;
            }

            string solutionDirectory = Path.GetDirectoryName(solutionPath) ?? string.Empty;
            List<string> projectDirectories = GetProjectDirectories(dte);

            // Everything below is file IO and process startup: never do it on the UI thread.
            await TaskScheduler.Default;

            List<string> roots = DiscoverConfiguredProjects(projectDirectories, solutionDirectory);

            MateRunner.EnsureWatch(
                roots,
                line => OutputLine(package, line),
                line => OutputLine(package, line));
        }
        catch (OperationCanceledException)
        {
            // Visual Studio is shutting down.
        }
        catch (Exception ex)
        {
            OutputLine(package, $"[CloudMate] watch could not start: {ex.Message}");
        }
    }

    /// <summary>
    /// Returns every directory that owns a mateconfig file: the loaded projects first, then the
    /// solution directory and a shallow scan under it, which also covers projects Visual Studio has
    /// not reported yet.
    /// </summary>
    private static List<string> DiscoverConfiguredProjects(List<string> projectDirectories, string solutionDirectory)
    {
        List<string> roots = new();

        void Add(string? directory)
        {
            if (string.IsNullOrEmpty(directory)
                || roots.Contains(directory!, StringComparer.OrdinalIgnoreCase)
                || ConfigWriter.GetConfigPath(directory!) is null)
                return;

            roots.Add(directory!);
        }

        foreach (string directory in projectDirectories)
            Add(directory);

        if (!string.IsNullOrEmpty(solutionDirectory))
        {
            Add(solutionDirectory);

            foreach (string directory in EnumerateDirectories(solutionDirectory, maxDepth: 4))
                Add(directory);
        }

        return roots;
    }

    /// <summary>Directories that never contain a project of their own.</summary>
    private static readonly HashSet<string> SkippedDirectories = new(StringComparer.OrdinalIgnoreCase)
    {
        "bin", "obj", "node_modules", ".git", ".vs", ".github", "packages", "wwwroot", "TestResults", "dist"
    };

    /// <summary>Depth-limited directory walk with a hard visit budget so a huge repository cannot stall startup.</summary>
    private static IEnumerable<string> EnumerateDirectories(string root, int maxDepth)
    {
        Queue<(string Directory, int Depth)> pending = new();
        pending.Enqueue((root, 0));
        int visited = 0;

        while (pending.Count > 0 && visited < 2000)
        {
            (string directory, int depth) = pending.Dequeue();

            if (depth >= maxDepth)
                continue;

            string[] children;
            try { children = Directory.GetDirectories(directory); }
            catch { continue; }

            foreach (string child in children)
            {
                if (SkippedDirectories.Contains(Path.GetFileName(child)))
                    continue;

                visited++;
                yield return child;
                pending.Enqueue((child, depth + 1));
            }
        }
    }

    private static List<string> GetProjectDirectories(DTE dte)
    {
        ThreadHelper.ThrowIfNotOnUIThread();
        List<string> directories = new();

        void AddProject(Project? project)
        {
            if (project is null)
                return;

            try
            {
                string fullName = project.FullName;
                if (!string.IsNullOrWhiteSpace(fullName))
                {
                    string? directory = Path.GetDirectoryName(fullName);
                    if (!string.IsNullOrWhiteSpace(directory) && !directories.Contains(directory!, StringComparer.OrdinalIgnoreCase))
                        directories.Add(directory!);
                }
            }
            catch { }

            try
            {
                foreach (ProjectItem item in project.ProjectItems)
                    if (item.SubProject is Project subProject)
                        AddProject(subProject);
            }
            catch { }
        }

        try
        {
            foreach (Project project in dte.Solution.Projects)
                AddProject(project);
        }
        catch { }

        return directories;
    }

    // ─── Solution events ─────────────────────────────────────────────────────

    public int OnAfterOpenSolution(object pUnkReserved, int fNewSolution)
    {
        ScheduleWatchSync();
        return VSConstants.S_OK;
    }

    public int OnAfterOpenProject(IVsHierarchy pHierarchy, int fAdded)
    {
        ScheduleWatchSync();
        return VSConstants.S_OK;
    }

    public int OnAfterLoadProject(IVsHierarchy pStubHierarchy, IVsHierarchy pRealHierarchy)
    {
        ScheduleWatchSync();
        return VSConstants.S_OK;
    }

    public int OnAfterCloseSolution(object pUnkReserved)
    {
        MateRunner.StopWatch();
        return VSConstants.S_OK;
    }

    // Project removals deliberately do not re-synchronize: dropping a root would restart the watch
    // process (and rebuild everything) for no benefit, and closing the solution already stops it.
    public int OnQueryCloseProject(IVsHierarchy pHierarchy, int fRemoving, ref int pfCancel) => VSConstants.S_OK;
    public int OnBeforeCloseProject(IVsHierarchy pHierarchy, int fRemoved) => VSConstants.S_OK;
    public int OnQueryUnloadProject(IVsHierarchy pRealHierarchy, ref int pfCancel) => VSConstants.S_OK;
    public int OnBeforeUnloadProject(IVsHierarchy pRealHierarchy, IVsHierarchy pStubHierarchy) => VSConstants.S_OK;
    public int OnQueryCloseSolution(object pUnkReserved, ref int pfCancel) => VSConstants.S_OK;
    public int OnBeforeCloseSolution(object pUnkReserved) => VSConstants.S_OK;

    // ─── Shutdown ────────────────────────────────────────────────────────────

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            lock (_watchSyncLock)
            {
                _watchSyncTimer?.Dispose();
                _watchSyncTimer = null;
            }

            if (_solution is not null && _solutionEventsCookie != 0)
            {
                IVsSolution solution = _solution;
                uint cookie = _solutionEventsCookie;

                _solutionEventsCookie = 0;
                _solution = null;

                ThreadHelper.JoinableTaskFactory.Run(async () =>
                {
                    await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();

                    try { solution.UnadviseSolutionEvents(cookie); }
                    catch { }
                });
            }

            MateRunner.StopWatch();
        }

        base.Dispose(disposing);
    }
}
