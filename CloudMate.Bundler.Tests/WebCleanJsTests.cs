namespace AngryMonkey.CloudMate.Tests;

public class WebCleanJsTests
{
    [Fact]
    public void Clean_NonDeclaration_WrapsContentWithVarExportsPrefix()
    {
        string result = WebCleanJs.Clean("const x = 1;");

        Assert.StartsWith("var exports = {};\n", result);
    }

    [Fact]
    public void Clean_NonDeclaration_RemovesImportLines()
    {
        string result = WebCleanJs.Clean("import foo from 'foo';\nconst x = 1;");

        Assert.DoesNotContain("import", result);
        Assert.Contains("const x = 1;", result);
    }

    [Fact]
    public void Clean_Declaration_RemovesImportLinesButKeepsExportKeyword()
    {
        string result = WebCleanJs.Clean("import foo from 'foo';\nexport declare const x: number;", isDeclaration: true);

        Assert.Equal("export declare const x: number;\n", result);
    }

    [Fact]
    public void Clean_Declaration_DoesNotWrapWithVarExports()
    {
        string result = WebCleanJs.Clean("export declare const x: number;", isDeclaration: true);

        Assert.DoesNotContain("var exports", result);
    }

    [Fact]
    public void Clean_NonDeclaration_RemovesExportDefaultPrefix()
    {
        string result = WebCleanJs.Clean("export default function () { }");

        Assert.DoesNotContain("export default", result);
        Assert.Contains("function () { }", result);
    }

    [Fact]
    public void Clean_NonDeclaration_RemovesExportPrefix()
    {
        string result = WebCleanJs.Clean("export const a = 1;");

        Assert.DoesNotContain("export ", result);
        Assert.Contains("const a = 1;", result);
    }

    [Fact]
    public void Clean_NonDeclaration_RemovesRequireLineAndRewritesUnderscoredNamespaceUsage()
    {
        string result = WebCleanJs.Clean("var foo_1 = require(\"./foo\");\nfoo_1.bar();");

        Assert.Equal("var exports = {};\n\nbar();\n", result);
    }

    [Fact]
    public void Clean_NonDeclaration_RemovesRequireLineButKeepsPlainNamespaceUsage()
    {
        string result = WebCleanJs.Clean("var foo = require(\"./foo\");\nfoo.bar();");

        Assert.Equal("var exports = {};\n\nfoo.bar();\n", result);
    }
}
