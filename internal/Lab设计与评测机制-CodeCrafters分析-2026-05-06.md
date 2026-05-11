# CodeCrafters 评测机制分析与 BYOCC 适配方案

> **⚠️ 本文档第二部分（BYOCC 适配方案）已过时，仅保留 CodeCrafters 源码分析作为参考。**
>
> **BYOCC 实际方案**：不使用 Mock LLM 测试。评测方式是**纯代码注入 + 编译 + TUI 体验**：
> - 学习者填写 skeleton → 注入容器 → `build.mjs --lab=N` 编译 → TUI 直接观察 Agent 行为
> - 编译成功 + Agent 在 TUI 中表现正确 = 通过
> - 详见 `internal/Lab设计与评测机制-待决问题-2026-04-30.md`（路线 A 已选定）
>
> **本文档中以下章节已废弃**：
> - "二、BYOCC 适配方案" 整章（Mock LLM Server 设计、双层评测架构等）
> - "四、Mock LLM Server 详细设计" — 不需要
> - "五、每个 Lab 的完整测试用例设计" — Mock LLM 测试场景不适用
> - "六、前端 UX 设计" — 评测 Tab 的具体内容已过时
> - "七、后端 API 设计" — Mock LLM 相关 API 不需要
>
> **仍有参考价值的章节**：
> - "一、CodeCrafters 完整架构分析" — 理解 CodeCrafters 的 Stage 设计思路
> - CodeCrafters 的随机化防作弊、guard rail prompt 设计思路可借鉴
> - Agent Loop（Stage 4）的多步推理测试场景设计有参考价值

> 基于 `codecrafters-io/claude-code-tester` 全量源码分析
> Date: 2026-05-06 | Status: 第一部分有效，第二部分已废弃

---

## 目录

1. [CodeCrafters 完整架构分析](#一codecrafters-完整架构分析)
2. [claude-code-diy Mock LLM 注入确认](#二claude-code-diy-mock-llm-注入确认)
3. [BYOCC 评测架构设计](#三byocc-评测架构设计)
4. [Mock LLM Server 详细设计](#四mock-llm-server-详细设计)
5. [每个 Lab 的完整测试用例设计](#五每个-lab-的完整测试用例设计)
6. [前端 UX 设计](#六前端-ux-设计)
7. [后端 API 设计](#七后端-api-设计)
8. [实现优先级与工作量估算](#八实现优先级与工作量估算)

---

## 一、CodeCrafters 完整架构分析

### 1.1 仓库信息

- **仓库**: `codecrafters-io/claude-code-tester`
- **语言**: Go
- **依赖**: `codecrafters-io/tester-utils` (CodeCrafters 通用测试框架)
- **被测项目**: 学习者的 Python 程序（独立实现，非填空）
- **LLM**: OpenRouter → Claude Haiku 4.5 (真实调用，非 Mock)

### 1.2 Stage 映射（6 Stage）

CodeCrafters 的 `tester_definition.go` 定义了 6 个 Stage：

```go
// 文件: internal/tester_definition.go
var testerDefinition = tester_definition.TesterDefinition{
    ExecutableFileName: "your_program.sh",
    TestCases: []tester_definition.TestCase{
        { Slug: "yy2", TestFunc: testPromptResponse,      Timeout: 30*time.Second },  // Stage 1
        { Slug: "aq1", TestFunc: testAdvertiseReadTool,    Timeout: 30*time.Second },  // Stage 2
        { Slug: "md6", TestFunc: testExecuteReadTool,      Timeout: 30*time.Second },  // Stage 3
        { Slug: "ff2", TestFunc: testAgentLoop,            Timeout: 45*time.Second },  // Stage 4
        { Slug: "oz7", TestFunc: testWriteTool,            Timeout: 45*time.Second },  // Stage 5
        { Slug: "oq5", TestFunc: testBashTool,             Timeout: 45*time.Second },  // Stage 6
    },
}
```

**与 BYOCC Lab 的对应关系**：

| CodeCrafters Stage | Slug | 名称 | BYOCC Lab 对应 | 说明 |
|---|---|---|---|---|
| Stage 1 | yy2 | Communicate with LLM | **Lab 1** | API 调用，获取文本响应 |
| Stage 2 | aq1 | Advertise Read Tool | **Lab 2** | 工具声明（请求中包含 tools） |
| Stage 3 | md6 | Execute Read Tool | **Lab 2** | 工具执行（单轮 read_file） |
| Stage 4 | ff2 | **Agent Loop** | **Lab 3** ★ | while(true) 多轮推理 |
| Stage 5 | oz7 | Write Tool | **Lab 2** | 写文件工具 |
| Stage 6 | oq5 | Bash Tool | **Lab 2** | Bash 命令执行 |

**差异说明**：
- CodeCrafters 把工具能力拆成 5 个独立 Stage（声明→执行→循环→写→bash）
- BYOCC 的 Lab 2 包含所有工具能力，Lab 3 只专注 Agent Loop
- BYOCC 多了 Lab 4（规划+子Agent）和 Lab 5（上下文压缩），CodeCrafters 没有

### 1.3 每个 Stage 的源码级详解

#### Stage 1 (yy2): testPromptResponse — 能否调 LLM

```go
// 文件: internal/stage_test_prompt_response.go
func testPromptResponse(stageHarness) error {
    proxy_server.StartProxyServer(stageHarness)           // ① 启动 API 代理
    settings_manager.InitializeBypassPermissionSettings()  // ② 跳过权限确认
    stageHarness.Executable.TimeoutInMilliseconds = 30000  // ③ 30 秒超时
    workspaceManager.BootstrapExecutableWorkspace()        // ④ 创建临时工作目录

    // ⑤ 随机生成算术题
    operand1 := random.RandomInt(1, 11)     // 1-10 的随机数
    operand2 := random.RandomInt(1, 11)
    operator := random.RandomElementFromArray([]string{"+", "*"})
    result := operand1 + operator + operand2  // 例如 5 + 3 = 8

    // ⑥ 随机选择 prompt 措辞 + guard rail
    prompt := GetPromptWithGuardRailPrompt(
        []string{
            "What is 5+3?",
            "Calculate 5 + 3.",
            "What does 5+3 equal?",
            "Please compute 5 + 3.",
        },
        "Respond with only a number.",
    )
    // 最终 prompt 类似: "What is 5+3? Respond with only a number."

    // ⑦ 运行学习者的程序
    testCase := NonInteractiveTestCase{
        InputPrompt:      prompt,
        ExpectedExitCode: 0,
        StdoutAssertion:  ExactMatchAssertion{ExpectedValue: "8"},
    }
    return testCase.Run(stageHarness)
}
```

**测试逻辑**：
1. 生成随机算术题（1-10 的数，+ 或 ×）
2. 随机选一种措辞（4 种），拼接 guard rail
3. 运行 `./learner_program -p "What is 5+3? Respond with only a number."`
4. 期望：stdout 精确输出 "8"，exit code = 0

**防作弊**：操作数随机(1-10)、运算符随机(+,×)、措辞随机(4种)

#### Stage 2 (aq1): testAdvertiseReadTool — 工具是否被声明

```go
// 文件: internal/stage_test_advertise_read_tool.go
func testAdvertiseReadTool(stageHarness) error {
    // ①-④ 同上
    prompt := GetPromptWithGuardRailPrompt(
        []string{
            "What is the count of tools available to you?",
            "How many tools are available to you?",
            "Count the number of tools available.",
            "Give the number of tools accessible.",
        },
        "Respond with only a number.",
    )
    testCase := NonInteractiveTestCase{
        InputPrompt:      prompt,
        ExpectedExitCode: 0,
        StdoutAssertion:  MinimumValueAssertion{ExpectedMinimumValue: 1},
        // 注意：MinimumValue(1) → 至少声明了 1 个工具
    }
    return testCase.Run(stageHarness)
}
```

**测试逻辑**：
- 不检查工具的具体内容，只检查数量 ≥ 1
- 学习者需要在 API 请求的 `tools` 字段中包含至少一个工具定义
- Agent 调用 LLM 时，LLM 会回答工具数量

**为什么用 MinimumValue 而不是 ExactMatch**：因为不同实现可能声明不同数量的工具

#### Stage 3 (md6): testExecuteReadTool — 能否执行读文件

```go
// 文件: internal/stage_test_execute_read_tool.go
func testExecuteReadTool(stageHarness) error {
    // ①-④ 同上
    fileName := fmt.Sprintf("%s.py", random.RandomWord())  // 随机文件名如 "dragon.py"
    fileContents := random.RandomElementFromArray([]string{
        "print('Hello, World!')",
        "print('Hello, program!')",
        "print('Hello there!')",
    })

    // ⑤ 创建工作区文件
    workspaceManager.MustCreateFilesWithLogger([]WorkspaceFile{
        { RelativePath: fileName, Content: fileContents, FileMode: 0644 },
    })

    // ⑥ 测试 Agent 能否读取文件
    prompt := GetPromptWithGuardRailPrompt(
        []string{
            "What is the content of `dragon.py`?",
            "Read `dragon.py` and return its contents.",
            "Show me what is inside `dragon.py`.",
            "What does `dragon.py` contain?",
        },
        "Respond with only file contents, no surrounding text/backticks.",
    )
    testCase := NonInteractiveTestCase{
        InputPrompt:      prompt,
        ExpectedExitCode: 0,
        StdoutAssertion:  ExactMatchAssertion{ExpectedValue: fileContents},
    }
    return testCase.Run(stageHarness)
}
```

**测试逻辑**：
1. 创建一个随机文件名.py，内容从 3 个选项中随机选
2. 让 Agent 读取该文件
3. 期望 stdout 精确输出文件内容

**多步推理链**（隐含 Agent Loop 能力）：
```
Agent 收到 "Read dragon.py"
→ Agent 调用 LLM
→ LLM 返回 tool_call: read_file({path: "dragon.py"})
→ Agent 执行 read_file → 得到 "print('Hello, World!')"
→ Agent 调用 LLM（把工具结果传回）
→ LLM 返回 "print('Hello, World!')"
→ Agent 输出到 stdout
```

#### Stage 4 (ff2): testAgentLoop ★ — 多步推理

```go
// 文件: internal/stage_test_agent_loop.go
func testAgentLoop(stageHarness) error {
    proxy_server.StartProxyServer(stageHarness)
    settings_manager.InitializeBypassPermissionSettings(stageHarness)
    stageHarness.Executable.TimeoutInMilliseconds = 45000  // 45 秒超时（更长！）

    workspaceManager.BootstrapExecutableWorkspace(stageHarness)

    // ⑤ 随机文件名
    mainFileName := random.RandomElementFromArray([]string{"main.py", "init.py", "start.py"})
    extraFileName := random.RandomElementFromArray(
        []string{"chemical", "substance", "expiry", "duration"},
    ) + ".py"
    chemicalExpiryPeriod := random.RandomInt(6, 36)  // 6-36 个月的随机值

    // ⑥ 创建工作区（3 个文件）
    readmeContent := `This is a simple python project.
- The starting point of this project is app/{mainFileName}.
- The file app/{extraFileName} contains chemical properties.`

    workspaceManager.MustCreateFilesWithLogger([]WorkspaceFile{
        { RelativePath: "README.md",       Content: readmeContent },
        { RelativePath: "app/{extraFileName}", Content: "chemical_expiry_period = {N}  # months" },
        { RelativePath: "app/{mainFileName}",  Content: "from {extra} import ...\ndef main()..." },
    })

    // ⑦ 测试多步推理
    prompt := GetPromptWithGuardRailPrompt(
        []string{
            "Use README.md to determine the chemical expiry period in months.",
            "Find the chemical expiry period in months from README.md.",
            "Determine in how many months the chemical expires by reading README.md.",
        },
        "Respond with only a number.",
    )
    testCase := NonInteractiveTestCase{
        InputPrompt:      prompt,
        ExpectedExitCode: 0,
        StdoutAssertion:  ExactMatchAssertion{ExpectedValue: "{N}"},
    }
    return testCase.Run(stageHarness)
}
```

**完整推理链**（3 步）：
```
Step 1: Agent 读 README.md
  → "The starting point is app/start.py. The file app/substance.py contains chemical properties."

Step 2: Agent 读 app/substance.py
  → "chemical_expiry_period = 17  # months"

Step 3: Agent 回答
  → stdout: "17"
```

**为什么这是核心测试**：
- 需要 Agent Loop（while(true)）才能完成
- 第 1 轮：LLM 返回 tool_call(read_file, {path: "README.md"})
- 第 2 轮：LLM 根据 README 内容，返回 tool_call(read_file, {path: "app/substance.py"})
- 第 3 轮：LLM 根据文件内容，返回文本 "17"
- 每一轮都需要：调 LLM → 解析响应 → 执行工具 → 把结果喂回 LLM → 重复

**随机化要素（4 层防作弊）**：
1. 主文件名：main.py / init.py / start.py（3 选 1）
2. 额外文件名：chemical / substance / expiry / duration（4 选 1）
3. 过期月数：6-36（31 个可能值）
4. prompt 措辞：3 种变体

#### Stage 5 (oz7): testWriteTool — 能否写文件

```go
// 文件: internal/stage_test_write_tool.go
func testWriteTool(stageHarness) error {
    // ... 同样的 proxy + settings 初始化
    stageHarness.Executable.TimeoutInMilliseconds = 45000  // 45 秒
    mainFileName := random.RandomElementFromArray([]string{"main.py", "start.py", "init.py"})

    // README 告诉 Agent 要创建什么文件
    readmeContent := `This is a very simple python project.
This should print "Hello world"
This project should contain only one file: app/{mainFileName}.`

    // 运行测试
    testCase := NonInteractiveTestCase{
        InputPrompt: GetPromptWithGuardRailPrompt(
            []string{
                "Read README.md and create the required file.",
                "From README.md, create the indicated file.",
                "Check README.md and create the file it specifies.",
                "Use README.md to create the file needed.",
            },
            "File should have 1 line.",
        ),
        ExpectedExitCode: 0,
        // 注意：没有 StdoutAssertion！
    }
    testCase.Run(stageHarness)

    // 关键：检查文件系统，不是检查 stdout
    return filesystem_assertion.FileContentsAssertion{
        ExpectedContents: `print("Hello world")`,
    }.Run("app/{mainFileName}")
}
```

**测试逻辑**：
1. Agent 读 README → 发现需要创建 app/main.py
2. Agent 调用 write_file("app/main.py", "print(\"Hello world\")")
3. **断言在文件系统上**，不在 stdout 上

**推理链**：
```
Step 1: Agent 读 README.md
  → "This should print 'Hello world'. File: app/main.py"
Step 2: Agent 写文件 write_file("app/main.py", 'print("Hello world")')
Step 3: 检查文件系统 app/main.py 的内容是否精确匹配
```

#### Stage 6 (oq5): testBashTool — 能否执行 Bash

```go
// 文件: internal/stage_test_bash_tool.go
func testBashTool(stageHarness) error {
    // ... 初始化
    // 创建 3 个文件
    workspaceManager.MustCreateFilesWithLogger([]WorkspaceFile{
        { RelativePath: "app/main.js",  Content: "async function main() { ... }" },
        { RelativePath: "README.md",    Content: "# My Project\n..." },
        { RelativePath: "README_old.md", Content: "# My project\n..." },  // 要被删的文件
    })

    testCase := NonInteractiveTestCase{
        InputPrompt: GetPromptWithGuardRailPrompt(
            []string{
                "List files using ls and delete the old readme file you find.",
                "List project files with ls and remove the old readme file you find.",
            },
            "",
        ),
        ExpectedExitCode: 0,
    }
    testCase.Run(stageHarness)

    // 三个文件系统断言
    // 1. app/main.js 没被改
    fileContents("app/main.js") == 原内容
    // 2. README.md 没被改
    fileContents("README.md") == 原内容
    // 3. README_old.md 已被删除
    fileDoesNotExist("README_old.md")
}
```

**推理链**：
```
Step 1: Agent 执行 bash_command("ls")
  → 看到 app/, README.md, README_old.md
Step 2: Agent 执行 bash_command("rm README_old.md")
  → 删除成功
Step 3: 检查文件系统
```

### 1.4 Proxy Server 架构（核心安全层）

```
学习者程序
    │
    │ HTTP POST
    ↓
localhost:10000 (Proxy Server)
    │
    ├── EndpointValidator (白名单)
    │   ✅ /api/v1/chat/completions   (OpenAI 格式)
    │   ✅ /api/v1/responses           (OpenAI Responses)
    │   ✅ /api/v1/messages            (Anthropic 格式)
    │   ❌ 其他 → 返回 404
    │
    ├── ModelValidator (模型限制)
    │   检查 request.body.model
    │   只允许 anthropic/claude-haiku-4.5
    │   其他 → 返回 400 "X is not supported"
    │
    └── API Key 注入
        替换 Authorization: Bearer {dummy} → Bearer {real_key}
        │
        ↓
    openrouter.ai/api/v1/...
        │
        ↓
    Claude Haiku 4.5
```

**源码**：
```go
// proxy_server/proxy_server.go
func newProxyServer() *proxyServer {
    targetUrl, _ := url.Parse("https://openrouter.ai")
    apiKey := mustGetOpenrouterApiKey()

    reverseProxy := httputil.NewSingleHostReverseProxy(targetUrl)
    reverseProxy.Rewrite = func(req *httputil.ProxyRequest) {
        req.SetURL(targetUrl)
        req.Out.Header.Set("Authorization", "Bearer " + apiKey)  // 注入真实 key
    }

    validator := &validationMiddleware{}
    validator.setEndPointsWithValidators(map[string][]ValidationFunc{
        "/api/v1/chat/completions": {modelValidator},
        "/api/v1/responses":        {modelValidator},
        "/api/v1/messages":         {modelValidator},
    })

    return &proxyServer{server: &http.Server{
        Addr:    "localhost:" + proxyListeningPort,
        Handler: validator.WrapProxy(reverseProxy),
    }}
}
```

```go
// proxy_server/model_validator.go
func modelValidator(r *http.Request) (ok bool, errorMessage string) {
    var requestBody requestBody  // { model: string }
    json.Unmarshal(bodyBytes, &requestBody)

    if !strings.HasPrefix(requestBody.Model, "anthropic/claude-haiku") {
        return false, fmt.Sprintf("%s is not supported. Allowed: anthropic/claude-haiku-4.5", requestBody.Model)
    }
    return true, ""
}
```

```go
// proxy_server/validator.go
func (v *validationMiddleware) validateRequest(r *http.Request) *validationError {
    endpoint := r.URL.Path
    validators, ok := v.endpointAndValidators[endpoint]
    if !ok {
        return &validationError{StatusCode: 404, errorMessage: "Endpoint not found: " + endpoint}
    }
    // 运行所有 validator...
}
```

### 1.5 NonInteractiveTestCase（测试执行器）

```go
// internal/test_cases/non_interactive_test_case.go
type NonInteractiveTestCase struct {
    InputPrompt      string
    StdoutAssertion  StringAssertion    // 可选
    ExpectedExitCode int
}

func (t *NonInteractiveTestCase) Run(stageHarness) error {
    // 1. 运行学习者的程序
    //    实际执行: ./your_program.sh -p "What is 5+3? Respond with only a number."
    result, err := executable.Run("-p", t.InputPrompt)

    // 2. 检查退出码
    if result.ExitCode != t.ExpectedExitCode {
        return fmt.Errorf("Expected exit code %d, got %d", t.ExpectedExitCode, result.ExitCode)
    }

    // 3. 去除尾部空白后检查 stdout
    stdout := strings.TrimRightFunc(string(result.Stdout), unicode.IsSpace)
    return t.StdoutAssertion.Run(stdout, logger)
}
```

**关键**：`executable.Run("-p", prompt)` 就是把学习者的程序当命令行工具跑。

### 1.6 断言系统

```go
// String Assertions (检查 stdout)
type ExactMatchAssertion struct {
    ExpectedValue string  // stdout 必须精确匹配
}
type MinimumValueAssertion struct {
    ExpectedMinimumValue int  // stdout 解析为数字，必须 ≥ 此值
}

// Filesystem Assertions (检查文件系统)
type FileContentsAssertion struct {
    ExpectedContents string  // 文件内容必须精确匹配
}
type FileDoesNotExistAssertion struct{}  // 文件不能存在
```

### 1.7 随机化防作弊

```go
// internal/utils/utils.go
func GetPromptWithGuardRailPrompt(promptChoices []string, guardRailPrompt string) string {
    prompt := random.RandomElementFromArray(promptChoices)  // 随机选一个
    if guardRailPrompt != "" {
        guardRailPrompt = " " + guardRailPrompt
    }
    return fmt.Sprintf("%s%s", prompt, guardRailPrompt)
}
```

随机种子通过 `CODECRAFTERS_RANDOM_SEED` 环境变量控制，确保测试可复现。

### 1.8 测试场景矩阵（stages_test.go）

```go
testCases := map[string]TesterOutputTestCase{
    "base_stages_pass_all":               {所有 Stage 通过},
    "base_stages_stage_1_fail":           {Stage 1 失败},
    "base_stages_users_code_pass_all":    {用户代码全部通过},
    "base_stages_wrong_model_usage":      {使用了不允许的模型 → 失败},
    "base_stages_unauthorized_endpoint":  {访问了不允许的端点 → 失败},
    "base_stages_responses_api_pass":     {使用 Responses API → 通过},
}
```

### 1.9 完整通过方案（CodeCrafters 学习者的参考实现）

```python
# 文件: internal/test_helpers/scenarios/base_stages/users_code_pass_all/app/main.py
# 总计 ~120 行 Python，实现了完整的 Agent

import argparse, json, os, subprocess
from openai import OpenAI

def read_file(path):
    with open(path, "r") as f:
        return f.read()

def write_file(path, content):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    return "OK"

def bash_command(command):
    proc = subprocess.run(command, shell=True, capture_output=True, text=True)
    return json.dumps({"returncode": proc.returncode, "stdout": proc.stdout, "stderr": proc.stderr})

# 3 个工具定义（OpenAI function calling 格式）
TOOLS = [
    { "type": "function", "function": { "name": "read",
      "description": "Read the contents of a file",
      "parameters": { "type": "object", "properties": { "path": { "type": "string" } }, "required": ["path"] } } },
    { "type": "function", "function": { "name": "write", ... } },
    { "type": "function", "function": { "name": "bash_command", ... } },
]

def run_agent(client, user_prompt):
    messages = [{"role": "user", "content": user_prompt}]
    while True:  # ← Agent Loop 核心
        resp = client.chat.completions.create(
            model="anthropic/claude-haiku-4.5",
            messages=messages,
            tools=TOOLS,
        )
        msg = resp.choices[0].message
        if not msg.tool_calls:  # 没有工具调用 → 最终答案
            return msg.content
        messages.append(msg)
        for tool_call in msg.tool_calls:  # 执行所有工具调用
            result = execute_tool(tool_call)
            messages.append({"role": "tool", "tool_call_id": tool_call.id, "content": result})

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("-p", required=True)  # -p 接收 prompt
    args = parser.parse_args()

    client = OpenAI(
        api_key=os.getenv("OPENROUTER_API_KEY"),     # Proxy 注入的真实 key
        base_url=os.getenv("OPENROUTER_BASE_URL"),    # http://localhost:10000/api/v1
    )
    output = run_agent(client, args.p)
    print(output)  # 最终输出到 stdout
```

---

## 二、claude-code-diy Mock LLM 注入确认

### 2.1 环境变量确认

通过阅读 claude-code-diy 源码（`D:\test-claude-code\claude-code\src\`），确认以下注入点：

| 环境变量 | 作用 | 确认源文件 | 行号 |
|----------|------|-----------|------|
| `ANTHROPIC_BASE_URL` | 覆盖 API 基础 URL | `utils/model/providers.ts` | 26 |
| `ANTHROPIC_API_KEY` | API 密钥 | `utils/auth.ts` | 全文多处 |
| `CLAUDE_CODE_SIMPLE` | 启用 bare 模式（= `--bare`）| `utils/envUtils.ts` | 60-64 |

**关键源码**：

```typescript
// src/utils/model/providers.ts (line 25-28)
export function isFirstPartyAnthropicBaseUrl(): boolean {
  const baseUrl = process.env.ANTHROPIC_BASE_URL
  if (!baseUrl) {
    return true  // 未设置 → 默认 api.anthropic.com
  }
  // ... 检查是否指向 api.anthropic.com 或 api-staging.anthropic.com
}
```

```typescript
// src/utils/envUtils.ts (line 50-65)
// --bare / CLAUDE_CODE_SIMPLE — skip hooks, LSP, plugin sync, skill dir-walk,
// attribution, background prefetches, and ALL keychain/credential reads.
// Auth is strictly ANTHROPIC_API_KEY env or apiKeyHelper from --settings.
export function isBareMode(): boolean {
  return (
    isEnvTruthy(process.env.CLAUDE_CODE_SIMPLE) ||
    process.argv.includes('--bare')
  )
}
```

```typescript
// src/services/api/client.ts (line 301-313)
const clientConfig: ConstructorParameters<typeof Anthropic>[0] = {
    apiKey: isClaudeAISubscriber() ? null : apiKey || getAnthropicApiKey(),
    authToken: isClaudeAISubscriber() ? getClaudeAIOAuthTokens()?.accessToken : undefined,
    // baseURL 仅在 staging OAuth 时显式设置
    // 其他情况下 Anthropic SDK 自动读取 ANTHROPIC_BASE_URL 环境变量
    ...(process.env.USER_TYPE === 'ant' && isEnvTruthy(process.env.USE_STAGING_OAUTH)
      ? { baseURL: getOauthConfig().BASE_API_URL }
      : {}),
    ...ARGS,
}
```

### 2.2 CLI 参数确认

| CLI 参数 | 作用 | 确认源文件 |
|----------|------|-----------|
| `-p` / `--print` | 非交互模式，接收 prompt 后输出结果退出 | `cli/print.ts` 全文 |
| `--bare` | 跳过 hooks/LSP/plugins/prefetch，只认 `ANTHROPIC_API_KEY` | `utils/envUtils.ts:60` |
| `--model <name>` | 覆盖模型 | `entrypoints/cli.tsx:62-63` |
| `--settings <path>` | 指定 settings 文件 | `utils/cliArgs.ts` |

### 2.3 API 格式

claude-code-diy 使用 **Anthropic SDK**（不是 OpenAI SDK），因此 API 格式是：

**Anthropic Messages API**:
```
POST {ANTHROPIC_BASE_URL}/v1/messages
Headers: x-api-key: {ANTHROPIC_API_KEY}, anthropic-version: 2023-06-01, content-type: application/json

Request:
{
  "model": "claude-haiku-4-5-20251001",
  "max_tokens": 8096,
  "system": "You are a helpful coding assistant...",
  "messages": [
    {"role": "user", "content": "Read config.json"}
  ],
  "tools": [
    {
      "name": "read_file",
      "description": "Read a file",
      "input_schema": {
        "type": "object",
        "properties": {"path": {"type": "string"}},
        "required": ["path"]
      }
    }
  ]
}

Response (文本):
{
  "id": "msg_xxx",
  "type": "message",
  "role": "assistant",
  "content": [{"type": "text", "text": "The port is 8080"}],
  "stop_reason": "end_turn",
  "model": "claude-haiku-4-5-20251001",
  "usage": {"input_tokens": 100, "output_tokens": 10}
}

Response (工具调用):
{
  "id": "msg_xxx",
  "type": "message",
  "role": "assistant",
  "content": [
    {"type": "tool_use", "id": "toolu_xxx", "name": "read_file", "input": {"path": "config.json"}}
  ],
  "stop_reason": "tool_use",
  ...
}
```

**与 CodeCrafters 的关键差异**：
| 维度 | CodeCrafters | BYOCC |
|------|-------------|-------|
| SDK | OpenAI (Python) | Anthropic (TypeScript) |
| API 格式 | `/v1/chat/completions` (OpenAI) | `/v1/messages` (Anthropic) |
| 工具定义字段 | `function.parameters` | `input_schema` |
| 工具调用字段 | `tool_calls[].function.name/arguments` | `content[].name/input` |
| 工具结果 | `{role: "tool", tool_call_id, content}` | `{role: "user", content: [{type: "tool_result", tool_use_id, content}]}` |

### 2.4 BYOCC 测试调用的完整命令

```bash
# 在 Docker 容器内执行
ANTHROPIC_BASE_URL=http://localhost:9999 \
ANTHROPIC_API_KEY=mock-key-00000000000000000000000000000000 \
node /app/cli.js \
  -p "Use README.md to determine the chemical expiry period in months. Respond with only a number." \
  --bare \
  --model claude-haiku-4-5-20251001
```

**为什么用 `--bare`**：
- 跳过所有 hooks（不会触发 pre/post tool hooks）
- 跳过 LSP（不会启动 TypeScript 语言服务器）
- 跳过 plugin sync（不会尝试安装/更新插件）
- 跳过 keychain（不会尝试读取系统密钥链）
- 只认 `ANTHROPIC_API_KEY` 环境变量（完美匹配我们的 Mock 场景）
- 去掉这些开销后，测试速度更快、行为更可控

---

## 三、BYOCC 评测架构设计

### 3.1 双层评测总览

```
┌──────────────────────────────────────────────────────────────┐
│                    BYOCC 评测系统                              │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Level 2: 结构化测试 (Mock LLM)                           │ │
│  │                                                          │ │
│  │  触发: 前端「运行测试」按钮                                │ │
│  │  成本: 零 (Mock LLM，不调真实 API)                        │ │
│  │  速度: 5-15 秒 (主要是编译时间)                           │ │
│  │  确定性: 100% (相同输入 → 相同输出)                       │ │
│  │  位置: 终端区 [评测] Tab                                  │ │
│  │                                                          │ │
│  │  流程:                                                    │ │
│  │  1. 前端将学习者代码发送到后端                             │ │
│  │  2. 后端将代码注入 Docker 容器                            │ │
│  │  3. 容器内执行: build.mjs --lab=N                        │ │
│  │  4. 容器内启动: Mock LLM Server (localhost:9999)         │ │
│  │  5. 容器内执行: node cli.js -p "test" --bare \           │ │
│  │       ANTHROPIC_BASE_URL=http://localhost:9999            │ │
│  │  6. 收集 stdout + exit code + filesystem diff            │ │
│  │  7. 执行断言 (exact_match / contains / file_contents)    │ │
│  │  8. 返回 pass/fail 列表到前端                             │ │
│  └─────────────────────────────────────────────────────────┘ │
│                          ↓                                    │
│                  全部通过后解锁                                │
│                          ↓                                    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Level 3: TUI 体验 (真实 LLM)                              │ │
│  │                                                          │ │
│  │  触发: 前端「提交到容器」按钮                              │ │
│  │  成本: DeepSeek API (~¥0.01/次)                          │ │
│  │  速度: 实时流式输出                                       │ │
│  │  确定性: 低 (LLM 有随机性)                                │ │
│  │  位置: 终端区 [终端] Tab (ttyd)                           │ │
│  │                                                          │ │
│  │  流程:                                                    │ │
│  │  1. 代码已在 Level 2 验证可编译                           │ │
│  │  2. 容器内 ttyd 启动 node cli.js                         │ │
│  │  3. 学习者在 TUI 中输入消息                               │ │
│  │  4. Agent 使用真实 LLM 执行任务                           │ │
│  │  5. 学习者看到自己的代码驱动 Agent 多轮调用工具           │ │
│  │  6. → WOW 时刻!                                          │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 为什么 Level 2 用 Mock LLM 而不是真实 LLM

| 维度 | Mock LLM (BYOCC Level 2) | Real LLM (CodeCrafters) |
|------|--------------------------|-------------------------|
| 成本 | **零** | ~$0.001/次 × N 个 test case × M 次重试 |
| 确定性 | **100%**（相同输入 → 相同输出） | 有随机性（同一个 prompt 可能得到不同答案）|
| 速度 | **< 1s**（无网络延迟） | 5-45s（含 LLM 推理时间）|
| 离线 | **可以** | 不可以 |
| 并发 | **无限制** | API rate limit |
| 适合场景 | 验证代码结构正确性 | 验证 LLM 集成正确性 |

**核心逻辑**：Level 2 测的是"你写的代码逻辑对不对"（能不能解析 API 响应？能不能执行工具？能不能循环？），不是"网络通不通"。真实 LLM 集成在 Level 3 完成。

### 3.3 与 CodeCrafters 的架构对比

```
CodeCrafters:
  学习者代码 (Python) → 直接运行 → 真实 LLM (OpenRouter → Claude Haiku) → 检查 stdout

BYOCC:
  学习者代码 (TypeScript skeleton) → build.mjs --lab=N 编译 → Mock LLM → 检查 stdout
  编译后的代码 → ttyd 启动 → 真实 LLM (DeepSeek) → TUI 体验
```

---

## 四、Mock LLM Server 详细设计

### 4.1 接口规格

Mock LLM Server 需要**兼容 Anthropic Messages API**：

```
POST http://localhost:9999/v1/messages
Headers:
  x-api-key: mock-key-00000000000000000000000000000000
  anthropic-version: 2023-06-01
  content-type: application/json

Response: 标准 Anthropic Messages API 格式
```

### 4.2 TypeScript 实现骨架

```typescript
// mock-llm-server.ts — 容器内运行，监听 9999 端口

import { createServer } from 'http'

interface MockStep {
  type: 'text' | 'tool_use'
  // 文本响应
  text?: string
  // 工具调用响应
  tool_name?: string
  tool_input?: Record<string, unknown>
}

interface MockScenario {
  // 每被调用一次，pop 下一个 step
  steps: MockStep[]
  stepIndex: number
}

// 场景注册表：按 Lab 和 test case name 索引
const scenarios: Record<string, MockScenario> = {
  'lab1_basic_call': {
    steps: [
      { type: 'text', text: 'BYOCC_TEST_PASS' }
    ],
    stepIndex: 0,
  },
  'lab2_read_file': {
    steps: [
      { type: 'tool_use', tool_name: 'read_file', tool_input: { path: 'test.txt' } },
      { type: 'text', text: '42' }
    ],
    stepIndex: 0,
  },
  'lab3_agent_loop': {
    steps: [
      { type: 'tool_use', tool_name: 'read_file', tool_input: { path: 'README.md' } },
      { type: 'tool_use', tool_name: 'read_file', tool_input: { path: 'config/settings.json' } },
      { type: 'text', text: '8080' }
    ],
    stepIndex: 0,
  },
}

// 当前激活的场景
let activeScenario: string | null = null

function handleMessagesAPI(body: any) {
  const scenario = scenarios[activeScenario!]
  const step = scenario.steps[scenario.stepIndex]
  scenario.stepIndex++

  if (step.type === 'text') {
    return {
      id: `msg_mock_${Date.now()}`,
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: step.text }],
      model: body.model || 'claude-haiku-4-5-20251001',
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50 },
    }
  }

  if (step.type === 'tool_use') {
    return {
      id: `msg_mock_${Date.now()}`,
      type: 'message',
      role: 'assistant',
      content: [{
        type: 'tool_use',
        id: `toolu_mock_${Date.now()}`,
        name: step.tool_name,
        input: step.tool_input,
      }],
      model: body.model || 'claude-haiku-4-5-20251001',
      stop_reason: 'tool_use',
      usage: { input_tokens: 100, output_tokens: 50 },
    }
  }
}

// HTTP Server
const server = createServer((req, res) => {
  // 控制接口: POST /mock/set-scenario { scenario: "lab3_agent_loop" }
  if (req.url === '/mock/set-scenario') {
    let body = ''
    req.on('data', c => body += c)
    req.on('end', () => {
      const { scenario } = JSON.parse(body)
      activeScenario = scenario
      scenarios[scenario].stepIndex = 0  // 重置 step index
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
    })
    return
  }

  // Mock API: POST /v1/messages
  if (req.url === '/v1/messages' && req.method === 'POST') {
    let body = ''
    req.on('data', c => body += c)
    req.on('end', () => {
      const parsed = JSON.parse(body)
      const response = handleMessagesAPI(parsed)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(response))
    })
    return
  }

  res.writeHead(404)
  res.end('Not found')
})

server.listen(9999, () => {
  console.log('Mock LLM Server listening on :9999')
})
```

### 4.3 工具结果注入

当 claude-code-diy 收到 `tool_use` 响应后，会执行工具并把结果通过 `tool_result` 消息发回。Mock Server 的下一步响应需要感知当前是第几轮调用。

**关键**：claude-code-diy 的 Agent Loop 会自动处理工具执行和结果回传。Mock Server 不需要关心工具结果的内容——它只需要按顺序返回预定义的响应序列。

---

## 五、每个 Lab 的完整测试用例设计

### Lab 0 (环境+体验): 无结构化测试

**说明**: Lab 0 的目的是让学习者安装运行完整 Claude Code，体验最终效果。

- 无 Level 2 测试
- 直接进入 Level 3 TUI 体验
- 通过条件：`node cli.js` 成功启动

### Lab 1 (API 调用): 1 个测试

**学习者实现**: 调用 LLM API，获取文本响应

```typescript
{
  name: "basic_llm_call",
  description: "验证能调 LLM 并将响应输出到 stdout",
  prompt: "Say exactly these words: BYOCC_TEST_PASS",
  mockScenario: {
    steps: [
      { type: 'text', text: 'BYOCC_TEST_PASS' }
    ]
  },
  workspace: {},
  assertions: [
    { type: 'exact_match', expected: 'BYOCC_TEST_PASS' }
  ]
}
```

**推理链**：
```
Agent 收到 "Say exactly: BYOCC_TEST_PASS"
→ 调用 LLM（请求到达 Mock Server）
→ Mock 返回 "BYOCC_TEST_PASS"
→ Agent 输出到 stdout
→ 断言: stdout === "BYOCC_TEST_PASS"
```

### Lab 2 (工具系统): 3 个测试

**学习者实现**: 工具注册 + 单轮执行

**Test 1: tool_advertised** — 验证请求中包含工具定义
```typescript
{
  name: "tool_advertised",
  description: "验证 API 请求中包含至少 1 个工具定义",
  prompt: "Read the file hello.txt",
  // 注意：这个测试需要 Mock Server 检查请求中的 tools 字段
  // 而不是检查 stdout
  mockScenario: {
    steps: [
      { type: 'tool_use', tool_name: 'read_file', tool_input: { path: 'hello.txt' } },
      { type: 'text', text: 'hello world' }
    ],
    validateRequest: (req) => {
      if (!req.tools || req.tools.length === 0) {
        throw new Error("No tools in API request")
      }
    }
  },
  workspace: { "hello.txt": "hello world" },
  assertions: [
    { type: 'contains', expected: 'hello world' }
  ]
}
```

**Test 2: execute_read_tool** — 验证能读取文件
```typescript
{
  name: "execute_read_tool",
  description: "验证能通过工具调用读取文件内容",
  prompt: "What is the secret number in data.txt?",
  mockScenario: {
    steps: [
      { type: 'tool_use', tool_name: 'read_file', tool_input: { path: 'data.txt' } },
      { type: 'text', text: '42' }
    ]
  },
  workspace: { "data.txt": "secret number: 42" },
  assertions: [
    { type: 'exact_match', expected: '42' }
  ]
}
```

**Test 3: execute_write_tool** — 验证能写文件
```typescript
{
  name: "execute_write_tool",
  description: "验证能通过工具调用写文件",
  prompt: "Create a file called output.txt with the content 'hello world'",
  mockScenario: {
    steps: [
      { type: 'tool_use', tool_name: 'write_file', tool_input: { path: 'output.txt', content: 'hello world' } },
      { type: 'text', text: 'File created successfully' }
    ]
  },
  workspace: {},
  assertions: [
    { type: 'file_contents', path: 'output.txt', expected: 'hello world' }
  ]
}
```

### Lab 3 (Agent Loop) ★: 3 个测试

**学习者实现**: while(true) Agent Loop

**Test 1: multi_step_read_chain** — 多步推理（对标 CodeCrafters Stage 4）
```typescript
{
  name: "multi_step_read_chain",
  description: "验证 Agent 能多步推理：读 README → 找到文件 → 读文件 → 回答",
  prompt: "What port is the server configured to use?",
  mockScenario: {
    steps: [
      // 第 1 轮: Agent 请求读 README
      { type: 'tool_use', tool_name: 'read_file', tool_input: { path: 'README.md' } },
      // 第 2 轮: Agent 请求读 config 文件
      { type: 'tool_use', tool_name: 'read_file', tool_input: { path: 'config/settings.json' } },
      // 第 3 轮: Agent 回答
      { type: 'text', text: '8080' }
    ]
  },
  workspace: {
    "README.md": "Server configuration is in config/settings.json",
    "config/settings.json": '{"port": 8080, "host": "localhost"}'
  },
  assertions: [
    { type: 'exact_match', expected: '8080' }
  ]
}
```

**完整推理链**：
```
Round 1:
  Agent → LLM: "What port is the server configured to use?"
  LLM → Agent: tool_use(read_file, {path: "README.md"})
  Agent 执行 read_file("README.md") → "Server configuration is in config/settings.json"

Round 2:
  Agent → LLM: [tool_result] "Server configuration is in config/settings.json"
  LLM → Agent: tool_use(read_file, {path: "config/settings.json"})
  Agent 执行 read_file("config/settings.json") → '{"port": 8080, "host": "localhost"}'

Round 3:
  Agent → LLM: [tool_result] '{"port": 8080, "host": "localhost"}'
  LLM → Agent: "8080"

Agent 输出 stdout: "8080"
断言: stdout === "8080" ✅
```

**Test 2: read_then_write** — 先读后写
```typescript
{
  name: "read_then_write",
  description: "验证 Agent 能先读取再写入（跨工具类型的多步操作）",
  prompt: "Read the file data.txt and create a backup file data_backup.txt with the same contents",
  mockScenario: {
    steps: [
      { type: 'tool_use', tool_name: 'read_file', tool_input: { path: 'data.txt' } },
      { type: 'tool_use', tool_name: 'write_file', tool_input: { path: 'data_backup.txt', content: 'important data' } },
      { type: 'text', text: 'Backup created successfully' }
    ]
  },
  workspace: { "data.txt": "important data" },
  assertions: [
    { type: 'file_contents', path: 'data_backup.txt', expected: 'important data' }
  ]
}
```

**Test 3: randomized_agent_loop** — 随机化防作弊（对标 CodeCrafters）
```typescript
{
  name: "randomized_agent_loop",
  description: "验证 Agent Loop 的通用能力（随机化测试）",
  // prompt 和 workspace 由测试运行器动态生成
  promptGenerator: () => {
    const secretFile = randomFrom(["secret.txt", "hidden.txt", "key.txt"])
    const secretValue = randomInt(1, 100)
    return {
      prompt: `Find the secret number in ${secretFile} and tell me what it is. Respond with only the number.`,
      workspace: {
        "README.md": `The secret is stored in ${secretFile}`,
        [secretFile]: `secret_number = ${secretValue}`
      },
      expectedOutput: String(secretValue)
    }
  },
  mockScenario: {
    // 动态场景：根据实际请求中的文件路径返回内容
    steps: 'dynamic',
    dynamicHandler: (request, round) => {
      // round 0: 返回读 README 的 tool_call
      // round 1: 返回读 secretFile 的 tool_call（根据 round 0 的工具结果推断文件名）
      // round 2: 返回文本（数字）
    }
  },
  assertions: 'dynamic'  // exact_match 动态生成的数字
}
```

### Lab 4 (规划+子Agent): 2 个测试

**学习者实现**: TodoWrite + 任务拆分

**Test 1: plan_and_execute**
```typescript
{
  name: "plan_and_execute",
  description: "验证 Agent 能规划并执行多个任务",
  prompt: "Read tasks.txt and complete all tasks listed there",
  mockScenario: {
    steps: [
      { type: 'tool_use', tool_name: 'read_file', tool_input: { path: 'tasks.txt' } },
      { type: 'tool_use', tool_name: 'write_file', tool_input: { path: 'hello.txt', content: 'world' } },
      { type: 'tool_use', tool_name: 'write_file', tool_input: { path: 'bye.txt', content: 'moon' } },
      { type: 'text', text: 'All tasks completed' }
    ]
  },
  workspace: {
    "tasks.txt": "Task 1: Create hello.txt with 'world'\nTask 2: Create bye.txt with 'moon'"
  },
  assertions: [
    { type: 'file_contents', path: 'hello.txt', expected: 'world' },
    { type: 'file_contents', path: 'bye.txt', expected: 'moon' }
  ]
}
```

### Lab 5 (上下文压缩): 1 个测试

**学习者实现**: 三层压缩策略

```typescript
{
  name: "long_conversation",
  description: "验证 Agent 在多轮对话中保持记忆",
  prompt: "Remember these: A=1, B=2, C=3, D=4, E=5. After remembering, tell me the sum of A and E.",
  mockScenario: {
    steps: [
      { type: 'text', text: '6' }
    ]
  },
  workspace: {},
  assertions: [
    { type: 'exact_match', expected: '6' }
  ]
}
```

---

## 六、前端 UX 设计

### 6.1 终端区 Tab 切换

```
┌──────────────────────────────────────────────────────┐
│ [终端]  [评测]                         ← Tab 切换     │
├──────────────────────────────────────────────────────┤
│                                                       │
│  [评测] Tab 内容:                                     │
│                                                       │
│  Lab 3: Agent Loop                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                       │
│  ✅ Test 1: multi_step_read_chain           PASS  3s  │
│  ✅ Test 2: read_then_write                 PASS  4s  │
│  ❌ Test 3: randomized_agent_loop           FAIL  5s  │
│                                                       │
│  ┌─ Test 3 详细 ──────────────────────────────────┐  │
│  │ Expected stdout to be exactly "17"              │  │
│  │ Got: "The secret number is 17"                  │  │
│  │                                                 │  │
│  │ Hint: 检查你的 Agent 是否正确输出了 LLM 的最终  │  │
│  │ 响应，而不是额外的包装文字。                     │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  [重新运行测试]          [提交到容器 →]  ← 仅全通过后  │
│                                                       │
└──────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────┐
│ [终端]  [评测]                         ← Tab 切换     │
├──────────────────────────────────────────────────────┤
│                                                       │
│  [终端] Tab 内容 (ttyd xterm.js):                     │
│                                                       │
│  $ 输入消息开始对话...                                 │
│  > 你好，请帮我读一下 README.md                        │
│                                                       │
│  [Agent 正在思考...]                                  │
│  📖 读取 README.md                                    │
│  [Agent 正在思考...]                                  │
│  ✏️ 写入 summary.txt                                  │
│                                                       │
│  完成！我已经读取了 README.md 并创建了摘要。          │
│                                                       │
│  > _                                                  │
└──────────────────────────────────────────────────────┘
```

---

## 七、后端 API 设计

### 7.1 运行测试 API

```
POST /api/labs/:labId/run-tests

Request:
{
  "files": {
    "src/services/agent/query-lab3.ts": "export async function query(...) { /* 学习者的代码 */ }"
  }
}

Response:
{
  "results": [
    {
      "name": "multi_step_read_chain",
      "status": "pass",
      "duration_ms": 3200,
      "assertionResults": [
        { "type": "exact_match", "expected": "8080", "actual": "8080", "passed": true }
      ]
    },
    {
      "name": "read_then_write",
      "status": "fail",
      "duration_ms": 4800,
      "assertionResults": [
        { "type": "file_contents", "path": "data_backup.txt", "expected": "important data", "actual": null, "passed": false }
      ],
      "stderr": "Error: file data_backup.txt does not exist",
      "hint": "检查你的 Agent 是否正确调用了 write_file 工具"
    }
  ],
  "allPassed": false,
  "buildLog": "...",
  "testLog": "..."
}
```

### 7.2 测试执行流程（容器内）

```bash
#!/bin/bash
# 容器内测试执行脚本

LAB=$1  # lab number
SCENARIO=$2  # test case name

# 1. 编译
cd /app && node build.mjs --lab=$LAB
if [ $? -ne 0 ]; then
  echo "BUILD_FAILED"
  exit 1
fi

# 2. 启动 Mock LLM Server
node /mock-llm-server.js &
MOCK_PID=$!
sleep 0.5

# 3. 设置测试场景
curl -s -X POST http://localhost:9999/mock/set-scenario \
  -H 'Content-Type: application/json' \
  -d "{\"scenario\": \"$SCENARIO\"}"

# 4. 创建工作区文件
# (由测试运行器根据 test case 定义创建)

# 5. 运行被测程序
ANTHROPIC_BASE_URL=http://localhost:9999 \
ANTHROPIC_API_KEY=mock-key-00000000000000000000000000000000 \
node /app/cli.js \
  -p "$PROMPT" \
  --bare \
  --model claude-haiku-4-5-20251001

EXIT_CODE=$?
STDOUT=$(cat /tmp/stdout)

# 6. 收集文件系统 diff
# (由测试运行器检查)

# 7. 清理
kill $MOCK_PID
```

---

## 八、实现优先级与工作量估算

### Phase 1: Mock LLM Server + Test Runner (1-2 周)
1. 实现 `mock-llm-server.ts`（Anthropic Messages API 兼容）
2. 实现测试运行器（容器内 build → run → assert）
3. 实现后端 API `/api/labs/:labId/run-tests`
4. Lab 3 的 3 个测试用例

### Phase 2: 前端评测 UI (1 周)
1. 终端区 Tab 切换 [终端] | [评测]
2. 测试结果展示（pass/fail + 详细信息）
3. "运行测试"按钮 + 加载状态
4. 全部通过后解锁"提交到容器"

### Phase 3: 所有 Lab 测试用例 (1-2 周)
1. Lab 1-2 测试用例
2. Lab 4-5 测试用例
3. 随机化测试用例
4. Hint 系统

### Phase 4: 集成测试 + 部署 (1 周)
1. 端到端测试（前端 → 后端 → 容器 → Mock → 断言）
2. 部署到华为云
3. 并发测试（多学习者同时跑测试）

---

## 附录 A: 环境变量速查表

| 变量 | 作用 | Mock 测试时的值 |
|------|------|---------------|
| `ANTHROPIC_BASE_URL` | API 基础 URL | `http://localhost:9999` |
| `ANTHROPIC_API_KEY` | API 密钥 | `mock-key-00000000000000000000000000000000` |
| `CLAUDE_CODE_SIMPLE` | 启用 bare 模式 | `1`（或用 `--bare` flag）|

## 附录 B: CLI 参数速查表

| 参数 | 作用 | Mock 测试时的值 |
|------|------|---------------|
| `-p` / `--print` | 非交互模式 prompt | 测试用例定义的 prompt |
| `--bare` | 跳过所有非必要功能 | 总是使用 |
| `--model <name>` | 模型名称 | `claude-haiku-4-5-20251001` |

## 附录 C: Anthropic Messages API 格式速查

```
POST /v1/messages

Request:
{
  "model": "claude-haiku-4-5-20251001",
  "max_tokens": 8096,
  "messages": [
    { "role": "user", "content": "Read config.json" }
  ],
  "tools": [
    {
      "name": "read_file",
      "description": "Read file contents",
      "input_schema": {
        "type": "object",
        "properties": { "path": { "type": "string" } },
        "required": ["path"]
      }
    }
  ]
}

Response (text):
{
  "content": [{ "type": "text", "text": "The port is 8080" }],
  "stop_reason": "end_turn"
}

Response (tool_use):
{
  "content": [{ "type": "tool_use", "id": "toolu_xxx", "name": "read_file", "input": { "path": "config.json" } }],
  "stop_reason": "tool_use"
}

Tool result (sent back by agent):
{
  "messages": [
    ...previous messages,
    { "role": "assistant", "content": [{ "type": "tool_use", ... }] },
    { "role": "user", "content": [{ "type": "tool_result", "tool_use_id": "toolu_xxx", "content": "{...file contents...}" }] }
  ]
}
```

## 附录 D: CodeCrafters 源码文件清单

| 文件路径 | 大小 | 功能 |
|---------|------|------|
| `cmd/tester/main.go` | 379B | 入口 |
| `internal/tester_definition.go` | 846B | Stage 注册表（slug → testFunc 映射）|
| `internal/stages_test.go` | 2.5KB | 测试场景矩阵（fixture-based）|
| `internal/stage_test_prompt_response.go` | 2.2KB | Stage 1: LLM 调用测试 |
| `internal/stage_test_advertise_read_tool.go` | 1.5KB | Stage 2: 工具声明测试 |
| `internal/stage_test_execute_read_tool.go` | 2.0KB | Stage 3: 工具执行测试 |
| `internal/stage_test_agent_loop.go` | 2.8KB | Stage 4: Agent Loop 测试 ★ |
| `internal/stage_test_write_tool.go` | 2.6KB | Stage 5: 写文件测试 |
| `internal/stage_test_bash_tool.go` | 3.4KB | Stage 6: Bash 工具测试 |
| `internal/test_cases/non_interactive_test_case.go` | — | 测试执行器（Run → 检查 exit code + stdout）|
| `internal/workspace_manager/workspace_manager.go` | 3.7KB | 临时工作区管理 |
| `internal/settings_manager/initialize.go` | — | 权限设置（bypassPermissions）|
| `internal/utils/utils.go` | 1.3KB | Guard rail prompt 拼接 |
| `proxy_server/proxy_server.go` | 3.1KB | API 代理（注入 key + 转发到 OpenRouter）|
| `proxy_server/model_validator.go` | 1.1KB | 模型白名单（只允许 claude-haiku）|
| `proxy_server/validator.go` | 1.6KB | 端点白名单 + validator 中间件 |
| `test_helpers/scenarios/.../main.py` | 4.6KB | 完整通过方案（~120 行 Python Agent）|
