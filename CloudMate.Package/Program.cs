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
string? apiKey = configuration["NuGetApiKey"];

await new CloudPack(new CloudPackConfig() { NugetApiKey = apiKey })
{
    MetadataProperies =
    [
        "PropertyGroup/Authors",
        "PropertyGroup/Company",
        "PropertyGroup/AssemblyVersion",
        "PropertyGroup/FileVersion",
        "PropertyGroup/PackageIcon"
    ],
    Projects =
    [
        new CloudPackProject("CloudMate.Server"),
        //new CloudPackProject("CloudMate.Bundler"),
        //new CloudPackProject("CloudMate.CLI")
    ]
}.Pack();