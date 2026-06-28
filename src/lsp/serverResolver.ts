import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';

export interface ResolvedServer {
  command: string;
  source: string;
  shell?: boolean;
}

const windowsExecutableSuffixes = ['.exe', '.cmd', '.bat'];

export function executableNamesForPlatform(platform = process.platform): string[] {
  if (platform !== 'win32') {
    return ['styio_lspd'];
  }

  return windowsExecutableSuffixes.map((suffix) => `styio_lspd${suffix}`);
}

export function commandCandidatesForPlatform(
  command: string,
  platform = process.platform
): string[] {
  if (platform !== 'win32' || path.extname(command)) {
    return [command];
  }

  return [...windowsExecutableSuffixes.map((suffix) => `${command}${suffix}`), command];
}

export function serverNeedsShellForPlatform(command: string, platform = process.platform): boolean {
  if (platform !== 'win32') {
    return false;
  }

  const extension = path.extname(command).toLowerCase();
  return extension === '.cmd' || extension === '.bat';
}

function resolvedServer(command: string, source: string): ResolvedServer {
  const shell = serverNeedsShellForPlatform(command);
  return shell ? { command, source, shell } : { command, source };
}

function existsAsFile(candidate: string): boolean {
  try {
    return fs.statSync(candidate).isFile();
  } catch {
    return false;
  }
}

function hasPathSeparator(value: string): boolean {
  return value.includes('/') || value.includes('\\');
}

function findOnPath(commandNames = executableNamesForPlatform()): ResolvedServer | undefined {
  const pathEnv = process.env.PATH ?? '';
  for (const dir of pathEnv.split(path.delimiter)) {
    if (!dir) {
      continue;
    }
    for (const name of commandNames) {
      const candidate = path.join(dir, name);
      if (existsAsFile(candidate)) {
        return resolvedServer(candidate, 'PATH');
      }
    }
  }
  return undefined;
}

function siblingBuildCandidates(root: string): string[] {
  const candidates: string[] = [];
  for (const name of executableNamesForPlatform()) {
    candidates.push(path.join(root, 'build', 'default', 'bin', name));
    candidates.push(path.join(root, 'build', 'ci', 'bin', name));
    candidates.push(path.join(root, 'build', 'windows', 'bin', name));
  }

  const buildRoot = path.join(root, 'build');
  if (fs.existsSync(buildRoot)) {
    for (const entry of fs.readdirSync(buildRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }
      for (const name of executableNamesForPlatform()) {
        candidates.push(path.join(buildRoot, entry.name, 'bin', name));
      }
    }
  }

  return candidates;
}

function resolveConfiguredPath(
  configuredPath: string,
  baseDirectory?: string,
  source = 'styio.server.path'
): ResolvedServer | undefined {
  const trimmed = configuredPath.trim();
  if (!trimmed) {
    return undefined;
  }

  if (!path.isAbsolute(trimmed) && !hasPathSeparator(trimmed)) {
    return findOnPath(commandCandidatesForPlatform(trimmed));
  }

  const absolute = path.isAbsolute(trimmed)
    ? trimmed
    : path.resolve(baseDirectory ?? process.cwd(), trimmed);
  for (const candidate of commandCandidatesForPlatform(absolute)) {
    if (existsAsFile(candidate)) {
      return resolvedServer(candidate, source);
    }
  }

  return undefined;
}

export async function resolveStyioServer(
  folder?: vscode.WorkspaceFolder
): Promise<ResolvedServer | undefined> {
  const configuration = vscode.workspace.getConfiguration('styio', folder?.uri);
  const configuredPath = configuration.get<string>('server.path', '');
  const configured = resolveConfiguredPath(configuredPath, folder?.uri.fsPath);
  if (configured) {
    return configured;
  }

  const envPath = process.env.STYIO_LSPD_PATH;
  const envServer = envPath
    ? resolveConfiguredPath(envPath, folder?.uri.fsPath, 'STYIO_LSPD_PATH')
    : undefined;
  if (envServer) {
    return envServer;
  }

  const nightlyRoot = process.env.STYIO_NIGHTLY_ROOT;
  if (nightlyRoot) {
    for (const candidate of siblingBuildCandidates(path.resolve(nightlyRoot))) {
      if (existsAsFile(candidate)) {
        return resolvedServer(candidate, 'STYIO_NIGHTLY_ROOT');
      }
    }
  }

  return findOnPath();
}

export function serverNotFoundMessage(): string {
  return [
    'Styio language server was not found.',
    'Set styio.server.path, set STYIO_LSPD_PATH, set STYIO_NIGHTLY_ROOT, or put styio_lspd on PATH.'
  ].join(' ');
}
