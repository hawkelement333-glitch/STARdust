param(
  [switch]$NoOpenWindow
)

$ErrorActionPreference = "Stop"

$workspace = Split-Path -Parent $MyInvocation.MyCommand.Path
$healthUrl = "http://127.0.0.1:4173/api/health"
$appUrl = "http://localhost:4173"
$bundledNode = "C:\Users\hawke\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$bundledModules = "C:\Users\hawke\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\.pnpm\node_modules;C:\Users\hawke\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules;.\node_modules"
$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

Set-Location $workspace

function Test-VyrlHealth {
  try {
    $response = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2
    return $response.ok -eq $true
  } catch {
    return $false
  }
}

function Start-VyrlServer {
  if (Test-Path $bundledNode) {
    $env:NODE_PATH = $bundledModules
    Start-Process -FilePath $bundledNode -ArgumentList "server.cjs" -WorkingDirectory $workspace -WindowStyle Hidden | Out-Null
    return
  }

  Start-Process -FilePath "node" -ArgumentList "server.cjs" -WorkingDirectory $workspace -WindowStyle Hidden | Out-Null
}

function Wait-VyrlHealth {
  for ($attempt = 0; $attempt -lt 40; $attempt++) {
    if (Test-VyrlHealth) {
      return
    }
    Start-Sleep -Milliseconds 500
  }

  throw "VYRL server did not become healthy on port 4173."
}

function Get-BrowserPath {
  if (Test-Path $chromePath) { return $chromePath }
  if (Test-Path $edgePath) { return $edgePath }
  throw "No supported browser was found. Install Chrome or Edge."
}

if (-not (Test-VyrlHealth)) {
  Start-VyrlServer
  Wait-VyrlHealth
}

if (-not $NoOpenWindow) {
  $browser = Get-BrowserPath
  Start-Process -FilePath $browser -ArgumentList "--app=$appUrl" -WorkingDirectory $workspace | Out-Null
}
