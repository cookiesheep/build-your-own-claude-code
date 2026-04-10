# 方向 D 改进指南 — Lab 1 消息协议 + Lab 2 工具系统

> 基于 2026-04-10 调研成果对原有 README 的改进建议。
> 原有 README.md 保持不变，本文档为新的完整开发指南。

---

## 一、你要做什么

实现 Lab 1（消息协议）和 Lab 2（工具系统）的骨架代码、测试用例和 Demo。

这两个 Lab 是 Lab 3（Agent Loop）的前置基础：
- Lab 1 = Agent 的"血液"——消息格式
- Lab 2 = Agent 的"手脚"——工具系统

---

## 二、为什么这两个 Lab 的设计很关键

### 竞品对比中的定位

| 竞品 | 怎么教消息和工具 | 问题 |
|------|----------------|------|
| shareAI-lab/learn-claude-code | 直接给完整 Python 代码，阅读理解 | 学习者被动 |
| DeepLearning.AI 课程 | 用 LangChain/CrewAI 框架 | 不接触底层 |
| claude-code-from-scratch | 11章中2章覆盖 | 无骨架模式，无测试反馈 |

**BYOCC 的差异化**：学习者自己写消息类型和工具系统，完成后看到真实 Claude Code TUI 中的变化。

### 调研发现的核心问题

**Lab 1 的反馈区分度不足**。原方案中 Lab 1 的反馈是"Agent 能回复但不能做事"——但第一次看到 Claude Code TUI 的学生很可能分不清"能回复文字"和"完整功能"之间的差异。

**改进方向**：Lab 1 的 Demo 和 query-lab-01.ts 必须让学生明确看到"Agent 想用工具但用不了"。

---

## 三、Lab 1 改进设计

### 需要产出的文件

```
labs/lab-01-messages/
├── src/
│   ├── types.ts              # 骨架：消息辅助函数（3 个 TODO）
│   ├── conversation.ts       # 骨架：Conversation 类（5 个 TODO）
│   └── llm-client.ts         # 骨架：LLMClient 类（2 个 TODO）
├── tests/
│   ├── types.test.ts         # 2 个测试
│   ├── conversation.test.ts  # 3 个测试
│   └── llm-client.test.ts    # 1 个测试（Mock Anthropic SDK）
├── solution/                 # 完整参考实现
│   ├── types.ts
│   ├── conversation.ts
│   └── llm-client.ts
├── demo.ts                   # 消息构建 Demo
└── query-lab-01.ts           # TUI 预览版本
```

### 关键改进 1：Demo 展示"Agent 想用工具但用不了"

原 Demo 只展示消息结构。改进后，Demo 应该**模拟**一个 LLM 返回 tool_use 但 Harness 不处理的场景：

```
$ npx tsx labs/lab-01-messages/demo.ts

📨 Lab 1 Demo：消息协议

=== 第一部分：构建消息 ===
[1] role: user     → "帮我创建 hello.js"
[2] role: assistant → text: "好的，我来创建。" + tool_use: write_file
[3] role: user     → tool_result: "文件已创建"     ← 注意：role 是 user！
[4] role: assistant → text: "完成！"

📊 消息统计：4 条消息，~320 tokens

=== 第二部分：Lab 1 的局限 ===
假设你把这些消息发给 LLM，LLM 回复了 tool_use：
  → { type: 'tool_use', name: 'read_file', input: { path: 'src/main.ts' } }

但在 Lab 1 中，我们没有工具系统！所以这个 tool_use 被忽略了。
Agent 只能回复文字，不能真正做事。

  ❌ Agent 说 "我来读取文件" 但什么也没发生。
  
  → Lab 2 会给 Agent 装上"手"——让它真正执行工具。
  → Lab 3 会给 Agent 装上"大脑"——让它自主循环使用工具。
```

这个 Demo 的第二部分让学生明确感知 Lab 1 的局限，建立对 Lab 2/3 的期待。

### 关键改进 2：query-lab-01.ts 的测试 prompt 设计

query-lab-01.ts（TUI 预览版本）中，**测试 prompt 不应该用"你好"这种不需要工具的问题**，而应该用**必然触发工具意图**的指令：

```
推荐的测试 prompt：
- "请读取当前目录的文件列表"     → LLM 想用 bash_execute → 但用不了
- "帮我创建一个 hello.js"        → LLM 想用 write_file → 但用不了
- "src/main.ts 有多少行代码？"   → LLM 想用 read_file → 但用不了

不推荐的测试 prompt：
- "你好"                        → LLM 直接回复文字 → 看不出 Lab 1 的局限
- "什么是 Agent？"              → LLM 直接回复文字 → 看不出区别
```

### 骨架代码设计（保持原方案不变）

**src/types.ts** — 3 个 TODO（辅助函数 + re-export Role）
**src/conversation.ts** — 5 个 TODO（addUserMessage, addAssistantMessage, addToolResults, getMessages, estimateTokens）
**src/llm-client.ts** — 2 个 TODO（constructor, chat）

详细骨架模板见 `internal/LAB_DESIGN.md` 第三节。

### 测试用例（6 个）

| # | 测试名 | 验证什么 |
|---|--------|---------|
| 1 | createTextBlock 格式正确 | 辅助函数 |
| 2 | createToolResultBlock 包含 tool_use_id | 辅助函数 |
| 3 | addUserMessage 添加用户消息 | Conversation |
| 4 | **addToolResults 的 role 是 user** | ★ 最反直觉的点，必须测 |
| 5 | getMessages 返回副本（不可变） | 防止外部修改 |
| 6 | LLMClient.chat 调用正确 | Mock Anthropic SDK |

### "预测→验证"教学设计

在 `src/conversation.ts` 骨架顶部加入：

```typescript
/**
 * 🤔 运行前预测：
 *
 * 如果 LLM 调用了一个工具（比如 read_file），工具执行后的结果
 * 应该用 role='user' 还是 role='assistant' 的消息发回给 LLM？
 *
 * 你的直觉可能是 role='assistant'（因为是 LLM 在处理）。
 * 但正确答案是 role='user'！
 *
 * 为什么？想想 LLM 的视角：它发了 tool_use，然后"有人"给了它结果。
 * 从 LLM 的角度看，这个结果是"用户输入"——所以 role='user'。
 *
 * 这是 Agent 能循环的关键——如果不把工具结果伪装成"用户消息"喂回去，
 * LLM 就不知道发生了什么，循环就断了。
 *
 * 写完代码后运行测试 4（addToolResults 的 role），验证你的理解。
 */
```

---

## 四、Lab 2 改进设计

### 需要产出的文件

```
labs/lab-02-tools/
├── src/
│   ├── tool-registry.ts      # 骨架：ToolRegistry 类（4 个 TODO）
│   ├── tools/
│   │   ├── read-file.ts      # 骨架（1 个 TODO）
│   │   ├── write-file.ts     # 骨架（1 个 TODO）
│   │   └── bash-execute.ts   # 骨架（1 个 TODO，超时已 scaffold）
│   └── tool-executor.ts      # 骨架：ToolExecutor 类（3 个 TODO）
├── tests/
│   ├── tool-registry.test.ts # 2 个测试
│   ├── tools.test.ts         # 4 个测试
│   └── tool-executor.test.ts # 2 个测试
├── solution/                 # 完整参考实现
├── demo.ts                   # 工具执行 Demo
└── query-lab-02.ts           # TUI 预览版本
```

### 关键改进 1：Lab 1 → Lab 2 的衔接 Demo

增加一个**对比 Demo**，用同一个 prompt 展示 Lab 1 和 Lab 2 的区别：

```
$ npx tsx labs/lab-02-tools/demo.ts

🔧 Lab 2 Demo：工具系统

=== 对比 Lab 1 和 Lab 2 ===
用户说："帮我创建 hello.js"

[Lab 1 的行为]
  LLM 回复："好的，我来创建文件。" + tool_use: write_file
  → ❌ 但 Lab 1 没有工具系统，这个 tool_use 被丢弃了
  → ❌ Agent 只能说，不能做

[Lab 2 的行为]
  LLM 回复："好的，我来创建文件。" + tool_use: write_file
  → ✅ ToolRegistry 找到 write_file 工具
  → ✅ ToolExecutor 调用工具，写入文件
  → ✅ 返回 tool_result: "Successfully wrote to hello.js"
  → Agent 真的做了！但只做了一次就停了——因为没有循环。

→ Lab 3 会加上 while(true) 循环，让 Agent 自主决定做几轮。
```

### 关键改进 2：bash-execute.ts 安全说明

在骨架代码中增加安全注释：

```typescript
// src/tools/bash-execute.ts

/**
 * ⚠️ 安全说明（了解一下就好，不影响你的实现）
 *
 * 这个工具允许 Agent 执行任意 shell 命令。在生产环境中这很危险——
 * Agent 可能执行 `rm -rf /` 之类的破坏性命令。
 *
 * Claude Code 的防护措施：
 * 1. 5 层权限系统（Permission → Mode → Tool Check → Path Safety → Sandbox）
 * 2. 每次执行前需要用户确认
 * 3. macOS Seatbelt 沙箱限制文件访问
 *
 * 我们的教学环境中，Docker 容器提供了隔离，所以不用担心。
 * 你只需要实现基本的超时保护（30秒）就够了。
 */
```

### 关键改进 3：query-lab-02.ts 的"用一次就停"反馈设计

query-lab-02.ts 的测试 prompt 应该设计成**需要多轮工具调用才能完成**的任务，这样 Lab 2 中 Agent 只做一步就停的行为才明显：

```
推荐的测试 prompt（需要多轮工具）：
- "帮我创建 hello.js 并运行它"   → Agent 做 write_file → 停了（没做 bash_execute）
- "读 src/main.ts 并告诉我它有多少行" → Agent 做 read_file → 停了（但没分析内容）

不推荐的测试 prompt：
- "创建 hello.js"              → Agent 做 write_file → 停了 → 看起来"做完了"（没有对比感）
```

### 测试用例（8 个）

保持原方案不变，但增加测试注释中的安全考虑说明：

| # | 测试名 | 验证什么 |
|---|--------|---------|
| 1 | ToolRegistry 注册和获取工具 | register + get |
| 2 | ToolRegistry.getToolDefinitions 格式正确 | API 兼容格式 |
| 3 | read_file 读取存在的文件 | 正常路径 |
| 4 | read_file 读取不存在的文件返回 is_error | **错误不 crash，返回 is_error** |
| 5 | write_file 创建文件并自动创建目录 | mkdir -p |
| 6 | bash_execute 返回 stdout | 正常执行 |
| 7 | ToolExecutor 执行已知工具 | 正常路径 |
| 8 | ToolExecutor 执行未知工具返回 is_error | **优雅降级** |

### "预测→验证"教学设计

```typescript
/**
 * 🤔 运行前预测：
 *
 * 如果 LLM 请求执行一个不存在的工具（比如 'delete_everything'），
 * 你的 ToolExecutor 应该：
 * A. throw Error（崩溃）
 * B. 返回 { is_error: true, content: "工具不存在" }
 *
 * 你的答案：____
 *
 * 为什么选这个？想想 Agent Loop（Lab 3）：
 * 如果工具执行崩溃了，整个循环就断了。
 * 如果返回 is_error，LLM 可以看到错误，自己决定下一步。
 *
 * Claude Code 的设计哲学：错误不是终点，是 LLM 自我纠正的信息。
 *
 * 写完代码后运行测试 8，验证你的理解。
 */
```

---

## 五、起步指南（改进版 Step by Step）

### Step 0：前置准备（30 分钟）

1. **阅读设计文档**：`internal/LAB_DESIGN.md` 第三节（Lab 1）和第四节（Lab 2）
2. **阅读调研文档**：`internal/LAB_DESIGN_RESEARCH.md` 第四节（反馈机制评估）
3. **确认方向 E 的 Mock 基础设施已就绪**：检查 `labs/shared/` 目录
4. **与方向 C 对齐** shared/types.ts 的类型定义

### Step 1：先做 Lab 1（4-5 小时）

按 `internal/LAB_DESIGN.md` 第三节的骨架模板：

1. **写骨架** `src/types.ts` + `src/conversation.ts` + `src/llm-client.ts`
2. **写测试** 6 个测试用例
3. **写参考实现** `solution/` 目录
4. **写 Demo** — 使用改进版的"两部分"结构（消息构建 + Lab 1 局限展示）

### Step 2：再做 Lab 2（5-6 小时）

按 `internal/LAB_DESIGN.md` 第四节的骨架模板：

1. **写骨架** `src/tool-registry.ts` + `src/tools/` 三个工具 + `src/tool-executor.ts`
2. **写测试** 8 个测试用例
3. **写参考实现** `solution/` 目录
4. **写 Demo** — 使用改进版的"Lab 1 vs Lab 2 对比"结构

### Step 3：写 query-lab 文件（1-2 小时）

- `query-lab-01.ts`：使用**触发工具意图**的测试 prompt
- `query-lab-02.ts`：使用**需要多轮工具**的测试 prompt

### Step 4：验证（30 分钟）

```bash
# Lab 1
npx vitest run labs/lab-01-messages/
npx tsx labs/lab-01-messages/demo.ts

# Lab 2
npx vitest run labs/lab-02-tools/
npx tsx labs/lab-02-tools/demo.ts
```

---

## 六、Lab 之间的衔接关系

```
Lab 0（环境）— 无代码依赖
    ↓
Lab 1（消息协议）— 产出 types.ts, conversation.ts, llm-client.ts
    ↓                    ↓
    │          Lab 2 使用 Lab 1 的类型定义（Message, ContentBlock）
    │          但不直接 import Lab 1 的代码——通过 shared/types.ts 共享
    ↓
Lab 2（工具系统）— 产出 tool-registry.ts, tools/, tool-executor.ts
    ↓
Lab 3（Agent Loop）— 不直接 import Lab 1/2 的代码
                     而是通过接口注入（LLMClient, ToolExecutor）
                     测试时用 Mock，运行时可以用 Lab 1+2 的 solution/
```

**关键原则**：每个 Lab 独立可测试，不依赖其他 Lab 的代码完成状态。

---

## 七、交付清单

### Lab 1

- [ ] `src/types.ts` — 骨架（3 个 TODO）
- [ ] `src/conversation.ts` — 骨架（5 个 TODO）
- [ ] `src/llm-client.ts` — 骨架（2 个 TODO）
- [ ] `tests/` — 6 个测试（骨架全失败，solution 全通过）
- [ ] `solution/` — 完整参考实现
- [ ] `demo.ts` — 改进版（消息构建 + Lab 1 局限展示）
- [ ] `query-lab-01.ts` — 使用触发工具意图的测试 prompt

### Lab 2

- [ ] `src/tool-registry.ts` — 骨架（4 个 TODO）
- [ ] `src/tools/` — 3 个工具骨架（含安全注释）
- [ ] `src/tool-executor.ts` — 骨架（3 个 TODO）
- [ ] `tests/` — 8 个测试
- [ ] `solution/` — 完整参考实现
- [ ] `demo.ts` — 改进版（Lab 1 vs Lab 2 对比）
- [ ] `query-lab-02.ts` — 使用需要多轮工具的测试 prompt

### 协调清单

- [ ] 确认方向 E 的 `labs/shared/` 已就绪
- [ ] 与方向 C 对齐 shared/types.ts 类型定义
- [ ] Lab 1 的 query-lab-01.ts 的测试 prompt 需要与方向 C 确认一致性

---

## 八、进度记录

### 工作日志

> （在此记录你的开发进度，按日期）
