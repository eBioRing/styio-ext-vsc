import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  DocumentSelector,
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  State,
  Trace,
  TransportKind
} from 'vscode-languageclient/node';
import { ResolvedServer } from './serverResolver';

export interface StyioClientHandle {
  folder: vscode.WorkspaceFolder;
  client: LanguageClient;
  server: ResolvedServer;
}

function normalizeGlobPath(fsPath: string): string {
  return fsPath.replace(/\\/g, '/');
}

function documentSelector(
  folder: vscode.WorkspaceFolder,
  includeUntitled: boolean
): DocumentSelector {
  const rootPattern = `${normalizeGlobPath(folder.uri.fsPath)}/**/*`;
  const filters: DocumentSelector = [
    {
      scheme: 'file',
      language: 'styio',
      pattern: rootPattern
    }
  ];

  if (includeUntitled) {
    filters.push({
      scheme: 'untitled',
      language: 'styio'
    });
  }

  return filters;
}

function traceFromSetting(value: string): Trace {
  switch (value) {
    case 'messages':
      return Trace.Messages;
    case 'verbose':
      return Trace.Verbose;
    default:
      return Trace.Off;
  }
}

export function createStyioLanguageClient(
  folder: vscode.WorkspaceFolder,
  server: ResolvedServer,
  outputChannel: vscode.LogOutputChannel,
  includeUntitled: boolean
): StyioClientHandle {
  const configuration = vscode.workspace.getConfiguration('styio', folder.uri);
  const extraArguments = configuration.get<string[]>('server.arguments', []);
  const trace = traceFromSetting(configuration.get<string>('trace.server', 'off'));

  const serverOptions: ServerOptions = {
    command: server.command,
    transport: TransportKind.stdio,
    args: extraArguments,
    options: {
      cwd: folder.uri.fsPath,
      env: process.env,
      shell: server.shell
    }
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: documentSelector(folder, includeUntitled),
    outputChannel,
    traceOutputChannel: outputChannel,
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(folder, '**/*.{styio,syo}')
      )
    }
  };

  const client = new LanguageClient(
    `styio-${folder.index}`,
    `Styio Language Server (${path.basename(folder.uri.fsPath)})`,
    serverOptions,
    clientOptions
  );
  void client.setTrace(trace);

  client.onDidChangeState((event) => {
    if (event.newState === State.Running) {
      outputChannel.appendLine(
        `Styio language server started for ${folder.name} from ${server.source}: ${server.command}`
      );
    }
  });

  return {
    folder,
    client,
    server
  };
}
