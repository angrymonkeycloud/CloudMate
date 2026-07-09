using System;
using System.IO;
using System.Threading.Tasks;
using System.ComponentModel.Design;
using Microsoft.VisualStudio.Shell;

namespace AngryMonkey.CloudMate.VisualStudio.Commands;

/// <summary>Runs <c>mate</c> (dev build) in the project root of the selected item.</summary>
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

    /// <summary>Build is only offered on the .mateconfig.json file.</summary>
    private void QueryStatus(object sender, EventArgs e)
    {
        ThreadHelper.ThrowIfNotOnUIThread();
        if (sender is OleMenuCommand cmd)
            cmd.Visible = IsConfigFileSelected();
    }

    private void Execute(object sender, EventArgs e)
    {
        ThreadHelper.ThrowIfNotOnUIThread();

        string? selectedPath = GetSelectedPath();
        string? workingDir = selectedPath is not null ? ConfigWriter.FindProjectRoot(selectedPath) : null;

        if (workingDir is null)
        {
            Log("[CloudMate] Build: please select a .mateconfig.json inside a project.");
            return;
        }

        Log($"> mate  [{workingDir}]");
        RunBuild(workingDir, new string[0]);
    }
}
