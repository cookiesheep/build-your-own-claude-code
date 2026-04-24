"use client";

import { useCallback, useMemo, useState } from "react";

import { buildLabFileTree, LAB_EDITABLE_FILES } from "@/lib/file-tree-data";
import type { FileTreeNode } from "@/lib/file-tree-data";

type FileTreeProps = {
  labId: number;
  activeFilePath?: string | null;
  onFileSelect: (path: string, isEditable: boolean) => void;
};

function getEditableSet(labId: number): Set<string> {
  return new Set(LAB_EDITABLE_FILES[labId] ?? []);
}

function getParentDirs(editableFiles: string[]): string[] {
  const dirs = new Set<string>();
  for (const filePath of editableFiles) {
    const parts = filePath.split("/");
    for (let i = 1; i < parts.length; i++) {
      dirs.add(parts.slice(0, i).join("/"));
    }
  }
  return [...dirs];
}

function getFileIcon(name: string): string {
  if (name.endsWith(".ts")) return "\u{1F4C4}";
  if (name.endsWith(".tsx")) return "\u{26A1}";
  if (name.endsWith(".json")) return "\u{1F4E6}";
  if (name.endsWith(".mjs")) return "\u{1F4C4}";
  return "\u{1F4C4}";
}

function FileTreeNodeRow({
  node,
  depth,
  editableSet,
  expandedDirs,
  toggleDir,
  onFileSelect,
  activeFilePath,
}: {
  node: FileTreeNode;
  depth: number;
  editableSet: Set<string>;
  expandedDirs: Set<string>;
  toggleDir: (path: string) => void;
  activeFilePath?: string | null;
  onFileSelect: (path: string, isEditable: boolean) => void;
}) {
  const isEditable = editableSet.has(node.path);
  const isExpanded = expandedDirs.has(node.path);
  const isActive = activeFilePath === node.path;

  if (node.type === "directory") {
    return (
      <>
        <button
          type="button"
          onClick={() => toggleDir(node.path)}
          className="flex w-full items-center gap-1.5 rounded px-2 py-0.5 text-left hover:bg-[var(--surface-hover)]"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          <span className="inline-block w-3 text-center text-[10px] text-[var(--text-muted)]">
            {isExpanded ? "\u25BC" : "\u25B6"}
          </span>
          <span className="text-[13px] text-[var(--text-secondary)]">{node.name}</span>
        </button>
        {isExpanded &&
          node.children?.map((child) => (
            <FileTreeNodeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              editableSet={editableSet}
              expandedDirs={expandedDirs}
              toggleDir={toggleDir}
              onFileSelect={onFileSelect}
            />
          ))}
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        onFileSelect(node.path, isEditable);
      }}
      title={node.path}
      className={`flex w-full items-center gap-1.5 rounded px-2 py-0.5 text-left transition-colors duration-100 ${
        isEditable
          ? isActive
            ? "bg-[color:rgba(245,158,11,0.18)] font-semibold text-[color:rgb(245,158,11)]"
            : "bg-[color:rgba(245,158,11,0.08)] font-semibold text-[color:rgb(245,158,11)] hover:bg-[color:rgba(245,158,11,0.15)]"
          : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
      }`}
      style={{ paddingLeft: `${depth * 16 + 8}px`, lineHeight: "28px", fontSize: "13px" }}
    >
      <span className="inline-block w-3 text-center text-[11px]">
        {isEditable ? "\u2B50" : "\u{1F512}"}
      </span>
      <span>{node.name}</span>
    </button>
  );
}

export default function FileTree({ labId, activeFilePath, onFileSelect }: FileTreeProps) {
  const editableSet = useMemo(() => getEditableSet(labId), [labId]);
  const fileTree = useMemo(() => buildLabFileTree(labId), [labId]);

  const defaultExpandedDirs = useMemo(() => {
    const editableFiles = LAB_EDITABLE_FILES[labId] ?? [];
    return new Set(getParentDirs(editableFiles));
  }, [labId]);

  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(defaultExpandedDirs);

  const toggleDir = useCallback((path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Explorer
        </span>
      </div>
      <div className="flex-1 overflow-y-auto py-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {fileTree.map((node) => (
          <FileTreeNodeRow
            key={node.path}
            node={node}
            depth={0}
            editableSet={editableSet}
            expandedDirs={expandedDirs}
            toggleDir={toggleDir}
            activeFilePath={activeFilePath}
            onFileSelect={onFileSelect}
          />
        ))}
      </div>
    </div>
  );
}
