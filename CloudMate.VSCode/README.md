# CloudMate VS Code Extension

Integrates the [CloudMate](https://github.com/angrymonkeycloud/CloudMate) asset bundling CLI into VS Code.

## Prerequisites

Install the `mate` dotnet CLI tool globally:

```bash
dotnet tool install -g AngryMonkey.CloudMate.CLI
```

## Features

- **Build** — runs `mate` (dev build) in the workspace root
- **Build All** — runs `mate --all` (all defined builds)
- **Watch** — runs `mate --watch` and keeps rebuilding on file changes
- **Stop Watch** — terminates the watch process

All commands are available in:
- The Command Palette (`Ctrl+Shift+P`)
- The Explorer context menu (right-click on `.ts`, `.less`, `.scss`, `.sass`, `.css`, `.js`, config files, or folders)
- Status bar buttons at the bottom of the window

## Status Bar

Four buttons are always visible in the status bar when a CloudMate config is detected:

| Button | Action |
|--------|--------|
| `$(play) Build` | Run dev build |
| `$(run-all) Build All` | Run all builds |
| `$(eye) Watch` | Start watch mode |
| `$(debug-stop) Stop` | Stop watch |

The **Watch** button is highlighted while a watch process is running.

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `cloudmate.matePath` | `mate` | Path to the `mate` executable. Useful if mate is not on PATH. |

## Getting Started

1. Open a project that contains a `.mateconfig`, `.mateconfig.json`, `.mateconfig.yaml`, or `mateconfig.json` file.
2. The status bar buttons will appear automatically.
3. Press `$(play) Build` or open the Command Palette and run **CloudMate: Build**.
