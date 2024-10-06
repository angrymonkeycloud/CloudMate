using static AngryMonkey.CloudMate.CloudCode;

namespace AngryMonkey.CloudMate;

public partial class CloudCode
{
    public class ProjectConfiguration
    {
        public ProjectSDKs SDK { get; set; } = ProjectSDKs.SDK;
        public string TargetFramework { get; set; } = "net8.0";
        public List<ProjectPackageReference> Packages { get; set; } = [];
        public List<ProjectReference> Projects { get; set; } = [];
    }
}