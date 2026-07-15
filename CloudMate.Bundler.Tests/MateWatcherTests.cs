namespace AngryMonkey.CloudMate.Tests;

public class MateWatcherTests
{
    [Fact]
    public void Constructor_ConfigWithFileEntries_DoesNotThrow()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", "{}");
        dir.WriteFile("app.js", "console.log(1);");

        MateConfig config = MateConfig.Get(dir.Path);
        config.Files.Add(new MateConfigFile
        {
            Input = ["app.js"],
            Output = ["dist/app.js"],
            Builds = ["dev"]
        });

        using MateWatcher watcher = new(config);
    }

    [Fact]
    public void Constructor_ConfigWithImageEntries_DoesNotThrow()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", "{}");
        dir.WriteFile("photo.png", "not a real png but only existence matters here");

        MateConfig config = MateConfig.Get(dir.Path);
        config.Images =
        [
            new MateConfigImage
            {
                Input = ["photo.png"],
                Output = ["dist"]
            }
        ];

        using MateWatcher watcher = new(config);
    }

    [Fact]
    public void Constructor_ConfigWithNoFilesOrImages_DoesNotThrow()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", "{}");

        MateConfig config = MateConfig.Get(dir.Path);

        using MateWatcher watcher = new(config);
    }

    [Fact]
    public void Constructor_EntriesInSameDirectoryShareOneOperatingSystemWatcher()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", "{}");
        dir.WriteFile("first.js", "console.log(1);");
        dir.WriteFile("second.js", "console.log(2);");

        MateConfig config = MateConfig.Get(dir.Path);
        config.Files.Add(new MateConfigFile { Input = ["first.js"], Output = ["dist/first.js"] });
        config.Files.Add(new MateConfigFile { Input = ["second.js"], Output = ["dist/second.js"] });

        using MateWatcher watcher = new(config);

        // One shared source watcher plus the specifically-filtered config watcher.
        Assert.Equal(2, watcher.ActiveWatcherCount);
    }

    [Fact]
    public void Constructor_WithBuildsFilter_DoesNotThrow()
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

        using MateWatcher watcher = new(config, ["dev"]);
    }

    [Fact]
    public void Dispose_CalledMultipleTimes_DoesNotThrow()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", "{}");
        dir.WriteFile("app.js", "console.log(1);");

        MateConfig config = MateConfig.Get(dir.Path);
        config.Files.Add(new MateConfigFile
        {
            Input = ["app.js"],
            Output = ["dist/app.js"],
            Builds = ["dev"]
        });

        MateWatcher watcher = new(config);

        watcher.Dispose();
        watcher.Dispose();
    }

    [Fact]
    public void FileChange_TriggersRebuildAndWritesOutput()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", "{}");
        string inputPath = dir.WriteFile("app.js", "console.log(1);");

        MateConfig config = MateConfig.Get(dir.Path);
        config.GetBuild("dev")!.Js.Minify = false;
        config.Files.Add(new MateConfigFile
        {
            Input = ["app.js"],
            Output = ["dist/app.js"],
            Builds = ["dev"]
        });

        List<string> errors = [];
        Action<string> originalLogError = MateWatcher.LogError;
        MateWatcher.LogError = errors.Add;

        using MateWatcher watcher = new(config);

        try
        {
            // Give the FileSystemWatcher a brief moment to fully arm before mutating the file.
            Thread.Sleep(250);
            File.WriteAllText(inputPath, "console.log(2);");

            string outputPath = dir.Combine("dist/app.js");
            bool rebuilt = false;

            for (int i = 0; i < 40; i++)
            {
                if (File.Exists(outputPath) && File.ReadAllText(outputPath).Contains("console.log(2)"))
                {
                    rebuilt = true;
                    break;
                }

                Thread.Sleep(250);
            }

            Assert.True(rebuilt, $"Expected watcher to rebuild output within timeout. Errors: {string.Join("; ", errors)}");
        }
        finally
        {
            MateWatcher.LogError = originalLogError;
        }
    }

    [Fact]
    public void UnconfiguredFileChange_DoesNotTriggerConfiguredBundle()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", "{}");
        dir.WriteFile("app.js", "console.log(1);");
        string unrelatedPath = dir.WriteFile("unrelated.js", "console.log('old');");

        MateConfig config = MateConfig.Get(dir.Path);
        config.GetBuild("dev")!.Js.Minify = false;
        config.Files.Add(new MateConfigFile
        {
            Input = ["app.js"],
            Output = ["dist/app.js"],
            Builds = ["dev"]
        });

        using MateWatcher watcher = new(config);
        Thread.Sleep(250);
        File.WriteAllText(unrelatedPath, "console.log('new');");
        Thread.Sleep(750);

        Assert.False(File.Exists(dir.Combine(Path.Combine("dist", "app.js"))));
    }
}
