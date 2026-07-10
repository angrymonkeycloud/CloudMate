using System;
using System.IO;
using System.Threading.Tasks;
using System.ComponentModel.Design;
using EnvDTE;
using Microsoft.VisualStudio.Shell;

namespace AngryMonkey.CloudMate.VisualStudio.Commands;

/// <summary>
/// Adds the selected file to .mateconfig.json as a compile entry.
/// Visible only for CompileFile selections (non-image, non-config files).
/// Text is "Compile" when not yet configured, "Recompile" when already in config.
/// </summary>
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

    private void QueryStatus(object sender, EventArgs e)
    {
        ThreadHelper.ThrowIfNotOnUIThread();
        if (sender is not OleMenuCommand cmd) return;

        // Only show for ordinary compile-eligible files
        if (GetSelectionKind() != SelectionKind.CompileFile)
        {
            cmd.Visible = false;
            return;
        }

        cmd.Visible = true;
        string? path = GetSelectedPath();
        string? root = path is not null ? ConfigWriter.FindProjectRoot(path) : null;
        cmd.Text = (root is not null && ConfigWriter.HasCompileFile(root, path!)) ? "Recompile" : "Compile";
    }

    private void Execute(object sender, EventArgs e)
    {
        ThreadHelper.ThrowIfNotOnUIThread();

        if (GetSelectionKind() != SelectionKind.CompileFile)
        {
            Log("[CloudMate] Compile: select a supported static file (not config / image / folder).");
            return;
        }

        string? path = GetSelectedPath();
        string? root = path is not null ? ConfigWriter.FindProjectRoot(path) : null;
        if (root is null)
        {
            Log($"[CloudMate] Compile: could not find a .csproj for '{Path.GetFileName(path)}'.");
            return;
        }

        if (!ConfigWriter.HasCompileFile(root, path!))
        {
            ConfigWriter.Result r = ConfigWriter.AddCompileFile(root, path!);
            Log(r.Added
                ? $"[compile] {r.Input} -> {r.Output}  (added to {Path.GetFileName(r.ConfigPath)})"
                : $"[compile] {r.Message}");

            // Always enforce Build Action = None / Do not copy on the config item.
            EnsureConfigItemProperties(root);
        }
        else
        {
            Log($"[recompile] {Path.GetFileName(path)} already configured – running one-time rebuild.");
        }

        Log($"> mate  [{root}]");
        RunBuild(root, new string[0]);
        EnsureAlwaysWatching(root);
    }
}