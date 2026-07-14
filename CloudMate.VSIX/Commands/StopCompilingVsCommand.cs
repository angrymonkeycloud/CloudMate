using System;
using System.IO;
using System.Threading.Tasks;
using System.ComponentModel.Design;
using Microsoft.VisualStudio.Shell;

namespace AngryMonkey.CloudMate.VisualStudio.Commands;

/// <summary>
/// Removes the selected file from .mateconfig.json compile entries.
/// Visible only when a CompileFile is selected AND it is already in the config.
/// </summary>
internal sealed class StopCompilingVsCommand : VsCommandBase
{
    private static readonly Guid CmdSetGuid = new("B2C3D4E5-F6A7-8901-BCDE-F12345678901");
    private const int CmdId = 0x0106;

    private StopCompilingVsCommand(AsyncPackage package) : base(package) { }

    public static async Task InitializeAsync(AsyncPackage package)
    {
        await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync(package.DisposalToken);
        var instance = new StopCompilingVsCommand(package);
        var svc = GetCommandService(package);
        var cmd = new OleMenuCommand(instance.Execute, new CommandID(CmdSetGuid, CmdId));
        cmd.BeforeQueryStatus += instance.QueryStatus;
        svc.AddCommand(cmd);
    }

    private void QueryStatus(object sender, EventArgs e)
    {
        ThreadHelper.ThrowIfNotOnUIThread();
        if (sender is not OleMenuCommand cmd) return;

        // Only show for compile-eligible files that are already configured
        if (GetSelectionKind() != SelectionKind.CompileFile)
        {
            cmd.Visible = false;
            return;
        }

        try
        {
            string? path = GetSelectedPath();
            string? root = path is not null ? ConfigWriter.FindProjectRoot(path) : null;
            cmd.Visible = root is not null && ConfigWriter.HasCompileFile(root, path!);
        }
        catch
        {
            cmd.Visible = false;
        }
    }

    private void Execute(object sender, EventArgs e)
    {
        ThreadHelper.ThrowIfNotOnUIThread();

        if (GetSelectionKind() != SelectionKind.CompileFile)
        {
            Log("[CloudMate] Stop Compiling: select a configured static file.");
            return;
        }

        string? path = GetSelectedPath();
        string? root = path is not null ? ConfigWriter.FindProjectRoot(path) : null;
        if (root is null || path is null)
        {
            Log($"[CloudMate] Stop Compiling: could not find a .csproj for '{Path.GetFileName(path)}'.");
            return;
        }

        _ = Task.Run(() =>
        {
            ConfigWriter.Result r = ConfigWriter.RemoveCompileFile(root, path);
            CloudMatePackage.OutputLine(Package, r.Added
                ? $"[compile] stopped: {r.Input} ({r.Message})"
                : $"[compile] {r.Message}");

            if (r.Added)
            {
                CloudMatePackage.OutputLine(Package, $"> mate  [{root}]");
                RunBuild(root, Array.Empty<string>());
            }

            EnsureAlwaysWatching(root);
        });
    }
}