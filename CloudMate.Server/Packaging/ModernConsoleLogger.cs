using System.Text;

namespace AngryMonkey.CloudMate;

internal class ModernConsoleLogger
{
    private readonly List<ProjectStatus> _projects = [];
    private int _headerLines = 0;
    private bool _isInitialized = false;
    
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

    public void LogHeading(string heading)
    {
        if (!_isInitialized)
        {
            Console.WriteLine();
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine($"📦 {heading}");
            Console.ResetColor();
            Console.WriteLine();
            return;
        }

        // Move cursor below the table
        Console.SetCursorPosition(0, _headerLines + _projects.Count + 4);
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine($"📦 {heading}");
        Console.ResetColor();
    }

    public void LogInfo(string message)
    {
        if (!_isInitialized)
        {
            Console.WriteLine($"ℹ️  {message}");
            return;
        }

        // Move cursor below the table
        Console.SetCursorPosition(0, _headerLines + _projects.Count + 5);
        Console.WriteLine($"ℹ️  {message}");
    }

    public void LogWarning(string message)
    {
        if (!_isInitialized)
        {
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine($"⚠️  {message}");
            Console.ResetColor();
            return;
        }

        // Move cursor below the table
        Console.SetCursorPosition(0, _headerLines + _projects.Count + 5);
        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.WriteLine($"⚠️  {message}");
        Console.ResetColor();
    }

    public void LogError(string message)
    {
        if (!_isInitialized)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine($"❌ {message}");
            Console.ResetColor();
            return;
        }

        // Move cursor below the table
        Console.SetCursorPosition(0, _headerLines + _projects.Count + 5);
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine($"❌ {message}");
        Console.ResetColor();
    }

    public void LogSuccess(string message)
    {
        if (!_isInitialized)
        {
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"✅ {message}");
            Console.ResetColor();
            return;
        }

        // Move cursor below the table
        Console.SetCursorPosition(0, _headerLines + _projects.Count + 5);
        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine($"✅ {message}");
        Console.ResetColor();
    }

    public void Complete()
    {
        if (!_isInitialized) return;

        // Move cursor below the table for final messages
        Console.SetCursorPosition(0, _headerLines + _projects.Count + 6);
        
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

        Console.WriteLine();
    }
}