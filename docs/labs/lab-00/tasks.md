# Lab 0：实验任务

## 任务 1：安装开发环境

确保以下工具已安装：

```bash
node --version   # >= 18.0.0
git --version
npm --version
```

!!! note "推荐使用 VS Code 作为编辑器，安装 TypeScript 和 ESLint 扩展。"

## 任务 2：克隆并运行项目

```bash
git clone https://github.com/cookiesheep/build-your-own-agent.git
cd build-your-own-agent
npm install
```

运行测试确认环境正常：

```bash
npx vitest run
```

## 任务 3：体验 Claude Code

clone 并运行完整的 Claude Code（基于 claude-code-diy 项目）：

```bash
git clone https://github.com/cookiesheep/claude-code-diy.git
cd claude-code-diy
npm install
node build.mjs
```

配置 API Key 后启动：

```bash
cp .env.example .env
# 编辑 .env，填入你的 API Key
node cli.js
```

!!! success "你应该看到"

    完整的终端交互界面（TUI）。试着和它对话，让它帮你写一个文件。观察它是如何自动调用工具的。

    **这就是你在 Lab 4 完成后，由你自己的代码驱动的效果。**

## 任务 4：TypeScript 基础（可选）

如果你不熟悉 TypeScript，完成以下练习：

1. 实现一个函数 `greet(name: string): string`，返回 `"Hello, {name}!"`
2. 定义一个 `interface Message`，包含 `role: string` 和 `content: string`
3. 实现一个 `async` 函数，使用 `fetch` 请求一个 URL 并返回 JSON
4. 使用 `AsyncGenerator`（`async function*`）实现一个倒计时

```bash
npx vitest run labs/lab-00-environment/tests/
```

## 思考题

1. 当你在 Claude Code 中说"帮我写一个 hello.js"时，系统内部发生了什么？尝试画出数据流。
2. 如果 LLM 不知道要用什么工具怎么办？如果调用了一个不存在的工具呢？
3. Agent Loop 什么时候应该终止？列出你能想到的所有情况。
