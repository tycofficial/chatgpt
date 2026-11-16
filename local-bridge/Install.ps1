$ErrorActionPreference = 'Stop'
$dependencyDirectory = if ($env:LOCAL_BRIDGE_DEPS_DIR) { $env:LOCAL_BRIDGE_DEPS_DIR } else { 'D:\ChatGPT-Local-Bridge\deps' }
$cacheDirectory = if ($env:LOCAL_BRIDGE_NPM_CACHE) { $env:LOCAL_BRIDGE_NPM_CACHE } else { 'D:\ChatGPT-Local-Bridge\npm-cache' }
$version = & node -p 'process.versions.node'
if ($LASTEXITCODE -ne 0 -or [version]$version -lt [version]'24.5.0') { throw 'Node.js 24.5 or later is required.' }
New-Item -ItemType Directory -Path $dependencyDirectory, $cacheDirectory -Force | Out-Null
& npm --prefix $dependencyDirectory --cache $cacheDirectory install --ignore-scripts --no-audit --no-fund 'jose@6.2.17'
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
Write-Output 'Dependencies are ready on D:. No authorization has been started.'
