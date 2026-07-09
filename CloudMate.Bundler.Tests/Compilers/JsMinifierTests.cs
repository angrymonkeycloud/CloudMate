namespace AngryMonkey.CloudMate.Tests;

public class JsMinifierTests
{
    [Fact]
    public void Minify_RemovesWhitespaceAndComments()
    {
        string result = JsMinifier.Minify("""
        // a comment
        function add(a, b) {
            return a + b;
        }
        """);

        Assert.DoesNotContain("//", result);
        Assert.DoesNotContain("\n", result);
        Assert.Contains("function add", result);
    }

    [Fact]
    public void Minify_ConstantFoldsSimpleExpression()
    {
        // NUglify performs constant folding, so "1 + 2" becomes "3" in the minified output.
        string result = JsMinifier.Minify("var x = 1 + 2;");

        Assert.Contains("x=3", result.Replace(" ", string.Empty));
    }

    [Fact]
    public void Minify_ThrowsInvalidOperationExceptionOnSyntaxError()
    {
        Assert.Throws<InvalidOperationException>(() => JsMinifier.Minify("function ( { this is not valid js"));
    }
}
