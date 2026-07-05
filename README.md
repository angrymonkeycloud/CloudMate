<div align="center">

# CloudMate

[![NuGet Version](https://img.shields.io/nuget/v/AngryMonkey.CloudMate?style=flat-square&logo=nuget&label=NuGet)](https://www.nuget.org/packages/AngryMonkey.CloudMate)
[![NuGet Downloads](https://img.shields.io/nuget/dt/AngryMonkey.CloudMate?style=flat-square&logo=nuget&label=Downloads)](https://www.nuget.org/packages/AngryMonkey.CloudMate)
[![.NET](https://img.shields.io/badge/.NET-10.0-512BD4?style=flat-square&logo=dotnet)](https://dotnet.microsoft.com)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

**A .NET 10 utility library for NuGet packaging automation, project code generation, compression, and C# code formatting.**

[Getting Started](#getting-started) Â· [CloudPack](#cloudpack) Â· [CloudCode](#cloudcode) Â· [CloudCompression](#cloudcompression) Â· [CoreCSharp Formatter](#corecsharp-formatter)

</div>

---

## Overview

CloudMate is a compile-time .NET helper library (`AngryMonkey.CloudMate`) that provides a suite of developer utilities:

| Feature | Class | Description |
|---|---|---|
| **NuGet Packaging** | `CloudPack` | Automates version sync, metadata propagation, build, pack, and publish to NuGet |
| **Project Generation** | `CloudCode` | Generates `.csproj` XML for any .NET SDK type |
| **Compression** | `CloudCompression` | Creates in-memory ZIP archives from strings or byte arrays |
| **Code Formatting** | `CoreCSharp` | Normalizes indentation and line spacing in generated C# code |

> **Compile-time only** â€” CloudMate ships with MSBuild targets that automatically remove it from consumer build and publish output, keeping your applications lean.

---

## Getting Started

### Installation

```bash
dotnet add package AngryMonkey.CloudMate
```

Or in your `.csproj`:

```xml
<PackageReference Include="AngryMonkey.CloudMate" Version="1.3.3" />
```

### Namespace

```csharp
using AngryMonkey.CloudMate;
```

---

## CloudPack

`CloudPack` automates the full NuGet release pipeline: syncing version and metadata across projects, rebuilding in Release mode, packing to `.nupkg`, and publishing to nuget.org â€” with retry logic and a styled console UI.

### Pipeline Phases

```
[Update Metadata] â†’ [Rebuild] â†’ [Pack] â†’ [Publish]
```

1. **Update Metadata** â€” reads version, authors, company, icon, and other properties from a source project and propagates them to all target projects.
2. **Rebuild** â€” runs `dotnet clean` then `dotnet build -c Release` on each project.
3. **Pack** â€” runs `dotnet pack -c Release -o ./nupkgs` and outputs `.nupkg` files.
4. **Publish** â€” runs `dotnet nuget push` to nuget.org, detecting duplicates and retrying on transient network errors.

### Basic Usage

```csharp
using AngryMonkey.CloudMate;

await new CloudPack(new CloudPackConfig { NugetApiKey = "YOUR_NUGET_API_KEY" })
{
    Projects =
    [
        new CloudPackProject("MyLibrary")
    ]
}.Pack();
```

### With Metadata Sync

```csharp
await new CloudPack(new CloudPackConfig { NugetApiKey = apiKey })
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
        new CloudPackProject("MyLibrary.Core"),
        new CloudPackProject("MyLibrary.Extensions")
    ]
}.Pack();
```

The source project is auto-detected from the working directory. Its `Version` and any `MetadataProperies` are written to all target projects before packing.

### Using User Secrets for the API Key

Store your NuGet API key as a user secret to avoid committing it:

```bash
dotnet user-secrets set "NuGetApiKey" "your-api-key-here"
```

Then load it with `Microsoft.Extensions.Configuration`:

```csharp
using Microsoft.Extensions.Configuration;
using AngryMonkey.CloudMate;

ConsoleHelper.EnsureConsoleSetup();

var config = new ConfigurationBuilder()
    .SetBasePath(Directory.GetCurrentDirectory())
    .AddJsonFile("appconfig.json", optional: false)
    .AddUserSecrets<Program>()
    .Build();

string? apiKey = config["NuGetApiKey"];

await new CloudPack(new CloudPackConfig { NugetApiKey = apiKey })
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
        new CloudPackProject("MyLibrary")
    ]
}.Pack();
```

`appconfig.json` (committed, safe):

```json
{
  "NuGetApiKey": "-- User Secrets --"
}
```

### CloudPack Configuration

#### `CloudPackConfig`

| Property | Type | Default | Description |
|---|---|---|---|
| `NugetApiKey` | `string?` | `null` | NuGet API key for publishing |
| `MaxRetryAttempts` | `int` | `3` | Maximum retry attempts per operation |
| `RetryDelayMs` | `int` | `2000` | Delay between retries in milliseconds |

#### `CloudPack` Properties

| Property | Type | Default | Description |
|---|---|---|---|
| `Projects` | `CloudPackProject[]` | `[]` | Target projects to pack and publish |
| `MetadataProperies` | `string[]` | `[]` | XPath-style property paths to sync from the source project |
| `MaxRetryAttempts` | `int` | `3` | Override retry attempts |
| `RetryDelayMs` | `int` | `2000` | Override retry delay |

#### `CloudPackProject`

| Property | Type | Default | Description |
|---|---|---|---|
| `Name` | `string` | *(required)* | Project folder and `.csproj` name |
| `UpdateVersion` | `bool` | `true` | Sync version from source project |
| `UpdateMetadata` | `bool` | `true` | Sync metadata properties from source project |
| `PackAndPublish` | `bool` | `true` | Include in rebuild, pack, and publish phases |

> Project files are resolved relative to the working directory as `../../../../{Name}/{Name}.csproj`, matching the typical solution layout where the packaging executable lives alongside the target projects.

### Retry & Resilience

- **Pack**: up to 3 attempts with a 2-second delay; gracefully handles timeouts (60-second limit per attempt).
- **Publish**: up to 3 attempts with a 4-second delay; detects `409 Conflict` / "already exists" responses and treats them as a successful no-op (2-minute limit per attempt).
- **Rebuild**: up to 2 attempts covering both `clean` and `build` steps.

---

## CloudCode

`CloudCode` generates valid `.csproj` XML for any .NET SDK type, including NuGet package references and local project references.

### Generating a Project File

```csharp
string csproj = CloudCode.GenerateProject(new CloudCode.ProjectConfiguration
{
    SDK = CloudCode.ProjectSDKs.Web,
    TargetFramework = "net10.0",
    References =
    [
        new CloudCode.ProjectPackageReference
        {
            Name = "Microsoft.EntityFrameworkCore",
            Version = "10.0.0"
        },
        new CloudCode.ProjectLocalReference
        {
            Name = "../MyLibrary/MyLibrary.csproj"
        }
    ]
});
```

Output:

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">

    <PropertyGroup>
        <TargetFramework>net10.0</TargetFramework>
        <ImplicitUsings>enable</ImplicitUsings>
        <Nullable>enable</Nullable>
    </PropertyGroup>

    <ItemGroup>
        <PackageReference Include="Microsoft.EntityFrameworkCore" Version="10.0.0" />
    </ItemGroup>

    <ItemGroup>
        <ProjectReference Include="../MyLibrary/MyLibrary.csproj" />
    </ItemGroup>

</Project>
```

### Supported SDK Types

| Enum Value | MSBuild SDK |
|---|---|
| `ProjectSDKs.SDK` | `Microsoft.NET.Sdk` |
| `ProjectSDKs.Executable` | `Microsoft.NET.Sdk` + `<OutputType>Exe</OutputType>` |
| `ProjectSDKs.Web` | `Microsoft.NET.Sdk.Web` |
| `ProjectSDKs.Worker` | `Microsoft.NET.Sdk.Worker` |
| `ProjectSDKs.Razor` | `Microsoft.NET.Sdk.Razor` |
| `ProjectSDKs.BlazorWebAssembly` | `Microsoft.NET.Sdk.BlazorWebAssembly` |

### Reference Types

#### `ProjectPackageReference` (NuGet)

```csharp
new CloudCode.ProjectPackageReference
{
    Name = "Newtonsoft.Json",
    Version = "13.0.3",
    PrivateAssets = "all"  // optional
}
```

#### `ProjectLocalReference` (Project-to-project)

```csharp
new CloudCode.ProjectLocalReference
{
    Name = "../Shared/Shared.csproj",
    Pack = false  // optional; defaults to true
}
```

---

## CloudCompression

`CloudCompression` creates in-memory ZIP archives from a collection of files, returning the raw bytes and MIME type â€” ideal for download endpoints or file-generation pipelines.

### Creating a ZIP Archive

```csharp
CloudCompression.Result result = CloudCompression.Zip(
[
    new CloudCompression.File("hello.txt", "Hello, World!"),
    new CloudCompression.File("data.json", "{\"key\": \"value\"}"),
    new CloudCompression.File("image.png", imageBytes)
]);

// result.Content      â†’ byte[]
// result.ContentType  â†’ "application/zip"
```

### Using the Result in ASP.NET Core

```csharp
app.MapGet("/download", () =>
{
    var result = CloudCompression.Zip(
    [
        new CloudCompression.File("report.csv", csvContent),
        new CloudCompression.File("summary.txt", summaryText)
    ]);

    return Results.File(result.Content, result.ContentType, "archive.zip");
});
```

### `CloudCompression.File` Constructors

| Constructor | Description |
|---|---|
| `File(string fileName, string content)` | Text file using UTF-8 encoding |
| `File(string fileName, byte[] content)` | Binary file |
| `File(string fileName, object content)` | Auto-detects string vs byte[] |

#### `CloudCompression.File` Properties

| Property | Type | Description |
|---|---|---|
| `FileName` | `string` | Entry name inside the archive |
| `Content` | `object` | Raw content (string or byte[]) |
| `IsBytes` | `bool` | `true` if content is binary |
| `AsBytes` | `byte[]` | Returns content as a byte array |
| `ContentLength` | `int` | Length of the content |

---

## CoreCSharp Formatter

`CoreCSharp` provides utilities for formatting and constructing C# source code programmatically, intended for use in code-generation pipelines.

### Formatting Generated Code

```csharp
string rawCode = "namespace MyApp { public class Foo { public void Bar() { if (x > 0) { return; } } } }";

string formatted = CoreCSharp.Format(rawCode);
```

`Format()` applies two passes:

1. **Line spacing** â€” inserts blank lines before `namespace`, `if`, `for`, `foreach`, `try`, `return`, `switch`, `case`, and `default` keywords.
2. **Indentation** â€” normalises tab-based indentation according to `{` / `}` depth.

### Building Switch Statements

```csharp
var switchStatement = new CoreCSharpSwitch { Value = "statusCode" };

var case200 = new CoreCSharpSwitchCase { Condition = "200" };
case200.AddStatement("return \"OK\";");
switchStatement.AddCase(case200);

var case404 = new CoreCSharpSwitchCase { Condition = "404" };
case404.AddStatement("return \"Not Found\";");
switchStatement.AddCase(case404);

var defaultCase = new CoreCSharpSwitchDefault();
defaultCase.AddStatement("return \"Unknown\";");
switchStatement.AddDefault(defaultCase);

string code = switchStatement.ToString();
```

Output:

```csharp
switch (statusCode)
{
    case 200:
    {
        return "OK";
        break;
    }
    case 404:
    {
        return "Not Found";
        break;
    }
    default:
    {
        return "Unknown";
        break;
    }
}
```

### Building If / Else Conditions

```csharp
var ifBlock = new CoreCSharpIfCondition { Condition = "x > 0" };
ifBlock.AddStatement("Console.WriteLine(\"Positive\");");

var elseBlock = new CoreCSharpElseCondition();
elseBlock.AddStatement("Console.WriteLine(\"Non-positive\");");

string ifCode = ifBlock.ToString();
string elseCode = elseBlock.ToString();
```

---

## Build-Time Integration

CloudMate includes MSBuild targets ensuring the library is **never copied to consumer build output or publish artifacts**, even when referenced as a NuGet package. This makes it safe to use as a compile-time tool without bloating your deployable applications.

The targets (shipped in `buildTransitive/`) perform two automatic removals:

- **After `ResolveReferences`** â€” removes `AngryMonkey.CloudMate` from local copy paths.
- **Before `ComputeFilesToPublish`** â€” removes it from publish output.

No manual configuration is needed; these targets activate automatically for any project that references the package.

---

## Project Structure

```
CloudMate/
â”œâ”€â”€ CloudMate.Server/          # Core library (AngryMonkey.CloudMate)
â”‚   â”œâ”€â”€ Code/                  # CloudCode â€” .csproj generation
â”‚   â”œâ”€â”€ Compression/           # CloudCompression â€” ZIP utilities
â”‚   â”œâ”€â”€ Formatter/             # CoreCSharp â€” code formatting & AST builders
â”‚   â”œâ”€â”€ Packaging/             # CloudPack â€” NuGet automation
â”‚   â””â”€â”€ buildTransitive/       # MSBuild targets (no runtime footprint)
â””â”€â”€ CloudMate.Package/         # CLI tool that publishes CloudMate itself
```

---

## Contributing

Contributions, issues, and feature requests are welcome. Please open an issue or pull request on [GitHub](https://github.com/angrymonkeycloud/CloudMate).

---

<div align="center">

Made with â¤ï¸ by [Angry Monkey](https://github.com/angrymonkeycloud)

</div>
