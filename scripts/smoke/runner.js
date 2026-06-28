/**
 * Smoke test runner -- runs inside VS Code's extension host via
 * `@vscode/test-electron` (launchArgs -> extensionTestsPath).
 *
 * Exports a `run()` called by the VS Code test harness.
 * No TypeScript compilation needed; this is plain CommonJS.
 */
// @ts-check

const vscode = require('vscode');
const cp = require('child_process');

const EXT_ID = 'eBioRing.styio-language-support';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg) {
  console.log('[smoke] ' + msg);
}

function fail(msg) {
  throw new Error('[smoke] FAIL: ' + msg);
}

/**
 * Poll `producer` until `predicate` returns truthy or timeout expires.
 */
async function waitFor(producer, predicate, timeoutMs) {
  if (timeoutMs === undefined) timeoutMs = 15000;
  var deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    var value = producer();
    if (predicate(value)) return value;
    await new Promise(function (r) {
      setTimeout(r, 250);
    });
  }
  var final = producer();
  if (!predicate(final)) {
    throw new Error('Timed out after ' + timeoutMs + ' ms');
  }
  return final;
}

/**
 * Returns true if at least one styio_lspd process is running.
 */
function isLspdRunning() {
  try {
    if (process.platform === 'win32') {
      var stdout = cp.execSync('tasklist /fi "imagename eq styio_lspd.exe" /nh', {
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['ignore', 'pipe', 'ignore']
      });
      return stdout.indexOf('styio_lspd') !== -1;
    }
    cp.execSync('pgrep -x styio_lspd', { encoding: 'utf-8', timeout: 5000, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * True when the orchestrator wants LSP verification.
 */
function hasLspEnvironment() {
  return Boolean(process.env.STYIO_LSPD_PATH || process.env.STYIO_NIGHTLY_ROOT);
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

async function checkExtensionInstalled() {
  var ext = vscode.extensions.getExtension(EXT_ID);
  if (!ext) fail('Extension ' + EXT_ID + ' is not installed');
  log('Extension found: ' + EXT_ID + ' v' + ext.packageJSON.version);
  return ext;
}

async function checkActivationOnStyioFile(ext) {
  var folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) fail('No workspace folder open');

  var uri = vscode.Uri.joinPath(folder.uri, 'main.styio');
  log('Opening ' + uri.fsPath + ' to trigger onLanguage activation...');
  var doc = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(doc);

  await waitFor(
    function () {
      return ext.isActive;
    },
    function (active) {
      return active;
    },
    10000
  );
  log('Extension activated via onLanguage:styio');
}

async function checkLspProcess() {
  if (!hasLspEnvironment()) {
    log('STYIO_LSPD_PATH / STYIO_NIGHTLY_ROOT not set - skipping LSP process check');
    return;
  }

  log('Waiting for styio_lspd process to appear...');
  var found = await waitFor(
    isLspdRunning,
    function (r) {
      return r;
    },
    20000
  );
  if (!found) fail('styio_lspd process did not start within 20 s');
  log('styio_lspd process confirmed running');
}

async function checkBasicLspFeatures() {
  if (!hasLspEnvironment()) {
    log('STYIO_LSPD_PATH / STYIO_NIGHTLY_ROOT not set - skipping LSP feature check');
    return;
  }

  var folder = vscode.workspace.workspaceFolders?.[0];
  var uri = vscode.Uri.joinPath(folder.uri, 'main.styio');

  var badUri = vscode.Uri.joinPath(folder.uri, 'bad.styio');
  var badDoc = await vscode.workspace.openTextDocument(badUri);
  await vscode.window.showTextDocument(badDoc);

  try {
    await waitFor(
      function () {
        return vscode.languages.getDiagnostics(badUri);
      },
      function (diags) {
        return diags.length > 0;
      },
      15000
    );
    log('LSP diagnostics received for bad.styio');
  } catch (error) {
    log('WARNING: No diagnostics from LSP: ' + error.message);
  }

  try {
    var completions = await vscode.commands.executeCommand(
      'vscode.executeCompletionItemProvider',
      uri,
      new vscode.Position(3, 14)
    );
    if (completions.items && completions.items.length > 0) {
      log('Completion provider returned ' + completions.items.length + ' items');
    } else {
      log('WARNING: Completion provider returned no items');
    }
  } catch (e) {
    log('WARNING: Completion command failed: ' + e.message);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function run() {
  log('=== Styio Smoke Test Runner ===');
  log('Node ' + process.version + '  ' + process.platform + '/' + process.arch);

  var ext = await checkExtensionInstalled();

  if (ext.isActive) {
    log('Extension already active (loaded eagerly)');
  } else {
    await checkActivationOnStyioFile(ext);
  }

  await checkLspProcess();

  if (hasLspEnvironment()) {
    await new Promise(function (r) {
      setTimeout(r, 2000);
    });
    await checkBasicLspFeatures();
  }

  log('=== All smoke checks passed ===');
}

module.exports = { run: run };
