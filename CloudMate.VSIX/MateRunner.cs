using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Management;
using System.Threading;
using System.Threading.Tasks;

namespace AngryMonkey.CloudMate.VisualStudio;

/// <summary>
/// Shared helper: runs the .NET CloudMate CLI bundled with the extension.
/// A single watch process serves every configured project in the solution — the compiler engines are
/// the bulk of its memory, so hosting all projects in one process keeps the extension light — and it
/// is bound to the lifetime of this Visual Studio instance so it can never survive as an orphan.
/// </summary>
internal static class MateRunner
{
    private static Process? _watchProcess;
    private static string[] _watchRoots = new string[0];
    private static Action<string>? _watchOutput;
    private static Action<string>? _watchError;
    private static bool _watchStopRequested;
    private static readonly object _watchLock = new();
    private static readonly SemaphoreSlim _runGate = new(1, 1);

    /// <summary>Unexpected exits allowed inside <see cref="RestartWindow"/> before watch gives up.</summary>
    private const int MaxRestartsPerWindow = 4;
    private static readonly TimeSpan RestartWindow = TimeSpan.FromMinutes(2);
    private static readonly List<DateTime> _restartTimes = new();

    public static bool IsWatching
    {
        get
        {
            lock (_watchLock)
                return _watchProcess is { HasExited: false };
        }
    }

    /// <summary>The project directories the current watch process covers.</summary>
    public static IReadOnlyList<string> WatchRoots
    {
        get
        {
            lock (_watchLock)
                return (string[])_watchRoots.Clone();
        }
    }

    /// <summary>
    /// Ensures one watch process is running for exactly <paramref name="roots"/>. Restarts it only when
    /// the set of projects actually changed, so re-synchronizing on solution events is free.
    /// </summary>
    public static void EnsureWatch(IEnumerable<string> roots, Action<string> output, Action<string> error)
    {
        string? logAfterLock = null;
        string? errorAfterLock = null;

        lock (_watchLock)
        {
            string[] requested = Normalize(roots);

            _watchOutput = output;
            _watchError = error;

            if (requested.Length == 0)
            {
                errorAfterLock = _watchProcess is { HasExited: false }
                    ? "[CloudMate] no mateconfig.json remains in this solution; stopping watch."
                    : null;

                StopWatchLocked();
            }
            else if (_watchProcess is { HasExited: false } && requested.SequenceEqual(_watchRoots, StringComparer.OrdinalIgnoreCase))
            {
                // Already watching exactly these projects.
            }
            else
            {
                StopWatchLocked();
                _watchStopRequested = false;
                _watchRoots = requested;
                _restartTimes.Clear();
                logAfterLock = StartWatchLocked();
            }
        }

        // Emit logs AFTER the lock is released so output never blocks while the lock is held.
        if (errorAfterLock is not null) error(errorAfterLock);
        if (logAfterLock is not null) output(logAfterLock);
    }

    /// <summary>
    /// Adds <paramref name="root"/> to the watched projects, keeping the ones already covered.
    /// Used by the context-menu commands so compiling one file never stops watching another project.
    /// </summary>
    public static void EnsureWatchIncludes(string root, Action<string> output, Action<string> error)
    {
        List<string> roots;

        lock (_watchLock)
            roots = new List<string>(_watchRoots);

        roots.Add(root);
        EnsureWatch(roots, output, error);
    }

    /// <summary>Runs <c>mate [args]</c> in <paramref name="workingDirectory"/> and streams output to <paramref name="output"/>.</summary>
    public static void Run(string workingDirectory, string[] args, Action<string> output, Action<string> error)
    {
        if (!_runGate.Wait(0))
        {
            output("[CloudMate] A build is already running; duplicate request skipped.");
            return;
        }

        try
        {
            string exe = FindMate();

            ProcessStartInfo psi = CreateStartInfo(exe, args, workingDirectory);

            using Process proc = new() { StartInfo = psi };

            proc.OutputDataReceived += (_, e) => { if (e.Data is not null) output(e.Data); };
            proc.ErrorDataReceived += (_, e) => { if (e.Data is not null) error(e.Data); };

            proc.Start();
            proc.BeginOutputReadLine();
            proc.BeginErrorReadLine();
            proc.WaitForExit();

            if (proc.ExitCode != 0)
                error($"[CloudMate] mate exited with code {proc.ExitCode}.");
        }
        finally
        {
            _runGate.Release();
        }
    }

    // Returns a log line to emit AFTER the lock is released, or null.
    private static string? StartWatchLocked()
    {
        if (_watchRoots.Length == 0 || _watchOutput is null || _watchError is null)
            return null;

        Action<string> output = _watchOutput;
        Action<string> error = _watchError;

        // The watch process exits by itself when this Visual Studio instance is gone, even if VS is
        // killed without ever unloading the extension.
        List<string> args = new() { "--watch", "--parent-pid", Process.GetCurrentProcess().Id.ToString() };
        foreach (string root in _watchRoots)
        {
            args.Add("--root");
            args.Add(root);
        }

        // Always run the initial build. It reconciles source changes made before Visual Studio
        // opened the solution or while the extension was still starting.
        ProcessStartInfo psi = CreateStartInfo(FindMate(), args.ToArray(), _watchRoots[0]);

        Process proc = new() { StartInfo = psi, EnableRaisingEvents = true };
        proc.OutputDataReceived += (_, e) => { if (e.Data is not null) output(e.Data); };
        proc.ErrorDataReceived += (_, e) => { if (e.Data is not null) error(e.Data); };
        // The exiting process is passed along so an exit notification that arrives after the process
        // was already replaced cannot tear down its replacement.
        proc.Exited += (_, _) => OnWatchExited(proc);

        proc.Start();
        proc.BeginOutputReadLine();
        proc.BeginErrorReadLine();

        try { proc.PriorityClass = ProcessPriorityClass.BelowNormal; }
        catch { /* the process may already be gone; priority is only a nicety */ }

        _watchProcess = proc;

        string projects = string.Join(", ", _watchRoots.Select(root => Path.GetFileName(root.TrimEnd('\\', '/'))));
        return $"[CloudMate] watching {_watchRoots.Length} project{(_watchRoots.Length == 1 ? "" : "s")}: {projects}";
    }

    private static void OnWatchExited(Process exited)
    {
        string? logAfterLock = null;
        string? errorAfterLock = null;
        Action<string>? output = null;
        Action<string>? error = null;

        lock (_watchLock)
        {
            if (!ReferenceEquals(_watchProcess, exited))
                return;

            _watchProcess.Dispose();
            _watchProcess = null;

            if (_watchStopRequested)
                return;

            output = _watchOutput;
            error = _watchError;

            if (output is null || error is null)
                return;

            // Drop the projects whose configuration disappeared while watch was running.
            _watchRoots = _watchRoots.Where(root => ConfigWriter.GetConfigPath(root) is not null).ToArray();

            if (_watchRoots.Length == 0)
            {
                errorAfterLock = "[CloudMate] mateconfig.json not found; watch will not restart.";
            }
            else if (!TryRegisterRestartLocked())
            {
                // A process that keeps dying restarts forever otherwise, spawning one process per crash.
                _watchStopRequested = true;
                errorAfterLock = "[CloudMate] watch keeps exiting; it is now disabled for this session. "
                    + "Check the messages above, then reload the solution to try again.";
            }
            else
            {
                errorAfterLock = "[CloudMate] watch exited unexpectedly; restarting...";

                try
                {
                    logAfterLock = StartWatchLocked();
                }
                catch (Exception ex)
                {
                    errorAfterLock += $" restart failed: {ex.Message}";
                }
            }
        }

        // Emit all log lines AFTER the lock is released.
        if (errorAfterLock is not null) error?.Invoke(errorAfterLock);
        if (logAfterLock is not null) output?.Invoke(logAfterLock);
    }

    private static bool TryRegisterRestartLocked()
    {
        DateTime now = DateTime.UtcNow;
        _restartTimes.RemoveAll(time => now - time > RestartWindow);

        if (_restartTimes.Count >= MaxRestartsPerWindow)
            return false;

        _restartTimes.Add(now);
        return true;
    }

    /// <summary>Terminates the running watch process, if any.</summary>
    public static void StopWatch()
    {
        lock (_watchLock)
            StopWatchLocked();
    }

    private static void StopWatchLocked()
    {
        _watchStopRequested = true;
        _watchRoots = new string[0];

        // Detach before killing: the exit notification then sees it is no longer the current process
        // and leaves whatever starts next alone.
        Process? process = _watchProcess;
        _watchProcess = null;

        if (process is null)
            return;

        KillProcessTree(process);
        process.Dispose();
    }

    private static string[] Normalize(IEnumerable<string> roots)
    {
        List<string> normalized = new();

        foreach (string root in roots)
        {
            if (string.IsNullOrWhiteSpace(root))
                continue;

            string full;
            try { full = Path.GetFullPath(root).TrimEnd('\\', '/'); }
            catch { continue; }

            if (!normalized.Contains(full, StringComparer.OrdinalIgnoreCase))
                normalized.Add(full);
        }

        // A stable order makes the "already watching these projects" comparison reliable.
        normalized.Sort(StringComparer.OrdinalIgnoreCase);
        return normalized.ToArray();
    }

    /// <summary>
    /// Terminates watch processes left behind by Visual Studio instances that are no longer running.
    /// Extension versions before parent-process binding could leak one process per session, each
    /// holding tens of megabytes and compiling the same outputs.
    /// </summary>
    public static void KillOrphanedWatchProcesses(Action<string> log)
    {
        int killed = 0;
        int currentProcessId = Process.GetCurrentProcess().Id;

        try
        {
            using ManagementObjectSearcher searcher = new(
                "SELECT ProcessId, ParentProcessId, CommandLine FROM Win32_Process WHERE Name = 'dotnet.exe'");
            using ManagementObjectCollection processes = searcher.Get();

            foreach (ManagementBaseObject process in processes)
            {
                using ManagementBaseObject scoped = process;

                string commandLine = scoped["CommandLine"] as string ?? string.Empty;

                // Only ever touch watch processes started by a CloudMate VSIX installation, never a
                // 'mate --watch' the user runs themselves.
                if (commandLine.IndexOf("--watch", StringComparison.OrdinalIgnoreCase) < 0
                    || commandLine.IndexOf(@"\Tools\mate.dll", StringComparison.OrdinalIgnoreCase) < 0)
                    continue;

                int processId = ToInt(scoped["ProcessId"]);
                int parentProcessId = ToInt(scoped["ParentProcessId"]);

                if (processId <= 0 || processId == currentProcessId || IsLiveVisualStudio(parentProcessId))
                    continue;

                try
                {
                    using Process orphan = Process.GetProcessById(processId);
                    KillProcessTree(orphan);
                    killed++;
                }
                catch (ArgumentException) { /* exited between enumeration and kill */ }
            }
        }
        catch (Exception ex)
        {
            log($"[CloudMate] could not check for orphaned watch processes: {ex.Message}");
            return;
        }

        if (killed > 0)
            log($"[CloudMate] stopped {killed} watch process{(killed == 1 ? "" : "es")} left by a closed Visual Studio session.");
    }

    private static bool IsLiveVisualStudio(int processId)
    {
        if (processId <= 0)
            return false;

        try
        {
            using Process process = Process.GetProcessById(processId);
            return string.Equals(process.ProcessName, "devenv", StringComparison.OrdinalIgnoreCase);
        }
        catch (ArgumentException)
        {
            return false;
        }
        catch (InvalidOperationException)
        {
            return false;
        }
    }

    private static int ToInt(object? value)
    {
        try { return value is null ? 0 : Convert.ToInt32(value); }
        catch { return 0; }
    }

    /// <summary>
    /// Kills a process and its entire child tree. On .NET Framework 4.7.2 Process.Kill()
    /// has no entireProcessTree overload, and 'mate' may be launched via a cmd shim whose
    /// child dotnet process would otherwise survive and keep compiling.
    /// </summary>
    private static void KillProcessTree(Process process)
    {
        try
        {
            if (process.HasExited)
                return;

            using Process taskkill = new()
            {
                StartInfo = new ProcessStartInfo("taskkill", $"/PID {process.Id} /T /F")
                {
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                }
            };

            taskkill.Start();
            taskkill.WaitForExit(5000);
        }
        catch { /* best effort */ }

        try
        {
            if (!process.HasExited)
                process.Kill(); // fallback: kill at least the root process
        }
        catch { /* already exited */ }
    }

    /// <summary>
    /// Finds the supported .NET CloudMate engine. The deprecated npm command is deliberately
    /// never resolved from PATH because it can terminate the entire watch process on one bad glob.
    /// </summary>
    private static string FindMate()
    {
        string extensionDirectory = Path.GetDirectoryName(typeof(MateRunner).Assembly.Location)
            ?? throw new FileNotFoundException("Could not determine the CloudMate extension directory.");
        string bundledMate = Path.Combine(extensionDirectory, "Tools", "mate.dll");

        if (File.Exists(bundledMate))
            return bundledMate;

        // Development fallback: accept only the .NET tool executable, never npm's mate.cmd.
        string userToolsPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            ".dotnet", "tools", "mate.exe");

        if (File.Exists(userToolsPath))
            return userToolsPath;

        throw new FileNotFoundException(
            $"The bundled .NET CloudMate engine was not found at '{bundledMate}'. Reinstall the CloudMate VSIX.");
    }

    private static ProcessStartInfo CreateStartInfo(string matePath, string[] args, string workingDirectory)
    {
        string joinedArgs = string.Join(" ", args.Select(QuoteArgument));
        string executable = matePath;

        if (matePath.EndsWith(".dll", StringComparison.OrdinalIgnoreCase))
        {
            executable = FindDotNetHost();
            joinedArgs = $"{QuoteArgument(matePath)}{(joinedArgs.Length == 0 ? string.Empty : " " + joinedArgs)}";
        }

        return new ProcessStartInfo(executable, joinedArgs)
        {
            WorkingDirectory = workingDirectory,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true
        };
    }

    private static string FindDotNetHost()
    {
        string? dotNetRoot = Environment.GetEnvironmentVariable("DOTNET_ROOT");
        if (!string.IsNullOrWhiteSpace(dotNetRoot))
        {
            string configuredHost = Path.Combine(dotNetRoot!, "dotnet.exe");
            if (File.Exists(configuredHost))
                return configuredHost;
        }

        string programFilesHost = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "dotnet", "dotnet.exe");
        if (File.Exists(programFilesHost))
            return programFilesHost;

        throw new FileNotFoundException(
            ".NET 10 is required by the bundled CloudMate compiler. Install the .NET 10 runtime and restart Visual Studio.");
    }

    private static string QuoteArgument(string argument)
        => "\"" + argument.Replace("\"", "\\\"") + "\"";
}
