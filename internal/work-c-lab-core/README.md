# 方向 C：Lab 核心内容（Lab 3 Agent Loop）

> **负责人**：待定
> **这是整个项目最重要的方向！Lab 3 是核心中的核心。**

---

## 你要做什么（一句话）

实现 Lab 3（Agent Loop）的骨架代码、Mock 测试用例和可运行 Demo——让学习者通过填空理解 Agent 的核心循环。

## 为什么你要做这个

Lab 3 是整个项目的灵魂。学习者完成这个 Lab 后，能理解"chatbot 变成 agent 的唯一东西就是一个 while(true) 循环"。如果 Lab 3 做不好，整个项目就没有意义。

---

## 你需要产出的文件

```
labs/lab-03-agent-loop/
├── src/
│   └── agent-loop.ts          # 骨架代码（6 个 TODO，学习者要填的）
├── tests/
│   ├── mock-llm.ts            # Mock LLM 工具（所有 Lab 共享）
│   └── agent-loop.test.ts     # 12 个测试用例
├── solution/
│   └── agent-loop.ts          # 完整参考实现（学习者做完后对比）
└── demo.ts                    # 可运行 Demo（Mock 模式 + 可选 Live 模式）
```

---

## 核心概念（你必须理解的）

### Agent Loop 到底是什么？

```
普通聊天机器人：
  用户说话 → LLM 回复 → 结束

Agent：
  用户说话 → LLM 回复 "我要用工具" → 执行工具 → 结果喂回 LLM
           → LLM 回复 "我还要用另一个工具" → 执行 → 喂回
           → LLM 回复 "搞定了" → 结束
```

这个「LLM → 工具 → 喂回 → LLM → ...」的循环就是 Agent Loop。

### 用代码表示

```typescript
while (true) {
  // 1. 调用 LLM
  const response = await client.chat(messages);

  // 2. LLM 想用工具吗？
  const toolCalls = response.content.filter(b => b.type === 'tool_use');

  // 3. 不用工具 → 任务完成
  if (toolCalls.length === 0) return;

  // 4. 执行工具
  const results = await executor.executeToolCalls(toolCalls);

  // 5. 把结果加入对话历史（这是循环的"燃料"！）
  messages.push({ role: 'assistant', content: response.content });
  messages.push({ role: 'user', content: results });

  // 6. 回到第 1 步
}
```

就这么简单。Claude Code 的 query.ts 有 1,729 行，但核心逻辑就是这 ~15 行。

---

## 起步指南（Step by Step）

### Step 1：阅读设计文档（30 分钟）

**必读**：`internal/LAB_DESIGN.md` 第五节（Lab 3 详细设计）。里面有：
- 骨架代码的完整模板（6 个 TODO 的注释内容）
- 12 个测试用例的表格
- Mock LLM 的设计方案
- demo.ts 的预期输出

### Step 2：先写 Mock LLM（1 小时）

测试需要一个假的 LLM，它按预定的剧本回复。

```typescript
// tests/mock-llm.ts
import type { Message, ContentBlock, ToolDefinition } from '../../../shared/types';

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

/**
 * 创建一个 Mock LLM。
 * 你给它一个"剧本"（responses 数组），它按顺序一个个回复。
 */
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

/**
 * 创建一个 Mock ToolExecutor。
 * 所有工具调用都返回成功结果。
 */
export function createMockExecutor(results?: Record<string, string>) {
  return {
    async executeToolCall(toolUse: { id: string; name: string; input: any }) {
      const output = results?.[toolUse.name] ?? `Mock result for ${toolUse.name}`;
      return {
        type: 'tool_result' as const,
        tool_use_id: toolUse.id,
        content: output,
        is_error: false,
      };
    },
    async executeToolCalls(toolUses: any[]) {
      return Promise.all(toolUses.map(t => this.executeToolCall(t)));
    },
    getToolDefinitions() {
      return [
        { name: 'read_file', description: 'Read a file', input_schema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
        { name: 'write_file', description: 'Write a file', input_schema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } },
        { name: 'bash_execute', description: 'Run a command', input_schema: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] } },
      ];
    },
  };
}

// ===== 预定义场景（"剧本"）=====

/** 场景：简单问答，不用工具 */
export const SCENARIO_SIMPLE_CHAT: ChatResponse[] = [
  { content: [{ type: 'text', text: '你好！有什么可以帮你的？' }], stopReason: 'end_turn' },
];

/** 场景：创建文件（1 次工具调用） */
export const SCENARIO_SINGLE_TOOL: ChatResponse[] = [
  {
    content: [
      { type: 'text', text: '好的，我来创建文件。' },
      { type: 'tool_use', id: 'toolu_01', name: 'write_file', input: { path: 'hello.js', content: "console.log('Hello!')" } },
    ],
    stopReason: 'tool_use',
  },
  {
    content: [{ type: 'text', text: '文件已创建！' }],
    stopReason: 'end_turn',
  },
];

/** 场景：读文件 → 改文件（2 次工具链式调用） */
export const SCENARIO_CHAIN_TOOLS: ChatResponse[] = [
  {
    content: [
      { type: 'text', text: '我先读一下文件。' },
      { type: 'tool_use', id: 'toolu_01', name: 'read_file', input: { path: 'hello.js' } },
    ],
    stopReason: 'tool_use',
  },
  {
    content: [
      { type: 'text', text: '好的，我来修改它。' },
      { type: 'tool_use', id: 'toolu_02', name: 'write_file', input: { path: 'hello.js', content: "console.log('Hi!')" } },
    ],
    stopReason: 'tool_use',
  },
  {
    content: [{ type: 'text', text: '修改完成！' }],
    stopReason: 'end_turn',
  },
];

/** 场景：纯 tool_use，无 text 块 */
export const SCENARIO_PURE_TOOL_USE: ChatResponse[] = [
  {
    content: [
      { type: 'tool_use', id: 'toolu_01', name: 'write_file', input: { path: 'test.js', content: 'test' } },
    ],
    stopReason: 'tool_use',
  },
  {
    content: [{ type: 'text', text: '完成。' }],
    stopReason: 'end_turn',
  },
];

/** 场景：无限循环（测试 maxTurns 保护） */
export function createInfiniteToolScenario(turns: number): ChatResponse[] {
  return Array.from({ length: turns }, (_, i) => ({
    content: [
      { type: 'tool_use' as const, id: `toolu_${i}`, name: 'bash_execute', input: { command: 'echo loop' } },
    ],
    stopReason: 'tool_use' as const,
  }));
}

/** 场景：空 content 数组 */
export const SCENARIO_EMPTY_CONTENT: ChatResponse[] = [
  { content: [], stopReason: 'end_turn' },
];
```

### Step 3：写测试用例（2-3 小时）

```typescript
// tests/agent-loop.test.ts
import { describe, it, expect } from 'vitest';
import { agentLoop } from '../src/agent-loop';
import {
  createMockLLM, createMockExecutor,
  SCENARIO_SIMPLE_CHAT, SCENARIO_SINGLE_TOOL,
  SCENARIO_CHAIN_TOOLS, SCENARIO_PURE_TOOL_USE,
  SCENARIO_EMPTY_CONTENT, createInfiniteToolScenario,
} from './mock-llm';

// 辅助函数：收集所有事件
async function collectEvents(gen: AsyncGenerator<any>): Promise<any[]> {
  const events = [];
  for await (const event of gen) {
    events.push(event);
  }
  return events;
}

describe('Agent Loop', () => {
  it('测试1：简单问答，无工具调用', async () => {
    const client = createMockLLM(SCENARIO_SIMPLE_CHAT);
    const executor = createMockExecutor();
    const events = await collectEvents(
      agentLoop(client, executor, 'You are helpful.', '你好')
    );
    expect(events.some(e => e.type === 'text')).toBe(true);
    expect(events[events.length - 1].type).toBe('done');
  });

  it('测试2：单工具调用', async () => {
    // ... 用 SCENARIO_SINGLE_TOOL
    // 验证有 tool_call 和 tool_result 事件
  });

  // ... 共 12 个测试，详见 LAB_DESIGN.md 第五节
});
```

### Step 4：写骨架代码（1 小时）

从 `internal/LAB_DESIGN.md` 第五节复制骨架模板到 `labs/lab-03-agent-loop/src/agent-loop.ts`。

**骨架的核心是 6 个 TODO 注释**——学习者要填的空。你的工作是确保：
1. 注释足够清晰，大二学生能看懂
2. 每个 TODO 对应一个测试（填对了就能过）
3. 不需要改骨架的其他部分

### Step 5：写参考实现（1 小时）

在 `solution/agent-loop.ts` 里写完整实现。这是"答案"——学习者做完后可以对比。

### Step 6：写 Demo（1 小时）

```typescript
// demo.ts
import { agentLoop } from './src/agent-loop';
import { createMockLLM, createMockExecutor, SCENARIO_SINGLE_TOOL } from './tests/mock-llm';

async function main() {
  console.log('🤖 Agent Loop Demo (Mock Mode)');
  console.log('━'.repeat(40));
  console.log('You: 帮我创建一个 hello.js\n');

  const client = createMockLLM(SCENARIO_SINGLE_TOOL);
  const executor = createMockExecutor({ write_file: 'Successfully wrote to hello.js' });
  let turn = 0;

  for await (const event of agentLoop(client, executor, 'You are a coding agent.', '帮我创建一个 hello.js')) {
    switch (event.type) {
      case 'text':
        console.log(`[Turn ${turn + 1}] 💬 Agent: "${event.content}"`);
        break;
      case 'tool_call':
        turn++;
        console.log(`[Turn ${turn}] 🔧 Tool: ${event.name}(${JSON.stringify(event.input)})`);
        break;
      case 'tool_result':
        console.log(`[Turn ${turn}] ✅ Result: ${event.output}`);
        break;
      case 'done':
        console.log(`\n🏁 Agent completed in ${turn + 1} turns.`);
        console.log('\n★ 这就是 Agent Loop！LLM 自主决策调用工具。');
        break;
      case 'error':
        console.log(`❌ Error: ${event.error}`);
        break;
    }
  }
}

main();
```

运行方式：`npx tsx labs/lab-03-agent-loop/demo.ts`

---

## AI 工具使用指南

### 给 Codex/Copilot 的提示词

**写 Mock LLM 时：**
```
我在做一个 Agent Loop 的教学项目。需要一个 Mock LLM 工具用于测试。

要求：
1. createMockLLM(responses) — 按顺序返回预定义的回复
2. createMockExecutor() — 所有工具调用返回成功
3. 预定义场景：简单问答、单工具、链式工具、无限循环
4. 类型定义在 shared/types.ts 中（Message, ContentBlock, AgentEvent 等）

类型参考：
[粘贴 shared/types.ts 的内容]
```

**写测试用例时：**
```
我需要为 agentLoop 函数写 Vitest 测试。

函数签名：
export async function* agentLoop(
  client: LLMClient,
  executor: ToolExecutor,
  systemPrompt: string,
  userMessage: string,
  options?: { maxTurns?: number }
): AsyncGenerator<AgentEvent>

需要 12 个测试用例：
[粘贴 LAB_DESIGN.md 中的测试用例表格]

已有的 Mock 工具：
[粘贴 mock-llm.ts 的内容]
```

---

## 重要提醒

1. **先写测试，再写骨架，最后写参考实现** — TDD 顺序
2. **所有测试必须离线可跑** — 不需要 API Key，不需要网络
3. **骨架的 TODO 注释是教学的核心** — 每个字都要仔细推敲
4. **运行 `npx vitest run labs/lab-03-agent-loop/` 验证** — 骨架状态下应该全部失败，填完应该全部通过

---

## 交付清单

- [ ] `tests/mock-llm.ts` — Mock LLM + 预定义场景
- [ ] `tests/agent-loop.test.ts` — 12 个测试（骨架状态下全失败）
- [ ] `src/agent-loop.ts` — 骨架代码（6 个 TODO）
- [ ] `solution/agent-loop.ts` — 完整参考实现
- [ ] `demo.ts` — Mock 模式可运行 demo
- [ ] `npx vitest run labs/lab-03-agent-loop/` — 用 solution 替换 src 后全部通过

## 进度记录

---

### 工作日志

> 格式同其他方向。
