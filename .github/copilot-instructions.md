# CloudMate AI Coding Instructions

## General AI-Assisted Development

For general AI-assisted development guidance, C# style, static assets, and documentation standards that apply to this repository, see:

- [AI Instructions](https://github.com/angrymonkeycloud/CloudDocs/blob/main/docs/ai/instructions.md)

**Note**: Project-specific instructions below take precedence when conflicts exist.

## Project Overview

CloudMate is a multi-faceted .NET 10 utility tool consisting of two projects:
- **CloudMate.Server**: Core library (namespace: `AngryMonkey.CloudMate`) for packaging, code generation, compression, and formatting
- **CloudMate.Package**: Executable CLI tool that invokes CloudMate.Server for publishing NuGet packages

The tool manages TypeScript/JavaScript/CSS compilation, image compression, and project scaffolding. CloudMate.Server is distributed as a compile-time NuGet helper package (not a runtime dependency).

## Architecture & Key Components

### Core Modules

1. **Code Generation** (`CloudMate.Server/Code/`)
   - `CloudCode.cs`: Generates C# project files (.csproj XML) with SDK selection, properties, and references
   - `ProjectConfiguration.cs`: Defines SDK types (Web, Razor, Worker, BlazorWebAssembly, Executable)
   - `ProjectReference.cs`: Base class for package/local references
   - Uses `StringBuilder` for XML construction; output is validated MSBuild format

2. **Packaging** (`CloudMate.Server/Packaging/`)
   - `CloudPack.cs`: Main orchestrator—loads projects, updates version metadata, publishes to NuGet
   - `CloudPackProject.cs`: Represents a .csproj file; loads/saves XDocument with preservation of whitespace
   - `CloudPackIssue[Collection].cs`: Error/warning aggregation
   - **Process**: Retry logic (3 attempts, 2s delay) for resilience; reads MSBuild errors from stdout/stderr
   - **Metadata**: Extracts version from PropertyGroup; updates Authors, Company, AssemblyVersion, FileVersion, PackageIcon

3. **Formatting** (`CloudMate.Server/Formatter/`)
   - C# code formatting utilities (indentation, line spacing, build configuration)
   - Not used in core CloudMate build pipeline; intended for CLI bundler/transpiler use

4. **Compression** (`CloudMate.Server/Compression/`)
   - `CloudCompression.cs`: ZipArchive wrapper for creating .zip outputs
   - Returns `Result` object with byte content and MIME type

### Build-Time Integration

- **buildTransitive/AngryMonkey.CloudMate.targets**: MSBuild targets that remove CloudMate from consumer package output
  - Target 1: Removes from build copy (AfterTargets="ResolveReferences")
  - Target 2: Removes from publish (BeforeTargets="ComputeFilesToPublish")
  - **Why**: CloudMate is a compile-time helper; must not bloat consumer runtime/publish artifacts

## Development Patterns & Conventions

### Nullable & Implicit Usings
- Both projects: `<Nullable>enable</Nullable>` and `<ImplicitUsings>enable</ImplicitUsings>` enabled
- Write null-safe code; reference types require `?` for optionality

### Configuration Loading (Program.cs)
- Uses `Microsoft.Extensions.Configuration` with user secrets
- Example: `.AddUserSecrets()` for NuGet API key retrieval
- `appconfig.json` is copied on build (`CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>`)

### XML Handling (CloudPackProject)
- Load with `XDocument.Load(..., LoadOptions.PreserveWhitespace)` to maintain formatting
- Save with `XmlWriter` settings: Indent=true, IndentChars="  "
- Always null-check XElement navigation; use `??` or guard clauses

### Error Handling
- **CloudPack**: Multi-line MSBuild error parsing
  - First: Look for lines containing ": error " (MSBuild standard)
  - Fallback: All non-empty lines from stderr
  - Final fallback: First non-empty stdout line
- Example: `error NETSDK1001...` or `error NU...`

### Formatting Output
- Use `ConsoleHelper.EnsureConsoleSetup()` to configure console for Unicode (CloudMate.Package/Program.cs)
- `ModernConsoleLogger` for styled console output

## Build & Test

### Build
- Solution: `CloudMate.sln` (two projects)
- Target: `.NET 10`
- Standard: `dotnet build` or via VS

### Package Publishing (CloudMate.Package)
- Executable reads `appconfig.json` + user secrets for NuGet API key
- `CloudPackProject` identifies projects by name (e.g., "CloudMate.Server")
- Uses `.csproj` path pattern: `../../../../{Name}/{Name}.csproj`
- Metadata properties passed as array: `["PropertyGroup/Authors", "PropertyGroup/AssemblyVersion", ...]`

### Testing
- No dedicated test projects found; validation is integration-based (actual packing/publishing)
- Manual CLI testing: `mate` command variants (dev, dist, watch, etc.)

## Common Tasks

### Adding a New Code Generation Feature
1. Extend `ProjectConfiguration` or create builder in `CloudCode`
2. Use `StringBuilder.AppendLine()` with proper indentation (`\t` characters)
3. Test XML output with MSBuild parser (XDocument validation)

### Modifying Packaging Behavior
1. Update `CloudPack.cs` orchestration or retry logic
2. Ensure error messages follow MSBuild format parsing (": error ")
3. Test with real projects in CloudMate.Package

### Changing Distribution Target
1. Update project `<TargetFramework>` (currently `net10.0`)
2. Verify buildTransitive target compatibility with host .NET version

## External Dependencies
- **Core Libraries**: System.Xml.Linq, System.IO.Compression
- **NuGet**: Microsoft.Extensions.Configuration, Microsoft.Extensions.Configuration.UserSecrets
- **No external formatters**: Built-in StringBuilder/XmlWriter (not Roslyn or ANTLR)

## Namespace Convention
- Primary: `AngryMonkey.CloudMate`
- Project root classes use static methods (e.g., `CloudCode.GenerateProject(...)`)
- Partial classes for feature organization (see `Build.cs`, `General.cs` in Formatter)
