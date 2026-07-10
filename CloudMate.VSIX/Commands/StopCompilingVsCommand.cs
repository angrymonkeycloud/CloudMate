using System;
using System.ComponentModel.Design;
using System.IO;
using System.Threading.Tasks;
using Microsoft.VisualStudio.Shell;

namespace AngryMonkey.CloudMate.VisualStudio.Commands;

/// <summary>Removes the selected file from .mateconfig.json compile entries.</summary>
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

        if (sender is not OleMenuCommand cmd)
            return;

        string? selectedPath = GetSelectedPath();
        if (!IsCompileEligibleFile(selectedPath))
        {
            cmd.Visible = false;
            return;
        }

        string? projectRoot = ConfigWriter.FindProjectRoot(selectedPath!);
        cmd.Visible = projectRoot is not null && ConfigWriter.HasCompileFile(projectRoot, selectedPath!);
    }

    private void Execute(object sender, EventArgs e)
    {
        ThreadHelper.ThrowIfNotOnUIThread();

        string? selectedPath = GetSelectedPath();
        if (!IsCompileEligibleFile(selectedPath))
        {
            Log("[CloudMate] Stop Compiling: select a configured static file.");
            return;
        }

        string? projectRoot = ConfigWriter.FindProjectRoot(selectedPath!);
        if (projectRoot is null)
        {
            Log($"[CloudMate] Stop Compiling: could not find a .csproj for '{Path.GetFileName(selectedPath)}'.");
            return;
        }

        ConfigWriter.Result result = ConfigWriter.RemoveCompileFile(projectRoot, selectedPath!);
        Log(result.Added
            ? $"[compile] stopped: {result.Input} ({result.Message})"
            : $"[compile] {result.Message}");

        if (result.Added)
        {
            Log($"> mate  [{projectRoot}]");
            RunBuild(projectRoot, new string[0]);
        }

        EnsureAlwaysWatching(projectRoot);
    }
}
