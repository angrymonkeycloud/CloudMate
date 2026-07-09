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

    public static bool HasExtension(IEnumerable<string> input, string extension, string rootDirectory)
        => GlobResolver.Resolve(input, rootDirectory)
            .Any(file => file.EndsWith($".{extension}", StringComparison.OrdinalIgnoreCase));
}
