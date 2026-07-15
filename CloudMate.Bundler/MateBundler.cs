namespace AngryMonkey.CloudMate;

/// <summary>
/// Bundling pipeline: groups inputs by extension, compiles (TS/LESS/SCSS), concatenates, renames to the
/// configured output and writes minified variants. Port of the legacy bundler.ts.
/// </summary>
public class MateBundler
{
    /// <summary>Standard output sink; the CLI replaces this with styled logging.</summary>
    public static Action<string> Log { get; set; } = Console.WriteLine;

    /// <summary>Error output sink.</summary>
    public static Action<string> LogError { get; set; } = Console.Error.WriteLine;

    /// <summary>
    /// Releases all cached compiler engines and script caches (typically 50–150 MB combined)
    /// and compacts the managed heap. Engines are lazily re-created on the next compile,
    /// so this is safe to call whenever the process is idle.
    /// </summary>
    public static void ReleaseMemory()
    {
        TypeScriptCompiler.ReleaseEngine();
        SassCompiler.ReleaseEngine();
        LessCompiler.ReleaseEngine();
        CompilerAssets.ClearCache();

        System.Runtime.GCSettings.LargeObjectHeapCompactionMode = System.Runtime.GCLargeObjectHeapCompactionMode.CompactOnce;
        GC.Collect(GC.MaxGeneration, GCCollectionMode.Aggressive, blocking: true, compacting: true);
    }

    /// <summary>
    /// Runs all file entries for the requested builds.
    /// <paramref name="builds"/> semantics match the legacy CLI: null = all builds, empty = ["dev"].
    /// </summary>
    public static void Execute(MateConfig config, IReadOnlyList<string>? builds = null)
    {
        if (config.Files.Count == 0)
            return;

        Log($"executed at {DateTime.Now.ToLongTimeString()}");

        foreach (MateConfigFile file in config.Files)
            RunFiles(config, file, builds);
    }

    /// <summary>
    /// Builds only entries containing the supplied source path. This is used by editor integrations
    /// so a right-click compile does not initialize every compiler or rebuild the entire project.
    /// Returns the number of matching config entries.
    /// </summary>
    public static int ExecuteInput(MateConfig config, string inputPath, IReadOnlyList<string>? builds = null)
    {
        string fullInputPath = Path.IsPathRooted(inputPath)
            ? Path.GetFullPath(inputPath)
            : Path.GetFullPath(Path.Combine(config.RootDirectory, inputPath));

        List<MateConfigFile> matches = config.Files
            .Where(file => file.Input.Any(pattern => GlobResolver.IsMatch(pattern, config.RootDirectory, fullInputPath)))
            .ToList();

        if (matches.Count == 0)
            return 0;

        Log($"executed for {Path.GetRelativePath(config.RootDirectory, fullInputPath)} at {DateTime.Now.ToLongTimeString()}");
        foreach (MateConfigFile file in matches)
            RunFiles(config, file, builds);

        return matches.Count;
    }

    public static void RunFiles(MateConfig config, MateConfigFile file, IReadOnlyList<string>? builds)
    {
        if (builds is not null && builds.Count == 0)
            builds = ["dev"];

        foreach (string output in file.Output)
        {
            string normalizedOutput = output.Replace('\\', '/');
            string outputExtension = normalizedOutput.Split('.')[^1].ToLowerInvariant();
            string outputFileName = normalizedOutput.Split('/')[^1];

            foreach (string buildName in file.Builds ?? ["dev"])
            {
                if (builds is not null && !builds.Contains(buildName))
                    continue;

                MateConfigBuild? build = config.GetBuild(buildName);

                if (build is null)
                {
                    LogError($"Build '{buildName}' is not defined in the configuration.");
                    continue;
                }

                try
                {
                    RunOutput(config, file, build, normalizedOutput, outputExtension, outputFileName);
                }
                catch (Exception exception)
                {
                    LogError($"[{buildName}] {output}: {exception.Message}");
                }
            }
        }
    }

    private static void RunOutput(MateConfig config, MateConfigFile file, MateConfigBuild build, string output, string outputExtension, string outputFileName)
    {
        string outputDirectory = build.OutDir ?? GetDirectoryName(output);

        if (build.OutDirVersioning)
            outputDirectory += $"/{config.GetOutDirVersion()}";

        if (build.OutDirName)
            outputDirectory += $"/{config.GetOutDirName()}";

        switch (outputExtension)
        {
            case "css":
                if (!string.IsNullOrEmpty(build.Css.OutDirSuffix))
                    outputDirectory += $"/{build.Css.OutDirSuffix}";

                break;

            case "js":
                if (!string.IsNullOrEmpty(build.Js.OutDirSuffix))
                    outputDirectory += $"/{build.Js.OutDirSuffix}";

                break;
        }

        string resolvedOutputDirectory = Path.GetFullPath(Path.Combine(config.RootDirectory, outputDirectory));

        BundleResult bundle = Bundle(config, file.Input, outputExtension, build);

        string outputPath = Path.Combine(resolvedOutputDirectory, outputFileName);
        if (bundle.MatchedInputCount == 0)
        {
            DeleteOutputFiles(config, outputPath, outputExtension);
            return;
        }

        if (bundle.Pieces.Count == 0)
            throw new InvalidOperationException("No input files compiled successfully; existing output was preserved.");

        if (build.Js.Declaration)
            MateDeclarationGenerator.Write(bundle.Declarations, resolvedOutputDirectory, outputFileName);

        string content = string.Join('\n', bundle.Pieces);

        Directory.CreateDirectory(resolvedOutputDirectory);

        File.WriteAllText(outputPath, content);
        Log($"  {Path.GetRelativePath(config.RootDirectory, outputPath)}");

        string baseName = Path.GetFileNameWithoutExtension(outputFileName);
        bool minify = file.Minify ?? outputExtension switch
        {
            "css" => build.Css.Minify,
            "js" => build.Js.Minify,
            _ => false
        };

        switch (outputExtension)
        {
            case "css" when minify:
            {
                string minPath = Path.Combine(resolvedOutputDirectory, $"{baseName}.min.css");
                File.WriteAllText(minPath, CssMinifier.Minify(content));
                Log($"  {Path.GetRelativePath(config.RootDirectory, minPath)}");
                break;
            }

            case "js" when minify:
            {
                string minPath = Path.Combine(resolvedOutputDirectory, $"{baseName}.min.js");
                File.WriteAllText(minPath, JsMinifier.Minify(content));
                Log($"  {Path.GetRelativePath(config.RootDirectory, minPath)}");
                break;
            }

            case "css":
                DeleteIfExists(config, Path.Combine(resolvedOutputDirectory, $"{baseName}.min.css"));
                break;

            case "js":
                DeleteIfExists(config, Path.Combine(resolvedOutputDirectory, $"{baseName}.min.js"));
                break;
        }
    }

    private static void DeleteOutputFiles(MateConfig config, string outputPath, string outputExtension)
    {
        DeleteIfExists(config, outputPath);

        string baseName = Path.GetFileNameWithoutExtension(outputPath);
        string directory = Path.GetDirectoryName(outputPath)!;

        if (outputExtension is "css" or "js")
            DeleteIfExists(config, Path.Combine(directory, $"{baseName}.min.{outputExtension}"));
    }

    private static void DeleteIfExists(MateConfig config, string path)
    {
        if (!File.Exists(path))
            return;

        File.Delete(path);
        Log($"  deleted {Path.GetRelativePath(config.RootDirectory, path)}");
    }

    private record BundleResult(List<string> Pieces, List<KeyValuePair<string, string>> Declarations, int MatchedInputCount);

    /// <summary>
    /// Groups input patterns by consecutive extension runs (legacy behavior) and compiles each group.
    /// </summary>
    private static BundleResult Bundle(MateConfig config, List<string> inputs, string outputExtension, MateConfigBuild build)
    {
        List<string> pieces = [];
        List<KeyValuePair<string, string>> declarations = [];
        int matchedInputCount = 0;

        string groupExtension = string.Empty;
        List<string> groupedPatterns = [];

        foreach (string input in inputs)
        {
            string extension = input.Split('.')[^1].ToLowerInvariant();

            if (extension != groupExtension)
            {
                if (groupedPatterns.Count > 0)
                {
                    matchedInputCount += CompileGroup(config, groupedPatterns, groupExtension, outputExtension, build, pieces, declarations);
                    groupedPatterns = [];
                }

                groupExtension = extension;
            }

            groupedPatterns.Add(input);
        }

        if (groupedPatterns.Count > 0)
            matchedInputCount += CompileGroup(config, groupedPatterns, groupExtension, outputExtension, build, pieces, declarations);

        return new(pieces, declarations, matchedInputCount);
    }

    private static int CompileGroup(
        MateConfig config,
        List<string> patterns,
        string inputExtension,
        string outputExtension,
        MateConfigBuild build,
        List<string> pieces,
        List<KeyValuePair<string, string>> declarations)
    {
        List<string> files = GlobResolver.Resolve(patterns, config.RootDirectory, missing => LogError($"File not found: {missing}"));

        if (files.Count == 0)
            return 0;

        if (inputExtension == outputExtension)
        {
            foreach (string file in files)
            {
                try { pieces.Add(File.ReadAllText(file)); }
                catch (Exception exception) { LogError($"{file}: {exception.Message}"); }
            }

            return files.Count;
        }

        switch (inputExtension)
        {
            case "css":
                foreach (string file in files)
                {
                    try { pieces.Add(File.ReadAllText(file)); }
                    catch (Exception exception) { LogError($"{file}: {exception.Message}"); }
                }

                break;

            case "less":
                foreach (string file in files)
                {
                    try
                    {
                        pieces.Add(LessCompiler.Compile(file, build.Css.SourceMap));
                    }
                    catch (Exception exception)
                    {
                        LogError($"{file}: {exception.Message}");
                    }
                }

                break;

            case "scss":
            case "sass":
                foreach (string file in files)
                {
                    try
                    {
                        pieces.Add(SassCompiler.Compile(file, build.Css.SourceMap));
                    }
                    catch (Exception exception)
                    {
                        LogError($"{file}: {exception.Message}");
                    }
                }

                break;

            case "ts":
            {
                TypeScriptCompileResult result = TypeScriptCompiler.Compile(files, build.Ts, build.Js.SourceMap, build.Js.Declaration);

                foreach (string diagnostic in result.Diagnostics)
                    LogError(diagnostic);

                foreach (KeyValuePair<string, string> compiled in result.JavaScriptOutputs)
                {
                    string content = compiled.Value;

                    if (outputExtension == "js" && build.Js.WebClean)
                        content = WebCleanJs.Clean(content);

                    pieces.Add(content);
                }

                declarations.AddRange(result.DeclarationOutputs);
                break;
            }

            default:
                foreach (string file in files)
                {
                    try { pieces.Add(File.ReadAllText(file)); }
                    catch (Exception exception) { LogError($"{file}: {exception.Message}"); }
                }

                break;
        }

        return files.Count;
    }

    private static string GetDirectoryName(string output)
    {
        int index = output.LastIndexOf('/');

        return index < 0 ? "." : output[..index];
    }
}
