using System;
using System.IO;
using System.Threading.Tasks;
using System.ComponentModel.Design;
using Microsoft.VisualStudio.Shell;

namespace AngryMonkey.CloudMate.VisualStudio.Commands;

/// <summary>Adds the selected folder to .mateconfig.json as an image-compression entry.</summary>
internal sealed class CompressFolderVsCommand : VsCommandBase
{
    private static readonly Guid CmdSetGuid = new("B2C3D4E5-F6A7-8901-BCDE-F12345678901");
    private const int CmdId = 0x0102;

    private CompressFolderVsCommand(AsyncPackage package) : base(package) { }

    public static async Task InitializeAsync(AsyncPackage package)
    {
        await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync(package.DisposalToken);

        var instance = new CompressFolderVsCommand(package);
        var svc = GetCommandService(package);
        svc.AddCommand(new OleMenuCommand(instance.Execute, new CommandID(CmdSetGuid, CmdId)));
    }

    private void Execute(object sender, EventArgs e)
    {
        ThreadHelper.ThrowIfNotOnUIThread();

        string? selectedPath = GetSelectedPath();

        if (string.IsNullOrEmpty(selectedPath) || !Directory.Exists(selectedPath))
        {
            Log("[CloudMate] Compress Images: please select a folder in Solution Explorer.");
            return;
        }

        string? projectRoot = ConfigWriter.FindProjectRoot(selectedPath!);
        if (projectRoot is null)
        {
            Log($"[CloudMate] Compress Images: could not find a .csproj for the selected folder.");
            return;
        }

        ConfigWriter.Result result = ConfigWriter.AddCompressFolder(projectRoot, selectedPath!);
        Log(result.Added
            ? $"[compress] {result.Input} -> {result.Output}  (added to {Path.GetFileName(result.ConfigPath)})"
            : $"[compress] {result.Message}");

        // Always build after touching the config so compressed output is produced immediately.
        Log($"> mate  [{projectRoot}]");
        RunBuild(projectRoot, new string[0]);
    }
}
