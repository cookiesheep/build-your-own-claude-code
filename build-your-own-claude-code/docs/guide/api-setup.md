# 配置第三方 API（必读）

Claude Code 官方 API 费用较高，本教程教你如何使用第三方 API（以 DeepSeek 为例）运行 Claude Code，覆盖两种方式：环境变量直接配置和 cc-switch 图形工具。

## 为什么需要第三方 API？

| 方案 | 费用 | 适合谁 |
|------|------|--------|
| Anthropic 官方 API | 较贵（claude-haiku ~$0.8/M tokens） | 有预算、需要最佳效果 |
| **DeepSeek API** | 极便宜（约 $0.07/M tokens） | **推荐学习者使用** |
| OpenRouter | 中等，支持多模型 | 想灵活切换模型 |
| 各种 Anthropic 代理 | 视代理而定 | 国内访问困难的用户 |

!!! warning "确认你的 API 兼容性"
    你使用的第三方 API 必须兼容 Anthropic Messages API 格式（`/v1/messages` 端点）。DeepSeek 原生兼容，大多数 OpenRouter 配置也兼容。

---

## 方法一：环境变量（推荐，最直接）

### 使用 .env 文件（适用于 claude-code-diy）

1. 在项目根目录创建 `.env` 文件（参考 `.env.example`）：

```bash
cp .env.example .env
```

2. 编辑 `.env`，以 DeepSeek 为例：

```env
# DeepSeek API 配置
ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic
ANTHROPIC_AUTH_TOKEN=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 指定使用 DeepSeek 的模型
ANTHROPIC_MODEL=deepseek-chat
ANTHROPIC_DEFAULT_HAIKU_MODEL=deepseek-chat
ANTHROPIC_DEFAULT_SONNET_MODEL=deepseek-chat

# 禁用不必要的流量（推荐）
CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
DISABLE_TELEMETRY=1

# 增加超时（DeepSeek 有时响应较慢）
API_TIMEOUT_MS=600000
```

3. 使用启动脚本（自动加载 .env）：

```bash
# macOS / Linux
bash start.sh

# Windows PowerShell
.\start.ps1
```

或者直接运行（如果环境变量已加载）：

```bash
node cli.js
```

### 常用 API 端点参考

| 提供商 | ANTHROPIC_BASE_URL | 模型名 |
|--------|-------------------|--------|
| DeepSeek | `https://api.deepseek.com/anthropic` | `deepseek-chat` |
| OpenRouter | `https://openrouter.ai/api/v1` | `deepseek/deepseek-chat` |
| 硅基流动 | `https://api.siliconflow.cn/v1` | 见平台文档 |
| Packy API | `https://www.packyapi.com` | 与 Anthropic 一致 |

!!! tip "获取 DeepSeek API Key"
    访问 [platform.deepseek.com](https://platform.deepseek.com/) 注册后在 API Keys 页面创建密钥。新用户有免费额度。

---

## 方法二：cc-switch 图形工具（推荐新手）

**cc-switch** 是一个开源桌面应用，可视化管理 Claude Code 的 API 配置，支持多配置切换，无需手动编辑环境变量。

### 安装 cc-switch

1. 访问 [github.com/farion1231/cc-switch/releases](https://github.com/farion1231/cc-switch/releases)
2. 下载对应系统的安装包：
   - Windows: `cc-switch-x.x.x-setup.exe`
   - macOS: `cc-switch-x.x.x.dmg`
   - Linux: `cc-switch-x.x.x.AppImage`
3. 安装并打开

### 添加 DeepSeek 配置

打开 cc-switch 后：

1. 点击 **「+ 添加配置」** 或 **「Add Profile」**
2. 填写以下信息：
   - **名称**：`DeepSeek`（自定义）
   - **Base URL**：`https://api.deepseek.com/anthropic`
   - **API Key**：你的 DeepSeek API Key（以 `sk-` 开头）
   - **Haiku 模型**：`deepseek-chat`
   - **Sonnet 模型**：`deepseek-chat`
   - **Opus 模型**：`deepseek-chat`（或 `deepseek-reasoner`）
3. 点击 **保存**
4. 选中该配置并点击 **「切换」** 或 **「Apply」**

!!! success "验证配置"
    切换后运行 `claude` 或 `node cli.js`，尝试发送一条消息。如果收到回复，说明配置成功。

### cc-switch 的优势

- **多配置管理**：可以同时保存官方 Claude、DeepSeek、OpenRouter 等多个配置
- **一键切换**：在不同 API 之间秒级切换
- **自动测试延迟**：测试各配置的响应速度
- **无需修改代码**：通过系统环境变量注入，对所有 Claude Code 实例生效

---

## 验证 API 是否工作

配置完成后，用 `--print` 模式（无头模式）快速验证：

```bash
node cli.js -p --bare "say hello"
```

**预期输出**：Claude（或 DeepSeek）的一句话回复，不是报错。

常见错误排查：

| 错误信息 | 原因 | 解决方法 |
|---------|------|---------|
| `401 Unauthorized` | API Key 错误或过期 | 检查 Key 是否正确填写 |
| `403 Forbidden` | 代理限制 | 检查代理是否支持该端点 |
| `ECONNREFUSED` | Base URL 不可访问 | 检查网络和 Base URL |
| `Please run /login` | 未读取到 API Key | 确认 .env 已加载或环境变量已设置 |

---

## 在 claude-code-diy 中的特殊说明

claude-code-diy 已对认证逻辑做了简化：**只要设置了 `ANTHROPIC_API_KEY` 环境变量，就会直接使用，无需通过 `/login` 流程**。这让第三方 API 的配置更简单。

如果你使用的 API 服务使用 Bearer Token（而非 `x-api-key` 头），请使用 `ANTHROPIC_AUTH_TOKEN` 而不是 `ANTHROPIC_API_KEY`：

```env
ANTHROPIC_AUTH_TOKEN=sk-your-token-here
```
