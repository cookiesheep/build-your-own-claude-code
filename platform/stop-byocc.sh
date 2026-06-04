#!/bin/bash
echo "Stopping BYOCC Platform..."

# 方法1: 通过端口杀进程
echo "[1/3] Stopping backend (port 3001)..."
lsof -ti:3001 | xargs kill -9 2>/dev/null

echo "[2/3] Stopping frontend (port 3000)..."
lsof -ti:3000 | xargs kill -9 2>/dev/null

echo "[3/3] Stopping Cloudflare Tunnel..."
pkill -f "cloudflared tunnel run" 2>/dev/null
pkill -f "cloudflared.*byocc" 2>/dev/null

# 清理可能残留的 npm 进程
pkill -f "npm run dev" 2>/dev/null

echo ""
echo "All services stopped!"
