using System;
using System.IO;
using System.Threading.Tasks;
using System.ComponentModel.Design;
using Microsoft.VisualStudio.Shell;

namespace AngryMonkey.CloudMate.VisualStudio.Commands;

/// <summary>
/// Runs a one-time mate rebuild.
/// Visible ONLY when the mateconfig.json file is selected.
/// </summary>
internal sealed class BuildVsCommand : VsCommandBase
{
    private static readonly Guid CmdSetGuid = new("B2C3D4E5-F6A7-8901-BCDE-F12345678901");
    private const int CmdId = 0x0103;

    private BuildVsCommand(AsyncPackage package) : base(package) { }

    public static async Task InitializeAsync(AsyncPackage package)
    {
        await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync(package.DisposalToken);
        var instance = new BuildVsCommand(package);
        var svc = GetCommandService(package);
        var cmd = new OleMenuCommand(instance.Execute, new CommandID(CmdSetGuid, CmdId));
        cmd.BeforeQueryStatus += instance.QueryStatus;
        svc.AddCommand(cmd);
    }

    private void QueryStatus(object sender, EventArgs e)
    {
        ThreadHelper.ThrowIfNotOnUIThread();
        if (sender is not OleMenuCommand cmd) return;

        // Show only when mateconfig.json is selected
        cmd.Visible = GetSelectionKind() == SelectionKind.ConfigFile;
        cmd.Text = "Rebuild";
    }

    private void Execute(object sender, EventArgs e)
    {
        ThreadHelper.ThrowIfNotOnUIThread();

        if (GetSelectionKind() != SelectionKind.ConfigFile)
        {
            Log("[CloudMate] Rebuild: select a mateconfig.json file.");
            return;
        }

        string? path = GetSelectedPath();
        string? root = path is not null ? ConfigWriter.FindProjectRoot(path) : null;
        if (root is null)
        {
            Log("[CloudMate] Rebuild: could not find a project root for the selected config.");
            return;
        }

        Log($"> mate  [{root}]");
        RunBuild(root, new string[0]);
        EnsureAlwaysWatching(root);
    }
}