using System.Collections.Concurrent;

namespace AngryMonkey.CloudMate;

/// <summary>
/// File-system watcher for the CloudMate build pipeline.
/// It watches only paths declared in mateconfig, coalesces duplicate notifications, and
/// isolates every build/compression failure so one bad source never stops the watch session.
/// </summary>
public sealed class MateWatcher : IDisposable
{
    private MateConfig _config;
    private readonly IReadOnlyList<string>? _builds;
    private readonly List<FileSystemWatcher> _watchers = [];
    private readonly object _lock = new();
    private readonly ManualResetEventSlim _exitSignal = new(false);
    private readonly Dictionary<string, DateTime> _lastRunUtc = [];
    private readonly ConcurrentQueue<BuildRequest> _pendingBuilds = new();
    private readonly Timer _idleReleaseTimer;
    private readonly Timer _configReloadTimer;
    private int _buildWorkerScheduled;
    private bool _disposed;

    private sealed record BuildRequest(MateConfig Config, MateConfigFile File, string BuildName);

    /// <summary>Idle time after the last compile before compiler engines are released to reclaim memory.</summary>
    private static readonly TimeSpan IdleReleaseDelay = TimeSpan.FromSeconds(90);

    /// <summary>Generated and tool-managed directories which are never valid source inputs.</summary>
    private static readonly string[] ExcludedPathSegments =
        ["\\bin\\", "/bin/", "\\obj\\", "/obj/", "\\node_modules\\", "/node_modules/",
         "\\.git\\", "/.git/", "\\.vs\\", "/.vs/"];

    public static Action<string> Log { get; set; } = Console.WriteLine;
    public static Action<string> LogError { get; set; } = Console.Error.WriteLine;

    internal int ActiveWatcherCount
    {
        get
        {
            lock (_lock)
                return _watchers.Count;
        }
    }

    public MateWatcher(MateConfig config, IReadOnlyList<string>? builds = null)
    {
        _config = config;
        _builds = builds;
        _idleReleaseTimer = new Timer(_ => MateBundler.ReleaseMemory(), null, IdleReleaseDelay, Timeout.InfiniteTimeSpan);
        _configReloadTimer = new Timer(_ => RestartAll(), null, Timeout.InfiniteTimeSpan, Timeout.InfiniteTimeSpan);

        AttachWatchers();
    }

    private static bool IsExcludedPath(string? fullPath)
    {
        if (string.IsNullOrEmpty(fullPath))
            return false;

        return ExcludedPathSegments.Any(segment => fullPath.IndexOf(segment, StringComparison.OrdinalIgnoreCase) >= 0);
    }

    private void AttachWatchers()
    {
        AttachFileWatchers();
        AttachConfigWatcher();
        AttachImageWatchers();
    }

    private void AttachFileWatchers()
    {
        foreach (MateConfigFile file in _config.Files)
        {
            foreach (string buildName in file.Builds ?? ["dev"])
            {
                if (_builds is not null && !_builds.Contains(buildName))
                    continue;

                foreach (string inputPattern in file.Input)
                {
                    string capturedPattern = inputPattern;
                    MateConfigFile capturedFile = file;
                    string capturedBuild = buildName;
                    string watchDir = ExistingWatchDirectory(inputPattern);
                    bool recursive = RequiresRecursiveWatch(inputPattern);

                    AddWatcher(watchDir, "*", (_, e) =>
                    {
                        try
                        {
                            if (IsExcludedPath(e.FullPath)
                                || !GlobResolver.IsMatch(capturedPattern, _config.RootDirectory, e.FullPath)
                                || IsBundleOutputPath(capturedFile, capturedBuild, e.FullPath))
                                return;

                            QueueFile(capturedFile, capturedBuild);
                        }
                        catch (Exception ex)
                        {
                            LogError($"Watch error for '{e.FullPath}': {ex.Message}");
                        }
                    }, recursive, WatcherChangeTypes.Changed | WatcherChangeTypes.Created | WatcherChangeTypes.Deleted | WatcherChangeTypes.Renamed);
                }
            }
        }
    }

    private void AttachConfigWatcher()
    {
        string configFile = MateConfig.FindConfigurationFile(_config.RootDirectory);
        string directory = Path.GetDirectoryName(configFile)!;
        string name = Path.GetFileName(configFile);
        AddWatcher(directory, name, (_, _) => QueueConfigReload(), watcherType: WatcherChangeTypes.Changed | WatcherChangeTypes.Created | WatcherChangeTypes.Deleted | WatcherChangeTypes.Renamed);
    }

    private void QueueConfigReload()
    {
        lock (_lock)
        {
            if (_disposed)
                return;

            // Atomic saves can emit Changed and Renamed events. Reload once after the save settles.
            _configReloadTimer.Change(TimeSpan.FromMilliseconds(400), Timeout.InfiniteTimeSpan);
        }
    }

    private void AttachImageWatchers()
    {
        if (_config.Images is null)
            return;

        foreach (MateConfigImage imageConfig in _config.Images)
        {
            foreach (string input in imageConfig.Input)
            {
                string capturedInput = input;
                MateConfigImage capturedConfig = imageConfig;
                string watchDir = ExistingWatchDirectory(input);
                bool recursive = RequiresRecursiveWatch(input);

                AddWatcher(watchDir, "*", (_, e) =>
                {
                    try
                    {
                        if (IsExcludedPath(e.FullPath)
                            || !MateImageCompressor.IsSupportedImagePath(e.FullPath)
                            || !GlobResolver.IsMatch(capturedInput, _config.RootDirectory, e.FullPath)
                            || IsImageOutputPath(capturedConfig, e.FullPath))
                            return;

                        MateImageCompressor.QueueImage(_config, capturedConfig, e.FullPath);
                        MateImageCompressor.CompressImages();
                    }
                    catch (Exception ex)
                    {
                        LogError($"Image watch error for '{e.FullPath}': {ex.Message}");
                    }
                }, recursive, WatcherChangeTypes.Changed | WatcherChangeTypes.Created);

                AddWatcher(watchDir, "*", (_, e) =>
                {
                    try
                    {
                        if (IsExcludedPath(e.FullPath) || IsImageOutputPath(capturedConfig, e.FullPath))
                            return;

                        if (MateImageCompressor.IsSupportedImagePath(e.FullPath)
                            && GlobResolver.IsMatch(capturedInput, _config.RootDirectory, e.FullPath))
                            MateImageCompressor.Delete(_config, capturedConfig, e.FullPath);
                        else if (recursive)
                            MateImageCompressor.DeleteDirectory(_config, capturedConfig, capturedInput, e.FullPath);
                    }
                    catch (Exception ex)
                    {
                        LogError($"Image deletion sync error for '{e.FullPath}': {ex.Message}");
                    }
                }, recursive, WatcherChangeTypes.Deleted | WatcherChangeTypes.Renamed);
            }
        }
    }

    private string ExistingWatchDirectory(string inputPattern)
    {
        string directory = GlobResolver.GetBaseDirectory(inputPattern, _config.RootDirectory);
        while (!Directory.Exists(directory))
        {
            string? parent = Directory.GetParent(directory)?.FullName;
            if (parent is null || string.Equals(parent, directory, StringComparison.OrdinalIgnoreCase))
                return _config.RootDirectory;

            directory = parent;
        }

        return directory;
    }

    private static bool RequiresRecursiveWatch(string pattern)
    {
        string normalized = pattern.Replace('\\', '/');
        string[] segments = normalized.Split('/', StringSplitOptions.RemoveEmptyEntries);
        return normalized.Contains("**", StringComparison.Ordinal)
            || segments.Take(Math.Max(0, segments.Length - 1)).Any(GlobResolver.IsGlob);
    }

    private void QueueFile(MateConfigFile file, string buildName)
    {
        lock (_lock)
        {
            if (_disposed)
                return;

            string key = $"{string.Join("|", file.Input)}::{buildName}";
            DateTime now = DateTime.UtcNow;
            if (_lastRunUtc.TryGetValue(key, out DateTime last) && (now - last).TotalMilliseconds < 250)
                return;

            _lastRunUtc[key] = now;
            _pendingBuilds.Enqueue(new BuildRequest(_config, file, buildName));
        }

        StartBuildWorker();
    }

    private void StartBuildWorker()
    {
        if (Interlocked.CompareExchange(ref _buildWorkerScheduled, 1, 0) == 0)
            _ = Task.Run(ProcessBuildQueue);
    }

    private void ProcessBuildQueue()
    {
        try
        {
            while (_pendingBuilds.TryDequeue(out BuildRequest? request))
            {
                try
                {
                    // A config reload invalidates work that was queued for the old configuration.
                    if (!_disposed && ReferenceEquals(request.Config, _config))
                        MateBundler.RunFiles(request.Config, request.File, [request.BuildName]);
                }
                catch (Exception ex)
                {
                    LogError($"Watch build failed for '{string.Join(", ", request.File.Input)}': {ex.Message}");
                }
                finally
                {
                    try { _idleReleaseTimer.Change(IdleReleaseDelay, Timeout.InfiniteTimeSpan); }
                    catch (ObjectDisposedException) { }
                }
            }
        }
        finally
        {
            Interlocked.Exchange(ref _buildWorkerScheduled, 0);
            if (!_pendingBuilds.IsEmpty)
                StartBuildWorker();
        }
    }

    private bool IsBundleOutputPath(MateConfigFile file, string buildName, string fullPath)
    {
        MateConfigBuild? build = _config.GetBuild(buildName);
        if (build is null)
            return false;

        string candidate = Path.GetFullPath(fullPath);
        foreach (string output in file.Output)
        {
            string normalized = output.Replace('\\', '/');
            string extension = Path.GetExtension(normalized).TrimStart('.').ToLowerInvariant();
            string outputDirectory = build.OutDir ?? Path.GetDirectoryName(normalized)?.Replace('\\', '/') ?? string.Empty;

            if (build.OutDirVersioning)
                outputDirectory = Path.Combine(outputDirectory, _config.GetOutDirVersion() ?? string.Empty);
            if (build.OutDirName)
                outputDirectory = Path.Combine(outputDirectory, _config.GetOutDirName() ?? string.Empty);
            if (extension == "css" && !string.IsNullOrEmpty(build.Css.OutDirSuffix))
                outputDirectory = Path.Combine(outputDirectory, build.Css.OutDirSuffix);
            if (extension == "js" && !string.IsNullOrEmpty(build.Js.OutDirSuffix))
                outputDirectory = Path.Combine(outputDirectory, build.Js.OutDirSuffix);

            string directory = Path.GetFullPath(Path.Combine(_config.RootDirectory, outputDirectory));
            string outputPath = Path.Combine(directory, Path.GetFileName(normalized));
            if (string.Equals(candidate, outputPath, StringComparison.OrdinalIgnoreCase))
                return true;

            string baseName = Path.GetFileNameWithoutExtension(outputPath);
            if ((extension == "css" && (file.Minify ?? build.Css.Minify) && string.Equals(candidate, Path.Combine(directory, $"{baseName}.min.css"), StringComparison.OrdinalIgnoreCase))
                || (extension == "js" && (file.Minify ?? build.Js.Minify) && string.Equals(candidate, Path.Combine(directory, $"{baseName}.min.js"), StringComparison.OrdinalIgnoreCase)))
                return true;

            if (extension == "js" && build.Js.Declaration
                && string.Equals(candidate, Path.Combine(directory, $"{baseName}.d.ts"), StringComparison.OrdinalIgnoreCase))
                return true;
        }

        return false;
    }

    private bool IsImageOutputPath(MateConfigImage imageConfig, string fullPath)
        => imageConfig.Output.Any(output => IsPathWithin(Path.GetFullPath(Path.Combine(_config.RootDirectory, output)), fullPath));

    private static bool IsPathWithin(string directory, string path)
    {
        string root = Path.TrimEndingDirectorySeparator(Path.GetFullPath(directory)) + Path.DirectorySeparatorChar;
        string candidate = Path.GetFullPath(path);
        return candidate.StartsWith(root, StringComparison.OrdinalIgnoreCase);
    }

    private void RestartAll()
    {
        try
        {
            lock (_lock)
                if (_disposed)
                    return;

            MateConfig nextConfig = MateConfig.Get(_config.RootDirectory);
            Log("Config changed — reloading watchers...");

            lock (_lock)
            {
                if (_disposed)
                    return;

                DisposeWatchersLocked();
                _config = nextConfig;
                _lastRunUtc.Clear();
                AttachWatchers();
            }
        }
        catch (FileNotFoundException)
        {
            Log("mateconfig.json deleted — stopping watch.");
            Stop();
        }
        catch (Exception ex)
        {
            // Keep the last valid watcher configuration alive when a save is temporarily invalid.
            LogError($"Could not reload configuration; keeping the current watch active: {ex.Message}");
        }
    }

    /// <summary>Signals <see cref="WaitForExit"/> to return and disposes all watchers.</summary>
    public void Stop()
    {
        Dispose();

        MateBundler.ReleaseMemory();
        _exitSignal.Set();
    }

    private void AddWatcher(string directory, string filter, FileSystemEventHandler handler, bool recursive = false,
        WatcherChangeTypes watcherType = WatcherChangeTypes.Changed | WatcherChangeTypes.Created)
    {
        if (!Directory.Exists(directory))
            return;

        lock (_lock)
        {
            if (_disposed)
                return;

            string fullDirectory = Path.GetFullPath(directory);
            FileSystemWatcher? watcher = _watchers.FirstOrDefault(existing =>
                string.Equals(Path.GetFullPath(existing.Path), fullDirectory, StringComparison.OrdinalIgnoreCase)
                && string.Equals(existing.Filter, filter, StringComparison.OrdinalIgnoreCase)
                && existing.IncludeSubdirectories == recursive);

            if (watcher is not null)
            {
                AttachHandler(watcher, handler, watcherType);
                return;
            }

            watcher = new FileSystemWatcher(fullDirectory)
            {
                Filter = filter,
                IncludeSubdirectories = recursive,
                NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName | NotifyFilters.DirectoryName,
                InternalBufferSize = 64 * 1024
            };

            watcher.Error += (_, e) => LogError($"Watcher error in '{fullDirectory}': {e.GetException().Message}. Run 'mate' once to resynchronize if changes were missed.");
            AttachHandler(watcher, handler, watcherType);

            _watchers.Add(watcher);
            watcher.EnableRaisingEvents = true;
        }
    }

    private static void AttachHandler(FileSystemWatcher watcher, FileSystemEventHandler handler, WatcherChangeTypes watcherType)
    {
        if ((watcherType & WatcherChangeTypes.Changed) != 0) watcher.Changed += handler;
        if ((watcherType & WatcherChangeTypes.Created) != 0) watcher.Created += handler;
        if ((watcherType & WatcherChangeTypes.Deleted) != 0) watcher.Deleted += handler;
        if ((watcherType & WatcherChangeTypes.Renamed) != 0) watcher.Renamed += (_, e) => handler(_, e);
    }

    public void Dispose()
    {
        lock (_lock)
        {
            if (_disposed)
                return;

            _disposed = true;
            DisposeWatchersLocked();
        }

        try { _configReloadTimer.Dispose(); }
        catch { }
        try { _idleReleaseTimer.Dispose(); }
        catch { }
    }

    private void DisposeWatchersLocked()
    {
        foreach (FileSystemWatcher watcher in _watchers)
        {
            watcher.EnableRaisingEvents = false;
            watcher.Dispose();
        }

        _watchers.Clear();
    }

    /// <summary>Blocks the calling thread until Ctrl+C is pressed or <see cref="Stop"/> is called.</summary>
    public void WaitForExit()
    {
        Log("Watching configured mateconfig inputs... (press Ctrl+C to stop)");
        using ManualResetEventSlim ctrlC = new(false);
        Console.CancelKeyPress += (_, e) => { e.Cancel = true; ctrlC.Set(); };
        WaitHandle.WaitAny([ctrlC.WaitHandle, _exitSignal.WaitHandle]);
    }
}
