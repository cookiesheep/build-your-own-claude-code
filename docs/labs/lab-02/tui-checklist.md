# Lab 2：TUI 验证 Checklist

## 运行命令

在 `claude-code-diy` 目录运行：

```bash
node build.mjs --lab=2
node cli.js
```

构建日志里应该出现：

```text
Lab mode enabled
Swapped dist\src\query.js <- dist\src\query-lab2.js
Build complete
```

## 验证场景

| # | 输入 | 成功标志 | 说明 |
|---|------|----------|------|
| 1 | `你好，请用一句话说明你现在能做什么` | Agent 正常回复文本 | 没有 `tool_use`，走 Lab 1 路径 |
| 2 | `请读取 README.md 第一行` | TUI 显示一次读取工具的执行结果 | Lab 2 核心能力：`tool_use -> runTools -> tool_result` |
| 3 | `请读取 package.json，并告诉我 name 字段是什么` | 可能读取文件，但不会继续总结 name | Lab 2 没有把工具结果喂回 LLM |
| 4 | `读取 README.md，然后根据里面的说明继续读取配置文件` | 只完成第一步工具调用后停止 | 为 Lab 3 制造明确需求 |

## 观察记录模板

```text
日期：
环境：
Node 版本：
命令：
  node build.mjs --lab=2
  node cli.js

构建结果：
  [ ] 成功
  [ ] 看到 query-lab2 替换 query.js

TUI 场景：
  [ ] 纯文本 prompt 正常回复
  [ ] 单工具 prompt 展示工具结果
  [ ] 多步 prompt 只完成第一步

备注：
```

## 常见异常

| 现象 | 可能原因 | 处理 |
|------|----------|------|
| 构建成功但工具不执行 | TODO 5 没有收集到 `tool_use` | 检查是否扫描了 `message.message.content` |
| 工具执行了但 TUI 看不到结果 | 漏了 `yield update.message` | 在 `runTools()` 循环内 yield 工具消息 |
| 多步任务完整做完 | 提前实现了 Lab 3 循环 | 回退循环逻辑，Lab 2 只执行一轮 |
| prompt 不触发工具 | 模型选择纯文本回答 | 换成更明确的读文件请求 |
