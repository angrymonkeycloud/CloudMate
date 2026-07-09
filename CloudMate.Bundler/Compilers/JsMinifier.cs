using NUglify;

namespace AngryMonkey.CloudMate;

/// <summary>JavaScript minification via NUglify. Replaces gulp-minify.</summary>
internal static class JsMinifier
{
    public static string Minify(string source)
    {
        UglifyResult result = Uglify.Js(source);

        if (result.HasErrors)
            throw new InvalidOperationException($"JavaScript minification failed:\n{string.Join('\n', result.Errors)}");

        return result.Code;
    }
}
