using System;
using System.Threading.Tasks;
using System.ComponentModel.Design;
using Microsoft.VisualStudio.Shell;

namespace AngryMonkey.CloudMate.VisualStudio.Commands;

/// <summary>
/// Forces a full re-compression of all images in the selected folder, overwriting any
/// existing outputs. Visible ONLY when a Folder is already configured for compression.
/// </summary>
internal sealed class RecompressFolderVsCommand : VsCommandBase
{
    private static readonly Guid CmdSetGuid = new("B2C3D4E5-F6A7-8901-BCDE-F12345678901");
    private const int CmdId = 0x0108;

    private RecompressFolderVsCommand(AsyncPackage package) : base(package) { }

    public static async Task InitializeAsync(AsyncPackage package)
    {
        await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync(package.DisposalToken);
        var instance = new RecompressFolderVsCommand(package);
        var svc = GetCommandService(package);
        var cmd = new OleMenuCommand(instance.Execute, new CommandID(CmdSetGuid, CmdId));
        cmd.BeforeQueryStatus += instance.QueryStatus;
        svc.AddCommand(cmd);
    }

    private void QueryStatus(object sender, EventArgs e)
    {
        ThreadHelper.ThrowIfNotOnUIThread();
        if (sender is not OleMenuCommand cmd) return;

        // Show only when the folder is already configured for compression
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
            Log("[CloudMate] Recompress: select a configured folder in Solution Explorer.");
            return;
        }

        string? path = GetSelectedPath();
        string folderPath = (path ?? "").TrimEnd('\\', '/');

        string? root = ConfigWriter.FindProjectRoot(folderPath);
        if (root is null)
        {
            Log("[CloudMate] Recompress: could not find a .csproj for the selected folder.");
            return;
        }

        string relativeFolder = ConfigWriter.ToRelative(root, folderPath);
        CloudMatePackage.OutputLine(Package, $"> mate --recompress  (images: {relativeFolder})");

        RunBuild(root, ["--recompress"]);
        EnsureAlwaysWatching(root);
    }
}
