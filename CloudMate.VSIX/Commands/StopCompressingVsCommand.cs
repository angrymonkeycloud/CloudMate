using System;
using System.IO;
using System.Threading.Tasks;
using System.ComponentModel.Design;
using Microsoft.VisualStudio.Shell;

namespace AngryMonkey.CloudMate.VisualStudio.Commands;

/// <summary>
/// Removes the selected folder from .mateconfig.json image-compression entries.
/// Visible only when a Folder is selected AND it is already in the config.
/// </summary>
internal sealed class StopCompressingVsCommand : VsCommandBase
{
    private static readonly Guid CmdSetGuid = new("B2C3D4E5-F6A7-8901-BCDE-F12345678901");
    private const int CmdId = 0x0107;

    private StopCompressingVsCommand(AsyncPackage package) : base(package) { }

    public static async Task InitializeAsync(AsyncPackage package)
    {
        await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync(package.DisposalToken);
        var instance = new StopCompressingVsCommand(package);
        var svc = GetCommandService(package);
        var cmd = new OleMenuCommand(instance.Execute, new CommandID(CmdSetGuid, CmdId));
        cmd.BeforeQueryStatus += instance.QueryStatus;
        svc.AddCommand(cmd);
    }

    private void QueryStatus(object sender, EventArgs e)
    {
        ThreadHelper.ThrowIfNotOnUIThread();
        if (sender is not OleMenuCommand cmd) return;

        // Only show for folders that are already configured for compression
        if (GetSelectionKind() != SelectionKind.Folder)
        {
            cmd.Visible = false;
            return;
        }

        try
        {
            string? path = GetSelectedPath();
            string folderPath = (path ?? "").TrimEnd('\\', '/');
            string? root = !string.IsNullOrEmpty(folderPath) ? ConfigWriter.FindProjectRoot(folderPath) : null;
            cmd.Visible = root is not null && ConfigWriter.HasCompressFolder(root, folderPath);
        }
        catch
        {
            cmd.Visible = false;
        }
    }

    private void Execute(object sender, EventArgs e)
    {
        ThreadHelper.ThrowIfNotOnUIThread();

        if (GetSelectionKind() != SelectionKind.Folder)
        {
            Log("[CloudMate] Stop Compressing: select a configured folder.");
            return;
        }

        string? path = GetSelectedPath();
        string folderPath = (path ?? "").TrimEnd('\\', '/');
        string? root = ConfigWriter.FindProjectRoot(folderPath);
        if (root is null)
        {
            Log("[CloudMate] Stop Compressing: could not find a .csproj for the selected folder.");
            return;
        }

        _ = Task.Run(() =>
        {
            ConfigWriter.Result r = ConfigWriter.RemoveCompressFolder(root, folderPath);
            CloudMatePackage.OutputLine(Package, r.Added
                ? $"[compress] stopped: {r.Input} ({r.Message})"
                : $"[compress] {r.Message}");

            if (r.Added)
            {
                CloudMatePackage.OutputLine(Package, $"> mate  [{root}]");
                RunBuild(root, Array.Empty<string>());
            }

            EnsureAlwaysWatching(root);
        });
    }
}
