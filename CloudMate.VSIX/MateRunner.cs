using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;

namespace AngryMonkey.CloudMate.VisualStudio;

/// <summary>
/// Shared helper: locates the <c>mate</c> dotnet tool on PATH and runs it as a process.
/// </summary>
internal static class MateRunner
{
    private static Process? _watchProcess;
    private static readonly object _watchLock = new();

    public static bool IsWatching
    {
        get
        {
            lock (_watchLock)
                return _watchProcess is { HasExited: false };
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

    /// <summary>Starts <c>mate --watch</c> in the background. Returns immediately; call <see cref="StopWatch"/> to terminate.</summary>
    public static void StartWatch(string workingDirectory, Action<string> output, Action<string> error)
    {
        lock (_watchLock)
        {
            if (_watchProcess is { HasExited: false })
                return;

            string exe = FindMate();

            ProcessStartInfo psi = CreateStartInfo(exe, new[] { "--watch" }, workingDirectory);

            _watchProcess = new Process { StartInfo = psi };
            _watchProcess.OutputDataReceived += (_, e) => { if (e.Data is not null) output(e.Data); };
            _watchProcess.ErrorDataReceived  += (_, e) => { if (e.Data is not null) error(e.Data); };

            _watchProcess.Start();
            _watchProcess.BeginOutputReadLine();
            _watchProcess.BeginErrorReadLine();
        }
    }

    /// <summary>Terminates the running watch process, if any.</summary>
    public static void StopWatch()
    {
        lock (_watchLock)
        {
            if (_watchProcess is null)
                return;

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
