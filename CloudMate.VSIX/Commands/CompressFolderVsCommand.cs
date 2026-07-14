using System;
using System.IO;
using System.Threading.Tasks;
using System.ComponentModel.Design;
using EnvDTE;
using Microsoft.VisualStudio.Shell;

namespace AngryMonkey.CloudMate.VisualStudio.Commands;

/// <summary>
/// Adds the selected folder to .mateconfig.json as an image-compression entry.
/// Visible ONLY when a Folder is selected.
/// </summary>
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
        var cmd = new OleMenuCommand(instance.Execute, new CommandID(CmdSetGuid, CmdId));
        cmd.BeforeQueryStatus += instance.QueryStatus;
        svc.AddCommand(cmd);
    }

    private void QueryStatus(object sender, EventArgs e)
    {
        ThreadHelper.ThrowIfNotOnUIThread();
        if (sender is not OleMenuCommand cmd) return;

        // Show only for folders that are NOT yet configured — hide once added
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
            cmd.Visible = root is null || !ConfigWriter.HasCompressFolder(root, folderPath);
        }
        catch
        {
            cmd.Visible = true;
        }
    }

    private void Execute(object sender, EventArgs e)
    {
        ThreadHelper.ThrowIfNotOnUIThread();

        if (GetSelectionKind() != SelectionKind.Folder)
        {
            Log("[CloudMate] Compress: select a folder in Solution Explorer.");
            return;
        }

        string? path = GetSelectedPath();
        string folderPath = (path ?? "").TrimEnd('\\', '/');

        string? root = ConfigWriter.FindProjectRoot(folderPath);
        if (root is null)
        {
            Log("[CloudMate] Compress: could not find a .csproj for the selected folder.");
            return;
        }

        _ = Task.Run(() =>
        {
            ConfigWriter.Result r = ConfigWriter.AddCompressFolder(root, folderPath);
            CloudMatePackage.OutputLine(Package, r.Added
                ? $"[compress] {r.Input} -> {r.Output}  (added to {Path.GetFileName(r.ConfigPath)})"
                : $"[compress] {r.Message}");

            if (r.Added)
            {
                ThreadHelper.JoinableTaskFactory.Run(async delegate
                {
                    await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();
                    EnsureConfigItemProperties(root);
                });
            }

            CloudMatePackage.OutputLine(Package, $"> mate  [{root}]");
            RunBuild(root, Array.Empty<string>());
            EnsureAlwaysWatching(root);
        });
    }
}