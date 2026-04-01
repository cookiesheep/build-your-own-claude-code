# Lab 2：工具系统

!!! tip "工具是 Agent 的手和脚。<br/>LLM 决定做什么，工具负责真正去做。"

## 实验目的

1. 理解 Tool Calling / Function Calling 的原理
2. 使用 JSON Schema 定义工具接口
3. 实现工具注册表（ToolRegistry）
4. 实现三个核心工具：read_file、write_file、bash_execute
5. 实现工具执行引擎（ToolExecutor）

## 背景知识

### Tool Calling 是怎么工作的

LLM 本身不能执行任何操作。它做的是：**在回复中输出一个结构化的"请求"，告诉 Harness 它想使用什么工具、传什么参数**。

```
你告诉 LLM 有哪些工具可用（通过 tools 参数）：

tools: [{
  name: "read_file",
  description: "Read the contents of a file",
  input_schema: {
    type: "object",
    properties: {
      path: { type: "string", description: "File path to read" }
    },
    required: ["path"]
  }
}]

LLM 的回复中可能包含：

{
  type: "tool_use",
  id: "toolu_abc123",
  name: "read_file",
  input: { path: "./package.json" }  ← LLM 自己决定了路径
}
```

!!! warning "LLM 不执行工具，它只"请求"使用工具"

    工具的实际执行完全由 Harness 控制。Harness 可以拒绝执行（权限不足）、修改参数、或记录日志。这就是 Harness 的"控制"功能。

### 工具执行引擎的职责

```
LLM 返回 tool_use block
    → 根据 name 找到对应的 Tool
    → 验证 input 符合 schema
    → 调用 tool.execute(input)
    → 捕获结果（成功或错误）
    → 包装为 tool_result 返回
```

如果工具不存在或执行报错，不应该 crash，而是返回一个 `is_error: true` 的 tool_result——**让 LLM 知道出错了，它可以自己纠正**。

## 实验任务

详见 [实验任务](./tasks.md)。
