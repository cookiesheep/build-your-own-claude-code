$ErrorActionPreference = "Continue"

Write-Host "=== Stopping BYOCC Services ===" -ForegroundColor Cyan

# Find PIDs listening on 3000 and 3001
function Stop-PortListener {
    param([int]$Port, [string]$Name)

    $connections = netstat -ano | Select-String ":$Port\s" | Select-String "LISTENING"
    $procIds = $connections | ForEach-Object { ($_ -split '\s+')[-1] } | Sort-Object -Unique

    if ($procIds) {
        foreach ($procId in $procIds) {
            if ($procId -match '^\d+$') {
                Write-Host "  Stopping $Name (PID $procId on port $Port)..." -ForegroundColor Yellow
                Stop-Process -Id ([int]$procId) -Force -ErrorAction SilentlyContinue
            }
        }
        Write-Host "  $Name stopped." -ForegroundColor Green
    } else {
        Write-Host "  $Name not running (port $Port free)." -ForegroundColor DarkGray
    }
}

Write-Host "[1/3] Stopping server (port 3001)..." -ForegroundColor Yellow
Stop-PortListener -Port 3001 -Name "Server"

Write-Host "[2/3] Stopping platform (port 3000)..." -ForegroundColor Yellow
Stop-PortListener -Port 3000 -Name "Platform"

Write-Host "[3/3] Stopping Cloudflare Tunnel..." -ForegroundColor Yellow
$cf = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
if ($cf) {
    $cf | Stop-Process -Force
    Write-Host "  Cloudflare Tunnel stopped ($($cf.Count) process(es))." -ForegroundColor Green
} else {
    Write-Host "  Cloudflare Tunnel not running." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "=== All BYOCC services stopped ===" -ForegroundColor Green
