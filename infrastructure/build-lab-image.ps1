param(
  [string]$RuntimeRepoPath = "D:\test-claude-code\claude-code",
  [string]$ImageName = "byocc-lab"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$contextRoot = Join-Path $repoRoot ".tmp\lab-image-context"
$runtimeDest = Join-Path $contextRoot "runtime"

Write-Host "== BYOCC Lab Image Builder ==" -ForegroundColor Cyan
Write-Host "Runtime repo : $RuntimeRepoPath"
Write-Host "Image name   : $ImageName"
Write-Host "Context dir  : $contextRoot"

if (-not (Test-Path $RuntimeRepoPath)) {
  throw "Runtime repo path not found: $RuntimeRepoPath"
}

# 每次重建都从干净 context 开始，避免把旧文件残留进镜像。
if (Test-Path $contextRoot) {
  Remove-Item -LiteralPath $contextRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $runtimeDest -Force | Out-Null

Write-Host "Copying claude-code-diy runtime into temporary build context..." -ForegroundColor Yellow

# 这里用 robocopy 是因为 Windows 下复制大量文件更稳。
# 我们显式排除 node_modules / dist / 图片 / 截图等大目录，避免 build context 过大。
$robocopyArgs = @(
  $RuntimeRepoPath,
  $runtimeDest,
  "/MIR",
  "/XD", "node_modules", "dist", ".git", ".omc", "images", "screenshots",
  "/NFL", "/NDL", "/NJH", "/NJS", "/NP"
)

& robocopy @robocopyArgs | Out-Null

# robocopy 的退出码不是传统 0/非0 语义：
# 0-7 都表示“复制成功，只是细节不同”；>= 8 才表示失败。
if ($LASTEXITCODE -ge 8) {
  throw "robocopy failed with exit code $LASTEXITCODE"
}

Write-Host "Building Docker image..." -ForegroundColor Yellow
docker build -t $ImageName -f (Join-Path $PSScriptRoot "Dockerfile.lab") $contextRoot

Write-Host ""
Write-Host "Build complete." -ForegroundColor Green
Write-Host "You can now run: docker image inspect $ImageName"
