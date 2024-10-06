
namespace AngryMonkey.CloudMate;

internal class CloudPackIssue(CloudPackProject project)
{
    readonly public CloudPackProject Project = project;
    internal bool UpdateMetadataIssue { get; set; } = false;
    internal bool RebuildIssue { get; set; } = false;
    internal bool PackingIssue { get; set; } = false;
    internal bool PublishingIssue { get; set; } = false;
}
