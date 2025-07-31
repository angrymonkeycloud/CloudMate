namespace AngryMonkey.CloudMate;

internal class CloudPackIssueCollection
{
    readonly public List<CloudPackIssue> Projects = [];

    internal void AddMetadataIssue(CloudPackProject project)
    {
        CloudPackIssue p = GetProject(project);

        p.UpdateMetadataIssue = true;
    }

    internal void AddRebuildIssue(CloudPackProject project)
    {
        CloudPackIssue p = GetProject(project);

        p.RebuildIssue = true;
    }

    internal void AddPackingIssue(CloudPackProject project)
    {
        CloudPackIssue p = GetProject(project);

        p.PackingIssue = true;
    }

    internal void AddPublishingIssue(CloudPackProject project)
    {
        CloudPackIssue p = GetProject(project);

        p.PublishingIssue = true;
    }

    private CloudPackIssue GetProject(CloudPackProject project)
    {
        CloudPackIssue? p = Projects.FirstOrDefault(key => key.Project.Name.Equals(project.Name));

        if (p == null)
        {
            p = new(project);
            Projects.Add(p);
        }

        return p;
    }

    internal bool HasIssues => Projects.Count > 0;

    internal void LogIssues()
    {
        Console.WriteLine("Issues encountered:");
        Console.WriteLine(new string('-', 50));
        
        foreach (CloudPackIssue projectIssue in Projects)
        {
            List<string> issues = [];

            if (projectIssue.UpdateMetadataIssue)
                issues.Add("Update Metadata Issue");

            if (projectIssue.RebuildIssue)
                issues.Add("Rebuild Issue");

            if (projectIssue.PackingIssue)
                issues.Add("Packing Issue");

            if (projectIssue.PublishingIssue)
                issues.Add("Publishing Issue");

            Console.WriteLine($"  {projectIssue.Project.Name}: {string.Join(", ", issues)}");
        }
        
        Console.WriteLine(new string('-', 50));
    }
}