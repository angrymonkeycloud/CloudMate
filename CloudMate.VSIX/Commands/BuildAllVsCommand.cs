using System.Threading.Tasks;
using Microsoft.VisualStudio.Shell;

namespace AngryMonkey.CloudMate.VisualStudio.Commands;

// Legacy command – not registered, kept to avoid removing from project.
internal sealed class BuildAllVsCommand : VsCommandBase
{
    private BuildAllVsCommand(AsyncPackage package) : base(package) { }
    public static Task InitializeAsync(AsyncPackage package) => Task.CompletedTask;
}