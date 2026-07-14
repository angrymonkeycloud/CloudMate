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
    private readonly ManualResetEventSlim _exitSignal = new(false);
    private readonly Dictionary<string, DateTime> _lastRunUtc = [];
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
        // Collect all (file, build) pairs that depend on implicit .less / .scss imports so a
        // single shared recursive watcher per extension can dispatch to all of them. Creating
        // one recursive root watcher per entry×build wastes memory and fires duplicate builds.
        List<(MateConfigFile File, string Build)> lessSubscribers = [];
        List<(MateConfigFile File, string Build)> scssSubscribers = [];

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

                    string filter = Path.GetFileName(inputPattern);

                    AddWatcher(watchDir, filter, (_, _) => RunFile(capturedFile, capturedBuild));
                }

                // Register for shared implicit-import watchers instead of per-entry recursive ones.
                if (MateConfigFile.HasExtension(file.Input, "less", _config.RootDirectory))
                    lessSubscribers.Add((capturedFile, capturedBuild));

                if (MateConfigFile.HasExtension(file.Input, "scss", _config.RootDirectory) ||
                    MateConfigFile.HasExtension(file.Input, "sass", _config.RootDirectory))
                    scssSubscribers.Add((capturedFile, capturedBuild));
            }
        }

        // One recursive watcher per extension, dispatching to every subscribed entry.
        if (lessSubscribers.Count > 0)
            AddWatcher(_config.RootDirectory, "*.less", (_, _) =>
            {
                foreach ((MateConfigFile f, string b) in lessSubscribers)
                    RunFile(f, b);
            }, recursive: true);

        if (scssSubscribers.Count > 0)
            AddWatcher(_config.RootDirectory, "*.scss", (_, _) =>
            {
                foreach ((MateConfigFile f, string b) in scssSubscribers)
                    RunFile(f, b);
            }, recursive: true);
    }

    private void AttachConfigWatcher()
    {
        string? configFile = MateConfig.FindConfigurationFile(_config.RootDirectory);

        if (configFile is null)
            return;

        string dir = Path.GetDirectoryName(configFile)!;
        string name = Path.GetFileName(configFile);

        // Changed/Created = reload; Deleted = stop.
        AddWatcher(dir, name, (_, _) => RestartAll());
        AddWatcher(dir, name, (_, _) => RestartAll(), watcherType: WatcherChangeTypes.Deleted);
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
            if (_disposed)
                return;

            // Debounce: FileSystemWatcher typically raises 2+ events per save.
            string key = $"{string.Join("|", file.Input)}::{buildName}";
            DateTime now = DateTime.UtcNow;

            if (_lastRunUtc.TryGetValue(key, out DateTime last) && (now - last).TotalMilliseconds < 250)
                return;

            _lastRunUtc[key] = now;

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
        string? configFile = MateConfig.FindConfigurationFile(_config.RootDirectory);

        // Config deleted — stop the watcher and signal WaitForExit to unblock.
        if (configFile is null || !File.Exists(configFile))
        {
            Log("mateconfig.json deleted — stopping watch.");
            Stop();
            return;
        }

        Log("Config changed — restarting watchers...");
        Dispose();

        try
        {
            MateConfig.Get(_config.RootDirectory);
            lock (_lock)
            {
                _disposed = false;
                AttachFileWatchers();
                AttachConfigWatcher();
                AttachImageWatchers();
            }
        }
        catch (FileNotFoundException)
        {
            // Config gone by the time we reloaded — treat as deletion.
            Log("mateconfig.json not found after reload — stopping watch.");
            Stop();
        }
        catch (Exception ex)
        {
            LogError($"Could not reload configuration: {ex.Message}");
        }
    }

    /// <summary>Signals <see cref="WaitForExit"/> to return and disposes all watchers.</summary>
    public void Stop()
    {
        Dispose();
        _exitSignal.Set();
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

    /// <summary>Blocks the calling thread until Ctrl+C is pressed or <see cref="Stop"/> is called.</summary>
    public void WaitForExit()
    {
        Log("Watching for changes... (press Ctrl+C to stop)");

        using ManualResetEventSlim ctrlC = new(false);

        Console.CancelKeyPress += (_, e) =>
        {
            e.Cancel = true;
            ctrlC.Set();
        };

        // Wait until either Ctrl+C or an internal stop signal (e.g. config deleted).
        WaitHandle.WaitAny([ctrlC.WaitHandle, _exitSignal.WaitHandle]);
    }
}
