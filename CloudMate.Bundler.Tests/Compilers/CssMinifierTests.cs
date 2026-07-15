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

    [Fact]
    public void Minify_PreservesModernCssMathFunctions()
    {
        string result = CssMinifier.Minify("""
            .layout {
                width: min(100%, 1200px);
                height: max(320px, calc(100vh - 4rem));
                font-size: clamp(1rem, 2vw, 2rem);
            }
            """);

        Assert.Contains("min(100%,1200px)", result.Replace(" ", string.Empty));
        Assert.Contains("max(320px,calc(100vh-4rem))", result.Replace(" ", string.Empty));
        Assert.Contains("clamp(1rem,2vw,2rem)", result.Replace(" ", string.Empty));
    }
}
