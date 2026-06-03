export type LabStatus = "not_started" | "in_progress" | "completed";

export type LabMeta = {
  id: number;
  emoji: string;
  name: string;
  desc: string;
  tag: string;
  status: LabStatus;
  highlight?: boolean;
  difficulty: "easy" | "medium" | "hard";
  estimatedTime: string;
  /** false = 面板可见但按钮显示"开发中"，用户无法进入 */
  enabled: boolean;
};

/** Lab 文档站基础 URL（MkDocs 部署地址） */
export const DOCS_BASE_URL =
  "https://cookiesheep.github.io/build-your-own-claude-code/labs";

export const LABS: LabMeta[] = [
  {
    id: 0,
    emoji: "🔧",
    name: "环境与体验",
    desc: "安装运行完整 Claude Code，看到你最终要驱动的东西",
    tag: "准备",
    status: "not_started",
    difficulty: "easy",
    estimatedTime: "< 5 min",
    enabled: true,
  },
  {
    id: 1,
    emoji: "📨",
    name: "消息协议",
    desc: "理解 LLM 对话的数据结构，建立 Agent 的输入输出语言",
    tag: "Lab 1",
    status: "not_started",
    difficulty: "easy",
    estimatedTime: "10-20 min",
    enabled: false,
  },
  {
    id: 2,
    emoji: "⚙️",
    name: "工具系统",
    desc: "实现 read_file / write_file / bash，给 Agent 装上手脚",
    tag: "Lab 2",
    status: "not_started",
    difficulty: "easy",
    estimatedTime: "20-30 min",
    enabled: false,
  },
  {
    id: 3,
    emoji: "🔄",
    name: "Agent Loop",
    desc: "while(true) 循环，chatbot 变成 agent 的那一行代码",
    tag: "★ 核心",
    status: "not_started",
    highlight: true,
    difficulty: "hard",
    estimatedTime: "1-2 hr",
    enabled: false,
  },
  {
    id: 4,
    emoji: "📋",
    name: "规划能力",
    desc: "让 Agent 先想再做，TodoWrite 为复杂任务建立节奏",
    tag: "Lab 4",
    status: "not_started",
    difficulty: "medium",
    estimatedTime: "30-45 min",
    enabled: false,
  },
  {
    id: 5,
    emoji: "🗜️",
    name: "上下文压缩",
    desc: "三层压缩策略，让 Agent 处理长任务时更稳",
    tag: "Lab 5",
    status: "not_started",
    difficulty: "medium",
    estimatedTime: "30-45 min",
    enabled: false,
  },
];

export const STATUS_LABELS: Record<LabStatus, string> = {
  not_started: "未开始",
  in_progress: "进行中",
  completed: "已完成",
};

export const STATUS_COLORS: Record<LabStatus, string> = {
  not_started: "var(--text-disabled)",
  in_progress: "var(--status-progress)",
  completed: "var(--status-success)",
};
