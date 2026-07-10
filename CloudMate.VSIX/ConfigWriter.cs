using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Xml.Linq;

namespace AngryMonkey.CloudMate.VisualStudio;

/// <summary>
/// Reads, mutates, and writes a CloudMate <c>mateconfig.json</c> file for the extension's
/// context-menu commands. Locates the owning project root (nearest <c>.csproj</c>), computes
/// wwwroot-relative output paths, and appends <c>files</c>/<c>images</c> entries without duplicates.
/// </summary>
internal static class ConfigWriter
{
    internal const string ConfigFileName = "mateconfig.json";

    private static readonly JsonSerializerOptions WriteOptions = new()
    {
        WriteIndented = true
    };

    /// <summary>Result of a config mutation, describing what happened for user feedback.</summary>
    internal sealed record Result(bool Added, string ConfigPath, string Input, string Output, string? Message = null);

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
        string configPath = Path.Combine(projectRoot, ConfigFileName);
        return File.Exists(configPath) ? configPath : null;
    }

    /// <summary>
    /// Returns the path to the project's <c>mateconfig.json</c>, creating a minimal scaffold
    /// on disk only when it does not already exist. Use only when the user explicitly adds an entry.
    /// </summary>
    public static string EnsureConfigExists(string projectRoot)
    {
        string configPath = Path.Combine(projectRoot, ConfigFileName);

        bool created = false;
        if (!File.Exists(configPath))
        {
            File.WriteAllText(configPath, "{}\n");
            created = true;
        }

        // Project-file metadata update can trigger project-system work.
        // Only do it when the config is first created to avoid UI hitches on every command.
        if (created)
            EnsureConfigProjectMetadata(projectRoot);

        return configPath;
    }

    /// <summary>Loads the config file as a mutable <see cref="JsonObject"/> (empty object on parse failure).</summary>
    private static JsonObject Load(string configPath)
    {
        try
        {
            string content = File.ReadAllText(configPath);

            if (JsonNode.Parse(content) is JsonObject root)
                return root;
        }
        catch (JsonException)
        {
            // Fall through to a fresh object; we never silently destroy a valid file because
            // parse failures only happen on already-invalid JSON.
        }

        return [];
    }

    /// <summary>Persists a mutated config object back to disk with indented formatting.
    /// Empty arrays are omitted so the file stays clean.</summary>
    private static void Save(string configPath, JsonObject root)
    {
        // Remove any top-level array properties that are now empty
        foreach (string key in root.Select(p => p.Key).ToList())
        {
            if (root[key] is JsonArray arr && arr.Count == 0)
                root.Remove(key);
        }

        File.WriteAllText(configPath, root.ToJsonString(WriteOptions));
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

    private static void EnsureConfigProjectMetadata(string projectRoot)
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
                .Any(e => string.Equals((string?)e.Attribute("Remove"), ConfigFileName, StringComparison.OrdinalIgnoreCase));

            // Ensure: <None Include="mateconfig.json"> ... Never ... </None>
            XElement? noneItem = project.Elements(ns + "ItemGroup")
                .Elements(ns + "None")
                .FirstOrDefault(e =>
                    string.Equals((string?)e.Attribute("Include"), ConfigFileName, StringComparison.OrdinalIgnoreCase) ||
                    string.Equals((string?)e.Attribute("Update"), ConfigFileName, StringComparison.OrdinalIgnoreCase));

            XElement? targetGroup = project.Elements(ns + "ItemGroup").LastOrDefault();
            if (targetGroup is null)
            {
                targetGroup = new XElement(ns + "ItemGroup");
                project.Add(targetGroup);
            }

            if (!hasContentRemove)
                targetGroup.Add(new XElement(ns + "Content", new XAttribute("Remove", ConfigFileName)));

            if (noneItem is null)
            {
                noneItem = new XElement(ns + "None", new XAttribute("Include", ConfigFileName));
                targetGroup.Add(noneItem);
            }

            // Normalize to explicit include-based None item.
            noneItem.SetAttributeValue("Update", null);
            noneItem.SetAttributeValue("Include", ConfigFileName);

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
    private static string ToRelative(string projectRoot, string absolutePath)
    {
        // Path.GetRelativePath is not available on .NET Framework 4.7.2; use Uri instead.
        Uri rootUri = new Uri(projectRoot.TrimEnd('\\', '/') + '/');
        Uri absUri = new Uri(absolutePath);
        return Uri.UnescapeDataString(rootUri.MakeRelativeUri(absUri).ToString().Replace('\\', '/'));
    }

    /// <summary>Returns <see langword="true"/> when a <c>wwwroot</c> folder exists directly under the project root.</summary>
    private static bool HasWwwroot(string projectRoot)
        => Directory.Exists(Path.Combine(projectRoot, "wwwroot"));

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
        if (!HasWwwroot(projectRoot))
            return relativeSource;

        string[] segments = relativeSource.Split(new[] { '/' }, StringSplitOptions.RemoveEmptyEntries);

        // Only source paths rooted under src/ or source/ are mapped into wwwroot.
        // Any other path stays in place (same directory as input).
        if (segments.Length > 0 && SourceFolderNames.Contains(segments[0], StringComparer.OrdinalIgnoreCase))
        {
            segments = segments.Skip(1).ToArray();
            return segments.Length == 0
                ? "wwwroot"
                : "wwwroot/" + string.Join("/", segments);
        }

        return relativeSource;
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

        if (EntryExists(files, relativeInput, relativeOutput))
            return new Result(false, configPath, relativeInput, relativeOutput,
                "This compile entry already exists in mateconfig.json.");

        files.Add(new JsonObject
        {
            ["input"] = relativeInput,
            ["output"] = relativeOutput
        });

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
            return new Result(false, Path.Combine(projectRoot, ConfigFileName), relativeInput, relativeOutput,
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
        string relativeOutput = MapToOutput(projectRoot, relativeFolder);

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
    {
        foreach (JsonNode? node in entries)
        {
            if (node is not JsonObject entry)
                continue;

            if (ValueEquals(entry["input"], input) && ValueEquals(entry["output"], output))
                return true;
        }

        return false;
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
