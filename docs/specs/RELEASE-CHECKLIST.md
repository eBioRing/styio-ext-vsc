# Release Checklist

Use this checklist for each Marketplace release.

## Automated Gates

- [ ] `npm ci`
- [ ] `npm run check`
- [ ] `npm run release:preflight`
- [ ] `npm run package:vsix`
- [ ] `npm run release:evidence-check`
- [ ] `STYIO_LSPD_PATH=<path> npm run test:lsp-wire`
- [ ] `STYIO_LSPD_PATH=<path> npm run test:e2e`
- [ ] `STYIO_LSPD_PATH=<path> npm run test:smoke`
- [ ] `python scripts/repo-hygiene-gate.py --mode tracked`
- [ ] `npm audit` against `https://registry.npmjs.org/`
- [ ] Upstream `ctest -R styio_lspd_stdio_framing`
- [ ] Manual `local-ci-gate` passes with `styio_ref` pinned to the intended
      Styio release commit when the release depends on a not-yet-merged Styio
      PR.
- [ ] `VSCE_PAT=<redacted> npm run release:account-check`

## Manual Checks

- [ ] `package.json` version matches the release tag.
- [ ] `CHANGELOG.md` has a dated section for the version.
- [ ] `README.md`, `SUPPORT.md`, and `SECURITY.md` are current.
- [ ] `dist/styio-language-support.vsix` contains only release files.
- [ ] The VSIX SHA256 is recorded in the release notes.
- [ ] Marketplace publisher `eBioRing` exists.
- [ ] `VSCE_PAT` verifies with `npx vsce verify-pat eBioRing`.
- [ ] The Styio release channel provides a `styio_lspd` build with ADR-0121.
- [ ] `STYIO_NIGHTLY_RELEASE_REF` or manual `styio_ref` points at that exact
      Styio commit/tag; publishing must not use floating `nightly`.

## Post-Publish

- [ ] Marketplace page renders README, icon, changelog, and support metadata.
- [ ] Clean VS Code profile can install the Marketplace extension.
- [ ] `styio_lspd` discovery works through settings or environment variables.
- [ ] Completion, hover, definition, references, symbols, diagnostics, and
      semantic tokens work in the fixture workspace.
