namespace AngryMonkey.CloudMate.Tests;

public class MateBundlerTests
{
    [Fact]
    public void Execute_PassthroughCss_ConcatenatesInputFilesInOrder()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", "{}");
        dir.WriteFile("a.css", ".a { color: red; }");
        dir.WriteFile("b.css", ".b { color: blue; }");

        MateConfig config = MateConfig.Get(dir.Path);
        config.GetBuild("dev")!.Css.Minify = false;
        config.Files.Add(new MateConfigFile
        {
            Input = ["a.css", "b.css"],
            Output = ["dist/app.css"],
            Builds = ["dev"]
        });

        MateBundler.Execute(config);

        string outputPath = dir.Combine("dist/app.css");
        Assert.True(File.Exists(outputPath));

        string content = File.ReadAllText(outputPath);
        Assert.Contains(".a { color: red; }", content);
        Assert.Contains(".b { color: blue; }", content);
        Assert.True(content.IndexOf(".a", StringComparison.Ordinal) < content.IndexOf(".b", StringComparison.Ordinal));

        Assert.False(File.Exists(dir.Combine("dist/app.min.css")));
    }

    [Fact]
    public void Execute_JsBuildWithMinifyEnabled_WritesMinifiedSiblingFile()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", "{}");
        dir.WriteFile("app.js", "function add(a, b) {\n    return a + b;\n}\n");

        MateConfig config = MateConfig.Get(dir.Path);
        config.Files.Add(new MateConfigFile
        {
            Input = ["app.js"],
            Output = ["dist/app.js"],
            Builds = ["dev"]
        });

        MateBundler.Execute(config);

        string minPath = dir.Combine("dist/app.min.js");
        Assert.True(File.Exists(minPath));

        string minified = File.ReadAllText(minPath);
        Assert.DoesNotContain("\n", minified);
        Assert.Contains("function add", minified);
    }

    [Fact]
    public void ExecuteInput_BuildsOnlyTheSelectedConfigEntry()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", "{}");
        dir.WriteFile("first.less", ".first { color: red; }");
        dir.WriteFile("second.less", ".second { color: blue; }");

        MateConfig config = MateConfig.Get(dir.Path);
        config.GetBuild("dev")!.Css.Minify = false;
        config.Files.Add(new MateConfigFile
        {
            Input = ["first.less"],
            Output = ["dist/first.css"],
            Builds = ["dev"]
        });
        config.Files.Add(new MateConfigFile
        {
            Input = ["second.less"],
            Output = ["dist/second.css"],
            Builds = ["dev"]
        });

        int matches = MateBundler.ExecuteInput(config, "first.less");

        Assert.Equal(1, matches);
        Assert.True(File.Exists(dir.Combine("dist/first.css")));
        Assert.False(File.Exists(dir.Combine("dist/second.css")));
    }

    [Fact]
    public void Execute_MissingJsInput_DoesNotStopOtherEntries()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", "{}");
        dir.WriteFile("working.js", "window.cloudMateStillRuns = true;");

        MateConfig config = MateConfig.Get(dir.Path);
        config.GetBuild("dev")!.Js.Minify = false;
        config.Files.Add(new MateConfigFile
        {
            Input = ["deleted.js"],
            Output = ["dist/deleted.js"],
            Builds = ["dev"]
        });
        config.Files.Add(new MateConfigFile
        {
            Input = ["working.js"],
            Output = ["dist/working.js"],
            Builds = ["dev"]
        });

        List<string> errors = [];
        Action<string> originalLogError = MateBundler.LogError;
        MateBundler.LogError = errors.Add;

        try
        {
            MateBundler.Execute(config);
        }
        finally
        {
            MateBundler.LogError = originalLogError;
        }

        string workingOutput = dir.Combine("dist/working.js");
        Assert.True(File.Exists(workingOutput));
        Assert.Contains("cloudMateStillRuns", File.ReadAllText(workingOutput));
        Assert.Contains(errors, error => error.Contains("deleted.js", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Execute_DeletedOnlyInput_RemovesStaleOutputs()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", "{}");
        dir.WriteFile("dist/deleted.js", "stale output");
        dir.WriteFile("dist/deleted.min.js", "stale minified output");

        MateConfig config = MateConfig.Get(dir.Path);
        config.Files.Add(new MateConfigFile
        {
            Input = ["deleted.js"],
            Output = ["dist/deleted.js"],
            Builds = ["dev"]
        });

        MateBundler.Execute(config);

        Assert.False(File.Exists(dir.Combine("dist/deleted.js")));
        Assert.False(File.Exists(dir.Combine("dist/deleted.min.js")));
    }

    [Fact]
    public void Execute_CompilesTypeScriptInput_EmitsJavaScriptAndDeclaration()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", "{}");
        dir.WriteFile("app.ts", "export const value: number = 42;\n");

        MateConfig config = MateConfig.Get(dir.Path);
        config.Files.Add(new MateConfigFile
        {
            Input = ["app.ts"],
            Output = ["dist/app.js"],
            Builds = ["dev"]
        });

        MateBundler.Execute(config);

        string outputPath = dir.Combine("dist/app.js");
        Assert.True(File.Exists(outputPath));
        Assert.Contains("42", File.ReadAllText(outputPath));

        string declarationPath = dir.Combine("dist/app.d.ts");
        Assert.True(File.Exists(declarationPath));
        Assert.Contains("declare const value: number", File.ReadAllText(declarationPath));
    }

    [Fact]
    public void Execute_CompilesLessInput_EmitsCss()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", "{}");
        dir.WriteFile("app.less", "@color: red;\n.foo { color: @color; }\n");

        MateConfig config = MateConfig.Get(dir.Path);
        config.Files.Add(new MateConfigFile
        {
            Input = ["app.less"],
            Output = ["dist/app.css"],
            Builds = ["dev"]
        });

        MateBundler.Execute(config);

        string outputPath = dir.Combine("dist/app.css");
        Assert.True(File.Exists(outputPath));

        string content = File.ReadAllText(outputPath);
        Assert.Contains(".foo", content);
        Assert.Contains("red", content);
        Assert.True(File.Exists(dir.Combine("dist/app.min.css")));
    }

    [Fact]
    public void Execute_PerFileMinifyFalse_WritesCssOnlyAndRemovesStaleMinifiedOutput()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", "{}");
        dir.WriteFile("Component.razor.less", ".component { color: red; }");
        dir.WriteFile("Component.razor.min.css", "stale");

        MateConfig config = MateConfig.Get(dir.Path);
        Assert.True(config.GetBuild("dev")!.Css.Minify);
        config.Files.Add(new MateConfigFile
        {
            Input = ["Component.razor.less"],
            Output = ["Component.razor.css"],
            Builds = ["dev"],
            Minify = false
        });

        MateBundler.Execute(config);

        Assert.True(File.Exists(dir.Combine("Component.razor.css")));
        Assert.False(File.Exists(dir.Combine("Component.razor.min.css")));
    }

    [Fact]
    public void Execute_PerFileMinifyTrue_OverridesDisabledBuildMinification()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", "{}");
        dir.WriteFile("site.less", ".site { color: blue; }");

        MateConfig config = MateConfig.Get(dir.Path);
        config.GetBuild("dev")!.Css.Minify = false;
        config.Files.Add(new MateConfigFile
        {
            Input = ["site.less"],
            Output = ["site.css"],
            Builds = ["dev"],
            Minify = true
        });

        MateBundler.Execute(config);

        Assert.True(File.Exists(dir.Combine("site.css")));
        Assert.True(File.Exists(dir.Combine("site.min.css")));
    }

    [Fact]
    public void Execute_CompilesScssInput_EmitsCss()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", "{}");
        dir.WriteFile("app.scss", "$color: red;\n.foo { color: $color; }\n");

        MateConfig config = MateConfig.Get(dir.Path);
        config.Files.Add(new MateConfigFile
        {
            Input = ["app.scss"],
            Output = ["dist/app.css"],
            Builds = ["dev"]
        });

        MateBundler.Execute(config);

        string outputPath = dir.Combine("dist/app.css");
        Assert.True(File.Exists(outputPath));

        string content = File.ReadAllText(outputPath);
        Assert.Contains(".foo", content);
        Assert.Contains("color: red", content);
    }

    [Fact]
    public void RunFiles_UnknownBuildName_SkipsOutputAndLogsError()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", "{}");
        dir.WriteFile("app.js", "console.log(1);");

        MateConfig config = MateConfig.Get(dir.Path);
        config.Files.Add(new MateConfigFile
        {
            Input = ["app.js"],
            Output = ["dist/app.js"],
            Builds = ["does-not-exist"]
        });

        List<string> errors = [];
        Action<string> originalLogError = MateBundler.LogError;
        MateBundler.LogError = errors.Add;

        try
        {
            MateBundler.Execute(config);
        }
        finally
        {
            MateBundler.LogError = originalLogError;
        }

        Assert.False(File.Exists(dir.Combine("dist/app.js")));
        Assert.Contains(errors, e => e.Contains("does-not-exist") && e.Contains("not defined"));
    }

    [Fact]
    public void RunOutput_WithOutDirVersioningAndOutDirName_WritesToVersionedNamedDirectory()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", "{}");
        dir.WriteFile("app.css", ".a { color: red; }");

        MateConfig config = MateConfig.Get(dir.Path);
        config.Name = "myapp";
        config.Version = "1.2.3";

        MateConfigBuild build = config.GetBuild("dev")!;
        build.OutDir = "dist";
        build.OutDirVersioning = true;
        build.OutDirName = true;
        build.Css.Minify = false;

        config.Files.Add(new MateConfigFile
        {
            Input = ["app.css"],
            Output = ["app.css"],
            Builds = ["dev"]
        });

        MateBundler.Execute(config);

        string expectedPath = dir.Combine("dist/1.2.3/myapp/app.css");
        Assert.True(File.Exists(expectedPath));
    }
}
