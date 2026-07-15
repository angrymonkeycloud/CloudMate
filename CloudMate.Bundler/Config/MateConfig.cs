using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;

namespace AngryMonkey.CloudMate;

/// <summary>
/// CloudMate configuration model. Port of the legacy config.ts: discovers configuration files
/// the same way cosmiconfig did, normalizes values, and applies default builds.
/// </summary>
public class MateConfig
{
    private static readonly string[] SearchPlaces =
    [
        ".mateconfig",
        ".mateconfig.json",
        ".mateconfig.yaml",
        ".mateconfig.yml",
        "mateconfig.json",
        "mateconfig.yaml",
        "mateconfig.yml",
        "package.json"
    ];

    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        AllowTrailingCommas = true,
        ReadCommentHandling = JsonCommentHandling.Skip
    };

    public string? Name { get; set; }

    public string? Version { get; set; }

    public List<MateConfigFile> Files { get; set; } = [];

    public List<MateConfigBuild> Builds { get; set; } = [];

    public List<MateConfigImage>? Images { get; set; }

    [JsonIgnore]
    public string ConfigFilePath { get; private set; } = string.Empty;

    [JsonIgnore]
    public string RootDirectory => Path.GetDirectoryName(Path.GetFullPath(ConfigFilePath))!;

    /// <summary>
    /// Searches for the configuration file starting at <paramref name="workingDirectory"/> (or the current
    /// directory) and walking up parent directories. Throws when no configuration is found.
    /// </summary>
    public static string FindConfigurationFile(string? workingDirectory = null)
    {
        string startDirectory = Path.GetFullPath(workingDirectory ?? Directory.GetCurrentDirectory());

        for (DirectoryInfo? current = new(startDirectory); current is not null; current = current.Parent)
            foreach (string place in SearchPlaces)
            {
                string candidate = Path.Combine(current.FullName, place);

                if (!File.Exists(candidate))
                    continue;

                // package.json only counts when it contains a "mateconfig" section.
                if (place == "package.json" && GetPackageJsonConfigNode(candidate) is null)
                    continue;

                return candidate;
            }

        if (File.Exists(Path.Combine(startDirectory, ".mateconfig.js")))
            throw new FileNotFoundException(".mateconfig.js is not supported by the .NET version of CloudMate. Please convert it to .mateconfig.json.");

        throw new FileNotFoundException("Configuration file was not found.");
    }

    /// <summary>Loads the configuration, mirroring the legacy MateConfig.get().</summary>
    public static MateConfig Get(string? workingDirectory = null)
    {
        string configurationFile = FindConfigurationFile(workingDirectory);

        string content = File.ReadAllText(configurationFile);
        string fileName = Path.GetFileName(configurationFile).ToLowerInvariant();

        MateConfig? config;

        if (fileName == "package.json")
        {
            JsonNode? node = GetPackageJsonConfigNode(configurationFile)
                ?? throw new InvalidOperationException("Error parsing configuration file.");

            config = node.Deserialize<MateConfig>(SerializerOptions);
        }
        else if (fileName.EndsWith(".yaml") || fileName.EndsWith(".yml"))
        {
            JsonNode? node = YamlJsonConverter.ToJsonNode(content)
                ?? throw new InvalidOperationException("Error parsing configuration file.");

            config = node.Deserialize<MateConfig>(SerializerOptions);
        }
        else
        {
            // .mateconfig, .mateconfig.json and mateconfig.json all contain JSON.
            config = JsonSerializer.Deserialize<MateConfig>(content, SerializerOptions);
        }

        if (config is null)
            throw new InvalidOperationException("Error parsing configuration file.");

        config.ConfigFilePath = configurationFile;
        config.SetUndefined();

        return config;
    }

    /// <summary>Applies defaults: file build lists, guaranteed dev build and tsconfig auto-detection.</summary>
    private void SetUndefined()
    {
        Files ??= [];
        Builds ??= [];

        foreach (MateConfigFile file in Files)
            file.Builds ??= ["dev"];

        if (!Builds.Any(build => build.Name == "dev"))
            Builds.Add(new MateConfigBuild("dev"));

        string? tsConfigPath = FindTsConfigFile();

        if (tsConfigPath is not null)
            foreach (MateConfigBuild build in Builds)
                build.Ts ??= tsConfigPath;
    }

    /// <summary>Replaces ts.findConfigFile: walks up from the configuration directory looking for tsconfig.json.</summary>
    private string? FindTsConfigFile()
    {
        for (DirectoryInfo? current = new(RootDirectory); current is not null; current = current.Parent)
        {
            string candidate = Path.Combine(current.FullName, "tsconfig.json");

            if (File.Exists(candidate))
                return candidate;
        }

        return null;
    }

    public MateConfigBuild? GetBuild(string? name)
    {
        if (string.IsNullOrEmpty(name))
            name = "dev";

        return Builds.FirstOrDefault(build => build.Name == name);
    }

    public string? GetOutDirName() => Name ?? GetPackageInfo("name");

    public string? GetOutDirVersion() => Version ?? GetPackageInfo("version");

    private JsonNode? _packageJson;
    private bool _packageJsonLoaded;

    private string? GetPackageInfo(string info)
    {
        if (!_packageJsonLoaded)
        {
            _packageJsonLoaded = true;

            string packagePath = Path.Combine(RootDirectory, "package.json");

            if (File.Exists(packagePath))
                _packageJson = JsonNode.Parse(File.ReadAllText(packagePath));
        }

        return _packageJson?[info]?.GetValue<string>();
    }

    private static JsonNode? GetPackageJsonConfigNode(string packageJsonPath)
    {
        try
        {
            return JsonNode.Parse(File.ReadAllText(packageJsonPath))?["mateconfig"];
        }
        catch
        {
            return null;
        }
    }
}
