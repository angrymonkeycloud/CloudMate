using AngryMonkey.CloudMate;
using Microsoft.Extensions.Configuration;

// Initialize console for proper Unicode display
ConsoleHelper.EnsureConsoleSetup();
Console.Title = "CloudMate Package Manager";

var builder = new ConfigurationBuilder()
    .SetBasePath(Directory.GetCurrentDirectory())
    .AddJsonFile("appconfig.json", optional: false, reloadOnChange: true)
    .AddUserSecrets<Program>();

IConfigurationRoot configuration = builder.Build();
string apiKey = configuration["NuGetApiKey"];

await new CloudPack(new CloudPackConfig() { NugetApiKey = apiKey })
{
    Projects =
    [
        new CloudPackProject("CloudMate.Server") { UpdateVersion = false, UpdateMetadata = false }
    ]
}.Pack();