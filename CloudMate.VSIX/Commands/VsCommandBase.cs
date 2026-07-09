using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Interop;

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

    // ─── Registration ─────────────────────────────────────────────────────────

    protected static OleMenuCommandService GetCommandService(AsyncPackage package)
    {
        ThreadHelper.ThrowIfNotOnUIThread();
        return (OleMenuCommandService)((IServiceProvider)package).GetService(typeof(System.ComponentModel.Design.IMenuCommandService))
            ?? throw new InvalidOperationException("OleMenuCommandService not available.");
    }

    // ─── Output ───────────────────────────────────────────────────────────────

    protected void Log(string message)
    {
        ThreadHelper.ThrowIfNotOnUIThread();
        CloudMatePackage.OutputLine(Package, message);
    }

    // ─── Selection ────────────────────────────────────────────────────────────

    /// <summary>
    /// Returns the path of the currently selected item in Solution Explorer,
    /// or <see langword="null"/> when nothing is selected.
    /// Works for files, folders, and project nodes.
    /// </summary>
    protected static string? GetSelectedPath()
    {
        ThreadHelper.ThrowIfNotOnUIThread();

        if (Microsoft.VisualStudio.Shell.Package.GetGlobalService(typeof(SVsShellMonitorSelection))
            is not IVsMonitorSelection monSel)
            return null;

        monSel.GetCurrentSelection(out IntPtr ppHier, out uint itemid, out _, out _);

        if (ppHier == IntPtr.Zero)
            return null;

        try
        {
            if (System.Runtime.InteropServices.Marshal.GetObjectForIUnknown(ppHier) is not IVsHierarchy hierarchy)
                return null;

            hierarchy.GetCanonicalName(itemid, out string? canonicalName);
            return canonicalName;
        }
        finally
        {
            System.Runtime.InteropServices.Marshal.Release(ppHier);
        }
    }

    // ─── Config-file gating ────────────────────────────────────────────────────────────

    /// <summary>The CloudMate configuration file name commands are gated against.</summary>
    protected const string ConfigFileName = ".mateconfig.json";

    /// <summary>
    /// Returns <see langword="true"/> when the currently selected Solution Explorer item
    /// is a <c>.mateconfig.json</c> file.
    /// </summary>
    protected static bool IsConfigFileSelected()
    {
        ThreadHelper.ThrowIfNotOnUIThread();

        string? path = GetSelectedPath();
        return path is not null
            && string.Equals(Path.GetFileName(path), ConfigFileName, StringComparison.OrdinalIgnoreCase);
    }

    // ─── Build ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Runs <c>mate [args]</c> in <paramref name="workingDirectory"/> on a background thread,
    /// streaming stdout/stderr to the CloudMate output pane. Never throws to the caller;
    /// a missing CLI is reported to the output pane.
    /// </summary>
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
}
