using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Xml.Linq;

namespace AngryMonkey.CloudMate.VisualStudio;

/// <summary>
/// Reads, mutates, and writes a CloudMate <c>mateconfig.json</c> config file for the extension's
/// context-menu commands. Locates the owning project root (nearest <c>.csproj</c>), computes
/// wwwroot-relative output paths, and appends <c>files</c>/<c>images</c> entries without duplicates.
/// Creates <c>mateconfig.json</c> at the project root when it does not yet exist.
/// </summary>
internal static class ConfigWriter
{
    internal const string ConfigFileName = ".mateconfig.json";
    internal static readonly string[] ConfigFileNames = [".mateconfig", ".mateconfig.json", "mateconfig.json"];

    private static readonly JsonSerializerOptions WriteOptions = new()
    {
        WriteIndented = true
    };

    /// <summary>Result of a config mutation, describing what happened for user feedback.</summary>
    internal sealed record Result(bool Added, string ConfigPath, string Input, string Output, string? Message = null);

    /// <summary>Result of a config clean operation.</summary>
    internal sealed record CleanResult(int EntriesRemoved, int InputsRemoved, string ConfigPath);

    /// <summary>Result of an auto-configure operation.</summary>
    internal sealed record AutoConfigureResult(int Added, int AlreadyConfigured, CleanResult Cleaned, string ConfigPath);

    /// <summary>
    /// Walks up from <paramref name="startPath"/> (a file or directory) to find the directory
    /// containing the nearest <c>*.csproj</c>. Returns <see langword="null"/> when none is found.
    /// </summary>
    public static string? FindProjectRoot(string startPath)
    {
        string? directory = Directory.Exists(startPath)
            ? startPath
            : Path.GetDirectoryName(startPath);

        for (DirectoryInfo? current = directory is null ? null : new DirectoryInfo(directory);
             current is not null;
             current = current.Parent)
        {
            if (current.EnumerateFiles("*.csproj", SearchOption.TopDirectoryOnly).Any())
                return current.FullName;
        }

        return null;
    }

    /// <summary>
    /// Returns the path to the project's <c>mateconfig.json</c>, or null if it does not exist.
    /// Never creates the file — callers that need to write must use <see cref="EnsureConfigExists"/>.
    /// </summary>
    public static string? GetConfigPath(string projectRoot)
    {
        foreach (string fileName in ConfigFileNames)
        {
            string configPath = Path.Combine(projectRoot, fileName);
            if (File.Exists(configPath))
                return configPath;
        }

        return null;
    }

    public static bool IsConfigFileName(string fileName)
        => ConfigFileNames.Any(candidate => string.Equals(candidate, fileName, StringComparison.OrdinalIgnoreCase));

    /// <summary>
    /// Returns the path to the project's <c>mateconfig.json</c>, creating a minimal scaffold
    /// on disk only when it does not already exist. Use only when the user explicitly adds an entry.
    /// </summary>
    public static string EnsureConfigExists(string projectRoot)
    {
        string configPath = GetConfigPath(projectRoot) ?? Path.Combine(projectRoot, ConfigFileName);

        if (!File.Exists(configPath))
            File.WriteAllText(configPath, "{}\n");

        return configPath;
    }

    /// <summary>Loads the config file as a mutable <see cref="JsonObject"/> (empty object on any read or parse failure).</summary>
    private static JsonObject Load(string configPath)
    {
        try
        {
            string content = File.ReadAllText(configPath);

            if (JsonNode.Parse(content) is JsonObject root)
                return root;
        }
        catch (IOException)
        {
            // File is being written by a background thread (e.g. AddCompileFile called from Task.Run
            // while BeforeQueryStatus reads it on the UI thread). Return an empty object so QueryStatus
            // degrades gracefully instead of throwing and letting VS permanently disable the command.
        }
        catch (JsonException)
        {
            // Fall through to a fresh object; we never silently destroy a valid file because
            // parse failures only happen on already-invalid JSON.
        }

        return [];
    }

    /// <summary>Persists a mutated config object back to disk with indented formatting.
    /// Uses an atomic temp-file + replace so concurrent readers on the UI thread never
    /// see a partially-written file (which would throw IOException or produce corrupt JSON).
    /// Empty arrays are omitted so the file stays clean.</summary>
    private static void Save(string configPath, JsonObject root)
    {
        // Remove any top-level array properties that are now empty
        foreach (string key in root.Select(p => p.Key).ToList())
        {
            if (root[key] is JsonArray arr && arr.Count == 0)
                root.Remove(key);
        }

        string json = root.ToJsonString(WriteOptions);

        // Write to a sibling temp file, then atomically replace the real config.
        // This ensures the config is never in a partially-written state.
        string tempPath = configPath + ".tmp";
        try
        {
            File.WriteAllText(tempPath, json);
            File.Replace(tempPath, configPath, null);
        }
        catch
        {
            // File.Replace can fail on some network shares or when the destination is locked.
            // Fall back to a direct write, which is still safer than losing the data.
            try { File.Delete(tempPath); } catch { }
            File.WriteAllText(configPath, json);
        }
    }

    /// <summary>Gets an existing array property or creates and attaches a new one.</summary>
    private static JsonArray GetOrCreateArray(JsonObject root, string propertyName)
    {
        if (root[propertyName] is JsonArray existing)
            return existing;

        JsonArray created = [];
        root[propertyName] = created;
        return created;
    }

    // ─── Project metadata (Build Action / Copy settings) ─────────────────────

    private static void EnsureConfigProjectMetadata(string projectRoot, string configFileName)
    {
        try
        {
            string? csprojPath = Directory.EnumerateFiles(projectRoot, "*.csproj", SearchOption.TopDirectoryOnly)
                .FirstOrDefault();
            if (string.IsNullOrEmpty(csprojPath) || !File.Exists(csprojPath))
                return;

            XDocument doc = XDocument.Load(csprojPath, LoadOptions.PreserveWhitespace);
            XElement? project = doc.Root;
            if (project is null)
                return;

            XNamespace ns = project.Name.Namespace;

            // Ensure: <Content Remove="mateconfig.json" />
            bool hasContentRemove = project.Elements(ns + "ItemGroup")
                .Elements(ns + "Content")
                .Any(e => string.Equals((string?)e.Attribute("Remove"), configFileName, StringComparison.OrdinalIgnoreCase));

            // Ensure: <None Include="mateconfig.json"> ... Never ... </None>
            XElement? noneItem = project.Elements(ns + "ItemGroup")
                .Elements(ns + "None")
                .FirstOrDefault(e =>
                    string.Equals((string?)e.Attribute("Include"), configFileName, StringComparison.OrdinalIgnoreCase) ||
                    string.Equals((string?)e.Attribute("Update"), configFileName, StringComparison.OrdinalIgnoreCase));

            XElement? targetGroup = project.Elements(ns + "ItemGroup").LastOrDefault();
            if (targetGroup is null)
            {
                targetGroup = new XElement(ns + "ItemGroup");
                project.Add(targetGroup);
            }

            if (!hasContentRemove)
                targetGroup.Add(new XElement(ns + "Content", new XAttribute("Remove", configFileName)));

            if (noneItem is null)
            {
                noneItem = new XElement(ns + "None", new XAttribute("Include", configFileName));
                targetGroup.Add(noneItem);
            }

            // Normalize to explicit include-based None item.
            noneItem.SetAttributeValue("Update", null);
            noneItem.SetAttributeValue("Include", configFileName);

            SetOrCreateElementValue(noneItem, ns + "CopyToOutputDirectory", "Never");
            SetOrCreateElementValue(noneItem, ns + "CopyToPublishDirectory", "Never");

            doc.Save(csprojPath);
        }
        catch
        {
            // Best effort: failure here should never block command execution.
        }
    }

    private static void SetOrCreateElementValue(XElement parent, XName name, string value)
    {
        XElement? child = parent.Element(name);
        if (child is null)
            parent.Add(new XElement(name, value));
        else
            child.Value = value;
    }

    // ─── Path helpers ──────────────────────────────────────────────────────────

    /// <summary>Leading source-folder segment names that are collapsed away under wwwroot.</summary>
    private static readonly string[] SourceFolderNames = ["src", "source"];

    /// <summary>Converts an absolute path to a forward-slashed path relative to <paramref name="projectRoot"/>.</summary>
    internal static string ToRelative(string projectRoot, string absolutePath)
    {
        // Path.GetRelativePath is not available on .NET Framework 4.7.2; use Uri instead.
        Uri rootUri = new Uri(projectRoot.TrimEnd('\\', '/') + '/');
        Uri absUri = new Uri(absolutePath);
        return Uri.UnescapeDataString(rootUri.MakeRelativeUri(absUri).ToString().Replace('\\', '/'));
    }

    /// <summary>Returns <see langword="true"/> when a <c>wwwroot</c> folder exists directly under the project root.</summary>
    private static bool HasWwwroot(string projectRoot)
        => Directory.Exists(Path.Combine(projectRoot, "wwwroot"));

    /// <summary>Returns <see langword="true"/> when a <c>.csproj</c> file exists directly under the project root.</summary>
    private static bool IsNetProject(string projectRoot)
        => Directory.EnumerateFiles(projectRoot, "*.csproj", SearchOption.TopDirectoryOnly).Any();

    /// <summary>
    /// Maps a project-root-relative source path to its default output location.
    /// When a <c>wwwroot</c> exists directly under the project root, the path is placed under
    /// <c>wwwroot/</c> with a leading <c>src</c>/<c>source</c> segment stripped
    /// (e.g. <c>src/img/logo.png</c> -> <c>wwwroot/img/logo.png</c>). Otherwise the original
    /// relative path is kept (output lands next to the source).
    /// </summary>
    /// <param name="projectRoot">Absolute project root directory.</param>
    /// <param name="relativeSource">Forward-slashed source path relative to the project root.</param>
    private static string MapToOutput(string projectRoot, string relativeSource)
    {
        if (!IsNetProject(projectRoot) && !HasWwwroot(projectRoot))
            return relativeSource;

        string[] segments = relativeSource.Split(new[] { '/' }, StringSplitOptions.RemoveEmptyEntries);

        // Only source paths rooted under src/ or source/ are mapped into wwwroot.
        // Any other path stays in place (same directory as input).
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

    /// <summary>
    /// Computes the output folder for an image-compression entry.
    /// When <see cref="MapToOutput"/> would return the same path as the input
    /// (i.e. no wwwroot remapping applied), a <c>_compressed</c> suffix is appended
    /// to the folder name so that compressed outputs are never written into the
    /// same directory as the source images.
    /// </summary>
    private static string GetCompressOutput(string projectRoot, string relativeFolder)
    {
        string mapped = MapToOutput(projectRoot, relativeFolder);

        if (!string.Equals(mapped, relativeFolder, StringComparison.OrdinalIgnoreCase))
            return mapped;

        // Output would be the same as input - create a sibling folder with _compressed suffix.
        int lastSlash = relativeFolder.LastIndexOf('/');
        string folderName = lastSlash < 0 ? relativeFolder : relativeFolder.Substring(lastSlash + 1);
        string parentDir  = lastSlash < 0 ? string.Empty   : relativeFolder.Substring(0, lastSlash);
        string compressedName = folderName + "_compressed";
        return string.IsNullOrEmpty(parentDir) ? compressedName : parentDir + "/" + compressedName;
    }
    // ─── Compile (files) ───────────────────────────────────────────────────────

    /// <summary>
    /// Maps known source extensions to their compiled output extension.
    /// Extensions not in this table are kept as-is (the file is copied/bundled without transpilation).
    /// </summary>
    private static readonly Dictionary<string, string> CompileOutputExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ["less"] = "css",
        ["scss"] = "css",
        ["sass"] = "css",
        ["ts"]   = "js",
    };

    /// <summary>
    /// Adds a compile entry for <paramref name="sourceFile"/> to the project's <c>.mateconfig.json</c>.
    /// Known source types are mapped to their output extension (.less/.scss/.sass → .css, .ts → .js).
    /// All other file types use the same extension as output and are placed under wwwroot when it exists.
    /// Minified variants for CSS/JS are produced automatically by the bundler.
    /// </summary>
    public static Result AddCompileFile(string projectRoot, string sourceFile)
    {
        string configPath = EnsureConfigExists(projectRoot);

        string sourceExtension = Path.GetExtension(sourceFile).TrimStart('.').ToLowerInvariant();
        string outputExtension = CompileOutputExtensions.TryGetValue(sourceExtension, out string? mapped)
            ? mapped
            : sourceExtension;

        string relativeInput = ToRelative(projectRoot, sourceFile);
        string mappedDirectory = MapToOutput(projectRoot, GetRelativeDirectory(relativeInput));
        string outputFileName = $"{Path.GetFileNameWithoutExtension(sourceFile)}.{outputExtension}";
        string relativeOutput = CombineRelative(mappedDirectory, outputFileName);

        JsonObject root = Load(configPath);
        JsonArray files = GetOrCreateArray(root, "files");

        bool disableMinify = IsRazorComponentStyle(sourceFile);
        JsonObject? existingEntry = FindInputEntry(files, relativeInput);
        if (existingEntry is not null)
        {
            if (disableMinify && existingEntry["minify"] is null)
            {
                existingEntry["minify"] = false;
                Save(configPath, root);
                return new Result(false, configPath, relativeInput, relativeOutput,
                    "Component stylesheet updated with minify: false.");
            }

            return new Result(false, configPath, relativeInput, relativeOutput,
                "This compile entry already exists in mateconfig.json.");
        }

        JsonObject newEntry = new()
        {
            ["input"] = relativeInput,
            ["output"] = relativeOutput
        };

        if (disableMinify)
            newEntry["minify"] = false;

        files.Add(newEntry);

        Save(configPath, root);
        return new Result(true, configPath, relativeInput, relativeOutput);
    }

    /// <summary>
    /// Returns whether <paramref name="sourceFile"/> already exists in <c>files</c> input entries
    /// of the project's <c>.mateconfig.json</c>.
    /// </summary>
    public static bool HasCompileFile(string projectRoot, string sourceFile)
    {
        // Never create the config just to check — if it doesn't exist the file isn't configured.
        string? configPath = GetConfigPath(projectRoot);
        if (configPath is null)
            return false;

        string relativeInput = ToRelative(projectRoot, sourceFile);

        JsonObject root = Load(configPath);
        if (root["files"] is not JsonArray files)
            return false;

        foreach (JsonNode? node in files)
        {
            if (node is not JsonObject entry)
                continue;

            if (ValueEquals(entry["input"], relativeInput))
                return true;
        }

        return false;
    }

    /// <summary>
    /// Removes all compile entries whose <c>input</c> matches <paramref name="sourceFile"/>.
    /// Returns a result indicating whether anything was removed.
    /// </summary>
    public static Result RemoveCompileFile(string projectRoot, string sourceFile)
    {
        string? configPath = GetConfigPath(projectRoot);

        string sourceExtension = Path.GetExtension(sourceFile).TrimStart('.').ToLowerInvariant();
        string outputExtension = CompileOutputExtensions.TryGetValue(sourceExtension, out string? mapped)
            ? mapped
            : sourceExtension;

        string relativeInput = ToRelative(projectRoot, sourceFile);
        string mappedDirectory = MapToOutput(projectRoot, GetRelativeDirectory(relativeInput));
        string outputFileName = $"{Path.GetFileNameWithoutExtension(sourceFile)}.{outputExtension}";
        string relativeOutput = CombineRelative(mappedDirectory, outputFileName);

        if (configPath is null)
            return new Result(false, GetConfigPath(projectRoot) ?? Path.Combine(projectRoot, ConfigFileName), relativeInput, relativeOutput,
                "This file is not configured for compilation.");

        JsonObject root = Load(configPath);
        if (root["files"] is not JsonArray files)
            return new Result(false, configPath, relativeInput, relativeOutput,
                "This file is not configured for compilation.");

        int removed = 0;
        for (int i = files.Count - 1; i >= 0; i--)
        {
            if (files[i] is not JsonObject entry)
                continue;

            if (ValueEquals(entry["input"], relativeInput))
            {
                files.RemoveAt(i);
                removed++;
            }
        }

        if (removed == 0)
            return new Result(false, configPath, relativeInput, relativeOutput,
                "This file is not configured for compilation.");

        Save(configPath, root);
        return new Result(true, configPath, relativeInput, relativeOutput,
            removed == 1 ? "Removed from mateconfig.json." : $"Removed {removed} compile entries from mateconfig.json.");
    }

    // ─── Compress (images) ─────────────────────────────────────────────────────

    /// <summary>
    /// Adds an image-compression entry for the folder <paramref name="sourceFolder"/> to the project's
    /// <c>.mateconfig.json</c>. The input is a recursive glob under the folder and the output is the
    /// folder placed under <c>wwwroot</c> with the same relative path (leading <c>src</c>/<c>source</c>
    /// stripped) when a wwwroot exists; otherwise the folder is kept as-is.
    /// </summary>
    public static Result AddCompressFolder(string projectRoot, string sourceFolder)
    {
        string configPath = EnsureConfigExists(projectRoot);

        string relativeFolder = ToRelative(projectRoot, sourceFolder).TrimEnd('/');
        string relativeInput = string.IsNullOrEmpty(relativeFolder) ? "**/*" : $"{relativeFolder}/**/*";
        string relativeOutput = GetCompressOutput(projectRoot, relativeFolder);

        JsonObject root = Load(configPath);
        JsonArray images = GetOrCreateArray(root, "images");

        if (EntryExists(images, relativeInput, relativeOutput))
            return new Result(false, configPath, relativeInput, relativeOutput,
                "This compress entry already exists in mateconfig.json.");

        images.Add(new JsonObject
        {
            ["input"] = relativeInput,
            ["output"] = relativeOutput
        });

        Save(configPath, root);
        return new Result(true, configPath, relativeInput, relativeOutput);
    }

    /// <summary>
    /// Returns whether <paramref name="sourceFolder"/> already exists in <c>images</c> input entries
    /// of the project's <c>.mateconfig.json</c>.
    /// </summary>
    public static bool HasCompressFolder(string projectRoot, string sourceFolder)
    {
        string? configPath = GetConfigPath(projectRoot);
        if (configPath is null)
            return false;

        string relativeFolder = ToRelative(projectRoot, sourceFolder).TrimEnd('/');
        string relativeInput = string.IsNullOrEmpty(relativeFolder) ? "**/*" : $"{relativeFolder}/**/*";
        string relativeOutput = GetCompressOutput(projectRoot, relativeFolder);

        JsonObject root = Load(configPath);
        if (root["images"] is not JsonArray images)
            return false;

        return EntryExists(images, relativeInput, relativeOutput);
    }

    /// <summary>
    /// Removes all compress entries whose <c>input</c> matches <paramref name="sourceFolder"/>.
    /// Returns a result indicating whether anything was removed.
    /// </summary>
    public static Result RemoveCompressFolder(string projectRoot, string sourceFolder)
    {
        string? configPath = GetConfigPath(projectRoot);

        string relativeFolder = ToRelative(projectRoot, sourceFolder).TrimEnd('/');
        string relativeInput = string.IsNullOrEmpty(relativeFolder) ? "**/*" : $"{relativeFolder}/**/*";
        string relativeOutput = GetCompressOutput(projectRoot, relativeFolder);

        if (configPath is null)
            return new Result(false, GetConfigPath(projectRoot) ?? Path.Combine(projectRoot, ConfigFileName), relativeInput, relativeOutput,
                "This folder is not configured for compression.");

        JsonObject root = Load(configPath);
        if (root["images"] is not JsonArray images)
            return new Result(false, configPath, relativeInput, relativeOutput,
                "This folder is not configured for compression.");

        int removed = 0;
        for (int i = images.Count - 1; i >= 0; i--)
        {
            if (images[i] is not JsonObject entry)
                continue;

            if (ValueEquals(entry["input"], relativeInput))
            {
                images.RemoveAt(i);
                removed++;
            }
        }

        if (removed == 0)
            return new Result(false, configPath, relativeInput, relativeOutput,
                "This folder is not configured for compression.");

        Save(configPath, root);
        return new Result(true, configPath, relativeInput, relativeOutput,
            removed == 1 ? "Removed from mateconfig.json." : $"Removed {removed} compress entries from mateconfig.json.");
    }

    // ─── Clean (remove missing inputs) ──────────────────────────────────────────

    /// <summary>
    /// Removes entries from <c>files</c> and <c>images</c> whose non-glob input paths no
    /// longer exist on disk. Glob patterns (<c>*</c>, <c>?</c>) are always preserved.
    /// When an entry's entire input set is removed the entry itself is deleted; when only
    /// some items in an array input are missing, those items are pruned and the entry kept.
    /// </summary>
    public static CleanResult CleanConfig(string configPath, string projectRoot)
    {
        JsonObject root = Load(configPath);
        int entriesRemoved = 0;
        int inputsRemoved = 0;

        CleanEntries(root["files"] as JsonArray, projectRoot, ref entriesRemoved, ref inputsRemoved);
        CleanEntries(root["images"] as JsonArray, projectRoot, ref entriesRemoved, ref inputsRemoved);

        if (entriesRemoved > 0 || inputsRemoved > 0)
            Save(configPath, root);

        return new CleanResult(entriesRemoved, inputsRemoved, configPath);
    }

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

    /// <summary>
    /// Returns <see langword="true"/> when the input should be kept: glob patterns are always
    /// preserved; concrete paths are kept when they resolve to an existing file or directory.
    /// </summary>
    private static bool InputPathExists(string input, string projectRoot)
    {
        if (input.Contains('*') || input.Contains('?'))
            return true;

        string fullPath = Path.GetFullPath(Path.Combine(projectRoot, input.Replace('/', Path.DirectorySeparatorChar)));
        return File.Exists(fullPath) || Directory.Exists(fullPath);
    }

    // ─── Auto-configure (add unconfigured source files) ─────────────────────────

    /// <summary>
    /// Cleans stale entries first, then scans the project root for compilable source files
    /// (<c>.ts</c>, <c>.less</c>, <c>.scss</c>, <c>.sass</c>) and adds any that are not yet
    /// present in <c>mateconfig.json</c>. Directories that are never source roots
    /// (<c>bin</c>, <c>obj</c>, <c>node_modules</c>, <c>.git</c>, <c>.vs</c>,
    /// <c>wwwroot</c>) are skipped.
    /// </summary>
    public static AutoConfigureResult AutoConfigureFiles(string projectRoot)
    {
        string configPath = EnsureConfigExists(projectRoot);

        // Phase 1: remove stale entries so we don't leave broken inputs behind.
        CleanResult cleaned = CleanConfig(configPath, projectRoot);

        // Phase 2: add unconfigured source files.
        int added = 0;
        int alreadyConfigured = 0;
        JsonObject root = Load(configPath);
        JsonArray files = GetOrCreateArray(root, "files");

        foreach (string file in DiscoverCompilableFiles(projectRoot))
        {
            string relativeInput = ToRelative(projectRoot, file);
            if (FindInputEntry(files, relativeInput) is not null)
            {
                alreadyConfigured++;
                continue;
            }

            string sourceExtension = Path.GetExtension(file).TrimStart('.').ToLowerInvariant();
            string outputExtension = CompileOutputExtensions.TryGetValue(sourceExtension, out string? mapped)
                ? mapped
                : sourceExtension;
            string mappedDirectory = MapToOutput(projectRoot, GetRelativeDirectory(relativeInput));
            string relativeOutput = CombineRelative(mappedDirectory, $"{Path.GetFileNameWithoutExtension(file)}.{outputExtension}");

            JsonObject entry = new()
            {
                ["input"] = relativeInput,
                ["output"] = relativeOutput
            };
            if (IsRazorComponentStyle(file))
                entry["minify"] = false;

            files.Add(entry);
            added++;
        }

        if (added > 0)
            Save(configPath, root);

        return new AutoConfigureResult(added, alreadyConfigured, cleaned, configPath);
    }

    private static readonly HashSet<string> AutoConfigureExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".ts", ".less", ".scss", ".sass"
    };

    private static readonly HashSet<string> ExcludedDirectories = new(StringComparer.OrdinalIgnoreCase)
    {
        "bin", "obj", "node_modules", ".git", ".vs", "wwwroot"
    };

    private static IEnumerable<string> DiscoverCompilableFiles(string projectRoot)
    {
        return EnumerateSourceFiles(new DirectoryInfo(projectRoot));
    }

    private static IEnumerable<string> EnumerateSourceFiles(DirectoryInfo directory)
    {
        FileInfo[] files;
        try { files = directory.GetFiles(); }
        catch { yield break; }

        foreach (FileInfo file in files)
        {
            if (AutoConfigureExtensions.Contains(file.Extension))
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

    // ─── Shared entry helpers ──────────────────────────────────────────────────

    /// <summary>Returns the forward-slashed directory portion of a relative file path ("" for root-level files).</summary>
    private static string GetRelativeDirectory(string relativeFile)
    {
        int lastSlash = relativeFile.LastIndexOf('/');
        return lastSlash < 0 ? string.Empty : relativeFile.Substring(0, lastSlash);
    }

    /// <summary>Joins a directory and file name with a forward slash, tolerating an empty directory.</summary>
    private static string CombineRelative(string directory, string fileName)
        => string.IsNullOrEmpty(directory) ? fileName : $"{directory}/{fileName}";

    /// <summary>Checks whether a files/images array already contains an entry with the same input and output.</summary>
    private static bool EntryExists(JsonArray entries, string input, string output)
        => FindEntry(entries, input, output) is not null;

    private static JsonObject? FindInputEntry(JsonArray entries, string input)
    {
        foreach (JsonNode? node in entries)
            if (node is JsonObject entry && ValueEquals(entry["input"], input))
                return entry;

        return null;
    }

    private static JsonObject? FindEntry(JsonArray entries, string input, string output)
    {
        foreach (JsonNode? node in entries)
        {
            if (node is not JsonObject entry)
                continue;

            if (ValueEquals(entry["input"], input) && ValueEquals(entry["output"], output))
                return entry;
        }

        return null;
    }

    private static bool IsRazorComponentStyle(string sourceFile)
    {
        string extension = Path.GetExtension(sourceFile);
        if (!extension.Equals(".less", StringComparison.OrdinalIgnoreCase)
            && !extension.Equals(".scss", StringComparison.OrdinalIgnoreCase)
            && !extension.Equals(".sass", StringComparison.OrdinalIgnoreCase))
            return false;

        string withoutStyleExtension = Path.Combine(
            Path.GetDirectoryName(sourceFile) ?? string.Empty,
            Path.GetFileNameWithoutExtension(sourceFile));

        return withoutStyleExtension.EndsWith(".razor", StringComparison.OrdinalIgnoreCase)
            || File.Exists(withoutStyleExtension + ".razor");
    }

    /// <summary>
    /// Compares a JSON node (which may be a single string or an array of strings) against
    /// <paramref name="expected"/>, matching the config's single-or-array convention.
    /// </summary>
    private static bool ValueEquals(JsonNode? node, string expected)
    {
        switch (node)
        {
            case JsonValue value when value.TryGetValue(out string? single):
                return string.Equals(single, expected, StringComparison.OrdinalIgnoreCase);

            case JsonArray array:
                return array.Count == 1
                    && array[0] is JsonValue first
                    && first.TryGetValue(out string? only)
                    && string.Equals(only, expected, StringComparison.OrdinalIgnoreCase);

            default:
                return false;
        }
    }
}
