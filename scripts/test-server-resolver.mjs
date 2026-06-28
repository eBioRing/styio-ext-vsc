#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import Module from 'node:module';

const require = createRequire(import.meta.url);
const originalLoad = Module._load;

Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'vscode') {
    return {
      workspace: {
        getConfiguration() {
          return {
            get(_name, fallback) {
              return fallback;
            }
          };
        }
      }
    };
  }

  return originalLoad.call(this, request, parent, isMain);
};

try {
  const resolver = require('../out/src/lsp/serverResolver.js');

  assert.deepEqual(resolver.executableNamesForPlatform('win32'), [
    'styio_lspd.exe',
    'styio_lspd.cmd',
    'styio_lspd.bat'
  ]);
  assert.deepEqual(resolver.executableNamesForPlatform('linux'), ['styio_lspd']);

  assert.deepEqual(resolver.commandCandidatesForPlatform('styio_lspd', 'win32'), [
    'styio_lspd.exe',
    'styio_lspd.cmd',
    'styio_lspd.bat',
    'styio_lspd'
  ]);
  assert.deepEqual(resolver.commandCandidatesForPlatform('styio_lspd.exe', 'win32'), [
    'styio_lspd.exe'
  ]);
  assert.deepEqual(resolver.commandCandidatesForPlatform('styio_lspd', 'linux'), ['styio_lspd']);

  assert.equal(resolver.serverNeedsShellForPlatform('C:\\tools\\styio_lspd.cmd', 'win32'), true);
  assert.equal(resolver.serverNeedsShellForPlatform('C:\\tools\\styio_lspd.bat', 'win32'), true);
  assert.equal(resolver.serverNeedsShellForPlatform('C:\\tools\\styio_lspd.exe', 'win32'), false);
  assert.equal(resolver.serverNeedsShellForPlatform('/opt/styio_lspd.cmd', 'linux'), false);

  console.log('server resolver tests passed');
} finally {
  Module._load = originalLoad;
}
