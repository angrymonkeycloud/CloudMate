namespace AngryMonkey.CloudMate;

/// <summary>
/// File-system watcher for the CloudMate build pipeline. Port of the chokidar-based watch logic
/// from legacy bundler.ts and compressor.ts.
/// Watches:
///   - Each file-entry's declared input globs
///   - All .less / .scss files under the working directory (because @import dependencies are implicit)
///   - The mateconfig file itself (triggers a full restart)
///   - Image input globs (add / change / delete)
/// </summary>
public sealed class MateWatcher : IDisposable
{
    private readonly MateConfig _config;
    private readonly IReadOnlyList<string>? _builds;
    private readonly List<FileSystemWatcher> _watchers = [];
    private readonly object _lock = new();
    private bool _disposed;

    public static Action<string> Log { get; set; } = Console.WriteLine;
    public static Action<string> LogError { get; set; } = Console.Error.WriteLine;

    public MateWatcher(MateConfig config, IReadOnlyList<string>? builds = null)
    {
        _config = config;
        _builds = builds;

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

                MateConfigFile capturedFile = file;
                string capturedBuild = buildName;

                // Watch each declared input path directly.
                foreach (string inputPattern in file.Input)
                {
                    string watchDir = GlobResolver.GetBaseDirectory(inputPattern, _config.RootDirectory);

                    if (!Directory.Exists(watchDir))
                        watchDir = _config.RootDirectory;

                    string filter = GlobResolver.IsGlob(inputPattern)
                        ? Path.GetFileName(inputPattern)
                        : Path.GetFileName(inputPattern);

                    AddWatcher(watchDir, filter, (_, _) => RunFile(capturedFile, capturedBuild));
                }

                // Always watch .less and .scss under root (they may be @imported by other files).
                if (MateConfigFile.HasExtension(file.Input, "less", _config.RootDirectory))
                    AddWatcher(_config.RootDirectory, "*.less", (_, _) => RunFile(capturedFile, capturedBuild), recursive: true);

                if (MateConfigFile.HasExtension(file.Input, "scss", _config.RootDirectory) ||
                    MateConfigFile.HasExtension(file.Input, "sass", _config.RootDirectory))
                    AddWatcher(_config.RootDirectory, "*.scss", (_, _) => RunFile(capturedFile, capturedBuild), recursive: true);
            }
        }
    }

    private void AttachConfigWatcher()
    {
        string? configFile = MateConfig.FindConfigurationFile(_config.RootDirectory);

        if (configFile is null)
            return;

        string dir = Path.GetDirectoryName(configFile)!;
        string name = Path.GetFileName(configFile);

        AddWatcher(dir, name, (_, _) => RestartAll());
    }

    private void AttachImageWatchers()
    {
        if (_config.Images is null)
            return;

        foreach (MateConfigImage imageConfig in _config.Images)
        {
            MateConfigImage captured = imageConfig;

            foreach (string input in imageConfig.Input)
            {
                string watchDir = GlobResolver.GetBaseDirectory(input, _config.RootDirectory);

                if (!Directory.Exists(watchDir))
                    watchDir = _config.RootDirectory;

                string filter = GlobResolver.IsGlob(input) ? Path.GetFileName(input) : "*";

                AddWatcher(watchDir, filter, (_, e) =>
                {
                    MateImageCompressor.QueueImages(_config, captured, @override: true);
                    MateImageCompressor.CompressImages();
                });

                AddWatcher(watchDir, filter, (_, e) =>
                {
                    if (e.FullPath is { } fp)
                        MateImageCompressor.Delete(_config, captured, fp);
                }, watcherType: WatcherChangeTypes.Deleted);
            }
        }
    }

    private void RunFile(MateConfigFile file, string buildName)
    {
        lock (_lock)
        {
            try
            {
                MateBundler.RunFiles(_config, file, [buildName]);
            }
            catch (Exception ex)
            {
                LogError($"Watch error: {ex.Message}");
            }
        }
    }

    private void RestartAll()
    {
        Log("Config changed — restarting watchers...");

        Dispose();

        try
        {
            MateConfig config = MateConfig.Get(_config.RootDirectory);
            lock (_lock)
            {
                _disposed = false;
                _ = new MateWatcher(config, _builds);
            }
        }
        catch (Exception ex)
        {
            LogError($"Could not reload configuration: {ex.Message}");
        }
    }

    private void AddWatcher(
        string directory,
        string filter,
        FileSystemEventHandler handler,
        bool recursive = false,
        WatcherChangeTypes watcherType = WatcherChangeTypes.Changed | WatcherChangeTypes.Created)
    {
        if (!Directory.Exists(directory))
            return;

        FileSystemWatcher watcher = new(directory)
        {
            Filter = filter,
            IncludeSubdirectories = recursive,
            NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName | NotifyFilters.DirectoryName,
            EnableRaisingEvents = true
        };

        if ((watcherType & WatcherChangeTypes.Changed) != 0)
            watcher.Changed += handler;

        if ((watcherType & WatcherChangeTypes.Created) != 0)
            watcher.Created += handler;

        if ((watcherType & WatcherChangeTypes.Deleted) != 0)
            watcher.Deleted += handler;

        lock (_lock)
            _watchers.Add(watcher);
    }

    public void Dispose()
    {
        lock (_lock)
        {
            if (_disposed)
                return;

            _disposed = true;

            foreach (FileSystemWatcher w in _watchers)
            {
                w.EnableRaisingEvents = false;
                w.Dispose();
            }

            _watchers.Clear();
        }
    }

    /// <summary>Blocks the calling thread indefinitely, keeping the watchers alive.</summary>
    public void WaitForExit()
    {
        Log("Watching for changes... (press Ctrl+C to stop)");

        using ManualResetEventSlim resetEvent = new(false);

        Console.CancelKeyPress += (_, e) =>
        {
            e.Cancel = true;
            resetEvent.Set();
        };

        resetEvent.Wait();
    }
}
