# Lab 1-3 设计文档索引

> Date: 2026-05-09 | Status: Draft

## 文件清单

| 文件 | 行数 | 内容 |
|------|------|------|
| [reference-projects-analysis.md](./reference-projects-analysis.md) | 307 | 竞品/参考项目深度分析 |
| [lab-01-design.md](./lab-01-design.md) | 504 | Lab 1: API Calling 完整设计 |
| [lab-02-design.md](./lab-02-design.md) | 581 | Lab 2: Tool System 完整设计 |
| [lab-03-design.md](./lab-03-design.md) | 821 | Lab 3: Agent Loop 完整设计 ★核心 |

## 设计概览

### 核心决策

- **每个 Lab 只需一个变体文件** `query-labN.ts`，替换 `query.ts`（1729 行生产级 Agent Loop）
- **渐进式骨架**：Lab N 的 skeleton = Lab N-1 的完成品 + 新 TODO
- **评测 = 编译验证 + TUI 体验**（路线 A，不使用 Mock LLM）

### 学习者代码量

| Lab | 新增 TODO | 累计代码 | 核心任务 |
|-----|----------|---------|---------|
| 1 | ~25 行 | ~25 行 | 调用 LLM + yield + return |
| 2 | ~30 行 | ~55 行 | 检测 tool_use + 执行工具 + 收集结果 |
| 3 | ~15 行 | ~70 行 | while(true) + 消息更新 + 循环 |

### 渐进式体验

```
Lab 0: 完整 Claude Code → "这是你要修的东西"
Lab 1: Agent 能说话 → "它开口了！"     Motto: "Teaching silence to speak"
Lab 2: Agent 能用工具（一次）→ "能动手了" Motto: "One grasp at a time"
Lab 3: Agent 自主多轮推理 → "它活了！" ★ Motto: "It's alive!"
```

### 变体文件架构

```
claude-code-diy/src/
  query.ts          (1729 行, 生产版)
  query-lab.ts      (227 行, PoC 已验证)
  query-lab1.ts     (待创建, Lab 1 skeleton)
  query-lab2.ts     (待创建, Lab 2 skeleton)
  query-lab3.ts     (待创建, Lab 3 skeleton)

构建时:
  node build.mjs --lab=1  → query-lab1.ts 替换 query.ts
  node build.mjs --lab=2  → query-lab2.ts 替换 query.ts
  node build.mjs --lab=3  → query-lab3.ts 替换 query.ts
```

## 下一步

1. **Review 设计文档** — owner 审查教学设计是否合理
2. **创建 skeleton 文件** — 在 claude-code-diy 中创建 `query-lab1/2/3.ts`
3. **编译验证** — 确保每个 skeleton TODO 填充后能编译
4. **TUI 验证** — 确保每个 Lab 编译后 Agent 行为符合预期
5. **同步三条管道** — Docker 镜像 / lab-files.json / SQLite
