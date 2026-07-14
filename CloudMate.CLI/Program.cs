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

// ─── Argument parsing (mirrors legacy minimist behavior) ─────────────────────

List<string> positional = [];
bool watchMode = false;
bool allBuilds = false;
bool showHelp = false;
bool showVersion = false;

for (int i = 0; i < args.Length; i++)
{
    switch (args[i])
    {
        case "-w": case "--watch": watchMode = true; break;
        case "-a": case "--all": allBuilds = true; break;
        case "-h": case "--help": showHelp = true; break;
        case "-v": case "--version": showVersion = true; break;
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
    Console.WriteLine("  -h, --help         print this help");
    Console.WriteLine("  -v, --version      print CloudMate version");
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
    MateBundler.Execute(config, builds);
    MateImageCompressor.Execute(config);

    using MateWatcher watcher = new(config, builds);
    watcher.WaitForExit();
}
else
{
    MateBundler.Execute(config, builds);
    MateImageCompressor.Execute(config);
}

return 0;

// ─── Helpers ──────────────────────────────────────────────────────────────────

static void Print(string message, ConsoleColor color)
{
    Console.ForegroundColor = color;
    Console.WriteLine(message);
    Console.ResetColor();
}
