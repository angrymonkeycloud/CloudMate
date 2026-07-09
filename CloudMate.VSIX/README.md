# CloudMate Visual Studio Extension

Integrates the [CloudMate](https://github.com/angrymonkeycloud/CloudMate) asset bundling CLI into Visual Studio 2026.

## Prerequisites

Install the `mate` dotnet CLI tool globally:

```bash
dotnet tool install -g AngryMonkey.CloudMate.CLI
```

## Features

- **Build** — runs `mate` (dev build) in the solution directory
- **Build All** — runs `mate --all` (all defined builds)  
- **Watch / Stop Watch** — toggles `mate --watch` mode; rebuilds automatically on `.ts`, `.less`, `.scss`, `.sass`, `.css`, `.js` changes
- **Auto-rebuild on save** — when Watch is active, any change to a supported file triggers a rebuild

## Context Menus

Right-click in Solution Explorer on:
- `.ts`, `.less`, `.scss`, `.sass`, `.css`, `.js` files
- `.mateconfig`, `.mateconfig.json`, `.mateconfig.yaml`, `mateconfig.json` config files
- Project nodes
- Folders

## Output Window

All `mate` output is streamed to the **CloudMate** pane in the Output window.

## Tools Menu

Commands are also available under **Tools › CloudMate**.

## Configuration

A **Tools › Options › CloudMate** page lets you configure:

| Option | Default | Description |
|--------|---------|-------------|
| Mate Path | `mate` | Path to the `mate` executable (useful if not on PATH) |

## Getting Started

1. Build and install the VSIX from `CloudMate.VSIX/` (`dotnet build` or open in VS and press F5).
2. Open a solution that contains a `.mateconfig` (or similar) file.
3. Right-click any `.ts`, `.less`, `.scss`, or other supported file and select **CloudMate › Build**.
