#!/usr/bin/env bash
set -euo pipefail

npm ci
npm run check
npm run release:preflight

normalize_lspd_path() {
  if [[ -z "${STYIO_LSPD_PATH:-}" || -e "${STYIO_LSPD_PATH}" ]]; then
    return
  fi

  local candidate="${STYIO_LSPD_PATH//\\//}"
  if [[ "${candidate}" =~ ^([A-Za-z]):/(.*)$ ]]; then
    local drive="${BASH_REMATCH[1],,}"
    local tail="${BASH_REMATCH[2]}"
    local wsl_candidate="/mnt/${drive}/${tail}"
    if [[ -e "${wsl_candidate}" ]]; then
      export STYIO_LSPD_PATH="${wsl_candidate}"
    fi
  fi
}

if [[ -z "${STYIO_LSPD_PATH:-}" ]]; then
  if resolved="$(node scripts/resolve-lspd.mjs --print 2>/dev/null)"; then
    export STYIO_LSPD_PATH="$resolved"
  fi
fi

normalize_lspd_path

if [[ -z "${STYIO_LSPD_PATH:-}" || ! -e "${STYIO_LSPD_PATH}" ]]; then
  echo "STYIO_LSPD_PATH is required for the LSP acceptance gate." >&2
  exit 1
fi

npm run package:vsix
npm run test:lsp-wire

run_vscode_gate() {
  if [[ "${OSTYPE:-}" == linux* ]] && [[ -z "${DISPLAY:-}" ]] && command -v xvfb-run >/dev/null 2>&1; then
    xvfb-run -a "$@"
  else
    "$@"
  fi
}

run_vscode_gate npm run test:e2e
run_vscode_gate npm run test:smoke
