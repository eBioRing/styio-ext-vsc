# Release Manifest

This document records what ships inside the VSIX package for
`styio-language-support`.

## Shipped Paths

| Path                             | Purpose                                                     |
| -------------------------------- | ----------------------------------------------------------- |
| `package.json`                   | Extension manifest.                                         |
| `README.md`                      | Marketplace documentation.                                  |
| `SUPPORT.md`                     | Support and issue-reporting guidance.                       |
| `CHANGELOG.md`                   | Release notes.                                              |
| `LICENSE`                        | Apache-2.0 license text.                                    |
| `assets/icon.png`                | Marketplace and extension list icon.                        |
| `language-configuration.json`    | Comments, brackets, folding, indentation, and word pattern. |
| `syntaxes/styio.tmLanguage.json` | Generated TextMate grammar loaded by VS Code.               |
| `snippets/styio.code-snippets`   | Styio snippets.                                             |
| `out/extension.js`               | Bundled extension entry point and runtime code.             |

## Excluded Paths

The VSIX excludes local development and verification files:

- `.github/`
- `.vscode/`
- `.gitignore`
- `.nvmrc`
- `.python-version`
- `.prettierrc.json`
- `SECURITY.md`
- `docs/`
- `scripts/`
- `src/`
- `test/`
- `syntaxes/*.yaml`
- `node_modules/`
- `.vscode-test/`
- `dist/`
- `out/` except `out/extension.js`
- `*.tsbuildinfo`, `*.vsix`, `*.log`, and `*.tmp`

## Versioning

- Current version: `0.1.0`
- Publisher: `eBioRing`
- VS Code engine: `^1.125.0`

## Release Process

1. Confirm the Marketplace publisher exists and `vsce login eBioRing` works.
2. Set `STYIO_NIGHTLY_RELEASE_REF` to the exact Styio commit or tag containing
   the release-channel `styio_lspd` build and ADR-0121.
3. Bump `package.json` version when preparing a new release.
4. Update `CHANGELOG.md`.
5. Run `STYIO_LSPD_PATH=<path> ./scripts/checkpoint-health.sh` on
   Linux/macOS, or `.\scripts\checkpoint-health.ps1` on Windows PowerShell.
6. If running steps manually, run `npm ci`.
7. Run `npm run check`.
8. Run `npm run release:preflight`.
9. Run `npm run package:vsix`.
10. Run `npm run release:evidence-check` after generating the final local VSIX.
11. Run `STYIO_LSPD_PATH=<path> npm run test:lsp-wire`.
12. Run `STYIO_LSPD_PATH=<path> npm run test:e2e`.
13. Run `STYIO_LSPD_PATH=<path> npm run test:smoke`.
14. Inspect `npx vsce ls --tree` for unexpected files.
15. Run `VSCE_PAT=<redacted> npm run release:account-check` before any manual
    publish.
16. Promote the verified `nightly` release candidate to the default `stable`
    branch.
17. Tag the final `stable` commit as `v<package.json version>`.
18. Publish through `.github/workflows/publish-marketplace.yml`, or run
    `npx vsce publish --packagePath dist/styio-language-support.vsix`.

## Publish Automation

`.github/workflows/publish-marketplace.yml` packages the VSIX, reruns release
preflight, verifies the recorded release evidence hash, uploads the VSIX as an
artifact, verifies `VSCE_PAT`, and publishes to Marketplace on `v*.*.*` tags.
Tag-triggered publishing requires `STYIO_NIGHTLY_RELEASE_REF` to be an exact
Styio commit SHA or tag, refuses floating `nightly` or branch refs, and rejects
release tags whose commit is not contained in `origin/stable`. Manual workflow
dispatch defaults to a dry-run package gate; set `publish=true` only when
intentionally publishing and pass an exact Styio commit SHA or tag through
`styio_ref`.

See `docs/specs/PUBLISH-RUNBOOK.md` and
`docs/specs/RELEASE-CHECKLIST.md` for maintainer-facing release operations.
For the 0.1.0 candidate evidence ledger, see
`docs/specs/RELEASE-EVIDENCE-0.1.0.md`.
