namespace AngryMonkey.CloudMate.Tests;

public class LessCompilerTests
{
    [Fact]
    public void Compile_SimpleFile_ProducesCss()
    {
        using TempDirectory dir = new();
        string lessFile = dir.WriteFile("app.less", "@color: red;\n.foo { color: @color; }\n");

        string css = LessCompiler.Compile(lessFile, sourceMap: false);

        Assert.Contains(".foo", css);
        Assert.Contains("color", css);
        Assert.Contains("red", css);
    }

    [Fact]
    public void Compile_ResolvesRelativeImport()
    {
        using TempDirectory dir = new();
        dir.WriteFile("_vars.less", "@spacing: 10px;\n");
        string entry = dir.WriteFile("main.less", "@import \"_vars\";\n.box { margin: @spacing; }\n");

        string css = LessCompiler.Compile(entry, sourceMap: false);

        Assert.Contains("margin", css);
        Assert.Contains("10px", css);
    }

    [Fact]
    public void Compile_NestedRules_CompilesToFlatCss()
    {
        using TempDirectory dir = new();
        string entry = dir.WriteFile("nested.less", ".parent { .child { color: blue; } }\n");

        string css = LessCompiler.Compile(entry, sourceMap: false);

        Assert.Contains(".parent .child", css);
    }

    [Fact]
    public void Compile_InvalidSyntax_ThrowsInvalidOperationException()
    {
        using TempDirectory dir = new();
        string entry = dir.WriteFile("broken.less", ".foo { color: red;\n");

        Assert.Throws<InvalidOperationException>(() => LessCompiler.Compile(entry, sourceMap: false));
    }

    [Fact]
    public void Compile_MissingImport_ThrowsInvalidOperationException()
    {
        using TempDirectory dir = new();
        string entry = dir.WriteFile("missing-import.less", "@import \"does-not-exist\";\n");

        Assert.Throws<InvalidOperationException>(() => LessCompiler.Compile(entry, sourceMap: false));
    }

    [Fact]
    public void Compile_CssMinFunction_PassesThroughUnchanged()
    {
        using TempDirectory dir = new();
        string entry = dir.WriteFile("min.less", ".search { width: min(180px, 100%); }\n");

        string css = LessCompiler.Compile(entry, sourceMap: false);

        Assert.Contains("min(180px, 100%)", css);
    }

    [Fact]
    public void Compile_CssMinFunctionWithCalc_PassesThroughUnchanged()
    {
        using TempDirectory dir = new();
        string entry = dir.WriteFile("min-calc.less", ".dropdown { max-width: min(280px, calc(100vw - 16px)); }\n");

        string css = LessCompiler.Compile(entry, sourceMap: false);

        Assert.Contains("min(280px, calc(100vw - 16px))", css);
    }
}
