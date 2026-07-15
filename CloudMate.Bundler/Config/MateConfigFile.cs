using System.Text.Json.Serialization;

namespace AngryMonkey.CloudMate;

public class MateConfigFile
{
    [JsonConverter(typeof(SingleOrArrayConverter))]
    public List<string> Input { get; set; } = [];

    [JsonConverter(typeof(SingleOrArrayConverter))]
    public List<string> Output { get; set; } = [];

    /// <summary>Build names this entry applies to. Defaults to ["dev"] when omitted.</summary>
    [JsonConverter(typeof(SingleOrArrayConverter))]
    public List<string>? Builds { get; set; }

    /// <summary>
    /// Optional per-entry minification override. When omitted, the selected build's CSS/JS
    /// setting is used; <c>false</c> writes only the normal output and removes a stale minified sibling.
    /// </summary>
    public bool? Minify { get; set; }

    public static bool HasExtension(IEnumerable<string> input, string extension, string rootDirectory)
        => GlobResolver.Resolve(input, rootDirectory)
            .Any(file => file.EndsWith($".{extension}", StringComparison.OrdinalIgnoreCase));
}
