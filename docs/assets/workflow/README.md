# Workflow Assets

This directory records the local delivery workflow for the Styio VS Code
extension.

## Quick Checks

```bash
python3 scripts/repo-hygiene-gate.py --mode tracked
./scripts/checkpoint-health.sh
```

On Windows PowerShell:

```powershell
python scripts/repo-hygiene-gate.py --mode tracked
.\scripts\checkpoint-health.ps1
```

The checkpoint scripts require a resolvable `styio_lspd` through
`STYIO_LSPD_PATH`, `STYIO_NIGHTLY_ROOT`, or `PATH`. They run dependency restore,
static checks, release preflight, VSIX packaging, LSP wire tests, VS Code E2E,
and clean-profile VSIX smoke. On headless Linux, `checkpoint-health.sh` uses
`xvfb-run` when available.

## Smoke Test

Validates VSIX packaging, extension activation, and LSP startup in a clean
temporary VS Code profile.

```bash
# Prerequisites
npm ci
npm run compile
npm run grammar:build
npm run release:preflight
npm run package:vsix

# Run the smoke test (STYIO_LSPD_PATH is optional but recommended)
set STYIO_LSPD_PATH=C:\path\to\styio_lspd.exe   # Windows
# export STYIO_LSPD_PATH=/path/to/styio_lspd    # macOS / Linux
npm run test:smoke
```

What it does:

1. Creates a temp `user-data-dir` and `extensions-dir`.
2. Installs `dist/styio-language-support.vsix` via the VS Code CLI.
3. Launches VS Code pointing at `test/fixtures/workspace`, loads the
   extension, opens `main.styio`, and waits for `onLanguage:styio`
   activation.
4. If `STYIO_LSPD_PATH` is set, polls for the `styio_lspd` process. Provider
   behavior is covered by `npm run test:lsp-wire` and `npm run test:e2e`.
5. Cleans up the temp profile on exit.
