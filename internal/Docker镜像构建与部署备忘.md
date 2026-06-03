# Docker 镜像构建与部署备忘

## 镜像信息

| 项目 | 值 |
|------|---|
| 镜像名 | `byocc-lab` |
| 基础镜像 | `node:22-bookworm-slim` |
| 大小 | ~554MB |
| Dockerfile | `infrastructure/Dockerfile.lab` |
| 构建上下文 | `infrastructure/` + `runtime/`（从 claude-code-diy 复制） |

## 我的构建流程（Windows）

### 前置条件

- Docker Desktop 已启动
- claude-code-diy（sister repo）已克隆到本地（路径：`D:\test-claude-code\claude-code`）

### 构建命令

```powershell
# 方式 1：用 PowerShell 构建脚本（推荐）
.\infrastructure\build-lab-image.ps1 -RuntimeRepoPath "D:\test-claude-code\claude-code" -ImageName byocc-lab

# 方式 2：手动构建（需要先手动准备 runtime 目录）
docker build -t byocc-lab -f infrastructure/Dockerfile.lab infrastructure
```

### 构建脚本做了什么

`build-lab-image.ps1` 从 claude-code-diy repo 白名单复制文件到 `.tmp/lab-image-context/runtime/`，然后用 Dockerfile.lab 构建。白名单包括：

- 文件：`package.json`, `package-lock.json`, `build.mjs`, `cli.js`, `node-esm-hooks.mjs`, `tsconfig.json` 等
- 目录：`src/`, `vendor/`

## 队友构建流程（macOS Apple Silicon）

### 前置条件

1. Docker Desktop 已启动
2. 配置 Docker 镜像加速（国内网络必需）：
   - Docker Desktop → Settings → Docker Engine
   - 添加 `"registry-mirrors": ["https://docker.1ms.run"]`
   - Apply & Restart
3. claude-code-diy 已克隆到本地

### 构建命令

```bash
# 克隆 sister repo（只需一次）
cd ~/desktop/SoftEng
git clone https://github.com/cookiesheep/claude-code-diy.git

# 用构建脚本构建
cd build-your-own-claude-code
./infrastructure/build-lab-image.sh ../claude-code-diy byocc-lab
```

### 平台说明

- 队友 Mac 是 Apple Silicon（ARM），我的 Windows 是 amd64
- Apple Silicon 的 Docker Desktop 通过 Rosetta 可以运行 amd64 镜像（有轻微性能损耗）
- 正式部署到 Linux 服务器（amd64）后无此问题

## 快速方案：导出/导入镜像

当网络不好或构建环境不完整时，可以直接传镜像文件。

### 导出（我的 Windows）

```powershell
docker save byocc-lab -o byocc-lab.tar
# 文件位置：项目根目录下的 byocc-lab.tar，约 554MB
```

### 导入（队友的 Mac）

```bash
docker load -i byocc-lab.tar
```

### 注意事项

- 导出的是 amd64 镜像，Mac 上能用但有平台警告，不影响功能
- 镜像是构建时的快照，代码更新后需要重新构建再导出
- 不适合长期依赖，应尽早让队友能自己构建

## 服务器部署

最终部署到队友的服务器（Linux amd64）时：

1. 服务器上克隆两个 repo：`build-your-own-claude-code` + `claude-code-diy`
2. 用 `build-lab-image.sh` 构建（Linux 下无网络/平台问题）
3. 配合 docker-compose 或 systemd 启动后端服务

## 常见问题

### Q: docker build 报 `failed to fetch oauth token`

**原因**：国内网络连不上 Docker Hub（`auth.docker.io` 被墙）。

**解决**：配 Docker 镜像加速，或手动拉基础镜像：
```bash
docker pull swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/library/node:22-bookworm-slim
docker tag swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/library/node:22-bookworm-slim node:22-bookworm-slim
```

### Q: 构建报 `COPY runtime/ ... not found`

**原因**：`runtime/` 目录不存在。这个目录需要从 claude-code-diy（sister repo）复制过来。

**解决**：用构建脚本（`build-lab-image.ps1` 或 `build-lab-image.sh`），不要直接 `docker build`。

### Q: Dockerfile 里下载 ttyd 失败

**原因**：GitHub releases 也被墙。

**解决**：手动下载 ttyd 二进制后修改 Dockerfile 用本地文件：
```bash
# 提前下载
curl -sL https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.x86_64 -o infrastructure/ttyd.x86_64
```
然后改 Dockerfile 里的 `RUN curl ...` 为 `COPY ttyd.x86_64 /usr/local/bin/ttyd`。

### Q: Mac 报 `InvalidBaseImagePlatform`

**原因**：拉的是 amd64 镜像，Mac 期望 arm64。

**解决**：功能不受影响，只是有警告。如果介意，拉 arm64 版本：
```bash
docker pull --platform linux/arm64 node:22-bookworm-slim
```
