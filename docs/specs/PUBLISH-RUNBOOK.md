# Marketplace Publish Runbook

This runbook is for maintainers publishing `styio-language-support` to the VS
Code Marketplace.

## Required Access

1. Marketplace publisher: `eBioRing`
2. Repository secret: `VSCE_PAT`
3. Repository variable: `STYIO_NIGHTLY_RELEASE_REF`, set to the exact Styio
   commit SHA or tag that should be built for the release
4. Push access for release tags such as `v0.1.0`
5. A published or otherwise reachable `styio_lspd` build that includes the
   Windows stdio binary-mode fix documented in Styio ADR-0121

## Local Release Candidate

On Windows PowerShell:

```powershell
$env:STYIO_LSPD_PATH = 'C:\path\to\styio_lspd.exe'
.\scripts\checkpoint-health.ps1
```

On Linux/macOS:

```bash
export STYIO_LSPD_PATH=/path/to/styio_lspd
./scripts/checkpoint-health.sh
```

The checkpoint runs dependency restore, static checks, release preflight, VSIX
packaging, direct LSP wire tests, VS Code E2E tests, and clean-profile VSIX
smoke.

After producing the final local VSIX, run the strict evidence check to confirm
the recorded release hash still matches the artifact:

```bash
npm run release:evidence-check
```

## Token Check

Do not print or paste the token. Confirm only that verification succeeds:

```bash
VSCE_PAT=<redacted> npx vsce verify-pat eBioRing
```

Or use the repository wrapper, which also reports whether the target extension
id already exists:

```bash
VSCE_PAT=<redacted> npm run release:account-check
```

In GitHub Actions, `publish-marketplace.yml` reads the same value from the
`VSCE_PAT` repository secret.

## Publish

1. Update `package.json` and `CHANGELOG.md`.
2. Run the local release candidate checkpoint.
3. Set `STYIO_NIGHTLY_RELEASE_REF` to the Styio commit or tag that contains
   ADR-0121. Tag-triggered publishing refuses a floating `nightly` ref.
4. Commit the release.
5. Tag the commit as `v<package.json version>`.
6. Push the tag.
7. Confirm `.github/workflows/publish-marketplace.yml` passes. It packages the
   VSIX, runs release preflight, builds `styio_lspd`, runs the upstream framing
   CTest, executes LSP wire/E2E/smoke gates, uploads the VSIX artifact, verifies
   `VSCE_PAT`, and publishes with `vsce publish --packagePath`.

Manual workflow dispatch defaults to a dry-run package gate. Set
`publish=true` only when intentionally publishing, and pass a pinned
`styio_ref` instead of the default `nightly`.

## Post-Publish Smoke

1. Install the extension from Marketplace in a clean VS Code profile.
2. Configure `styio_lspd` with `styio.server.path` or `STYIO_LSPD_PATH`.
3. Open `test/fixtures/workspace/main.styio`.
4. Confirm syntax highlighting, completion for `i32`, hover, definition,
   references, document symbols, workspace symbols, semantic tokens, and
   diagnostics.

## Rollback

Marketplace releases are immutable. If a bad release is published:

1. Prepare a patch version.
2. Keep the same gates: local checkpoint, publish workflow, and post-publish
   smoke.
3. Publish the patch.
4. Update `CHANGELOG.md` with the rollback reason and remediation.
