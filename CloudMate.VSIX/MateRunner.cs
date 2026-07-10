using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace AngryMonkey.CloudMate.VisualStudio;

/// <summary>
/// Shared helper: locates the <c>mate</c> dotnet tool on PATH and runs it as a process.
/// </summary>
internal static class MateRunner
{
    private static Process? _watchProcess;
    private static string? _watchWorkingDirectory;
    private static Action<string>? _watchOutput;
    private static Action<string>? _watchError;
    private static bool _watchStopRequested;
    private static readonly object _watchLock = new();

    private static FileSystemWatcher? _configWatcher;
    private static string? _configWatcherPath;
    private static DateTime _lastConfigReloadUtc;

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
        lock (_watchLock)
        {
            _watchWorkingDirectory = workingDirectory;
            _watchOutput = output;
            _watchError = error;

            if (_watchProcess is { HasExited: false }
                && string.Equals(_watchProcess.StartInfo.WorkingDirectory, workingDirectory, StringComparison.OrdinalIgnoreCase))
            {
                EnsureConfigWatcher(workingDirectory);
                return;
            }

            if (_watchProcess is { HasExited: false })
            {
                _watchStopRequested = true;
                try { _watchProcess.Kill(); } catch { }
                finally
                {
                    _watchProcess.Dispose();
                    _watchProcess = null;
                }
            }

            _watchStopRequested = false;
            EnsureConfigWatcher(workingDirectory);
            StartWatchInternal();
        }
    }

    /// <summary>Runs <c>mate [args]</c> in <paramref name="workingDirectory"/> and streams output to <paramref name="output"/>.</summary>
    public static void Run(string workingDirectory, string[] args, Action<string> output, Action<string> error)
    {
        string exe = FindMate();

        ProcessStartInfo psi = CreateStartInfo(exe, args, workingDirectory);

        using Process proc = new() { StartInfo = psi };

        proc.OutputDataReceived += (_, e) => { if (e.Data is not null) output(e.Data); };
        proc.ErrorDataReceived  += (_, e) => { if (e.Data is not null) error(e.Data); };

        proc.Start();
        proc.BeginOutputReadLine();
        proc.BeginErrorReadLine();
        proc.WaitForExit();

        if (proc.ExitCode != 0)
            error($"[CloudMate] mate exited with code {proc.ExitCode}.");
    }

    /// <summary>Starts <c>mate --watch</c> in the background. Kept for backward compatibility; delegates to EnsureWatch.</summary>
    public static void StartWatch(string workingDirectory, Action<string> output, Action<string> error)
        => EnsureWatch(workingDirectory, output, error);

    private static void StartWatchInternal()
    {
        if (string.IsNullOrEmpty(_watchWorkingDirectory) || _watchOutput is null || _watchError is null)
            return;

        string watchDirectory = _watchWorkingDirectory!;
        string exe = FindMate();
        ProcessStartInfo psi = CreateStartInfo(exe, new[] { "--watch" }, watchDirectory);

        Process proc = new() { StartInfo = psi, EnableRaisingEvents = true };
        proc.OutputDataReceived += (_, e) => { if (e.Data is not null) _watchOutput(e.Data); };
        proc.ErrorDataReceived  += (_, e) => { if (e.Data is not null) _watchError(e.Data); };
        proc.Exited += (_, _) => OnWatchExited();

        proc.Start();
        proc.BeginOutputReadLine();
        proc.BeginErrorReadLine();

        _watchOutput($"[CloudMate] watch started in '{_watchWorkingDirectory}'.");
        _watchProcess = proc;
    }

    private static void OnWatchExited()
    {
        lock (_watchLock)
        {
            _watchProcess?.Dispose();
            _watchProcess = null;

            if (_watchStopRequested)
                return;

            if (string.IsNullOrEmpty(_watchWorkingDirectory) || _watchOutput is null || _watchError is null)
                return;

            _watchError("[CloudMate] watch exited unexpectedly. restarting...");

            try
            {
                StartWatchInternal();
            }
            catch (Exception ex)
            {
                _watchError($"[CloudMate] watch restart failed: {ex.Message}");

                // Retry quickly; this keeps watch self-healing and near-instant on transient failures.
                _ = Task.Run(async () =>
                {
                    await Task.Delay(500);
                    lock (_watchLock)
                    {
                        if (!_watchStopRequested && _watchProcess is null)
                        {
                            try { StartWatchInternal(); }
                            catch (Exception retryEx)
                            {
                                _watchError($"[CloudMate] watch restart failed again: {retryEx.Message}");
                            }
                        }
                    }
                });
            }
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
                try
                {
                    if (!_watchProcess.HasExited)
                        _watchProcess.Kill(); // entireProcessTree parameter not available on .NET Framework 4.7.2
                }
                catch { /* already exited */ }
                finally
                {
                    _watchProcess.Dispose();
                    _watchProcess = null;
                }
            }

            DisposeConfigWatcher();
        }
    }

    private static void EnsureConfigWatcher(string workingDirectory)
    {
        string configPath = Path.Combine(workingDirectory, ConfigWriter.ConfigFileName);

        if (_configWatcher is not null
            && string.Equals(_configWatcherPath, configPath, StringComparison.OrdinalIgnoreCase))
            return;

        DisposeConfigWatcher();

        _configWatcherPath = configPath;
        _configWatcher = new FileSystemWatcher(workingDirectory, ConfigWriter.ConfigFileName)
        {
            NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.CreationTime | NotifyFilters.Size | NotifyFilters.FileName,
            IncludeSubdirectories = false,
            EnableRaisingEvents = true
        };

        _configWatcher.Changed += (_, _) => ReloadWatchOnConfigChanged();
        _configWatcher.Created += (_, _) => ReloadWatchOnConfigChanged();
        _configWatcher.Renamed += (_, _) => ReloadWatchOnConfigChanged();
        _configWatcher.Deleted += (_, _) => ReloadWatchOnConfigChanged();
    }

    private static void ReloadWatchOnConfigChanged()
    {
        lock (_watchLock)
        {
            if (_watchStopRequested || string.IsNullOrEmpty(_watchWorkingDirectory) || _watchOutput is null || _watchError is null)
                return;

            // Debounce duplicate file events from save operations.
            DateTime now = DateTime.UtcNow;
            if ((now - _lastConfigReloadUtc).TotalMilliseconds < 250)
                return;
            _lastConfigReloadUtc = now;

            _watchOutput("[CloudMate] mateconfig.json changed. reloading watch...");

            if (_watchProcess is { HasExited: false })
            {
                _watchStopRequested = true;
                try { _watchProcess.Kill(); } catch { }
                finally
                {
                    _watchProcess.Dispose();
                    _watchProcess = null;
                }
            }

            _watchStopRequested = false;
            StartWatchInternal();
        }
    }

    private static void DisposeConfigWatcher()
    {
        try
        {
            if (_configWatcher is not null)
            {
                _configWatcher.EnableRaisingEvents = false;
                _configWatcher.Dispose();
                _configWatcher = null;
            }
        }
        catch { }

        _configWatcherPath = null;
    }

    /// <summary>
    /// Finds the <c>mate</c> executable. Throws <see cref="FileNotFoundException"/> with
    /// install instructions when the tool is not on PATH.
    /// </summary>
    private static string FindMate()
    {
        // Try the well-known dotnet tools path first to avoid relying solely on PATH.
        string userToolsPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            ".dotnet", "tools", "mate.exe");

        if (File.Exists(userToolsPath))
            return userToolsPath;

        // Fall back to PATH resolution via where.exe.
        using Process where = new()
        {
            StartInfo = new ProcessStartInfo("where", "mate")
            {
                UseShellExecute = false,
                RedirectStandardOutput = true,
                CreateNoWindow = true
            }
        };

        where.Start();

        List<string> candidates = [];
        while (!where.StandardOutput.EndOfStream)
        {
            string? line = where.StandardOutput.ReadLine()?.Trim();
            if (!string.IsNullOrEmpty(line) && File.Exists(line))
                candidates.Add(line!);
        }

        where.WaitForExit();

        string? preferred = candidates.FirstOrDefault(path =>
            path.EndsWith(".exe", StringComparison.OrdinalIgnoreCase));

        preferred ??= candidates.FirstOrDefault(path =>
            path.EndsWith(".cmd", StringComparison.OrdinalIgnoreCase) ||
            path.EndsWith(".bat", StringComparison.OrdinalIgnoreCase));

        preferred ??= candidates.FirstOrDefault();

        if (!string.IsNullOrEmpty(preferred))
            return preferred;

        throw new FileNotFoundException(
            "The 'mate' CLI tool was not found. " +
            "Install it with: dotnet tool install -g AngryMonkey.CloudMate.CLI");
    }

    private static ProcessStartInfo CreateStartInfo(string matePath, string[] args, string workingDirectory)
    {
        string joinedArgs = string.Join(" ", args);

        // .cmd/.bat shims must be launched through cmd.exe when UseShellExecute=false.
        if (matePath.EndsWith(".cmd", StringComparison.OrdinalIgnoreCase)
            || matePath.EndsWith(".bat", StringComparison.OrdinalIgnoreCase))
        {
            string cmdArgs = "/c \"\"" + matePath + "\"" + (string.IsNullOrWhiteSpace(joinedArgs) ? string.Empty : " " + joinedArgs) + "\"";
            return new ProcessStartInfo("cmd.exe", cmdArgs)
            {
                WorkingDirectory = workingDirectory,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true
            };
        }

        return new ProcessStartInfo(matePath, joinedArgs)
        {
            WorkingDirectory = workingDirectory,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true
        };
    }
}
