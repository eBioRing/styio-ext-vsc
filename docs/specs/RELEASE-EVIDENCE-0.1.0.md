# Release Evidence: 0.1.0

**Date:** 2026-06-28

This file records the local and CI evidence for the first Marketplace release
candidate of `styio-language-support`.

## Artifact

- VSIX: `dist/styio-language-support.vsix`
- SHA256: `64D3D9B0FBCBAB1AB509A641551011D0A9EAA129BDF6906967F9202A5729EA88`
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

After the publish workflow was hardened to reject branch refs for real
publishing and to require `npm run release:evidence-check`, the VSIX was
rebuilt and these gates were rerun: `npm run check`,
`npm run release:preflight`, `npm run release:evidence-check`,
`npm run test:lsp-wire`, `npm run test:e2e`, `npm run test:smoke`, `npm audit`
against `https://registry.npmjs.org/`, and
`python scripts/repo-hygiene-gate.py --mode tracked`.

The Windows grammar-test command now runs through `scripts/run-grammar-test.mjs`.
This preserves `vscode-tmgrammar-test` coverage while tolerating only the exact
Windows Node/libuv cleanup assertion that can occur after all grammar fixtures
have already reported success. After this wrapper was added, `npm run check` and
`npm run package:vsix` passed locally on Windows, then the rebuilt VSIX passed
`npm run release:evidence-check`, `npm run test:lsp-wire`, `npm run test:e2e`,
and `npm run test:smoke` with `STYIO_LSPD_PATH` pointing at the local Windows
`styio_lspd.exe` build.

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

The upstream pull request was merged into `styio-nightly/nightly` on
2026-06-28 as merge commit
`5b9685f71b495643f0f084eb896ca1fdfe3e17c0`.

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

Extension PR CI was rerun after the upstream merge. For extension commit
`046a0a1a61774be3ff8df634b39cafcb882dc11f`, GitHub Actions checked out
`styio-nightly/nightly` at merge commit
`5b9685f71b495643f0f084eb896ca1fdfe3e17c0`; `repo-hygiene`,
`styio-audit`, the Linux `local-ci-gate`, and the Windows
`windows-extension-smoke` job all completed successfully. The final publish gate
requires an exact Styio commit SHA or tag and rejects floating or branch refs
when publishing.

Extension PR #1 was merged into `styio-ext-vsc/nightly` on 2026-06-28 as merge
commit `09b6015acaa1be6484c8739d582a9213d2d754af`. The post-merge push CI for
that commit completed successfully:

- `repo-hygiene` run `28316365029`
- `styio-audit` run `28316365028`
- `local-ci-gate` run `28316365025`, including Linux `local-ci-gate` and
  Windows `windows-extension-smoke`

No local or remote `v0.1.0` tag existed at the time of this evidence update.
Create that tag only after the final release evidence commit lands on
`styio-ext-vsc/stable`. The repository default branch is `stable`, and release
tags must point at a commit contained there. The intended Styio release input for
publishing is exact commit SHA `5b9685f71b495643f0f084eb896ca1fdfe3e17c0` or a
Styio release tag that points at an equivalent or newer commit with ADR-0121.

## Remaining External Gates

This candidate should not be considered published until:

1. the `eBioRing` Marketplace publisher is confirmed;
2. `VSCE_PAT` is configured and `npm run release:account-check` passes;
3. the final release candidate is promoted from `nightly` to `stable`;
4. `v0.1.0` is created on the final reviewed `styio-ext-vsc/stable` release
   commit; and
5. `.github/workflows/publish-marketplace.yml` publishes the tagged release with
   an exact Styio commit SHA or tag, or a maintainer manually publishes the
   verified VSIX.
