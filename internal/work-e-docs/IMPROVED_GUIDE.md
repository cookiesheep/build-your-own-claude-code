# 方向 E 改进指南 — 文档站 + 测试基础设施 + CI/CD

> 基于 2026-04-10 调研成果对原有 README 的改进建议。
> 原有 README.md 保持不变，本文档为新的完整开发指南。

---

## 一、你的三大职责

1. **文档站内容完善** — 学习者的第一印象
2. **Mock LLM 测试基础设施** — 所有 Lab 测试的前置依赖
3. **GitHub Actions CI** — 保证团队每次提交不互相破坏

### 职责优先级变更

**重要变更**：Mock LLM 基础设施应该优先于文档完善。因为方向 C（Lab 3）和方向 D（Lab 1/2）都依赖它。

```
原优先级：文档 > Mock > CI
新优先级：Mock > CI > 文档
```

---

## 二、职责 1：Mock LLM 测试基础设施（P0 最高优先级）

### 为什么 Mock 是你最重要的产出

方向 C 和方向 D 的测试都需要 Mock LLM。**如果你不先创建共享 Mock，他们就无法开始写测试。**

### 需要创建的文件

```
labs/
├── shared/
│   ├── mock-llm.ts          # 共享 Mock LLM + Mock ToolExecutor
│   └── test-helpers.ts      # 辅助函数（collectEvents 等）
├── lab-01-messages/tests/    # 使用共享 Mock
├── lab-02-tools/tests/      # 使用共享 Mock
└── lab-03-agent-loop/tests/ # 使用共享 Mock
```

### labs/shared/mock-llm.ts 设计

```typescript
/**
 * 共享 Mock LLM 基础设施
 *
 * 所有 Lab 的测试都使用这个文件中的 Mock。
 * 不要在各 Lab 的 tests/ 中重复定义 Mock LLM。
 *
 * 设计原则：
 * 1. Mock LLM 按预定义的"剧本"（responses 数组）按顺序回复
 * 2. Mock ToolExecutor 对所有工具调用返回成功结果
 * 3. 预定义场景常量供所有 Lab 共享
 */

import type {
  Message, ContentBlock, ToolDefinition,
  ToolUseBlock, ToolResultBlock, AgentEvent
} from '../../shared/types';

// ===== 类型定义 =====

export interface ChatResponse {
  content: ContentBlock[];
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens';
}

export interface LLMClient {
  chat(messages: Message[], options?: {
    tools?: ToolDefinition[];
    systemPrompt?: string;
  }): Promise<ChatResponse>;
}

export interface ToolExecutor {
  executeToolCall(toolUse: ToolUseBlock): Promise<ToolResultBlock>;
  executeToolCalls(toolUses: ToolUseBlock[]): Promise<ToolResultBlock[]>;
  getToolDefinitions(): ToolDefinition[];
}

// ===== Mock LLM =====

export function createMockLLM(responses: ChatResponse[]): LLMClient {
  let callIndex = 0;
  return {
    async chat() {
      if (callIndex >= responses.length) {
        throw new Error(`Mock LLM: 没有更多回复了（已调用 ${callIndex} 次）`);
      }
      return responses[callIndex++];
    },
  };
}

// ===== Mock ToolExecutor =====

export function createMockExecutor(results?: Record<string, string>): ToolExecutor {
  const defaultTools: ToolDefinition[] = [
    { name: 'read_file', description: 'Read a file', input_schema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
    { name: 'write_file', description: 'Write a file', input_schema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } },
    { name: 'bash_execute', description: 'Run command', input_schema: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] } },
  ];

  return {
    async executeToolCall(toolUse) {
      const output = results?.[toolUse.name] ?? `Mock result for ${toolUse.name}`;
      return { type: 'tool_result', tool_use_id: toolUse.id, content: output, is_error: false };
    },
    async executeToolCalls(toolUses) {
      return Promise.all(toolUses.map(t => this.executeToolCall(t)));
    },
    getToolDefinitions() { return defaultTools; },
  };
}

// ===== 预定义场景（所有 Lab 共享）=====

/** 简单问答，不用工具 */
export const SCENARIO_SIMPLE_CHAT: ChatResponse[] = [
  { content: [{ type: 'text', text: '你好！有什么可以帮你的？' }], stopReason: 'end_turn' },
];

/** 单次工具调用 */
export const SCENARIO_SINGLE_TOOL: ChatResponse[] = [
  { content: [{ type: 'text', text: '好的，我来创建文件。' }, { type: 'tool_use', id: 'toolu_01', name: 'write_file', input: { path: 'hello.js', content: "console.log('Hello!')" } }], stopReason: 'tool_use' },
  { content: [{ type: 'text', text: '文件已创建！' }], stopReason: 'end_turn' },
];

/** 空 content 数组 */
export const SCENARIO_EMPTY_CONTENT: ChatResponse[] = [
  { content: [], stopReason: 'end_turn' },
];

/** 创建无限循环（测试 maxTurns 保护） */
export function createInfiniteToolScenario(turns: number): ChatResponse[] {
  return Array.from({ length: turns }, (_, i) => ({
    content: [{ type: 'tool_use' as const, id: `toolu_${i}`, name: 'bash_execute', input: { command: 'echo loop' } }],
    stopReason: 'tool_use' as const,
  }));
}
```

### labs/shared/test-helpers.ts 设计

```typescript
/**
 * 共享测试辅助函数
 */

/** 收集 AsyncGenerator 所有事件 */
export async function collectEvents<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const events: T[] = [];
  for await (const event of gen) {
    events.push(event);
  }
  return events;
}

/** 收集特定类型的事件 */
export async function collectEventsByType<T extends { type: string }>(
  gen: AsyncGenerator<T>,
  type: string
): Promise<T[]> {
  const all = await collectEvents(gen);
  return all.filter(e => e.type === type);
}
```

### vitest.config.ts 确认

确认 `vitest.config.ts` 的 include 覆盖了 `labs/` 目录：

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'tasks/**/tests/**/*.test.ts',
      'src/**/*.test.ts',
      'labs/**/tests/**/*.test.ts',    // ← 必须有这一行
      'labs/shared/**/*.test.ts',       // ← 共享测试
    ],
    testTimeout: 10000,
  },
});
```

### 交付标准

```bash
# 共享 Mock 可以被 import
node -e "const { createMockLLM } = require('./labs/shared/mock-llm.ts'); console.log('OK')"

# vitest 能发现 labs/ 下的测试
npx vitest run --reporter=verbose 2>&1 | head -20
```

---

## 三、职责 2：文档站内容完善

### 优先级排序

| 文档 | 优先级 | 原因 |
|------|--------|------|
| guide/typescript.md (async generator) | **P0** | Lab 3 的关键认知障碍，大二学生没学过 |
| guide/agent-loop.md | **P0** | Lab 3 的背景知识参考 |
| labs/lab-03/index.md | **P0** | 学习者做 Lab 3 前的必读文档 |
| about/faq.md | **P1** | 减少常见问题重复回答 |
| about/comparison.md | **P1（新增）** | 调研发现需要与竞品对比的页面 |
| labs/lab-01/index.md | P2 | Lab 1 已有基础框架 |
| labs/lab-02/index.md | P2 | Lab 2 已有基础框架 |

### guide/typescript.md — AsyncGenerator 速成（P0）

**这是调研发现的最关键改进**。原方案只是"补充 async generator 教学"，但调研发现这是大二学生完成 Lab 3 的最大障碍。

内容结构：

```markdown
# TypeScript Async Generator 速成

> Lab 3 的 agentLoop 用了 async generator。如果你没学过，花 10 分钟读完这个。

## 1. 普通函数 vs Generator

[普通函数 return 一个值 vs Generator yield 多个值的对比]

## 2. Generator 的语法

[function* / yield / for...of 的基本用法]

## 3. Async Generator = Generator + 异步

[async function* / yield / for await...of]

## 4. 为什么 Agent Loop 用 Async Generator

[因为 Agent 在循环中一边思考，TUI 一边实时显示进展]
[yield 就是"把当前进展推出去给 TUI 显示"]

## 5. 小练习

[3 个由简到繁的练习，每个 < 5 行代码]
```

### guide/agent-loop.md — Agent Loop 背景（P0）

参考 Sebastian Raschka 的文章（2026-04-04），提供权威的概念定义：

```markdown
# Agent Loop 背景知识

## 什么是 Agent（vs 聊天机器人）

> 引用 Sebastian Raschka（"Build a LLM From Scratch" 作者）：
> "Agent 是一个控制循环，围绕 model 的 loop。Agent layer（harness）决定下一步检查什么、调用哪些工具、如何更新状态、何时停止。"

## Agent Loop 的 5 步循环

[Mermaid 流程图 + 每步的代码片段]

## 真实案例：Claude Code 如何完成"创建文件"任务

[3 轮工具调用的完整示例]

## 概念层次（重要！）

LLM（原始模型）→ Reasoning Model（加强推理）→ Agent（循环+工具+记忆）
Claude Code = Agent + Coding Harness（专门用于编程的脚手架）
```

### labs/lab-03/index.md — Lab 3 学习者文档（P0）

必须包含以下内容：

```markdown
# Lab 3：Agent Loop ★

## 实验目的
实现 chatbot → agent 的分界线：while(true) 循环。

## 背景知识
[链接到 guide/agent-loop.md 和 guide/typescript.md]

## Agent Loop 流程图
​```mermaid
graph TD
  A[用户输入] --> B[调用 LLM]
  B --> C{有 tool_use?}
  C -- 是 --> D[执行工具]
  D --> E[结果喂回 messages]
  E --> B
  C -- 否 --> F[任务完成]
​```

## 关键代码位置（Claude Code 真实源码）
- query.ts:307 — while(true) 主循环
- query/deps.ts — QueryDeps 依赖注入接口
- 对比：简化版 agent-loop.ts (~50行) vs 完整版 query.ts (1,729行)

## 常见陷阱
1. **stop_reason 不可靠** — 不要用 stopReason 判断是否继续，用 toolUseBlocks.length
2. **tool_result 的 role 是 'user'** — 不是 'tool'！这是 Agent 能循环的关键
3. **content 可能是空数组** — 不要假设一定有 text 块
4. **工具执行失败不 crash** — 返回 is_error 让 LLM 自己纠正

## 分步策略
这个 Lab 分三个阶段，你可以逐步完成：
- 第一阶段（TODO 1-3）：基础循环
- 第二阶段（TODO 4-5）：工具执行 + 事件流
- 第三阶段（TODO 6）：消息更新 + 循环闭合
```

### about/faq.md — 改进版 FAQ

原方案 5 个 FAQ，调研发现还需要增加：

```markdown
# 常见问题

## 基础问题

### Q: 我没有 API Key 怎么办？
→ 用 Mock 模式（所有测试都不需要 API Key）。如果想在 TUI 中看到真实效果，可以用 DeepSeek API（价格低）。

### Q: 我会 Python 但没学过 TypeScript，能做这个项目吗？
→ 可以。TypeScript 的类型系统其实是在帮你——编译器会告诉你哪里写错了。每个 Lab 的骨架代码已经提供了类型框架，你只需要填空。遇到不认识的 TypeScript 语法，参考 [guide/typescript.md]。

### Q: 测试报错 "Cannot find module" 怎么办？
→ 运行 `npm install`。如果还有问题，检查你当前在项目根目录下。

### Q: Demo 运行没有输出怎么办？
→ 确认 `tsx` 已安装：`npm install -D tsx`。然后用 `npx tsx labs/lab-03/demo.ts`。

## 概念问题

### Q: Lab 3 的 AsyncGenerator (yield) 是什么？我没学过。
→ 这是正常的！大多数大二课程不涉及 generator。参考 [guide/typescript.md]，10 分钟速成。
简单说：yield 就是"把当前进展推出去给 TUI 显示"。

### Q: 为什么 tool_result 的 role 是 'user' 而不是 'tool'？
→ 从 LLM 的角度看，它发了 tool_use，然后"有人"给了它结果。这个结果是"用户输入"。
这是 Anthropic Messages API 的设计——只有 user 和 assistant 两个 role。

### Q: 为什么用 stopReason 判断退出是错的？
→ Claude Code 源码 query.ts:554 有注释说 "stop_reason === 'tool_use' is unreliable"。
有时候 LLM 返回 stopReason='end_turn' 但仍然包含 tool_use 块。
正确的做法是检查 response.content 中有没有 tool_use 类型的块。

## 项目对比

### Q: 这和 learn-claude-code / claude-code-from-scratch 有什么区别？
→ learn-claude-code（51.2k stars）是 Python 从零构建，学习者阅读理解代码。
BYOCC 是 TypeScript 挖空真实源码，学习者自己填空，完成后看到真实 Claude Code TUI。
简单说：learn-claude-code = 读代码学原理，BYOCC = 写代码驱动真实系统。

### Q: 完成所有 Lab 后我能获得什么？
→ 1) 理解 Agent Harness 的核心架构（面试加分项）
→ 2) 一个能展示的 GitHub 项目（"我实现了 Claude Code 的 Agent Loop"）
→ 3) TypeScript 异步编程和测试驱动开发的实战经验
```

### about/comparison.md — 新增竞品对比页面

```markdown
# BYOCC vs 其他学习资源

## 为什么要做 BYOCC

"理解一个系统最好的方式就是自己构建它。" —— Richard Feynman

## 对比表

| 维度 | BYOCC | learn-claude-code | DeepLearning.AI | claude-code-from-scratch |
|------|-------|-------------------|-----------------|-------------------------|
| **语言** | TypeScript | Python | Python | TS/Python |
| **基础** | 真实 Claude Code 源码 | 从零构建 | 框架使用 | 从零复现 |
| **教学方法** | 骨架填空 + TUI 反馈 | 阅读理解 | 视频+练习 | 阅读理解 |
| **即时反馈** | 真实 TUI | print() 输出 | 视频作业 | print() 输出 |
| **需要 API Key** | 否（Mock 模式） | 是 | 部分 | 是 |
| **难度** | 大二 CS | 有 Python 基础 | 入门 | 有编程基础 |
| **费用** | 免费 | 免费 | 部分免费 | 免费 |

## BYOCC 的独特之处

**你在真实 Claude Code 代码库中工作**。不是写一个独立的小项目，而是把你的代码注入真实系统，看到真实 TUI 由你的代码驱动。

类比：
- learn-claude-code = 读汽车说明书，然后用乐高拼一个小车
- BYOCC = 拆开一辆真车的引擎，换上你自己做的零件，然后点火开上路
```

---

## 四、职责 3：GitHub Actions CI

### 基本配置

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 18 }
      - run: npm ci
      - run: npx tsc --noEmit

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 18 }
      - run: npm ci
      - run: npx vitest run

  # 调研新增：验证参考实现始终有效
  verify-solutions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 18 }
      - run: npm ci
      - name: Verify Lab 01 solution
        run: |
          cp labs/lab-01-messages/solution/*.ts labs/lab-01-messages/src/
          npx vitest run labs/lab-01-messages/
      - name: Verify Lab 02 solution
        run: |
          cp labs/lab-02-tools/solution/*.ts labs/lab-02-tools/src/
          npx vitest run labs/lab-02-tools/
      - name: Verify Lab 03 solution
        run: |
          cp labs/lab-03-agent-loop/solution/agent-loop.ts labs/lab-03-agent-loop/src/
          npx vitest run labs/lab-03-agent-loop/
```

### 新增的 verify-solutions Job

**调研新增**：确保参考实现始终有效。原来的 CI 只做 `tsc + vitest`，但如果骨架代码和 solution 不同步，学生用 solution 替换后可能测试不通过。这个 Job 防止这种问题。

---

## 五、起步指南（改进版 Step by Step）

### Step 1：创建 Mock 基础设施（2-3 小时）★ 最高优先级

1. 创建 `labs/shared/mock-llm.ts`（按上面的设计）
2. 创建 `labs/shared/test-helpers.ts`（按上面的设计）
3. 确认 `vitest.config.ts` 覆盖 `labs/` 目录
4. 通知方向 C 和方向 D："共享 Mock 已就绪，可以开始写测试了"

### Step 2：搭建 CI（1 小时）

1. 创建 `.github/workflows/ci.yml`（含 verify-solutions job）
2. 推到 main 看 GitHub Actions 是否绿色

### Step 3：完善 Lab 3 文档（2-3 小时）

1. `guide/typescript.md` — AsyncGenerator 速成
2. `guide/agent-loop.md` — Agent Loop 背景知识
3. `labs/lab-03/index.md` — 学习者必读文档（含 Mermaid 流程图 + 常见陷阱）

### Step 4：完善其他文档（2-3 小时）

1. `about/faq.md` — 改进版 FAQ（9+ 个 Q&A）
2. `about/comparison.md` — 新增竞品对比页面
3. `labs/lab-01/index.md` 和 `labs/lab-02/index.md` — 检查完善

### Step 5：本地验证（30 分钟）

```bash
# 文档构建无报错
mkdocs build

# CI 模拟
npx tsc --noEmit
npx vitest run

# 验证 Mock 可用
npx vitest run labs/shared/
```

---

## 六、与方向 C 和 D 的协调要点

### Mock LLM 基础设施分工

| 你负责 | 方向 C/D 负责 |
|--------|-------------|
| `labs/shared/mock-llm.ts`（基础框架 + 通用场景） | 各 Lab 特有的场景常量（在测试文件中定义） |
| `labs/shared/test-helpers.ts`（collectEvents 等） | 使用共享 Mock 编写测试 |
| 确认 vitest.config.ts 配置正确 | 按 vitest 配置组织测试文件 |

### 文档与 Lab 代码的协调

| 你负责 | 需要与方向 C/D 确认 |
|--------|-------------------|
| guide/typescript.md 的 AsyncGenerator 内容与 Lab 3 骨架代码一致 | Lab 3 骨架中 AsyncGenerator 的用法 |
| guide/agent-loop.md 的概念解释与 Lab 3 文档一致 | Lab 3 的"常见陷阱"列表 |
| labs/lab-03/index.md 的 TODO 分步策略与骨架一致 | Lab 3 骨架中 TODO 1-6 的注释内容 |

### 重要参考文献

以下资源应该作为文档的参考文献：

1. **Sebastian Raschka — "Components of A Coding Agent"** (2026-04-04)
   - https://magazine.sebastianraschka.com/p/components-of-a-coding-agent
   - 权威的概念定义，适合作为 Lab 3 文档的理论基础

2. **shareAI-lab/learn-claude-code — s01 Agent Loop**
   - https://github.com/shareAI-lab/learn-claude-code
   - 竞品的 Agent Loop 教学方法，参考但差异化

3. **dadiaomengmeimei/claude-code-sourcemap-learning-notebook — 11 个设计模式**
   - https://github.com/dadiaomengmeimei/claude-code-sourcemap-learning-notebook
   - "Optimistic Recovery" 和 "Layered Degradation" 可作为延伸阅读

---

## 七、交付清单

### Mock 基础设施（P0）
- [ ] `labs/shared/mock-llm.ts` — 共享 Mock LLM + 通用场景
- [ ] `labs/shared/test-helpers.ts` — collectEvents 等辅助函数
- [ ] `vitest.config.ts` — 确认覆盖 labs/ 目录
- [ ] 通知方向 C/D 共享 Mock 已就绪

### CI（P1）
- [ ] `.github/workflows/ci.yml` — 含 verify-solutions job
- [ ] push 到 main 后 GitHub Actions 绿色

### 文档（P1-P2）
- [ ] `guide/typescript.md` — AsyncGenerator 速成（10 分钟阅读 + 3 个练习）
- [ ] `guide/agent-loop.md` — Agent Loop 背景知识（含 Raschka 引用）
- [ ] `labs/lab-03/index.md` — 学习者必读文档（流程图 + 陷阱 + 分步策略）
- [ ] `about/faq.md` — 改进版 FAQ（9+ 个 Q&A）
- [ ] `about/comparison.md` — 新增竞品对比页面
- [ ] `mkdocs build` 无报错

---

## 八、进度记录

### 工作日志

> （在此记录你的开发进度，按日期）
