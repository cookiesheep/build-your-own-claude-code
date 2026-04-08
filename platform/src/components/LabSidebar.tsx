import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { LABS } from "@/lib/labs";

import ProgressTracker from "./ProgressTracker";

type LabSidebarProps = {
  labId: number;
  content: string;
};

export default function LabSidebar({ labId, content }: LabSidebarProps) {
  const lab = LABS.find((item) => item.id === labId) ?? LABS[0];

  return (
    <aside className="flex h-[calc(100vh-56px)] w-[380px] shrink-0 flex-col border-r border-[var(--border)] bg-[color:rgba(15,15,15,0.98)]">
      <div className="border-b border-[var(--border)] px-6 py-5">
        <div className="mb-3 flex items-center gap-3">
          <span className="text-xl">{lab.emoji}</span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                Lab {lab.id} · {lab.name}
              </h1>
              {lab.highlight ? (
                <span className="rounded-full border border-[color:rgba(34,211,238,0.3)] bg-[color:rgba(34,211,238,0.12)] px-2 py-0.5 text-[0.62rem] uppercase tracking-[0.18em] text-[var(--accent)]">
                  Core
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{lab.desc}</p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="markdown-body">
          <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
        </div>
      </div>

      <div className="border-t border-[var(--border)] px-6 py-4">
        <ProgressTracker currentLabId={labId} />
      </div>
    </aside>
  );
}
