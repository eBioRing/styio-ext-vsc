# Changelog

## [0.1.0] - 2026-06-28

### Added

- Root-level VS Code extension package for Styio language support.
- TextMate grammar (`source.styio`) for comments, strings, imports, functions,
  resources, types, constants, numbers, operators, selectors, delimiters, and
  reserved wave tokens.
- Language configuration for comments, brackets, folding markers, indentation,
  auto-closing pairs, surrounding pairs, and word detection.
- Snippets for imports, functions, resources, conditionals, match expressions,
  stdin/stdout, task groups, await fallbacks, and resource effect fallbacks.
- LSP client that starts `styio_lspd` over stdio for diagnostics, completion,
  hover, definition, references, document symbols, workspace symbols, and
  semantic tokens.
- Server resolver for `styio.server.path`, `STYIO_LSPD_PATH`,
  `STYIO_NIGHTLY_ROOT`, and `PATH`.
- Commands for restarting the language server, selecting the server binary, and
  showing the Styio output channel.
- Grammar tests, LSP wire tests, VS Code smoke-test scaffolding, repository
  hygiene gate, and CI workflow scaffolding.
- Bundled extension entry point for smaller Marketplace packages.
- Release preflight checks for Marketplace metadata, VSIX contents, lockfile
  registry hygiene, documentation, icon shape, grammar sync, and local-path
  residue.
- Marketplace publish workflow for tagged releases with VSIX artifact upload and
  `VSCE_PAT` verification.
- Strict LSP wire framing regression coverage that rejects Windows text-mode
  `\r\r\n\r\r\n` response boundaries.
- Release workflow gates that build `styio_lspd`, run the upstream stdio framing
  smoke, execute LSP wire/E2E checks, and install the final VSIX in a clean VS
  Code profile before publishing.
