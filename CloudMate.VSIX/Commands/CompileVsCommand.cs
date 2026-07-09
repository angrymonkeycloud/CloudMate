using System;
using System.IO;
using System.Threading.Tasks;
using System.ComponentModel.Design;
using Microsoft.VisualStudio.Shell;

namespace AngryMonkey.CloudMate.VisualStudio.Commands;

/// <summary>Adds the selected file to .mateconfig.json as a compile entry.</summary>
internal sealed class CompileVsCommand : VsCommandBase
{
    private static readonly Guid CmdSetGuid = new("B2C3D4E5-F6A7-8901-BCDE-F12345678901");
    private const int CmdId = 0x0101;

    private CompileVsCommand(AsyncPackage package) : base(package) { }

    public static async Task InitializeAsync(AsyncPackage package)
    {
        await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync(package.DisposalToken);

        var instance = new CompileVsCommand(package);
        var svc = GetCommandService(package);
        var cmd = new OleMenuCommand(instance.Execute, new CommandID(CmdSetGuid, CmdId));
        cmd.BeforeQueryStatus += instance.QueryStatus;
        svc.AddCommand(cmd);
    }

    /// <summary>Compile applies to any file except the config file itself.</summary>
    private void QueryStatus(object sender, EventArgs e)
    {
        ThreadHelper.ThrowIfNotOnUIThread();

        if (sender is not OleMenuCommand cmd)
            return;

        string? selectedPath = GetSelectedPath();
        cmd.Visible = selectedPath is not null
            && File.Exists(selectedPath)
            && !string.Equals(Path.GetFileName(selectedPath), ConfigFileName, StringComparison.OrdinalIgnoreCase);
    }

    private void Execute(object sender, EventArgs e)
    {
        ThreadHelper.ThrowIfNotOnUIThread();

        string? selectedPath = GetSelectedPath();

        if (string.IsNullOrEmpty(selectedPath) || !File.Exists(selectedPath))
        {
            Log("[CloudMate] Compile: please select a file in Solution Explorer.");
            return;
        }

        string? projectRoot = ConfigWriter.FindProjectRoot(selectedPath!);
        if (projectRoot is null)
        {
            Log($"[CloudMate] Compile: could not find a .csproj for '{Path.GetFileName(selectedPath)}'.");
            return;
        }

        ConfigWriter.Result result = ConfigWriter.AddCompileFile(projectRoot, selectedPath!);
        Log(result.Added
            ? $"[compile] {result.Input} -> {result.Output}  (added to {Path.GetFileName(result.ConfigPath)})"
            : $"[compile] {result.Message}");

        // Always build after touching the config so the output (e.g. .css) is produced
        // immediately, whether the entry was newly added or already present.
        Log($"> mate  [{projectRoot}]");
        RunBuild(projectRoot, new string[0]);
    }
}
