export interface FileTreeNode {
  name: string;
  type: "file" | "directory";
  path: string;
  children?: FileTreeNode[];
}

export const LAB_EDITABLE_FILES: Record<number, string[]> = {
  0: [],
  1: ["src/messages.ts"],
  2: ["src/tools/read-file.ts", "src/tools/write-file.ts", "src/tools/bash.ts"],
  3: ["src/query.ts"],
  4: ["src/agent/subagent.ts", "src/agent/todo-write.ts"],
  5: ["src/context/compress.ts"],
};

export const FILE_TREE: FileTreeNode[] = [
  {
    name: "src",
    type: "directory",
    path: "src",
    children: [
      { name: "query.ts", type: "file", path: "src/query.ts" },
      { name: "cli.ts", type: "file", path: "src/cli.ts" },
      { name: "messages.ts", type: "file", path: "src/messages.ts" },
      {
        name: "tools",
        type: "directory",
        path: "src/tools",
        children: [
          { name: "read-file.ts", type: "file", path: "src/tools/read-file.ts" },
          { name: "write-file.ts", type: "file", path: "src/tools/write-file.ts" },
          { name: "bash.ts", type: "file", path: "src/tools/bash.ts" },
          { name: "registry.ts", type: "file", path: "src/tools/registry.ts" },
        ],
      },
      {
        name: "agent",
        type: "directory",
        path: "src/agent",
        children: [
          { name: "subagent.ts", type: "file", path: "src/agent/subagent.ts" },
          { name: "todo-write.ts", type: "file", path: "src/agent/todo-write.ts" },
        ],
      },
      {
        name: "context",
        type: "directory",
        path: "src/context",
        children: [
          { name: "compress.ts", type: "file", path: "src/context/compress.ts" },
          { name: "summarize.ts", type: "file", path: "src/context/summarize.ts" },
        ],
      },
      {
        name: "core",
        type: "directory",
        path: "src/core",
        children: [
          { name: "config.ts", type: "file", path: "src/core/config.ts" },
          { name: "permissions.ts", type: "file", path: "src/core/permissions.ts" },
        ],
      },
    ],
  },
  {
    name: "shared",
    type: "directory",
    path: "shared",
    children: [{ name: "types.ts", type: "file", path: "shared/types.ts" }],
  },
  {
    name: "labs",
    type: "directory",
    path: "labs",
    children: [
      { name: "lab-01-messages", type: "directory", path: "labs/lab-01-messages" },
      { name: "lab-02-tools", type: "directory", path: "labs/lab-02-tools" },
      { name: "lab-03-agent-loop", type: "directory", path: "labs/lab-03-agent-loop" },
      { name: "lab-04-planning", type: "directory", path: "labs/lab-04-planning" },
      { name: "lab-05-compression", type: "directory", path: "labs/lab-05-compression" },
    ],
  },
  { name: "package.json", type: "file", path: "package.json" },
  { name: "tsconfig.json", type: "file", path: "tsconfig.json" },
  { name: "build.mjs", type: "file", path: "build.mjs" },
];
