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
    public void RapidExternalFileChanges_CompileFinalContent()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", "{}");
        string inputPath = dir.WriteFile("agent.less", "@color: black;\n.agent { color: @color; }\n");

        MateConfig config = MateConfig.Get(dir.Path);
        config.GetBuild("dev")!.Css.Minify = false;
        config.Files.Add(new MateConfigFile
        {
            Input = ["agent.less"],
            Output = ["dist/agent.css"],
            Builds = ["dev"]
        });

        using MateWatcher watcher = new(config);
        Thread.Sleep(250);

        // Simulate an external agent/editor that performs multiple writes as part of one save.
        File.WriteAllText(inputPath, "@color: red;\n.agent { color: @color; }\n");
        Thread.Sleep(50);
        File.WriteAllText(inputPath, "@color: blue;\n.agent { color: @color; }\n");

        string outputPath = dir.Combine(Path.Combine("dist", "agent.css"));
        bool compiledFinalContent = false;
        for (int i = 0; i < 40; i++)
        {
            if (File.Exists(outputPath) && File.ReadAllText(outputPath).Contains("blue"))
            {
                compiledFinalContent = true;
                break;
            }

            Thread.Sleep(250);
        }

        Assert.True(compiledFinalContent, "Expected the watcher to compile the final content from a rapid external save.");
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

    [Fact]
    public void ConfigChange_AddingEntries_CompilesEverySupportedSourceType()
    {
        using TempDirectory dir = new();
        string configPath = dir.WriteFile(".mateconfig.json", "{}");
        dir.WriteFile("app.less", "@color: red;\n.foo { color: @color; }\n");
        dir.WriteFile("app.scss", "$color: green;\n.foo { color: $color; }\n");
        dir.WriteFile("app.sass", "$color: blue\n.foo\n  color: $color\n");
        dir.WriteFile("app.ts", "export const value: number = 42;\n");
        dir.WriteFile("app.js", "console.log('javascript');\n");
        dir.WriteFile("app.css", ".plain { color: orange; }\n");

        MateConfig config = MateConfig.Get(dir.Path);
        List<string> errors = [];
        Action<string> originalLogError = MateWatcher.LogError;
        MateWatcher.LogError = errors.Add;

        using MateWatcher watcher = new(config);

        try
        {
            // Let the config watcher arm before simulating an entry added by the VSIX or editor.
            Thread.Sleep(250);
            string configuredJson = """
                {
                  "builds": [
                    {
                      "name": "dev",
                      "css": { "minify": false, "sourceMap": false },
                      "js": { "minify": false, "sourceMap": false, "declaration": false }
                    }
                  ],
                  "files": [
                    { "input": "app.less", "output": "dist/from-less.css" },
                    { "input": "app.scss", "output": "dist/from-scss.css" },
                    { "input": "app.sass", "output": "dist/from-sass.css" },
                    { "input": "app.ts", "output": "dist/from-ts.js" },
                    { "input": "app.js", "output": "dist/from-js.js" },
                    { "input": "app.css", "output": "dist/from-css.css" }
                  ]
                }
                """;
            File.WriteAllText(configPath, configuredJson);

            string[] outputPaths =
            [
                "dist/from-less.css",
                "dist/from-scss.css",
                "dist/from-sass.css",
                "dist/from-ts.js",
                "dist/from-js.js",
                "dist/from-css.css"
            ];
            bool WaitForEveryOutput()
            {
                for (int i = 0; i < 240; i++)
                {
                    if (outputPaths.All(path => File.Exists(dir.Combine(path))))
                        return true;

                    Thread.Sleep(250);
                }

                return false;
            }

            bool compiled = WaitForEveryOutput();
            string[] missingOutputs = outputPaths.Where(path => !File.Exists(dir.Combine(path))).ToArray();
            Assert.True(compiled,
                $"Expected config reload to compile LESS, SCSS, SASS, TS, JS, and CSS entries. "
                + $"Missing: {string.Join(", ", missingOutputs)}. Errors: {string.Join("; ", errors)}");

            // Prove that saving an existing config (not only adding new entries) rebuilds every
            // configured item. Removing the outputs makes a missed rebuild unambiguous.
            foreach (string outputPath in outputPaths)
                File.Delete(dir.Combine(outputPath));

            File.WriteAllText(configPath, configuredJson);

            bool recompiledAfterSave = WaitForEveryOutput();
            missingOutputs = outputPaths.Where(path => !File.Exists(dir.Combine(path))).ToArray();
            Assert.True(recompiledAfterSave,
                $"Expected every config save to rebuild all configured entries. "
                + $"Missing: {string.Join(", ", missingOutputs)}. Errors: {string.Join("; ", errors)}");
        }
        finally
        {
            MateWatcher.LogError = originalLogError;
        }
    }

    [Fact]
    public void ImportedLessChange_RebuildsEntryFromDifferentFolder()
    {
        using TempDirectory dir = new();
        dir.WriteFile(".mateconfig.json", """
            {
              "files": [
                {
                  "input": "styles/pages/site.less",
                  "output": "dist/site.css"
                }
              ]
            }
            """);
        string importPath = dir.WriteFile(Path.Combine("styles", "shared", "_variables.less"), "@brand: red;\n");
        dir.WriteFile(Path.Combine("styles", "pages", "site.less"),
            "@import \"../shared/_variables\";\n.site { color: @brand; }\n");

        MateConfig config = MateConfig.Get(dir.Path);
        MateBundler.Execute(config);

        List<string> errors = [];
        Action<string> originalLogError = MateWatcher.LogError;
        MateWatcher.LogError = errors.Add;

        using MateWatcher watcher = new(config);

        try
        {
            Thread.Sleep(250);
            File.WriteAllText(importPath, "@brand: blue;\n");

            string outputPath = dir.Combine(Path.Combine("dist", "site.css"));
            bool rebuilt = false;

            for (int i = 0; i < 40; i++)
            {
                if (File.Exists(outputPath) && File.ReadAllText(outputPath).Contains("blue"))
                {
                    rebuilt = true;
                    break;
                }

                Thread.Sleep(250);
            }

            Assert.True(rebuilt, $"Expected an imported LESS change to rebuild its configured entry. Errors: {string.Join("; ", errors)}");
        }
        finally
        {
            MateWatcher.LogError = originalLogError;
        }
    }
}
