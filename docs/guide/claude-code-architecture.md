# Claude Code 架构分析

本页基于 [claude-code-diy](https://github.com/cookiesheep/claude-code-diy) 项目对 Claude Code 源码的实际分析。

## 代码规模

| 模块 | 文件数 | 行数 | 占比 |
|------|--------|------|------|
| 杂项/工具函数/命令 | 700+ | ~200,000 | 48% |
| TUI/React/Ink UI | 389 | ~73,000 | 18% |
| 工具实现（50+） | 185 | ~50,829 | 12% |
| 基础设施 | 100+ | ~32,000 | 8% |
| **核心 Harness** | ~30 | **~12,000** | **3%** |
| 其他 | 500+ | ~48,671 | 11% |
| **总计** | **1,916** | **416,500** | 100% |

**核心发现：真正的 Agent Harness 只占 3%。**

## 核心文件

| 文件 | 行数 | 职责 |
|------|------|------|
| `query.ts` | 1,729 | Agent Loop 本体 — `while(true)` 循环 |
| `QueryEngine.ts` | 1,295 | Session 管理、消息持久化 |
| `Tool.ts` | 792 | 工具执行上下文、权限 |
| `services/api/claude.ts` | ~1,500 | LLM 流式调用 |
| `services/tools/toolOrchestration.ts` | ~400 | 工具路由（并发/串行） |
| `services/tools/toolExecution.ts` | ~400 | 单个工具执行 |
| `utils/messages.ts` | ~800 | 消息构造和规范化 |

## Agent Loop 关键设计

### 依赖注入

```typescript
// query.ts 第 263 行
const deps = params.deps ?? productionDeps();

type QueryDeps = {
  callModel: typeof queryModelWithStreaming,
  microcompact: ...,
  autocompact: ...,
  uuid: () => string,
}
```

这使得 `query()` 可以被替换为学习者的实现。

### stop_reason 不可靠

```typescript
// query.ts 第 554 行注释
// "Note: stop_reason === 'tool_use' is unreliable"
// 真正的判断方式：
const needsFollowUp = toolUseBlocks.length > 0;
```

### 工具路由策略

```typescript
// toolOrchestration.ts
// 只读工具（如 read_file, grep）→ 并发执行
// 写入工具（如 write_file, bash）→ 串行执行
for (const { isConcurrencySafe, blocks } of partitionToolCalls(...)) {
  if (isConcurrencySafe) {
    yield* runToolsConcurrently(blocks);
  } else {
    yield* runToolsSerially(blocks);
  }
}
```

## 50+ 工具清单

核心工具（Agent 必需）：
- `FileReadTool` — 读取文件
- `FileWriteTool` — 写入文件
- `FileEditTool` — 编辑文件（diff）
- `BashTool` — 执行 shell 命令
- `GrepTool` — 搜索文件内容
- `GlobTool` — 按模式查找文件

高级工具（增强能力）：
- `AgentTool` — 生成子 Agent
- `WebSearchTool` — 搜索网络
- `MCPTool` — Model Context Protocol
- `TaskCreateTool` / `TaskUpdateTool` — 任务管理
- ...还有 40+ 个

## 参考

- [claude-code-diy 项目](https://github.com/cookiesheep/claude-code-diy) — 可运行的 Claude Code 源码
- [RECOVERY_GUIDE.md](https://github.com/cookiesheep/claude-code-diy/blob/main/RECOVERY_GUIDE.md) — 源码恢复的技术细节
