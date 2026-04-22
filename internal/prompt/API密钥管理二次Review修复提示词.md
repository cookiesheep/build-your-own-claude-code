# Codex 修复任务：API Key 管理二次 Review 遗留问题

## 项目背景

BYOCC (Build Your Own Claude Code) 教学平台。当前分支：`codex/api-key-management-refactor`。

上一轮 Code Review 发现了若干问题，大部分已修复。本轮有 3 个 HIGH 级别遗留问题需要修复，以及若干 MEDIUM 级别问题建议修复。

## 必须阅读的文件

开始前先读这些文件理解当前代码：

- `server/src/services/container-manager.ts` — 容器管理，session token 缓存
- `server/src/routes/llm-proxy.ts` — LLM 代理，SSE 转发，DNS 验证
- `server/src/services/api-base-url.ts` — SSRF 防护
- `server/src/services/http-timeout.ts` — fetch 超时
- `server/src/services/api-key-validation-rate-limit.ts` — validate-key 限流
- `server/src/routes/settings.ts` — settings API
- `platform/src/components/ApiKeyGate.tsx` — 前端 Key 配置弹窗

---

## 任务 1（HIGH）：解决服务器重启后 ECONNRESET

### 问题

Session token 存在内存 Map（`sessionTokenCache`）中。服务器每次重启，Map 清空。用户点击"启动实验环境"时：

```
createContainer → 发现已有容器但没有 token
→ removeContainer(删旧容器) → 重建新容器
→ 多次 Docker 操作耗时过长 → Next.js 代理超时 → ECONNRESET
```

这是用户当前实际遇到的 bug。

### 修复方案

在 `container-manager.ts` 的 `createContainer` 中，当发现已有 running 容器但没有 token 时，**不要删除重建**，而是**为已有容器重新生成 token 并更新容器的环境变量**。

具体改法：

```typescript
// container-manager.ts createContainer 函数中
if (existingContainer) {
  if (!hasSessionToken(sessionId)) {
    // 不要 removeContainer + 重建
    // 而是为已有容器重新生成 token，通过 docker exec 更新环境变量
    const newToken = generateSessionToken(sessionId);
    rememberSessionToken(newToken, sessionId, userId);

    // 用 docker exec 在容器内写入新的环境变量
    // 这比删容器+建容器快得多
    try {
      const exec = await existingContainer.container.exec({
        Cmd: [
          'bash', '-c',
          `echo 'export ANTHROPIC_API_KEY=${newToken}' >> /etc/profile.d/byocc-env.sh && ` +
          `echo 'export ANTHROPIC_BASE_URL=${getProxyBaseUrl()}' >> /etc/profile.d/byocc-env.sh`
        ],
        AttachStdout: true,
        AttachStderr: true,
      });
      await exec.start({});
    } catch (error) {
      // 如果 exec 失败，再回退到删容器重建
      console.warn('[container-manager] Failed to re-inject token, rebuilding container', error);
      await removeContainer(sessionId);
      // fall through 到下面的创建逻辑（不要递归调用 createContainer）
      existingContainer = null;
    }
  }

  if (existingContainer) {
    if (existingContainer.info.State.Status !== 'running') {
      await existingContainer.container.start();
    }
    sessionContainers.set(sessionId, existingContainer.info.Id);
    return existingContainer.info.Id;
  }
}
```

**但注意**：`docker exec` 写入的 env 只对新 shell session 生效（通过 /etc/profile.d），不影响已在运行的进程。对于 ttyd 这种场景（用户在终端里操作，每次开新 shell 都会 source profile），这是可以的。

如果觉得 exec 方案不够可靠，还有一个更简单的方案：

**方案 B（更简单）**：在已有容器没有 token 时，不删除重建，而是**只重新生成 token 存入内存 Map，不动容器**。容器的 ENV 里还是旧 token，但此时后端也不认识旧 token 了——所以需要额外处理。

推荐方案 B 的改进版：让 `validateContainerSessionToken` 除了查内存 Map，也容许从容器 ENV 中读出的"原始 token"通过验证。但这需要改动较大。

**最终推荐**：方案 A（docker exec 重新注入 token），但要处理 exec 失败的回退。

---

## 任务 2（HIGH）：代理每次请求都做 DNS 查询

### 问题

`llm-proxy.ts` 的 `proxyRequest` 中：

```typescript
const safeApiBaseUrl = await assertSafeApiBaseUrl(input.apiBaseUrl);
```

每次 LLM 代理请求都调用 `assertSafeApiBaseUrl`，内部做 `dns.lookup()`。对于 `api.anthropic.com` 这种稳定域名，每个 API 调用都额外增加 DNS 解析延迟。

### 修复方案

在 `llm-proxy.ts` 中，对 `proxyRequest` 的 SSRF 检查加缓存。

**方案**：在 `api-base-url.ts` 中导出一个带缓存的版本，或者直接在 `llm-proxy.ts` 中跳过 DNS 查询（因为 apiBaseUrl 来自数据库，保存时已经验证过安全性了）。

推荐做法：在 `proxyRequest` 中**不做 `assertSafeApiBaseUrl`**，因为 `input.apiBaseUrl` 来自 `resolveContainerApiConfig`，它返回的值要么是 `.env` 里的默认值（管理员配置的，可信），要么是数据库里用户的值（在 `PUT /api/settings/api-key` 时已经通过 `assertSafeApiBaseUrl` 验证了）。

```typescript
// llm-proxy.ts proxyRequest 中
// 修改前：
const safeApiBaseUrl = await assertSafeApiBaseUrl(input.apiBaseUrl);
const targetUrl = `${safeApiBaseUrl.replace(/\/$/, '')}${getAnthropicPath(req)}`;

// 修改后：
// apiBaseUrl 已在保存时验证过安全性，代理热路径不做 DNS 查询
const targetUrl = `${input.apiBaseUrl.replace(/\/$/, '')}${getAnthropicPath(req)}`;
```

保留 `settings.ts` 中 PUT 端点的 `assertSafeApiBaseUrl` 调用不变（那是安全入口）。

---

## 任务 3（MEDIUM）：IPv6-mapped IPv4 地址绕过 SSRF 防护

### 问题

`api-base-url.ts` 的 `isPrivateAddress` 不处理 IPv6-mapped IPv4 地址如 `::ffff:127.0.0.1`。

`isIP('::ffff:127.0.0.1')` 返回 `6`（IPv6），然后 `startsWith` 检查 `::1`、`fc`、`fd`、`fe80` 都不匹配 `::ffff:`，所以这个地址会通过安全检查。

### 修复方案

在 `api-base-url.ts` 的 `isPrivateAddress` 函数中，添加 IPv6-mapped IPv4 处理：

```typescript
function isPrivateAddress(address: string): boolean {
  const ipVersion = isIP(address);
  if (ipVersion === 4) {
    return PRIVATE_IPV4_RANGES.some((range) => range.test(address));
  }

  if (ipVersion === 6) {
    const normalizedAddress = address.toLowerCase();
    // 检查 IPv6-mapped IPv4 地址，如 ::ffff:127.0.0.1
    const v4Mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(normalizedAddress);
    if (v4Mapped) {
      return isPrivateAddress(v4Mapped[1]);  // 递归检查内嵌的 IPv4
    }
    return PRIVATE_IPV6_PREFIXES.some((prefix) => normalizedAddress.startsWith(prefix));
  }

  return false;
}
```

同时在 `api-base-url.test.ts` 中添加测试：

```typescript
it('blocks IPv6-mapped IPv4 private addresses', async () => {
  // ::ffff:127.0.0.1 应该被拦截
  await expect(assertSafeApiBaseUrl('http://[::ffff:127.0.0.1]:3000/test')).rejects.toThrow();
});
```

---

## 任务 4（MEDIUM）：限流 Map 内存泄漏

### 问题

`api-key-validation-rate-limit.ts` 的 `userBuckets` 和 `ipBuckets` 只增不减。

### 修复方案

添加定时清理。在文件底部添加：

```typescript
// 每 5 分钟清理过期桶
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of userBuckets.entries()) {
    if (bucket.resetAt <= now) {
      userBuckets.delete(key);
    }
  }
  for (const [key, bucket] of ipBuckets.entries()) {
    if (bucket.resetAt <= now) {
      ipBuckets.delete(key);
    }
  }
}, 5 * 60 * 1000);
```

---

## 任务 5（MEDIUM）：补充 llm-proxy 关键路径测试

### 问题

`llm-proxy.test.ts` 只测了两个纯函数（路径映射和 SSE 解析）。缺少以下测试：

### 修复方案

在 `llm-proxy.test.ts` 中补充：

```typescript
describe('readUsageFromBody', () => {
  it('extracts usage from JSON response body', () => {
    // 测试 JSON 响应中的 usage 提取
    expect(readUsageFromBody({ usage: { input_tokens: 100, output_tokens: 50 } }))
      .toEqual({ input_tokens: 100, output_tokens: 50 });
  });

  it('returns zeros for missing usage', () => {
    expect(readUsageFromBody({})).toEqual({ input_tokens: 0, output_tokens: 0 });
    expect(readUsageFromBody(null)).toEqual({ input_tokens: 0, output_tokens: 0 });
  });
});

describe('extractSessionToken', () => {
  it('extracts Bearer token from Authorization header', () => {
    // 测试 token 提取
  });

  it('returns null for missing or malformed headers', () => {
    // 测试边界情况
  });
});
```

注意：`extractSessionToken` 和 `readUsageFromBody` 当前不是 export 的。你需要把它们 export 才能在测试中导入。或者通过测试代理路由来间接测试。

---

## 实现顺序

1. **任务 1**（ECONNRESET 修复）— 最重要，修完用户就能正常使用了
2. **任务 2**（去掉代理热路径的 DNS 查询）— 简单改动，立即提升性能
3. **任务 3**（IPv6-mapped IPv4 防护）— 安全修复
4. **任务 4**（限流内存清理）— 简单改动
5. **任务 5**（补充测试）— 最后做

## 验证

每完成一个任务后运行：

```bash
cd server && npx tsc --noEmit --project tsconfig.json
cd server && npm run build
cd platform && npx tsc --noEmit --project tsconfig.json
cd platform && npm run build
```

全部完成后运行测试（注意本机 Temp 空间问题）：

```powershell
$env:TEMP = 'D:\code\build-your-own-claude-code\.tmp\vitest'
$env:TMP = $env:TEMP
cd server && npm test
```

手动验证 ECONNRESET 修复：
1. 启动后端 → 启动前端
2. 登录 → 进入 Lab → 启动环境
3. 重启后端（模拟服务器重启）
4. 刷新页面 → 再次点击启动环境
5. 应该不再出现 socket hang up 错误
