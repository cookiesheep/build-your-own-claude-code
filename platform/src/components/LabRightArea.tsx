"use client";

import { useCallback, useState } from "react";
import { Group, Panel, Separator, usePanelRef } from "react-resizable-panels";

import { fetchFileContent } from "@/lib/file-reader";
import {
  getLabInitialFiles,
  getPrimaryEditableLabFile,
} from "@/lib/file-tree-data";
import { STATUS_LABELS, type LabMeta } from "@/lib/labs";
import {
  createSession,
  ensurePlatformIdentity,
  getEnvironmentStatus,
  getTerminalWebSocketUrl,
  getWorkspace,
  resetEnvironment,
  saveWorkspace,
  startEnvironment,
  submitCode,
  type EnvironmentStatus,
  SESSION_STORAGE_KEY,
} from "@/lib/api";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState as useReactState } from "react";

import FileTree from "./FileTree";
import SubmitButton from "./SubmitButton";

const CodeEditor = dynamic(() => import("./CodeEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[var(--bg-panel)] text-sm text-[var(--text-secondary)]">
      正在初始化编辑器...
    </div>
  ),
});

const Terminal = dynamic(() => import("./Terminal"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[#0d1117] text-sm text-[var(--text-secondary)]">
      正在初始化终端...
    </div>
  ),
});

type LabRightAreaProps = {
  lab: LabMeta;
  onToggleDocs: () => void;
  docsCollapsed: boolean;
};

type BuildState = "idle" | "building" | "success" | "error";
type SaveState = "idle" | "loading" | "dirty" | "saving" | "saved" | "error";

function rewriteTerminalUrl(backendUrl: string, sessionId: string): string {
  if (!backendUrl) return "";
  try {
    const token = new URL(backendUrl).searchParams.get("token");
    const base = getTerminalWebSocketUrl(sessionId);
    return token ? `${base}?token=${encodeURIComponent(token)}` : base;
  } catch {
    return backendUrl;
  }
}

export default function LabRightArea({ lab, onToggleDocs, docsCollapsed }: LabRightAreaProps) {
  // Panel refs
  const fileTreePanelRef = usePanelRef();
  const [fileTreeCollapsed, setFileTreeCollapsed] = useReactState(false);

  // Workspace state
  const [workspaceFiles, setWorkspaceFiles] = useReactState<Record<string, string>>(
    getLabInitialFiles(lab.id),
  );
  const [activeEditableFile, setActiveEditableFile] = useReactState<string | null>(
    getPrimaryEditableLabFile(lab.id),
  );
  const [userId, setUserId] = useReactState<string>("");
  const [sessionId, setSessionId] = useReactState<string>("");
  const [environmentStatus, setEnvironmentStatus] = useReactState<EnvironmentStatus>("not_started");
  const [terminalUrl, setTerminalUrl] = useReactState<string>("");
  const [environmentMessage, setEnvironmentMessage] = useReactState<string>("");
  const [isStartingEnvironment, setIsStartingEnvironment] = useReactState(false);
  const [buildLog, setBuildLog] = useReactState<string>("");
  const [buildState, setBuildState] = useReactState<BuildState>("idle");
  const [saveState, setSaveState] = useReactState<SaveState>("loading");
  const [lastSavedAt, setLastSavedAt] = useReactState<string | null>(null);
  const [viewingFile, setViewingFile] = useReactState<string | null>(null);
  const [readOnlyContent, setReadOnlyContent] = useReactState<string | null>(null);
  const [readOnlyLanguage, setReadOnlyLanguage] = useReactState("typescript");
  const [readOnlyLoading, setReadOnlyLoading] = useReactState(false);
  const [readOnlyError, setReadOnlyError] = useReactState<string | null>(null);
  const saveRequestIdRef = useRef(0);
  const readOnlyRequestIdRef = useRef(0);

  // Bootstrap session
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        setSaveState("loading");
        const initialFiles = getLabInitialFiles(lab.id);
        setWorkspaceFiles(initialFiles);
        setActiveEditableFile(getPrimaryEditableLabFile(lab.id));
        readOnlyRequestIdRef.current += 1;
        setViewingFile(null);
        setReadOnlyContent(null);
        setReadOnlyError(null);
        setReadOnlyLoading(false);
        await ensurePlatformIdentity();
        const existingSessionId = window.localStorage.getItem(SESSION_STORAGE_KEY) ?? undefined;
        const session = await createSession(existingSessionId);
        if (cancelled) return;

        window.localStorage.setItem(SESSION_STORAGE_KEY, session.sessionId);
        setUserId(session.userId ?? "");
        setSessionId(session.sessionId);
        setEnvironmentStatus(session.environmentStatus);
        setEnvironmentMessage("");

        if (session.environmentStatus === "running") {
          const environment = await getEnvironmentStatus(session.sessionId);
          if (!cancelled) {
            setEnvironmentStatus(environment.environmentStatus);
            setTerminalUrl(environment.success ? rewriteTerminalUrl(environment.terminalUrl ?? "", session.sessionId) : "");
            setEnvironmentMessage(environment.message ?? "");
          }
        }

        const workspace = await getWorkspace(lab.id);
        if (!cancelled) {
          const mergedFiles = {
            ...initialFiles,
            ...workspace.files,
          };
          setWorkspaceFiles(mergedFiles);
          setActiveEditableFile((current) => current ?? Object.keys(mergedFiles)[0] ?? null);
          setLastSavedAt(workspace.updatedAt);
          setSaveState(workspace.updatedAt ? "saved" : "idle");
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Unknown session error";
          setEnvironmentStatus("error");
          setEnvironmentMessage(message);
          setSaveState("error");
        }
      }
    }

    void bootstrap();
    return () => { cancelled = true; };
  }, [lab.id]);

  // Auto-save
  useEffect(() => {
    if (saveState !== "dirty") return;

    const timer = window.setTimeout(() => {
      const requestId = saveRequestIdRef.current + 1;
      saveRequestIdRef.current = requestId;
      setSaveState("saving");
      void saveWorkspace(lab.id, workspaceFiles)
        .then((workspace) => {
          if (saveRequestIdRef.current === requestId) {
            setLastSavedAt(workspace.updatedAt);
            setSaveState("saved");
          }
        })
        .catch(() => {
          if (saveRequestIdRef.current === requestId) {
            setSaveState("error");
          }
        });
    }, 1500);

    return () => { window.clearTimeout(timer); };
  }, [lab.id, saveState, workspaceFiles]);

  const handleCodeChange = (value: string) => {
    if (!activeEditableFile) {
      return;
    }

    saveRequestIdRef.current += 1;
    setWorkspaceFiles((current) => ({
      ...current,
      [activeEditableFile]: value,
    }));
    setSaveState("dirty");
  };

  const handleFileSelect = async (path: string, isEditable: boolean) => {
    if (isEditable) {
      setActiveEditableFile(path);
      setViewingFile(null);
      setReadOnlyContent(null);
      setReadOnlyError(null);
      setReadOnlyLoading(false);
      return;
    }

    if (environmentStatus !== "running") {
      setReadOnlyError("请先启动实验环境再查看文件");
      return;
    }

    setViewingFile(path);
    const requestId = readOnlyRequestIdRef.current + 1;
    readOnlyRequestIdRef.current = requestId;
    setReadOnlyLoading(true);
    setReadOnlyError(null);
    setReadOnlyContent(null);
    try {
      const result = await fetchFileContent(path, sessionId);
      if (readOnlyRequestIdRef.current !== requestId) {
        return;
      }
      setReadOnlyContent(result.content);
      setReadOnlyLanguage(result.language);
    } catch (error) {
      if (readOnlyRequestIdRef.current !== requestId) {
        return;
      }
      setReadOnlyError(error instanceof Error ? error.message : "读取文件失败");
    } finally {
      if (readOnlyRequestIdRef.current === requestId) {
        setReadOnlyLoading(false);
      }
    }
  };

  const saveCurrentWorkspace = async () => {
    const requestId = saveRequestIdRef.current + 1;
    saveRequestIdRef.current = requestId;
    setSaveState("saving");
    try {
      const workspace = await saveWorkspace(lab.id, workspaceFiles);
      if (saveRequestIdRef.current === requestId) {
        setLastSavedAt(workspace.updatedAt);
        setSaveState("saved");
      }
    } catch (error) {
      if (saveRequestIdRef.current === requestId) {
        setSaveState("error");
      }
      throw error;
    }
  };

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
      setTerminalUrl(environment.success ? rewriteTerminalUrl(environment.terminalUrl ?? "", sessionId) : "");
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
      setEnvironmentMessage("请先点击「启动实验环境」。");
      return;
    }
    try {
      setBuildState("building");
      await saveCurrentWorkspace();
      const result = await submitCode(sessionId, workspaceFiles, lab.id);
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
      setTerminalUrl(environment.success ? rewriteTerminalUrl(environment.terminalUrl ?? "", sessionId) : "");
      setEnvironmentMessage(environment.message ?? "");
      setBuildLog("↺ 实验环境已重置，当前草稿已保留，请重新提交代码。");
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

  const toggleFileTree = useCallback(() => {
    const panel = fileTreePanelRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) {
      panel.expand();
    } else {
      panel.collapse();
    }
  }, [fileTreePanelRef]);

  const canSubmit = environmentStatus === "running";
  const environmentStatusText =
    environmentStatus === "not_started" ? "实验环境未启动"
      : environmentStatus === "starting" ? "实验环境启动中..."
      : environmentStatus === "running" ? "实验环境运行中"
      : environmentStatus === "expired" ? "实验环境已过期"
      : environmentStatus === "stopped" ? "实验环境已停止"
      : "实验环境异常";
  const statusText =
    buildState === "building" ? "构建中..."
      : buildState === "success" ? "✅ 构建成功"
      : buildState === "error" ? "❌ 构建失败"
      : `状态: ${STATUS_LABELS[lab.status]}`;
  const editorFileName = viewingFile ?? activeEditableFile ?? "main.ts";
  const editorCode = viewingFile
    ? (readOnlyContent ?? "")
    : (activeEditableFile ? (workspaceFiles[activeEditableFile] ?? "") : "");
  const isReadOnlyView = Boolean(viewingFile);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--bg-page)]">
      {/* Top bar with toggle buttons */}
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--bg-panel)] px-3">
        <button
          type="button"
          onClick={onToggleDocs}
          className="rounded px-2 py-1 text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          title={docsCollapsed ? "展开文档" : "收起文档"}
        >
          {docsCollapsed ? "📖 展开文档" : "📖 收起文档"}
        </button>
        <button
          type="button"
          onClick={toggleFileTree}
          className="rounded px-2 py-1 text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          title={fileTreeCollapsed ? "展开目录树" : "收起目录树"}
        >
          {fileTreeCollapsed ? "📁 展开文件" : "📁 收起文件"}
        </button>
        <span className="ml-auto text-xs text-[var(--text-muted)]">
          {saveState === "loading" ? "草稿加载中"
            : saveState === "dirty" ? "草稿未保存"
            : saveState === "saving" ? "保存中..."
            : saveState === "saved" ? `已保存${lastSavedAt ? ` ${lastSavedAt}` : ""}`
            : saveState === "error" ? "保存失败"
            : "尚无草稿"}
        </span>
      </div>

      {/* Main area: Editor top, Terminal bottom */}
      <div className="min-h-0 flex-1">
        <Group orientation="vertical" style={{ height: "100%" }}>
          <Panel defaultSize="55%" minSize="15%">
            <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
              {/* Editor row: FileTree | CodeEditor */}
              <div style={{ flex: 1, minHeight: 0 }}>
                <Group orientation="horizontal" style={{ height: "100%" }}>
                <Panel
                  panelRef={fileTreePanelRef}
                  defaultSize="18%"
                  minSize="12%"
                  maxSize="30%"
                  collapsible
                  collapsedSize="0%"
                  onResize={(size) => {
                    setFileTreeCollapsed(size.asPercentage === 0);
                  }}
                >
                  <div className="h-full overflow-hidden border-r border-[var(--border)] bg-[var(--bg-panel)]">
                    <FileTree
                      labId={lab.id}
                      activeFilePath={viewingFile ?? activeEditableFile}
                      onFileSelect={handleFileSelect}
                    />
                  </div>
                </Panel>

                {/* FileTree collapsed indicator */}
                {fileTreeCollapsed && (
                  <button
                    type="button"
                    onClick={toggleFileTree}
                    className="flex h-full w-6 shrink-0 items-center justify-center border-r border-[var(--border)] bg-[var(--bg-panel)] text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--accent)]"
                    title="展开文件目录"
                  >
                    <span className="rotate-0">📁</span>
                  </button>
                )}

                <Panel defaultSize="82%" minSize="40%">
                  <CodeEditor
                    code={editorCode}
                    fileName={editorFileName}
                    language={isReadOnlyView ? readOnlyLanguage : "typescript"}
                    readOnly={isReadOnlyView}
                    loading={readOnlyLoading}
                    loadingMessage="正在读取容器内文件..."
                    onChange={isReadOnlyView ? () => {} : handleCodeChange}
                  />
                </Panel>
              </Group>
            </div>

            {/* ActionBar */}
            <div className="flex h-11 shrink-0 items-center justify-between border-t border-[var(--border)] bg-[var(--bg-panel)] px-4">
              <div className="flex items-center gap-3">
                {isReadOnlyView ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setViewingFile(null);
                        readOnlyRequestIdRef.current += 1;
                        setReadOnlyContent(null);
                        setReadOnlyError(null);
                        setReadOnlyLoading(false);
                      }}
                      className="rounded-full border border-[color:rgba(34,211,238,0.35)] bg-[color:rgba(34,211,238,0.08)] px-3 py-1 text-xs text-[var(--accent)]"
                    >
                      只读: {editorFileName}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setViewingFile(null);
                        readOnlyRequestIdRef.current += 1;
                        setReadOnlyContent(null);
                        setReadOnlyError(null);
                        setReadOnlyLoading(false);
                      }}
                      className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                    >
                      返回编辑
                    </button>
                  </>
                ) : null}
                <SubmitButton onSubmit={handleSubmit} />
                <button
                  type="button"
                  disabled={!sessionId || isStartingEnvironment || environmentStatus === "running"}
                  onClick={() => { void handleStartEnvironment(); }}
                  className="rounded-xl border border-[color:rgba(34,211,238,0.35)] bg-[color:rgba(34,211,238,0.08)] px-3 py-1.5 text-sm text-[var(--accent)] transition-colors duration-150 hover:bg-[color:rgba(34,211,238,0.14)] disabled:cursor-not-allowed disabled:border-[var(--border)] disabled:bg-transparent disabled:text-[var(--text-disabled)]"
                >
                  {isStartingEnvironment ? "启动中..." : environmentStatus === "running" ? "环境已启动" : "启动实验环境"}
                </button>
                <button
                  type="button"
                  onClick={() => { void handleReset(); }}
                  className="rounded-xl border border-transparent px-3 py-1.5 text-sm text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                >
                  重置环境
                </button>
              </div>

              <div className="flex items-center gap-3 text-sm">
                {readOnlyError ? (
                  <div className="flex items-center gap-2 text-[var(--status-warning)]">
                    <span>{readOnlyError}</span>
                    {viewingFile ? (
                      <button
                        type="button"
                        onClick={() => {
                          void handleFileSelect(viewingFile, false);
                        }}
                        className="rounded border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
                      >
                        重试
                      </button>
                    ) : null}
                  </div>
                ) : null}
                <span className={canSubmit ? "text-[var(--status-success)]" : "text-[var(--text-secondary)]"}>
                  {environmentStatusText}
                </span>
                <span className="text-[var(--text-secondary)]">{statusText}</span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
                  {sessionId || "pending"}
                </span>
              </div>
            </div>
          </div>
        </Panel>

        <Separator style={{ height: 2, background: "var(--border)" }} />

        <Panel defaultSize="45%" minSize="15%">
          <Terminal
            buildLog={buildLog}
            showProgress={environmentStatus === "starting"}
            waitingMessage={environmentMessage || environmentStatusText}
            wsUrl={terminalUrl || undefined}
          />
        </Panel>
      </Group>
      </div>
    </div>
  );
}
