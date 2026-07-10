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

    /// <summary>
    /// Compile/Recompile appears only for compile-eligible files (never folders/config/images).
    /// Text changes dynamically:
    /// - Compile: file is not yet in .mateconfig.json
    /// - Recompile: file already exists in .mateconfig.json
    /// </summary>
    private void QueryStatus(object sender, EventArgs e)
    {
        ThreadHelper.ThrowIfNotOnUIThread();

        if (sender is not OleMenuCommand cmd)
            return;

        string? selectedPath = GetSelectedPath();
        cmd.Visible = IsCompileEligibleFile(selectedPath);

        if (!cmd.Visible || string.IsNullOrEmpty(selectedPath))
            return;

        string? projectRoot = ConfigWriter.FindProjectRoot(selectedPath!);
        bool inConfig = projectRoot is not null && ConfigWriter.HasCompileFile(projectRoot, selectedPath!);
        cmd.Text = inConfig ? "Recompile" : "Compile";
    }

    private void Execute(object sender, EventArgs e)
    {
        ThreadHelper.ThrowIfNotOnUIThread();

        string? selectedPath = GetSelectedPath();

        if (!IsCompileEligibleFile(selectedPath))
        {
            Log("[CloudMate] Compile: please select a supported static file (not config/image/folder).");
            return;
        }

        string? projectRoot = ConfigWriter.FindProjectRoot(selectedPath!);
        if (projectRoot is null)
        {
            Log($"[CloudMate] Compile: could not find a .csproj for '{Path.GetFileName(selectedPath)}'.");
            return;
        }

        bool inConfig = ConfigWriter.HasCompileFile(projectRoot, selectedPath!);
        if (!inConfig)
        {
            ConfigWriter.Result result = ConfigWriter.AddCompileFile(projectRoot, selectedPath!);
            Log(result.Added
                ? $"[compile] {result.Input} -> {result.Output}  (added to {Path.GetFileName(result.ConfigPath)})"
                : $"[compile] {result.Message}");
        }
        else
        {
            Log($"[recompile] {Path.GetFileName(selectedPath)} is already configured. Running one-time rebuild.");
        }

        Log($"> mate  [{projectRoot}]");
        RunBuild(projectRoot, new string[0]);
        EnsureAlwaysWatching(projectRoot);
    }
}
