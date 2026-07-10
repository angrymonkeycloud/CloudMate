using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using EnvDTE;
using Microsoft.VisualStudio.Shell;

namespace AngryMonkey.CloudMate.VisualStudio.Commands;

/// <summary>
/// Shared base for all CloudMate VSSDK commands. Provides OleMenuCommand registration,
/// output-pane logging, and Solution Explorer selection helpers.
/// </summary>
internal abstract class VsCommandBase
{
    protected readonly AsyncPackage Package;

    protected VsCommandBase(AsyncPackage package)
    {
        Package = package;
    }

    // --- Registration ---------------------------------------------------------

    protected static OleMenuCommandService GetCommandService(AsyncPackage package)
    {
        ThreadHelper.ThrowIfNotOnUIThread();
        return (OleMenuCommandService)((IServiceProvider)package).GetService(typeof(System.ComponentModel.Design.IMenuCommandService))
            ?? throw new InvalidOperationException("OleMenuCommandService not available.");
    }

    // --- Output ---------------------------------------------------------------

    protected void Log(string message)
    {
        ThreadHelper.ThrowIfNotOnUIThread();
        CloudMatePackage.OutputLine(Package, message);
    }

    // --- Selection via DTE ---------------------------------------------------

    /// <summary>The CloudMate configuration file name.</summary>
    protected const string ConfigFileName = ConfigWriter.ConfigFileName;

    /// <summary>
    /// Static web-asset extensions CloudMate can compile / bundle.
    /// ONLY these file types show the Compile / Recompile / Stop Compiling commands.
    /// Anything else (e.g. .cs, .json, .xml, .txt, images) shows no menu.
    /// </summary>
    private static readonly HashSet<string> CompileExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".ts", ".js", ".css", ".less", ".scss", ".sass"
    };

    /// <summary>
    /// What kind of item is currently selected in Solution Explorer.
    /// Determined via DTE.SelectedItems so we always get real filesystem paths.
    /// </summary>
    protected enum SelectionKind { None, ConfigFile, CompileFile, Folder }

    /// <summary>
    /// Returns the real on-disk path of the single selected Solution Explorer item,
    /// or null when nothing useful is selected. Uses DTE.SelectedItems.
    /// </summary>
    protected static string? GetSelectedPath()
    {
        ThreadHelper.ThrowIfNotOnUIThread();

        if (Microsoft.VisualStudio.Shell.Package.GetGlobalService(typeof(Microsoft.VisualStudio.Shell.Interop.SDTE)) is not DTE dte)
            return null;

        SelectedItems items = dte.SelectedItems;
        if (items == null || items.Count != 1)
            return null;

        SelectedItem item = items.Item(1);

        // ProjectItem covers files and folders inside a project
        if (item.ProjectItem is ProjectItem pi)
        {
            try { return pi.FileNames[1]; }
            catch { return null; }
        }

        // Project node (.csproj row)
        if (item.Project is Project proj)
        {
            try { return proj.FullName; }
            catch { return null; }
        }

        return null;
    }

    /// <summary>
    /// Classifies the selected item. All QueryStatus methods call this one method.
    /// </summary>
    protected static SelectionKind GetSelectionKind()
    {
        ThreadHelper.ThrowIfNotOnUIThread();

        string? path = GetSelectedPath();
        if (string.IsNullOrEmpty(path))
            return SelectionKind.None;

        // DTE appends a backslash to folder paths
        if (path!.EndsWith("\\", StringComparison.Ordinal) || path.EndsWith("/", StringComparison.Ordinal))
            return SelectionKind.Folder;

        // Real directory that is not also a file
        if (Directory.Exists(path) && !File.Exists(path))
            return SelectionKind.Folder;

        if (!File.Exists(path))
            return SelectionKind.None;

        if (string.Equals(Path.GetFileName(path), ConfigFileName, StringComparison.OrdinalIgnoreCase))
            return SelectionKind.ConfigFile;

        // Only whitelisted web-asset extensions are compile-eligible.
        // Everything else (.cs, .json, images, etc.) shows no CloudMate menu.
        if (CompileExtensions.Contains(Path.GetExtension(path)))
            return SelectionKind.CompileFile;

        return SelectionKind.None;
    }

    // --- Config project-item properties ---------------------------------------

    /// <summary>
    /// Ensures the mateconfig.json project item has Build Action = None and
    /// CopyToOutputDirectory = Do not copy, so it is never built or deployed
    /// with the application output. Safe to call repeatedly; best-effort.
    /// </summary>
    protected static void EnsureConfigItemProperties(string projectRoot)
    {
        ThreadHelper.ThrowIfNotOnUIThread();

        try
        {
            if (Microsoft.VisualStudio.Shell.Package.GetGlobalService(typeof(Microsoft.VisualStudio.Shell.Interop.SDTE)) is not DTE dte)
                return;

            string configPath = Path.Combine(projectRoot, ConfigWriter.ConfigFileName);

            foreach (Project project in dte.Solution.Projects)
            {
                ProjectItem? item = FindItemByPath(project.ProjectItems, configPath);
                if (item is null)
                    continue;

                TrySetProperty(item, "ItemType", "None");            // Build Action: None
                TrySetProperty(item, "CopyToOutputDirectory", 0);    // Do not copy
                return;
            }
        }
        catch { /* best-effort: never break the user command over project-item metadata */ }
    }

    private static ProjectItem? FindItemByPath(ProjectItems? items, string fullPath)
    {
        ThreadHelper.ThrowIfNotOnUIThread();

        if (items is null)
            return null;

        foreach (ProjectItem item in items)
        {
            string? itemPath = null;
            try { itemPath = item.FileNames[1]; } catch { }

            if (itemPath is not null &&
                string.Equals(itemPath.TrimEnd('\\', '/'), fullPath.TrimEnd('\\', '/'), StringComparison.OrdinalIgnoreCase))
                return item;

            ProjectItem? nested = FindItemByPath(item.ProjectItems, fullPath);
            if (nested is not null)
                return nested;
        }

        return null;
    }

    private static void TrySetProperty(ProjectItem item, string propertyName, object value)
    {
        ThreadHelper.ThrowIfNotOnUIThread();
        try { item.Properties.Item(propertyName).Value = value; }
        catch { /* property not present on this project type */ }
    }

    // --- Build / Watch --------------------------------------------------------

    protected void RunBuild(string workingDirectory, string[] args)
    {
        AsyncPackage package = Package;
        _ = Task.Run(() =>
        {
            try
            {
                MateRunner.Run(
                    workingDirectory,
                    args,
                    line => CloudMatePackage.OutputLine(package, line),
                    line => CloudMatePackage.OutputLine(package, line));
            }
            catch (FileNotFoundException ex)
            {
                CloudMatePackage.OutputLine(package, $"[CloudMate] {ex.Message}");
            }
        });
    }

    protected void EnsureAlwaysWatching(string workingDirectory)
    {
        // Only start watch if the config file actually exists —
        // never watch a directory where mateconfig.json hasn't been created yet.
        if (!File.Exists(Path.Combine(workingDirectory, ConfigWriter.ConfigFileName)))
            return;

        AsyncPackage package = Package;
        try
        {
            MateRunner.EnsureWatch(
                workingDirectory,
                line => CloudMatePackage.OutputLine(package, line),
                line => CloudMatePackage.OutputLine(package, line));
        }
        catch (FileNotFoundException ex)
        {
            CloudMatePackage.OutputLine(package, $"[CloudMate] {ex.Message}");
        }
    }
}