using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using EnvDTE;
using Microsoft.VisualStudio;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Interop;

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
public sealed class CloudMatePackage : AsyncPackage
{
    public const string PackageGuidString = "A1B2C3D4-E5F6-7890-ABCD-EF1234567890";

    protected override async Task InitializeAsync(CancellationToken cancellationToken, IProgress<ServiceProgressData> progress)
    {
        await base.InitializeAsync(cancellationToken, progress);

        // Switch to the UI thread before touching VS services.
        await JoinableTaskFactory.SwitchToMainThreadAsync(cancellationToken);

        await Commands.CompileVsCommand.InitializeAsync(this);
        await Commands.StopCompilingVsCommand.InitializeAsync(this);
        await Commands.CompressFolderVsCommand.InitializeAsync(this);
        await Commands.BuildVsCommand.InitializeAsync(this);

        BootstrapAlwaysOnWatch();
    }

    // ─── Output pane ─────────────────────────────────────────────────────────

    private static IVsOutputWindowPane? _outputPane;
    private static readonly Guid OutputPaneGuid = new("C7F54A2E-1B3D-4E8F-9A0B-2D5E6F789012");

    /// <summary>
    /// Writes a line to the "CloudMate" output pane, creating it on first use.
    /// Safe to call from any thread: pane creation and activation are marshaled to the UI
    /// thread and the text is written with the thread-safe output API.
    /// </summary>
    internal static void OutputLine(IServiceProvider package, string message)
    {
        ThreadHelper.JoinableTaskFactory.Run(async () =>
        {
            await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();

            if (_outputPane is null
                && Package.GetGlobalService(typeof(SVsOutputWindow)) is IVsOutputWindow outputWindow)
            {
                Guid paneGuid = OutputPaneGuid;
                outputWindow.CreatePane(ref paneGuid, "CloudMate", fInitVisible: 1, fClearWithSolution: 0);
                outputWindow.GetPane(ref paneGuid, out _outputPane);
            }

            _outputPane?.OutputStringThreadSafe(message + Environment.NewLine);
            _outputPane?.Activate();
        });
    }

    /// <summary>
    /// Starts always-on watch once package loads, using the first discovered .mateconfig.json
    /// under the open solution. Watch self-heals in MateRunner if the process exits.
    /// </summary>
    private void BootstrapAlwaysOnWatch()
    {
        ThreadHelper.ThrowIfNotOnUIThread();

        try
        {
            if (GetService(typeof(SDTE)) is not DTE dte)
                return;

            string solutionPath = dte.Solution?.FullName ?? string.Empty;
            if (string.IsNullOrEmpty(solutionPath))
                return;

            string solutionDir = Path.GetDirectoryName(solutionPath) ?? string.Empty;
            if (string.IsNullOrEmpty(solutionDir) || !Directory.Exists(solutionDir))
                return;

            string[] configFiles = Directory.GetFiles(solutionDir, ".mateconfig.json", SearchOption.AllDirectories);
            if (configFiles.Length == 0)
                return;

            string watchDir = Path.GetDirectoryName(configFiles[0]) ?? string.Empty;
            if (string.IsNullOrEmpty(watchDir))
                return;

            MateRunner.EnsureWatch(
                watchDir,
                line => OutputLine(this, line),
                line => OutputLine(this, line));

            OutputLine(this, $"[CloudMate] always-on watch enabled in '{watchDir}'.");
        }
        catch (Exception ex)
        {
            OutputLine(this, $"[CloudMate] watch bootstrap skipped: {ex.Message}");
        }
    }
}
