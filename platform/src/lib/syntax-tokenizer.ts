// ── TypeScript syntax highlighting ──

export type TokenType = 'keyword' | 'type' | 'string' | 'comment' | 'function' | 'punctuation' | 'plain';

export interface SyntaxToken {
  text: string;
  type: TokenType;
}

export const KEYWORDS = new Set([
  'export', 'async', 'function', 'const', 'let', 'var', 'return', 'if', 'else',
  'while', 'for', 'import', 'from', 'type', 'interface', 'new', 'await', 'yield',
  'true', 'false', 'null', 'undefined', 'void', 'throw', 'try', 'catch', 'typeof',
  'extends', 'implements', 'class', 'static', 'readonly', 'as',
]);

export const TYPES = new Set([
  'string', 'number', 'boolean', 'Promise', 'Record', 'Array', 'Map', 'Set',
  'Message', 'ToolDefinition', 'AgentEvent', 'LLMClient', 'ToolExecutor',
  'AsyncGenerator', 'TodoItem', 'CompressionStrategy', 'ToolResult',
  'ContextWindow', 'unknown',
]);

export const TOKEN_COLORS_DARK: Record<TokenType, string> = {
  keyword: '#D4A574',
  type: '#8B9DAF',
  string: '#7EBF8E',
  comment: '#6B6560',
  function: '#C9A0DC',
  punctuation: '#6B7280',
  plain: '#9CA3AF',
};

export const TOKEN_COLORS_LIGHT: Record<TokenType, string> = {
  keyword: '#9E7B52',
  type: '#5A6B7A',
  string: '#5A8A66',
  comment: '#9A9590',
  function: '#8A6BA0',
  punctuation: '#8B8B8B',
  plain: '#6B7280',
};

export function tokenizeLine(line: string): SyntaxToken[] {
  const tokens: SyntaxToken[] = [];
  let i = 0;

  while (i < line.length) {
    if (line[i] === '/' && line[i + 1] === '/') {
      tokens.push({ text: line.slice(i), type: 'comment' });
      break;
    }

    if (line[i] === '"' || line[i] === "'" || line[i] === '`') {
      const quote = line[i];
      let j = i + 1;
      while (j < line.length && line[j] !== quote) {
        if (line[j] === '\\') j++;
        j++;
      }
      tokens.push({ text: line.slice(i, j + 1), type: 'string' });
      i = j + 1;
      continue;
    }

    if (/[a-zA-Z_$]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j])) j++;
      const word = line.slice(i, j);
      const afterWord = line.slice(j).trimStart();
      if (afterWord[0] === '(' && !KEYWORDS.has(word) && !TYPES.has(word) && word[0] === word[0].toLowerCase()) {
        tokens.push({ text: word, type: 'function' });
      } else if (KEYWORDS.has(word)) {
        tokens.push({ text: word, type: 'keyword' });
      } else if (TYPES.has(word) || (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase())) {
        tokens.push({ text: word, type: 'type' });
      } else {
        tokens.push({ text: word, type: 'plain' });
      }
      i = j;
      continue;
    }

    if (/[{}()[\];:,.<>=!+\-*/&|?@]/.test(line[i])) {
      tokens.push({ text: line[i], type: 'punctuation' });
      i++;
      continue;
    }

    if (/\s/.test(line[i])) {
      let j = i;
      while (j < line.length && /\s/.test(line[j])) j++;
      tokens.push({ text: line.slice(i, j), type: 'plain' });
      i = j;
      continue;
    }

    tokens.push({ text: line[i], type: 'plain' });
    i++;
  }

  return tokens;
}

// ── Code snippets from real Claude Code source ──

export interface CodeSnippet {
  lines: string[];
  labId: number;
  labLabel: string;
}

export const SNIPPETS: CodeSnippet[] = [
  {
    lines: [
      'export async function* agentLoop(',
      '  client: LLMClient,',
      '  executor: ToolExecutor,',
      '  systemPrompt: string,',
      '  userMessage: string,',
      '): AsyncGenerator<AgentEvent> {',
      '  const messages: Message[] = [];',
      '  while (true) {',
      '    const response = await client.chat(messages);',
      '    if (!response.toolUse) { yield { done: true }; return; }',
      '    const result = await executor.run(response.toolUse);',
      '    messages.push({ role: "tool", content: result });',
      '  }',
      '}',
    ],
    labId: 3,
    labLabel: 'Lab 3 会教你实现这段代码',
  },
  {
    lines: [
      'export type Message = {',
      '  role: "user" | "assistant" | "tool";',
      '  content: string;',
      '  toolUse?: ToolCall[];',
      '};',
      '',
      'export async function sendMessage(',
      '  messages: Message[],',
      '): Promise<Message> {',
      '  const response = await client.chat(messages);',
      '  return { role: "assistant", content: response.text };',
      '}',
    ],
    labId: 1,
    labLabel: 'Lab 1 会教你实现这段代码',
  },
  {
    lines: [
      'export const tools = registerTools([',
      '  readFileTool,',
      '  writeFileTool,',
      '  bashTool,',
      ']);',
      '',
      'async function executeTool(',
      '  name: string,',
      '  input: Record<string, unknown>,',
      '): Promise<ToolResult> {',
      '  const tool = tools.get(name);',
      '  return tool.execute(input);',
      '}',
    ],
    labId: 2,
    labLabel: 'Lab 2 会教你实现这段代码',
  },
  {
    lines: [
      'export async function compress(',
      '  messages: Message[],',
      '  strategy: CompressionStrategy,',
      '): Promise<Message[]> {',
      '  const window = messages.slice(-40);',
      '  const summary = await summarize(window);',
      '  return [',
      '    { role: "system", content: summary },',
      '    ...messages.slice(-10),',
      '  ];',
      '}',
    ],
    labId: 5,
    labLabel: 'Lab 5 会教你实现这段代码',
  },
  {
    lines: [
      'interface TodoItem {',
      '  id: string;',
      '  text: string;',
      '  status: "pending" | "in_progress" | "done";',
      '}',
      '',
      'export function todoWrite(',
      '  todos: TodoItem[],',
      '  updates: Partial<TodoItem>[],',
      '): TodoItem[] {',
      '  return todos.map((t, i) => ({ ...t, ...updates[i] }));',
      '}',
    ],
    labId: 4,
    labLabel: 'Lab 4 会教你实现这段代码',
  },
  {
    lines: [
      'export async function* subAgent(',
      '  task: string,',
      '  tools: ToolDefinition[],',
      '): AsyncGenerator<AgentEvent> {',
      '  const subLoop = agentLoop(',
      '    createClient(),',
      '    createExecutor(tools),',
      '    `Sub-agent for: ${task}`,',
      '    task,',
      '  );',
      '  for await (const event of subLoop) {',
      '    yield { ...event, source: "subagent" };',
      '  }',
      '}',
    ],
    labId: 4,
    labLabel: 'Lab 4 会教你实现这段代码',
  },
  {
    lines: [
      'const readFileTool: ToolDefinition = {',
      '  name: "read_file",',
      '  description: "Read file contents",',
      '  inputSchema: {',
      '    type: "object",',
      '    properties: {',
      '      path: { type: "string" }',
      '    }',
      '  },',
      '  async execute({ path }) {',
      '    return fs.readFile(path, "utf-8");',
      '  }',
      '};',
    ],
    labId: 2,
    labLabel: 'Lab 2 会教你实现这段代码',
  },
  {
    lines: [
      'function createContextWindow(',
      '  messages: Message[],',
      '  maxTokens: number,',
      '): ContextWindow {',
      '  let tokens = 0;',
      '  const selected: Message[] = [];',
      '  for (let i = messages.length - 1; i >= 0; i--) {',
      '    tokens += estimateTokens(messages[i]);',
      '    if (tokens > maxTokens) break;',
      '    selected.unshift(messages[i]);',
      '  }',
      '  return { messages: selected, tokens };',
      '}',
    ],
    labId: 5,
    labLabel: 'Lab 5 会教你实现这段代码',
  },
];
