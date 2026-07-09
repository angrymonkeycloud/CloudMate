using System.Globalization;
using System.Text.Json.Nodes;
using YamlDotNet.Serialization;

namespace AngryMonkey.CloudMate;

/// <summary>
/// Converts YAML configuration content into a <see cref="JsonNode"/> so all formats share one deserialization path.
/// </summary>
internal static class YamlJsonConverter
{
    public static JsonNode? ToJsonNode(string yaml)
    {
        object? graph = new DeserializerBuilder().Build().Deserialize<object?>(yaml);

        return ConvertToNode(graph);
    }

    private static JsonNode? ConvertToNode(object? value) => value switch
    {
        null => null,
        IDictionary<object, object> map => new JsonObject(map.Select(entry =>
            KeyValuePair.Create(entry.Key.ToString()!, ConvertToNode(entry.Value)))),
        IEnumerable<object> list => new JsonArray([.. list.Select(ConvertToNode)]),
        string text => ConvertScalar(text),
        _ => JsonValue.Create(value.ToString())
    };

    private static JsonNode ConvertScalar(string value)
    {
        if (bool.TryParse(value, out bool boolean))
            return JsonValue.Create(boolean);

        if (long.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out long integer))
            return JsonValue.Create(integer);

        if (double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out double floating))
            return JsonValue.Create(floating);

        return JsonValue.Create(value);
    }
}
