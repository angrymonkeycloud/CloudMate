using System;
using System.IO;
using System.Threading.Tasks;
using System.ComponentModel.Design;
using Microsoft.VisualStudio.Shell;

namespace AngryMonkey.CloudMate.VisualStudio.Commands;

/// <summary>Starts or stops <c>mate --watch</c> in the project root of the selected item.</summary>
internal sealed class WatchVsCommand : VsCommandBase
{
    private static readonly Guid CmdSetGuid = new("B2C3D4E5-F6A7-8901-BCDE-F12345678901");
    private const int CmdId = 0x0105;

    private WatchVsCommand(AsyncPackage package) : base(package) { }

    public static async Task InitializeAsync(AsyncPackage package)
    {
        await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync(package.DisposalToken);

        var instance = new WatchVsCommand(package);
        var svc = GetCommandService(package);
        var cmd = new OleMenuCommand(instance.Execute, new CommandID(CmdSetGuid, CmdId));
        cmd.BeforeQueryStatus += instance.QueryStatus;
        svc.AddCommand(cmd);
    }

    private void QueryStatus(object sender, EventArgs e)
    {
        ThreadHelper.ThrowIfNotOnUIThread();

        if (sender is not OleMenuCommand cmd)
            return;

        // Offered on the .mateconfig.json file; also stays visible while watching so the
        // running watch can always be stopped. Toggles label based on watch state.
        cmd.Visible = IsConfigFileSelected() || MateRunner.IsWatching;
        cmd.Text = MateRunner.IsWatching ? "Stop Watch" : "Watch";
    }

    private void Execute(object sender, EventArgs e)
    {
        ThreadHelper.ThrowIfNotOnUIThread();

        if (MateRunner.IsWatching)
        {
            MateRunner.StopWatch();
            Log("[CloudMate] Watch stopped.");
            return;
        }

        string? selectedPath = GetSelectedPath();
        string? workingDir = selectedPath is not null ? ConfigWriter.FindProjectRoot(selectedPath) : null;

        if (workingDir is null)
        {
            Log("[CloudMate] Watch: please select a .mateconfig.json inside a project.");
            return;
        }

        Log($"> mate --watch  [{workingDir}]");
        try
        {
            MateRunner.StartWatch(
                workingDir,
                line => CloudMatePackage.OutputLine(Package, line),
                line => CloudMatePackage.OutputLine(Package, line));
        }
        catch (FileNotFoundException ex)
        {
            Log($"[CloudMate] {ex.Message}");
        }
    }
}
