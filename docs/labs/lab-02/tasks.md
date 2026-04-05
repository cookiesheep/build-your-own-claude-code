# Lab 2：给 Agent 一双手 — 实验任务

## 任务 1：定义 Tool 接口和 ToolRegistry

补全 `labs/lab-02-tools/src/tool-definition.ts`：

```typescript
// TODO: 定义 Tool 接口
//   name: string
//   description: string
//   inputSchema: JSONSchema
//   execute(input: Record<string, unknown>): Promise<ToolResult>

// TODO: 实现 ToolRegistry 类
//   register(tool: Tool): void
//   get(name: string): Tool | undefined
//   getToolDefinitions(): ToolDefinition[]   ← 传给 API 的格式
//   listTools(): string[]
```

验证：
```bash
npx vitest run labs/lab-02-tools/tests/tool-definition.test.ts
```

## 任务 2：实现三个核心工具

补全 `labs/lab-02-tools/src/tools/`：

### read_file

```typescript
// TODO: 读取指定路径的文件内容
// - 文件不存在 → 返回 { content: "Error: file not found", is_error: true }
// - 成功 → 返回 { content: "1 | line1\n2 | line2\n..." }（带行号）
```

### write_file

```typescript
// TODO: 写入内容到指定路径
// - 自动创建不存在的父目录
// - 返回 { content: "Successfully wrote to {path}" }
```

### bash_execute

```typescript
// TODO: 执行 shell 命令
// - 捕获 stdout + stderr
// - 30 秒超时
// - 返回 { content: "exit_code: 0\nstdout: ...\nstderr: ..." }
```

验证：
```bash
npx vitest run labs/lab-02-tools/tests/tools.test.ts
```

## 任务 3：实现 ToolExecutor

补全 `labs/lab-02-tools/src/tool-executor.ts`：

```typescript
// TODO: 实现 ToolExecutor 类
//   constructor(registry: ToolRegistry)
//   executeToolCalls(toolUseBlocks: ToolUseBlock[]): Promise<ToolResultBlock[]>
//
//   对每个 tool_use block:
//   1. 从 registry 找到工具（找不到 → is_error: true）
//   2. 调用 tool.execute(input)（异常 → 捕获，is_error: true）
//   3. 返回 tool_result block
```

验证：
```bash
npx vitest run labs/lab-02-tools/tests/tool-executor.test.ts
```

!!! success "你应该看到"

    ```
    npx tsx labs/lab-02-tools/demo.ts

    Registered tools: read_file, write_file, bash_execute

    Simulating tool_use: read_file("./package.json")
    Executing...
    Result: { "name": "build-your-own-claude-code", ... }
    ✓ Tool executed successfully

    Simulating tool_use: bash_execute("echo hello")
    Executing...
    Result: exit_code: 0, stdout: hello
    ✓ Tool executed successfully

    Simulating tool_use: nonexistent_tool(...)
    Result: Error: Unknown tool 'nonexistent_tool'
    ✓ Error handled gracefully (is_error: true)
    ```

## 思考题

1. Claude Code 有 50+ 个工具，但核心只需要 3 个（read, write, bash）。为什么这 3 个就够了？
2. 工具执行出错时，为什么要返回 `is_error: true` 而不是直接 throw？
3. 如果有多个 tool_use block，应该并行执行还是串行执行？为什么？（提示：Claude Code 区分了只读工具和写入工具）
