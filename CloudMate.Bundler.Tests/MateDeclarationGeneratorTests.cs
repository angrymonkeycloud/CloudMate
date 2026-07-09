namespace AngryMonkey.CloudMate.Tests;

public class MateDeclarationGeneratorTests
{
    [Fact]
    public void Write_NoOutputs_DoesNotCreateFile()
    {
        using TempDirectory dir = new();

        MateDeclarationGenerator.Write([], dir.Path, "bundle.js");

        Assert.Empty(Directory.EnumerateFileSystemEntries(dir.Path));
    }

    [Fact]
    public void Write_ConcatenatesEntriesAndWritesDeclarationFile()
    {
        using TempDirectory dir = new();
        List<KeyValuePair<string, string>> outputs =
        [
            new("a.d.ts", "export declare const a: number;"),
            new("b.d.ts", "export declare const b: string;")
        ];

        MateDeclarationGenerator.Write(outputs, dir.Path, "bundle.js");

        string declarationPath = dir.Combine("bundle.d.ts");
        Assert.True(File.Exists(declarationPath));

        string content = File.ReadAllText(declarationPath);
        Assert.Contains("declare const a: number;", content);
        Assert.Contains("declare const b: string;", content);
    }

    [Fact]
    public void Write_CreatesOutputDirectoryWhenMissing()
    {
        using TempDirectory dir = new();
        string outputDirectory = dir.Combine("nested/output");
        List<KeyValuePair<string, string>> outputs = [new("a.d.ts", "export declare const a: number;")];

        MateDeclarationGenerator.Write(outputs, outputDirectory, "bundle.js");

        Assert.True(File.Exists(Path.Combine(outputDirectory, "bundle.d.ts")));
    }

    [Fact]
    public void Write_StripsJsExtensionFromOutputFileName()
    {
        using TempDirectory dir = new();
        List<KeyValuePair<string, string>> outputs = [new("a.d.ts", "export declare const a: number;")];

        MateDeclarationGenerator.Write(outputs, dir.Path, "app.min.js");

        Assert.True(File.Exists(dir.Combine("app.min.d.ts")));
    }
}
