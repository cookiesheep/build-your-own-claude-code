# 常见问题

## 这个项目需要懂 AI / 机器学习吗？

**不需要。** Agent 的核心是软件工程（API 调用、消息管理、工具系统、循环控制），不是算法。你只需要会 TypeScript 和基本的异步编程。

## 我需要 API Key 吗？

- **单元测试不需要** — 全部使用 Mock LLM，确定性结果
- **Demo 脚本不需要** — 无 API Key 时自动使用录制的 Mock 数据
- **实际体验需要** — Lab 3 的 live demo 和 Lab 4 的完整运行需要 Anthropic API Key

## 为什么用 TypeScript 而不是 Python？

1. Claude Code 本身是 TypeScript 写的，我们保持一致
2. TypeScript 的类型系统对教学有帮助（接口定义即文档）
3. Node.js 的 AsyncGenerator 非常适合实现 Agent Loop

## 5 个 Lab 需要多长时间？

| Lab | 预计时间 |
|-----|---------|
| Lab 0 | 1 小时 |
| Lab 1 | 2-3 小时 |
| Lab 2 | 2-3 小时 |
| Lab 3 | 3-5 小时 |
| Lab 4 | 2-3 小时 |
| **总计** | **10-15 小时** |

## Lab 4 的"插入 Claude Code"真的能工作吗？

能。Claude Code 的 `query.ts` 已有依赖注入设计（`QueryDeps`），接口边界清晰。我们已做过 PoC 验证。但你的简化实现不会包含所有生产级功能（错误恢复、上下文压缩等），所以在极端情况下可能不如官方稳定。

## 和直接看 Claude Code 源码有什么区别？

直接看 416,500 行源码 = 大海捞针。本项目帮你：
1. 定位核心（3% 的 Harness 代码）
2. 剥离复杂度（从 1,729 行提炼出 100 行核心逻辑）
3. 提供学习路径（5 个 Lab 渐进式构建）
4. 提供验证机制（测试 + 可视化反馈）
