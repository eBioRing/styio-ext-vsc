import * as vscode from 'vscode';
import { createStyioLanguageClient, StyioClientHandle } from './lsp/client';
import { resolveStyioServer, serverNotFoundMessage } from './lsp/serverResolver';

const clients = new Map<string, StyioClientHandle>();
let outputChannel: vscode.LogOutputChannel;

function folderKey(folder: vscode.WorkspaceFolder): string {
  return folder.uri.toString();
}

function serverEnabled(folder?: vscode.WorkspaceFolder): boolean {
  return vscode.workspace
    .getConfiguration('styio', folder?.uri)
    .get<boolean>('server.enabled', true);
}

async function startClientForFolder(
  folder: vscode.WorkspaceFolder,
  includeUntitled: boolean
): Promise<void> {
  if (!serverEnabled(folder)) {
    outputChannel.appendLine(`Styio language server disabled for ${folder.name}.`);
    return;
  }

  const key = folderKey(folder);
  if (clients.has(key)) {
    return;
  }

  const server = await resolveStyioServer(folder);
  if (!server) {
    outputChannel.appendLine(serverNotFoundMessage());
    void vscode.window
      .showErrorMessage(serverNotFoundMessage(), 'Select Server')
      .then(async (choice) => {
        if (choice === 'Select Server') {
          await selectLanguageServer();
        }
      });
    return;
  }

  const handle = createStyioLanguageClient(folder, server, outputChannel, includeUntitled);
  clients.set(key, handle);
  await handle.client.start();
}

async function stopClientForFolder(folder: vscode.WorkspaceFolder): Promise<void> {
  const key = folderKey(folder);
  const handle = clients.get(key);
  if (!handle) {
    return;
  }

  clients.delete(key);
  await handle.client.stop();
  outputChannel.appendLine(`Styio language server stopped for ${folder.name}.`);
}

async function startAllClients(): Promise<void> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  await Promise.all(folders.map((folder, index) => startClientForFolder(folder, index === 0)));
}

async function stopAllClients(): Promise<void> {
  const handles = Array.from(clients.values());
  clients.clear();
  await Promise.all(handles.map((handle) => handle.client.stop()));
}

async function restartLanguageServer(): Promise<void> {
  outputChannel.appendLine('Restarting Styio language server clients.');
  await stopAllClients();
  await startAllClients();
}

async function selectLanguageServer(): Promise<void> {
  const selection = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    title: 'Select styio_lspd'
  });

  const selected = selection?.[0];
  if (!selected) {
    return;
  }

  await vscode.workspace
    .getConfiguration('styio')
    .update('server.path', selected.fsPath, vscode.ConfigurationTarget.Global);
  await restartLanguageServer();
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  outputChannel = vscode.window.createOutputChannel('Styio', { log: true });
  context.subscriptions.push(outputChannel);

  context.subscriptions.push(
    vscode.commands.registerCommand('styio.restartLanguageServer', restartLanguageServer),
    vscode.commands.registerCommand('styio.selectLanguageServer', selectLanguageServer),
    vscode.commands.registerCommand('styio.showOutput', () => outputChannel.show())
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(async (event) => {
      await Promise.all(event.removed.map((folder) => stopClientForFolder(folder)));
      const existingHasUntitled = clients.size > 0;
      await Promise.all(
        event.added.map((folder, index) =>
          startClientForFolder(folder, !existingHasUntitled && index === 0)
        )
      );
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (event.affectsConfiguration('styio')) {
        await restartLanguageServer();
      }
    })
  );

  await startAllClients();
}

export async function deactivate(): Promise<void> {
  await stopAllClients();
}
