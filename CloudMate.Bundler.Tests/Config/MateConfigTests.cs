namespace AngryMonkey.CloudMate.Tests;

public class MateConfigTests
{
    [Fact]
    public void Get_LoadsPerFileMinifyOverride()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", """
            {
              "files": [
                { "input": "Component.razor.less", "output": "Component.razor.css", "minify": false }
              ]
            }
            """);

        MateConfig config = MateConfig.Get(dir.Path);

        Assert.False(config.Files.Single().Minify);
    }

    [Fact]
    public void AutoConfigure_DisablesMinificationOnlyForRazorComponentStyles()
    {
        using TempDirectory dir = new();
        dir.WriteFile("Component.razor", "<div />");
        dir.WriteFile("Component.razor.less", ".component { color: red; }");
        dir.WriteFile("site.less", ".site { color: blue; }");

        MateConfigManager.AutoConfigure(dir.Path);
        MateConfig config = MateConfig.Get(dir.Path);

        MateConfigFile component = Assert.Single(config.Files, file => file.Input.Contains("Component.razor.less"));
        MateConfigFile site = Assert.Single(config.Files, file => file.Input.Contains("site.less"));
        Assert.False(component.Minify);
        Assert.Null(site.Minify);
    }

    [Fact]
    public void FindConfigurationFile_FindsMateConfigJsonInWorkingDirectory()
    {
        using TempDirectory dir = new();
        string configPath = dir.WriteFile(".mateconfig.json", "{}");

        string found = MateConfig.FindConfigurationFile(dir.Path);

        Assert.Equal(configPath, found);
    }

    [Fact]
    public void FindConfigurationFile_WalksUpParentDirectories()
    {
        using TempDirectory dir = new();
        string configPath = dir.WriteFile(".mateconfig.json", "{}");
        string nested = dir.Combine("a/b/c");
        Directory.CreateDirectory(nested);

        string found = MateConfig.FindConfigurationFile(nested);

        Assert.Equal(configPath, found);
    }

    [Fact]
    public void FindConfigurationFile_PrefersDotMateConfigOverJsonVariant()
    {
        using TempDirectory dir = new();
        string preferred = dir.WriteFile(".mateconfig", "{}");
        dir.WriteFile(".mateconfig.json", "{}");

        string found = MateConfig.FindConfigurationFile(dir.Path);

        Assert.Equal(preferred, found);
    }

    [Fact]
    public void FindConfigurationFile_PrefersCanonicalDotConfigOverDeprecatedUnprefixedConfig()
    {
        using TempDirectory dir = new();
        string preferred = dir.WriteFile(".mateconfig.json", "{}");
        dir.WriteFile("mateconfig.json", "{}");

        string found = MateConfig.FindConfigurationFile(dir.Path);

        Assert.Equal(preferred, found);
    }

    [Fact]
    public void FindConfigurationFile_SupportsDeprecatedMateConfigJsonWithoutLeadingDot()
    {
        using TempDirectory dir = new();
        string configPath = dir.WriteFile("mateconfig.json", "{}");

        string found = MateConfig.FindConfigurationFile(dir.Path);

        Assert.Equal(configPath, found);
    }

    [Fact]
    public void FindConfigurationFile_IgnoresPackageJsonWithoutMateConfigSection()
    {
        using TempDirectory dir = new();
        dir.WriteFile("package.json", """{ "name": "some-package" }""");

        Assert.Throws<FileNotFoundException>(() => MateConfig.FindConfigurationFile(dir.Path));
    }

    [Fact]
    public void FindConfigurationFile_FindsPackageJsonWithMateConfigSection()
    {
        using TempDirectory dir = new();
        string configPath = dir.WriteFile("package.json", """{ "name": "some-package", "mateconfig": { "files": [] } }""");

        string found = MateConfig.FindConfigurationFile(dir.Path);

        Assert.Equal(configPath, found);
    }

    [Fact]
    public void FindConfigurationFile_ThrowsWhenNothingFound()
    {
        using TempDirectory dir = new();

        Assert.Throws<FileNotFoundException>(() => MateConfig.FindConfigurationFile(dir.Path));
    }

    [Fact]
    public void FindConfigurationFile_ThrowsHelpfulMessageForMateConfigJs()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.js", "module.exports = {};");

        FileNotFoundException exception = Assert.Throws<FileNotFoundException>(() => MateConfig.FindConfigurationFile(dir.Path));
        Assert.Contains(".mateconfig.js", exception.Message);
    }

    [Fact]
    public void Get_ParsesJsonConfigurationAndAppliesDevBuildDefault()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", """
        {
            "files": [
                { "input": "src/app.ts", "output": "dist/app.js" }
            ]
        }
        """);

        MateConfig config = MateConfig.Get(dir.Path);

        Assert.Single(config.Files);
        Assert.Equal(["src/app.ts"], config.Files[0].Input);
        Assert.Equal(["dist/app.js"], config.Files[0].Output);
        Assert.Equal(["dev"], config.Files[0].Builds);
        Assert.NotNull(config.GetBuild("dev"));
    }

    [Fact]
    public void Get_SupportsStringOrArrayForInputAndOutput()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", """
        {
            "files": [
                { "input": ["a.ts", "b.ts"], "output": "dist/app.js" }
            ]
        }
        """);

        MateConfig config = MateConfig.Get(dir.Path);

        Assert.Equal(["a.ts", "b.ts"], config.Files[0].Input);
    }

    [Fact]
    public void Get_ParsesYamlConfiguration()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.yaml", """
        files:
          - input: src/app.ts
            output: dist/app.js
        """);

        MateConfig config = MateConfig.Get(dir.Path);

        Assert.Single(config.Files);
        Assert.Equal(["src/app.ts"], config.Files[0].Input);
    }

    [Fact]
    public void Get_ParsesPackageJsonMateConfigSection()
    {
        using TempDirectory dir = new();
        dir.WriteFile("package.json", """
        {
            "name": "demo",
            "version": "2.0.0",
            "mateconfig": {
                "files": [ { "input": "a.ts", "output": "dist/a.js" } ]
            }
        }
        """);

        MateConfig config = MateConfig.Get(dir.Path);

        Assert.Single(config.Files);
        Assert.Equal("demo", config.GetOutDirName());
        Assert.Equal("2.0.0", config.GetOutDirVersion());
    }

    [Fact]
    public void Get_AutoDetectsTsConfigJsonForAllBuilds()
    {
        using TempDirectory dir = new();
        string tsConfigPath = dir.WriteFile("tsconfig.json", "{}");
        dir.WriteFile(".mateconfig.json", """
        {
            "builds": [ { "name": "dist" } ],
            "files": []
        }
        """);

        MateConfig config = MateConfig.Get(dir.Path);

        Assert.Equal(tsConfigPath, config.GetBuild("dev")!.Ts);
        Assert.Equal(tsConfigPath, config.GetBuild("dist")!.Ts);
    }

    [Fact]
    public void GetBuild_ReturnsDevBuildForNullOrEmptyName()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", "{}");

        MateConfig config = MateConfig.Get(dir.Path);

        Assert.Same(config.GetBuild("dev"), config.GetBuild(null));
        Assert.Same(config.GetBuild("dev"), config.GetBuild(""));
    }

    [Fact]
    public void GetBuild_ReturnsNullForUndefinedBuild()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", "{}");

        MateConfig config = MateConfig.Get(dir.Path);

        Assert.Null(config.GetBuild("does-not-exist"));
    }

    [Fact]
    public void RootDirectory_MatchesConfigurationFileDirectory()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", "{}");

        MateConfig config = MateConfig.Get(dir.Path);

        Assert.Equal(Path.GetFullPath(dir.Path), Path.GetFullPath(config.RootDirectory));
    }
}
