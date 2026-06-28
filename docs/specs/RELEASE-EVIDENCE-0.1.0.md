# Release Evidence: 0.1.0

**Date:** 2026-06-28

This file records the local evidence for the first Marketplace release
candidate of `styio-language-support`.

## Artifact

- VSIX: `dist/styio-language-support.vsix`
- SHA256: `71A31F92BC5D8D6838A6F8CAC2AC20F55382948BF1D0667FB5DE45D3AF6ACB85`
- Marketplace item id: `eBioRing.styio-language-support`
- Marketplace state at audit time: not currently published

## Extension Gates

The following gates passed on Windows with
`STYIO_LSPD_PATH` pointing at a local `styio_lspd.exe` build:

- `npm run check`
- `npm run release:preflight`
- `npm run release:evidence-check`
- `npm run package:vsix`
- `npm run test:resolver`
- `npm run test:lsp-wire`
- `npm run test:e2e`
- `npm run test:smoke`
- `.\scripts\checkpoint-health.ps1`
- `npm audit` against `https://registry.npmjs.org/`
- `python scripts/repo-hygiene-gate.py --mode tracked`

`npm run release:account-check` confirmed the Marketplace item id was not
already published, then stopped because `VSCE_PAT was not set` in the local
environment.

## VSIX Contents

The packaged extension contains only the runtime and Marketplace-facing files:

- `LICENSE.txt`
- `SUPPORT.md`
- `changelog.md`
- `language-configuration.json`
- `package.json`
- `readme.md`
- `assets/icon.png`
- `out/extension.js`
- `snippets/styio.code-snippets`
- `syntaxes/styio.tmLanguage.json`

Repository-only governance files, docs, source, tests, scripts, CI workflows,
and caches are excluded by `.vscodeignore`.

## Upstream Evidence

The upstream Styio language server fix has been isolated onto the clean branch
`codex/lsp-windows-stdio-binary` from base commit
`73531629b4350c296bb1aa584aa3b3ce95bd8f6f`. That branch contains only the
Windows stdio binary-mode fix, its CTest, and
`docs/adr/ADR-0121-lsp-windows-stdio-binary-mode.md`.

The CTest `styio_lspd_stdio_framing` passed against the clean-branch Windows
build. It starts the real `styio_lspd` executable, sends an `initialize`
request, reads raw stdout bytes, and rejects malformed LSP boundaries such as
`\r\r\n\r\r\n`.

## Remaining External Gates

This candidate should not be considered published until:

1. the `eBioRing` Marketplace publisher is confirmed;
2. `VSCE_PAT` is configured and `npm run release:account-check` passes;
3. the upstream `styio_lspd` Windows stdio fix and CTest are merged into the
   Styio release channel that users will install; and
4. `.github/workflows/publish-marketplace.yml` publishes the tagged release or a
   maintainer manually publishes the verified VSIX.
