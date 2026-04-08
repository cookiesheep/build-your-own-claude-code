# 方向 E：文档站 + 测试基础设施 + CI/CD

> **负责人**：待定
> **技术栈**：MkDocs + Vitest + GitHub Actions

---

## 你要做什么（一句话）

完善文档网站内容、搭建 Mock LLM 测试基础设施、配置 GitHub CI 流水线。

## 为什么你要做这个

1. **文档站**是学习者的第一印象——打开网站看到清晰的教程才会继续
2. **Mock LLM**是所有 Lab 测试的基础——没有它测试跑不起来
3. **CI/CD**保证团队每次提交不会互相破坏

---

## 三大职责

### 职责 1：文档站内容完善（优先级高）

文档站已部署：https://cookiesheep.github.io/build-your-own-claude-code

但目前 Lab 页面内容是占位符。你需要：

```
docs/
├── index.md              # ✅ 首页（已有，微调）
├── about/
│   ├── background.md     # ✅ 已有，微调
│   └── faq.md            # 需要补充常见问题
├── labs/
│   ├── index.md          # ✅ 已有
│   ├── lab-00/           # 需要完善安装步骤
│   ├── lab-01/           # 需要完善知识讲解
│   ├── lab-02/           # 需要完善知识讲解
│   ├── lab-03/           # ★ 核心！需要最详细的讲解
│   ├── lab-04/           # 框架完善
│   └── lab-05/           # 框架完善
└── guide/
    ├── typescript.md     # 需要补充 async generator 教学
    ├── messages-api.md   # 需要补充实际 API 调用示例
    ├── tool-calling.md   # 需要补充工具执行流程图
    └── agent-loop.md     # ★ 需要最详细的讲解
```

#### 重点工作

**Lab 03 的 index.md 是最重要的文档**——学习者在做 Lab 3 之前要阅读它。它需要包含：
- Agent Loop 的概念讲解（chatbot vs agent 的区别）
- Claude Code 真实代码中的对应位置（query.ts:307）
- 循环退出条件表格
- AgentEvent 事件流说明
- 配合图示（ASCII 图或 Mermaid 流程图）

**guide/agent-loop.md** 也需要详细写——这是背景知识参考。

### 职责 2：Mock LLM 测试基础设施

方向 C 的同学会实现 Lab 3 的 mock-llm.ts，但你需要确保：

1. **所有 Lab 共享同一个 Mock 基础设施**
2. **vitest.config.ts 能正确找到所有 Lab 的测试**
3. **提供一个 `labs/shared/` 目录**放公共 Mock 工具

```
labs/
├── shared/
│   └── mock-llm.ts       # 共享的 Mock LLM 工具
│   └── test-helpers.ts    # 辅助函数（collectEvents 等）
├── lab-01-messages/tests/ # 使用 labs/shared/mock-llm.ts
├── lab-02-tools/tests/
└── lab-03-agent-loop/tests/
```

确认 vitest 配置能工作：

```typescript
// vitest.config.ts 已有配置，确认覆盖 labs/ 目录
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'tasks/**/tests/**/*.test.ts',
      'src/**/*.test.ts',
      'labs/**/tests/**/*.test.ts',  // ← 确认这一行存在
    ],
    testTimeout: 10000,
  },
});
```

### 职责 3：GitHub Actions CI

当前有 `.github/workflows/docs.yml`（文档部署）。你需要新增：

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build    # tsc --noEmit
      - run: npm test         # vitest run

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm ci
      - run: npm run lint
```

---

## 起步指南

### Step 1：本地跑起来文档站（15 分钟）

```bash
# 安装 MkDocs（Python）
pip install mkdocs-material

# 本地预览
cd D:\code\build-your-own-claude-code
mkdocs serve
# 打开 http://127.0.0.1:8000
```

### Step 2：完善 Lab 3 文档（2-3 小时）

打开 `docs/labs/lab-03/index.md`，按以下结构完善：

1. **实验目的**（已有，检查是否清晰）
2. **背景知识**
   - 添加 Mermaid 流程图：
   ```markdown
   ```mermaid
   graph TD
     A[用户输入] --> B[调用 LLM]
     B --> C{有 tool_use?}
     C -- 是 --> D[执行工具]
     D --> E[结果喂回 messages]
     E --> B
     C -- 否 --> F[任务完成]
   ```
   ```
3. **关键代码解读**——从 Claude Code 源码摘取关键片段并注释
4. **常见陷阱**——stop_reason 不可靠、tool_result.role 是 'user' 等

### Step 3：检查 vitest 配置（30 分钟）

确认 `vitest.config.ts` 的 `include` 覆盖了 `labs/**` 目录。

### Step 4：搭建 CI（1 小时）

创建 `.github/workflows/ci.yml`，推到 main 看 GitHub Actions 是否绿色。

### Step 5：写 FAQ（1 小时）

常见问题：
- Q: 我没有 API Key 怎么办？
- Q: 测试报错 "Cannot find module" 怎么办？
- Q: Demo 运行没有输出怎么办？
- Q: 如何用 DeepSeek 替代 Claude API？

---

## AI 工具使用指南

### 给 Codex/Copilot 的提示词

**写文档时：**
```
我在写一个 Agent Loop 的教学文档（中文），目标读者是大二计算机专业学生。

需要讲解以下概念：
1. 聊天机器人 vs Agent 的区别
2. Agent Loop 的 while(true) 核心逻辑
3. stop_reason 为什么不可靠
4. tool_result 的 role 为什么是 'user'
5. 最大迭代次数保护

要求：
- 用简单语言，避免术语堆砌
- 每个概念配代码示例
- 用 Mermaid 画流程图
- 参考 Claude Code 源码 query.ts 的真实实现
```

**配置 CI 时：**
```
为一个 TypeScript + Vitest 项目创建 GitHub Actions CI 配置。

需要：
1. push/PR 到 main 时触发
2. Node.js 18
3. 运行 tsc --noEmit（类型检查）
4. 运行 vitest run（测试）
5. 运行 eslint（代码检查）

项目使用 npm。
```

---

## 交付清单

### 文档
- [ ] Lab 3 index.md 完善（含 Mermaid 流程图）
- [ ] Lab 3 tasks.md 检查（与 LAB_DESIGN.md 一致）
- [ ] guide/agent-loop.md 完善
- [ ] guide/typescript.md 补充 async generator 教学
- [ ] about/faq.md 补充常见问题（5+ 个 Q&A）
- [ ] `mkdocs serve` 本地预览无报错

### 测试基础设施
- [ ] vitest.config.ts 确认覆盖 labs/ 目录
- [ ] `labs/shared/mock-llm.ts` 创建（与方向 C 协调）
- [ ] `labs/shared/test-helpers.ts` 创建（collectEvents 等辅助函数）
- [ ] `npm test` 能跑 labs/ 下的测试

### CI/CD
- [ ] `.github/workflows/ci.yml` 创建
- [ ] push 到 main 后 GitHub Actions 绿色
- [ ] PR 检查生效

## 进度记录

---

### 工作日志
