using System.Text;

namespace AngryMonkey.CloudMate;

internal class ModernConsoleLogger
{
    private readonly List<ProjectStatus> _projects = [];
    private readonly List<string> _errors = [];
    private int _headerLines = 0;
    private bool _isInitialized = false;
    private int _logLineOffset = 0;
    
    public enum Status
    {
        Pending,
        InProgress,
        Success,
        Exists,
        Failed,
        Skipped,
        Warning
    }

    private class ProjectStatus
    {
        public string Name { get; set; } = string.Empty;
        public Status RebuildStatus { get; set; } = Status.Pending;
        public Status PackStatus { get; set; } = Status.Pending;
        public Status PublishStatus { get; set; } = Status.Pending;
        public string CurrentOperation { get; set; } = string.Empty;
        public int AttemptCount { get; set; } = 0;
        public int MaxAttempts { get; set; } = 1;
    }

    // Column widths (keep consistent so table does not shift)
    private const int ProjectWidth = 30;
    private const int NugetName = 50;
    private const int SmallColWidth = 16; // rebuild/pack/publish
    private const int StatusWidth = 30;
    private string _publishVersion = string.Empty;

    public void ShowPreflight(string publishVersion, IEnumerable<PackagePreflight> packages)
    {
        Console.Clear();
        DrawTitle();

        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.Write("Target version: ");
        Console.ForegroundColor = ConsoleColor.White;
        Console.WriteLine(publishVersion);
        Console.ResetColor();
        Console.WriteLine();

        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.WriteLine(FormatCell("Project", ProjectWidth) + " │ " +
                          FormatCell("NuGet package", NugetName) + " │ " +
                          FormatCell("Current version", StatusWidth));
        Console.WriteLine(new string('─', ProjectWidth + NugetName + StatusWidth + 6));
        Console.ResetColor();

        foreach (PackagePreflight package in packages)
        {
            string currentVersion = package.LookupError is not null
                ? "Check failed"
                : package.CurrentVersion ?? "Not published";

            Console.Write(FormatCell(package.ProjectName, ProjectWidth) + " │ ");
            Console.Write(FormatCell(package.PackageId, NugetName) + " │ ");
            Console.ForegroundColor = package.LookupError is not null
                ? ConsoleColor.Yellow
                : package.CurrentVersion is null ? ConsoleColor.Gray : ConsoleColor.Green;
            Console.WriteLine(FormatCell(currentVersion, StatusWidth));
            Console.ResetColor();

            if (package.LookupError is not null)
            {
                Console.ForegroundColor = ConsoleColor.DarkYellow;
                Console.WriteLine($"  NuGet check for {package.PackageId}: {package.LookupError}");
                Console.ResetColor();
            }
        }

        Console.WriteLine();
    }

    public bool ConfirmProceed()
    {
        Console.Write("Press Enter to proceed, or Esc to cancel: ");

        while (true)
        {
            ConsoleKey key = Console.ReadKey(intercept: true).Key;
            if (key == ConsoleKey.Enter)
            {
                Console.WriteLine();
                return true;
            }

            if (key == ConsoleKey.Escape)
            {
                Console.WriteLine();
                return false;
            }
        }
    }

    public void Initialize(IEnumerable<CloudPackProject> projects, string publishVersion)
    {
        _projects.Clear();
        _errors.Clear();
        _logLineOffset = 0;
        _publishVersion = publishVersion;
        foreach (var project in projects)
            _projects.Add(new ProjectStatus { Name = project.Name });
        
        Console.Clear();
        DrawHeader();
        DrawProjectTable();
        _isInitialized = true;
    }

    private void DrawHeader()
    {
        DrawTitle();

        if (!string.IsNullOrEmpty(_publishVersion))
        {
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine($"Publishing version: {_publishVersion}");
            Console.ResetColor();
            Console.WriteLine();
            _headerLines = 6;
            return;
        }

        _headerLines = 4;
    }

    private static void DrawTitle()
    {
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("╔══════════════════════════════════════════════════════════════════════════╗");
        Console.WriteLine("║                            CloudMate Package Manager                     ║");
        Console.WriteLine("╚══════════════════════════════════════════════════════════════════════════╝");
        Console.ResetColor();
        Console.WriteLine();
    }

    private void DrawProjectTable()
    {
        if (!_projects.Any()) return;

        // Header
        Console.ForegroundColor = ConsoleColor.Yellow;
        string header = FormatCell("Project", ProjectWidth) + " │ " +
                        FormatCell("Rebuild", SmallColWidth) + " │ " +
                        FormatCell("Pack", SmallColWidth) + " │ " +
                        FormatCell("Publish", SmallColWidth) + " │ " +
                        FormatCell("Status", StatusWidth);

        Console.WriteLine(header);

        int tableWidth = ProjectWidth + SmallColWidth * 3 + StatusWidth + (3 * 4);
        Console.WriteLine(new string('─', tableWidth));
        Console.ResetColor();

        // Projects
        foreach (var project in _projects)
        {
            DrawProjectLine(project);
        }
        
        Console.WriteLine();
    }

    private void DrawProjectLine(ProjectStatus project)
    {
        Console.Write(FormatCell(project.Name, ProjectWidth) + " │ ");

        WriteStatusWithColor(project.RebuildStatus, SmallColWidth);
        Console.Write(" │ ");

        WriteStatusWithColor(project.PackStatus, SmallColWidth);
        Console.Write(" │ ");

        WriteStatusWithColor(project.PublishStatus, SmallColWidth);
        Console.Write(" │ ");

        string statusText = project.CurrentOperation;
        if (project.AttemptCount > 1)
            statusText = statusText + $" ({project.AttemptCount}/{project.MaxAttempts})";

        Console.ForegroundColor = GetStatusColor(GetOverallStatus(project));
        Console.Write(FormatCell(statusText, StatusWidth));
        Console.ResetColor();
        Console.WriteLine();
    }

    private void WriteStatusWithColor(Status status, int width)
    {
        Console.ForegroundColor = GetStatusColor(status);
        string statusText = status.ToString();
        Console.Write(FormatCell(statusText, width));
        Console.ResetColor();
    }

    private static string FormatCell(string text, int width)
    {
        if (text == null) text = string.Empty;
        if (text.Length == width) return text;
        if (text.Length < width) return text.PadRight(width);
        // truncate and reserve last char for ellipsis
        if (width <= 1) return text.Substring(0, width);
        return text.Substring(0, width - 1) + "…";
    }

    private static ConsoleColor GetStatusColor(Status status) => status switch
    {
        Status.Pending => ConsoleColor.Gray,
        Status.InProgress => ConsoleColor.Yellow,
        Status.Success => ConsoleColor.Green,
        Status.Exists => ConsoleColor.Blue,
        Status.Failed => ConsoleColor.Red,
        Status.Skipped => ConsoleColor.DarkYellow,
        Status.Warning => ConsoleColor.Magenta,
        _ => ConsoleColor.White
    };

    private static Status GetOverallStatus(ProjectStatus project)
    {
        if (project.RebuildStatus == Status.Failed || project.PackStatus == Status.Failed || project.PublishStatus == Status.Failed)
            return Status.Failed;
        if (project.RebuildStatus == Status.InProgress || project.PackStatus == Status.InProgress || project.PublishStatus == Status.InProgress)
            return Status.InProgress;
        if (project.RebuildStatus == Status.Success && project.PackStatus == Status.Success && project.PublishStatus == Status.Success)
            return Status.Success;
        if (project.RebuildStatus == Status.Skipped || project.PackStatus == Status.Skipped || project.PublishStatus == Status.Skipped)
            return Status.Warning;
        return Status.Pending;
    }

    public void UpdateProjectStatus(string projectName, string operation, Status status, int attempt = 0, int maxAttempts = 1, string? customMessage = null)
    {
        if (!_isInitialized) return;
        
        var project = _projects.FirstOrDefault(p => p.Name == projectName);
        if (project == null) return;

        project.AttemptCount = attempt;
        project.MaxAttempts = maxAttempts;
        project.CurrentOperation = customMessage ?? $"{operation} {status}";

        switch (operation.ToLower())
        {
            case "rebuild":
            case "clean":
            case "build":
                project.RebuildStatus = status;
                break;
            case "pack":
                project.PackStatus = status;
                break;
            case "publish":
                project.PublishStatus = status;
                break;
        }

        RedrawTable();
    }

    private void RedrawTable()
    {
        // Move cursor to start of table
        Console.SetCursorPosition(0, _headerLines);
        
        // Clear the table area
        for (int i = 0; i < _projects.Count + 3; i++)
        {
            Console.Write(new string(' ', Console.WindowWidth - 1));
            Console.WriteLine();
        }
        
        // Move back to start of table
        Console.SetCursorPosition(0, _headerLines);
        
        // Redraw table
        DrawProjectTable();
    }

    private int LogAreaStart => _headerLines + _projects.Count + 4;

    private void WriteLogLine(string message, ConsoleColor? color = null)
    {
        if (!_isInitialized)
        {
            if (color.HasValue) Console.ForegroundColor = color.Value;
            Console.WriteLine(message);
            if (color.HasValue) Console.ResetColor();
            return;
        }

        Console.SetCursorPosition(0, LogAreaStart + _logLineOffset);
        Console.Write(new string(' ', Console.WindowWidth - 1));
        Console.SetCursorPosition(0, LogAreaStart + _logLineOffset);

        if (color.HasValue) Console.ForegroundColor = color.Value;
        Console.WriteLine(message);
        if (color.HasValue) Console.ResetColor();

        _logLineOffset++;
    }

    public void LogInfo(string message) => WriteLogLine($"INFO: {message}");

    public void LogWarning(string message) => WriteLogLine($"WARNING: {message}", ConsoleColor.Yellow);

    public void LogError(string message)
    {
        _errors.Add(message);
        WriteLogLine($"ERROR: {message}", ConsoleColor.Red);
    }

    public void LogSuccess(string message) => WriteLogLine($"SUCCESS: {message}", ConsoleColor.Green);

    public void Complete()
    {
        if (!_isInitialized) return;

        // Move cursor below all accumulated log lines
        Console.SetCursorPosition(0, LogAreaStart + _logLineOffset + 1);
        
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine(new string('═', 95));
        Console.WriteLine("Final Summary:");
        Console.WriteLine(new string('═', 95));
        Console.ResetColor();

        var successful = _projects.Count(p => GetOverallStatus(p) == Status.Success);
        var failed = _projects.Count(p => GetOverallStatus(p) == Status.Failed);
        var warnings = _projects.Count(p => GetOverallStatus(p) == Status.Warning);

        if (successful > 0)
        {
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"Successful: {successful} project(s)");
            Console.ResetColor();
        }

        if (warnings > 0)
        {
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine($"Warnings: {warnings} project(s)");
            Console.ResetColor();
        }

        if (failed > 0)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine($"Failed: {failed} project(s)");
            Console.ResetColor();
        }

        if (_errors.Count > 0)
        {
            Console.WriteLine();
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("Errors:");
            Console.ResetColor();

            foreach (string error in _errors)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"  - {error}");
                Console.ResetColor();
            }
        }

        Console.WriteLine();
    }
}
