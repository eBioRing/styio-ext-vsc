# Styio Language Support for Visual Studio Code

[![Version](https://img.shields.io/badge/version-0.1.0-blue)](https://marketplace.visualstudio.com/items?itemName=eBioRing.styio-language-support)
[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.125.0-007ACC)](https://code.visualstudio.com/)
[![License](https://img.shields.io/badge/license-Apache--2.0-green)](LICENSE)

First-party editing support for **Styio** in Visual Studio Code. The extension
supports `.styio` files and legacy `.syo` files with offline TextMate syntax
highlighting plus LSP-powered language features from `styio_lspd`.

## Features

### Always-Available Syntax Highlighting

The bundled TextMate grammar (`source.styio`) highlights comments, strings,
formatted strings, imports, functions, closures, resources, primitive and
collection types, booleans, numbers, selectors, task/await/match operators,
arrows, ranges, fallback operators, and Styio punctuation.

### Language Server Features

When `styio_lspd` is discoverable, the extension starts one language server per
workspace folder and enables:

- diagnostics
- completion
- hover
- go to definition
- find references
- document symbols
- workspace symbols
- semantic tokens

The VS Code extension does not invent compiler facts. Semantic behavior comes
from `styio_lspd`.

### Snippets And Editor Behavior

Snippets cover imports, functions, resource declarations, conditionals, match
expressions, stdin/stdout, task groups, awaits, and resource effects. The
language configuration adds comment toggles, bracket matching, auto-closing
pairs, folding markers, indentation rules, and a Styio word pattern.

## Requirements

Syntax highlighting works without any external binary. LSP features require a
local `styio_lspd` executable.

Server discovery order:

1. `styio.server.path` VS Code setting
2. `STYIO_LSPD_PATH` environment variable
3. `STYIO_NIGHTLY_ROOT` environment variable, searching common `build/*/bin`
   output paths
4. `PATH`

Platform binary names:

| Platform | Binary name                                             |
| -------- | ------------------------------------------------------- |
| Windows  | `styio_lspd.exe`, `styio_lspd.cmd`, or `styio_lspd.bat` |
| Linux    | `styio_lspd`                                            |
| macOS    | `styio_lspd`                                            |

If no server is found, TextMate highlighting still works and VS Code shows an
actionable error with a **Select Server** option.

## Extension Settings

| Setting                  | Scope    | Type       | Default | Description                                       |
| ------------------------ | -------- | ---------- | ------- | ------------------------------------------------- |
| `styio.server.enabled`   | Resource | `boolean`  | `true`  | Enable the Styio language server.                 |
| `styio.server.path`      | Resource | `string`   | `""`    | Explicit path or command for `styio_lspd`.        |
| `styio.server.arguments` | Resource | `string[]` | `[]`    | Extra arguments passed to `styio_lspd`.           |
| `styio.trace.server`     | Resource | `string`   | `"off"` | LSP trace level: `off`, `messages`, or `verbose`. |

## Commands

| Command ID                    | Command Palette title          | Description                                 |
| ----------------------------- | ------------------------------ | ------------------------------------------- |
| `styio.restartLanguageServer` | Styio: Restart Language Server | Restarts all Styio language server clients. |
| `styio.selectLanguageServer`  | Styio: Select Language Server  | Opens a file dialog to choose `styio_lspd`. |
| `styio.showOutput`            | Styio: Show Output             | Opens the Styio output channel.             |

## Verification

To check syntax highlighting, open a `.styio` file and verify comments, strings,
imports, functions, resources, and operators receive distinct theme scopes.

To check LSP startup:

1. Configure `styio_lspd` using one of the discovery methods above.
2. Open a Styio workspace.
3. Run **Styio: Show Output**.
4. Confirm the output contains a line like
   `Styio language server started for <folder>`.
5. Try completion, hover, definition, references, outline, and diagnostics.

For local release validation from this repository:

```bash
npm ci
npm run check
npm run release:preflight
STYIO_LSPD_PATH=/path/to/styio_lspd npm run test:lsp-wire
npm run package:vsix
STYIO_LSPD_PATH=/path/to/styio_lspd npm run test:smoke
```

On Windows PowerShell:

```powershell
$env:STYIO_LSPD_PATH = 'C:\path\to\styio_lspd.exe'
npm run test:lsp-wire
npm run package:vsix
npm run test:smoke
```

## Known Limitations

- `styio_lspd` is not bundled in the VSIX. Install or build it separately.
- Rename, code actions, formatting, and inlay hints are not exposed until the
  server advertises those capabilities.
- The TextMate grammar is a highlighting fallback, not an authoritative parser.
- LSP features require local file-system workspaces. Virtual workspaces receive
  syntax highlighting only.

## Troubleshooting

If VS Code reports that the language server was not found:

- set `styio.server.path` to the binary path;
- set `STYIO_LSPD_PATH` and restart VS Code;
- set `STYIO_NIGHTLY_ROOT` to a built Styio checkout; or
- put `styio_lspd` on `PATH`.

If diagnostics or completions do not appear:

- run **Styio: Show Output** and inspect the output channel;
- verify `styio.server.enabled` is `true`;
- restart the server with **Styio: Restart Language Server**;
- reload the VS Code window after changing environment variables.

## Privacy

This extension does not collect telemetry and does not contact remote services.
It starts a local `styio_lspd` process and communicates with it over standard
input/output. VS Code itself may still report generic extension activation data
according to the user's VS Code telemetry settings.

## License

Apache-2.0. See [LICENSE](LICENSE).
