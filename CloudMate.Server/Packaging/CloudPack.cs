using System.Diagnostics;
using System.Xml.Linq;
using System.Xml;
using System.Reflection;
using System.Text.Json;

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

    private static List<string> ExtractErrors(string output, string error)
    {
        string combined = output + "\n" + error;

        // Collect all MSBuild error lines (e.g., "error NETSDK1..." or "error NU...")
        List<string> errors = combined
            .Split('\n')
            .Select(l => l.Trim())
            .Where(l => l.Contains(": error ", StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (errors.Count > 0)
            return errors;

        // Fall back to all non-empty lines from stderr
        errors = error.Split('\n')
            .Select(l => l.Trim())
            .Where(l => !string.IsNullOrWhiteSpace(l))
            .ToList();

        if (errors.Count > 0)
            return errors;

        // Fall back to first non-empty line from stdout
        string? outputLine = output.Split('\n').FirstOrDefault(l => !string.IsNullOrWhiteSpace(l))?.Trim();
        if (!string.IsNullOrWhiteSpace(outputLine))
            return [outputLine];

        return ["Unknown error"];
    }

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

    internal void EnsurePackageIconItemGroup(CloudPackProject project, string iconFileName)
    {
        XElement root = project.Document.Root ?? throw new Exception("Project document issue");

        // Check if a <None Update="iconFileName"> already exists
        bool exists = root.Elements("ItemGroup")
            .SelectMany(ig => ig.Elements("None"))
            .Any(n => (string?)n.Attribute("Update") == iconFileName);

        if (exists)
            return;

        XElement itemGroup = new("ItemGroup",
            new XElement("None",
                new XAttribute("Update", iconFileName),
                new XElement("Pack", "True"),
                new XElement("PackagePath", @"\")
            )
        );

        root.Add(itemGroup);
    }

    internal async Task<bool> PackProject(CloudPackProject project)
    {
        const int maxAttempts = 3;
        
        for (int attempt = 1; attempt <= maxAttempts; attempt++)
        {
            _logger.UpdateProjectStatus(project.Name, "pack", ModernConsoleLogger.Status.InProgress,
                attempt, maxAttempts, "Packing...");
            
            try
            {
                using Process process = new()
                {
                    StartInfo = new ProcessStartInfo
                    {
                        FileName = "dotnet",
                        Arguments = $"pack \"{project.FilePath}\" -c Release -o ./nupkgs --nologo --verbosity minimal",
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

                // Read stdout/stderr concurrently to avoid deadlock on full output buffers
                Task<string> outputTask = process.StandardOutput.ReadToEndAsync();
                Task<string> errorTask = process.StandardError.ReadToEndAsync();

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

                string output = await outputTask;
                string error = await errorTask;

                // Fixed: ExitCode == 0 means success, not != 0
                bool succeeded = process.ExitCode == 0;

                if (!succeeded)
                {
                    // Double-check by looking for the actual package file
                    string version = GetProjectPropertyValue(project.Document, "PropertyGroup/Version") ?? throw new Exception("Version is missing");
                    string packagePath = $"./nupkgs/{project.PackageId}.{version}.nupkg";

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
                            attempt, maxAttempts, "Failed, retrying...");
                        await Task.Delay(RetryDelayMs);
                        continue;
                    }
                    else
                    {
                        _logger.UpdateProjectStatus(project.Name, "pack", ModernConsoleLogger.Status.Failed,
                            attempt, maxAttempts, "Failed");

                        foreach (string line in ExtractErrors(output, error))
                            _logger.LogError($"{project.Name}: {line}");
                    }
                }
            }
            catch (Exception ex)
            {
                if (attempt < maxAttempts)
                {
                    _logger.UpdateProjectStatus(project.Name, "pack", ModernConsoleLogger.Status.InProgress,
                        attempt, maxAttempts, "Exception, retrying...");
                    await Task.Delay(RetryDelayMs);
                    continue;
                }
                else
                {
                    _logger.UpdateProjectStatus(project.Name, "pack", ModernConsoleLogger.Status.Failed,
                        attempt, maxAttempts, "Exception");
                    _logger.LogError($"{project.Name}: {ex.Message}");
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
        string packagePath = $"./nupkgs/{project.PackageId}.{version}.nupkg";
        
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
                attempt, maxAttempts, "Publishing...");
            
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

                // Read stdout/stderr concurrently to avoid deadlock on full output buffers
                Task<string> outputTask = process.StandardOutput.ReadToEndAsync();
                Task<string> errorTask = process.StandardError.ReadToEndAsync();

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

                string output = await outputTask;
                string error = await errorTask;

                string combined = output + "\n" + error;

                // If the output contains evidence that the package already exists (Conflict, 409, or explicit message),
                // treat as AlreadyPublished even if exit code is 0.
                if (combined.Contains("already exists", StringComparison.OrdinalIgnoreCase) ||
                    combined.Contains("409") ||
                    combined.Contains("conflict", StringComparison.OrdinalIgnoreCase))
                {
                    _logger.UpdateProjectStatus(project.Name, "publish", ModernConsoleLogger.Status.Exists,
                        attempt, maxAttempts, "Already published");
                    return true;
                }

                if (process.ExitCode == 0)
                {
                    _logger.UpdateProjectStatus(project.Name, "publish", ModernConsoleLogger.Status.Success,
                        attempt, maxAttempts, "Published successfully");
                    return true;
                }

                bool shouldRetry = combined.Contains("timeout", StringComparison.OrdinalIgnoreCase) ||
                                   combined.Contains("network", StringComparison.OrdinalIgnoreCase) ||
                                   combined.Contains("502") ||
                                   combined.Contains("503") ||
                                   combined.Contains("504");

                if (shouldRetry && attempt < maxAttempts)
                {
                    _logger.UpdateProjectStatus(project.Name, "publish", ModernConsoleLogger.Status.InProgress,
                        attempt, maxAttempts, "Network error, retrying...");
                    await Task.Delay(RetryDelayMs * 2);
                    continue;
                }
                else if (attempt >= maxAttempts)
                {
                    _logger.UpdateProjectStatus(project.Name, "publish", ModernConsoleLogger.Status.Failed,
                        attempt, maxAttempts, "Failed");

                    foreach (string line in ExtractErrors(output, error))
                        _logger.LogError($"{project.Name}: {line}");

                    break;
                }
            }
            catch (Exception ex)
            {
                if (attempt < maxAttempts)
                {
                    _logger.UpdateProjectStatus(project.Name, "publish", ModernConsoleLogger.Status.InProgress,
                        attempt, maxAttempts, "Exception, retrying...");
                    await Task.Delay(RetryDelayMs * 2);
                    continue;
                }
                else
                {
                    _logger.UpdateProjectStatus(project.Name, "publish", ModernConsoleLogger.Status.Failed,
                        attempt, maxAttempts, "Exception");
                    _logger.LogError($"{project.Name}: {ex.Message}");
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
                attempt, maxAttempts, "Cleaning...");

            using var cleanProcess = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "dotnet",
                    Arguments = $"clean \"{project.FilePath}\" --nologo --verbosity minimal",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                }
            };

            cleanProcess.Start();
            Task<string> cleanOut = cleanProcess.StandardOutput.ReadToEndAsync();
            Task<string> cleanErr = cleanProcess.StandardError.ReadToEndAsync();
            await cleanProcess.WaitForExitAsync();
            await Task.WhenAll(cleanOut, cleanErr);

            if (cleanProcess.ExitCode != 0)
            {
                if (attempt < maxAttempts)
                {
                    _logger.UpdateProjectStatus(project.Name, "rebuild", ModernConsoleLogger.Status.InProgress,
                        attempt, maxAttempts, "Clean failed, retrying...");
                    await Task.Delay(RetryDelayMs);
                    continue;
                }

                _logger.UpdateProjectStatus(project.Name, "rebuild", ModernConsoleLogger.Status.Failed,
                    attempt, maxAttempts, "Clean failed");

                foreach (string line in ExtractErrors(await cleanOut, await cleanErr))
                    _logger.LogError($"{project.Name}: {line}");
                Issues.AddRebuildIssue(project);
                return false;
            }

            _logger.UpdateProjectStatus(project.Name, "rebuild", ModernConsoleLogger.Status.InProgress,
                attempt, maxAttempts, "Building...");

            using var buildProcess = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "dotnet",
                    Arguments = $"build \"{project.FilePath}\" -c Release /p:WarningLevel=0 --nologo --verbosity minimal",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                }
            };

            buildProcess.Start();
            Task<string> buildOut = buildProcess.StandardOutput.ReadToEndAsync();
            Task<string> buildErr = buildProcess.StandardError.ReadToEndAsync();
            await buildProcess.WaitForExitAsync();
            await Task.WhenAll(buildOut, buildErr);

            if (buildProcess.ExitCode != 0)
            {
                if (attempt < maxAttempts)
                {
                    _logger.UpdateProjectStatus(project.Name, "rebuild", ModernConsoleLogger.Status.InProgress,
                        attempt, maxAttempts, "Build failed, retrying...");
                    await Task.Delay(RetryDelayMs);
                    continue;
                }

                _logger.UpdateProjectStatus(project.Name, "rebuild", ModernConsoleLogger.Status.Failed,
                    attempt, maxAttempts, "Build failed");

                foreach (string line in ExtractErrors(await buildOut, await buildErr))
                    _logger.LogError($"{project.Name}: {line}");
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

        if (string.IsNullOrEmpty(Version))
            throw new Exception("Version is null.");

        List<PackagePreflight> preflight = await GetPackagePreflight(packableProjects);
        _logger.ShowPreflight(Version, preflight);

        if (Config.ConfirmBeforePack && !_logger.ConfirmProceed())
        {
            Console.WriteLine("Packaging cancelled.");
            return;
        }

        // Initialize only after confirmation, using the source project's target version.
        _logger.Initialize(packableProjects, Version);

        // Update version
        foreach (CloudPackProject project in Projects.Where(key => key.UpdateVersion))
        {
            UpdateProjectNode(project, "PropertyGroup/Version", Version);
            await UpdateProjectMetadata(project);
        }

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

        // Copy package logo from source project to target projects
        string? packageIcon = GetProjectPropertyValue(sourceProject.Document, "PropertyGroup/PackageIcon");

        if (!string.IsNullOrEmpty(packageIcon))
        {
            string sourceProjectDir = Path.GetDirectoryName(Path.GetFullPath(sourceProject.FilePath))!;
            string sourceIconPath = Path.Combine(sourceProjectDir, packageIcon);

            if (File.Exists(sourceIconPath))
            {
                foreach (CloudPackProject project in Projects.Where(key => key.UpdateMetadata))
                {
                    string targetProjectDir = Path.GetDirectoryName(Path.GetFullPath(project.FilePath))!;
                    string targetIconPath = Path.Combine(targetProjectDir, packageIcon);

                    File.Copy(sourceIconPath, targetIconPath, overwrite: true);

                    UpdateProjectNode(project, "PropertyGroup/PackageIcon", packageIcon);
                    EnsurePackageIconItemGroup(project, packageIcon);
                    await UpdateProjectMetadata(project);
                }
            }
            else
            {
                _logger.LogWarning($"Package icon '{packageIcon}' not found at '{sourceIconPath}'");
            }
        }

        // Clean and Build phase
        foreach (CloudPackProject project in packableProjects)
        {
            bool rebuildSuccess = await RebuildProject(project);
            if (!rebuildSuccess)
            {
                _logger.LogWarning($"Rebuild failed for {project.Name}, will skip pack and publish");
            }
        }

        // Pack phase
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
        foreach (CloudPackProject project in successfullyPackedProjects)
        {
            await PublishPackage(project);
        }

        _logger.Complete();
    }

    private async Task<List<PackagePreflight>> GetPackagePreflight(IEnumerable<CloudPackProject> projects)
    {
        using HttpClient client = new() { Timeout = TimeSpan.FromSeconds(15) };

        Task<PackagePreflight>[] checks = projects.Select(async project =>
        {
            string packageId = project.PackageId;
            string url = $"https://api.nuget.org/v3-flatcontainer/{Uri.EscapeDataString(packageId.ToLowerInvariant())}/index.json";

            try
            {
                using HttpResponseMessage response = await client.GetAsync(url);
                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                    return new PackagePreflight(project.Name, packageId, null, null);

                response.EnsureSuccessStatusCode();
                await using Stream content = await response.Content.ReadAsStreamAsync();
                using JsonDocument json = await JsonDocument.ParseAsync(content);
                string? currentVersion = json.RootElement.GetProperty("versions")
                    .EnumerateArray()
                    .Select(item => item.GetString())
                    .LastOrDefault(item => !string.IsNullOrWhiteSpace(item));

                return new PackagePreflight(project.Name, packageId, currentVersion, null);
            }
            catch (Exception ex)
            {
                return new PackagePreflight(project.Name, packageId, null, ex.Message);
            }
        }).ToArray();

        return [.. await Task.WhenAll(checks)];
    }
}

internal sealed record PackagePreflight(
    string ProjectName,
    string PackageId,
    string? CurrentVersion,
    string? LookupError);

public class CloudPackConfig
{
    public string? NugetApiKey { get; set; }
    public int MaxRetryAttempts { get; set; } = 3;
    public int RetryDelayMs { get; set; } = 2000;
    public bool ConfirmBeforePack { get; set; } = true;
}
