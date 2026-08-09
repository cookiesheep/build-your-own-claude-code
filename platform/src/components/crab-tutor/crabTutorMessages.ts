export type TutorModality = "视觉" | "语音" | "文本";

export interface DemoTutorReply {
  text: string;
  topic: string;
}
interface MessagePattern {
  topic: string;
  keywords: string[];
  reply: string;
}

export const CRAB_TUTOR_WELCOME =
  "我是蟹老师。我会看你正在学习的页面、听你说问题，再用问题和提示陪你把 Agent Harness 想明白。先告诉我：你现在卡在哪一步？";

const MESSAGE_PATTERNS: MessagePattern[] = [
  {
    topic: "agent-loop",
    keywords: ["agent loop", "循环", "while", "迭代", "自主"],
    reply:
      "先别急着写 while(true)。想一想：模型本轮如果返回了 tool_use，系统还缺哪一条信息，才能让下一轮推理知道工具刚才做了什么？",
  },
  {
    topic: "tool-use",
    keywords: ["tool_use", "工具调用", "调用工具", "tool use"],
    reply:
      "把 tool_use 看成模型提出的一张“操作申请单”。真正执行操作的是模型还是 Harness？如果参数不合法，你会在哪一层拦住它？",
  },
  {
    topic: "tool-result",
    keywords: ["tool_result", "工具结果", "结果回传", "tool result"],
    reply:
      "有个容易忽略的细节：tool_result 在协议里通常属于 user 消息，但它并不是人说的话。你能解释为什么这样设计更利于下一轮模型继续推理吗？",
  },
  {
    topic: "messages",
    keywords: ["message", "消息", "role", "content", "协议"],
    reply:
      "先画一条最短消息链：user → assistant(tool_use) → user(tool_result) → assistant。哪两个 id 必须严格对应，才能避免结果串到错误的工具调用上？",
  },
  {
    topic: "context",
    keywords: ["上下文", "context", "窗口", "token"],
    reply:
      "上下文不是越多越好。假设只能保留三类信息：用户目标、工具观察、历史闲聊，你会先压缩哪一类？为什么它对任务完成度影响最小？",
  },
  {
    topic: "compact",
    keywords: ["压缩", "compact", "microcompact", "autocompact", "摘要"],
    reply:
      "可以把压缩分成两层：删除可重建噪声，与总结不可丢失状态。工具输出属于哪一层？什么内容必须保留原文而不能只留摘要？",
  },
  {
    topic: "planning",
    keywords: ["计划", "planning", "todo", "任务拆分"],
    reply:
      "计划的价值不是把步骤写得漂亮，而是暴露可验证的中间状态。你当前这一步完成后，能用什么证据判断它真的完成，而不是模型自称完成？",
  },
  {
    topic: "subagent",
    keywords: ["子 agent", "subagent", "子任务", "派生"],
    reply:
      "派生子 Agent 前先问：它需要共享主对话的全部历史吗？如果只给目标、边界和必要文件，可能同时减少哪两类风险？",
  },
  {
    topic: "streaming",
    keywords: ["流式", "stream", "sse", "实时输出"],
    reply:
      "流式输出不只是让文字更快出现。想想 tool_use 的参数还没接收完整时，Harness 能执行吗？你需要用什么事件作为“可以行动”的边界？",
  },
  {
    topic: "termination",
    keywords: ["停止", "退出", "终止", "max iteration", "死循环"],
    reply:
      "一个可靠 Agent Loop 至少需要模型结束、错误中止和最大迭代三种出口。你现在的实现覆盖了哪几种？最坏情况下会发生什么？",
  },
  {
    topic: "permission",
    keywords: ["权限", "permission", "安全", "确认"],
    reply:
      "模型决定“想做什么”，权限层决定“允许做什么”。如果把两者写进同一个函数，审计和测试会变难在哪里？",
  },
  {
    topic: "harness",
    keywords: ["harness", "脚手架", "外壳", "框架"],
    reply:
      "同一个模型放进聊天框和 Coding Agent，能力差异来自哪里？试着只用四个动词描述 Harness 提供的闭环。",
  },
  {
    topic: "mock",
    keywords: ["mock", "测试", "test", "确定性"],
    reply:
      "测试 Agent 时，先固定模型输出能消除随机性。那你真正要断言的是回复文案，还是 Harness 在每轮做出的状态转换？",
  },
  {
    topic: "errors",
    keywords: ["错误", "异常", "error", "失败", "重试"],
    reply:
      "先区分可重试错误和确定性错误：网络超时与工具参数缺字段，哪一个值得原样重试？另一个应该把什么反馈给模型？",
  },
  {
    topic: "learning",
    keywords: ["怎么学", "不懂", "卡住", "提示", "答案"],
    reply:
      "我们先把问题缩小：你能指出“模型决策、Harness 执行、结果回流”三步中，哪一步的输入输出最不清楚吗？我从那一步陪你推。",
  },
];

const FALLBACK_REPLIES = [
  "先把它放回 Agent 的闭环里看：当前信息是观察、决策，还是行动结果？你希望下一轮模型依据什么继续？",
  "我先不直接给答案。请用一句话说出你期望的输入和输出，再找出中间必须由 Harness 保证的不变量。",
  "如果把模型暂时替换成固定 JSON，这段逻辑还能正确工作吗？这个问题通常能帮你分清模型能力和 Harness 责任。",
];

function normalize(text: string): string {
  return text.trim().toLocaleLowerCase("zh-CN");
}

export function createDemoTutorReply(
  input: string,
  visibleHeadings: string[] = [],
): DemoTutorReply {
  const haystack = normalize(`${input} ${visibleHeadings.join(" ")}`);
  let best: MessagePattern | undefined;
  let bestScore = 0;

  for (const pattern of MESSAGE_PATTERNS) {
    const score = pattern.keywords.reduce(
      (total, keyword) => total + (haystack.includes(normalize(keyword)) ? 1 : 0),
      0,
    );
    if (score > bestScore) {
      best = pattern;
      bestScore = score;
    }
  }

  if (best) {
    return { text: best.reply, topic: best.topic };
  }

  const stableIndex = Array.from(haystack).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return {
    text: FALLBACK_REPLIES[stableIndex % FALLBACK_REPLIES.length],
    topic: "harness",
  };
}
