namespace AngryMonkey.CloudMate;

public partial class CloudCode
{
    public abstract class ProjectReference
    {
        public required string Name { get; set; }
        public string? PrivateAssets { get; set; }
        public bool Pack { get; set; } = true;
    }

    public class ProjectPackageReference : ProjectReference
    {
        public required string Version { get; set; }
    }

    public class ProjectLocalReference : ProjectReference { }
}
