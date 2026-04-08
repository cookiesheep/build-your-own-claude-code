'use client';

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { createSession, getTerminalWebSocketUrl, resetSession, submitCode } from "@/lib/api";
import { LAB_FILE_NAMES, LAB_SKELETONS, STATUS_LABELS, type LabMeta } from "@/lib/labs";

import SubmitButton from "./SubmitButton";

const CodeEditor = dynamic(() => import("./CodeEditor"), {
  ssr: false,
  loading: () => (
    <div className="rounded-t-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-6 text-sm text-[var(--text-secondary)]">
      正在初始化编辑器...
    </div>
  ),
});

const Terminal = dynamic(() => import("./Terminal"), {
  ssr: false,
  loading: () => (
    <div className="rounded-b-2xl border border-[var(--border)] bg-[#0d1117] p-6 text-sm text-[var(--text-secondary)]">
      正在初始化终端...
    </div>
  ),
});

type LabWorkspaceProps = {
  lab: LabMeta;
};

type BuildState = "idle" | "building" | "success" | "error";

export default function LabWorkspace({ lab }: LabWorkspaceProps) {
  const [code, setCode] = useState<string>(LAB_SKELETONS[lab.id] ?? "");
  const [sessionId, setSessionId] = useState<string>("");
  const [buildLog, setBuildLog] = useState<string>("");
  const [buildState, setBuildState] = useState<BuildState>("idle");

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const session = await createSession();
      if (!cancelled) {
        setSessionId(session.sessionId);
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async () => {
    try {
      setBuildState("building");
      const activeSessionId = sessionId || (await createSession()).sessionId;
      setSessionId(activeSessionId);
      const result = await submitCode(activeSessionId, code, lab.id);
      setBuildLog(result.buildLog);
      setBuildState(result.success ? "success" : "error");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setBuildLog(`❌ Build failed\n${message}`);
      setBuildState("error");
    }
  };

  const handleReset = async () => {
    const activeSessionId = sessionId || (await createSession()).sessionId;
    setSessionId(activeSessionId);
    await resetSession(activeSessionId);
    setCode(LAB_SKELETONS[lab.id] ?? "");
    setBuildLog("↺ Session reset complete");
    setBuildState("idle");
  };

  const statusText =
    buildState === "building"
      ? "构建中..."
      : buildState === "success"
        ? "✅ 构建成功"
        : buildState === "error"
          ? "❌ 构建失败"
          : `状态: ${STATUS_LABELS[lab.status]}`;

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-[var(--bg-panel)] p-5">
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_48px_minmax(0,0.9fr)] gap-4">
        <CodeEditor
          code={code}
          fileName={LAB_FILE_NAMES[lab.id] ?? "main.ts"}
          onChange={setCode}
        />

        <div className="flex h-12 items-center justify-between rounded-2xl border border-[var(--surface-hover)] bg-[color:rgba(10,10,10,0.92)] px-4">
          <div className="flex items-center gap-3">
            <SubmitButton onSubmit={handleSubmit} />
            <button
              type="button"
              onClick={() => {
                void handleReset();
              }}
              className="rounded-xl border border-transparent px-3 py-2 text-sm text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
              重置
            </button>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="text-[var(--text-secondary)]">{statusText}</span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-1 text-xs text-[var(--text-muted)]">
              {sessionId || "session: pending"}
            </span>
          </div>
        </div>

        <Terminal
          buildLog={buildLog}
          wsUrl={buildState === "success" && sessionId ? getTerminalWebSocketUrl(sessionId) : undefined}
        />
      </div>
    </section>
  );
}
