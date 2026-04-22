# Cloudflare Tunnel 双机部署研究

## 项目背景

BYOCC (Build Your Own Claude Code) 是一个教学平台，帮助学习者逐步实现 Coding Agent 的核心模块。

技术栈：
- 前端：Next.js 15（端口 3000，生产用 `npm run build && npm run start`）
- 后端：Express + SQLite + Docker（端口 3001，开发用 `npm run dev`）
- 外网访问：Cloudflare Tunnel → `byocc.cc`

目前的生产部署是一台 macOS 台式机，通过以下脚本启动：

```bash
#!/bin/bash
# platform/start-byocc.sh

PROJECT_DIR="/Users/zhangfei/desktop/SoftEng/build-your-own-claude-code"

# [1/3] 启动后端（Terminal 窗口 1）
cd $PROJECT_DIR/server && npm run dev

# [2/3] 启动前端（Terminal 窗口 2）
cd $PROJECT_DIR/platform && npm run build && npm run start

# [3/3] 启动 Cloudflare Tunnel（Terminal 窗口 3）
cloudflared tunnel run byocc
```

Tunnel 名为 `byocc`，已经在 Cloudflare 后台配置了 DNS：`byocc.cc → 这个 tunnel`。

当前这台 Mac 是唯一的 connector，所有公网流量都经过它。

## 我们想做什么

我们想让第二台机器（Windows 11）也加入同一个 tunnel，作为备用/备用服务器。

初步想法是利用 Cloudflare 的 replicas 机制：同一个 tunnel 可以运行多个 `cloudflared` connector，实现高可用。

## 请研究以下问题

### 1. 可行性分析

- Cloudflare Tunnel replicas 是否支持我们的场景（两台不同机器、不同系统：一台 Mac + 一台 Windows）？
- 两个 connector 同时在线时，流量如何分配？是 round-robin、随机、还是有优先级？
- 如果 Mac 上在跑服务但 Windows 上没跑，流量打到 Windows 会怎样？502？

### 2. Windows 部署脚本

- Windows 上 `cloudflared` 的安装方式（scoop / winget / 手动下载）
- Windows 上如何运行 `cloudflared tunnel run byocc`？是否需要同一个 tunnel credential 文件？
- Windows 上的启动脚本怎么写（PowerShell 或 bat）？类似 Mac 版本启动三个终端窗口
- Windows 上 Docker Desktop 是否需要额外配置才能让容器通过 `host.docker.internal` 访问宿主机？

### 3. 代码同步问题（最重要）

两台机器上的代码如果版本不同步，会出现什么问题？具体场景：

- Mac 上是 v1 版本代码，Windows 上是 v2 版本代码
- 用户访问 `byocc.cc`，Cloudflare 随机打到 Mac 或 Windows
- 用户看到的页面版本不确定（可能是 v1 也可能是 v2）
- 后端 API 版本不一致（数据库 schema 可能不同）
- SQLite 数据库是本地文件，两边数据完全独立

请详细分析这个问题的严重性，以及可能的解决方案，比如：
- 是否可以让 Cloudflare 只把流量打到指定的 primary connector，另一台作为 standby？
- 是否需要额外的同步机制（rsync、git pull 定时任务等）？
- 是否应该放弃 replicas 方案，改用主备切换（手动切 DNS）？
- 是否有更好的部署架构推荐？

### 4. Tunnel 凭证安全

- `<tunnel-id>.json` 这个凭证文件如何安全地分享给队友？
- 如果凭证泄露，如何在 Cloudflare 侧轮换？
- 凭证文件在 Windows 上应该放在哪个目录？

### 5. 网络与性能

- 两台机器在不同网络环境下（比如 Mac 在校园网、Windows 在家庭宽带），延迟差异大吗？
- Cloudflare Tunnel 的 connector 是否会自动选择离用户最近的？
- 是否需要配置 health check，让 Cloudflare 自动摘除不健康的 connector？

## 我们期望的输出

1. 一个明确的结论：这个双机 replicas 方案是否适合我们的场景
2. 如果适合：给出 Windows 部署的完整步骤和脚本
3. 如果不适合：推荐一个替代方案（比如主备切换、反向代理等）
4. 代码同步的最佳实践建议
