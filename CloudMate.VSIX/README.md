# CloudMate for Visual Studio

CloudMate integrates the `mate` CLI into Visual Studio for .NET solutions that include front-end/static assets.

- Website: https://angrymonkeycloud.com/cloudmate
- GitHub: https://github.com/angrymonkeycloud/CloudMate

## Best Use

CloudMate is best used in **.NET projects** where TypeScript/CSS pipelines and image optimization are managed alongside C# code.

## Prerequisites

Install the CloudMate CLI globally:

```bash
dotnet tool install -g AngryMonkey.CloudMate.CLI
```

## Features

- Compile and bundle static assets (`.ts`, `.js`, `.css`, `.less`, `.scss`, `.sass`)
- Configure folder-based image compression via `.mateconfig.json`
- Rebuild from config and run always-on watch behavior from Visual Studio
- Context menu integration in Solution Explorer

## Context Menu Behavior

CloudMate commands are context-aware:

- **Supported compile files** (`.ts`, `.js`, `.css`, `.less`, `.scss`, `.sass`)
  - **Compile**
  - **Recompile** + **Stop Compiling** when already configured
- **Folders**
  - **Compress** only
- **`.mateconfig.json`**
  - **Rebuild** only
- **Unsupported files / images**
  - No active CloudMate commands

## Updating Configuration

CloudMate writes configuration to `.mateconfig.json` at the project root.

Typical flow:
1. Right-click a supported file and choose **CloudMate > Compile**.
2. Right-click a folder and choose **CloudMate > Compress**.
3. Right-click `.mateconfig.json` and choose **CloudMate > Rebuild**.

To stop a file from compilation, right-click it and choose **CloudMate > Stop Compiling**.

## Output

All CloudMate output is written to the **CloudMate** pane in the Visual Studio Output window.
