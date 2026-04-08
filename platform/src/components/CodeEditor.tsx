'use client';

import dynamic from "next/dynamic";

const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[var(--bg-panel)] text-sm text-[var(--text-secondary)]">
      正在加载 Monaco Editor...
    </div>
  ),
});

type CodeEditorProps = {
  code: string;
  fileName: string;
  onChange: (value: string) => void;
};

export default function CodeEditor({
  code,
  fileName,
  onChange,
}: CodeEditorProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--bg-panel)] shadow-[0_0_0_1px_rgba(255,255,255,0.01),0_16px_40px_rgba(0,0,0,0.35)]">
      <div className="flex h-9 items-center gap-2 border-b border-[var(--border)] bg-[color:rgba(15,15,15,0.98)] px-4">
        <span className="text-[0.7rem] uppercase tracking-[0.18em] text-[var(--text-muted)]">
          TS
        </span>
        <span className="text-sm text-[var(--text-primary)]">{fileName}</span>
      </div>
      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          defaultLanguage="typescript"
          theme="vs-dark"
          value={code}
          onChange={(value) => {
            onChange(value ?? "");
          }}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineHeight: 22,
            scrollBeyondLastLine: false,
            fontFamily: "var(--font-jetbrains-mono), Fira Code, monospace",
            padding: { top: 18 },
            wordWrap: "on",
            tabSize: 2,
            smoothScrolling: true,
          }}
        />
      </div>
    </div>
  );
}
