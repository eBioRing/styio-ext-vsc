# Release Evidence: 0.1.0

**Date:** 2026-06-28

This file records the local and CI evidence for the first Marketplace release
candidate of `styio-language-support`.

## Artifact

- VSIX: `dist/styio-language-support.vsix`
- SHA256: `D0052B3BFD600CAAC5BF355E123862A19759275B1509AACCB1887496AAD84078`
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

After the upstream Windows stdio fix reached commit
`4d843a68040401261dfdc34f77ca452cd991f1dc`, the extension LSP wire gate also
passed locally with `STYIO_LSPD_PATH` pointing at a Windows `styio_lspd.exe`
build from that upstream head:

```powershell
npm run test:lsp-wire
```

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

The upstream Styio language server fix has been isolated onto branch
`codex/lsp-windows-stdio-binary` from base commit
`73531629b4350c296bb1aa584aa3b3ce95bd8f6f`. The latest verified head is
`4d843a68040401261dfdc34f77ca452cd991f1dc`.

That branch contains the Windows stdio binary-mode fix, its CTest,
`docs/adr/ADR-0121-lsp-windows-stdio-binary-mode.md`, and CI maintenance needed
to keep the upstream release gate green while carrying the new LSP transport
test.

GitHub Actions for upstream commit
`4d843a68040401261dfdc34f77ca452cd991f1dc` completed successfully:

- `repo-hygiene`
- `styio-audit`
- `styio-ci-gate`, including Linux source coverage and `fuzz_smoke`
- `styio-windows-native`, including native Windows build and CTest execution

The CTest `styio_lspd_stdio_framing` passed against the clean-branch Windows
build. It starts the real `styio_lspd` executable, sends an `initialize`
request, reads raw stdout bytes, and rejects malformed LSP boundaries such as
`\r\r\n\r\r\n`.

The extension PR CI currently still reports the earlier `local-ci-gate` failure
because that workflow checked out floating `styio-nightly` `nightly` before
ADR-0121 was merged there. The extension repository now supports a manual
`local-ci-gate` dispatch with `styio_ref` pinned to an upstream commit for
pre-merge proof; the final publish gate still requires a pinned Styio ref.

## Remaining External Gates

This candidate should not be considered published until:

1. the `eBioRing` Marketplace publisher is confirmed;
2. `VSCE_PAT` is configured and `npm run release:account-check` passes;
3. the extension `local-ci-gate` is rerun with either floating `nightly` after
   upstream merge or `styio_ref` pinned to
   `4d843a68040401261dfdc34f77ca452cd991f1dc`;
4. the upstream `styio_lspd` Windows stdio fix and CTest are merged into the
   Styio release channel that users will install; and
5. `.github/workflows/publish-marketplace.yml` publishes the tagged release or a
   maintainer manually publishes the verified VSIX.
