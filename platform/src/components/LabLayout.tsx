"use client";

import { useCallback, useState } from "react";
import { Group, Panel, Separator, usePanelRef } from "react-resizable-panels";

import type { LabMeta } from "@/lib/labs";
import DocsPanel from "./DocsPanel";
import LabRightArea from "./LabRightArea";

type LabLayoutProps = {
  lab: LabMeta;
  content: string;
};

export default function LabLayout({ lab, content }: LabLayoutProps) {
  const docsPanelRef = usePanelRef();
  const [docsCollapsed, setDocsCollapsed] = useState(false);

  const toggleDocs = useCallback(() => {
    const panel = docsPanelRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) {
      panel.expand();
    } else {
      panel.collapse();
    }
  }, [docsPanelRef]);

  return (
    <div className="relative" style={{ height: "calc(100vh - 56px)" }}>
      {/* Floating button to expand docs when collapsed */}
      {docsCollapsed && (
        <button
          type="button"
          onClick={toggleDocs}
          className="absolute left-0 top-1/2 z-20 -translate-y-1/2 rounded-r-lg border border-l-0 border-[var(--border)] bg-[var(--bg-panel)] px-2 py-4 text-sm font-medium text-[var(--accent)] shadow-lg transition-colors hover:bg-[var(--surface-hover)]"
          title="展开文档面板"
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-lg">📖</span>
            <span className="text-[10px] writing-vertical" style={{ writingMode: "vertical-rl" }}>文档</span>
          </div>
        </button>
      )}

      <Group orientation="horizontal" style={{ height: "100%" }}>
        <Panel
          panelRef={docsPanelRef}
          defaultSize="30%"
          minSize="15%"
          maxSize="100%"
          collapsible
          onResize={(size) => {
            setDocsCollapsed(size.asPercentage === 0);
          }}
        >
          <DocsPanel content={content} />
        </Panel>

        <Separator style={{ width: 2, background: "var(--border)" }} />

        <Panel defaultSize="70%" minSize="30%">
          <LabRightArea lab={lab} onToggleDocs={toggleDocs} docsCollapsed={docsCollapsed} />
        </Panel>
      </Group>
    </div>
  );
}
