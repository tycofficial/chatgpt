$ErrorActionPreference = 'Stop'
$stateDirectory = if ($env:LOCAL_BRIDGE_STATE_DIR) { $env:LOCAL_BRIDGE_STATE_DIR } else { 'D:\ChatGPT-Local-Bridge\state' }
$configPath = Join-Path $stateDirectory 'ui.json'
if (-not (Test-Path -LiteralPath $configPath -PathType Leaf)) { throw 'Start the local bridge first with Start-Bridge.ps1.' }
$config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
$launchUri = [uri]$config.launchUrl
if ($launchUri.Scheme -ne 'http' -or $launchUri.Host -ne '127.0.0.1' -or $launchUri.AbsolutePath -ne '/' -or $launchUri.Query -notmatch '^\?launch=[A-Za-z0-9_-]{43}$') { throw 'The protected local UI launch file is invalid.' }
if (-not (Get-Process -Id $config.pid -ErrorAction SilentlyContinue)) { throw 'The local bridge is no longer running. Run Start-Bridge.ps1 again.' }
# Opening a browser is the explicit purpose of this user-run script.
$edge = Get-Command msedge.exe -ErrorAction SilentlyContinue
$edgePath = if ($edge) { $edge.Source } else { $null }
if (-not $edgePath) {
  $candidates = @(
    (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\Application\msedge.exe')
  )
  $edgePath = $candidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
}
if (-not $edgePath) { throw 'Microsoft Edge could not be found. Install Edge before opening the local management page.' }
Start-Process -FilePath $edgePath -ArgumentList @($launchUri.AbsoluteUri)
