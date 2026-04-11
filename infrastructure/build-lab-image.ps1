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

# 白名单复制比“复制全部再排除”更安全。
# 镜像只需要运行底座本身，不应该带入本地聊天记录、crash.log、debug.txt 等私人物料。
$runtimeFiles = @(
  "package.json",
  "package-lock.json",
  "build.mjs",
  "cli.js",
  "node-esm-hooks.mjs",
  "tsconfig.json",
  "bun.lock",
  "package.recommended-versions.json",
  "package.source-versions.json",
  ".env.example",
  "README.md",
  "DEPENDENCIES.md",
  "INSTALL.md",
  "RECOVERY_GUIDE.md"
)

foreach ($file in $runtimeFiles) {
  $source = Join-Path $RuntimeRepoPath $file
  if (Test-Path $source) {
    Copy-Item -LiteralPath $source -Destination (Join-Path $runtimeDest $file) -Force
  }
}

$runtimeDirectories = @("src", "vendor")

foreach ($directory in $runtimeDirectories) {
  $source = Join-Path $RuntimeRepoPath $directory
  $destination = Join-Path $runtimeDest $directory

  if (-not (Test-Path $source)) {
    throw "Required runtime directory not found: $source"
  }

  # 目录复制仍用 robocopy：它在 Windows 下处理大量文件更稳。
  # 这里只复制白名单目录，所以不需要再维护一长串敏感文件排除规则。
  & robocopy $source $destination /MIR /NFL /NDL /NJH /NJS /NP | Out-Null

  # robocopy 的退出码不是传统 0/非0 语义：
  # 0-7 都表示“复制成功，只是细节不同”；>= 8 才表示失败。
  if ($LASTEXITCODE -ge 8) {
    throw "robocopy failed for $directory with exit code $LASTEXITCODE"
  }
}

Write-Host "Building Docker image..." -ForegroundColor Yellow
docker build -t $ImageName -f (Join-Path $PSScriptRoot "Dockerfile.lab") $contextRoot

Write-Host ""
Write-Host "Build complete." -ForegroundColor Green
Write-Host "You can now run: docker image inspect $ImageName"
