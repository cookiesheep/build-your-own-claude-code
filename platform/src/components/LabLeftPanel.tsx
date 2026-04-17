"use client";

import { useCallback, useState } from "react";
import { Group, Panel, Separator, usePanelRef } from "react-resizable-panels";

import DocsPanel from "./DocsPanel";
import FileTree from "./FileTree";

type LabLeftPanelProps = {
  labId: number;
  content: string;
};

export default function LabLeftPanel({ labId, content }: LabLeftPanelProps) {
  const panelRef = usePanelRef();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleFileSelect = useCallback((_path: string) => {
    // TODO: wire up to editor when multi-file support is added
  }, []);

  const toggleCollapse = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) {
      panel.expand();
    } else {
      panel.collapse();
    }
  }, [panelRef]);

  return (
    <Panel
      panelRef={panelRef}
      defaultSize="25%"
      minSize="15%"
      maxSize="40%"
      collapsible
      onResize={(size) => {
        setIsCollapsed(size.asPercentage === 0);
      }}
    >
      <div className="relative flex h-full flex-col overflow-hidden border-r border-[var(--border)] bg-[color:rgba(15,15,15,0.98)]">
        {/* Collapse/expand button */}
        <button
          type="button"
          onClick={toggleCollapse}
          className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-l border border-r-0 border-[var(--border)] bg-[var(--bg-panel)] px-1 py-3 text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          title={isCollapsed ? "展开面板" : "折叠面板"}
        >
          {isCollapsed ? "\u25B6" : "\u25C0"}
        </button>

        <Group orientation="vertical" style={{ height: "100%" }}>
          <Panel defaultSize="45%" minSize="20%">
            <FileTree labId={labId} onFileSelect={handleFileSelect} />
          </Panel>
          <Separator style={{ height: 1, background: "var(--border)" }} />
          <Panel defaultSize="55%" minSize="20%">
            <DocsPanel labId={labId} content={content} />
          </Panel>
        </Group>
      </div>
    </Panel>
  );
}
