param([switch]$NoOpen)
$ErrorActionPreference = 'Stop'
$node = (Get-Command node -ErrorAction Stop).Source
$version = & $node -p 'process.versions.node'
if ([version]$version -lt [version]'24.5.0') { throw 'Node.js 24.5 or later is required.' }
$previousPowerShell = $env:LOCAL_BRIDGE_POWERSHELL
if (-not $previousPowerShell) {
  # The current shell's module path can be incompatible with Windows PowerShell
  # 5.1. Use this same known executable for the owner-only ACL verifier.
  $env:LOCAL_BRIDGE_POWERSHELL = (Get-Process -Id $PID).Path
}
Push-Location $PSScriptRoot
try {
  # Apply the owner-only state ACL before logs, UI capabilities or credentials exist.
  & $node --input-type=module -e 'import {ProtectedStore} from "./secure-store.mjs"; import {STATE_DIRECTORY} from "./constants.mjs"; await new ProtectedStore(STATE_DIRECTORY).initialize();'
  if ($LASTEXITCODE -ne 0) { throw 'Protected local state could not be initialized.' }
  & $node --input-type=module -e 'import {loadJose} from "./dependencies.mjs"; await loadJose();'
  if ($LASTEXITCODE -ne 0) { throw 'Run Install.ps1 to install the pinned jose dependency.' }
  $stateDirectory = if ($env:LOCAL_BRIDGE_STATE_DIR) { $env:LOCAL_BRIDGE_STATE_DIR } else { 'D:\ChatGPT-Local-Bridge\state' }
  $configPath = Join-Path $stateDirectory 'ui.json'
  $existing = if (Test-Path -LiteralPath $configPath) { Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json } else { $null }
  if ($existing -and (Get-Process -Id $existing.pid -ErrorAction SilentlyContinue)) {
    Write-Output 'The local bridge is already running.'
    if (-not $NoOpen) { & (Join-Path $PSScriptRoot 'Open-UI.ps1') }
    return
  }
  # Redirected log handles stay open while the child verifies credential ACLs.
  # Give logs their own equally protected sibling so credential checks never
  # need to replace permissions on an already-open redirection stream.
  $logDirectory = $stateDirectory + '.logs'
  $env:LOCAL_BRIDGE_LOG_DIRECTORY = $logDirectory
  try {
    & $node --input-type=module -e 'import fs from "node:fs/promises"; import {restrictOwner} from "./secure-store.mjs"; const directory=process.env.LOCAL_BRIDGE_LOG_DIRECTORY; await fs.mkdir(directory,{recursive:true,mode:0o700}); await restrictOwner(directory,true);'
    if ($LASTEXITCODE -ne 0) { throw 'Protected bridge logging could not be initialized.' }
  } finally { Remove-Item Env:LOCAL_BRIDGE_LOG_DIRECTORY -ErrorAction SilentlyContinue }
  $stdout = Join-Path $logDirectory 'program-output.log'
  $stderr = Join-Path $logDirectory 'program-error.log'
  $serverPath = Join-Path $PSScriptRoot 'server.mjs'
  $process = Start-Process -FilePath $node -ArgumentList @('--use-env-proxy', ('"' + $serverPath + '"')) -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
  $ready = $false
  for ($attempt = 0; $attempt -lt 40; $attempt++) {
    Start-Sleep -Milliseconds 500
    $process.Refresh()
    if ($process.HasExited) { throw ('Local bridge startup failed. See ' + $stderr) }
    if (Test-Path -LiteralPath $configPath) {
      $config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
      if ($config.pid -eq $process.Id) { $ready = $true; break }
    }
  }
  if (-not $ready) { throw ('The local bridge has not reported ready yet. See ' + $stderr) }
  Write-Output 'The local bridge is running. Its UI requires website pairing before explicit ChatGPT authorization.'
  if (-not $NoOpen) { & (Join-Path $PSScriptRoot 'Open-UI.ps1') }
} finally {
  Pop-Location
  if ($previousPowerShell) { $env:LOCAL_BRIDGE_POWERSHELL = $previousPowerShell }
  else { Remove-Item Env:LOCAL_BRIDGE_POWERSHELL -ErrorAction SilentlyContinue }
}
