#!/usr/bin/env bash
# BYOCC Lab Image Builder (macOS / Linux)
#
# 用法：
#   ./infrastructure/build-lab-image.sh [runtime-repo-path] [image-name]
#
# 示例：
#   ./infrastructure/build-lab-image.sh ../claude-code-diy byocc-lab
#
# 前置条件：
#   1. Docker Desktop 已启动
#   2. 已克隆 claude-code-diy（sister repo）
#   3. 如果网络不好，先配置 Docker 镜像加速：
#      Docker Desktop → Settings → Docker Engine → 加 "registry-mirrors"

set -euo pipefail

RUNTIME_REPO_PATH="${1:-../claude-code-diy}"
IMAGE_NAME="${2:-byocc-lab}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONTEXT_ROOT="$REPO_ROOT/.tmp/lab-image-context"
RUNTIME_DEST="$CONTEXT_ROOT/runtime"

echo "== BYOCC Lab Image Builder (macOS/Linux) =="
echo "Runtime repo : $RUNTIME_REPO_PATH"
echo "Image name   : $IMAGE_NAME"
echo "Context dir  : $CONTEXT_ROOT"

if [ ! -d "$RUNTIME_REPO_PATH" ]; then
  echo "ERROR: Runtime repo path not found: $RUNTIME_REPO_PATH"
  echo ""
  echo "请先克隆 sister repo："
  echo "  git clone https://github.com/cookiesheep/claude-code-diy.git"
  echo "  然后把路径传给本脚本："
  echo "  ./infrastructure/build-lab-image.sh ./claude-code-diy"
  exit 1
fi

# 每次重建都从干净 context 开始
rm -rf "$CONTEXT_ROOT"
mkdir -p "$RUNTIME_DEST"

echo "Copying claude-code-diy runtime into temporary build context..."

# 白名单复制
RUNTIME_FILES=(
  "package.json"
  "package-lock.json"
  "build.mjs"
  "cli.js"
  "node-esm-hooks.mjs"
  "tsconfig.json"
  "bun.lock"
  "package.recommended-versions.json"
  "package.source-versions.json"
  ".env.example"
  "README.md"
  "DEPENDENCIES.md"
  "INSTALL.md"
  "RECOVERY_GUIDE.md"
)

for file in "${RUNTIME_FILES[@]}"; do
  src="$RUNTIME_REPO_PATH/$file"
  if [ -f "$src" ]; then
    cp "$src" "$RUNTIME_DEST/$file"
  fi
done

# 白名单目录
RUNTIME_DIRS=("src" "vendor")

for dir in "${RUNTIME_DIRS[@]}"; do
  src="$RUNTIME_REPO_PATH/$dir"
  dest="$RUNTIME_DEST/$dir"

  if [ ! -d "$src" ]; then
    echo "ERROR: Required runtime directory not found: $src"
    exit 1
  fi

  cp -R "$src" "$dest"
done

echo "Building Docker image..."
docker build -t "$IMAGE_NAME" -f "$SCRIPT_DIR/Dockerfile.lab" "$CONTEXT_ROOT"

echo ""
echo "Build complete."
echo "You can now run: docker image inspect $IMAGE_NAME"
