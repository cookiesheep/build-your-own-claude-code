# Public Demo Security Checklist

> 目标：在把 BYOCC 通过 Cloudflare Tunnel 暴露给队友前，确认平台不是带着开发默认值和过宽访问边界上线。

---

## 0. 结论先行

推荐顺序：

```text
本地 E2E regression 通过
→ 设置真实 BYOCC env
→ 用 Cloudflare Access 保护 public hostname
→ 启动 Cloudflare Tunnel
→ 浏览器手动验证 /lab/3
→ demo 结束后关闭 tunnel 并 cleanup dry-run
```

不推荐：

```text
cloudflared tunnel --url http://localhost:3000
→ 直接把 trycloudflare 随机 URL 丢到群里
→ 不设置 BYOCC_AUTH_SECRET / CORS_ORIGINS / Access policy
```

Cloudflare 官方文档说明：

- Cloudflare Tunnel 通过本机 `cloudflared` 主动建立 outbound-only 连接到 Cloudflare，因此本机不需要直接暴露公网入站端口。参考：[Cloudflare Tunnel overview](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/)。
- Cloudflare Access 可以作为 self-hosted app 的认证层；Cloudflare 官方也建议在配置 tunnel route 前先创建 Access application，否则公开应用会对互联网可用。参考：[Publish a self-hosted application](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/)。
- Quick Tunnels / TryCloudflare 只适合测试和开发，不适合生产或长期公开 demo。参考：[Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/)。

---

## 1. Public demo 前必须设置的环境变量

### 后端 `server`

PowerShell 示例：

```powershell
cd D:\code\build-your-own-claude-code\server

$env:BYOCC_AUTH_SECRET="<生成一个真实随机 secret，不要用示例值>"
$env:HOST="127.0.0.1"
$env:PORT="3001"
$env:CORS_ORIGINS="https://<你的前端公开域名>"
$env:BYOCC_CONTAINER_CLEANUP_ENABLED="true"
$env:BYOCC_CONTAINER_TTL_MINUTES="120"
$env:BYOCC_CONTAINER_CLEANUP_INTERVAL_MINUTES="10"
$env:BYOCC_CONTAINER_CLEANUP_RUN_ON_START="false"
$env:BYOCC_TERMINAL_TOKEN_TTL_SECONDS="300"

npm run dev
```

说明：

- `BYOCC_AUTH_SECRET`：必须是真实随机 secret。公开 demo 不允许使用后端 dev fallback。
- `HOST=127.0.0.1`：Cloudflare Tunnel 和后端在同一台机器时，优先只监听本机回环地址。
- `CORS_ORIGINS`：只允许真实前端公开域名。不要使用 `*`。
- `BYOCC_CONTAINER_TTL_MINUTES`：demo 时建议 60-120 分钟。太短会打断用户，太长会积累容器。
- `BYOCC_TERMINAL_TOKEN_TTL_SECONDS`：terminal URL 是短期能力 token，demo 时保持短 TTL。

### 前端 `platform`

```powershell
cd D:\code\build-your-own-claude-code\platform
$env:NEXT_PUBLIC_API_URL="https://<你的后端公开域名>"
npm run dev
```

如果前后端都通过同一个 Next.js 域名 / 反向代理暴露，按实际部署域名调整。

---

## 2. Cloudflare Tunnel 推荐姿势

### 推荐：Named Tunnel + Cloudflare Access

适合给队友较稳定地访问几天。

最低要求：

- 在 Cloudflare Zero Trust 中创建 self-hosted Access application。
- Access policy 只允许队友邮箱、团队域名、或临时测试账号。
- Tunnel public hostname 指向本机前端服务，例如：

```text
https://byocc-demo.example.com -> http://127.0.0.1:3000
```

- 如果后端单独暴露，后端 hostname 也必须在 Access / CORS 清单中：

```text
https://byocc-api.example.com -> http://127.0.0.1:3001
```

推荐验证：

```powershell
cloudflared tunnel list
cloudflared tunnel info <tunnel-name-or-id>
```

### 只用于临时测试：Quick Tunnel

Quick Tunnel 可以快速生成随机 `trycloudflare.com` URL，但它只适合短时间测试。

如果必须临时使用：

- 只开很短时间。
- 不要发到公开群。
- 后端仍必须设置真实 `BYOCC_AUTH_SECRET`。
- 前端和后端的公开 URL 都必须写入 `CORS_ORIGINS` / `NEXT_PUBLIC_API_URL`。
- demo 结束后立刻 Ctrl+C 停掉 `cloudflared` 和本地 server。

---

## 3. 公开前 preflight

在分享 URL 之前，按顺序执行。

### 3.1 代码与类型检查

```powershell
cd D:\code\build-your-own-claude-code
npx tsc --noEmit --project server/tsconfig.json
npx tsc --noEmit --pretty false --project platform/tsconfig.json
```

```powershell
cd D:\code\build-your-own-claude-code\server
npm test
npm run build
```

### 3.2 后端 regression

后端先启动：

```powershell
cd D:\code\build-your-own-claude-code\server
$env:BYOCC_AUTH_SECRET="<真实 secret>"
$env:CORS_ORIGINS="https://<前端公开域名>"
npm run dev
```

另开一个 PowerShell：

```powershell
cd D:\code\build-your-own-claude-code\server
$env:BYOCC_E2E_BASE_URL="http://127.0.0.1:3001"
npm run e2e:regression
npm run e2e:regression:full
```

期望最后看到：

```text
PASS BYOCC E2E regression checks completed.
```

### 3.3 cleanup dry-run

```powershell
cd D:\code\build-your-own-claude-code\server
npx tsx src/scripts/cleanup-containers.ts --dry-run --max-idle-minutes=999999
```

确认不会误删正在使用的容器。

### 3.4 浏览器人工验证

打开公开前端 URL：

```text
https://<你的前端公开域名>/lab/3
```

手动确认：

- 页面正常加载。
- 点击“启动实验环境”后 terminal 能连接。
- 点击“提交代码”后构建成功。
- terminal 输入：

```bash
pwd
node cli.js
```

期望：

```text
/workspace
cookiesheep's claude-code v2.1.88
```

---

## 4. 分享 URL 前的最后检查

必须全部为 yes：

- [ ] `BYOCC_AUTH_SECRET` 不是示例值，也不是 dev fallback。
- [ ] `CORS_ORIGINS` 只包含前端公开域名和必要的本地开发域名。
- [ ] `NEXT_PUBLIC_API_URL` 指向后端公开域名或正确的同源代理地址。
- [ ] Cloudflare Access policy 已限制访问者。
- [ ] 后端启动日志显示 TTL cleanup enabled。
- [ ] `npm run e2e:regression` 通过。
- [ ] `npm run e2e:regression:full` 通过。
- [ ] cleanup dry-run 不会误删。
- [ ] 浏览器 `/lab/3` 手动 `node cli.js` 成功。
- [ ] 你知道如何停止 tunnel 和本地 server。

---

## 5. 回滚 / 关闭 demo

停止本地服务：

```powershell
# 在 cloudflared / server / platform 的 PowerShell 窗口按 Ctrl+C
```

检查容器：

```powershell
docker ps --filter "label=byocc.managed=true" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

先 dry-run：

```powershell
cd D:\code\build-your-own-claude-code\server
npx tsx src/scripts/cleanup-containers.ts --dry-run --max-idle-minutes=0
```

确认只包含本次 demo 容器后再执行：

```powershell
npx tsx src/scripts/cleanup-containers.ts --execute --max-idle-minutes=0
```

---

## 6. 下一步与非目标

本清单不是完整登录系统。公开 demo 安全门禁完成后，下一步再做：

```text
codex/github-oauth-identity
```

OAuth 的 scope 仍然应该是：

- 只做 GitHub OAuth。
- 只绑定 / 升级 anonymous user。
- 不做手机号登录。
- 不做邮箱登录。
- 不做管理后台。
- 不重做前端视觉。
