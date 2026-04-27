"use client";

import { useState } from "react";
import MarkdownRenderer from "./MarkdownRenderer";

type DocsPanelProps = {
  indexContent: string;
  tasksContent: string;
};

type DocTab = "index" | "tasks";

export default function DocsPanel({ indexContent, tasksContent }: DocsPanelProps) {
  const [activeTab, setActiveTab] = useState<DocTab>("index");
  const hasTasks = Boolean(tasksContent);

  const content = activeTab === "tasks" && hasTasks ? tasksContent : indexContent;

  return (
    <div className="flex h-full flex-col overflow-hidden border-r border-[var(--border)] bg-[var(--bg-panel)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          📖 文档
        </span>
        {hasTasks && (
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("index")}
              className={`rounded px-2 py-0.5 transition-colors ${
                activeTab === "index"
                  ? "bg-[var(--accent)] text-white font-medium"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              知识点
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tasks")}
              className={`rounded px-2 py-0.5 transition-colors ${
                activeTab === "tasks"
                  ? "bg-[var(--accent)] text-white font-medium"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              实验任务
            </button>
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="markdown-body">
          <MarkdownRenderer content={content} />
        </div>
      </div>
    </div>
  );
}
