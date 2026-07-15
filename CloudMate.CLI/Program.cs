using AngryMonkey.CloudMate;

// ─── Console setup ────────────────────────────────────────────────────────────

Console.OutputEncoding = System.Text.Encoding.UTF8;
Console.Title = "CloudMate";

// ─── Logging hooks ────────────────────────────────────────────────────────────

MateBundler.Log = msg => Print(msg, ConsoleColor.Cyan);
MateBundler.LogError = msg => Print(msg, ConsoleColor.Red);
MateImageCompressor.Log = msg => Print(msg, ConsoleColor.Cyan);
MateImageCompressor.LogError = msg => Print(msg, ConsoleColor.Red);
MateWatcher.Log = msg => Print(msg, ConsoleColor.DarkGray);
MateWatcher.LogError = msg => Print(msg, ConsoleColor.Red);
MateConfigManager.Log = msg => Print(msg, ConsoleColor.Cyan);
MateConfigManager.LogError = msg => Print(msg, ConsoleColor.Red);

// ─── Argument parsing (mirrors legacy minimist behavior) ─────────────────────

List<string> positional = [];
bool watchMode = false;
bool allBuilds = false;
bool showHelp = false;
bool showVersion = false;
bool cleanMode = false;
bool autoConfigMode = false;
bool recompressMode = false;
bool noInitialBuild = false;
string? inputPath = null;

for (int i = 0; i < args.Length; i++)
{
    switch (args[i])
    {
        case "-w": case "--watch":      watchMode = true;      break;
        case "-a": case "--all":        allBuilds = true;      break;
        case "-h": case "--help":       showHelp = true;       break;
        case "-v": case "--version":    showVersion = true;    break;
        case "-c": case "--clean":      cleanMode = true;      break;
        case "--autoconfig":            autoConfigMode = true; break;
        case "--recompress":            recompressMode = true; break;
        case "--no-initial-build":      noInitialBuild = true; break;
        case "--input" when i + 1 < args.Length:
            inputPath = args[++i];
            break;
        default:
            if (!args[i].StartsWith('-'))
                positional.Add(args[i]);
            break;
    }
}

// ─── --version ────────────────────────────────────────────────────────────────

if (showVersion)
{
    string? version = typeof(MateBundler).Assembly.GetName().Version?.ToString(3);
    Console.WriteLine(version ?? "unknown");
    return 0;
}

// ─── --help ───────────────────────────────────────────────────────────────────

if (showHelp)
{
    Console.WriteLine("Usage: mate [builds] [options]");
    Console.WriteLine();
    Console.WriteLine("  mate               run dev build only");
    Console.WriteLine("  mate dist          run dist build only");
    Console.WriteLine("  mate dev dist      run dev and dist builds");
    Console.WriteLine();
    Console.WriteLine("Options:");
    Console.WriteLine("  -a, --all          run all defined builds");
    Console.WriteLine("  -w, --watch        watch inputs and re-build on change");
    Console.WriteLine("  -c, --clean        remove entries with missing input files from mateconfig.json");
    Console.WriteLine("      --autoconfig   clean config and add all unconfigured .ts/.less/.scss/.sass files");
    Console.WriteLine("      --recompress   force re-compress all images even if output files already exist");
    Console.WriteLine("      --input FILE   compile only config entries containing FILE");
    Console.WriteLine("  -h, --help         print this help");
    Console.WriteLine("  -v, --version      print CloudMate version");
    return 0;
}

// ─── --clean ─────────────────────────────────────────────────────────────────

if (cleanMode)
{
    string projectRoot = Directory.GetCurrentDirectory();
    MateConfigManager.CleanConfigResult clean = MateConfigManager.CleanConfig(projectRoot);

    if (clean.EntriesRemoved == 0 && clean.InputsRemoved == 0)
        MateConfigManager.Log("  Nothing to clean — all input paths exist.");
    else
    {
        if (clean.EntriesRemoved > 0)
            MateConfigManager.Log($"  Removed {clean.EntriesRemoved} entr{(clean.EntriesRemoved == 1 ? "y" : "ies")} with missing input files.");
        if (clean.InputsRemoved > 0)
            MateConfigManager.Log($"  Pruned {clean.InputsRemoved} missing input path{(clean.InputsRemoved == 1 ? "" : "s")} from array inputs.");
    }

    return 0;
}

// ─── --autoconfig ────────────────────────────────────────────────────────────

if (autoConfigMode)
{
    string projectRoot = Directory.GetCurrentDirectory();
    MateConfigManager.AutoConfigureResult result = MateConfigManager.AutoConfigure(projectRoot);

    if (result.Cleaned.EntriesRemoved > 0)
        MateConfigManager.Log($"  Removed {result.Cleaned.EntriesRemoved} stale entr{(result.Cleaned.EntriesRemoved == 1 ? "y" : "ies")} from mateconfig.json.");
    if (result.Cleaned.InputsRemoved > 0)
        MateConfigManager.Log($"  Pruned {result.Cleaned.InputsRemoved} missing input path{(result.Cleaned.InputsRemoved == 1 ? "" : "s")} from array inputs.");

    if (result.Added > 0)
        MateConfigManager.Log($"  Added {result.Added} file{(result.Added == 1 ? "" : "s")} to mateconfig.json.");
    else if (result.AlreadyConfigured > 0)
        MateConfigManager.Log("  Nothing new to configure.");
    else
        MateConfigManager.Log("  No compilable source files found in the project.");

    if (result.AlreadyConfigured > 0)
        MateConfigManager.Log($"  {result.AlreadyConfigured} file{(result.AlreadyConfigured == 1 ? " was" : "s were")} already configured.");

    return 0;
}

// ─── Load config ──────────────────────────────────────────────────────────────

MateConfig config;

try
{
    config = MateConfig.Get(Directory.GetCurrentDirectory());
}
catch (FileNotFoundException ex)
{
    Print($"Error: {ex.Message}", ConsoleColor.Red);
    return 1;
}

// Resolve build list: null means "all" (legacy --all semantics)
IReadOnlyList<string>? builds = allBuilds ? null : (positional.Count > 0 ? positional : null);

// ─── Execute ──────────────────────────────────────────────────────────────────

if (watchMode)
{
    if (!noInitialBuild)
    {
        MateBundler.Execute(config, builds);
        MateImageCompressor.Execute(config, recompress: recompressMode);
    }

    using MateWatcher watcher = new(config, builds);
    watcher.WaitForExit();
}
else if (inputPath is not null)
{
    if (MateBundler.ExecuteInput(config, inputPath, builds) == 0)
    {
        MateBundler.LogError($"No mateconfig file entry contains '{inputPath}'.");
        return 1;
    }
}
else if (recompressMode)
{
    MateImageCompressor.Execute(config, recompress: true);
}
else
{
    MateBundler.Execute(config, builds);
    MateImageCompressor.Execute(config, recompress: recompressMode);
}

return 0;

// ─── Helpers ──────────────────────────────────────────────────────────────────

static void Print(string message, ConsoleColor color)
{
    Console.ForegroundColor = color;
    Console.WriteLine(message);
    Console.ResetColor();
}
