using System;
using System.IO;
using System.Threading.Tasks;
using System.ComponentModel.Design;
using Microsoft.VisualStudio.Shell;

namespace AngryMonkey.CloudMate.VisualStudio.Commands;

/// <summary>
/// Removes entries (and individual inputs) from <c>mateconfig.json</c> whose non-glob
/// source paths no longer exist on disk.
/// Visible ONLY when the mateconfig.json file is selected.
/// </summary>
internal sealed class CleanConfigVsCommand : VsCommandBase
{
    private static readonly Guid CmdSetGuid = new("B2C3D4E5-F6A7-8901-BCDE-F12345678901");
    private const int CmdId = 0x0104;

    private CleanConfigVsCommand(AsyncPackage package) : base(package) { }

    public static async Task InitializeAsync(AsyncPackage package)
    {
        await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync(package.DisposalToken);
        var instance = new CleanConfigVsCommand(package);
        var svc = GetCommandService(package);
        var cmd = new OleMenuCommand(instance.Execute, new CommandID(CmdSetGuid, CmdId));
        cmd.BeforeQueryStatus += instance.QueryStatus;
        svc.AddCommand(cmd);
    }

    private void QueryStatus(object sender, EventArgs e)
    {
        ThreadHelper.ThrowIfNotOnUIThread();
        if (sender is not OleMenuCommand cmd) return;

        cmd.Visible = GetSelectionKind() == SelectionKind.ConfigFile;
        cmd.Text = "Clean Config";
    }

    private void Execute(object sender, EventArgs e)
    {
        ThreadHelper.ThrowIfNotOnUIThread();

        if (GetSelectionKind() != SelectionKind.ConfigFile)
        {
            Log("[CloudMate] Clean Config: select a mateconfig.json file.");
            return;
        }

        string? path = GetSelectedPath();
        string? root = path is not null ? ConfigWriter.FindProjectRoot(path) : null;
        if (root is null || path is null)
        {
            Log("[CloudMate] Clean Config: could not find a project root for the selected config.");
            return;
        }

        Log($"> mate clean  [{root}]");

        ConfigWriter.CleanResult result = ConfigWriter.CleanConfig(path, root);

        if (result.EntriesRemoved == 0 && result.InputsRemoved == 0)
        {
            Log("  Nothing to clean — all input paths exist.");
            return;
        }

        if (result.EntriesRemoved > 0)
            Log($"  Removed {result.EntriesRemoved} entr{(result.EntriesRemoved == 1 ? "y" : "ies")} with missing input files.");

        if (result.InputsRemoved > 0)
            Log($"  Pruned {result.InputsRemoved} missing input path{(result.InputsRemoved == 1 ? "" : "s")} from array inputs.");
    }
}
