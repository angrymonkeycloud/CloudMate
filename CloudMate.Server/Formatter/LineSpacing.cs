using System;
using System.Linq;
using System.Collections.Generic;

namespace AngryMonkey.CloudMate;

public partial class CoreCSharp
{
    internal static string LineSpacing(string content)
    {
        string[] startWordNewLineBefore = ["namespace", "if", "for", "foreach", "try", "return", "switch", "case", "default:"];
        string[] startWordNewLineAfter = ["if", "for", "foreach"];
        string[] preventSpaceAfter = ["if", "for", "foreach", "try", "switch"];
        string[] preventSpaceBefore = ["catch"];
        List<int> newLinesIndexes = [];
        List<string> contentSeparated = [.. content.Split('\n')];

        string? beforePreviousLine = null;
        string? previousLine = null;

        int index = -1;
        for (int i = 0; i < contentSeparated.Count; i++)
        {
            string currentLine = contentSeparated[i].Trim().Trim('\r');
            string? nextLine = i + 1 < contentSeparated.Count ? contentSeparated[i + 1].Trim().Trim('\r') : null;

            index++;

            if (string.IsNullOrEmpty(currentLine))
                goto g;

            if (string.IsNullOrEmpty(previousLine))
                goto g;

            // Empty Line Before

            if (string.IsNullOrEmpty(previousLine.Trim()))
                goto g;

            if (previousLine.Trim().StartsWith("{"))
                goto g;

            if (previousLine.Trim() == "}" && currentLine != "}" && preventSpaceBefore.FirstOrDefault(key => currentLine.StartsWith($"{key} ")) == null)
                newLinesIndexes.Add(index);

            if (preventSpaceAfter.FirstOrDefault(key => previousLine.Trim().StartsWith($"{key} ") || previousLine.Trim().EndsWith($" {key}")) != null)
                goto g;

            if (startWordNewLineBefore.FirstOrDefault(key => currentLine.StartsWith($"{key} ")) == null)
                goto g;

            newLinesIndexes.Add(index);

        g: beforePreviousLine = previousLine;
            previousLine = currentLine;

            // Empty Line After

            if (string.IsNullOrEmpty(currentLine))
                continue;

            if (string.IsNullOrEmpty(beforePreviousLine))
                continue;

            if (string.IsNullOrEmpty(nextLine))
                continue;

            if (previousLine.Trim().StartsWith("{"))
                continue;

            if (startWordNewLineAfter.FirstOrDefault(key => beforePreviousLine.Trim().StartsWith($"{key} ")) == null)
                continue;

            if (preventSpaceAfter.FirstOrDefault(key => previousLine.Trim().StartsWith($"{key} ") || previousLine.Trim().EndsWith($" {key}")) != null)
                continue;

            newLinesIndexes.Add(index + 1);
        }

        newLinesIndexes = newLinesIndexes.Distinct().ToList();
        newLinesIndexes.Reverse();

        foreach (int newLine in newLinesIndexes)
            contentSeparated.Insert(newLine, string.Empty);

        return string.Join("\n", contentSeparated);
    }
}
