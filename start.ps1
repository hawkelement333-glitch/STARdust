$ErrorActionPreference = "Stop"
$bundledNode = "C:\Users\hawke\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$bundledModules = "C:\Users\hawke\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\.pnpm\node_modules;C:\Users\hawke\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules;.\node_modules"

if (Test-Path $bundledNode) {
  $env:NODE_PATH = $bundledModules
  & $bundledNode server.cjs
} else {
  node server.cjs
}
