using System.Text;
using System.Text.Json;
using Jint;

namespace AngryMonkey.CloudMate;

/// <summary>
/// Compiles SCSS/SASS by running the official dart-sass JavaScript build (sass.dart.js + immutable)
/// inside Jint. Import resolution is bridged to .NET, honoring sass partial conventions.
/// </summary>
internal static class SassCompiler
{
    private static readonly object _lock = new();
    private static Engine? _engine;

    /// <summary>Minimal polyfills for browser globals dart-sass expects (Jint has no URL/TextEncoder built-ins).</summary>
    private const string Polyfills =
        """
        function URL(url, base) {
            var href = '' + url;

            if (base !== undefined && base !== null && !(/^[a-z][a-z0-9+.-]*:/i.test(href))) {
                var baseHref = ('' + base).replace(/[?#].*$/, '');

                if (href.indexOf('/') === 0) {
                    var schemeMatch = baseHref.match(/^([a-z][a-z0-9+.-]*:\/*)/i);
                    href = (schemeMatch ? schemeMatch[1] : '') + href.replace(/^\/+/, '');
                }
                else {
                    href = baseHref.replace(/[^\/]*$/, '') + href;
                }
            }

            // Normalize ./ and ../ segments (keeps scheme prefix intact).
            var match = href.match(/^([a-z][a-z0-9+.-]*:\/*)?([\s\S]*)$/i);
            var prefix = match[1] || '';
            var segments = match[2].split('/');
            var output = [];

            for (var i = 0; i < segments.length; i++) {
                var segment = segments[i];

                if (segment === '.') continue;

                if (segment === '..') {
                    if (output.length > 0 && output[output.length - 1] !== '..') output.pop();
                    continue;
                }

                output.push(segment);
            }

            this.href = prefix + output.join('/');

            var schemeOnly = this.href.match(/^([a-z][a-z0-9+.-]*):/i);
            this.protocol = schemeOnly ? schemeOnly[1] + ':' : '';
            this.pathname = this.href.replace(/^[a-z][a-z0-9+.-]*:\/\/[^\/]*/i, '').replace(/^[a-z][a-z0-9+.-]*:/i, '');
            this.hash = '';
            this.search = '';
        }

        URL.prototype.toString = function () { return this.href; };
        URL.prototype.toJSON = function () { return this.href; };

        function TextEncoder() { }
        TextEncoder.prototype.encode = function (input) {
            input = '' + input;
            var bytes = [];

            for (var i = 0; i < input.length; i++) {
                var code = input.codePointAt(i);
                if (code > 0xFFFF) i++;

                if (code < 0x80) bytes.push(code);
                else if (code < 0x800) { bytes.push(0xC0 | (code >> 6), 0x80 | (code & 0x3F)); }
                else if (code < 0x10000) { bytes.push(0xE0 | (code >> 12), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F)); }
                else { bytes.push(0xF0 | (code >> 18), 0x80 | ((code >> 12) & 0x3F), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F)); }
            }

            return new Uint8Array(bytes);
        };

        function TextDecoder() { }
        TextDecoder.prototype.decode = function (bytes) {
            var result = '';
            var i = 0;
            bytes = new Uint8Array(bytes.buffer || bytes);

            while (i < bytes.length) {
                var byte1 = bytes[i++];
                var code;

                if (byte1 < 0x80) code = byte1;
                else if (byte1 < 0xE0) code = ((byte1 & 0x1F) << 6) | (bytes[i++] & 0x3F);
                else if (byte1 < 0xF0) code = ((byte1 & 0x0F) << 12) | ((bytes[i++] & 0x3F) << 6) | (bytes[i++] & 0x3F);
                else code = ((byte1 & 0x07) << 18) | ((bytes[i++] & 0x3F) << 12) | ((bytes[i++] & 0x3F) << 6) | (bytes[i++] & 0x3F);

                result += String.fromCodePoint(code);
            }

            return result;
        };
        """;

    private const string Bootstrap =
        """
        var sass = globalThis._cliPkgExports.pop();
        if (globalThis._cliPkgExports.length === 0) delete globalThis._cliPkgExports;
        sass.load({ immutable: Immutable });

        var __cm_sass_importer = {
            canonicalize: function (url, context) {
                var containing = context && context.containingUrl ? context.containingUrl.toString() : null;
                var resolved = __cm_sass_canonicalize(url.toString(), containing);
                return resolved === null ? null : new URL(resolved);
            },
            load: function (canonicalUrl) {
                var loaded = __cm_sass_load(canonicalUrl.toString());

                if (loaded === null)
                    return null;

                var parsed = JSON.parse(loaded);
                return { contents: parsed.contents, syntax: parsed.syntax };
            }
        };

        function __cm_sass_compile(requestJson) {
            var request = JSON.parse(requestJson);
            var result = { css: null, error: null, sourceMap: null };

            try {
                var compiled = sass.compileString(request.input, {
                    syntax: request.syntax,
                    style: 'expanded',
                    sourceMap: request.sourceMap,
                    sourceMapIncludeSources: request.sourceMap,
                    url: new URL(request.url),
                    importer: __cm_sass_importer
                });

                result.css = compiled.css;

                if (request.sourceMap && compiled.sourceMap)
                    result.sourceMap = JSON.stringify(compiled.sourceMap);
            }
            catch (error) {
                result.error = '' + error;
            }

            return JSON.stringify(result);
        }
        """;

    /// <summary>Compiles a single SCSS/SASS file to CSS. Returns CSS with an optional inline source map.</summary>
    public static string Compile(string filePath, bool sourceMap)
    {
        lock (_lock)
        {
            Engine engine = GetEngine();

            string fullPath = Path.GetFullPath(filePath);

            string requestJson = JsonSerializer.Serialize(new
            {
                input = File.ReadAllText(fullPath),
                syntax = GetSyntax(fullPath),
                url = new Uri(fullPath).AbsoluteUri,
                sourceMap
            });

            string resultJson = engine.Invoke("__cm_sass_compile", requestJson).AsString();
            JsonElement result = JsonDocument.Parse(resultJson).RootElement;

            if (result.TryGetProperty("error", out JsonElement error) && error.ValueKind == JsonValueKind.String)
                throw new InvalidOperationException($"Sass error: {error.GetString()}");

            string css = result.GetProperty("css").GetString() ?? string.Empty;

            if (sourceMap && result.TryGetProperty("sourceMap", out JsonElement map) && map.ValueKind == JsonValueKind.String)
            {
                string encoded = Convert.ToBase64String(Encoding.UTF8.GetBytes(map.GetString()!));
                css += $"\n/*# sourceMappingURL=data:application/json;base64,{encoded} */";
            }

            return css;
        }
    }

    private static string GetSyntax(string filePath)
        => filePath.EndsWith(".sass", StringComparison.OrdinalIgnoreCase) ? "indented" : "scss";

    private static Engine GetEngine()
    {
        if (_engine is not null)
            return _engine;

        Engine engine = JintEngineFactory.Create();

        engine.SetValue("__cm_sass_canonicalize", Canonicalize);
        engine.SetValue("__cm_sass_load", Load);

        engine.Execute(Polyfills);
        engine.Execute(CompilerAssets.GetPreparedScript(CompilerAssets.Immutable));
        engine.Execute(CompilerAssets.GetPreparedScript(CompilerAssets.SassDart));
        engine.Execute(Bootstrap);

        _engine = engine;
        return engine;
    }

    /// <summary>Resolves an import URL to a canonical file:// URL, honoring sass partial conventions.</summary>
    private static string? Canonicalize(string url, string? containingUrl)
    {
        string path;

        if (url.StartsWith("file:", StringComparison.OrdinalIgnoreCase))
        {
            path = new Uri(url).LocalPath;
        }
        else
        {
            string baseDirectory = containingUrl is not null
                ? Path.GetDirectoryName(new Uri(containingUrl).LocalPath)!
                : Directory.GetCurrentDirectory();

            path = Path.GetFullPath(Path.Combine(baseDirectory, url.Replace('/', Path.DirectorySeparatorChar)));
        }

        string? resolved = ResolvePartial(path);

        return resolved is null ? null : new Uri(resolved).AbsoluteUri;
    }

    private static string? ResolvePartial(string path)
    {
        string directory = Path.GetDirectoryName(path) ?? string.Empty;
        string name = Path.GetFileName(path);

        List<string> candidates = [];

        if (Path.HasExtension(name) && (name.EndsWith(".scss", StringComparison.OrdinalIgnoreCase)
            || name.EndsWith(".sass", StringComparison.OrdinalIgnoreCase)
            || name.EndsWith(".css", StringComparison.OrdinalIgnoreCase)))
        {
            candidates.Add(path);
            candidates.Add(Path.Combine(directory, $"_{name}"));
        }
        else
        {
            foreach (string extension in (string[])[".scss", ".sass", ".css"])
            {
                candidates.Add(Path.Combine(directory, $"{name}{extension}"));
                candidates.Add(Path.Combine(directory, $"_{name}{extension}"));
            }

            foreach (string extension in (string[])[".scss", ".sass"])
            {
                candidates.Add(Path.Combine(path, $"_index{extension}"));
                candidates.Add(Path.Combine(path, $"index{extension}"));
            }
        }

        return candidates.FirstOrDefault(File.Exists);
    }

    private static string? Load(string canonicalUrl)
    {
        string path = new Uri(canonicalUrl).LocalPath;

        if (!File.Exists(path))
            return null;

        string syntax = path.EndsWith(".sass", StringComparison.OrdinalIgnoreCase)
            ? "indented"
            : path.EndsWith(".css", StringComparison.OrdinalIgnoreCase) ? "css" : "scss";

        return JsonSerializer.Serialize(new { contents = File.ReadAllText(path), syntax });
    }
}
