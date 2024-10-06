using System.Diagnostics;
using System.Xml.Linq;
using System.Xml;
using System.Reflection;

namespace AngryMonkey.CloudMate;

public class CloudPack(CloudPackConfig config)
{
    readonly CloudPackConfig Config = config;

    public string[] MetadataProperies { get; set; } = [];
    public CloudPackProject[] Projects { get; set; } = [];

    private string? Version { get; set; }

    readonly CloudPackIssueCollection Issues = new();

    internal static string? GetProjectPropertyValue(XDocument doc, string propertyName)
    {
        XElement element = doc.Root ?? throw new Exception("Project document issue");

        foreach (string nodeName in propertyName.Split('/'))
        {
            XElement? nextElement = element.Element(nodeName);

            if (nextElement == null)
                return null;

            element = nextElement;
        }

        return element.Value;
    }

    internal async Task UpdateProjectMetadata(CloudPackProject project)
    {
        XmlWriterSettings settings = new()
        {
            Indent = true,
            IndentChars = "  ",
            OmitXmlDeclaration = true
        };

        using XmlWriter writer = XmlWriter.Create(project.FilePath, settings);
        await Task.Run(() => project.Document.Save(writer));
    }

    internal void UpdateProjectNode(CloudPackProject project, string propertyName, string value)
    {
        XElement element = project.Document.Root ?? throw new Exception("Project document issue");

        foreach (string nodeName in propertyName.Split('/'))
        {
            XElement? nextElement = element.Element(nodeName);

            if (nextElement == null)
            {
                nextElement = new XElement(nodeName);
                element.Add(nextElement);
            }

            element = nextElement;
        }

        element.Value = value;
    }

    internal async Task PackProject(CloudPackProject project)
    {
        Process process = new()
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = "dotnet",
                Arguments = $"pack {project.FilePath} -c Release -o ./nupkgs -clp:ErrorsOnly",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
                Verb = "runas"
            }
        };

        using (FileStream fs = new(project.FilePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
        {
            process.Start();
        }

        int timeout = 30000; // 30 seconds
        bool exited = await Task.Run(() => process.WaitForExit(timeout));

        if (!exited)
        {
            process.Kill();
            Console.WriteLine($"Packing {project.Name} timed out and was terminated.");
        }

        string output = await process.StandardOutput.ReadToEndAsync();
        string error = await process.StandardError.ReadToEndAsync();

        bool succeeded = process.ExitCode != 0;

        if (!succeeded)
        {
            string version = GetProjectPropertyValue(project.Document, "PropertyGroup/Version") ?? throw new Exception("Version is missing");
            string[] files = Directory.GetFiles("./nupkgs", $"{project.AssemblyName}.{version}.nupkg");
            succeeded = files.Length > 0;
        }

        if (succeeded)
            Console.WriteLine($"Successfully packed {project.Name}");
        else
        {
            Console.WriteLine($"Error packing {project.Name}: {error}");

            Issues.AddPackingIssue(project);
        }
    }

    internal async Task PublishPackage(CloudPackProject project)
    {
        if (string.IsNullOrEmpty(Config.NugetApiKey))
            throw new ArgumentNullException(nameof(Config.NugetApiKey));

        string version = GetProjectPropertyValue(project.Document, "PropertyGroup/Version") ?? throw new Exception("Version is missing");

        Process process = new()
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = "dotnet",
                Arguments = $"nuget push ./nupkgs/{project.AssemblyName}.{version}.nupkg --skip-duplicate -k {Config.NugetApiKey} -s https://api.nuget.org/v3/index.json",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            }
        };

        process.Start();
        await process.WaitForExitAsync();

        string output = await process.StandardOutput.ReadToEndAsync();
        string error = await process.StandardError.ReadToEndAsync();

        if (process.ExitCode == 0)
            Console.WriteLine($"Successfully published {project.Name}");
        else if (error.Contains("409 (Conflict)"))
        {
            Console.WriteLine($"Package {project} already exists. Skipping publish.");
        }
        else
        {
            Console.WriteLine($"Error publishing {project.Name}: {error}");
            throw new Exception($"Error publishing {project.Name}: {error}");
        }
    }

    async Task RebuildProject(CloudPackProject project)
    {
        // Clean the project
        var cleanProcess = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = "dotnet",
                Arguments = $"clean {project.FilePath}",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            }
        };

        cleanProcess.Start();
        await cleanProcess.WaitForExitAsync();

        if (cleanProcess.ExitCode != 0)
        {
            string cleanError = await cleanProcess.StandardError.ReadToEndAsync();

            Issues.AddRebuildIssue(project);

            return;
        }

        // Rebuild the project
        var buildProcess = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = "dotnet",
                Arguments = $"build {project.FilePath} -c Release /p:WarningLevel=0",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            }
        };

        buildProcess.Start();
        await buildProcess.WaitForExitAsync();

        if (buildProcess.ExitCode != 0)
        {
            string buildError = await buildProcess.StandardError.ReadToEndAsync();

            Issues.AddRebuildIssue(project);

            return;
        }
    }

    public async Task Pack()
    {
        string currentDirectory = AppDomain.CurrentDomain.BaseDirectory;
        string projectDirectory = Directory.GetParent(currentDirectory).FullName;
        string? projectFileName = null;

        while (projectFileName == null)
        {
            projectDirectory = Directory.GetParent(projectDirectory).FullName;
            projectFileName = Directory.GetFiles(projectDirectory, "*.csproj").FirstOrDefault();
        }

        string projectName = Path.GetFileNameWithoutExtension(projectFileName);
        CloudPackProject sourceProject = new(projectName);

        Version = GetProjectPropertyValue(sourceProject.Document, "PropertyGroup/Version");

        foreach (CloudPackProject project in Projects.Where(key => key.UpdateVersion))
        {
            if (string.IsNullOrEmpty(Version))
                throw new Exception("Version is null.");

            UpdateProjectNode(project, "PropertyGroup/Version", Version);
            await UpdateProjectMetadata(project);
        }

        LogHeading("Update Matadata all started");

        // Update Metadata

        foreach (string metadata in MetadataProperies)
        {
            string value = GetProjectPropertyValue(sourceProject.Document, metadata) ?? throw new Exception("Metadata not foud at source");

            foreach (CloudPackProject project in Projects.Where(key => key.UpdateMetadata))
            {
                UpdateProjectNode(project, metadata, value);
                await UpdateProjectMetadata(project);
            }
        }

        LogHeading("Update Matadata all Completed");

        //// Clean and Build

        //foreach (Project project in Projects)
        //    await RebuildProject(project);


        //if (Issues.HasIssues)
        //{
        //    Issues.LogIssues();
        //    return;
        //}

        LogHeading("Packing all started");

        // Pack

        List<Task> packingTasks = [];

        foreach (CloudPackProject project in Projects.Where(key => key.PackAndPublish))
            packingTasks.Add(PackProject(project));

        await Task.WhenAll(packingTasks);

        if (Issues.HasIssues)
        {
            Issues.LogIssues();
            return;
        }

        LogHeading("Packing all completed");

        LogHeading("Publishing all started");

        // Publish

        foreach (CloudPackProject project in Projects.Where(key => key.PackAndPublish))
        {
            await PublishPackage(project);
        }

        LogHeading("Publishing all Completed");
    }

    private void LogHeading(string heading)
    {
        Console.WriteLine(string.Empty); // New Line

        Console.WriteLine($"-- {heading}");

        Console.WriteLine(string.Empty); // New Line
    }
}

public class CloudPackConfig
{
    public string? NugetApiKey { get; set; }
}