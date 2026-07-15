using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace AngryMonkey.CloudMate.VisualStudio;

/// <summary>
/// Shared helper: runs the .NET CloudMate CLI bundled with the extension.
/// </summary>
internal static class MateRunner
{
    private static Process? _watchProcess;
    private static string? _watchWorkingDirectory;
    private static Action<string>? _watchOutput;
    private static Action<string>? _watchError;
    private static bool _watchStopRequested;
    private static readonly object _watchLock = new();
    private static readonly SemaphoreSlim _runGate = new(1, 1);

    public static bool IsWatching
    {
        get
        {
            lock (_watchLock)
                return _watchProcess is { HasExited: false };
        }
    }

    /// <summary>
    /// Ensures a resilient watch process is running for the supplied working directory.
    /// If watch exits unexpectedly it is restarted automatically.
    /// </summary>
    public static void EnsureWatch(string workingDirectory, Action<string> output, Action<string> error)
    {
        string? logAfterLock = null;
        Action<string>? logCallback = null;

        lock (_watchLock)
        {
            _watchWorkingDirectory = workingDirectory;
            _watchOutput = output;
            _watchError = error;

            if (_watchProcess is { HasExited: false }
                && string.Equals(_watchProcess.StartInfo.WorkingDirectory, workingDirectory, StringComparison.OrdinalIgnoreCase))
                return;

            if (_watchProcess is { HasExited: false })
            {
                _watchStopRequested = true;
                KillProcessTree(_watchProcess);
                _watchProcess.Dispose();
                _watchProcess = null;
            }

            _watchStopRequested = false;
            logAfterLock = StartWatchInternal();
            logCallback = output;
        }

        // Emit log AFTER the lock is released so OutputLine never blocks while the lock is held.
        if (logAfterLock is not null)
            logCallback?.Invoke(logAfterLock);
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

    /// <summary>Starts <c>mate --watch</c> in the background. Kept for backward compatibility; delegates to EnsureWatch.</summary>
    public static void StartWatch(string workingDirectory, Action<string> output, Action<string> error)
        => EnsureWatch(workingDirectory, output, error);

    // Returns a log line to emit AFTER the lock is released, or null.
    private static string? StartWatchInternal()
    {
        if (string.IsNullOrEmpty(_watchWorkingDirectory) || _watchOutput is null || _watchError is null)
            return null;

        string watchDirectory = _watchWorkingDirectory!;
        string exe = FindMate();
        ProcessStartInfo psi = CreateStartInfo(exe, new[] { "--watch", "--no-initial-build" }, watchDirectory);

        Process proc = new() { StartInfo = psi, EnableRaisingEvents = true };
        proc.OutputDataReceived += (_, e) => { if (e.Data is not null) _watchOutput(e.Data); };
        proc.ErrorDataReceived += (_, e) => { if (e.Data is not null) _watchError(e.Data); };
        proc.Exited += (_, _) => OnWatchExited();

        proc.Start();
        proc.BeginOutputReadLine();
        proc.BeginErrorReadLine();

        _watchProcess = proc;
        // Return the message; caller must emit it AFTER releasing _watchLock.
        return $"[CloudMate] bundled .NET watch started in '{_watchWorkingDirectory}'.";
    }

    private static void OnWatchExited()
    {
        string? logAfterLock = null;
        string? errorAfterLock = null;
        Action<string>? logOutput = null;
        Action<string>? logError = null;
        string? retryErrorAfterLock = null;

        lock (_watchLock)
        {
            _watchProcess?.Dispose();
            _watchProcess = null;

            if (_watchStopRequested)
                return;

            string? workingDirectory = _watchWorkingDirectory;
            if (workingDirectory is null || workingDirectory.Length == 0 || _watchOutput is null || _watchError is null)
                return;

            // Don't restart if the config file was deleted while the watch was running.
            if (ConfigWriter.GetConfigPath(workingDirectory) is null)
            {
                logError = _watchError;
                errorAfterLock = "[CloudMate] mateconfig.json not found. watch will not restart.";
                // Leave _watchStopRequested false so EnsureWatch can re-arm if config is recreated.
            }
            else
            {
                logOutput = _watchOutput;
                logError = _watchError;
                errorAfterLock = "[CloudMate] watch exited unexpectedly. restarting...";

                try
                {
                    logAfterLock = StartWatchInternal();
                }
                catch (Exception ex)
                {
                    retryErrorAfterLock = $"[CloudMate] watch restart failed: {ex.Message}";
                }
            }
        }

        // Emit all log lines AFTER the lock is released.
        if (errorAfterLock is not null) logError?.Invoke(errorAfterLock);
        if (logAfterLock is not null) logOutput?.Invoke(logAfterLock);

        if (retryErrorAfterLock is not null)
        {
            logError?.Invoke(retryErrorAfterLock);

            // Retry quickly; this keeps watch self-healing and near-instant on transient failures.
            _ = Task.Run(async () =>
            {
                await Task.Delay(500);
                string? retryLog = null;
                string? retryErr = null;
                Action<string>? retryOutput = null;
                Action<string>? retryError = null;

                lock (_watchLock)
                {
                    if (!_watchStopRequested && _watchProcess is null)
                    {
                        retryOutput = _watchOutput;
                        retryError = _watchError;
                        try { retryLog = StartWatchInternal(); }
                        catch (Exception retryEx) { retryErr = $"[CloudMate] watch restart failed again: {retryEx.Message}"; }
                    }
                }

                if (retryLog is not null) retryOutput?.Invoke(retryLog);
                if (retryErr is not null) retryError?.Invoke(retryErr);
            });
        }
    }

    /// <summary>Terminates the running watch process, if any.</summary>
    public static void StopWatch()
    {
        lock (_watchLock)
        {
            _watchStopRequested = true;

            if (_watchProcess is not null)
            {
                KillProcessTree(_watchProcess);
                _watchProcess.Dispose();
                _watchProcess = null;
            }

        }
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
