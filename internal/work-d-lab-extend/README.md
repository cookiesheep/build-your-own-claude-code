# 方向 D：Lab 扩展内容（Lab 1 + Lab 2）

> **负责人**：待定
> **依赖**：需要先阅读 `internal/LAB_DESIGN.md` 的 Lab 1 和 Lab 2 设计

---

## 你要做什么（一句话）

实现 Lab 1（消息协议）和 Lab 2（工具系统）的骨架代码、测试用例和 Demo。

## 为什么你要做这个

Lab 1 和 Lab 2 是 Lab 3 的基础：
- Lab 1 教学习者理解消息格式（Agent 的"血液"）
- Lab 2 教学习者实现工具系统（Agent 的"手脚"）
- 没有这两个基础，Lab 3 的 Agent Loop 就没有意义

---

## Lab 1 需要产出的文件

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
└── demo.ts                   # 消息构建 Demo
```

## Lab 2 需要产出的文件

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
│   ├── tools.test.ts         # 4 个测试（read/write/bash/不存在的文件）
│   └── tool-executor.test.ts # 2 个测试
├── solution/                 # 完整参考实现
└── demo.ts                   # 工具执行 Demo
```

---

## 起步指南

### Step 1：阅读设计文档（30 分钟）

**必读**：`internal/LAB_DESIGN.md` 的第三节（Lab 1）和第四节（Lab 2）。

### Step 2：理解 shared/types.ts（15 分钟）

所有 Lab 共享同一套类型定义，在 `shared/types.ts`。你的代码必须使用这些类型。

关键类型：
```typescript
// 消息角色
type Role = 'user' | 'assistant';

// 内容块（一条消息可以包含多个块）
type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;

// 一条消息
interface Message { role: Role; content: string | ContentBlock[]; }

// 工具定义（告诉 LLM 有哪些工具可用）
interface ToolDefinition { name: string; description: string; input_schema: JSONSchema; }

// 工具执行结果
interface ToolResult { content: string; is_error?: boolean; }
```

### Step 3：先做 Lab 1（建议 4-5 小时）

#### 3a. 写骨架 `src/types.ts`

```typescript
import type { TextBlock, ToolResultBlock } from '../../../shared/types';

// TODO 1: 实现 createTextBlock(text: string): TextBlock
//   返回 { type: 'text', text }
export function createTextBlock(text: string): TextBlock {
  // TODO: 你的实现
  throw new Error('TODO: 实现 createTextBlock');
}

// TODO 2: 实现 createToolResultBlock
export function createToolResultBlock(
  toolUseId: string,
  content: string,
  isError?: boolean
): ToolResultBlock {
  // TODO: 返回 { type: 'tool_result', tool_use_id: toolUseId, content, is_error: isError }
  throw new Error('TODO: 实现 createToolResultBlock');
}
```

#### 3b. 写骨架 `src/conversation.ts`

参考 `LAB_DESIGN.md` 中的模板，5 个 TODO。

#### 3c. 写测试

```typescript
// tests/types.test.ts
import { describe, it, expect } from 'vitest';
import { createTextBlock, createToolResultBlock } from '../src/types';

describe('createTextBlock', () => {
  it('返回正确格式的 TextBlock', () => {
    const block = createTextBlock('hello');
    expect(block).toEqual({ type: 'text', text: 'hello' });
  });
});

describe('createToolResultBlock', () => {
  it('包含 tool_use_id', () => {
    const block = createToolResultBlock('toolu_01', 'success');
    expect(block.tool_use_id).toBe('toolu_01');
    expect(block.type).toBe('tool_result');
  });
});
```

#### 3d. 写 Demo

```typescript
// demo.ts — 展示消息结构
import { createTextBlock, createToolResultBlock } from './src/types';
// 或 import from './solution/types' 如果你要测试参考实现

console.log('📨 构建 Agent 对话历史...\n');

const messages = [
  { role: 'user', content: '帮我创建 hello.js' },
  { role: 'assistant', content: [
    createTextBlock('好的，我来创建文件。'),
    { type: 'tool_use', id: 'toolu_01', name: 'write_file',
      input: { path: 'hello.js', content: "console.log('Hello!')" } }
  ]},
  { role: 'user', content: [
    createToolResultBlock('toolu_01', '文件已创建')
  ]},
  { role: 'assistant', content: [createTextBlock('完成！')] },
];

messages.forEach((msg, i) => {
  console.log(`[${i + 1}] role: ${msg.role}`);
  if (typeof msg.content === 'string') {
    console.log(`    "${msg.content}"`);
  } else {
    msg.content.forEach(block => {
      if (block.type === 'text') console.log(`    text: "${block.text}"`);
      if (block.type === 'tool_use') console.log(`    tool_use: ${block.name}()`);
      if (block.type === 'tool_result') console.log(`    tool_result: "${block.content}" ← role 是 user！`);
    });
  }
});

console.log('\n✅ Lab 1 完成！你已理解 Agent 对话的数据结构。');
```

### Step 4：再做 Lab 2（建议 5-6 小时）

同样的流程：骨架 → 测试 → 参考实现 → Demo。

Lab 2 的关键知识点：
- **LLM 不执行工具**——它只"请求"使用工具（输出 tool_use 块）
- **Harness 执行工具**——根据 name 找到 handler，执行，返回结果
- **错误不 crash**——返回 `is_error: true`，让 LLM 自己纠正

---

## AI 工具使用指南

### 给 Codex/Copilot 的提示词

**写 Lab 1 骨架时：**
```
在 TypeScript strict 模式下，实现一个 Conversation 类。

功能：
1. addUserMessage(text: string) — 添加用户消息
2. addAssistantMessage(content: ContentBlock[]) — 添加 assistant 消息
3. addToolResults(results: ToolResultBlock[]) — 添加工具结果（role 是 'user'！）
4. getMessages(): Message[] — 返回消息历史副本
5. estimateTokens(): number — 粗略估算 token 数

类型定义：
[粘贴 shared/types.ts 的内容]

要求：做成骨架形式，每个方法体用 throw new Error('TODO') 占位。
```

**写 Lab 2 工具时：**
```
实现一个 read_file 工具，符合以下接口：

interface Tool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  execute(input: Record<string, unknown>): Promise<ToolResult>;
}

要求：
- name: 'read_file'
- input: { path: string }
- 成功：返回文件内容（带行号前缀）
- 失败：返回 { content: 错误信息, is_error: true }
- 使用 fs/promises
```

---

## 交付清单

### Lab 1
- [ ] `src/types.ts` — 骨架（2 个辅助函数 TODO）
- [ ] `src/conversation.ts` — 骨架（5 个方法 TODO）
- [ ] `src/llm-client.ts` — 骨架（2 个 TODO）
- [ ] `tests/` — 6 个测试（骨架状态下全失败）
- [ ] `solution/` — 完整参考实现（测试全通过）
- [ ] `demo.ts` — 可运行

### Lab 2
- [ ] `src/tool-registry.ts` — 骨架（4 个 TODO）
- [ ] `src/tools/` — 3 个工具骨架
- [ ] `src/tool-executor.ts` — 骨架（3 个 TODO）
- [ ] `tests/` — 8 个测试
- [ ] `solution/` — 完整参考实现
- [ ] `demo.ts` — 可运行

### 验证
- [ ] `npx vitest run labs/lab-01-messages/` — solution 替换 src 后全通过
- [ ] `npx vitest run labs/lab-02-tools/` — solution 替换 src 后全通过

## 进度记录

---

### 工作日志
