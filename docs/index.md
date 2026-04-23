---
hide:
  - navigation
  - toc
template: home.html
---

<!-- Architecture -->
<div class="byocc-section byocc-animate">
  <h2 class="byocc-section-title">AI Coding Agent 是怎么工作的？</h2>
  <p class="byocc-section-desc">
    Claude Code、Cursor Agent 这些 AI 编程工具的能力 = 大模型 + Agent Harness。
    大模型提供智能，而 Harness — 消息协议、工具系统、Agent Loop、上下文管理 — 才是让 Agent 真正能完成复杂编码任务的关键。
  </p>
  <div class="byocc-arch">
    <div class="byocc-arch-block byocc-arch-model">
      <span class="byocc-arch-pct">60%</span>
      <span class="byocc-arch-label">大模型 (Model)</span>
      <span class="byocc-arch-desc">提供智能、理解意图、生成代码</span>
    </div>
    <div class="byocc-arch-block byocc-arch-harness">
      <span class="byocc-arch-pct">40%</span>
      <span class="byocc-arch-label">Agent Harness</span>
      <span class="byocc-arch-desc">消息协议 · 工具系统 · Agent Loop · 上下文管理</span>
    </div>
  </div>
  <p style="text-align:center; margin-top:1rem; font-size:0.88rem; color:var(--md-default-fg-color--light);">
    本项目通过 6 个渐进式 Lab，带你亲手实现这个 Harness。
  </p>
</div>

<!-- Lab Cards -->
<div class="byocc-section">
  <h2 class="byocc-section-title byocc-animate">6 个 Lab，渐进式掌握</h2>
  <p class="byocc-section-desc byocc-animate">每个 Lab 完成后，Claude Code TUI 的能力都会发生可见变化。</p>
  <div class="byocc-grid">
    <a href="labs/lab-00/" class="byocc-card byocc-animate">
      <span class="byocc-card-num">Lab 0</span>
      <span class="byocc-card-title">环境与体验</span>
      <span class="byocc-card-desc">安装运行完整 Claude Code。先体验终点，再动手构建。</span>
    </a>
    <a href="labs/lab-01/" class="byocc-card byocc-animate">
      <span class="byocc-card-num">Lab 1</span>
      <span class="byocc-card-title">让 Agent 会说话</span>
      <span class="byocc-card-desc">API 调用，文字回复。Agent 说话了，但不能做任何事。</span>
    </a>
    <a href="labs/lab-02/" class="byocc-card byocc-animate">
      <span class="byocc-card-num">Lab 2</span>
      <span class="byocc-card-title">给 Agent 一双手</span>
      <span class="byocc-card-desc">工具注册与执行。Agent 用了一次工具，然后停了。</span>
    </a>
    <a href="labs/lab-03/" class="byocc-card byocc-card-core byocc-animate">
      <span class="byocc-card-num">Lab 3</span>
      <span class="byocc-card-title">Agent Loop</span>
      <span class="byocc-card-desc">while(true) 循环。Agent 自主循环，多轮调用工具。整个项目最重要的 Lab。</span>
      <span class="byocc-card-tag">核心</span>
    </a>
    <a href="labs/lab-04/" class="byocc-card byocc-animate">
      <span class="byocc-card-num">Lab 4</span>
      <span class="byocc-card-title">规划与子 Agent</span>
      <span class="byocc-card-desc">TodoWrite + Subagent。Agent 先列计划再执行，会拆子任务。</span>
    </a>
    <a href="labs/lab-05/" class="byocc-card byocc-animate">
      <span class="byocc-card-num">Lab 5</span>
      <span class="byocc-card-title">上下文压缩</span>
      <span class="byocc-card-desc">三层压缩策略。Agent 处理超长对话不崩溃。</span>
    </a>
  </div>
</div>

<!-- Features -->
<div class="byocc-section">
  <h2 class="byocc-section-title byocc-animate">项目特点</h2>
  <div class="byocc-feature-grid">
    <div class="byocc-feature byocc-animate">
      <div class="byocc-feature-text">
        <strong>基于真实 Claude Code 源码</strong>
        <p>416,500 行 TypeScript，而非玩具实现。你写的代码会插入真实系统运行。</p>
      </div>
    </div>
    <div class="byocc-feature byocc-animate">
      <div class="byocc-feature-text">
        <strong>渐进式反馈</strong>
        <p>每个 Lab 完成后，TUI 的能力都会发生可见变化，像打游戏解锁技能。</p>
      </div>
    </div>
    <div class="byocc-feature byocc-animate">
      <div class="byocc-feature-text">
        <strong>测试驱动</strong>
        <p>Mock LLM 测试确保结果确定可验证，不依赖 API Key 也能完成所有 Lab。</p>
      </div>
    </div>
    <div class="byocc-feature byocc-animate">
      <div class="byocc-feature-text">
        <strong>终极体验</strong>
        <p>你的代码插入真实 416K 行系统中运行。看到完整 TUI 响应你的指令时，核心引擎是你自己写的。</p>
      </div>
    </div>
  </div>
</div>

<!-- CTA -->
<div class="byocc-cta byocc-animate">
  <h2>准备好开始了吗？</h2>
  <p>只需 Node.js 和基本的 TypeScript 知识，Lab 3 live demo 才需要 API Key。</p>
  <div class="byocc-cta-code">
    <span class="cmd">git clone</span> https://github.com/cookiesheep/build-your-own-claude-code.git<br/>
    <span class="cmd">cd</span> build-your-own-claude-code<br/>
    <span class="cmd">npm</span> install<br/>
    <span class="comment"># 从 Lab 0 开始你的旅程</span>
  </div>
  <br/>
  <a href="labs/lab-00/" class="byocc-btn byocc-btn-primary">从 Lab 0 开始 →</a>
</div>
