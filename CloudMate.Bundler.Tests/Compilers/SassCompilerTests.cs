namespace AngryMonkey.CloudMate.Tests;

public class SassCompilerTests
{
    [Fact]
    public void Compile_ScssFile_ProducesCss()
    {
        using TempDirectory dir = new();
        string scssFile = dir.WriteFile("app.scss", "$color: red;\n.foo { color: $color; }\n");

        string css = SassCompiler.Compile(scssFile, sourceMap: false);

        Assert.Contains(".foo", css);
        Assert.Contains("color: red", css);
    }

    [Fact]
    public void Compile_SassIndentedSyntax_ProducesCss()
    {
        using TempDirectory dir = new();
        string sassFile = dir.WriteFile("app.sass", "$color: blue\n.foo\n  color: $color\n");

        string css = SassCompiler.Compile(sassFile, sourceMap: false);

        Assert.Contains(".foo", css);
        Assert.Contains("color: blue", css);
    }

    [Fact]
    public void Compile_ResolvesPartialImportWithUnderscorePrefix()
    {
        using TempDirectory dir = new();
        dir.WriteFile("_vars.scss", "$spacing: 10px;\n");
        string entry = dir.WriteFile("main.scss", "@import 'vars';\n.box { margin: $spacing; }\n");

        string css = SassCompiler.Compile(entry, sourceMap: false);

        Assert.Contains(".box", css);
        Assert.Contains("margin: 10px", css);
    }

    [Fact]
    public void Compile_NestedRules_CompilesToFlatCss()
    {
        using TempDirectory dir = new();
        string entry = dir.WriteFile("nested.scss", ".parent { .child { color: green; } }\n");

        string css = SassCompiler.Compile(entry, sourceMap: false);

        Assert.Contains(".parent .child", css);
    }

    [Fact]
    public void Compile_InvalidSyntax_ThrowsInvalidOperationException()
    {
        using TempDirectory dir = new();
        string entry = dir.WriteFile("broken.scss", ".foo { color: }\n");

        Assert.Throws<InvalidOperationException>(() => SassCompiler.Compile(entry, sourceMap: false));
    }

    [Fact]
    public void Compile_WithSourceMap_AppendsInlineSourceMappingUrlComment()
    {
        using TempDirectory dir = new();
        string entry = dir.WriteFile("mapped.scss", ".foo { color: red; }\n");

        string css = SassCompiler.Compile(entry, sourceMap: true);

        Assert.Contains("sourceMappingURL=data:application/json;base64,", css);
    }
}
