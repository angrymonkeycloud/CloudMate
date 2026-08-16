namespace AngryMonkey.CloudMate;

/// <summary>
/// Records the files each compiled stylesheet actually imported. Watch sessions use this graph so a
/// change to a shared partial rebuilds only the entries that really depend on it, instead of every
/// stylesheet declared in the configuration.
/// </summary>
internal static class StyleDependencies
{
    private static readonly Dictionary<string, HashSet<string>> _dependencies = new(StringComparer.OrdinalIgnoreCase);
    private static readonly object _lock = new();

    /// <summary>Stores the import graph of a successfully compiled stylesheet.</summary>
    public static void Record(string entryFile, IEnumerable<string> importedFiles)
    {
        string entry = Normalize(entryFile);
        HashSet<string> dependencies = new(StringComparer.OrdinalIgnoreCase) { entry };

        foreach (string importedFile in importedFiles)
            dependencies.Add(Normalize(importedFile));

        lock (_lock)
            _dependencies[entry] = dependencies;
    }

    /// <summary>
    /// Drops the recorded graph of an entry, which makes <see cref="MayAffect"/> fall back to
    /// rebuilding it on any related change. Used when a compile fails and its imports are unknown.
    /// </summary>
    public static void Forget(string entryFile)
    {
        string entry = Normalize(entryFile);

        lock (_lock)
            _dependencies.Remove(entry);
    }

    /// <summary>
    /// Whether <paramref name="changedFile"/> can affect <paramref name="entryFile"/>: it is either the
    /// entry itself or one of its recorded imports. Entries that have never compiled successfully have
    /// no recorded graph and always match, so a rebuild is never missed because dependencies are unknown.
    /// </summary>
    public static bool MayAffect(string entryFile, string changedFile)
    {
        string entry = Normalize(entryFile);
        string changed = Normalize(changedFile);

        lock (_lock)
            return !_dependencies.TryGetValue(entry, out HashSet<string>? dependencies)
                || dependencies.Contains(changed);
    }

    private static string Normalize(string path)
    {
        try
        {
            return Path.GetFullPath(path);
        }
        catch
        {
            // Never let an unusual path shape break a watch event; compare it verbatim instead.
            return path;
        }
    }
}
