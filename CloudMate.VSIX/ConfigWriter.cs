using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace AngryMonkey.CloudMate.VisualStudio;

/// <summary>
/// Reads, mutates, and writes a CloudMate <c>.mateconfig.json</c> file for the extension's
/// context-menu commands. Locates the owning project root (nearest <c>.csproj</c>), computes
/// wwwroot-relative output paths, and appends <c>files</c>/<c>images</c> entries without duplicates.
/// </summary>
internal static class ConfigWriter
{
    private const string ConfigFileName = ".mateconfig.json";

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
    /// Returns the path to the project's <c>.mateconfig.json</c>, creating an empty scaffold on disk
    /// when it does not already exist.
    /// </summary>
    public static string GetOrCreateConfigPath(string projectRoot)
    {
        string configPath = Path.Combine(projectRoot, ConfigFileName);

        if (!File.Exists(configPath))
        {
            JsonObject scaffold = new()
            {
                ["files"] = new JsonArray(),
                ["images"] = new JsonArray()
            };

            File.WriteAllText(configPath, scaffold.ToJsonString(WriteOptions));
        }

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

    /// <summary>Persists a mutated config object back to disk with indented formatting.</summary>
    private static void Save(string configPath, JsonObject root)
        => File.WriteAllText(configPath, root.ToJsonString(WriteOptions));

    /// <summary>Gets an existing array property or creates and attaches a new one.</summary>
    private static JsonArray GetOrCreateArray(JsonObject root, string propertyName)
    {
        if (root[propertyName] is JsonArray existing)
            return existing;

        JsonArray created = [];
        root[propertyName] = created;
        return created;
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

        if (segments.Length > 0 && SourceFolderNames.Contains(segments[0], StringComparer.OrdinalIgnoreCase))
            segments = segments.Skip(1).ToArray();

        return segments.Length == 0
            ? "wwwroot"
            : "wwwroot/" + string.Join("/", segments);
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
        string configPath = GetOrCreateConfigPath(projectRoot);

        string sourceExtension = Path.GetExtension(sourceFile).TrimStart('.').ToLowerInvariant();
        string outputExtension = CompileOutputExtensions.TryGetValue(sourceExtension, out string? mapped)
            ? mapped
            : sourceExtension; // keep same extension for css, js, html, txt, md, etc.

        string relativeInput = ToRelative(projectRoot, sourceFile);
        string mappedDirectory = MapToOutput(projectRoot, GetRelativeDirectory(relativeInput));
        string outputFileName = $"{Path.GetFileNameWithoutExtension(sourceFile)}.{outputExtension}";
        string relativeOutput = CombineRelative(mappedDirectory, outputFileName);

        JsonObject root = Load(configPath);
        JsonArray files = GetOrCreateArray(root, "files");

        if (EntryExists(files, relativeInput, relativeOutput))
            return new Result(false, configPath, relativeInput, relativeOutput,
                "This compile entry already exists in .mateconfig.json.");

        files.Add(new JsonObject
        {
            ["input"] = relativeInput,
            ["output"] = relativeOutput
        });

        Save(configPath, root);
        return new Result(true, configPath, relativeInput, relativeOutput);
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
        string configPath = GetOrCreateConfigPath(projectRoot);

        string relativeFolder = ToRelative(projectRoot, sourceFolder).TrimEnd('/');
        string relativeInput = string.IsNullOrEmpty(relativeFolder) ? "**/*" : $"{relativeFolder}/**/*";
        string relativeOutput = MapToOutput(projectRoot, relativeFolder);

        JsonObject root = Load(configPath);
        JsonArray images = GetOrCreateArray(root, "images");

        if (EntryExists(images, relativeInput, relativeOutput))
            return new Result(false, configPath, relativeInput, relativeOutput,
                "This compress entry already exists in .mateconfig.json.");

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
