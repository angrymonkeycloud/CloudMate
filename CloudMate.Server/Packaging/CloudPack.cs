using System.Diagnostics;
using System.Xml.Linq;
using System.Xml;
using System.Reflection;

namespace AngryMonkey.CloudMate;

public class CloudPack(CloudPackConfig config)
{
    readonly CloudPackConfig Config = config;
    readonly ModernConsoleLogger _logger = new();

    public string[] MetadataProperies { get; set; } = [];
    public CloudPackProject[] Projects { get; set; } = [];
    public int MaxRetryAttempts { get; set; } = 3;
    public int RetryDelayMs { get; set; } = 2000;

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

    internal async Task<bool> PackProject(CloudPackProject project)
    {
        const int maxAttempts = 3;
        
        for (int attempt = 1; attempt <= maxAttempts; attempt++)
        {
            _logger.UpdateProjectStatus(project.Name, "pack", ModernConsoleLogger.Status.InProgress, 
                attempt, maxAttempts, $"Packing... (attempt {attempt}/{maxAttempts})");
            
            try
            {
                using Process process = new()
                {
                    StartInfo = new ProcessStartInfo
                    {
                        FileName = "dotnet",
                        Arguments = $"pack \"{project.FilePath}\" -c Release -o ./nupkgs --nologo --verbosity quiet",
                        RedirectStandardOutput = true,
                        RedirectStandardError = true,
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        WorkingDirectory = Environment.CurrentDirectory
                    }
                };

                // Ensure output directory exists
                Directory.CreateDirectory("./nupkgs");

                process.Start();

                int timeout = 60000; // Increased timeout to 60 seconds
                bool exited = await Task.Run(() => process.WaitForExit(timeout));

                if (!exited)
                {
                    try
                    {
                        process.Kill();
                        await process.WaitForExitAsync();
                    }
                    catch (InvalidOperationException)
                    {
                        // Process already exited
                    }
                    
                    if (attempt < maxAttempts)
                    {
                        _logger.UpdateProjectStatus(project.Name, "pack", ModernConsoleLogger.Status.InProgress, 
                            attempt, maxAttempts, "Timed out, retrying...");
                        await Task.Delay(RetryDelayMs);
                        continue;
                    }
                    
                    _logger.UpdateProjectStatus(project.Name, "pack", ModernConsoleLogger.Status.Failed, 
                        attempt, maxAttempts, "Packing timed out");
                    Issues.AddPackingIssue(project);
                    return false;
                }

                string output = await process.StandardOutput.ReadToEndAsync();
                string error = await process.StandardError.ReadToEndAsync();

                // Fixed: ExitCode == 0 means success, not != 0
                bool succeeded = process.ExitCode == 0;

                if (!succeeded)
                {
                    // Double-check by looking for the actual package file
                    string version = GetProjectPropertyValue(project.Document, "PropertyGroup/Version") ?? throw new Exception("Version is missing");
                    string packagePath = $"./nupkgs/{project.AssemblyName}.{version}.nupkg";
                    
                    if (File.Exists(packagePath))
                    {
                        succeeded = true;
                        _logger.UpdateProjectStatus(project.Name, "pack", ModernConsoleLogger.Status.Warning, 
                            attempt, maxAttempts, "Packed (exit code warning)");
                    }
                }

                if (succeeded)
                {
                    _logger.UpdateProjectStatus(project.Name, "pack", ModernConsoleLogger.Status.Success, 
                        attempt, maxAttempts, "Packed successfully");
                    return true;
                }
                else
                {
                    if (attempt < maxAttempts)
                    {
                        _logger.UpdateProjectStatus(project.Name, "pack", ModernConsoleLogger.Status.InProgress, 
                            attempt, maxAttempts, $"Failed, retrying... ({error.Split('\n').FirstOrDefault()?.Trim()})");
                        await Task.Delay(RetryDelayMs);
                        continue;
                    }
                    else
                    {
                        _logger.UpdateProjectStatus(project.Name, "pack", ModernConsoleLogger.Status.Failed, 
                            attempt, maxAttempts, $"Failed: {error.Split('\n').FirstOrDefault()?.Trim()}");
                    }
                }
            }
            catch (Exception ex)
            {
                if (attempt < maxAttempts)
                {
                    _logger.UpdateProjectStatus(project.Name, "pack", ModernConsoleLogger.Status.InProgress, 
                        attempt, maxAttempts, $"Exception, retrying... ({ex.Message})");
                    await Task.Delay(RetryDelayMs);
                    continue;
                }
                else
                {
                    _logger.UpdateProjectStatus(project.Name, "pack", ModernConsoleLogger.Status.Failed, 
                        attempt, maxAttempts, $"Exception: {ex.Message}");
                }
            }
        }
        
        Issues.AddPackingIssue(project);
        return false;
    }

    internal async Task<bool> PublishPackage(CloudPackProject project)
    {
        if (string.IsNullOrEmpty(Config.NugetApiKey))
            throw new ArgumentNullException(nameof(Config.NugetApiKey));

        string version = GetProjectPropertyValue(project.Document, "PropertyGroup/Version") ?? throw new Exception("Version is missing");
        string packagePath = $"./nupkgs/{project.AssemblyName}.{version}.nupkg";
        
        // Verify package exists before attempting to publish
        if (!File.Exists(packagePath))
        {
            _logger.UpdateProjectStatus(project.Name, "publish", ModernConsoleLogger.Status.Failed, 
                1, 1, "Package file not found");
            Issues.AddPublishingIssue(project);
            return false;
        }

        const int maxAttempts = 3;
        
        for (int attempt = 1; attempt <= maxAttempts; attempt++)
        {
            _logger.UpdateProjectStatus(project.Name, "publish", ModernConsoleLogger.Status.InProgress, 
                attempt, maxAttempts, $"Publishing... (attempt {attempt}/{maxAttempts})");
            
            try
            {
                using Process process = new()
                {
                    StartInfo = new ProcessStartInfo
                    {
                        FileName = "dotnet",
                        Arguments = $"nuget push \"{packagePath}\" --skip-duplicate -k {Config.NugetApiKey} -s https://api.nuget.org/v3/index.json --no-service-endpoint",
                        RedirectStandardOutput = true,
                        RedirectStandardError = true,
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        WorkingDirectory = Environment.CurrentDirectory
                    }
                };

                process.Start();
                
                // Increased timeout for publishing (can be slow)
                int timeout = 120000; // 2 minutes
                bool exited = await Task.Run(() => process.WaitForExit(timeout));
                
                if (!exited)
                {
                    try
                    {
                        process.Kill();
                        await process.WaitForExitAsync();
                    }
                    catch (InvalidOperationException)
                    {
                        // Process already exited
                    }
                    
                    if (attempt < maxAttempts)
                    {
                        _logger.UpdateProjectStatus(project.Name, "publish", ModernConsoleLogger.Status.InProgress, 
                            attempt, maxAttempts, "Timed out, retrying...");
                        await Task.Delay(RetryDelayMs * 2);
                        continue;
                    }
                    
                    _logger.UpdateProjectStatus(project.Name, "publish", ModernConsoleLogger.Status.Failed, 
                        attempt, maxAttempts, "Publishing timed out");
                    Issues.AddPublishingIssue(project);
                    return false;
                }

                string output = await process.StandardOutput.ReadToEndAsync();
                string error = await process.StandardError.ReadToEndAsync();

                if (process.ExitCode == 0)
                {
                    _logger.UpdateProjectStatus(project.Name, "publish", ModernConsoleLogger.Status.Success, 
                        attempt, maxAttempts, "Published successfully");
                    return true;
                }
                else if (error.Contains("409") || error.Contains("Conflict") || output.Contains("already exists"))
                {
                    _logger.UpdateProjectStatus(project.Name, "publish", ModernConsoleLogger.Status.Warning, 
                        attempt, maxAttempts, "Already exists (skipped)");
                    return true; // This is not an error condition
                }
                else
                {
                    // Check for specific retry-able errors
                    bool shouldRetry = error.Contains("timeout") || 
                                     error.Contains("network") || 
                                     error.Contains("502") || 
                                     error.Contains("503") || 
                                     error.Contains("504");
                    
                    if (shouldRetry && attempt < maxAttempts)
                    {
                        _logger.UpdateProjectStatus(project.Name, "publish", ModernConsoleLogger.Status.InProgress, 
                            attempt, maxAttempts, $"Network error, retrying... ({error.Split('\n').FirstOrDefault()?.Trim()})");
                        await Task.Delay(RetryDelayMs * 2);
                        continue;
                    }
                    else if (attempt >= maxAttempts)
                    {
                        _logger.UpdateProjectStatus(project.Name, "publish", ModernConsoleLogger.Status.Failed, 
                            attempt, maxAttempts, $"Failed: {error.Split('\n').FirstOrDefault()?.Trim()}");
                        break;
                    }
                }
            }
            catch (Exception ex)
            {
                if (attempt < maxAttempts)
                {
                    _logger.UpdateProjectStatus(project.Name, "publish", ModernConsoleLogger.Status.InProgress, 
                        attempt, maxAttempts, $"Exception, retrying... ({ex.Message})");
                    await Task.Delay(RetryDelayMs * 2);
                    continue;
                }
                else
                {
                    _logger.UpdateProjectStatus(project.Name, "publish", ModernConsoleLogger.Status.Failed, 
                        attempt, maxAttempts, $"Exception: {ex.Message}");
                }
            }
        }
        
        Issues.AddPublishingIssue(project);
        return false;
    }

    async Task<bool> RebuildProject(CloudPackProject project)
    {
        const int maxAttempts = 2;
        
        for (int attempt = 1; attempt <= maxAttempts; attempt++)
        {
            _logger.UpdateProjectStatus(project.Name, "rebuild", ModernConsoleLogger.Status.InProgress, 
                attempt, maxAttempts, $"Cleaning... (attempt {attempt}/{maxAttempts})");
            
            // Clean the project
            using var cleanProcess = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "dotnet",
                    Arguments = $"clean \"{project.FilePath}\" --nologo --verbosity quiet",
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
                
                if (attempt < maxAttempts)
                {
                    _logger.UpdateProjectStatus(project.Name, "rebuild", ModernConsoleLogger.Status.InProgress, 
                        attempt, maxAttempts, "Clean failed, retrying...");
                    await Task.Delay(RetryDelayMs);
                    continue;
                }
                
                _logger.UpdateProjectStatus(project.Name, "rebuild", ModernConsoleLogger.Status.Failed, 
                    attempt, maxAttempts, $"Clean failed: {cleanError.Split('\n').FirstOrDefault()?.Trim()}");
                Issues.AddRebuildIssue(project);
                return false;
            }

            _logger.UpdateProjectStatus(project.Name, "rebuild", ModernConsoleLogger.Status.InProgress, 
                attempt, maxAttempts, $"Building... (attempt {attempt}/{maxAttempts})");
            
            // Rebuild the project
            using var buildProcess = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "dotnet",
                    Arguments = $"build \"{project.FilePath}\" -c Release /p:WarningLevel=0 --nologo --verbosity quiet",
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
                
                if (attempt < maxAttempts)
                {
                    _logger.UpdateProjectStatus(project.Name, "rebuild", ModernConsoleLogger.Status.InProgress, 
                        attempt, maxAttempts, "Build failed, retrying...");
                    await Task.Delay(RetryDelayMs);
                    continue;
                }
                
                _logger.UpdateProjectStatus(project.Name, "rebuild", ModernConsoleLogger.Status.Failed, 
                    attempt, maxAttempts, $"Build failed: {buildError.Split('\n').FirstOrDefault()?.Trim()}");
                Issues.AddRebuildIssue(project);
                return false;
            }
            
            _logger.UpdateProjectStatus(project.Name, "rebuild", ModernConsoleLogger.Status.Success, 
                attempt, maxAttempts, "Built successfully");
            return true;
        }
        
        return false;
    }

    public async Task Pack()
    {
        var packableProjects = Projects.Where(key => key.PackAndPublish).ToList();
        
        // Initialize the modern console logger
        _logger.Initialize(packableProjects);

        string currentDirectory = AppDomain.CurrentDomain.BaseDirectory;
        string projectDirectory = Directory.GetParent(currentDirectory)!.FullName;
        string? projectFileName = null;

        while (projectFileName == null)
        {
            projectDirectory = Directory.GetParent(projectDirectory)!.FullName;
            projectFileName = Directory.GetFiles(projectDirectory, "*.csproj").FirstOrDefault();
        }

        string projectName = Path.GetFileNameWithoutExtension(projectFileName);
        CloudPackProject sourceProject = new(projectName);

        Version = GetProjectPropertyValue(sourceProject.Document, "PropertyGroup/Version");

        // Update version
        foreach (CloudPackProject project in Projects.Where(key => key.UpdateVersion))
        {
            if (string.IsNullOrEmpty(Version))
                throw new Exception("Version is null.");

            UpdateProjectNode(project, "PropertyGroup/Version", Version);
            await UpdateProjectMetadata(project);
        }

        _logger.LogHeading("Update Metadata Phase");

        // Update Metadata
        foreach (string metadata in MetadataProperies)
        {
            string value = GetProjectPropertyValue(sourceProject.Document, metadata) ?? throw new Exception("Metadata not found at source");

            foreach (CloudPackProject project in Projects.Where(key => key.UpdateMetadata))
            {
                UpdateProjectNode(project, metadata, value);
                await UpdateProjectMetadata(project);
            }
        }

        // Clean and Build phase
        _logger.LogHeading("Rebuild Phase");

        foreach (CloudPackProject project in packableProjects)
        {
            bool rebuildSuccess = await RebuildProject(project);
            if (!rebuildSuccess)
            {
                _logger.LogWarning($"Rebuild failed for {project.Name}, will skip pack and publish");
            }
        }

        // Pack phase
        _logger.LogHeading("Pack Phase");

        List<CloudPackProject> successfullyPackedProjects = [];

        foreach (CloudPackProject project in packableProjects)
        {
            // Skip if rebuild failed
            if (Issues.Projects.Any(i => i.Project.Name == project.Name && i.RebuildIssue))
            {
                _logger.UpdateProjectStatus(project.Name, "pack", ModernConsoleLogger.Status.Skipped, 
                    1, 1, "Skipped (rebuild failed)");
                continue;
            }
            
            bool packSuccess = await PackProject(project);
            if (packSuccess)
            {
                successfullyPackedProjects.Add(project);
            }
        }

        if (successfullyPackedProjects.Count == 0)
        {
            _logger.LogError("No projects were successfully packed. Stopping.");
            _logger.Complete();
            return;
        }

        // Publish phase
        _logger.LogHeading("Publish Phase");

        foreach (CloudPackProject project in successfullyPackedProjects)
        {
            await PublishPackage(project);
        }

        _logger.LogHeading("Process Complete");
        _logger.Complete();
    }
}

public class CloudPackConfig
{
    public string? NugetApiKey { get; set; }
    public int MaxRetryAttempts { get; set; } = 3;
    public int RetryDelayMs { get; set; } = 2000;
}