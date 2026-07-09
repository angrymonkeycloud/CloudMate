namespace AngryMonkey.CloudMate.Tests;

public class CssMinifierTests
{
    [Fact]
    public void Minify_RemovesWhitespaceAndComments()
    {
        string result = CssMinifier.Minify("""
        /* a comment */
        .foo {
            color: red;
            margin: 0px;
        }
        """);

        // NUglify strips comments/whitespace and optimizes values (e.g. "red" -> "#f00", "0px" -> "0").
        Assert.DoesNotContain("/*", result);
        Assert.Contains(".foo", result);
        Assert.Contains("color:#f00", result.Replace(" ", string.Empty));
        Assert.Contains("margin:0", result.Replace(" ", string.Empty));
    }

    [Fact]
    public void Minify_CollapsesMultipleSelectorsAndDeclarations()
    {
        string result = CssMinifier.Minify(".a { color: red; }\n.b { color: blue; }");

        Assert.Contains(".a", result);
        Assert.Contains(".b", result);
        Assert.DoesNotContain("\n", result);
    }
}
