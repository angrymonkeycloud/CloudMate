using AngryMonkey.CloudMate;
using Microsoft.Extensions.Configuration;

var builder = new ConfigurationBuilder()
    .SetBasePath(Directory.GetCurrentDirectory())
    .AddJsonFile("appconfig.json", optional: false, reloadOnChange: true)
    .AddUserSecrets<Program>();

IConfigurationRoot configuration = builder.Build();
string apiKey = configuration["NuGetApiKey"];

await new CloudMate(new CloudMateConfig() { NugetApiKey = apiKey })
{
    Projects =
    [
        new Project("CloudMate.Server") { UpdateVersion = false, UpdateMetadata = false }
    ]
}.Pack();