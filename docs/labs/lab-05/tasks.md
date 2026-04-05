# Lab 5：上下文压缩 — 实验任务

## 任务 1：实现 micro_compact（Layer 1）

补全 `labs/lab-05/src/micro-compact.ts`：

```typescript
// TODO: 实现 microCompact(messages: Message[]): Message[]
// 规则：
// 1. 找出所有 tool_result 消息
// 2. 保留最近 3 个
// 3. 把更早的 tool_result content 替换为 "[Previous: used {tool_name}]"
// 4. 例外：read_file 的结果保留（是参考资料，压缩了会让 LLM 重复读文件）

const KEEP_RECENT = 3;
const PRESERVE_TOOLS = new Set(['read_file']);
```

验证：
```bash
npx vitest run labs/lab-05/tests/micro-compact.test.ts
```

测试用例包含：
- 少于 3 个 tool_result → 不压缩
- 多于 3 个 tool_result → 压缩旧的
- read_file 结果 → 即使旧也保留

## 任务 2：实现 auto_compact（Layer 2）

补全 `labs/lab-05/src/auto-compact.ts`：

```typescript
// TODO: 实现 autoCompact(messages: Message[], client: LLMClient): Promise<Message[]>
// 步骤：
// 1. 把完整对话保存到 .transcripts/{timestamp}.jsonl
// 2. 调用 LLM 生成摘要（包含：做了什么、当前状态、关键决策）
// 3. 返回只包含摘要的 messages（压缩后的起点）

const TRANSCRIPT_DIR = '.transcripts';
const TOKEN_THRESHOLD = 50000;
```

验证（使用 Mock LLM）：
```bash
npx vitest run labs/lab-05/tests/auto-compact.test.ts
```

## 任务 3：集成三层压缩到 Agent Loop

在 Lab 3 的 agentLoop 基础上，集成三层压缩：

```typescript
// TODO: 在 while(true) 循环的开头加入：
//
// 1. 每轮都运行 micro_compact
// messages = microCompact(messages);
//
// 2. 估算 token 数，超限则 auto_compact
// if (estimateTokens(messages) > TOKEN_THRESHOLD) {
//   messages = await autoCompact(messages, client);
// }
//
// 然后才调用 LLM
```

!!! success "你应该看到"

    ```
    npx tsx labs/lab-05/demo.ts --long-conversation

    [Turn 1]  tokens: ~1,200
    [Turn 5]  tokens: ~8,500
    [Turn 10] tokens: ~24,000
    [Turn 15] tokens: ~42,000
    [Turn 16] [micro_compact] 压缩旧工具结果，节省 ~8,000 tokens
    [Turn 20] tokens: ~38,000
    [Turn 21] [auto_compact triggered] 保存 transcript...
              LLM 生成摘要: "已完成功能 A、B、C，当前在处理 D..."
              压缩后 tokens: ~2,000
    [Turn 22] tokens: ~3,200
    ...（Agent 继续工作，没有崩溃）

    ✅ Agent 完成了 30 轮对话，全程无崩溃
       使用了 2 次 micro_compact，1 次 auto_compact
    ```

## 思考题

1. micro_compact 为什么要保留 read_file 的结果？如果不保留会发生什么？
2. auto_compact 的摘要 prompt 应该包含哪些信息？太简短或太详细各有什么问题？
3. Claude Code 的 `query.ts` 中，这两个压缩函数是通过 `QueryDeps` 注入的。为什么要这样设计，而不是直接调用？
4. Bonus：实现 compact tool（Layer 3）——让 LLM 自己决定何时触发压缩。
