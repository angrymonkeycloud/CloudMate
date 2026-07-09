import * as vscode from 'vscode';
import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';

// ─── State ──────────────────────────────────────────────────────────────────

let outputChannel: vscode.OutputChannel;
let watchProcess: ChildProcess | null = null;

let buildButton: vscode.StatusBarItem;
let buildAllButton: vscode.StatusBarItem;
let watchButton: vscode.StatusBarItem;
let stopButton: vscode.StatusBarItem;

// ─── Activation ─────────────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext): void {
    outputChannel = vscode.window.createOutputChannel('CloudMate');

    registerCommands(context);
    registerStatusBar(context);

    // Reflect initial watch state in status bar.
    setWatchContext(false);
}

export function deactivate(): void {
    killWatchProcess();
}

// ─── Command registration ───────────────────────────────────────────────────

function registerCommands(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('cloudmate.build', () => runMate([])),
        vscode.commands.registerCommand('cloudmate.buildAll', () => runMate(['--all'])),
        vscode.commands.registerCommand('cloudmate.watch', startWatch),
        vscode.commands.registerCommand('cloudmate.stopWatch', stopWatch),
    );
}

// ─── Status bar ─────────────────────────────────────────────────────────────

function registerStatusBar(context: vscode.ExtensionContext): void {
    // Priority decreases left→right so the group stays together.
    buildButton = createStatusBarButton('$(play) Build', 'CloudMate: Build', 'cloudmate.build', 102);
    buildAllButton = createStatusBarButton('$(run-all) Build All', 'CloudMate: Build All', 'cloudmate.buildAll', 101);
    watchButton = createStatusBarButton('$(eye) Watch', 'CloudMate: Watch', 'cloudmate.watch', 100);
    stopButton = createStatusBarButton('$(debug-stop) Stop', 'CloudMate: Stop Watch', 'cloudmate.stopWatch', 99);

    context.subscriptions.push(buildButton, buildAllButton, watchButton, stopButton);

    buildButton.show();
    buildAllButton.show();
    watchButton.show();
    stopButton.show();
}

function createStatusBarButton(
    text: string,
    tooltip: string,
    command: string,
    priority: number,
): vscode.StatusBarItem {
    const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, priority);
    item.text = text;
    item.tooltip = tooltip;
    item.command = command;
    return item;
}

// ─── mate process helpers ────────────────────────────────────────────────────

function getMatePath(): string {
    return vscode.workspace.getConfiguration('cloudmate').get<string>('matePath', 'mate');
}

function getWorkspaceRoot(): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    return folders && folders.length > 0 ? folders[0].uri.fsPath : undefined;
}

function runMate(args: string[]): void {
    const cwd = getWorkspaceRoot();

    if (!cwd) {
        vscode.window.showErrorMessage('CloudMate: No workspace folder is open.');
        return;
    }

    const matePath = getMatePath();

    outputChannel.show(true);
    outputChannel.appendLine('');
    outputChannel.appendLine(`> ${matePath} ${args.join(' ')}`);
    outputChannel.appendLine('');

    const proc = spawn(matePath, args, { cwd, shell: true });

    proc.stdout?.on('data', (data: Buffer) => {
        outputChannel.append(data.toString());
    });

    proc.stderr?.on('data', (data: Buffer) => {
        outputChannel.append(data.toString());
    });

    proc.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'ENOENT') {
            outputChannel.appendLine(`\n[CloudMate] Error: '${matePath}' was not found on PATH.`);
            outputChannel.appendLine(`[CloudMate] Install it with: dotnet tool install -g AngryMonkey.CloudMate.CLI`);
            vscode.window.showErrorMessage(
                `CloudMate: '${matePath}' not found. Install with: dotnet tool install -g AngryMonkey.CloudMate.CLI`,
                'Copy Command',
            ).then(action => {
                if (action === 'Copy Command')
                    vscode.env.clipboard.writeText('dotnet tool install -g AngryMonkey.CloudMate.CLI');
            });
        } else {
            outputChannel.appendLine(`\n[CloudMate] Error: ${err.message}`);
        }
    });

    proc.on('close', (code: number | null) => {
        outputChannel.appendLine('');
        outputChannel.appendLine(`[CloudMate] Process exited with code ${code ?? 0}.`);
    });
}

// ─── Watch ──────────────────────────────────────────────────────────────────

function startWatch(): void {
    if (watchProcess !== null) {
        vscode.window.showInformationMessage('CloudMate: Watch is already running.');
        return;
    }

    const cwd = getWorkspaceRoot();

    if (!cwd) {
        vscode.window.showErrorMessage('CloudMate: No workspace folder is open.');
        return;
    }

    const matePath = getMatePath();

    outputChannel.show(true);
    outputChannel.appendLine('');
    outputChannel.appendLine(`> ${matePath} --watch`);
    outputChannel.appendLine('');

    watchProcess = spawn(matePath, ['--watch'], { cwd, shell: true });

    watchProcess.stdout?.on('data', (data: Buffer) => {
        outputChannel.append(data.toString());
    });

    watchProcess.stderr?.on('data', (data: Buffer) => {
        outputChannel.append(data.toString());
    });

    watchProcess.on('error', (err: NodeJS.ErrnoException) => {
        watchProcess = null;
        setWatchContext(false);

        if (err.code === 'ENOENT') {
            outputChannel.appendLine(`\n[CloudMate] Error: '${matePath}' was not found on PATH.`);
            outputChannel.appendLine(`[CloudMate] Install it with: dotnet tool install -g AngryMonkey.CloudMate.CLI`);
            vscode.window.showErrorMessage(
                `CloudMate: '${matePath}' not found. Install with: dotnet tool install -g AngryMonkey.CloudMate.CLI`,
            );
        } else {
            outputChannel.appendLine(`\n[CloudMate] Error: ${err.message}`);
        }
    });

    watchProcess.on('close', (code: number | null) => {
        watchProcess = null;
        setWatchContext(false);
        outputChannel.appendLine('');
        outputChannel.appendLine(`[CloudMate] Watch process exited with code ${code ?? 0}.`);
    });

    setWatchContext(true);
}

function stopWatch(): void {
    if (watchProcess === null) {
        vscode.window.showInformationMessage('CloudMate: No watch process is running.');
        return;
    }

    killWatchProcess();
    outputChannel.appendLine('[CloudMate] Watch stopped.');
}

function killWatchProcess(): void {
    if (watchProcess !== null) {
        watchProcess.kill();
        watchProcess = null;
        setWatchContext(false);
    }
}

// ─── Context / UI state ──────────────────────────────────────────────────────

function setWatchContext(watching: boolean): void {
    vscode.commands.executeCommand('setContext', 'cloudmate.watching', watching);

    if (watching) {
        watchButton.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        watchButton.tooltip = 'CloudMate: Watch is running — click to stop';
        watchButton.command = 'cloudmate.stopWatch';
        stopButton.show();
    } else {
        watchButton.backgroundColor = undefined;
        watchButton.tooltip = 'CloudMate: Watch';
        watchButton.command = 'cloudmate.watch';
    }
}
