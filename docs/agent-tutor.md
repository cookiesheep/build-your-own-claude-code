# 蟹老师 · 全模态助教

蟹老师是 BYOCC 首页左下角的交互式 Agent 学习向导，由 MiniCPM-o 4.5 提供可插拔的多模态理解能力。点击螃蟹即可向上展开面板；再次点击螃蟹、点击关闭按钮或按 `Esc` 可以收起。

## 能做什么

### 文字提问

学习者可以围绕 Agent Harness 提问。助教采用苏格拉底式引导，通常会给出一个小提示或反问，而不是直接交付完整答案。Demo 消息库覆盖 Agent Loop、`tool_use` / `tool_result`、规划、子 Agent、上下文压缩、退出条件和权限边界等主题。

### 语音输入与播报

按住“语音说话”按钮时，浏览器使用 `getUserMedia` 获取麦克风音频，并通过 Web Speech API 的 `SpeechRecognition` 生成中文转写；Canvas 同时绘制实时波形。松开后，转写文本连同音频数据交给统一模型客户端。

收到回复后，页面使用 `SpeechSynthesis` 主动朗读，并显示播放波形、驱动螃蟹的说话动画。浏览器不支持语音识别或用户拒绝麦克风权限时，面板会给出降级提示，文字和视觉入口仍可使用。

!!! note "关于全双工"
    MiniCPM-o 4.5 模型支持全双工实时语音能力。当前 BYOCC 浏览器 Demo 为便于课堂和比赛现场稳定演示，采用“按住说话、松开发送”的半双工交互；接入官方实时流式服务后可以扩展为边听边说。

### 屏幕视觉理解

点击“看屏幕”后，前端使用 `html2canvas` 截取当前可视区，并提取视口内的标题作为辅助上下文。截图会被压缩后放入消息中，叠加粉笔风定位框，让用户明确看到本轮确实包含视觉输入。

真实模型模式会把截图作为 OpenAI-compatible `image_url` 内容发送给 MiniCPM-o；Demo 模式则基于可见标题生成可复现的本地分析。两种模式都会显示截图缩略图与「视觉·文本」模态标签。

## 调用链路

所有模型请求都经过 `platform/src/lib/minicpm-client.ts`。客户端接受文本、截图和可选音频，统一输出文本、实际使用的模态和可选音频。

```text
CrabTutorPanel
  ├─ useVoice：麦克风、语音转写、语音合成
  ├─ useVision：视口截图、标题提取、视觉标注
  └─ minicpm-client
       ├─ 未配置端点 → 本地 Demo 消息库
       └─ 已配置端点 → OpenAI-compatible Chat Completions
                              └─ 可选 Express /api/crab-tutor 代理
```

## 配置

### Demo 模式

不设置 `NEXT_PUBLIC_MINICPM_API_URL` 即可。Demo 不需要 API Key，文字匹配、截图和标注在本地完成；语音识别与合成仍使用浏览器原生能力，因此浏览器可能请求麦克风权限。

### 推荐：服务端代理

平台配置：

```dotenv
NEXT_PUBLIC_MINICPM_API_URL=http://127.0.0.1:3001/api/crab-tutor
NEXT_PUBLIC_MINICPM_MODEL=MiniCPM-O-4.5-9B
```

服务端配置：

```dotenv
MINICPM_API_URL=https://api.modelbest.cn/v1
MINICPM_API_KEY=your-server-side-key
MINICPM_MODEL=MiniCPM-O-4.5-9B
MINICPM_TIMEOUT_MS=60000
```

当上游地址以 `/v1` 结尾时，代理会请求 `/v1/chat/completions`。如果使用自建 vLLM-Omni 或其他兼容服务，也可以直接配置完整的 Chat Completions 地址。

### 本地直连

`NEXT_PUBLIC_MINICPM_API_KEY` 可用于受控的本地联调，但 `NEXT_PUBLIC_` 环境变量会被打进浏览器代码，不能用于生产密钥。公开部署应使用服务端代理。

## 浏览器与数据边界

- Chrome / Edge 对 Web Speech API 的支持最完整；其他浏览器会自动降级。
- 屏幕截图只在用户点击“看屏幕”后发生，助教面板和螃蟹本身会从截图中排除。
- Demo 模式不会上传截图或音频；真实模型模式会把用户主动提供的内容发送到配置的端点。
- 面板遵循站点现有明暗主题和 `prefers-reduced-motion`，移动端会适配为接近全宽的单列布局。

## 当前范围

该功能面向教学与模型能力演示，不保存对话历史到服务端，也不替代 Lab 的正式验证流程。视觉标注用于展示输入区域和辅助理解，不等同于目标检测模型的精确边界框。
