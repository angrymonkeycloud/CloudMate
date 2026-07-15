using Microsoft.Extensions.FileSystemGlobbing;
using Microsoft.Extensions.FileSystemGlobbing.Abstractions;

namespace AngryMonkey.CloudMate;

/// <summary>
/// Resolves file paths and glob patterns (relative to a root directory) into full file paths.
/// Replaces the legacy glob.sync usage.
/// </summary>
internal static class GlobResolver
{
    public static List<string> Resolve(IEnumerable<string> patterns, string rootDirectory, Action<string>? onMissingFile = null)
    {
        List<string> results = [];

        foreach (string pattern in patterns)
        {
            string normalized = pattern.Replace('\\', '/').TrimStart();

            if (normalized.StartsWith("./"))
                normalized = normalized[2..];

            if (!normalized.Contains('*') && !normalized.Contains('?'))
            {
                string fullPath = Path.GetFullPath(Path.Combine(rootDirectory, normalized));

                if (!File.Exists(fullPath))
                {
                    onMissingFile?.Invoke(fullPath);
                    continue;
                }

                if (!results.Contains(fullPath, StringComparer.OrdinalIgnoreCase))
                    results.Add(fullPath);

                continue;
            }

            Matcher matcher = new(StringComparison.OrdinalIgnoreCase);
            matcher.AddInclude(normalized);

            PatternMatchingResult match = matcher.Execute(new DirectoryInfoWrapper(new DirectoryInfo(rootDirectory)));

            foreach (FilePatternMatch file in match.Files.OrderBy(f => f.Path, StringComparer.OrdinalIgnoreCase))
            {
                string fullPath = Path.GetFullPath(Path.Combine(rootDirectory, file.Path));

                if (!results.Contains(fullPath, StringComparer.OrdinalIgnoreCase))
                    results.Add(fullPath);
            }
        }

        return results;
    }

    /// <summary>Checks whether a path contains glob characters.</summary>
    public static bool IsGlob(string pattern) => pattern.Contains('*') || pattern.Contains('?');

    /// <summary>
    /// Determines whether a changed path is covered by a configured input pattern without
    /// enumerating the project. Watchers use this to ignore unrelated file-system events.
    /// </summary>
    public static bool IsMatch(string pattern, string rootDirectory, string fullPath)
    {
        string root = Path.GetFullPath(rootDirectory);
        string path = Path.GetFullPath(fullPath);
        string relative = Path.GetRelativePath(root, path);

        // A configuration is project-relative; never let a path outside the project match.
        if (relative == ".." || relative.StartsWith($"..{Path.DirectorySeparatorChar}", StringComparison.Ordinal)
            || Path.IsPathRooted(relative))
            return false;

        string normalizedPattern = pattern.Replace('\\', '/').TrimStart();
        if (normalizedPattern.StartsWith("./", StringComparison.Ordinal))
            normalizedPattern = normalizedPattern[2..];

        string normalizedRelative = relative.Replace('\\', '/');

        if (!IsGlob(normalizedPattern))
            return string.Equals(normalizedPattern, normalizedRelative, StringComparison.OrdinalIgnoreCase);

        Matcher matcher = new(StringComparison.OrdinalIgnoreCase);
        matcher.AddInclude(normalizedPattern);
        return matcher.Match(normalizedRelative).HasMatches;
    }

    /// <summary>Returns the non-glob base directory of a pattern (the deepest literal directory).</summary>
    public static string GetBaseDirectory(string pattern, string rootDirectory)
    {
        string normalized = pattern.Replace('\\', '/');
        string[] segments = normalized.Split('/');
        List<string> literals = [];

        foreach (string segment in segments[..^1])
        {
            if (IsGlob(segment))
                break;

            literals.Add(segment);
        }

        return Path.GetFullPath(Path.Combine(rootDirectory, string.Join('/', literals)));
    }
}
