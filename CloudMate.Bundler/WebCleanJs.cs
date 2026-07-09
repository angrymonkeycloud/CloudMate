using System.Text;
using System.Text.RegularExpressions;

namespace AngryMonkey.CloudMate;

/// <summary>
/// Port of the legacy webcleanjs transform: makes CommonJS-compiled TypeScript output browser-friendly
/// by stripping import lines, export prefixes and require() artifacts.
/// </summary>
public static class WebCleanJs
{
    public static string Clean(string content, bool isDeclaration = false)
    {
        if (!isDeclaration)
            content = $"var exports = {{}};\n{content}";

        content = CleanLines(content);

        if (isDeclaration)
            return content;

        content = CleanPrefixes(content);

        List<string> removables = [];

        foreach (string line in content.Split('\n'))
        {
            if (!line.Contains(" require("))
                continue;

            removables.Add(line);

            string[] parts = line.Split(' ');

            if (parts.Length > 1 && parts[1].Contains('_'))
                removables.Add($"{parts[1]}.");
        }

        foreach (string value in removables)
        {
            if (value.StartsWith('='))
                continue;

            if (value.Contains('='))
            {
                int index = content.IndexOf(value, StringComparison.Ordinal);

                if (index >= 0)
                    content = content.Remove(index, value.Length);
            }
            else
            {
                content = Regex.Replace(content, Regex.Escape(value.Trim()), string.Empty, RegexOptions.IgnoreCase);
            }
        }

        return content;
    }

    private static string CleanLines(string content)
    {
        string[] startWithValues = ["import "];

        StringBuilder result = new();

        foreach (string line in content.Split('\n'))
        {
            bool safe = !startWithValues.Any(line.StartsWith);

            if (safe)
                result.Append(line).Append('\n');
        }

        return result.ToString();
    }

    private static string CleanPrefixes(string content)
    {
        string[] prefixValues = ["export default ", "export "];

        foreach (string prefix in prefixValues)
            content = Regex.Replace(
                content,
                $"^({Regex.Escape(prefix)})|[ \t]+({Regex.Escape(prefix)})",
                string.Empty,
                RegexOptions.Multiline | RegexOptions.IgnoreCase);

        return content;
    }
}
