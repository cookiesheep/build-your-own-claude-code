# Claude Code 源码学习指南

> 本文档帮助团队成员快速掌握 Claude Code 的核心架构。
> 你不需要读懂 416,500 行代码——只需要读懂其中 3% 的核心 Harness。

---

## 第一部分：总览——你面对的是什么

### 代码规模

```
416,500 行代码，1,916 个文件

┌──────────────────┬──────────┬───────┬─────────────────────────────────┐
│ 模块              │   行数   │ 占比  │ 你需要做什么                     │
├──────────────────┼──────────┼───────┼─────────────────────────────────┤
│ 杂项/工具函数/命令 │ 200,000+ │  48%  │ ❌ 不看。80+ 个 CLI 命令，和核心无关 │
│ TUI/React/Ink UI │  73,000  │  18%  │ ⚡ 了解即可。知道它是 React 渲染的 │
│ 工具实现（50+个） │  50,829  │  12%  │ 👀 挑 2-3 个看看实现模式          │
│ 基础设施          │  32,000  │   8%  │ ❌ 不看。auth/telemetry/sandbox  │
│ ★ 核心 Harness   │  12,000  │   3%  │ 🔥 必须精读，这是我们教的东西      │
│ 其他              │  48,671  │  11%  │ ❌ 不看                          │
└──────────────────┴──────────┴───────┴─────────────────────────────────┘
```

### 核心文件清单（必读，共 ~7,000 行）

按阅读优先级排列：

| 优先级 | 文件 | 行数 | 作用 | 为什么重要 |
|--------|------|------|------|-----------|
| ★★★ | `src/query.ts` | 1,729 | Agent Loop 本体 | **这就是我们整个项目要教的东西** |
| ★★★ | `src/services/tools/toolOrchestration.ts` | ~400 | 工具执行路由 | 理解工具怎么被调度的 |
| ★★☆ | `src/QueryEngine.ts` | 1,295 | Session 管理 | 理解 query() 是怎么被调用的 |
| ★★☆ | `src/services/tools/toolExecution.ts` | ~400 | 单个工具执行 | 理解权限检查和错误处理 |
| ★★☆ | `src/utils/messages.ts` | ~800 | 消息构造 | 理解消息的数据结构 |
| ★☆☆ | `src/services/api/claude.ts` | ~1,500 | LLM API 调用 | 理解流式响应处理 |
| ★☆☆ | `src/Tool.ts` | 792 | 工具类型定义 | 理解 Tool 接口和 ToolUseContext |

### 了解即可的文件（知道作用，不需要细读）

| 文件/目录 | 作用 | 一句话概括 |
|-----------|------|-----------|
| `src/main.tsx` | 应用入口 | React + Ink 渲染 TUI 界面 |
| `src/components/` | UI 组件 (389 个文件) | 消息渲染、输入框、对话框等，全是 React |
| `src/hooks/` | React Hooks (104 个文件) | 状态管理、主题、权限 UI 等 |
| `src/ink/` | Ink 框架封装 (96 个文件) | 终端 UI 框架，相当于终端版 React DOM |
| `src/commands/` | CLI 命令 (189 个文件) | `/commit`、`/review` 等 80+ 个斜杠命令 |
| `src/tools/` | 工具实现 (185 个文件) | 50+ 个工具的具体实现 |
| `src/services/analytics/` | 遥测 | 上报使用数据，和功能无关 |
| `src/services/oauth/` | 认证 | API key 管理，和核心逻辑无关 |
| `src/services/compact/` | 上下文压缩 | 消息太长时自动压缩，高级功能 |
| `src/bridge/` | IDE 集成 | VS Code / JetBrains 扩展通信 |
| `src/bootstrap/` | 启动初始化 | 加载配置、检查环境 |

### 完全不需要看的（可以当它不存在）

| 文件/目录 | 为什么不看 |
|-----------|-----------|
| `src/vim/` | Vim 模式，纯 UI 功能 |
| `src/buddy/` | 实验性功能 |
| `src/voice/` | 语音输入，1 个文件 |
| `src/remote/` | 远程会话 |
| `src/migrations/` | 数据迁移脚本 |
| `src/native-ts/` | 原生 OS 集成 |
| `src/upstreamproxy/` | HTTP 代理 |
| `src/server/` | Direct Connect 服务器 |
| `src/moreright/` | 25 行，未知用途 |

---

## 第二部分：核心数据流——一张图看懂 Agent 的全部

当你在 Claude Code 里输入"帮我创建 hello.js"，内部发生了什么：

```
你的输入: "帮我创建 hello.js"
│
▼
┌─────────────────────────────────────────────────────────────────┐
│ QueryEngine.submitMessage("帮我创建 hello.js")                   │
│                                                                  │
│   1. processUserInput() → 把你的文字包装成 UserMessage           │
│   2. 加入 this.mutableMessages（对话历史，跨轮次持久化）          │
│   3. 调用 query(messages, systemPrompt, tools, ...)             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ query.ts — queryLoop()  while(true)                              │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ 第 1 轮                                                  │   │
│   │                                                          │   │
│   │ ① 调用 LLM (deps.callModel)                             │   │
│   │    发送: messages + systemPrompt + tools定义              │   │
│   │                                                          │   │
│   │ ② LLM 返回（流式）:                                      │   │
│   │    content: [                                            │   │
│   │      { type: "text", text: "好的，我来创建" },            │   │
│   │      { type: "tool_use",                                 │   │
│   │        id: "toolu_abc",                                  │   │
│   │        name: "write_file",                               │   │
│   │        input: { path: "hello.js", content: "..." }       │   │
│   │      }                                                   │   │
│   │    ]                                                     │   │
│   │                                                          │   │
│   │ ③ 检测到 tool_use → needsFollowUp = true                │   │
│   │                                                          │   │
│   │ ④ 执行工具:                                              │   │
│   │    runTools([write_file block])                           │   │
│   │    → toolOrchestration 判断: 写入工具 → 串行执行          │   │
│   │    → toolExecution: canUseTool() → 检查权限              │   │
│   │    → 执行 write_file → 文件创建成功                      │   │
│   │    → 返回 tool_result: "Successfully wrote to hello.js"  │   │
│   │                                                          │   │
│   │ ⑤ 更新 state:                                            │   │
│   │    messages = [                                          │   │
│   │      原有消息...,                                        │   │
│   │      assistant消息（含tool_use）,                         │   │
│   │      user消息（含tool_result）  ← Harness 自动构造的     │   │
│   │    ]                                                     │   │
│   │                                                          │   │
│   │ ⑥ continue → 回到 while(true) 顶部                      │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ 第 2 轮                                                  │   │
│   │                                                          │   │
│   │ ① 调用 LLM（这次消息里包含了 tool_result）               │   │
│   │                                                          │   │
│   │ ② LLM 返回:                                              │   │
│   │    content: [                                            │   │
│   │      { type: "text", text: "已经创建好了 hello.js！" }   │   │
│   │    ]                                                     │   │
│   │    （没有 tool_use）                                      │   │
│   │                                                          │   │
│   │ ③ toolUseBlocks.length === 0 → needsFollowUp = false    │   │
│   │                                                          │   │
│   │ ④ return { reason: 'completed' }  → 循环结束             │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
        TUI 渲染最终回复: "已经创建好了 hello.js！"
        文件 hello.js 已经在你的磁盘上了
```

### 关键细节（容易踩的坑）

**1. tool_result 的 role 是 "user"，不是 "tool"**

```typescript
// Harness 自动构造的消息，不是用户发的
{
  role: "user",  // ← 注意！
  content: [{
    type: "tool_result",
    tool_use_id: "toolu_abc",
    content: "Successfully wrote to hello.js"
  }]
}
```

为什么？因为 Anthropic API 只有 `user` 和 `assistant` 两种 role。tool_result 从 API 视角就是"用户给的信息"。

**2. stop_reason 不可靠**

```typescript
// query.ts 第 554 行注释：
// "Note: stop_reason === 'tool_use' is unreliable"

// 正确做法：检查 content 里有没有 tool_use block
const needsFollowUp = toolUseBlocks.length > 0;  // ✅
// 而不是
const needsFollowUp = stop_reason === 'tool_use'; // ❌
```

**3. 工具执行有并发策略**

```typescript
// toolOrchestration.ts
// 只读工具（read_file, grep, glob）→ 并发执行（最多 10 个同时）
// 写入工具（write_file, bash）→ 串行执行（保证顺序）
```

为什么？读操作互不影响，但写操作可能相互依赖（先写 A 再写 B）。

**4. 每个 tool_use 必须有对应的 tool_result**

API 强制要求：assistant 消息里有多少个 `tool_use` block，下一条 user 消息里就必须有多少个对应的 `tool_result`。缺一个都会报错。

---

## 第三部分：怎么读代码——具体学习方法

### 方法 1：从入口追调用链（推荐首次阅读）

按这个顺序读，每个文件只看关键部分：

```
步骤 1: QueryEngine.ts
  → 找到 submitMessage() 方法（~第 209 行）
  → 看它怎么调用 query()（~第 675 行）
  → 跳过中间的消息处理细节
  → 目标：理解"用户输入怎么变成 query() 的参数"

步骤 2: query.ts
  → 找到 QueryParams 类型定义（~第 181 行）
  → 找到 while(true)（~第 307 行）
  → 找到 deps.callModel()（~第 659 行）
  → 找到 toolUseBlocks 和 needsFollowUp（~第 833 行）
  → 找到 runTools()（~第 1382 行）
  → 找到 state = { messages: [...] }（~第 1716 行）
  → 跳过所有错误恢复分支（1065-1183 行）
  → 目标：理解"while(true) 循环的核心 5 步"

步骤 3: toolOrchestration.ts
  → 找到 runTools() 函数签名（~第 19 行）
  → 看 partitionToolCalls 的逻辑
  → 目标：理解"工具怎么被路由和调度"

步骤 4: toolExecution.ts
  → 找到 runToolUse() 函数签名
  → 看 canUseTool() 权限检查
  → 目标：理解"单个工具怎么被执行"

步骤 5: utils/messages.ts
  → 找到 createUserMessage()（~第 460 行）
  → 看 tool_result 是怎么被包装成 user 消息的
  → 目标：理解"消息的数据结构"
```

**预计时间：3-4 小时。**

### 方法 2：挑一个工具看完整实现（推荐第二次阅读）

选一个简单工具，从定义到执行看完整链路：

```
推荐：FileReadTool

文件：src/tools/FileReadTool/FileReadTool.ts

看什么：
1. 工具的 name、description、inputSchema 怎么定义的
2. execute() 方法怎么实现的
3. 输入是什么，输出是什么
4. 错误怎么处理的（文件不存在、权限不足等）

然后对比看：
- BashTool（更复杂，有超时、stdin 等）
- FileWriteTool（写入工具的模式）
```

**预计时间：1-2 小时。**

### 方法 3：用 debug 跑一遍（推荐动手验证理解）

```bash
# 在 claude-code-diy 目录下
# 在 query.ts 的 while(true) 入口加一行 console.log

# 找到 dist/query.js（构建产物），在循环入口加：
console.log('[LOOP] Turn', turnCount, 'toolUseBlocks:', toolUseBlocks.length);

# 然后运行
node cli.js

# 输入一个需要工具的请求，观察 console 输出
# 你会看到：
# [LOOP] Turn 1 toolUseBlocks: 1
# [LOOP] Turn 2 toolUseBlocks: 0  ← 第二轮没有工具调用，循环结束
```

**预计时间：30 分钟。**

---

## 第四部分：核心类型速查

### Message 类型

```typescript
type Message =
  | UserMessage        // 用户发的 + Harness 自动构造的 tool_result
  | AssistantMessage   // LLM 的回复（可能包含 text + tool_use）
  | SystemMessage      // 系统消息
  | ToolUseSummaryMessage  // 工具使用摘要

// 简化理解：
interface UserMessage {
  type: 'user'
  role: 'user'
  content: string | ContentBlockParam[]  // tool_result 在这里
  uuid: string
}

interface AssistantMessage {
  type: 'assistant'
  role: 'assistant'
  message: {
    content: (TextBlock | ToolUseBlock)[]
    stop_reason: 'end_turn' | 'tool_use' | 'max_tokens'
    usage: { input_tokens: number, output_tokens: number }
  }
  uuid: string
}
```

### ContentBlock 类型

```typescript
// LLM 输出的内容块
{ type: 'text', text: string }
{ type: 'tool_use', id: string, name: string, input: object }

// Harness 构造的结果块
{ type: 'tool_result', tool_use_id: string, content: string, is_error?: boolean }
```

### QueryDeps（依赖注入）

```typescript
type QueryDeps = {
  callModel: typeof queryModelWithStreaming  // LLM 调用
  microcompact: typeof microcompactMessages // 微压缩
  autocompact: typeof autoCompactIfNeeded   // 自动压缩
  uuid: () => string                        // UUID 生成
}

// 生产环境使用真实实现
// 测试/教学可以注入 Mock
const deps = params.deps ?? productionDeps();
```

### ToolUseContext（工具执行上下文）

```typescript
type ToolUseContext = {
  options: {
    tools: Tool[]              // 所有可用工具
    mainLoopModel: string      // 当前模型
    isNonInteractiveSession: boolean
  }
  getAppState: () => AppState  // 获取全局状态（权限、工作目录等）
  setAppState: (updater) => void
  abortController: AbortController  // 取消信号
}
```

---

## 第五部分：query.ts 的 7 个 continue 分支

`query.ts` 的 `while(true)` 里有 7 个不同的 `continue`（回到循环顶部）的情况。核心的只有 1 个（工具执行后继续），其余 6 个是错误恢复：

| # | 位置 | 触发条件 | 做了什么 |
|---|------|---------|---------|
| ★ | 1715 | **有 tool_use → 执行完工具** | 把 tool_result 加入消息，继续循环 |
| 2 | 1115 | Prompt 太长 (413) + 可以压缩 | 压缩旧消息，重试 |
| 3 | 1165 | Prompt 太长 + reactive compact | 更激进的压缩，重试 |
| 4 | 1220 | 输出被截断 (max_tokens) | 提高 token 上限到 64k，重试 |
| 5 | 1251 | 输出被截断 + 恢复模式 | 发"请继续"消息，重试 |
| 6 | 1305 | Stop Hook 报错 | 把错误信息喂给 LLM，重试 |
| 7 | 1340 | Token 预算要求继续 | 发"继续工作"消息，重试 |

**你需要精读的只有 ★ 标记的那个。** 其余 6 个是生产级的容错机制，理解它们存在即可。

---

## 第六部分：学习检查清单

完成以下问题，说明你已经理解了核心架构：

### 基础理解 ✅

- [ ] 能画出"用户输入 → LLM 调用 → 工具执行 → 结果回传 → 循环"的数据流图
- [ ] 能解释 `tool_result` 的 `role` 为什么是 `"user"`
- [ ] 能解释为什么检查 `toolUseBlocks.length > 0` 比检查 `stop_reason` 更可靠
- [ ] 知道 `QueryDeps` 是什么，为什么它让 query() 可测试

### 进阶理解 ✅

- [ ] 能解释并发执行和串行执行工具的区别和原因
- [ ] 能说出 query.ts 的 7 个 continue 分支分别处理什么
- [ ] 能解释 `canUseTool()` 权限检查在什么时候发生
- [ ] 知道 `mutableMessages` 为什么跨轮次持久化

### 动手验证 ✅

- [ ] 在 claude-code-diy 里跑通了 Claude Code
- [ ] 在 query.ts 的循环入口加了 log，观察到了多轮工具调用
- [ ] 读了至少一个工具（如 FileReadTool）的完整实现
- [ ] 能口头讲解整个数据流给其他组员听

---

## 第七部分：推荐学习顺序时间表

| 天数 | 任务 | 预计时间 | 产出 |
|------|------|---------|------|
| Day 1 | 跑通 claude-code-diy，体验 Claude Code | 1-2h | 能正常对话 |
| Day 2 | 读本文档，理解总体架构 | 1h | 能画出数据流图 |
| Day 3 | 按方法 1 追调用链：QueryEngine → query → tools | 3-4h | 完成基础理解检查清单 |
| Day 4 | 按方法 2 读 FileReadTool + BashTool 实现 | 1-2h | 理解工具模式 |
| Day 5 | 按方法 3 加 debug log 跑一遍 | 30min | 亲眼看到循环运行 |
| Day 6 | 团队讨论：每人讲解自己理解的部分 | 1h | 统一认知 |
| Day 7 | 完成进阶理解检查清单 | 1h | 准备好进入开发 |

**总计：约 10 小时 / 人，一周完成。**
