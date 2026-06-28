# Dependency Usage Boundary

## Runtime Dependencies

| Dependency              |  Version | License | Use                                                 |
| ----------------------- | -------: | ------- | --------------------------------------------------- |
| `vscode-languageclient` | `10.0.1` | MIT     | Starts and manages the Styio LSP client over stdio. |

## Development Dependencies

| Dependency              |   Version | License    | Use                                              |
| ----------------------- | --------: | ---------- | ------------------------------------------------ |
| `typescript`            |   `6.0.3` | Apache-2.0 | TypeScript compiler for the extension and tests. |
| `@types/node`           |  `26.0.1` | MIT        | Node.js type definitions.                        |
| `@types/vscode`         | `1.125.0` | MIT        | VS Code API type definitions.                    |
| `@types/mocha`          | `10.0.10` | MIT        | Mocha test type definitions.                     |
| `@vscode/test-electron` |   `3.0.0` | MIT        | VS Code E2E test runner.                         |
| `@vscode/test-cli`      |  `0.0.15` | MIT        | VS Code extension test CLI support.              |
| `@vscode/vsce`          |   `3.9.2` | MIT        | VSIX packaging.                                  |
| `esbuild`               |  `0.28.1` | MIT        | Bundles the runtime extension entry point.       |
| `eslint`                |  `10.6.0` | MIT        | Static analysis.                                 |
| `@eslint/js`            |  `10.0.1` | MIT        | ESLint JavaScript recommended rules.             |
| `typescript-eslint`     |  `8.62.0` | MIT        | ESLint TypeScript parser and rules.              |
| `js-yaml`               |   `5.2.0` | MIT        | Converts TextMate YAML source to JSON.           |
| `mocha`                 |  `11.7.6` | MIT        | Test framework used by VS Code E2E tests.        |
| `prettier`              |   `3.9.0` | MIT        | Formatting check.                                |
| `vscode-tmgrammar-test` |   `0.1.3` | MIT        | TextMate grammar scope tests.                    |

## External Runtime Dependency

| Dependency   | Use                                                                    |
| ------------ | ---------------------------------------------------------------------- |
| `styio_lspd` | Styio language server. Resolved at runtime via settings, env, or PATH. |

## Policy

1. Runtime language facts must come from `styio_lspd`.
2. Generated dependency directories and VSIX artifacts must not be committed.
3. New dependencies require this document to be updated before delivery.
