#!/bin/bash
echo "Starting BYOCC Platform..."
echo ""

PROJECT_DIR="/Users/zhangfei/desktop/SoftEng/build-your-own-claude-code"

echo "[1/3] Starting backend..."
osascript -e 'tell application "Terminal" to do script "cd '"$PROJECT_DIR"'/server && npm run dev"'

echo "[2/3] Starting frontend..."
sleep 2
osascript -e 'tell application "Terminal" to do script "cd '"$PROJECT_DIR"'/platform && npm run build && npm run start"'

echo "[3/3] Starting Cloudflare Tunnel..."
sleep 2
osascript -e 'tell application "Terminal" to do script "cloudflared tunnel run byocc"'

echo ""
echo "All services started!"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:3001"
echo "Public:   https://byocc.cc"
