using System.Text.Json.Nodes;

namespace AngryMonkey.CloudMate.Tests;

public class YamlJsonConverterTests
{
    [Fact]
    public void ToJsonNode_ConvertsScalarTypes()
    {
        JsonNode? node = YamlJsonConverter.ToJsonNode("""
        text: hello
        flag: true
        integer: 42
        floating: 3.14
        """);

        Assert.Equal("hello", node!["text"]!.GetValue<string>());
        Assert.True(node["flag"]!.GetValue<bool>());
        Assert.Equal(42L, node["integer"]!.GetValue<long>());
        Assert.Equal(3.14, node["floating"]!.GetValue<double>());
    }

    [Fact]
    public void ToJsonNode_ConvertsNestedMapsAndLists()
    {
        JsonNode? node = YamlJsonConverter.ToJsonNode("""
        files:
          - input: a.ts
            output: dist/a.js
          - input: b.ts
            output: dist/b.js
        """);

        JsonArray files = node!["files"]!.AsArray();
        Assert.Equal(2, files.Count);
        Assert.Equal("a.ts", files[0]!["input"]!.GetValue<string>());
        Assert.Equal("dist/b.js", files[1]!["output"]!.GetValue<string>());
    }

    [Fact]
    public void ToJsonNode_ReturnsNullForEmptyDocument()
    {
        JsonNode? node = YamlJsonConverter.ToJsonNode(string.Empty);

        Assert.Null(node);
    }

    [Fact]
    public void ToJsonNode_TreatsQuotedNumberLikeStringAsNumber()
    {
        // YamlDotNet resolves plain scalars to strings for this simple deserialization path;
        // the converter's own scalar inference is what promotes "42" to a numeric JsonNode.
        JsonNode? node = YamlJsonConverter.ToJsonNode("value: 42");

        Assert.Equal(42L, node!["value"]!.GetValue<long>());
    }
}
