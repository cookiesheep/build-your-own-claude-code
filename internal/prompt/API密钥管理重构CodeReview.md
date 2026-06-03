# Code Review: API Key 管理系统重构

分支：`codex/api-key-management-refactor`
变更：13 files changed, 472 insertions(+), 23 deletions(-)

---

## [CRITICAL] validate-key 端点存在 SSRF 风险

**文件**：`server/src/routes/settings.ts:174-187`

```typescript
const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/v1/messages`, { ... });
```

`apiBaseUrl` 来自用户输入，只校验了 `http:` / `https:` 协议，但未限制目标地址。攻击者可以构造：
- `http://169.254.169.254/latest/meta-data/` — AWS 元数据端点
- `http://localhost:3001/api/settings/api-key` — 内网服务
- `http://10.0.0.1/...` — 内网扫描

**风险**：服务器端请求伪造（SSRF），可探测内网服务、读取云平台元数据。

**建议**：添加域名/IP 白名单或至少阻止内网地址段：
```typescript
function isAllowedApiBaseUrl(url: string): boolean {
  const parsed = new URL(url);
  const blocked = ['169.254.', '10.', '192.168.', '127.', '0.', 'localhost', '::1'];
  const hostname = parsed.hostname.toLowerCase();
  return !blocked.some(prefix => hostname === prefix || hostname.startsWith(prefix));
}
```
LLM 代理的 `proxyRequest`（`llm-proxy.ts:113`）有同样的问题——用户自定义 `apiBaseUrl` 可以指向任意地址。但因为代理的 `apiBaseUrl` 来自数据库（经管理员设置的加密存储），风险较低。不过 validate-key 端点是实时用户输入，必须拦截。

---

## [CRITICAL] validate-key 端点可被滥用为开放代理

**文件**：`server/src/routes/settings.ts:153-223`

任何已登录用户可以反复调用 `POST /api/settings/validate-key` 向任意 URL 发送 POST 请求。攻击者可以用它：
- 对外部 API 发起 DDoS（伪造来源 IP）
- 横向扫描内网服务
- 消耗平台出站带宽

**建议**：
1. 添加频率限制（如每用户每分钟 5 次）
2. 在保存 Key 之后才允许验证，而不是可以验证任意 URL + 任意 Key 的组合
3. 或者验证时只允许平台已知的预设域名（anthropic.com、open.bigmodel.cn、api.deepseek.com）

---

## [HIGH] SSE 流式响应未处理客户端断连

**文件**：`server/src/routes/llm-proxy.ts:133-154`

```typescript
const reader = response.body?.getReader();
if (reader) {
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(decoder.decode(value, { stream: true }));
  }
}
```

如果客户端（容器中的 SDK）在流式传输中断开连接，`res.write()` 会报错但被外层 catch 吞掉，同时上游 Anthropic 的响应仍在读取——造成资源泄漏。

**建议**：监听 `res` 的 `close` 事件，取消上游读取：
```typescript
req.on('close', () => { reader.cancel(); });
```

---

## [HIGH] proxyRequest 中对非 JSON 响应的 fetch 无超时

**文件**：`server/src/routes/llm-proxy.ts:114`

```typescript
const response = await fetch(targetUrl, { ... });
```

Node.js 的 `fetch` 无默认超时。如果上游 API 卡住，代理请求会永远挂起，占用 Express 线程。

**建议**：添加 `AbortController` + 超时：
```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 120_000);
try {
  const response = await fetch(targetUrl, { signal: controller.signal, ... });
  // ...
} finally {
  clearTimeout(timeout);
}
```

---

## [HIGH] createContainer 递归调用可能死循环

**文件**：`server/src/services/container-manager.ts:299-313`

```typescript
export async function createContainer(sessionId: string, userId?: string): Promise<string> {
  const existingContainer = await resolveContainer(sessionId);
  if (existingContainer) {
    if (!hasSessionToken(sessionId)) {
      await removeContainer(sessionId);
      return createContainer(sessionId, userId);  // 递归
    }
    // ...
  }
  // ...
}
```

如果 `removeContainer` 成功但 `resolveContainer` 仍然返回容器（竞态条件，或 Docker 返回缓存的容器信息），就会无限递归。

**建议**：改为非递归模式，或加最大重试次数：
```typescript
if (!hasSessionToken(sessionId)) {
  await removeContainer(sessionId);
  // 不要递归，直接 fall through 到下面的创建逻辑
}
```
注意：`removeContainer` 成功后 `resolveContainer` 应该返回 null（因为容器已被删除），所以理论上不会死循环。但加一个保护更安全。

---

## [HIGH] 流式响应总是记录 token=0

**文件**：`server/src/routes/llm-proxy.ts:146-153`

```typescript
recordApiUsage({
  inputTokens: 0,
  outputTokens: 0,
  keySource: input.keySource,
});
```

流式响应的 token usage 全部记录为 0。这意味着用量追踪数据对默认 Key 用户是不准确的——看起来他们消耗了 0 tokens，但实际可能消耗了很多。

对于限流来说问题不大（限流是按请求数而不是 token 数），但对于运营数据分析来说这是严重的数据缺失。

**建议**：流式响应完成后，解析 SSE 中的 `message_delta` 事件提取 `usage` 字段。Anthropic 的流式响应最后会发送一个包含完整 usage 的 `message_stop` 事件。

---

## [MEDIUM] 测试文件名与内容不匹配

**文件**：
- `server/src/services/encryption.test.ts` — 实际测试的是 rate limit
- `server/src/services/rate-limit.test.ts` — 实际测试的是 encryption

文件名和 `describe()` 块完全交叉了。

**建议**：交换文件内容或重命名文件。

---

## [MEDIUM] 测试覆盖不足 — 缺少 LLM Proxy 核心测试

没有针对 `llm-proxy.ts` 的单元测试。这是整个重构最核心的新文件，涉及：
- session-token 验证
- 路径映射（`/api/llm/messages` → `/v1/messages`）
- 限流拦截
- SSE 转发

**建议**：至少添加以下测试：
- `getAnthropicPath` 的路径映射（`/api/llm/messages` → `/v1/messages`、`/api/llm/v1/messages` → `/v1/messages`）
- 无 token → 401
- 无效 token → 403
- 超限 → 429
- `extractSessionToken` 边界情况

---

## [MEDIUM] SettingsModal handleSave 中 handleValidate 的状态管理问题

**文件**：`platform/src/components/SettingsModal.tsx:84-115`

```typescript
const handleSave = async () => {
  // ...
  const validation = await handleValidate();  // handleValidate 内部修改了 validationResult state
  if (!validation.valid) {
    setState("error");
    setMessage(validation.message ?? "API Key 验证失败，未保存。");
    return;
  }
  // ...
};
```

`handleValidate` 内部会调用 `setValidating(true)` / `setValidating(false)` 和 `setValidationResult()`。这些是 UI 状态变更，不应该在 `handleSave` 的业务逻辑中触发。更严重的是：`handleSave` 内部调用 `handleValidate` 时，如果验证的网络请求失败（catch 块中），`handleValidate` 的 `finally` 块会设置 `setValidating(false)`，但 `handleSave` 此时已经设置了 `setState("error")`——两个状态机在竞争。

**建议**：提取一个纯逻辑的验证函数（不操作 UI state），在 handleSave 和 handleValidate 按钮中分别调用。

---

## [MEDIUM] ApiKeyGate 未清理 localStorage 选择

**文件**：`platform/src/components/ApiKeyGate.tsx:98-101`

当用户选择"使用平台共享 Key"后，`byocc-chose-default-key` 被写入 localStorage 且永远不会被清除。即使用户后来在 SettingsModal 中切换到自定义 Key，这个 localStorage 值还在（虽然不影响逻辑，因为 `source === 'user'` 检查在 localStorage 检查之前）。

但更大的问题是：用户如果清空了自定义 Key（恢复默认），ApiKeyGate 不会再弹出（因为 localStorage 里有 `true`），用户直接进入 Lab。这是预期行为吗？

**建议**：在 SettingsModal 的 `handleDelete` 中也清除 `byocc-chose-default-key`，这样用户恢复默认后下次进 Lab 会再次看到弹窗（可以重新选择）。

---

## [MEDIUM] DeepSeek API 兼容路径未确认

**文件**：`platform/src/components/ApiKeyGate.tsx:28`

```typescript
{ name: "DeepSeek", url: "https://api.deepseek.com/anthropic" },
```

DeepSeek 是否真的有 `/anthropic` 兼容端点？根据 DeepSeek 官方文档，他们的 API 端点是 `https://api.deepseek.com`，使用 OpenAI 兼容格式，没有 Anthropic 兼容端点。

**建议**：确认 DeepSeek 是否支持 Anthropic Messages API 格式。如果不支持，应该从预设列表中移除，避免用户选了之后调不通。

---

## [MEDIUM] 日志中可能泄漏部分 API Key 信息

**文件**：`server/src/services/container-manager.ts:203-205`

```typescript
console.warn(
  `[container-manager] Failed to decrypt API key for user ${userId}, falling back to default. Error: ${error instanceof Error ? error.message : String(error)}`
);
```

`userId` 在日志中明文出现。虽然不是 API Key，但结合日志中的其他信息（时间、IP），可能被用来关联用户行为。

**建议**：生产环境应避免在日志中输出 userId，或使用哈希后的 ID。

---

## [LOW] rate-limit.ts 的 parseInt 对 NaN 的处理

**文件**：`server/src/services/rate-limit.ts:13-16`

```typescript
function readPositiveIntegerEnv(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
```

实现正确——`Number.isFinite(NaN)` 返回 `false`，会回退到 fallback。这只是确认行为正确。

---

## [LOW] Navbar 中 Link 被错误写成了 button 闭合标签

**文件**：`platform/src/components/Navbar.tsx:269-274`（第 274 行）

```tsx
<Link href={...} className="...">
  登录
</button>   {/* ← 应该是 </Link> */}
```

这是一个 JSX 语法错误。如果这个代码能编译通过，说明可能实际代码是对的但 diff 渲染有误。需要确认实际代码。

---

## [LOW] ApiKeyGate 的 labId prop 未使用

**文件**：`platform/src/components/ApiKeyGate.tsx:43`

`labId` 只出现在 useEffect 的依赖数组中，组件内没有其他地方使用。如果只是为了让 effect 在不同 lab 切换时重新检查，那没问题。但 `gateState` 设为 ready 后不会再变回 loading，所以切换 lab 时 effect 虽然重新执行但行为不变。

---

## [POSITIVE] 做得好的地方

1. **安全架构根本性提升**：真实 API Key 不再进入容器，彻底解决了之前的提取风险。session-token 方案设计合理。
2. **解密失败降级**：`resolveContainerApiConfig` 中 catch decrypt 错误并 fallback 到默认 Key，避免 500 错误，同时通过 `keyFallback` 标记通知前端。
3. **限流设计**：BYOK 用户不受限、默认 Key 按用户/按 session 双重限额，合理且灵活。
4. **ApiKeyGate UX**：首次进入 Lab 自动弹窗，localStorage 记住选择避免重复打扰，预设 URL 方便用户选择。
5. **container-manager 的 token 管理清晰**：`rememberSessionToken` 会先清理同一 session 的旧 token，避免内存泄漏。
6. **proxyRequest 的错误处理**：检查 `res.headersSent` 避免二次发送响应头。
7. **SettingsModal 定位修复**：从 `z-[80]` 改为 `z-[60]`，与 Navbar 的 `z-50` 形成合理层级。

---

## [VERDICT]

### REQUEST_CHANGES

**必须修复**（阻塞合并）：
1. validate-key 的 SSRF 风险 — 添加内网地址过滤
2. validate-key 缺少频率限制 — 防止被滥用为开放代理
3. SSE 流式响应未处理客户端断连 — 资源泄漏风险
4. 测试文件名和内容交叉 — 影响后续维护

**强烈建议修复**（不阻塞但尽快）：
5. fetch 添加超时（AbortController）
6. createContainer 递归调用加保护
7. 补充 llm-proxy 的核心单元测试
8. 确认 DeepSeek 的 Anthropic 兼容路径是否正确
9. SettingsModal handleSave 中 handleValidate 的状态管理解耦
