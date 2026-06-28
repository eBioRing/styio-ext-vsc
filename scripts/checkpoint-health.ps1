$ErrorActionPreference = 'Stop'

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Name,
    [Parameter(Mandatory = $true)]
    [scriptblock] $Command
  )

  Write-Host "==> $Name"
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Name failed with exit code $LASTEXITCODE"
  }
}

Invoke-Step 'Restore dependencies' { npm ci }
Invoke-Step 'Run static and grammar checks' { npm run check }
Invoke-Step 'Run release preflight' { npm run release:preflight }

if (-not $env:STYIO_LSPD_PATH) {
  $resolved = (& node scripts/resolve-lspd.mjs --print 2>$null)
  if ($LASTEXITCODE -eq 0 -and $resolved) {
    $env:STYIO_LSPD_PATH = $resolved.Trim()
  }
}

if (-not $env:STYIO_LSPD_PATH -or -not (Test-Path -LiteralPath $env:STYIO_LSPD_PATH)) {
  throw 'STYIO_LSPD_PATH must point to a built styio_lspd for the LSP acceptance gate.'
}

Invoke-Step 'Package VSIX' { npm run package:vsix }
Invoke-Step 'Run LSP wire tests' { npm run test:lsp-wire }
Invoke-Step 'Run VS Code E2E tests' { npm run test:e2e }
Invoke-Step 'Run clean-profile VSIX smoke' { npm run test:smoke }
