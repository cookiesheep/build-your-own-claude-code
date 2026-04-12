'use client';

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import {
  createSession,
  ensureAnonymousUser,
  getEnvironmentStatus,
  resetEnvironment,
  startEnvironment,
  submitCode,
  type EnvironmentStatus,
} from "@/lib/api";
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
const SESSION_STORAGE_KEY = "byocc-session-id";

export default function LabWorkspace({ lab }: LabWorkspaceProps) {
  const [code, setCode] = useState<string>(LAB_SKELETONS[lab.id] ?? "");
  const [userId, setUserId] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [environmentStatus, setEnvironmentStatus] =
    useState<EnvironmentStatus>("not_started");
  const [terminalUrl, setTerminalUrl] = useState<string>("");
  const [environmentMessage, setEnvironmentMessage] = useState<string>("");
  const [isStartingEnvironment, setIsStartingEnvironment] = useState(false);
  const [buildLog, setBuildLog] = useState<string>("");
  const [buildState, setBuildState] = useState<BuildState>("idle");

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        await ensureAnonymousUser();
        const existingSessionId = window.localStorage.getItem(SESSION_STORAGE_KEY) ?? undefined;
        const session = await createSession(existingSessionId);
        if (cancelled) {
          return;
        }

        window.localStorage.setItem(SESSION_STORAGE_KEY, session.sessionId);
        setUserId(session.userId ?? "");
        setSessionId(session.sessionId);
        setEnvironmentStatus(session.environmentStatus);
        setEnvironmentMessage("");

        if (session.environmentStatus === "running") {
          const environment = await getEnvironmentStatus(session.sessionId);
          if (!cancelled) {
            setEnvironmentStatus(environment.environmentStatus);
            setTerminalUrl(environment.success ? (environment.terminalUrl ?? "") : "");
            setEnvironmentMessage(environment.message ?? "");
          }
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Unknown session error";
          setEnvironmentStatus("error");
          setEnvironmentMessage(message);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleStartEnvironment = async () => {
    if (!sessionId) {
      setEnvironmentMessage("Session 还没有准备好，请稍后再试。");
      return;
    }

    try {
      setIsStartingEnvironment(true);
      setEnvironmentStatus("starting");
      setEnvironmentMessage("正在启动实验环境...");
      const environment = await startEnvironment(sessionId);
      setEnvironmentStatus(environment.success ? environment.environmentStatus : "error");
      setTerminalUrl(environment.success ? (environment.terminalUrl ?? "") : "");
      setEnvironmentMessage(environment.message ?? "");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown environment error";
      setEnvironmentStatus("error");
      setTerminalUrl("");
      setEnvironmentMessage(message);
    } finally {
      setIsStartingEnvironment(false);
    }
  };

  const handleSubmit = async () => {
    if (environmentStatus !== "running") {
      setBuildState("error");
      setBuildLog("请先启动实验环境，再提交代码。");
      setEnvironmentMessage("请先点击“启动实验环境”。");
      return;
    }

    try {
      setBuildState("building");
      const result = await submitCode(sessionId, code, lab.id);
      setBuildLog(result.buildLog);
      setBuildState(result.success ? "success" : "error");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setBuildLog(`❌ Build failed\n${message}`);
      setBuildState("error");
    }
  };

  const handleReset = async () => {
    if (!sessionId) {
      setEnvironmentMessage("Session 还没有准备好，请稍后再试。");
      return;
    }

    try {
      setIsStartingEnvironment(true);
      setEnvironmentStatus("starting");
      setTerminalUrl("");
      setEnvironmentMessage("正在重置实验环境...");
      const environment = await resetEnvironment(sessionId);
      setEnvironmentStatus(environment.success ? environment.environmentStatus : "error");
      setTerminalUrl(environment.success ? (environment.terminalUrl ?? "") : "");
      setEnvironmentMessage(environment.message ?? "");
      setCode(LAB_SKELETONS[lab.id] ?? "");
      setBuildLog("↺ 实验环境已重置，请重新提交代码。");
      setBuildState("idle");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown reset error";
      setEnvironmentStatus("error");
      setEnvironmentMessage(message);
      setBuildLog(`❌ Reset failed\n${message}`);
      setBuildState("error");
    } finally {
      setIsStartingEnvironment(false);
    }
  };

  const canSubmit = environmentStatus === "running";
  const environmentStatusText =
    environmentStatus === "not_started"
      ? "实验环境未启动"
      : environmentStatus === "starting"
        ? "实验环境启动中..."
        : environmentStatus === "running"
          ? "实验环境运行中"
          : environmentStatus === "expired"
            ? "实验环境已过期"
            : environmentStatus === "stopped"
              ? "实验环境已停止"
              : "实验环境异常";
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
              disabled={!sessionId || isStartingEnvironment || environmentStatus === "running"}
              onClick={() => {
                void handleStartEnvironment();
              }}
              className="rounded-xl border border-[color:rgba(34,211,238,0.35)] bg-[color:rgba(34,211,238,0.08)] px-3 py-2 text-sm text-[var(--accent)] transition-colors duration-150 hover:bg-[color:rgba(34,211,238,0.14)] disabled:cursor-not-allowed disabled:border-[var(--border)] disabled:bg-transparent disabled:text-[var(--text-disabled)]"
            >
              {isStartingEnvironment
                ? "启动中..."
                : environmentStatus === "running"
                  ? "环境已启动"
                  : "启动实验环境"}
            </button>
            <button
              type="button"
              onClick={() => {
                void handleReset();
              }}
              className="rounded-xl border border-transparent px-3 py-2 text-sm text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
              重置环境
            </button>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className={canSubmit ? "text-[var(--status-success)]" : "text-[var(--text-secondary)]"}>
              {environmentStatusText}
            </span>
            <span className="text-[var(--text-secondary)]">{statusText}</span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-1 text-xs text-[var(--text-muted)]">
              {sessionId || "session: pending"}
            </span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-1 text-xs text-[var(--text-muted)]">
              {userId ? `user: ${userId.slice(0, 8)}` : "user: pending"}
            </span>
          </div>
        </div>

        <Terminal
          buildLog={buildLog}
          showProgress={environmentStatus === "starting"}
          waitingMessage={environmentMessage || environmentStatusText}
          wsUrl={terminalUrl || undefined}
        />
      </div>
    </section>
  );
}
