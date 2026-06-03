# AI 协作审查清单（后端工作区）

> 用途：给 Leader 自己看。  
> 目标：在“不完全懂代码”的情况下，仍然能判断 AI 这次开发是不是靠谱、是不是跑偏、是不是值得合并。

---

## 1. 先记住一个原则

你不需要先把所有代码都看懂，才有资格判断这次开发对不对。

在 BYOCC 这个项目里，更现实、更有效的审查方式是：

```text
先看这次改动想保证什么
→ 再看改了哪些文件
→ 再跑关键验证命令
→ 再观察关键现象有没有发生
```

也就是说：

- **不要一上来就试图看懂全部实现细节**
- **先确认目标、范围、现象**
- **最后只看最关键的 1-3 个文件**

---

## 2. 以后每次让 AI 固定交付的 4 段

以后每次 AI 完成一个阶段，都应该固定输出这 4 段：

### 1）这次改动要保证的真理

也就是“这次改动到底想保证什么不会再错”。

示例：

- `sessionId` 不能单独当权限凭证
- 容器是临时的，workspace/progress 才是持久状态
- terminal 必须靠短期 token 进入
- cleanup 不能删正在使用的容器

### 2）改了哪些文件

不要求 AI 解释全部细节，但必须明确列出关键文件。

示例：

- `server/src/routes/environment.ts`
- `server/src/services/ws-proxy.ts`
- `server/src/services/container-cleanup.ts`

### 3）你必须跑的命令

AI 必须告诉你：

- 哪几个命令是这次最核心的验证
- 哪些是静态检查
- 哪些是行为检查

### 4）你不懂代码也能观察到的正确现象

这个最关键。

AI 必须把“正确结果应该长什么样”讲清楚，例如：

- `HTTP 403`
- `PASS BYOCC E2E regression checks completed.`
- `terminalUrl` 包含 `token=...`
- 浏览器里能看到真实 Claude Code TUI

---

## 3. 你每次自己怎么审

### 第一步：先问 4 个问题

每次开发结束后，你先看 AI 有没有把这 4 段交代清楚。

如果没有，直接补问：

1. 这次改动要保证的真理是什么？
2. 改了哪些文件？
3. 我必须跑哪几个命令？
4. 我不懂代码也能观察到的正确现象是什么？

如果 AI 连这 4 个问题都说不清，那这次开发不应该直接合并。

---

## 4. 你的最小验证流程

### A. 看范围

```powershell
git diff --stat
git diff --name-only
```

你只需要先判断：

- 这次有没有超 scope？
- 改的文件是不是合理？

例如：

- 做 TTL cleanup，却改了 OAuth 文件，不合理
- 做文档 PR，只改文档和 `.env.example`，合理

### B. 跑静态检查

后端阶段常用：

```powershell
cd D:\code\build-your-own-claude-code\server
npm test
npm run build
```

项目级常用：

```powershell
cd D:\code\build-your-own-claude-code
npx tsc --noEmit --project server/tsconfig.json
npx tsc --noEmit --pretty false --project platform/tsconfig.json
```

### C. 跑行为验证

目前后端核心验证命令：

```powershell
cd D:\code\build-your-own-claude-code\server
npm run e2e:regression
npm run e2e:regression:full
npx tsx src/scripts/cleanup-containers.ts --dry-run --max-idle-minutes=999999
```

如果这三个都通过，说明：

- auth/session/environment 边界没坏
- submit/progress/terminal token 链路没坏
- cleanup 至少没有明显误删候选

---

## 5. 你要特别关注的“反向验证”

很多 bug 不是“功能失败”，而是“不该成功的东西居然成功了”。

所以每次除了 happy path，还要看这些：

### 边界类

- 无 token 恢复已绑定 session 应该被拒绝
- user B 操作 user A 的 session 应该 `401/403`
- terminal URL 必须带 `token=...`

### 状态类

- progress 应该能跟着 user 走
- cleanup 不该删 active terminal session
- container 过期后 environment 应该显示 `expired`

### 部署类

- `BYOCC_AUTH_SECRET` 不能还是示例值
- `CORS_ORIGINS` 不能是 `*`
- public demo 前必须先跑 regression

---

## 6. 什么时候你应该要求“再解释一次”

如果你看到下面这些情况，应该立刻要求 AI 重讲：

- 改动文件明显超 scope
- AI 只说“应该可以”“看起来没问题”
- 没有给出具体验证命令
- 没说清楚正确现象应该是什么
- 代码改动很多，但 AI 没解释最核心的 1-2 个设计决策

你可以直接问：

```text
不要重复泛泛总结。
请只告诉我：
1. 这次改动要保证的真理
2. 改了哪 3 个最关键文件
3. 我必须跑的命令
4. 正确现象
```

---

## 7. 推荐的协作节奏

推荐一直保持这个顺序：

```text
AI 先做
→ AI 解释 4 段
→ 你跑命令看现象
→ 你只看关键文件
→ 再决定 commit / push / merge
```

而不是：

```text
AI 一做完
→ 你完全看不懂
→ 只能硬着头皮信
```

---

## 8. 当前项目最常用的判断标准

你现在不需要判断“代码是不是最优雅”。

你优先判断这 4 件事就够了：

1. 有没有跑偏需求
2. 有没有明显超 scope
3. 关键现象是不是对了
4. 有没有把旧功能搞坏

这已经是非常好的 owner 审查标准了。
