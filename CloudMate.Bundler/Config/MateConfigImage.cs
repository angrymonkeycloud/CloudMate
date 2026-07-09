using System.Text.Json.Serialization;

namespace AngryMonkey.CloudMate;

public class MateConfigImage
{
    [JsonConverter(typeof(SingleOrArrayConverter))]
    public List<string> Input { get; set; } = [];

    [JsonConverter(typeof(SingleOrArrayConverter))]
    public List<string> Output { get; set; } = [];

    public int? MaxWidth { get; set; }

    public int? MaxHeight { get; set; }

    /// <summary>Target format extension (png, jpg, jpeg, gif, webp, tiff). Keeps the source format when omitted.</summary>
    public string? OutputFormat { get; set; }
}
