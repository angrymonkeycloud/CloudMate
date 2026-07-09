using System.Text.Json;
using System.Text.Json.Serialization;

namespace AngryMonkey.CloudMate;

/// <summary>
/// Reads a JSON value that may be either a single string or an array of strings into a <see cref="List{T}"/>.
/// Mirrors the legacy cosmiconfig transform that coerced string values into arrays.
/// </summary>
internal class SingleOrArrayConverter : JsonConverter<List<string>>
{
    public override List<string>? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        return reader.TokenType switch
        {
            JsonTokenType.String => [reader.GetString()!],
            JsonTokenType.StartArray => JsonSerializer.Deserialize<List<string>>(ref reader)!,
            JsonTokenType.Null => null,
            _ => throw new JsonException("Expected a string or an array of strings.")
        };
    }

    public override void Write(Utf8JsonWriter writer, List<string> value, JsonSerializerOptions options)
        => JsonSerializer.Serialize(writer, value);
}
