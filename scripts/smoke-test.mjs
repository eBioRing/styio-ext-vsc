#!/usr/bin/env node

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import testElectron from '@vscode/test-electron';

const { downloadAndUnzipVSCode, killTree, runVSCodeCommand } = testElectron;

const EXTENSION_ID = 'ebioring.styio-language-support';
const VSIX_PATH = path.resolve('dist', 'styio-language-support.vsix');
const WORKSPACE = path.resolve('test', 'fixtures', 'workspace');
const ENTRY_FILE = path.join(WORKSPACE, 'main.styio');

function log(message) {
  console.log(`[smoke] ${message}`);
}

function fail(message) {
  throw new Error(`[smoke] ${message}`);
}

async function waitFor(label, producer, predicate, timeoutMs = 45000) {
  const started = Date.now();
  let lastValue;
  while (Date.now() - started < timeoutMs) {
    lastValue = await producer();
    if (predicate(lastValue)) {
      return lastValue;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  fail(`Timed out waiting for ${label}. Last value: ${String(lastValue ?? '')}`);
}

function readTextFiles(root) {
  if (!fs.existsSync(root)) {
    return '';
  }

  let output = '';
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      output += readTextFiles(entryPath);
    } else if (entry.name.endsWith('.log') || entry.name.endsWith('.txt')) {
      try {
        output += fs.readFileSync(entryPath, 'utf8');
        output += '\n';
      } catch {
        // Logs may be briefly locked while VS Code is running.
      }
    }
  }
  return output;
}

function hasLspEnvironment() {
  return Boolean(process.env.STYIO_LSPD_PATH || process.env.STYIO_NIGHTLY_ROOT);
}

function isLspdRunning() {
  try {
    if (process.platform === 'win32') {
      const stdout = execFileSync('tasklist', ['/fi', 'imagename eq styio_lspd.exe', '/nh'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      });
      return stdout.toLowerCase().includes('styio_lspd.exe');
    }

    execFileSync('pgrep', ['-x', 'styio_lspd'], {
      encoding: 'utf8',
      stdio: 'ignore'
    });
    return true;
  } catch {
    return false;
  }
}

function stopTempProcesses(tmpRoot) {
  if (process.platform !== 'win32') {
    return;
  }

  const escapedTmp = tmpRoot.replace(/'/g, "''");
  const script = [
    '$targets = Get-CimInstance Win32_Process | Where-Object {',
    `  $_.CommandLine -like '*${escapedTmp}*'`,
    '}',
    'foreach ($target in $targets) {',
    '  Stop-Process -Id $target.ProcessId -Force -ErrorAction SilentlyContinue',
    '}'
  ].join('\n');

  try {
    execFileSync('powershell', ['-NoProfile', '-Command', script], {
      stdio: 'ignore'
    });
  } catch {
    // Best effort cleanup only.
  }
}

async function removeTempRoot(tmpRoot) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      fs.rmSync(tmpRoot, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 250
      });
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return false;
}

async function main() {
  log('=== Styio VS Code Extension - Marketplace Smoke Test ===');

  if (!fs.existsSync(VSIX_PATH)) {
    fail(`VSIX not found: ${VSIX_PATH}. Run npm run package:vsix first.`);
  }
  if (!fs.existsSync(ENTRY_FILE)) {
    fail(`Smoke fixture not found: ${ENTRY_FILE}`);
  }

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'styio-smoke-'));
  const userDataDir = path.join(tmpRoot, 'user-data');
  const extensionsDir = path.join(tmpRoot, 'extensions');
  fs.mkdirSync(userDataDir, { recursive: true });
  fs.mkdirSync(extensionsDir, { recursive: true });

  let codeProcess;
  try {
    const profileArgs = [`--user-data-dir=${userDataDir}`, `--extensions-dir=${extensionsDir}`];

    log(`VSIX: ${VSIX_PATH}`);
    log(`Workspace: ${WORKSPACE}`);
    log(`Temp profile: ${tmpRoot}`);
    log('Installing VSIX into clean profile...');
    await runVSCodeCommand([...profileArgs, '--install-extension', VSIX_PATH, '--force']);

    const installed = await runVSCodeCommand([
      ...profileArgs,
      '--list-extensions',
      '--show-versions'
    ]);
    if (!installed.stdout.toLowerCase().includes(`${EXTENSION_ID}@0.1.0`)) {
      fail(`Installed extension list did not include ${EXTENSION_ID}@0.1.0`);
    }
    log(`Installed extension confirmed: ${EXTENSION_ID}@0.1.0`);

    const vscodeExecutablePath = await downloadAndUnzipVSCode();
    log('Launching VS Code with a Styio file...');
    codeProcess = spawn(
      vscodeExecutablePath,
      [...profileArgs, '--new-window', WORKSPACE, ENTRY_FILE],
      {
        env: process.env,
        stdio: 'ignore',
        windowsHide: true
      }
    );

    await waitFor(
      'onLanguage:styio activation log',
      () => readTextFiles(path.join(userDataDir, 'logs')),
      (logs) => {
        const normalizedLogs = logs.toLowerCase();
        return (
          normalizedLogs.includes('ebioring.styio-language-support') &&
          (normalizedLogs.includes("activationevent: 'onlanguage:styio'") ||
            normalizedLogs.includes("activationevent: 'api'"))
        );
      }
    );
    log('Activation log confirmed.');

    if (hasLspEnvironment()) {
      await waitFor('styio_lspd process', isLspdRunning, Boolean, 30000);
      log('styio_lspd process confirmed.');
    } else {
      log('STYIO_LSPD_PATH/STYIO_NIGHTLY_ROOT not set; skipped LSP process check.');
    }

    log('=== Smoke test completed successfully ===');
  } finally {
    if (codeProcess?.pid) {
      try {
        await killTree(codeProcess.pid, true);
      } catch {
        codeProcess.kill();
      }
    }
    stopTempProcesses(tmpRoot);
    if (await removeTempRoot(tmpRoot)) {
      log(`Cleaned up: ${tmpRoot}`);
    } else {
      log(`Warning: temp profile is still locked and was left in place: ${tmpRoot}`);
    }
  }
}

await main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
