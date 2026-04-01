# Tool Calling 原理

## 核心概念

Tool Calling（也叫 Function Calling）是让 LLM 能"使用工具"的机制。但 LLM 并不真的执行任何操作——它只是在输出中包含一个结构化的"请求"。

```
LLM 不能做的事情：                LLM 能做的事情：
❌ 读文件                         ✅ 输出 "我想读 hello.js"
❌ 写文件                         ✅ 输出 "请写入这些内容到 hello.js"
❌ 执行命令                       ✅ 输出 "请运行 npm test"
❌ 访问网络                       ✅ 输出 "请搜索 xxx"
```

**Harness 的工作就是把"请求"变成"行动"，再把结果告诉 LLM。**

## 工具定义

告诉 LLM 有哪些工具可用，使用 JSON Schema 描述参数：

```typescript
{
  name: "write_file",
  description: "Create or overwrite a file with the given content",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "The file path to write to"
      },
      content: {
        type: "string",
        description: "The content to write"
      }
    },
    required: ["path", "content"]
  }
}
```

!!! note "description 非常重要"

    LLM 通过 `description` 来理解工具的用途和参数含义。一个好的 description 能让 LLM 更准确地使用工具。

## 执行流程

```
1. 用户请求 → 构造消息 + 工具定义 → 发给 LLM
2. LLM 回复中包含 tool_use block → Harness 解析
3. Harness 根据 name 找到工具 → 调用 execute(input)
4. 结果包装为 tool_result → 作为 user 消息发给 LLM
5. LLM 看到结果 → 决定下一步（继续使用工具 or 回复用户）
```

## 参考链接

- [Anthropic Tool Use 指南](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling) — 不同 API 但原理相同
