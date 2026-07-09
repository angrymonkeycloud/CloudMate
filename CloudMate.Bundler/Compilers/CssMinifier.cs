using NUglify;

namespace AngryMonkey.CloudMate;

/// <summary>CSS minification via NUglify. Replaces gulp-clean-css.</summary>
internal static class CssMinifier
{
    public static string Minify(string source)
    {
        UglifyResult result = Uglify.Css(source);

        if (result.HasErrors)
            throw new InvalidOperationException($"CSS minification failed:\n{string.Join('\n', result.Errors)}");

        return result.Code;
    }
}
