namespace AngryMonkey.CloudMate.Tests;

public class TypeScriptCompilerTests
{
    [Fact]
    public void Compile_SimpleFile_EmitsJavaScript()
    {
        using TempDirectory dir = new();
        string tsFile = dir.WriteFile("app.ts", "const x: number = 42;\nconsole.log(x);\n");

        TypeScriptCompileResult result = TypeScriptCompiler.Compile([tsFile], tsConfigPath: null, sourceMap: false, declaration: false);

        Assert.Empty(result.Diagnostics);
        Assert.Single(result.JavaScriptOutputs);

        string js = result.JavaScriptOutputs[0].Value;
        Assert.Contains("42", js);
        Assert.Contains("console.log(x)", js);
    }

    [Fact]
    public void Compile_TypeError_ReportsDiagnostic()
    {
        using TempDirectory dir = new();
        string tsFile = dir.WriteFile("bad.ts", "const y: number = \"hello\";\n");

        TypeScriptCompileResult result = TypeScriptCompiler.Compile([tsFile], tsConfigPath: null, sourceMap: false, declaration: false);

        Assert.NotEmpty(result.Diagnostics);
        Assert.Contains(result.Diagnostics, d => d.Contains("not assignable", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Compile_WithDeclarationTrue_EmitsDeclarationFile()
    {
        using TempDirectory dir = new();
        string tsFile = dir.WriteFile("decl.ts", "export const z: number = 1;\n");

        TypeScriptCompileResult result = TypeScriptCompiler.Compile([tsFile], tsConfigPath: null, sourceMap: false, declaration: true);

        Assert.Single(result.DeclarationOutputs);
        Assert.Contains("declare const z: number", result.DeclarationOutputs[0].Value);
    }

    [Fact]
    public void Compile_WithoutDeclarationFlag_DoesNotEmitDeclarationOutputs()
    {
        using TempDirectory dir = new();
        string tsFile = dir.WriteFile("nodecl.ts", "export const w: number = 1;\n");

        TypeScriptCompileResult result = TypeScriptCompiler.Compile([tsFile], tsConfigPath: null, sourceMap: false, declaration: false);

        Assert.Empty(result.DeclarationOutputs);
    }

    [Fact]
    public void Compile_MultipleFiles_EmitsOutputForEachFile()
    {
        using TempDirectory dir = new();
        string fileA = dir.WriteFile("a.ts", "export const a = 1;\n");
        string fileB = dir.WriteFile("b.ts", "export const b = 2;\n");

        TypeScriptCompileResult result = TypeScriptCompiler.Compile([fileA, fileB], tsConfigPath: null, sourceMap: false, declaration: false);

        Assert.Equal(2, result.JavaScriptOutputs.Count);
        Assert.Empty(result.Diagnostics);
    }
}
