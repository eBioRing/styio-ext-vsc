# Repository Map

## Root

| Path                               | Purpose                                                           |
| ---------------------------------- | ----------------------------------------------------------------- |
| `package.json`                     | VS Code extension manifest, scripts, and dependency declarations. |
| `language-configuration.json`      | Declarative editor behavior for Styio files.                      |
| `syntaxes/`                        | TextMate grammar source and generated JSON.                       |
| `snippets/`                        | Styio snippets contributed to VS Code.                            |
| `src/`                             | TypeScript extension and LSP client implementation.               |
| `test/`                            | Grammar fixtures, LSP wire tests, and VS Code E2E tests.          |
| `scripts/`                         | Grammar generation, hygiene, release preflight, and smoke tests.  |
| `docs/`                            | Plans, workflow docs, release runbooks, and repository map.       |
| `.github/workflows/`               | CI, hygiene, audit, and Marketplace publish gates.                |
| `.github/ISSUE_TEMPLATE/`          | Public issue routing for bugs, LSP reports, and security contact. |
| `.github/dependabot.yml`           | Weekly npm and GitHub Actions dependency update automation.       |
| `.github/CODEOWNERS`               | Maintainer review routing for release-sensitive paths.            |
| `.github/pull_request_template.md` | PR checklist for release impact and verification evidence.        |
| `SECURITY.md`                      | Vulnerability reporting policy for maintainers and users.         |

## Generated Outputs

The following paths are local-only and ignored:

1. `node_modules/`
2. `out/`
3. `dist/`
4. `.vscode-test/`
5. `*.vsix`

`syntaxes/styio.tmLanguage.json` is generated but intentionally tracked because
VS Code loads JSON TextMate grammars directly.
