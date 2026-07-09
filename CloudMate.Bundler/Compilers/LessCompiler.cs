using System.Text.Json;
using Jint;

namespace AngryMonkey.CloudMate;

/// <summary>
/// Compiles LESS by running the official less.js browser bundle inside Jint with minimal DOM shims
/// and a synchronous file manager bridged to .NET file IO for @import resolution.
/// </summary>
internal static class LessCompiler
{
    private static readonly object _lock = new();
    private static Engine? _engine;

    private const string BrowserShims =
        """
        // Jint's Error.prototype.stack accessor strictly requires a string value. less.js assigns
        // e.stack (which can be undefined for plain error-shaped objects) directly onto LessError
        // instances, so the accessor is replaced with a permissive writable data property.
        Object.defineProperty(Error.prototype, 'stack', { value: '', writable: true, configurable: true, enumerable: false });

        var window = self;
        window.location = { href: '', protocol: 'file:', hostname: 'localhost', port: '', pathname: '/', hash: '' };
        var location = window.location;
        var navigator = { userAgent: 'CloudMate' };
        window.navigator = navigator;

        var document = {
            currentScript: null,
            documentElement: { },
            head: { appendChild: function () { }, removeChild: function () { }, insertBefore: function () { } },
            body: { appendChild: function () { }, removeChild: function () { } },
            getElementsByTagName: function () { return []; },
            getElementById: function () { return null; },
            createElement: function () { return { style: { }, appendChild: function () { }, setAttribute: function () { } }; },

            querySelector: function () { return null; },
            querySelectorAll: function () { return []; },
            addEventListener: function () { },
            removeEventListener: function () { }
        };
        window.document = document;

        // Options consumed by the less browser bundle on startup; onReady false prevents page scanning.
        window.less = { env: 'production', logLevel: 0, async: false, fileAsync: false, onReady: false };
        """;

    private const string Bootstrap =
        """
        var __cm_less_fileManager = {
            supports: function () { return true; },
            supportsSync: function () { return true; },
            loadFileSync: function (filename, currentDirectory, options, environment) {
                var resolved = __cm_less_resolve(filename, currentDirectory);

                if (resolved === null)
                    return { type: 'File', message: "'" + filename + "' wasn't found.", stack: '' };

                var contents = __cm_less_readFile(resolved);

                if (contents === null)
                    return { type: 'File', message: "'" + filename + "' wasn't found.", stack: '' };

                return { contents: contents, filename: resolved };
            },
            loadFile: function (filename, currentDirectory, options, environment, callback) {
                var result = this.loadFileSync(filename, currentDirectory, options, environment);

                if (callback) {
                    if (result.error) callback(result.error);
                    else callback(null, result);
                    return;
                }

                return {
                    then: function (fulfill, reject) {
                        if (result.error) { if (reject) reject(result.error); }
                        else fulfill(result);
                    }
                };
            },
            getPath: function (filename) {
                var j = filename.lastIndexOf('?');
                if (j > 0) filename = filename.slice(0, j);
                j = filename.lastIndexOf('/');
                if (j < 0) j = filename.lastIndexOf('\\');
                if (j < 0) return '';
                return filename.slice(0, j + 1);
            },
            tryAppendExtension: function (path, ext) { return /(\.[a-z]*$)|([\?;].*)$/.test(path) ? path : path + ext; },
            tryAppendLessExtension: function (path) { return this.tryAppendExtension(path, '.less'); },
            alwaysMakePathsAbsolute: function () { return false; },
            isPathAbsolute: function (path) { return (/^(?:[a-z-]+:|\/|\\|#)/i).test(path) || (/^[A-Za-z]:/).test(path); },
            join: function (basePath, laterPath) { if (!basePath) return laterPath; return basePath + laterPath; },
            pathDiff: function (url, baseUrl) { return ''; }
        };

        var __cm_less_plugin = {
            install: function (lessInstance, pluginManager) {
                pluginManager.addFileManager(__cm_less_fileManager);
            }
        };

        function __cm_less_compile(requestJson) {
            var request = JSON.parse(requestJson);
            var result = { css: null, error: null };

            var options = {
                filename: request.filename,
                syncImport: true,
                javascriptEnabled: false,
                plugins: [__cm_less_plugin]
            };

            less.render(request.input, options, function (error, output) {
                if (error)
                    result.error = (error.type || 'Less') + ' error: ' + error.message
                        + (error.filename ? ' in ' + error.filename + (error.line !== undefined && error.line !== null ? ' on line ' + error.line : '') : '');
                else
                    result.css = output.css;
            });

            return JSON.stringify(result);
        }
        """;

    private static bool _sourceMapWarningIssued;

    /// <summary>Compiles a single LESS file to CSS.</summary>
    public static string Compile(string filePath, bool sourceMap)
    {
        lock (_lock)
        {
            if (sourceMap && !_sourceMapWarningIssued)
            {
                _sourceMapWarningIssued = true;
                Console.Error.WriteLine("LESS inline source maps are not supported yet; compiling without source maps.");
            }

            Engine engine = GetEngine();

            string fullPath = Path.GetFullPath(filePath).Replace('\\', '/');

            string requestJson = JsonSerializer.Serialize(new
            {
                input = File.ReadAllText(filePath),
                filename = fullPath
            });

            string resultJson = engine.Invoke("__cm_less_compile", requestJson).AsString();
            JsonElement result = JsonDocument.Parse(resultJson).RootElement;

            if (result.TryGetProperty("error", out JsonElement error) && error.ValueKind == JsonValueKind.String)
                throw new InvalidOperationException(error.GetString());

            return result.GetProperty("css").GetString() ?? string.Empty;
        }
    }

    private static Engine GetEngine()
    {
        if (_engine is not null)
            return _engine;

        Engine engine = JintEngineFactory.Create();

        engine.SetValue("__cm_less_readFile", ReadFile);
        engine.SetValue("__cm_less_resolve", Resolve);

        engine.Execute(BrowserShims);
        engine.Execute(CompilerAssets.GetPreparedScript(CompilerAssets.Less));
        engine.Execute(Bootstrap);

        _engine = engine;
        return engine;
    }

    private static string? ReadFile(string fileName)
    {
        string path = fileName.Replace('/', Path.DirectorySeparatorChar);

        return File.Exists(path) ? File.ReadAllText(path) : null;
    }

    private static string? Resolve(string fileName, string? currentDirectory)
    {
        string candidate = fileName.Replace('/', Path.DirectorySeparatorChar);

        if (!Path.IsPathRooted(candidate) && currentDirectory is not null)
            candidate = Path.Combine(currentDirectory.Replace('/', Path.DirectorySeparatorChar), candidate);

        candidate = Path.GetFullPath(candidate);

        if (File.Exists(candidate))
            return candidate.Replace('\\', '/');

        if (!Path.HasExtension(candidate) && File.Exists($"{candidate}.less"))
            return $"{candidate.Replace('\\', '/')}.less";

        return null;
    }
}
