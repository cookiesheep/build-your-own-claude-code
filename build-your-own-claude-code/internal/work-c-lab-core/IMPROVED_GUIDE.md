# 方向 C 改进指南 — Lab 3 Agent Loop

> 基于 2026-04-10 调研成果对原有 README 的改进建议。
> 原有 README.md 保持不变，本文档为新的完整开发指南。

---

## 一、你要做什么

实现 Lab 3（Agent Loop）的骨架代码、Mock 测试用例和可运行 Demo——让学习者通过填空理解 Agent 的核心循环。

**这是整个项目最重要的方向。** Lab 3 是 chatbot 变成 agent 的分界线。

---

## 二、为什么这个项目值得做——市场定位

### 竞品格局

目前市场上教你"构建 Agent Harness"的项目已经存在：

| 项目 | Stars | 方法 | 弱点 |
|------|-------|------|------|
| **shareAI-lab/learn-claude-code** | 51.2k | Python 从零构建，19章 | 没有真实源码，没有 TUI 反馈 |
| **Windy3f3f3f3f/claude-code-from-scratch** | 844 | TS/Python 复现，11章 | 没有 TUI 反馈，纯独立项目 |
| **Sebastian Raschka / mini-coding-agent** | — | Python 参考实现 | 纯代码，无教学结构 |
| **DeepLearning.AI 课程** | — | 视频 + Jupyter | 框架使用，不教底层 |

**BYOCC 的差异化**：学习者在**真实 Claude Code 代码库**中工作，完成后看到**真实 TUI 由自己的代码驱动**。这个组合目前市场空白。

### 你的 Lab 3 要做到什么

学习者完成 Lab 3 后应该能说：
> "原来 chatbot 变成 agent 就是加了一个 while(true) 循环！我自己写了一个，而且它真的在真实 Claude Code 里跑起来了。"

这个"Aha Moment"是所有竞品都提供不了的。

---

## 三、核心概念（你必须理解的）

### Agent Loop 到底是什么

```
普通聊天机器人（Lab 1 完成后）：
  用户说话 → LLM 回复文字 → 结束

有工具的聊天机器人（Lab 2 完成后）：
  用户说话 → LLM 回复 "我要用工具" → 执行工具 → 结束（只做一次！）

Agent（Lab 3 完成后）：
  用户说话 → LLM "我要读文件" → 执行 read_file → 结果喂回 LLM
           → LLM "我要改文件" → 执行 write_file → 结果喂回 LLM
           → LLM "搞定了" → 结束
  （自主循环，直到任务完成）
```

用代码表示（只有 ~15 行核心逻辑）：

```typescript
while (true) {
  const response = await client.chat(messages, { tools, systemPrompt });
  const toolCalls = response.content.filter(b => b.type === 'tool_use');
  if (toolCalls.length === 0) return; // 没有工具调用 → 完成
  const results = await executor.executeToolCalls(toolCalls);
  messages.push({ role: 'assistant', content: response.content });
  messages.push({ role: 'user', content: results }); // ★ tool_result 的 role 是 'user'！
}
```

Claude Code 的 query.ts 有 1,729 行，但核心循环就是这 ~15 行。

### Sebastian Raschka（"Build a LLM From Scratch" 作者）的验证

> "Agent harness 是管理 context、tool use、prompts、state 和 control flow 的软件脚手架。一个好的 harness 可以成为让一个 LLM 比另一个 LLM 工作得更好的区分因素。"
> —— https://magazine.sebastianraschka.com/p/components-of-a-coding-agent (2026-04-04)

这正是 BYOCC 的核心理念：**模型提供智能，Harness 让智能变成行动。**

---

## 四、关键设计改进——Lab 3 分步策略

### 原方案的问题

原方案中 Lab 3 是一个整体（6 个 TODO），同时要求学习者理解三个新概念：

| 概念 | 难度 | 大二学生是否学过 |
|------|------|----------------|
| while(true) 循环 | 低 | 学过 |
| tool result 反馈到 messages | 中 | 没学过，但能理解 |
| **AsyncGenerator (yield)** | **高** | **绝大多数没学过** |

调研评估：**60%+ 的大二学生可能在这里卡住。**

### 改进方案：Lab 3 分三步完成

骨架代码仍然是一个文件（`agent-loop.ts`），但通过注释明确标注三个阶段。学习者可以分步完成，每步都能运行看反馈。

```
第一阶段（3a）：基础循环
  完成 TODO 1-3：初始化 messages + while(true) + 调用 LLM + 处理响应
  反馈：能看到 LLM 被调用，能打印 text 事件

第二阶段（3b）：工具执行 + 事件流
  完成 TODO 4-5：yield 事件 + 判断是否继续
  反馈：能看到完整的 tool_call → tool_result 事件流

第三阶段（3c）：消息更新 + 循环闭合
  完成 TODO 6：执行工具 + 更新 messages（这是循环的"燃料"）
  反馈：Agent 真正开始多轮自主调用工具！Aha Moment！
```

### 为学习者准备的 AsyncGenerator 速成

在 Lab 3 文档中（方向 E 负责），必须包含这个 5 分钟速成：

```typescript
// 你可能在课上学过普通函数
function hello() { return "hi" }        // 返回一个值，结束

// Generator 函数可以"暂停"和"恢复"
function* numbers() {
  yield 1    // 暂停，把 1 交给调用者
  yield 2    // 下次恢复后，暂停，把 2 交给调用者
  yield 3
}

// Async Generator = Generator + 异步
async function* events() {
  yield { type: 'text', content: '开始思考...' }  // 先告诉外面"我在想"
  const result = await someSlowOperation()          // 做一些慢操作
  yield { type: 'done', content: result }           // 再告诉外面"我做完了"
}

// 为什么 Agent Loop 用 AsyncGenerator？
// 因为 Agent 在循环中一边思考，TUI 一边实时显示进展。
// yield 就是"把当前进展推出去给 TUI 显示"。
```

---

## 五、Mock LLM 基础设施说明

### 重要变更：Mock 基础设施由方向 E 提供

原方案要求你"先写 Mock LLM"（Step 2），但这不合理——Mock LLM 是所有 Lab 共享的测试基础设施，不应该由 Lab 3 负责人从零写。

**新的分工**：

| 谁负责 | 产出 | 你什么时候需要 |
|--------|------|-------------|
| **方向 E** | `labs/shared/mock-llm.ts`（基础框架）+ `labs/shared/test-helpers.ts` | 你开始写测试之前 |
| **你（方向 C）** | Lab 3 特有的场景常量（SCENARIO_CHAIN_TOOLS 等） | 写测试时 |

### 你需要做什么

1. **先确认方向 E 已完成**：检查 `labs/shared/mock-llm.ts` 存在且可用
2. **在 `tests/` 中 import 共享 Mock**：从 `../../shared/mock-llm` 导入
3. **扩展场景**：Lab 3 需要比 Lab 1/2 更复杂的 Mock 场景（链式工具、无限循环等），这些由你在测试文件中定义

### 共享 Mock LLM 的接口（方向 E 提供）

```typescript
// labs/shared/mock-llm.ts — 你只需要使用这些，不需要自己写

export function createMockLLM(responses: ChatResponse[]): LLMClient;
export function createMockExecutor(results?: Record<string, string>): ToolExecutor;

// labs/shared/test-helpers.ts
export async function collectEvents<T>(gen: AsyncGenerator<T>): Promise<T[]>;
export async function collectEventsByType<T extends { type: string }>(
  gen: AsyncGenerator<T>, type: string
): Promise<T[]>;
```

### 你需要额外定义的场景（在 tests/agent-loop.test.ts 中）

```typescript
// 这些是 Lab 3 特有的场景，不在共享 Mock 中
const CHAIN_3_TOOLS: ChatResponse[] = [
  // 第1轮：读文件
  { content: [{ type: 'text', text: '我先读一下。' }, { type: 'tool_use', id: 't1', name: 'read_file', input: { path: 'a.js' } }], stopReason: 'tool_use' },
  // 第2轮：写文件
  { content: [{ type: 'text', text: '我来改一下。' }, { type: 'tool_use', id: 't2', name: 'write_file', input: { path: 'a.js', content: 'new' } }], stopReason: 'tool_use' },
  // 第3轮：完成
  { content: [{ type: 'text', text: '改好了！' }], stopReason: 'end_turn' },
];

// 无限循环场景（测试 maxTurns 保护）
function makeInfiniteLoop(n: number): ChatResponse[] { /* ... */ }

// 纯 tool_use 无 text
const PURE_TOOL_USE: ChatResponse[] = [ /* ... */ ];
```

---

## 六、起步指南（改进版 Step by Step）

### Step 0：前置准备（30 分钟）

1. **阅读设计文档**：`internal/LAB_DESIGN.md` 第五节（Lab 3 详细设计）
2. **阅读调研文档**：`internal/LAB_DESIGN_RESEARCH.md` 第四节（反馈机制评估）
3. **确认方向 E 的 Mock 基础设施已就绪**：检查 `labs/shared/` 目录
4. **阅读竞品参考**：了解 shareAI-lab/learn-claude-code 的 s01（Agent Loop）是怎么教的，思考我们的差异化

### Step 1：写骨架代码（1-2 小时）

从 `internal/LAB_DESIGN.md` 第五节复制骨架模板到 `labs/lab-03-agent-loop/src/agent-loop.ts`。

**关键改进——在骨架中标注三个阶段**：

```typescript
export async function* agentLoop(
  client: LLMClient,
  executor: ToolExecutor,
  systemPrompt: string,
  userMessage: string,
  options?: { maxTurns?: number }
): AsyncGenerator<AgentEvent> {
  const maxTurns = options?.maxTurns ?? 25;

  // ===== 第一阶段：基础循环 =====
  // TODO 1: 初始化 messages 数组，添加用户消息
  //   创建 messages: Message[] = []
  //   添加 { role: 'user', content: userMessage }
  //
  //   💡 提示：想想 Agent 第一次收到的是什么？当然是用户的请求！

  let turnCount = 0;

  while (true) {
    turnCount++;

    // TODO 2: 安全保护 — 检查是否超过最大迭代次数
    //   if (turnCount > maxTurns) → yield error + return
    //   ★ 注意 off-by-one：maxTurns=3 表示最多 3 轮，第 4 轮才报错
    //
    //   💡 为什么需要这个？真实 Agent 可能陷入无限循环（比如反复读同一个文件）
    //   Claude Code 的默认上限是 25 轮

    // TODO 3: 调用 LLM
    //   const response = await client.chat(messages, { tools, systemPrompt })
    //   💡 这里 messages 包含了之前所有的对话历史，LLM 靠这些上下文做决策

    // ===== 第二阶段：工具执行 + 事件流 =====

    // TODO 4: 处理 LLM 响应
    //   初始化 toolUseBlocks: ToolUseBlock[] = []
    //   遍历 response.content:
    //     type === 'text' → yield { type: 'text', content: block.text }
    //     type === 'tool_use' → 收集到 toolUseBlocks
    //   ★ 注意：content 可能是空数组！不要假设一定有 text 块

    // TODO 5: 判断是否继续
    //   if (toolUseBlocks.length === 0) → yield done + return
    //   ★ 不要用 stopReason 判断！Claude Code 源码 query.ts:554 说 stop_reason 不可靠
    //
    //   💡 这是整个 Agent Loop 最关键的判断：
    //   LLM 没有请求工具 = LLM 认为任务完成 = 退出循环

    // ===== 第三阶段：消息更新 + 循环闭合 =====

    // TODO 6: 执行工具并更新消息历史
    //   对每个 toolUseBlock:
    //     yield { type: 'tool_call', ... }
    //     const result = await executor.executeToolCall(block)
    //     yield { type: 'tool_result', ... }
    //   然后更新 messages:
    //     messages.push({ role: 'assistant', content: response.content })
    //     messages.push({ role: 'user', content: toolResults })
    //   ★ tool_result 的 role 是 'user'——这是 Agent 能循环的关键！
    //   ★ 必须保留 is_error 字段——LLM 需要看到错误才能自我纠正
    //
    //   💡 这两行 push 就是循环的"燃料"——不把结果喂回去，LLM 不知道发生了什么
  }
}
```

**TODO 注释的设计原则**（每个 TODO 必须包含）：
1. **做什么**（具体操作）
2. **为什么**（一两句话解释原因）
3. **提示**（💡 标记，帮助卡住的学生）
4. **陷阱警告**（★ 标记，容易犯的错）

### Step 2：写测试用例（2-3 小时）

12 个测试，分三组对应骨架的三个阶段：

**基础循环测试（对应 TODO 1-3）**：
| # | 名称 | 验证什么 |
|---|------|---------|
| 1 | 简单问答无工具 | LLM 返回 text → yield text + done |
| 2 | LLM 报错 | chat() throws → yield error |
| 3 | maxTurns=1 精确边界 | 第1轮返回 tool_use → 第2轮 yield error |

**工具执行 + 事件流测试（对应 TODO 4-5）**：
| # | 名称 | 验证什么 |
|---|------|---------|
| 4 | 单工具调用 | yield tool_call + tool_result + text + done |
| 5 | 纯 tool_use 无 text | LLM 只返回 tool_use 块 → 正常执行 |
| 6 | 空 content | LLM 返回 `content: []` → yield done 不崩溃 |
| 7 | 单轮多工具并行 | LLM 返回 2 个 tool_use → 2 个 tool_call + 2 个 tool_result |

**消息更新 + 循环闭合测试（对应 TODO 6）**：
| # | 名称 | 验证什么 |
|---|------|---------|
| 8 | 链式工具（3轮） | read → write → 完成 |
| 9 | 工具失败 + 自我纠正 | tool 返回 is_error → LLM 看到错误 → 第2轮纠正 |
| 10 | 完整对话历史正确性 | 2 轮后 messages 数组包含正确的 user/assistant/tool_result 序列 |
| 11 | is_error 传播 | tool 返回 is_error: true → messages 中保留该字段 |
| 12 | 超过迭代上限（maxTurns=3） | 每轮都返回 tool_use → 恰好第4轮 yield error |

### Step 3：写参考实现（1 小时）

在 `solution/agent-loop.ts` 中把 6 个 TODO 全部实现。

**要求**：
- 完整实现不能超过 50 行核心逻辑（不含注释和空行）
- 如果超过，说明设计过复杂
- 每一步对应一个测试——学生逐步通过测试就能逐步完成

### Step 4：写 Demo（1 小时）

Demo 的核心目标：**让学生看到 Aha Moment**。

```typescript
// demo.ts 的设计要点：

// 1. 使用 3 轮链式工具场景（最能体现"Agent 自主决策"）
// 2. 每轮打印清晰的 emoji 标记：
//    📤 Calling LLM...
//    💬 Agent: "..."
//    🔧 Tool: name(input)
//    ✅ Result: output
//    🏁 Done in N turns
//
// 3. 最后打印一段总结——这是 Aha Moment 的关键：
//    "★ 这就是 Agent Loop！LLM 自主决策了 3 轮操作。
//     你只说了'帮我修改文件'，LLM 自己决定了：
//     1. 先 read_file 看内容
//     2. 再 write_file 改内容
//     3. 最后报告结果
//
//     Lab 1-2 中这些操作需要你手动触发。现在是 Agent 自己在循环！"
```

### Step 5：验证（30 分钟）

```bash
# 骨架状态 → 12 个测试全失败（throw Error('TODO')）
npx vitest run labs/lab-03-agent-loop/

# 用 solution 替换 src → 12 个测试全通过
cp labs/lab-03-agent-loop/solution/agent-loop.ts labs/lab-03-agent-loop/src/
npx vitest run labs/lab-03-agent-loop/

# Demo 可运行
npx tsx labs/lab-03-agent-loop/demo.ts
```

---

## 七、"预测→验证"教学设计

在骨架代码的顶部注释中，加入这个环节：

```
/**
 * 🤔 运行前预测（先想清楚再写代码）：
 *
 * 如果用户说 "帮我创建 hello.js"，Agent Loop 会经历几轮？
 * 每一轮 LLM 会做什么决定？
 *
 * 你的预测：
 * 第1轮：LLM 会 ________（用工具？还是直接回复文字？）
 * 第2轮：________
 * 第3轮：________
 *
 * 写完代码后运行 demo.ts，对比你的预测和实际行为。
 * 如果不一样，想想为什么——这就是学习 Agent Loop 的过程。
 */
```

---

## 八、与竞品的差异化参考

### shareAI-lab/learn-claude-code 的 s01（Agent Loop）怎么教的

- 用 Python 实现，`agents/s01_agent_loop.py`
- 教学方法：先给完整可运行代码，学习者阅读理解
- 没有骨架/TODO 模式
- 没有测试用例
- 没有真实 TUI 反馈

### 我们的不同

1. **骨架 + TODO 模式**：学习者自己写，不是看别人写好的
2. **12 个测试驱动**：填对了测试就变绿，实时反馈
3. **真实 TUI 反馈**：代码注入真实 Claude Code，看到自己的 Agent Loop 驱动真实 TUI
4. **分步策略**：3a→3b→3c 渐进式完成，不要求一步到位

### 可从竞品借鉴的

- shareAI-lab 的"每阶段后停下来自己重建最小版本"是个好主意——可以在 Lab 3 完成后加一个思考题："不参考骨架代码，从零写一个只有 20 行的 agentLoop"
- dadiaomengmeimei/claude-code-sourcemap-learning-notebook 的 11 个设计模式中，"Optimistic Recovery"和"Layered Degradation"可以在 Lab 3 的文档中作为延伸阅读

---

## 九、交付清单

### 文件清单

- [ ] `src/agent-loop.ts` — 骨架代码（6 个 TODO，分三阶段标注）
- [ ] `tests/agent-loop.test.ts` — 12 个测试（分三组）
- [ ] `solution/agent-loop.ts` — 完整参考实现（≤50 行核心逻辑）
- [ ] `demo.ts` — 3 轮链式工具 Demo + Aha Moment 总结

### 验证清单

- [ ] 骨架状态下 `npx vitest run labs/lab-03-agent-loop/` — 12 个测试全失败
- [ ] solution 替换后 — 12 个测试全通过
- [ ] Demo 运行输出清晰，Aha Moment 总结可见
- [ ] 骨架的 TODO 注释包含"做什么 + 为什么 + 提示 + 陷阱"
- [ ] 骨架标注了 3a→3b→3c 分步策略

### 协调清单

- [ ] 确认方向 E 的 `labs/shared/mock-llm.ts` 已就绪
- [ ] 确认方向 E 的 `labs/shared/test-helpers.ts` 已就绪
- [ ] 与方向 D 对齐 shared/types.ts 的类型定义

---

## 十、进度记录

### 工作日志

> （在此记录你的开发进度，按日期）

---

## 附录 A：给 AI 工具的提示词（改进版）

```
我在做一个 AI Agent 教学项目，需要实现 Lab 3（Agent Loop）。

项目背景：
- 学习者是大二 CS 学生，可能没学过 AsyncGenerator
- 骨架代码分三个阶段（3a→3b→3c），学习者可以分步完成
- 使用共享的 Mock LLM 基础设施（从 labs/shared/ 导入）
- 需要与 Claude Code 真实源码对应（query.ts:307）

共享类型（shared/types.ts）：
[粘贴 shared/types.ts 内容]

共享 Mock（labs/shared/mock-llm.ts 提供）：
- createMockLLM(responses): LLMClient
- createMockExecutor(results?): ToolExecutor

共享测试辅助（labs/shared/test-helpers.ts 提供）：
- collectEvents(gen): Promise<T[]>
- collectEventsByType(gen, type): Promise<T[]>

需要创建 4 个文件（在 labs/lab-03-agent-loop/ 下）：

1. src/agent-loop.ts — 骨架（6 个 TODO，分三个阶段标注）
   - 导出 agentLoop(client, executor, systemPrompt, userMessage, options?)
   - AsyncGenerator<AgentEvent>
   - TODO 注释必须包含：做什么 + 为什么 + 💡提示 + ★陷阱

2. tests/agent-loop.test.ts — 12 个 Vitest 测试
   - 分三组对应三个阶段
   - Lab 3 特有场景在测试文件中定义（CHAIN_3_TOOLS 等）
   - Mock 从 labs/shared/ 导入

3. solution/agent-loop.ts — 完整参考实现（≤50 行核心逻辑）

4. demo.ts — 3 轮链式工具 Demo + Aha Moment 总结语

要求：TypeScript strict, ESM, 中文注释, 骨架 throw Error('TODO')
```
