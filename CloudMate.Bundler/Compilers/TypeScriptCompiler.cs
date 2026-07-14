using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Jint;

namespace AngryMonkey.CloudMate;

internal class TypeScriptCompileResult
{
    /// <summary>Emitted JavaScript per input file, in input order.</summary>
    public List<KeyValuePair<string, string>> JavaScriptOutputs { get; } = [];

    /// <summary>Emitted declaration (.d.ts) content per input file, in input order.</summary>
    public List<KeyValuePair<string, string>> DeclarationOutputs { get; } = [];

    public List<string> Diagnostics { get; } = [];
}

/// <summary>
/// Compiles TypeScript by running the official typescript.js compiler inside Jint with a virtual
/// CompilerHost bridged to .NET file IO. Standard library files are served from embedded resources.
/// </summary>
internal static class TypeScriptCompiler
{
    private const string LibSentinel = "__cloudmate_tslibs";

    private static readonly object _lock = new();
    private static Engine? _engine;
    private static Dictionary<string, string> _emittedFiles = new(StringComparer.OrdinalIgnoreCase);

    private const string Bootstrap =
        """
        function __cm_ts_compile(requestJson) {
            var request = JSON.parse(requestJson);
            var options = {};

            if (request.compilerOptions) {
                var converted = ts.convertCompilerOptionsFromJson(request.compilerOptions, request.basePath);
                options = converted.options || {};
            }

            options.suppressOutputPathCheck = true;
            options.noEmitOnError = false;
            options.noEmit = false;
            options.emitDeclarationOnly = false;
            options.declaration = request.declaration;
            options.declarationMap = false;
            options.declarationDir = undefined;
            options.outDir = undefined;
            options.outFile = undefined;
            options.out = undefined;
            options.rootDir = undefined;
            options.composite = false;
            options.incremental = false;
            options.tsBuildInfoFile = undefined;

            if (request.libFiles && request.libFiles.length)
                options.lib = request.libFiles;

            if (request.sourceMap) {
                options.sourceMap = false;
                options.inlineSourceMap = true;
                options.inlineSources = true;
            }
            else {
                options.sourceMap = false;
                options.inlineSourceMap = false;
            }

            var host = {
                getSourceFile: function (fileName, languageVersion) {
                    var text = __cm_ts_readFile(fileName);
                    return text === null || text === undefined ? undefined : ts.createSourceFile(fileName, text, languageVersion, true);
                },
                getDefaultLibFileName: function (opts) { return ts.getDefaultLibFileName(opts); },
                getDefaultLibLocation: function () { return '__cloudmate_tslibs'; },
                writeFile: function (fileName, text) { __cm_ts_writeFile(fileName, text); },
                getCurrentDirectory: function () { return request.basePath; },
                getDirectories: function (path) { return []; },
                fileExists: function (fileName) { return __cm_ts_fileExists(fileName); },
                readFile: function (fileName) {
                    var text = __cm_ts_readFile(fileName);
                    return text === null ? undefined : text;
                },
                getCanonicalFileName: function (fileName) { return fileName.toLowerCase(); },
                useCaseSensitiveFileNames: function () { return false; },
                getNewLine: function () { return '\n'; },
                directoryExists: function (directoryName) { return __cm_ts_directoryExists(directoryName); },
                realpath: function (path) { return path; },
                trace: function () { }
            };

            var program = ts.createProgram(request.files, options, host);
            var emitResult = program.emit();

            var all = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
            var messages = [];

            for (var i = 0; i < all.length; i++) {
                var diagnostic = all[i];
                var text = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');

                if (diagnostic.file && diagnostic.start !== undefined) {
                    var position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
                    messages.push(diagnostic.file.fileName + '(' + (position.line + 1) + ',' + (position.character + 1) + '): ' + text);
                }
                else {
                    messages.push(text);
                }
            }

            return JSON.stringify(messages);
        }
        """;

    public static TypeScriptCompileResult Compile(IReadOnlyList<string> files, string? tsConfigPath, bool sourceMap, bool declaration)
    {
        lock (_lock)
        {
            Engine engine = GetEngine();

            _emittedFiles = new(StringComparer.OrdinalIgnoreCase);

            List<string> normalizedFiles = [.. files.Select(file => Path.GetFullPath(file).Replace('\\', '/'))];
            string basePath = (Path.GetDirectoryName(Path.GetFullPath(files[0])) ?? Directory.GetCurrentDirectory()).Replace('\\', '/');

            JsonNode? compilerOptions = ReadCompilerOptions(tsConfigPath);
            List<string> libFiles = ExpandLibFiles(compilerOptions);

            string requestJson = JsonSerializer.Serialize(new
            {
                files = normalizedFiles,
                compilerOptions,
                basePath,
                sourceMap,
                declaration,
                libFiles
            });

            string diagnosticsJson = engine.Invoke("__cm_ts_compile", requestJson).AsString();

            TypeScriptCompileResult result = new();
            result.Diagnostics.AddRange(JsonSerializer.Deserialize<List<string>>(diagnosticsJson) ?? []);

            foreach (string file in normalizedFiles)
            {
                string baseName = StripTypeScriptExtension(file);

                if (_emittedFiles.TryGetValue($"{baseName}.js", out string? js))
                    result.JavaScriptOutputs.Add(new(file, js));

                if (_emittedFiles.TryGetValue($"{baseName}.d.ts", out string? dts))
                    result.DeclarationOutputs.Add(new(file, dts));
            }

            return result;
        }
    }

    /// <summary>
    /// Expands the configured (or default) libs into their transitive closure by following
    /// /// &lt;reference lib="..." /&gt; directives. Jint-hosted TypeScript does not process those
    /// directives from barrel lib files, so the full flattened list is passed via options.lib.
    /// </summary>
    private static List<string> ExpandLibFiles(JsonNode? compilerOptions)
    {
        List<string> shortNames = [];

        if (compilerOptions?["lib"] is JsonArray libs)
            foreach (JsonNode? item in libs)
                if (item?.GetValue<string>() is { Length: > 0 } name)
                    shortNames.Add(name);

        if (shortNames.Count == 0)
        {
            string? target = compilerOptions?["target"]?.GetValue<string>()?.ToLowerInvariant();

            shortNames.Add(target switch
            {
                null or "es3" or "es5" => "lib.d.ts",
                "es6" or "es2015" => "lib.es6.d.ts",
                "esnext" => "lib.esnext.full.d.ts",
                _ => $"lib.{target}.full.d.ts"
            });
        }

        List<string> result = [];
        HashSet<string> seen = new(StringComparer.OrdinalIgnoreCase);
        Queue<string> queue = new(shortNames.Select(ToLibFileName));

        while (queue.Count > 0)
        {
            string fileName = queue.Dequeue();

            if (!seen.Add(fileName))
                continue;

            string? content = ReadEmbeddedLib(fileName);

            if (content is null)
                continue;

            result.Add(fileName);

            foreach (Match match in Regex.Matches(content, "///\\s*<reference\\s+lib=\"([^\"]+)\""))
                queue.Enqueue(ToLibFileName(match.Groups[1].Value));
        }

        return result;
    }

    private static string ToLibFileName(string name)
        => name.StartsWith("lib.", StringComparison.OrdinalIgnoreCase) ? name : $"lib.{name.ToLowerInvariant()}.d.ts";

    private static string StripTypeScriptExtension(string file)
    {
        if (file.EndsWith(".d.ts", StringComparison.OrdinalIgnoreCase))
            return file[..^5];

        if (file.EndsWith(".tsx", StringComparison.OrdinalIgnoreCase))
            return file[..^4];

        if (file.EndsWith(".ts", StringComparison.OrdinalIgnoreCase))
            return file[..^3];

        return Path.ChangeExtension(file, null);
    }

    private static JsonNode? ReadCompilerOptions(string? tsConfigPath)
    {
        if (tsConfigPath is null || !File.Exists(tsConfigPath))
            return null;

        JsonDocumentOptions documentOptions = new()
        {
            AllowTrailingCommas = true,
            CommentHandling = JsonCommentHandling.Skip
        };

        try
        {
            using JsonDocument document = JsonDocument.Parse(File.ReadAllText(tsConfigPath), documentOptions);

            if (document.RootElement.TryGetProperty("compilerOptions", out JsonElement compilerOptions))
                return JsonNode.Parse(compilerOptions.GetRawText());
        }
        catch (JsonException)
        {
            // Malformed tsconfig: fall back to compiler defaults, mirroring lenient legacy behavior.
        }

        return null;
    }

    private static Engine GetEngine()
    {
        if (_engine is not null)
            return _engine;

        Engine engine = JintEngineFactory.Create();

        engine.SetValue("__cm_ts_readFile", ReadFile);
        engine.SetValue("__cm_ts_fileExists", FileExists);
        engine.SetValue("__cm_ts_directoryExists", DirectoryExists);
        engine.SetValue("__cm_ts_writeFile", (string fileName, string text) =>
            _emittedFiles[fileName.Replace('\\', '/')] = text);

        engine.Execute(CompilerAssets.GetPreparedScript(CompilerAssets.TypeScript));
        engine.Execute(Bootstrap);

        _engine = engine;
        return engine;
    }

    /// <summary>
    /// Releases the cached Jint engine (tens of MB of JS heap). The next compile
    /// transparently re-creates it. Safe to call at any time.
    /// </summary>
    public static void ReleaseEngine()
    {
        lock (_lock)
        {
            _engine?.Dispose();
            _engine = null;

            lock (_libCache)
                _libCache.Clear();
        }
    }

    private static string? ReadFile(string fileName)
    {
        string path = fileName.Replace('/', Path.DirectorySeparatorChar);

        if (fileName.Contains(LibSentinel))
            return ReadEmbeddedLib(Path.GetFileName(path));

        if (File.Exists(path))
            return File.ReadAllText(path);

        // Lib references (e.g. from "lib" compiler option or default lib) resolved outside the sentinel folder.
        string name = Path.GetFileName(path);

        if (name.StartsWith("lib.", StringComparison.OrdinalIgnoreCase) && name.EndsWith(".d.ts", StringComparison.OrdinalIgnoreCase))
            return ReadEmbeddedLib(name);

        return null;
    }

    private static bool FileExists(string fileName)
    {
        string path = fileName.Replace('/', Path.DirectorySeparatorChar);

        if (fileName.Contains(LibSentinel))
            return ReadEmbeddedLib(Path.GetFileName(path)) is not null;

        if (File.Exists(path))
            return true;

        string name = Path.GetFileName(path);

        return name.StartsWith("lib.", StringComparison.OrdinalIgnoreCase)
            && name.EndsWith(".d.ts", StringComparison.OrdinalIgnoreCase)
            && ReadEmbeddedLib(name) is not null;
    }

    private static bool DirectoryExists(string directoryName)
    {
        if (directoryName.Contains(LibSentinel))
            return true;

        return Directory.Exists(directoryName.Replace('/', Path.DirectorySeparatorChar));
    }

    private static readonly Dictionary<string, string?> _libCache = new(StringComparer.OrdinalIgnoreCase);

    private static string? ReadEmbeddedLib(string libFileName)
    {
        lock (_libCache)
        {
            if (_libCache.TryGetValue(libFileName, out string? cached))
                return cached;

            string? content;

            try
            {
                content = CompilerAssets.GetSource($"TypeScriptLibs.{libFileName}");
            }
            catch (InvalidOperationException)
            {
                content = null;
            }

            _libCache[libFileName] = content;
            return content;
        }
    }
}
