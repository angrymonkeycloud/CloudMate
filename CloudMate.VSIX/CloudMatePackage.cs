using System;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.VisualStudio;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Interop;

namespace AngryMonkey.CloudMate.VisualStudio;

/// <summary>
/// CloudMate VS package. Registers the command table resource and initializes all commands.
/// The package GUID must match the <c>guidCloudMatePackage</c> symbol in <c>CloudMatePackage.vsct</c>
/// and the <c>[PackageRegistration]</c> entry in the generated <c>.pkgdef</c>.
/// </summary>
[PackageRegistration(UseManagedResourcesOnly = true, AllowsBackgroundLoading = true)]
[Guid(PackageGuidString)]
[ProvideMenuResource("Menus.ctmenu", 1)]
public sealed class CloudMatePackage : AsyncPackage
{
    public const string PackageGuidString = "A1B2C3D4-E5F6-7890-ABCD-EF1234567890";

    protected override async Task InitializeAsync(CancellationToken cancellationToken, IProgress<ServiceProgressData> progress)
    {
        await base.InitializeAsync(cancellationToken, progress);

        // Switch to the UI thread before touching VS services.
        await JoinableTaskFactory.SwitchToMainThreadAsync(cancellationToken);

        await Commands.CompileVsCommand.InitializeAsync(this);
        await Commands.CompressFolderVsCommand.InitializeAsync(this);
        await Commands.BuildVsCommand.InitializeAsync(this);
        await Commands.BuildAllVsCommand.InitializeAsync(this);
        await Commands.WatchVsCommand.InitializeAsync(this);
    }

    // ─── Output pane ─────────────────────────────────────────────────────────

    private static IVsOutputWindowPane? _outputPane;
    private static readonly Guid OutputPaneGuid = new("C7F54A2E-1B3D-4E8F-9A0B-2D5E6F789012");

    /// <summary>
    /// Writes a line to the "CloudMate" output pane, creating it on first use.
    /// Safe to call from any thread: pane creation and activation are marshaled to the UI
    /// thread and the text is written with the thread-safe output API.
    /// </summary>
    internal static void OutputLine(IServiceProvider package, string message)
    {
        ThreadHelper.JoinableTaskFactory.Run(async () =>
        {
            await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();

            if (_outputPane is null
                && Package.GetGlobalService(typeof(SVsOutputWindow)) is IVsOutputWindow outputWindow)
            {
                Guid paneGuid = OutputPaneGuid;
                outputWindow.CreatePane(ref paneGuid, "CloudMate", fInitVisible: 1, fClearWithSolution: 0);
                outputWindow.GetPane(ref paneGuid, out _outputPane);
            }

            _outputPane?.OutputStringThreadSafe(message + Environment.NewLine);
            _outputPane?.Activate();
        });
    }
}
