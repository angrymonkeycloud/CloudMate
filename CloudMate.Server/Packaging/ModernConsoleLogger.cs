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

    public void Initialize(IEnumerable<CloudPackProject> projects)
    {
        _projects.Clear();
        _errors.Clear();
        _logLineOffset = 0;
        foreach (var project in projects)
        {
            _projects.Add(new ProjectStatus { Name = project.Name });
        }
        
        Console.Clear();
        DrawHeader();
        DrawProjectTable();
        _isInitialized = true;
    }

    private void DrawHeader()
    {
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("╔══════════════════════════════════════════════════════════════════════════╗");
        Console.WriteLine("║                            CloudMate Package Manager                     ║");
        Console.WriteLine("╚══════════════════════════════════════════════════════════════════════════╝");
        Console.ResetColor();
        Console.WriteLine();
        _headerLines = 4;
    }

    private void DrawProjectTable()
    {
        if (!_projects.Any()) return;

        // Header
        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.WriteLine("Project".PadRight(30) + " │ " + "Rebuild".PadRight(12) + " │ " + "Pack".PadRight(12) + " │ " + "Publish".PadRight(12) + " │ " + "Status".PadRight(20));
        Console.WriteLine(new string('─', 95));
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
        Console.Write(project.Name.PadRight(30) + " │ ");
        
        WriteStatusWithColor(project.RebuildStatus, 12);
        Console.Write(" │ ");
        
        WriteStatusWithColor(project.PackStatus, 12);
        Console.Write(" │ ");
        
        WriteStatusWithColor(project.PublishStatus, 12);
        Console.Write(" │ ");
        
        string statusText = project.CurrentOperation;
        if (project.AttemptCount > 1)
        {
            statusText += $" ({project.AttemptCount}/{project.MaxAttempts})";
        }
        
        Console.ForegroundColor = GetStatusColor(GetOverallStatus(project));
        Console.Write(statusText.PadRight(20));
        Console.ResetColor();
        Console.WriteLine();
    }

    private void WriteStatusWithColor(Status status, int width)
    {
        Console.ForegroundColor = GetStatusColor(status);
        string statusText = GetStatusSymbol(status) + " " + status.ToString();
        Console.Write(statusText.PadRight(width));
        Console.ResetColor();
    }

    private static ConsoleColor GetStatusColor(Status status) => status switch
    {
        Status.Pending => ConsoleColor.Gray,
        Status.InProgress => ConsoleColor.Yellow,
        Status.Success => ConsoleColor.Green,
        Status.Failed => ConsoleColor.Red,
        Status.Skipped => ConsoleColor.DarkYellow,
        Status.Warning => ConsoleColor.Magenta,
        _ => ConsoleColor.White
    };

    private static string GetStatusSymbol(Status status) => status switch
    {
        Status.Pending => "⏳",
        Status.InProgress => "🔄",
        Status.Success => "✅",
        Status.Failed => "❌",
        Status.Skipped => "⏭️",
        Status.Warning => "⚠️",
        _ => "❓"
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

    public void LogHeading(string heading)
    {
        WriteLogLine($"\n📦 {heading}", ConsoleColor.Cyan);
        _logLineOffset++; // account for the \n
    }

    public void LogInfo(string message) => WriteLogLine($"ℹ️  {message}");

    public void LogWarning(string message) => WriteLogLine($"⚠️  {message}", ConsoleColor.Yellow);

    public void LogError(string message)
    {
        _errors.Add(message);
        WriteLogLine($"❌ {message}", ConsoleColor.Red);
    }

    public void LogSuccess(string message) => WriteLogLine($"✅ {message}", ConsoleColor.Green);

    public void Complete()
    {
        if (!_isInitialized) return;

        // Move cursor below all accumulated log lines
        Console.SetCursorPosition(0, LogAreaStart + _logLineOffset + 1);
        
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine(new string('═', 95));
        Console.WriteLine("📋 Final Summary:");
        Console.WriteLine(new string('═', 95));
        Console.ResetColor();

        var successful = _projects.Count(p => GetOverallStatus(p) == Status.Success);
        var failed = _projects.Count(p => GetOverallStatus(p) == Status.Failed);
        var warnings = _projects.Count(p => GetOverallStatus(p) == Status.Warning);

        if (successful > 0)
        {
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"✅ {successful} project(s) completed successfully");
            Console.ResetColor();
        }

        if (warnings > 0)
        {
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine($"⚠️  {warnings} project(s) completed with warnings");
            Console.ResetColor();
        }

        if (failed > 0)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine($"❌ {failed} project(s) failed");
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