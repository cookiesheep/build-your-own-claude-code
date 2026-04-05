# HANDOFF.md — 完整交接文档

> 本文档记录了从项目构思到当前状态的所有上下文。新的 AI 会话必须阅读此文档才能理解项目全貌。

---

## 一、项目 Owner 的背景

### 谁

- 中山大学大二本科生（cookiesheep）
- 5 人软件工程课程大作业团队的 leader
- 约 12 周有效开发时间

### 已有的成果

1. **claude-code-diy** ([GitHub](https://github.com/cookiesheep/claude-code-diy))：从 Claude Code npm 包 source map 恢复了 ~1,888 个 TypeScript 文件（416,500 行），并在 Node.js 上修复所有运行问题使其完整运行。这给了 owner 对 Claude Code 内部架构的深入理解。

2. **本项目 build-your-own-claude-code**：基于上述理解，设计的教学项目。已完成项目初始化、MkDocs 文档站点搭建、初版 Lab 页面。

### Owner 的核心需求（按优先级）

1. **学习者最终得到一个"高度个性化的类似 Claude Code 的专业级工具"**——不是玩具，是真实 Claude Code TUI 由学习者自己写的代码驱动。这是项目的核心竞争力和不可妥协的底线。

2. **循序渐进的教学体验**——像 YatSenOS 一样，每个 Lab 完成后能看到新的能力出现。不是一下子填完所有代码。

3. **即时反馈**——最好能在网页上写代码并看到测试结果和 Agent 行为模拟。不要让学习者被环境配置和找代码目录所累。

4. **课程答辩能过**——项目需要体现软件工程全流程（需求→设计→实现→测试→文档）。

5. **开源社区价值**——希望项目能吸引 star 和贡献者。

### Owner 的明确偏好

- **坚持使用 Claude Code 真实源码**，不接受"从零写 800 行"的方案（太普通，缺少 wow factor）
- **重视反馈设计**——受 YatSenOS、Kaggle notebooks、pwn.college 启发，希望每一步都有可见反馈
- **愿意承担风险**——明确选择了高风险高回报路线
- **名字从 build-your-own-agent 改为 build-your-own-claude-code**——更直接

---

## 二、调研过的参考项目

### 1. learn-claude-code ([GitHub](https://github.com/shareAI-lab/learn-claude-code))

**是什么**：12 个渐进式 Python 课程，教 Agent Harness 工程。star 很多。

**优势**：
- 极简（s01 只有 120 行 Python）
- 渐进式叠加（每课只加一个机制）
- 覆盖面广（从基础循环到团队协作到 worktree 隔离）
- 文档写作水平高

**局限**：
- 没有测试/自动反馈
- 学习者不写代码（读完整实现，不是填空）
- 最终没有"作品"
- 和 Claude Code 源码没有直接关联

**对我们的启发**：
- 12 课的主题设计值得参考，我们的 6 个 Lab 应覆盖其中最核心的 s01-s06
- 渐进式结构很好，但我们要做得更好——加测试和 TODO 骨架

**12 课主题及我们的覆盖情况**：
- s01 Agent Loop → 我们的 Lab 3 ✅
- s02 Tool Use → 我们的 Lab 2 ✅
- s03 TodoWrite（规划） → 我们的 Lab 4 ✅
- s04 Subagent → 我们的 Lab 4 ✅
- s05 Skill Loading → 未覆盖（可作 Bonus）
- s06 Context Compact → 我们的 Lab 5 ✅
- s07-s12（高级主题）→ 未覆盖（可作 Bonus）

### 2. claude-code-best (CCB) ([GitHub](https://github.com/claude-code-best/claude-code))

**是什么**：活跃维护的 Claude Code 逆向复现项目。2,864 个文件，537,805 行。运行时为 Bun。

**关键发现**：
- `learn/` 目录有高质量的源码学习笔记（phase-1-startup-flow.md, phase-2-conversation-loop.md），详细标注每个文件的行号和数据流
- 比 claude-code-diy 多了 Computer Use、Voice Mode、Dream 等新功能
- 构建系统用 Bun.build，比 claude-code-diy 的 14 步 patch 简单

**结论**：不切换基线（CCB 用 Bun，切换成本高），但参考其 `learn/` 目录的文档。

### 3. YatSenOS v2 ([GitHub](https://github.com/YatSenOS/YatSenOS-Tutorial-Volume-2))

**是什么**：中山大学操作系统实验教程（同校）。9 个 Lab，基于 Rust 和 UEFI。

**对我们的核心启发**：
- QEMU 虚拟机是固定的壳，内核能力逐步增长（Hello World → 中断 → 线程 → 用户态）
- 每个 Lab 有 FIXME 标记让学生填空
- 反馈是"启动系统后看到新能力"

**我们的类比**：Claude Code TUI 是固定的壳，Agent 大脑从空开始获得能力。

### 4. 在线编码平台调研

| 平台 | 代码在哪里运行 | 技术栈 | 适合我们吗 |
|------|-------------|--------|----------|
| pwn.college | 服务端 Docker 容器（每用户一个） | CTFd + Docker + code-server | ❌ 需要 40 核 256GB 服务器 |
| Exercism | 服务端 Docker 容器 | Docker（无网络，3GB，20s 超时）| ❌ 需要服务端基础设施 |
| CodeCrafters | 学习者本地 | git push 触发远程测试 | ✅ 可参考模式 |
| Kaggle | 服务端 Jupyter | JupyterHub + Docker | ❌ 需要后端 |
| WebContainers | 浏览器内（WASM） | WebAssembly | ⚠️ 可行但 416K 行可能太重 |

**结论**：对于核心函数编写（纯函数 + Mock 数据），可以在浏览器内 eval 运行，不需要服务器。对于完整 Claude Code 体验，需要本地或 GitHub Codespaces。

---

## 三、被否决的方案及原因

### 方案 A：从 500K 行删减到几万行
- **被否决原因**：不知道哪根依赖链抽了就崩。太危险，无法预测。

### 方案 B：封装大部分代码为黑盒
- **被否决原因**：工作量太大。需要理解所有模块边界，设计接口层。5 人 12 周不够。

### 方案 C：从零写 ~800 行独立 agent
- **被否决原因**：Owner 明确拒绝——太普通，学习者最终得到的是"一个丑陋的低质量的工具"，缺少 wow factor。和网上 100 个 agent tutorial 没有区别。

### 方案 D（最终选择）：不删不封装，在完整源码上挖空关键文件
- **选择原因**：
  1. 不删任何代码（安全）
  2. 不需要理解全部代码（只操作 1-2 个文件）
  3. 有真实反馈（完整 TUI）
  4. 手术范围最小

---

## 四、最终方案详细设计

### 4.1 教学架构

```
完整的 Claude Code（416,500 行，全部保留，通过 claude-code-diy 构建运行）
                    │
                    ▼
        query.ts 被替换为 query-lab-XX.ts（渐进版本）
                    │
                    ▼
          学习者补全 TODO → build → TUI 运行
```

### 4.2 六个 Lab 的渐进式设计

每个 Lab 对应一个 `query-lab-XX.ts` 版本。后一个版本 = 前一个版本的完成品 + 新 TODO。

**Lab 0: 环境与体验**
- 安装 Node.js，clone claude-code-diy，build，运行
- 看到完整 TUI → "这是你最终要驱动的东西"
- 可选：TypeScript 基础练习

**Lab 1: 让 Agent 会说话**
- query-lab-01.ts: 只调 API 返回文字，不支持工具
- 学习者实现：调用 deps.callModel()，收集文本，yield 消息，return completed
- TUI 反馈：Agent 能回复文字，但说"我来帮你创建文件"后什么也不做

**Lab 2: 给 Agent 一双手**
- query-lab-02.ts: 在 Lab 1 基础上加单轮工具执行
- 学习者实现：提取 tool_use blocks，调用 runTools()，yield 结果
- TUI 反馈：Agent 用了一次工具就停了

**Lab 3: Agent 核心循环 ★**
- query-lab-03.ts: 在 Lab 2 基础上加 while(true)
- 学习者实现：循环结构，工具结果喂回 messages，继续调 LLM
- TUI 反馈：Agent 自主多轮调用工具！（chatbot → agent 的分界线）
- **这是核心 Lab，投入 80% 精力打磨 skeleton、测试、文档、hints**

**Lab 4: 规划与子 Agent**
- 学习者实现：TodoWrite 机制（先列步骤再动手）+ Subagent 派生（独立 messages[]）
- 对标 learn-claude-code 的 s03 + s04
- TUI 反馈：Agent 创建了计划列表，按步骤执行

**Lab 5: 上下文压缩**
- 学习者实现：三层压缩策略（micro_compact + auto_compact + manual_compact）
- 对标 learn-claude-code 的 s06
- TUI 反馈：长对话不崩，自动压缩提示

### 4.3 反馈设计（三层）

**层 1: 测试 pass/fail（浏览器内，即时）**
- Mock LLM：预录的固定 JSON 响应序列
- 每个 Lab 5-8 个测试用例，按 TDD 顺序
- 确定性：任何机器上结果一致

**层 2: Agent 行为模拟动画（浏览器内，即时）**
- 测试通过后，用学习者代码 + Mock 数据运行模拟
- 动画展示每一轮的 API 调用、工具执行、结果回传
- 即使是 Mock，"看到循环在转"很有冲击力

**层 3: 真实 Claude Code TUI（本地，可选）**
- `node build.mjs --lab 3` → 注入学习者代码
- `node cli.js` → 完整 TUI 启动
- 需要 API Key，是"毕业典礼"

### 4.4 Web 编辑器

推荐方案：Monaco Editor + 浏览器内测试

- 学习者在网页上写的只是一个纯函数（~50-100 行）
- 测试用 Mock LLM 数据，浏览器内 eval 运行
- 不需要服务器（纯前端）
- 1 个队友专门负责这个 Web 平台

可嵌入 MkDocs 文档页面（iframe），或作为独立 React 应用。

### 4.5 构建系统改造

在 claude-code-diy 的 build.mjs 中加一步：

```javascript
if (process.env.LAB_MODE) {
  const labN = process.env.LAB_MODE;
  // 用 labs/lab-0X/query-lab.ts 替换 dist/ 中的 query.js
}
```

### 4.6 Claude Code 源码中的关键文件

（来自前一个会话的深度分析）

| 文件 | 行数 | 角色 |
|------|------|------|
| `src/query.ts` | 1,729 | ★ Agent Loop 本体，while(true) 循环 |
| `src/QueryEngine.ts` | 1,295 | query() 的调用者，session 管理 |
| `src/Tool.ts` | 792 | 工具执行上下文，权限 |
| `src/services/api/claude.ts` | ~1,500 | LLM 流式调用 |
| `src/services/tools/toolOrchestration.ts` | ~400 | 工具路由（并发/串行） |
| `src/services/tools/toolExecution.ts` | ~400 | 单个工具执行 |
| `src/utils/messages.ts` | ~800 | 消息构造 |
| `src/query/deps.ts` | ~40 | QueryDeps 依赖注入（使替换 query() 成为可能） |

query.ts 的关键接口：
```typescript
export async function* query(params: QueryParams):
  AsyncGenerator<StreamEvent | Message | ..., Terminal>

type QueryDeps = {
  callModel: typeof queryModelWithStreaming,
  microcompact: ...,
  autocompact: ...,
  uuid: () => string,
}
// query.ts 第 263 行: const deps = params.deps ?? productionDeps()
```

CCB 的 learn/phase-2-conversation-loop.md 有 query.ts 每一段的详细标注（行号级别），开发时务必参考。

---

## 五、待完成事项（按优先级）

### P0（必须做，决定项目成败）

1. **PoC 验证**：在 claude-code-diy 中写一个简化版 query-lab.ts，替换 query.ts，验证 TUI 是否正常运行。这决定了整个"挖空"方案是否可行。

2. **Lab 3 完整实现**：skeleton 代码 + Mock LLM 测试 + 文档 + hints。这是核心 Lab。

3. **参考实现**：完整的 ~800 行独立 agent 作为 solution（不面向学习者，但团队需要先写出来才能拆成 Lab）。

### P1（重要，但 P0 完成后再做）

4. **Lab 1-2 实现**：skeleton + tests + docs（这两个 Lab 相对简单）。

5. **Web 编辑器 MVP**：Monaco + 浏览器内测试运行器。

6. **build.mjs --lab 模式**：构建系统支持注入不同 Lab 版本的 query。

### P2（有时间再做）

7. **Lab 4-5 实现**：规划/子 Agent/上下文压缩。

8. **GitHub Codespaces devcontainer**：一键云端环境。

9. **Beta 测试**：找 2-3 个非团队成员试做。

10. **文档更新**：MkDocs Lab 页面更新为最新 6-Lab 设计。

---

## 六、Sprint 规划（建议）

| Sprint | 周 | 目标 |
|--------|------|------|
| 0 | 1-2 | PoC 验证 + 每人读 CCB learn/ 文档建立心智模型 |
| 1 | 3-5 | 参考实现 + Lab 3 skeleton/tests |
| 2 | 6-8 | Lab 1-2 + Web 编辑器 MVP + build.mjs --lab |
| 3 | 9-10 | Lab 4-5 + Beta 测试 |
| 4 | 11-12 | 打磨 + 答辩准备 |

---

## 七、给新 AI 会话的注意事项

1. **先读 CLAUDE.md 和 HANDOFF.md**。
2. **PoC 是第一优先级**——在做任何其他事情之前，先验证"替换 query.ts 后 TUI 还能跑"。
3. **不要推翻"挖空"方案**——除非 PoC 失败。Owner 已经明确否决了从零写和封装方案。
4. **Lab 3 是核心**——如果精力有限，只做好 Lab 3 一个也比 6 个都半成品强。
5. **Owner 重视反馈设计**——每个 Lab 必须产生可视的变化。
6. **CCB 的 learn/ 目录是宝藏**——开发时参考 `/tmp/ccb/learn/phase-2-conversation-loop.md`（或重新 clone）。
7. **不要过度工程化**——这是教学项目，清晰 > 花哨。
8. **Owner 希望新会话双重验证设计方案**——请对方案保持批判态度，如果发现更好的方法，直说。
