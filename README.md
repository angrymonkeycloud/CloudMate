# CloudMate
[![Website](https://img.shields.io/badge/Website-angrymonkeycloud.com-0B5FFF?style=flat-square&logo=googlechrome&logoColor=white)](https://angrymonkeycloud.com/cloudmate)
[![GitHub repository](https://img.shields.io/badge/GitHub-CloudMate-181717?style=flat-square&logo=github)](https://github.com/angrymonkeycloud/CloudMate)
[![NuGet](https://img.shields.io/nuget/v/AngryMonkey.CloudMate?style=flat-square&logo=nuget&label=NuGet)](https://www.nuget.org/packages/AngryMonkey.CloudMate)
[![NuGet downloads](https://img.shields.io/nuget/dt/AngryMonkey.CloudMate?style=flat-square&logo=nuget&label=Downloads)](https://www.nuget.org/packages/AngryMonkey.CloudMate)
[![Visual Studio extension](https://img.shields.io/visual-studio-marketplace/v/AngryMonkey.CloudMate?style=flat-square&logo=visualstudio&label=Visual%20Studio)](https://marketplace.visualstudio.com/items?itemName=AngryMonkey.CloudMate)
[![Visual Studio downloads](https://img.shields.io/visual-studio-marketplace/d/AngryMonkey.CloudMate?style=flat-square&logo=visualstudio&label=Downloads)](https://marketplace.visualstudio.com/items?itemName=AngryMonkey.CloudMate)
[![VS Code extension](https://img.shields.io/visual-studio-marketplace/v/AngryMonkey.cloudmate?style=flat-square&logo=visualstudiocode&label=VS%20Code)](https://marketplace.visualstudio.com/items?itemName=AngryMonkey.cloudmate)
[![VS Code downloads](https://img.shields.io/visual-studio-marketplace/d/AngryMonkey.cloudmate?style=flat-square&logo=visualstudiocode&label=Downloads)](https://marketplace.visualstudio.com/items?itemName=AngryMonkey.cloudmate)
[![.NET](https://img.shields.io/badge/.NET-10.0-512BD4?style=flat-square&logo=dotnet)](https://dotnet.microsoft.com)
[![License](https://img.shields.io/badge/License-MIT-2F855A?style=flat-square)](LICENSE)

**A .NET 10 utility library for NuGet packaging automation, project code generation, compression, and C# code formatting.**

[Getting Started](#getting-started) · [CloudPack](#cloudpack) · [CloudCode](#cloudcode) · [CloudCompression](#cloudcompression) · [CoreCSharp Formatter](#corecsharp-formatter) · [Bundler](#cloudmate-bundler)

---

## Overview

CloudMate is a compile-time .NET helper library (`AngryMonkey.CloudMate`) that provides a suite of developer utilities:

| Feature | Class | Description |
|---|---|---|
| **NuGet Packaging** | `CloudPack` | Automates version sync, metadata propagation, build, pack, and publish to NuGet |
| **Project Generation** | `CloudCode` | Generates `.csproj` XML for any .NET SDK type |
| **Compression** | `CloudCompression` | Creates in-memory ZIP archives from strings or byte arrays |
| **Code Formatting** | `CoreCSharp` | Normalizes indentation and line spacing in generated C# code |

### Packages

| Package | Version | Downloads |
| --- | --- | --- |
| `AngryMonkey.CloudMate` | [![NuGet](https://img.shields.io/nuget/v/AngryMonkey.CloudMate?style=flat-square&logo=nuget)](https://www.nuget.org/packages/AngryMonkey.CloudMate) | [![Downloads](https://img.shields.io/nuget/dt/AngryMonkey.CloudMate?style=flat-square&logo=nuget)](https://www.nuget.org/packages/AngryMonkey.CloudMate) |
| `AngryMonkey.CloudMate.Bundler` | [![NuGet](https://img.shields.io/nuget/v/AngryMonkey.CloudMate.Bundler?style=flat-square&logo=nuget)](https://www.nuget.org/packages/AngryMonkey.CloudMate.Bundler) | [![Downloads](https://img.shields.io/nuget/dt/AngryMonkey.CloudMate.Bundler?style=flat-square&logo=nuget)](https://www.nuget.org/packages/AngryMonkey.CloudMate.Bundler) |
| `AngryMonkey.CloudMate.CLI` | [![NuGet](https://img.shields.io/nuget/v/AngryMonkey.CloudMate.CLI?style=flat-square&logo=nuget)](https://www.nuget.org/packages/AngryMonkey.CloudMate.CLI) | [![Downloads](https://img.shields.io/nuget/dt/AngryMonkey.CloudMate.CLI?style=flat-square&logo=nuget)](https://www.nuget.org/packages/AngryMonkey.CloudMate.CLI) |

> **Compile-time only** — CloudMate ships with MSBuild targets that automatically remove it from consumer build and publish output, keeping your applications lean.

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

Before changing any project files, CloudPack displays the target version, each resolved NuGet package ID, and its currently published version. Press **Enter** to continue or **Esc** to cancel.

`CloudPack` automates the full NuGet release pipeline: syncing version and metadata across projects, rebuilding in Release mode, packing to `.nupkg`, and publishing to nuget.org — with retry logic and a styled console UI.

### Pipeline Phases

```
[Update Metadata] -> [Rebuild] -> [Pack] -> [Publish]
```

1. **Update Metadata** — reads version, authors, company, icon, and other properties from a source project and propagates them to all target projects.
2. **Rebuild** — runs `dotnet clean` then `dotnet build -c Release` on each project.
3. **Pack** — runs `dotnet pack -c Release -o ./nupkgs` and outputs `.nupkg` files.
4. **Publish** — runs `dotnet nuget push` to nuget.org, detecting duplicates and retrying on transient network errors.

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
| `ConfirmBeforePack` | `bool` | `true` | Show the NuGet preflight and require Enter before packaging |

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

`CloudCompression` creates in-memory ZIP archives from a collection of files, returning the raw bytes and MIME type — ideal for download endpoints or file-generation pipelines.

### Creating a ZIP Archive

```csharp
CloudCompression.Result result = CloudCompression.Zip(
[
    new CloudCompression.File("hello.txt", "Hello, World!"),
    new CloudCompression.File("data.json", "{\"key\": \"value\"}"),
    new CloudCompression.File("image.png", imageBytes)
]);

// result.Content      -> byte[]
// result.ContentType  -> "application/zip"
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

1. **Line spacing** — inserts blank lines before `namespace`, `if`, `for`, `foreach`, `try`, `return`, `switch`, `case`, and `default` keywords.
2. **Indentation** — normalises tab-based indentation according to `{` / `}` depth.

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

- **After `ResolveReferences`** — removes `AngryMonkey.CloudMate` from local copy paths.
- **Before `ComputeFilesToPublish`** — removes it from publish output.

No manual configuration is needed; these targets activate automatically for any project that references the package.

---

## CloudMate Bundler

`CloudMate.Bundler` is the front-end asset pipeline library used by the `mate` CLI and the Visual Studio extension. It compiles, bundles, minifies, and watches TypeScript/JavaScript/CSS source files, and compresses images — all driven by a single `.mateconfig.json` file.

### Supported Input Types

| Extension | Processing |
|---|---|
| `.ts` | TypeScript → JavaScript (bundled TypeScript compiler) |
| `.less` | LESS → CSS (bundled Less.js engine) |
| `.scss` / `.sass` | Sass/SCSS → CSS (bundled Dart Sass engine) |
| `.css` | CSS passthrough / concatenation |
| `.js` | JavaScript passthrough / concatenation |
| `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp` | Raster image compression (SkiaSharp) |
| `.svg` | SVG passthrough |

### Bundler Features

- **Multi-file bundling** — multiple input files (or glob patterns) are resolved and concatenated into a single output
- **Minification** — produces `.min.css` and `.min.js` side-by-side with every bundle; configurable per build profile
- **Source maps** — optional source map generation for CSS and JavaScript outputs
- **TypeScript declaration files** — generates and bundles `.d.ts` files alongside compiled JS output
- **WebClean transform** — strips CommonJS `require()`/`exports` artifacts from TypeScript output for direct browser use without a module bundler
- **Multiple named build profiles** — define `dev`, `dist`, or any custom profile, each with its own output directory, minification, and source-map settings
- **Output directory versioning** — optionally append the package version (`OutDirVersioning`) or config name segment (`OutDirName`) to the output path
- **Per-type directory suffixes** — separate sub-folder suffixes for CSS and JS within the same build (`OutDirSuffix`)
- **Custom `tsconfig.json` path** — specify a TypeScript config file per build, or rely on auto-detection

### Image Compression Features

- **Lossless-style re-encoding** — re-encodes PNG, JPEG, GIF, and WebP images; keeps the original when the re-encoded result is larger
- **Resize to max bounds** — constrain images to `MaxWidth` × `MaxHeight` while preserving the aspect ratio (never enlarges)
- **Format conversion** — convert to any supported format (`png`, `jpg`, `jpeg`, `gif`, `webp`, `tiff`) via `OutputFormat`
- **Batch glob processing** — image inputs support glob patterns for entire directories
- **Incremental processing** — already-compressed outputs are skipped on subsequent runs

### File Watcher

- **Incremental rebuild on save** — re-runs only the affected bundle when a source file changes
- **Implicit LESS/SCSS dependency tracking** — watches all `.less` and `.scss` files under the project root so `@import` changes trigger the correct rebuild
- **Config hot-reload** — restarts automatically when `.mateconfig.json` or `.mateconfig.yaml` is modified
- **Image watch** — re-compresses images on add, change, or delete

### Configuration

Configuration is stored in `mateconfig.json` (or `mateconfig.yaml` / `mateconfig.yml`) at the project root.

**Supported config file names (searched in order):**
`mateconfig.json`, `mateconfig.yaml`, `mateconfig.yml`, `.mateconfig`, `.mateconfig.json`, `.mateconfig.yaml`, `.mateconfig.yml`, `package.json` *(via `mateconfig` key)*

**Example `mateconfig.json`:**

```json
{
  "builds": [
    {
      "name": "dev",
      "css": { "minify": true, "sourceMap": false },
      "js":  { "minify": true, "sourceMap": true, "declaration": true, "webClean": false }
    },
    {
      "name": "dist",
      "outDir": "wwwroot/dist",
      "outDirVersioning": true,
      "css": { "minify": true },
      "js":  { "minify": true, "webClean": true }
    }
  ],
  "files": [
    { "input": ["src/styles/**/*.less"], "output": ["wwwroot/css/site.css"], "builds": ["dev", "dist"] },
    { "input": ["src/scripts/app.ts"],   "output": ["wwwroot/js/app.js"],    "builds": ["dev", "dist"] }
  ],
  "images": [
    {
      "input":  ["src/images/**/*"],
      "output": ["wwwroot/images"],
      "maxWidth": 1920,
      "maxHeight": 1080,
      "outputFormat": "webp"
    }
  ]
}
```

#### `MateConfigBuild` Properties

| Property | Type | Default | Description |
|---|---|---|---|
| `Name` | `string` | `"dev"` | Build profile name |
| `OutDir` | `string?` | *(from output path)* | Override output directory |
| `OutDirVersioning` | `bool` | `false` | Append package version to output path |
| `OutDirName` | `bool` | `false` | Append config name to output path |
| `Ts` | `string?` | *(auto-detect)* | Path to `tsconfig.json` |
| `Css.Minify` | `bool` | `true` | Generate `.min.css` |
| `Css.SourceMap` | `bool` | `false` | Generate CSS source map |
| `Css.OutDirSuffix` | `string?` | `null` | Sub-folder suffix for CSS output |
| `Js.Minify` | `bool` | `true` | Generate `.min.js` |
| `Js.SourceMap` | `bool` | `true` | Generate JS source map |
| `Js.Declaration` | `bool` | `true` | Generate `.d.ts` declaration file |
| `Js.WebClean` | `bool` | `false` | Apply WebClean transform to output |
| `Js.OutDirSuffix` | `string?` | `null` | Sub-folder suffix for JS output |

#### `MateConfigImage` Properties

| Property | Type | Default | Description |
|---|---|---|---|
| `Input` | `string[]` | *(required)* | Glob patterns for source images |
| `Output` | `string[]` | *(required)* | Destination directories |
| `MaxWidth` | `int?` | `null` | Maximum output width in pixels |
| `MaxHeight` | `int?` | `null` | Maximum output height in pixels |
| `OutputFormat` | `string?` | *(keep source format)* | Target format: `png`, `jpg`, `jpeg`, `gif`, `webp`, `tiff` |


### CLI Commands (`mate`)

Run builds, watch for changes, or manage `mateconfig.json` from the terminal:

```bash
mate                  # run default (dev) build
mate dist             # run dist build only
mate dev dist         # run dev and dist builds
mate -a, --all        # run all defined builds
mate -w, --watch      # watch inputs and re-build on change
mate -c, --clean      # remove entries with missing input files from mateconfig.json
mate --autoconfig     # clean config then add all unconfigured .ts/.less/.scss/.sass files
mate -v, --version    # print CloudMate version
mate -h, --help       # print help
```

> **`--autoconfig`** always runs a clean pass first, so stale entries with deleted source files are
> removed before new files are discovered and registered.

### Output Paths and the `src` / `source` Folder Convention

When `--autoconfig` (or the Visual Studio extension) generates output paths, it applies this rule: source files under `src/` or `source/` are mapped to a corresponding path under `wwwroot/` whenever the project is a .NET project (contains a `.csproj`) **or** already has a `wwwroot` folder. The leading `src` / `source` segment is stripped:

| Source file | Auto-generated output |
|---|---|
| `src/styles/site.less` | `wwwroot/styles/site.css` |
| `src/scripts/app.ts` | `wwwroot/scripts/app.js` |
| `source/images/logo.png` | `wwwroot/images/logo.png` |

Files outside `src/` or `source/` keep their original relative path (output lands next to the source). If neither condition applies (no `.csproj` and no `wwwroot`), all paths are kept as-is.

> **Note:** If the source folder itself (e.g. `src`) is added as a compilation root, output is **not** remapped to `wwwroot` — only files nested inside it are remapped.

---

## Project Structure

```
CloudMate/
├──
 CloudMate.Server/          # Core library (AngryMonkey.CloudMate)
│
   
├──
 Code/                  # CloudCode 
—
 .csproj generation
│
   
├──
 Compression/           # CloudCompression 
—
 ZIP utilities
│
   
├──
 Formatter/             # CoreCSharp 
—
 code formatting & AST builders
│
   
├──
 Packaging/             # CloudPack 
—
 NuGet automation
│
   
└──
 buildTransitive/       # MSBuild targets (no runtime footprint)
├──
 CloudMate.Bundler/         # Bundler library 
—
 TypeScript/CSS/image pipeline
├──
 CloudMate.CLI/             # mate CLI tool
├──
 CloudMate.VSIX/            # Visual Studio extension
└──
 CloudMate.Package/         # CLI tool that publishes CloudMate itself
```

---

## Contributing

Contributions, issues, and feature requests are welcome. Please open an issue or pull request on [GitHub](https://github.com/angrymonkeycloud/CloudMate).

---

<div align="center">


</div>

---

## Angry Monkey Cloud

This project is part of the [Angry Monkey Cloud](https://angrymonkeycloud.com) open-source ecosystem. Follow the shared [AI development instructions](https://github.com/angrymonkeycloud/CloudDocs/blob/main/docs/ai/instructions.md) and browse the [project catalog](https://angrymonkeycloud.com) and [GitHub organization](https://github.com/angrymonkeycloud).
