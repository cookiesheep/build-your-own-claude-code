#!/bin/bash
set -euo pipefail

# ── 自动计算项目路径 ──────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── 解析参数 ──────────────────────────────────────────────────────────
DEV_MODE=false
for arg in "$@"; do
  case "$arg" in
    --dev) DEV_MODE=true ;;
  esac
done

echo "Starting BYOCC Platform..."
echo "  Project : $PROJECT_DIR"
echo "  Mode    : $([ "$DEV_MODE" = true ] && echo 'dev (hot reload)' || echo 'production')"
echo ""

# ── 前置检查 ──────────────────────────────────────────────────────────
if ! docker info &>/dev/null; then
  echo "ERROR: Docker is not running. Please start Docker Desktop first."
  exit 1
fi

if [ ! -f "$PROJECT_DIR/server/.env" ]; then
  echo "WARNING: server/.env not found."
  echo "  cp server/.env.example server/.env"
  echo ""
fi

# ── 安装依赖（如果缺失）─────────────────────────────────────────────────
if [ ! -d "$PROJECT_DIR/server/node_modules" ]; then
  echo "Installing server dependencies..."
  (cd "$PROJECT_DIR/server" && npm install)
fi

if [ ! -d "$PROJECT_DIR/platform/node_modules" ]; then
  echo "Installing platform dependencies..."
  (cd "$PROJECT_DIR/platform" && npm install)
fi

# ── [1/3] 启动后端 ────────────────────────────────────────────────────
echo "[1/3] Starting backend..."
if [ "$DEV_MODE" = true ]; then
  osascript -e 'tell application "Terminal" to do script "cd \"'"$PROJECT_DIR"'\"/server && npm run dev"'
else
  osascript -e 'tell application "Terminal" to do script "cd \"'"$PROJECT_DIR"'\"/server && npm run build && node --env-file=.env dist/index.js"'
fi

# ── [2/3] 启动前端 ────────────────────────────────────────────────────
echo "[2/3] Starting frontend..."
sleep 2
if [ "$DEV_MODE" = true ]; then
  osascript -e 'tell application "Terminal" to do script "cd \"'"$PROJECT_DIR"'\"/platform && npm run dev"'
else
  osascript -e 'tell application "Terminal" to do script "cd \"'"$PROJECT_DIR"'\"/platform && npm run build && npm run start -- -p 3000"'
fi

# ── [3/3] 启动 Cloudflare Tunnel ─────────────────────────────────────
echo "[3/3] Starting Cloudflare Tunnel..."
sleep 2
CLOUDFLARED_CONFIG="$PROJECT_DIR/infrastructure/cloudflared-config.yml"
if [ -f "$CLOUDFLARED_CONFIG" ]; then
  osascript -e 'tell application "Terminal" to do script "cloudflared tunnel --config \"'"$CLOUDFLARED_CONFIG"'\" run byocc"'
else
  echo "  WARNING: $CLOUDFLARED_CONFIG not found, using default cloudflared config."
  echo "  Terminal WebSocket may not work without proper ingress rules."
  osascript -e 'tell application "Terminal" to do script "cloudflared tunnel run byocc"'
fi

echo ""
echo "All services started!"
echo "  Frontend : http://localhost:3000"
echo "  Backend  : http://localhost:3001"
echo "  Public   : https://byocc.cc"
