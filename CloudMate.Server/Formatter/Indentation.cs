using System;
using System.Linq;
using System.Collections.Generic;

namespace AngryMonkey.CloudMate;

public partial class CoreCSharp
{
    internal static string Indentation(string content)
    {
        List<string> contentSeparated = [.. content.Split('\n')];
        List<string> results = [];

        int indent = 0;
        bool temporaryIndent = false;

        for (int i = 0; i < contentSeparated.Count; i++)
        {
            string currentLine = contentSeparated[i].Trim().Trim('\r');

            if (currentLine.StartsWith("}"))
                indent--;

            if (temporaryIndent && currentLine.StartsWith("{"))
                temporaryIndent = false;

            string[] temporaryIndents = ["if", "else", "default:"];

            string prefix = string.Empty;

            for (int index = 0; index < (temporaryIndent ? indent + 1 : indent); index++)
                prefix += "\t";

            temporaryIndent = false;

            results.Add($"{prefix}{currentLine}");

            if (currentLine.StartsWith("{"))
                indent++;
            else if (temporaryIndents.FirstOrDefault(key => currentLine.StartsWith($"{key } ") || currentLine.Equals(key)) != null)
                temporaryIndent = true;
        }

        return string.Join("\n", results);
    }
}