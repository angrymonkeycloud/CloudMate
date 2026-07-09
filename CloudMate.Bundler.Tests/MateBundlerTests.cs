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
