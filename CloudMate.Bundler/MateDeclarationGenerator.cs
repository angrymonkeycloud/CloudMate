namespace AngryMonkey.CloudMate;

/// <summary>
/// Writes the concatenated TypeScript declaration bundle ({name}.d.ts) for a file entry.
/// Port of the legacy createTypeScriptDeclaration pipeline (filter .d.ts, concat, webClean, rename).
/// </summary>
internal static class MateDeclarationGenerator
{
    public static void Write(IReadOnlyList<KeyValuePair<string, string>> declarationOutputs, string outputDirectory, string outputFileName)
    {
        if (declarationOutputs.Count == 0)
            return;

        string concatenated = string.Join('\n', declarationOutputs.Select(pair => pair.Value));
        string cleaned = WebCleanJs.Clean(concatenated, isDeclaration: true);

        string declarationFileName = $"{outputFileName.Replace(".js", string.Empty)}.d.ts";

        Directory.CreateDirectory(outputDirectory);
        File.WriteAllText(Path.Combine(outputDirectory, declarationFileName), cleaned);
    }
}
