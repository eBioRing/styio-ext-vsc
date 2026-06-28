# Styio VS Code Language Support Plan

## Summary

This repository is the VS Code extension package for Styio. The first release
promotes the old `Linter/` scaffold into a root-level extension named
`styio-language-support` with publisher `eBioRing` and Apache-2.0 licensing.

The first release is an LSP-first editor integration:

1. TextMate grammar provides immediate syntax highlighting.
2. `styio_lspd` provides diagnostics, completion, hover, definition,
   references, document symbols, workspace symbols, and semantic tokens.
3. The VS Code extension owns process startup, settings, file synchronization,
   and presentation, but does not invent compiler or semantic truth.

## Implementation

The extension contributes:

1. language id `styio`
2. extensions `.styio` and `.syo`
3. TextMate scope `source.styio`
4. snippets under `snippets/styio.code-snippets`
5. settings under `styio.server.*` and `styio.trace.server`
6. commands for restart, server selection, and output display

`syntaxes/styio.tmLanguage.yaml` is the maintained grammar source. The JSON file
is generated and checked by `scripts/check-grammar.mjs`.

The language server resolver uses this order:

1. `styio.server.path`
2. `STYIO_LSPD_PATH`
3. `STYIO_NIGHTLY_ROOT` with common `build/*/bin` layouts
4. `PATH`

Each workspace folder gets one `LanguageClient` and one `styio_lspd` process.

## Workflow

The repository reuses the fixed-toolchain and gate style from the Styio and
Vityo nightly repositories:

1. Node.js is pinned by `.nvmrc`.
2. Python is pinned by `.python-version`.
3. `repo-hygiene-gate.py` rejects generated directories, binary blobs, local
   archives, and stale generated grammar.
4. `checkpoint-health.sh` and `checkpoint-health.ps1` run dependency restore,
   local checks, release preflight, VSIX packaging, LSP wire tests, VS Code E2E
   tests, and clean profile VSIX smoke.
5. GitHub Actions run hygiene, local CI with a sibling `styio-nightly` checkout,
   upstream `styio_lspd` framing smoke, VSIX packaging/smoke, Marketplace
   publish gates, and the external `styio-audit` policy.

## Test Plan

Required local checks:

```bash
npm ci
npm run check
npm run release:preflight
npm run package:vsix
STYIO_LSPD_PATH=/path/to/styio_lspd npm run test:lsp-wire
STYIO_LSPD_PATH=/path/to/styio_lspd npm run test:e2e
STYIO_LSPD_PATH=/path/to/styio_lspd npm run test:smoke
```

`npm run grammar:test` validates core TextMate scopes for resources, functions,
operators, selectors, strings, comments, and reserved tokens.

`npm run test:lsp-wire` talks directly to `styio_lspd` over JSON-RPC and checks
completion, hover, definition, references, symbols, and semantic tokens.

`npm run test:e2e` launches VS Code and verifies the same feature surface through
VS Code commands.

`npm run test:smoke` installs the built VSIX into a clean VS Code profile,
opens a Styio fixture, confirms `onLanguage:styio` activation, and confirms the
configured `styio_lspd` process starts.

The upstream `styio-nightly` gate `styio_lspd_stdio_framing` starts the real
`styio_lspd` executable and rejects non-standard LSP response framing such as
Windows text-mode `\r\r\n\r\r\n`.

## Assumptions

1. Rename, code actions, formatting, and inlay hints are not exposed until
   `styio_lspd` advertises them.
2. TextMate grammar is a highlighting fallback, not an accepted grammar
   authority.
3. `styio_lspd` remains the owner of diagnostics and semantic facts.
4. Marketplace publisher can be changed later without changing implementation
   shape.
