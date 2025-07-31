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

if (string.IsNullOrEmpty(apiKey))
{
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine("❌ NuGet API Key not found. Please configure your API key in user secrets or appconfig.json");
    Console.ResetColor();
    Console.WriteLine("Press any key to exit...");
    Console.ReadKey();
    return;
}

try
{
    await new CloudPack(new CloudPackConfig() 
    { 
        NugetApiKey = apiKey,
        MaxRetryAttempts = 3,
        RetryDelayMs = 3000 // 3 seconds between retries
    })
    {
        Projects =
        [
            new CloudPackProject("CloudMate.Server") { UpdateVersion = false, UpdateMetadata = false }
        ]
    }.Pack();
}
catch (Exception ex)
{
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine($"\n❌ Fatal error: {ex.Message}");
    Console.ResetColor();
    Console.WriteLine("\nPress any key to exit...");
    Console.ReadKey();
}