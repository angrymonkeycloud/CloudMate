using System;
using System.IO;
using System.Threading.Tasks;
using System.ComponentModel.Design;
using Microsoft.VisualStudio.Shell;

namespace AngryMonkey.CloudMate.VisualStudio.Commands;

/// <summary>
/// Scans the project for compilable source files (.ts, .less, .scss, .sass) and adds
/// any that are not yet configured in <c>mateconfig.json</c>.
/// Visible ONLY when the mateconfig.json file is selected.
/// </summary>
internal sealed class AutoConfigureVsCommand : VsCommandBase
{
    private static readonly Guid CmdSetGuid = new("B2C3D4E5-F6A7-8901-BCDE-F12345678901");
    private const int CmdId = 0x0105;

    private AutoConfigureVsCommand(AsyncPackage package) : base(package) { }

    public static async Task InitializeAsync(AsyncPackage package)
    {
        await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync(package.DisposalToken);
        var instance = new AutoConfigureVsCommand(package);
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
        cmd.Text = "Auto-Configure Files";
    }

    private void Execute(object sender, EventArgs e)
    {
        ThreadHelper.ThrowIfNotOnUIThread();

        if (GetSelectionKind() != SelectionKind.ConfigFile)
        {
            Log("[CloudMate] Auto-Configure Files: select a mateconfig.json file.");
            return;
        }

        string? path = GetSelectedPath();
        string? root = path is not null ? ConfigWriter.FindProjectRoot(path) : null;
        if (root is null)
        {
            Log("[CloudMate] Auto-Configure Files: could not find a project root for the selected config.");
            return;
        }

        Log($"> mate auto-configure  [{root}]");

        ConfigWriter.AutoConfigureResult result = ConfigWriter.AutoConfigureFiles(root);

        if (result.Added == 0 && result.AlreadyConfigured == 0)
        {
            Log("  No compilable source files found in the project.");
            return;
        }

        if (result.Added > 0)
            Log($"  Added {result.Added} file{(result.Added == 1 ? "" : "s")} to mateconfig.json.");

        if (result.AlreadyConfigured > 0)
            Log($"  {result.AlreadyConfigured} file{(result.AlreadyConfigured == 1 ? " was" : "s were")} already configured.");

        if (result.Added == 0)
            Log("  Nothing new to configure.");
    }
}
