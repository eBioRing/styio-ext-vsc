#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';

const grammarPath = 'syntaxes/styio.tmLanguage.json';
const fixtureDir = path.join('test', 'fixtures', 'grammar');
const fixtures = fs
  .readdirSync(fixtureDir)
  .filter((entry) => entry.endsWith('.styio'))
  .map((entry) => path.join(fixtureDir, entry).replaceAll(path.sep, '/'));

const executable =
  process.platform === 'win32'
    ? path.join('node_modules', '.bin', 'vscode-tmgrammar-test.cmd')
    : path.join('node_modules', '.bin', 'vscode-tmgrammar-test');

const result = spawnSync(executable, ['-g', grammarPath, `${fixtureDir}/*.styio`], {
  encoding: 'utf8',
  shell: process.platform === 'win32'
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

if (result.stdout) {
  process.stdout.write(result.stdout);
}
if (result.stderr) {
  process.stderr.write(result.stderr);
}

if (result.status === 0) {
  process.exit(0);
}

const combinedOutput = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
const hasWindowsCleanupAssertion =
  process.platform === 'win32' &&
  combinedOutput.includes('Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)');
const allFixturesPassed = fixtures.every((fixture) =>
  combinedOutput.includes(`${fixture} run successfuly`)
);

if (hasWindowsCleanupAssertion && allFixturesPassed) {
  console.warn(
    'vscode-tmgrammar-test completed all fixtures, then hit the known Windows Node/libuv cleanup assertion.'
  );
  process.exit(0);
}

process.exit(result.status ?? 1);
