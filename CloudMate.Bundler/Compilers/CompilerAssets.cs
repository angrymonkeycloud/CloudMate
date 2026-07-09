using System.Collections.Concurrent;
using System.Reflection;
using Acornima.Ast;
using Jint;

namespace AngryMonkey.CloudMate;

/// <summary>
/// Loads and caches the embedded JavaScript compiler assets (TypeScript, LESS, dart-sass, immutable).
/// Scripts are parsed once via <see cref="Engine.PrepareScript"/> and reused across engine instances.
/// </summary>
internal static class CompilerAssets
{
    public const string TypeScript = "typescript.js";
    public const string Less = "less.js";
    public const string SassDart = "sass.dart.js";
    public const string Immutable = "immutable.js";

    private static readonly ConcurrentDictionary<string, string> _sources = new();
    private static readonly ConcurrentDictionary<string, Prepared<Script>> _prepared = new();

    public static string GetSource(string assetName) => _sources.GetOrAdd(assetName, ReadAsset);

    public static Prepared<Script> GetPreparedScript(string assetName)
        => _prepared.GetOrAdd(assetName, name => Engine.PrepareScript(GetSource(name), source: name));

    private static string ReadAsset(string name)
    {
        Assembly assembly = typeof(CompilerAssets).Assembly;

        string resourceName = assembly.GetManifestResourceNames()
            .FirstOrDefault(resource => resource.EndsWith($".{name}", StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException($"Embedded compiler asset '{name}' was not found.");

        using Stream stream = assembly.GetManifestResourceStream(resourceName)!;
        using StreamReader reader = new(stream);

        return reader.ReadToEnd();
    }
}
