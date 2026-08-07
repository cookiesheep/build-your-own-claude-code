<!-- Parent: ../AGENTS.md -->
<!-- Updated: 2026-07-17 -->

# labs

## Purpose
Lab 骨架代码目录。**此目录当前为空**——Lab 的实际载体是变体文件（variant files）。

## ⚠️ 变体文件机制（重要——不要用旧方案）

Lab 的实际载体是 **变体文件**，位于 claude-code-diy 姐妹仓库的 `src/` 下。学习者在 web 平台编辑器中补全变体文件的 TODO，构建时变体文件覆盖原始源码路径（如 `query-lab3.ts` 覆盖 `query.ts`），实现"在真实 Claude Code 源码中挖空关键文件"。

| Lab | 变体文件 | 主题 | 状态 |
|-----|---------|------|------|
| 0 | `Clawd-lab0.tsx` 等 6 个 UI 文件 | 环境/体验 | ✅ 已设计 |
| 1 | `src/query-lab1.ts` | 消息协议 | ✅ 已设计 |
| 2 | `src/query-lab2.ts` | 工具系统 | ✅ 已设计 |
| 3 | `src/query-lab3.ts` | Agent Loop ★ | 🔧 设计中 |
| 4 | `src/agent/todo-write-lab4.ts` + `subagent-lab4.ts` | 规划/子 Agent | 🔧 设计中 |
| 5 | `src/context/compress-lab5.ts` | 上下文压缩 | 🔧 设计中 |

## ❌ 不要做的事情（旧方案已废弃）

- **不要** 在 `labs/` 下创建 `src/` `tests/` `solution/` `demo.ts` 子目录——这是已废弃的 standalone 设计
- **不要** 使用 Mock LLM 或 Vitest 测试 Lab 代码
- **不要** 引用 `shared/types.ts`——该文件不存在
- **不要** 使用 `npx vitest run` 或 `npx tsx demo.ts` 验证 Lab

## ✅ 正确的验证方式

```
node build.mjs --lab=N    # 变体注入 + 编译，exit 0 = 通过
node cli.js               # 运行 TUI，观察 Agent 行为变化
```

Lab 教学内容设计在 `docs/labs/lab-XX/`（index.md = 概念，tasks.md = 任务步骤）。
Lab 0-2 已完成设计，Lab 3-5 在设计中。
