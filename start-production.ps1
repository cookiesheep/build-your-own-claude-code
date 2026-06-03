$ErrorActionPreference = "Stop"

# Initialize fnm (Fast Node Manager) if available
if (Get-Command "fnm" -ErrorAction SilentlyContinue) {
    if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
        Invoke-Expression (fnm env --shell powershell | Out-String)
    }
}

$repoRoot = $PSScriptRoot
$serverDir = Join-Path $repoRoot "server"
$platformDir = Join-Path $repoRoot "platform"
$serverEnvFile = Join-Path $serverDir ".env"

function Assert-CommandAvailable {
    param([string]$CommandName)

    if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: Missing required command: $CommandName" -ForegroundColor Red
        exit 1
    }
}

function Wait-ForHttpOk {
    param(
        [string]$Url,
        [string]$ServiceName,
        [int]$TimeoutSeconds = 30
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                Write-Host "$ServiceName is responding at $Url" -ForegroundColor Green
                return
            }
        } catch {
            Start-Sleep -Seconds 1
        }
    }

    Write-Host "WARNING: $ServiceName did not become ready within ${TimeoutSeconds}s ($Url)." -ForegroundColor Yellow
}

Write-Host "=== BYOCC Production Startup ===" -ForegroundColor Cyan

Assert-CommandAvailable "docker"
Assert-CommandAvailable "node"
Assert-CommandAvailable "npm"

Write-Host "Checking Docker..." -ForegroundColor Yellow
docker info | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $serverEnvFile)) {
    Write-Host "WARNING: server/.env not found. Copy from .env.example before production startup:" -ForegroundColor Yellow
    Write-Host "  Copy-Item server/.env.example server/.env" -ForegroundColor Yellow
}

Write-Host "Building server..." -ForegroundColor Yellow
Push-Location $serverDir
npm run build
if ($LASTEXITCODE -ne 0) {
    Pop-Location
    Write-Host "Server build failed." -ForegroundColor Red
    exit 1
}
Pop-Location

Write-Host "Starting server on port 3001..." -ForegroundColor Yellow
Start-Process -FilePath "node" -ArgumentList "--env-file=.env", "dist/index.js" -WorkingDirectory $serverDir
Start-Sleep -Seconds 2
Wait-ForHttpOk -Url "http://127.0.0.1:3001/api/health" -ServiceName "Server"

Write-Host "Building platform..." -ForegroundColor Yellow
Push-Location $platformDir
npm run build
if ($LASTEXITCODE -ne 0) {
    Pop-Location
    Write-Host "Platform build failed." -ForegroundColor Red
    exit 1
}
Pop-Location

Write-Host "Starting Next.js on port 3000..." -ForegroundColor Yellow
Start-Process -FilePath "npm.cmd" -ArgumentList "run", "start", "--", "-p", "3000" -WorkingDirectory $platformDir
Start-Sleep -Seconds 2
Wait-ForHttpOk -Url "http://127.0.0.1:3000" -ServiceName "Platform"

Write-Host "Checking cloudflared..." -ForegroundColor Yellow
$cloudflaredConfig = Join-Path (Join-Path $repoRoot "infrastructure") "cloudflared-config.yml"

# Find cloudflared: check PATH first, then common Windows install locations
$cloudflaredExe = $null
if (Get-Command "cloudflared" -ErrorAction SilentlyContinue) {
    $cloudflaredExe = "cloudflared"
} else {
    $wingetPaths = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Directory -Filter "Cloudflare.cloudflared*" -ErrorAction SilentlyContinue
    foreach ($dir in $wingetPaths) {
        $candidate = Join-Path $dir.FullName "cloudflared.exe"
        if (Test-Path $candidate) {
            $cloudflaredExe = $candidate
            break
        }
    }
}

if ($cloudflaredExe) {
    if (Test-Path $cloudflaredConfig) {
        Start-Process -FilePath $cloudflaredExe -ArgumentList "tunnel", "--config", $cloudflaredConfig, "run", "byocc"
        Write-Host "Cloudflare Tunnel started (with WebSocket routing config)." -ForegroundColor Green
    } else {
        Start-Process -FilePath $cloudflaredExe -ArgumentList "tunnel", "run", "byocc"
        Write-Host "Cloudflare Tunnel started (WARNING: no cloudflared-config.yml found, terminal WebSocket may not work)." -ForegroundColor Yellow
    }
} else {
    Write-Host "cloudflared not found. Install via: winget install Cloudflare.cloudflared" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== BYOCC is running ===" -ForegroundColor Green
Write-Host "  Local:  http://localhost:3000" -ForegroundColor White
Write-Host "  Public: https://byocc.cc (via Cloudflare Tunnel)" -ForegroundColor White
Write-Host ""
Write-Host "Tunnel config: infrastructure/cloudflared-config.yml" -ForegroundColor White
