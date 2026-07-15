# CloudMate VS Code Extension
[![Website](https://img.shields.io/badge/Website-angrymonkeycloud.com-0B5FFF?style=flat-square&logo=googlechrome&logoColor=white)](https://angrymonkeycloud.com/cloudmate)
[![GitHub repository](https://img.shields.io/badge/GitHub-CloudMate-181717?style=flat-square&logo=github)](https://github.com/angrymonkeycloud/CloudMate)
[![VS Code extension](https://img.shields.io/visual-studio-marketplace/v/AngryMonkey.cloudmate?style=flat-square&logo=visualstudiocode&label=VS%20Code)](https://marketplace.visualstudio.com/items?itemName=AngryMonkey.cloudmate)
[![VS Code downloads](https://img.shields.io/visual-studio-marketplace/d/AngryMonkey.cloudmate?style=flat-square&logo=visualstudiocode&label=Downloads)](https://marketplace.visualstudio.com/items?itemName=AngryMonkey.cloudmate)
[![License](https://img.shields.io/badge/License-MIT-2F855A?style=flat-square)](../LICENSE)


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

---

## Angry Monkey Cloud

This project is part of the [Angry Monkey Cloud](https://angrymonkeycloud.com) open-source ecosystem. Follow the shared [AI development instructions](https://github.com/angrymonkeycloud/CloudDocs/blob/main/docs/ai/instructions.md) and browse the [project catalog](https://angrymonkeycloud.com) and [GitHub organization](https://github.com/angrymonkeycloud).
