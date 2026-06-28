#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import * as path from 'node:path';

const publisher = 'eBioRing';
const extensionId = `${publisher}.styio-language-support`;
const vsceBin = path.join(process.cwd(), 'node_modules', '@vscode', 'vsce', 'vsce');

function runVsce(args, options = {}) {
  return spawnSync(process.execPath, [vsceBin, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: false,
    ...options
  });
}

function runVsceWithRetry(args, label) {
  let lastResult;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    lastResult = runVsce(args);
    const output = `${lastResult.stdout ?? ''}${lastResult.stderr ?? ''}`;
    if (!/network socket|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN/i.test(output)) {
      return lastResult;
    }
    if (attempt < 3) {
      console.error(`${label}: transient network failure, retrying (${attempt}/3).`);
    }
  }
  return lastResult;
}

function printCommandResult(label, result) {
  const stdout = (result.stdout ?? '').trim();
  const stderr = (result.stderr ?? '').trim();
  if (stdout) {
    console.log(`${label}: ${stdout}`);
  }
  if (stderr) {
    console.error(`${label}: ${stderr}`);
  }
}

function main() {
  const show = runVsceWithRetry(['show', extensionId], 'vsce show');
  const showOutput = `${show.stdout ?? ''}${show.stderr ?? ''}`;
  if (showOutput.includes('not found')) {
    console.log(`${extensionId} is not currently published on Marketplace.`);
  } else if (show.status === 0) {
    console.log(`${extensionId} already exists on Marketplace.`);
  } else {
    printCommandResult('vsce show', show);
    throw new Error(`Could not determine Marketplace state for ${extensionId}.`);
  }

  if (!process.env.VSCE_PAT) {
    throw new Error(
      'VSCE_PAT is not set. Set a Marketplace PAT with publisher access and run this check again.'
    );
  }

  const verify = runVsce(['verify-pat', publisher], {
    env: process.env
  });
  printCommandResult('vsce verify-pat', verify);
  if (verify.status !== 0) {
    throw new Error(`VSCE_PAT did not verify for publisher ${publisher}.`);
  }

  console.log(`Marketplace account check passed for publisher ${publisher}.`);
}

try {
  main();
} catch (error) {
  console.error(`release account check failed: ${error.message}`);
  process.exitCode = 1;
}
