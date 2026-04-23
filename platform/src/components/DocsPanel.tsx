"use client";

import MarkdownRenderer from "./MarkdownRenderer";

type DocsPanelProps = {
  labId?: number;
  content: string;
};

export default function DocsPanel({ content }: DocsPanelProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden border-r border-[var(--border)] bg-[var(--bg-panel)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-3">
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          📖 文档
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="markdown-body">
          <MarkdownRenderer content={content} />
        </div>
      </div>
    </div>
  );
}
