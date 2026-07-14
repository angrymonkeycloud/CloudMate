using System.Text.Json;
using System.Text.Json.Nodes;

namespace AngryMonkey.CloudMate;

/// <summary>
/// Manages <c>mateconfig.json</c> on disk: removes stale entries and discovers
/// unconfigured source files. Intended for use by the CLI and any other .NET 10+ consumer.
/// </summary>
public static class MateConfigManager
{
    /// <summary>Standard output sink; override to redirect log messages.</summary>
    public static Action<string> Log { get; set; } = Console.WriteLine;

    /// <summary>Error output sink.</summary>
    public static Action<string> LogError { get; set; } = Console.Error.WriteLine;

    private const string ConfigFileName = "mateconfig.json";

    // ─── Result records ──────────────────────────────────────────────────────────

    /// <summary>Result of a <see cref="CleanConfig"/> run.</summary>
    public record CleanConfigResult(int EntriesRemoved, int InputsRemoved);

    /// <summary>Result of an <see cref="AutoConfigure"/> run.</summary>
    public record AutoConfigureResult(int Added, int AlreadyConfigured, CleanConfigResult Cleaned);

    // ─── Public API ──────────────────────────────────────────────────────────────

    /// <summary>
    /// Removes <c>files</c> and <c>images</c> entries from <c>mateconfig.json</c> whose
    /// non-glob input paths no longer exist on disk. Glob patterns are always preserved.
    /// Returns the number of entries and individual inputs that were removed.
    /// </summary>
    public static CleanConfigResult CleanConfig(string projectRoot)
    {
        string configPath = Path.Combine(projectRoot, ConfigFileName);

        if (!File.Exists(configPath))
            return new CleanConfigResult(0, 0);

        JsonObject root = LoadJson(configPath);
        int entriesRemoved = 0;
        int inputsRemoved = 0;

        CleanEntries(root["files"] as JsonArray, projectRoot, ref entriesRemoved, ref inputsRemoved);
        CleanEntries(root["images"] as JsonArray, projectRoot, ref entriesRemoved, ref inputsRemoved);

        if (entriesRemoved > 0 || inputsRemoved > 0)
            SaveJson(configPath, root);

        return new CleanConfigResult(entriesRemoved, inputsRemoved);
    }

    /// <summary>
    /// Cleans stale entries first, then scans the project root for compilable source files
    /// (<c>.ts</c>, <c>.less</c>, <c>.scss</c>, <c>.sass</c>) and adds any that are not yet
    /// present in <c>mateconfig.json</c>. Creates <c>mateconfig.json</c> if it does not exist.
    /// </summary>
    public static AutoConfigureResult AutoConfigure(string projectRoot)
    {
        string configPath = Path.Combine(projectRoot, ConfigFileName);

        if (!File.Exists(configPath))
            File.WriteAllText(configPath, "{}\n");

        // Phase 1: clean stale entries
        CleanConfigResult cleanResult = CleanConfig(projectRoot);

        // Phase 2: add unconfigured source files
        JsonObject root = LoadJson(configPath);
        JsonArray files = GetOrCreateArray(root, "files");

        int added = 0;
        int alreadyConfigured = 0;

        foreach (string file in DiscoverSourceFiles(projectRoot))
        {
            string relativeInput = ToRelative(projectRoot, file);

            if (IsAlreadyConfigured(files, relativeInput))
            {
                alreadyConfigured++;
                continue;
            }

            string sourceExt = Path.GetExtension(file).TrimStart('.').ToLowerInvariant();
            string outputExt = CompileOutputExtensions.TryGetValue(sourceExt, out string? mapped) ? mapped : sourceExt;
            string relDir = GetRelativeDirectory(relativeInput);
            string mappedDir = MapToOutput(projectRoot, relDir);
            string outputFileName = $"{Path.GetFileNameWithoutExtension(file)}.{outputExt}";
            string relativeOutput = CombineRelative(mappedDir, outputFileName);

            files.Add(new JsonObject { ["input"] = relativeInput, ["output"] = relativeOutput });
            added++;
        }

        if (added > 0)
            SaveJson(configPath, root);

        return new AutoConfigureResult(added, alreadyConfigured, cleanResult);
    }

    // ─── Extension maps & directory constants ────────────────────────────────────

    private static readonly Dictionary<string, string> CompileOutputExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ["less"] = "css",
        ["scss"] = "css",
        ["sass"] = "css",
        ["ts"]   = "js",
    };

    private static readonly HashSet<string> SourceExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".ts", ".less", ".scss", ".sass"
    };

    private static readonly HashSet<string> ExcludedDirectories = new(StringComparer.OrdinalIgnoreCase)
    {
        "bin", "obj", "node_modules", ".git", ".vs", "wwwroot"
    };

    private static readonly string[] SourceFolderNames = ["src", "source"];

    // ─── Clean helpers ───────────────────────────────────────────────────────────

    private static void CleanEntries(JsonArray? entries, string projectRoot, ref int entriesRemoved, ref int inputsRemoved)
    {
        if (entries is null)
            return;

        for (int i = entries.Count - 1; i >= 0; i--)
        {
            if (entries[i] is not JsonObject entry)
                continue;

            JsonNode? inputNode = entry["input"];

            if (inputNode is JsonValue singleValue && singleValue.TryGetValue(out string? singleStr))
            {
                if (!InputPathExists(singleStr!, projectRoot))
                {
                    entries.RemoveAt(i);
                    entriesRemoved++;
                }
            }
            else if (inputNode is JsonArray inputArray)
            {
                int removed = 0;

                for (int j = inputArray.Count - 1; j >= 0; j--)
                {
                    if (inputArray[j] is JsonValue v && v.TryGetValue(out string? s) && !InputPathExists(s!, projectRoot))
                    {
                        inputArray.RemoveAt(j);
                        removed++;
                    }
                }

                inputsRemoved += removed;

                if (inputArray.Count == 0)
                {
                    entries.RemoveAt(i);
                    entriesRemoved++;
                }
            }
        }
    }

    private static bool InputPathExists(string input, string projectRoot)
    {
        if (input.Contains('*') || input.Contains('?'))
            return true;

        string fullPath = Path.GetFullPath(Path.Combine(projectRoot, input.Replace('/', Path.DirectorySeparatorChar)));
        return File.Exists(fullPath) || Directory.Exists(fullPath);
    }

    // ─── Discovery helpers ───────────────────────────────────────────────────────

    private static IEnumerable<string> DiscoverSourceFiles(string projectRoot)
        => EnumerateSourceFiles(new DirectoryInfo(projectRoot));

    private static IEnumerable<string> EnumerateSourceFiles(DirectoryInfo directory)
    {
        FileInfo[] files;
        try { files = directory.GetFiles(); }
        catch { yield break; }

        foreach (FileInfo file in files)
        {
            if (SourceExtensions.Contains(file.Extension))
                yield return file.FullName;
        }

        DirectoryInfo[] subdirs;
        try { subdirs = directory.GetDirectories(); }
        catch { yield break; }

        foreach (DirectoryInfo subdir in subdirs)
        {
            if (ExcludedDirectories.Contains(subdir.Name))
                continue;

            foreach (string file in EnumerateSourceFiles(subdir))
                yield return file;
        }
    }

    private static bool IsAlreadyConfigured(JsonArray files, string relativeInput)
    {
        foreach (JsonNode? node in files)
        {
            if (node is not JsonObject entry)
                continue;

            JsonNode? inputNode = entry["input"];

            if (inputNode is JsonValue v && v.TryGetValue(out string? s) &&
                string.Equals(s, relativeInput, StringComparison.OrdinalIgnoreCase))
                return true;

            if (inputNode is JsonArray arr)
            {
                foreach (JsonNode? item in arr)
                {
                    if (item is JsonValue iv && iv.TryGetValue(out string? is2) &&
                        string.Equals(is2, relativeInput, StringComparison.OrdinalIgnoreCase))
                        return true;
                }
            }
        }

        return false;
    }

    // ─── Path helpers ────────────────────────────────────────────────────────────

    private static string ToRelative(string projectRoot, string absolutePath)
    {
        string root = projectRoot.TrimEnd('\\', '/') + '/';
        string abs = absolutePath.Replace('\\', '/');
        string rootFwd = root.Replace('\\', '/');

        if (abs.StartsWith(rootFwd, StringComparison.OrdinalIgnoreCase))
            return abs.Substring(rootFwd.Length);

        // Fallback: use Path.GetRelativePath (available in .NET 5+)
        return Path.GetRelativePath(projectRoot, absolutePath).Replace('\\', '/');
    }

    private static bool HasWwwroot(string projectRoot)
        => Directory.Exists(Path.Combine(projectRoot, "wwwroot"));

    private static bool IsNetProject(string projectRoot)
        => Directory.EnumerateFiles(projectRoot, "*.csproj", SearchOption.TopDirectoryOnly).Any();

    private static string MapToOutput(string projectRoot, string relativeSource)
    {
        if (!IsNetProject(projectRoot) && !HasWwwroot(projectRoot))
            return relativeSource;

        string[] segments = relativeSource.Split(new[] { '/' }, StringSplitOptions.RemoveEmptyEntries);

        if (segments.Length > 0 && SourceFolderNames.Contains(segments[0], StringComparer.OrdinalIgnoreCase))
        {
            string[] remaining = segments.Skip(1).ToArray();

            // If the source folder itself was added (no sub-path), keep the output path as-is.
            if (remaining.Length == 0)
                return relativeSource;

            return "wwwroot/" + string.Join("/", remaining);
        }

        return relativeSource;
    }

    private static string GetRelativeDirectory(string relativeFile)
    {
        int lastSlash = relativeFile.LastIndexOf('/');
        return lastSlash < 0 ? string.Empty : relativeFile[..lastSlash];
    }

    private static string CombineRelative(string directory, string fileName)
        => string.IsNullOrEmpty(directory) ? fileName : $"{directory}/{fileName}";

    // ─── JSON I/O ────────────────────────────────────────────────────────────────

    private static readonly JsonSerializerOptions WriteOptions = new() { WriteIndented = true };

    private static JsonObject LoadJson(string configPath)
    {
        try
        {
            string content = File.ReadAllText(configPath);
            if (JsonNode.Parse(content) is JsonObject root)
                return root;
        }
        catch (IOException) { }
        catch (JsonException) { }

        return [];
    }

    private static JsonArray GetOrCreateArray(JsonObject root, string propertyName)
    {
        if (root[propertyName] is JsonArray existing)
            return existing;

        JsonArray created = [];
        root[propertyName] = created;
        return created;
    }

    private static void SaveJson(string configPath, JsonObject root)
    {
        // Remove empty top-level arrays
        foreach (string key in root.Select(p => p.Key).ToList())
        {
            if (root[key] is JsonArray arr && arr.Count == 0)
                root.Remove(key);
        }

        string json = root.ToJsonString(WriteOptions);
        string tempPath = configPath + ".tmp";

        try
        {
            File.WriteAllText(tempPath, json);
            File.Replace(tempPath, configPath, null);
        }
        catch
        {
            try { File.Delete(tempPath); } catch { }
            File.WriteAllText(configPath, json);
        }
    }
}
