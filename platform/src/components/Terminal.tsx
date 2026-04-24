'use client';

import { useEffect, useRef, useState } from "react";
import type { IDisposable } from "xterm";
import { Terminal as XTerm } from "xterm";
import "xterm/css/xterm.css";

import { useTheme } from "./ThemeProvider";

type TerminalProps = {
  wsUrl?: string;
  buildLog?: string;
  waitingMessage?: string;
  showProgress?: boolean;
};

type ConnectionState = "idle" | "connecting" | "connected" | "closed" | "error";

const TTYD_COMMAND = {
  output: "0",
  setWindowTitle: "1",
  setPreferences: "2",
  input: "0",
  resizeTerminal: "1",
} as const;

const ESTIMATED_CONNECT_SECONDS = 35;

const DARK_THEME = {
  background: "#0d1117",
  foreground: "#e5e5e5",
  cursor: "#22d3ee",
  selectionBackground: "rgba(34,211,238,0.25)",
  black: "#0d1117",
  brightBlack: "#666666",
  cyan: "#22d3ee",
  brightCyan: "#67e8f9",
};

const LIGHT_THEME = {
  background: "#f8f6f1",
  foreground: "#1a1a1a",
  cursor: "#0891b2",
  selectionBackground: "rgba(8,145,178,0.2)",
  black: "#f8f6f1",
  brightBlack: "#9ca3af",
  cyan: "#0891b2",
  brightCyan: "#06b6d4",
};

function useElapsedSeconds(): number {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return elapsedSeconds;
}

function TerminalWaitingPanel({
  buildLog,
  waitingMessage,
  showProgress = false,
}: Pick<TerminalProps, "buildLog" | "showProgress" | "waitingMessage">) {
  const elapsedSeconds = useElapsedSeconds();
  const progress = Math.min((elapsedSeconds / ESTIMATED_CONNECT_SECONDS) * 100, 96);
  const phase =
    elapsedSeconds < 8
      ? "正在等待构建完成"
      : elapsedSeconds < 25
        ? "正在准备容器终端"
        : "连接时间较长，仍在等待后端返回终端地址";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden border border-[var(--border)] bg-[var(--bg-panel)]">
      <TerminalHeader state={showProgress ? "connecting" : "idle"} />
      <div className="flex min-h-0 flex-1 flex-col justify-between p-5">
        <div>
          {showProgress ? (
            <>
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span>{phase}</span>
                <span>已等待 {elapsedSeconds}s / 预计 {ESTIMATED_CONNECT_SECONDS}s</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-hover)]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent-dark),var(--accent))] transition-[width] duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          ) : (
            <div className="text-xs text-[var(--text-secondary)]">
              {waitingMessage ?? "实验环境未启动"}
            </div>
          )}
          <div className="mt-4 rounded-xl border border-[color:rgba(34,211,238,0.18)] bg-[color:rgba(34,211,238,0.06)] p-3 text-xs leading-6 text-[var(--text-secondary)]">
            点击「启动实验环境」后，平台会创建 Docker 容器并返回真实 ttyd 终端地址。
            如果启动超过 60 秒，请检查后端和 Docker 容器状态。
          </div>
        </div>

        {buildLog ? (
          <pre className="mt-4 max-h-36 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] p-3 text-xs leading-5 text-[var(--text-secondary)]">
            {buildLog}
          </pre>
        ) : (
          <div className="mt-4 font-mono text-xs text-[var(--text-muted)]">
            $ {waitingMessage ?? "等待启动实验环境..."}
          </div>
        )}
      </div>
    </div>
  );
}

function TerminalHeader({ state }: { state: ConnectionState }) {
  const status = {
    idle: { label: "未启动", color: "var(--text-disabled)" },
    connecting: { label: "连接中", color: "var(--status-warning)" },
    connected: { label: "已连接", color: "var(--status-success)" },
    closed: { label: "已关闭", color: "var(--text-disabled)" },
    error: { label: "连接失败", color: "var(--status-error)" },
  }[state];

  return (
    <div className="flex h-9 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-panel)] px-4">
      <span className="text-[0.7rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">
        Terminal
      </span>
      <span className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: status.color }} />
        {status.label}
      </span>
    </div>
  );
}

function estimateTerminalSize(host: HTMLDivElement) {
  const cols = Math.max(40, Math.floor(host.clientWidth / 8.4));
  const rows = Math.max(12, Math.floor(host.clientHeight / 18));

  return { cols, rows };
}

function resolveWebSocketUrl(wsUrl: string): string {
  if (wsUrl.startsWith("/")) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}${wsUrl}`;
  }

  return wsUrl;
}

function ConnectedTerminal({
  wsUrl,
  buildLog,
}: Required<Pick<TerminalProps, "buildLog" | "wsUrl">>) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const socketDisposablesRef = useRef<IDisposable[]>([]);
  const lastBuildLogRef = useRef<string>("");
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const { theme } = useTheme();
  const resolvedWsUrl = resolveWebSocketUrl(wsUrl);

  const disposeSocketDisposables = () => {
    socketDisposablesRef.current.forEach((disposable) => disposable.dispose());
    socketDisposablesRef.current = [];
  };

  useEffect(() => {
    let disposed = false;
    let setupTimer: number | null = null;
    let resizeObserver: ResizeObserver | null = null;

    setupTimer = window.setTimeout(() => {
      const host = hostRef.current;
      if (!host || disposed) {
        return;
      }

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const size = estimateTerminalSize(host);
      const terminal = new XTerm({
        cols: size.cols,
        rows: size.rows,
        convertEol: true,
        cursorBlink: true,
        fontSize: 13,
        fontFamily: "JetBrains Mono, Fira Code, monospace",
        theme: theme === "light" ? LIGHT_THEME : DARK_THEME,
      });

      terminalRef.current = terminal;
      terminal.open(host);
      terminal.writeln("BYOCC Terminal");
      terminal.writeln(`> Connecting to ${resolvedWsUrl}`);

      const socket = new WebSocket(resolvedWsUrl, ["tty"]);
      socket.binaryType = "arraybuffer";
      socketRef.current = socket;

      const sendInput = (data: string | Uint8Array) => {
        if (socket.readyState !== WebSocket.OPEN) {
          return;
        }

        if (typeof data === "string") {
          socket.send(encoder.encode(`${TTYD_COMMAND.input}${data}`));
          return;
        }

        const payload = new Uint8Array(data.length + 1);
        payload[0] = TTYD_COMMAND.input.charCodeAt(0);
        payload.set(data, 1);
        socket.send(payload);
      };

      const sendResize = (cols: number, rows: number) => {
        if (socket.readyState !== WebSocket.OPEN) {
          return;
        }

        socket.send(
          encoder.encode(
            `${TTYD_COMMAND.resizeTerminal}${JSON.stringify({ columns: cols, rows })}`,
          ),
        );
      };

      const resizeTerminalToHost = () => {
        if (disposed || !hostRef.current) {
          return;
        }

        const nextSize = estimateTerminalSize(hostRef.current);
        if (terminal.cols !== nextSize.cols || terminal.rows !== nextSize.rows) {
          terminal.resize(nextSize.cols, nextSize.rows);
          sendResize(nextSize.cols, nextSize.rows);
        }
      };

      resizeObserver = new ResizeObserver(() => {
        window.requestAnimationFrame(resizeTerminalToHost);
      });
      resizeObserver.observe(host);

      socket.addEventListener("open", () => {
        if (disposed || terminalRef.current !== terminal) {
          socket.close();
          return;
        }

        setConnectionState("connected");
        terminal.writeln("> WebSocket connected. 输入命令开始使用容器终端。");
        socket.send(encoder.encode(JSON.stringify({ columns: terminal.cols, rows: terminal.rows })));

        socketDisposablesRef.current = [
          terminal.onData((data) => sendInput(data)),
          terminal.onBinary((data) =>
            sendInput(Uint8Array.from(data, (value) => value.charCodeAt(0))),
          ),
          terminal.onResize(({ cols, rows }) => sendResize(cols, rows)),
        ];

        terminal.focus();
      });

      socket.addEventListener("message", (event) => {
        const rawData = event.data;
        let command = "";
        let payload = "";

        if (typeof rawData === "string") {
          command = rawData.charAt(0);
          payload = rawData.slice(1);
        } else if (rawData instanceof ArrayBuffer) {
          const bytes = new Uint8Array(rawData);
          command = String.fromCharCode(bytes[0]);
          payload = decoder.decode(bytes.slice(1));
        } else {
          return;
        }

        switch (command) {
          case TTYD_COMMAND.output:
            terminal.write(payload);
            break;
          case TTYD_COMMAND.setWindowTitle:
            document.title = payload || "Build Your Own Claude Code";
            break;
          case TTYD_COMMAND.setPreferences:
            break;
          default:
            terminal.writeln(`> Unknown ttyd command: ${command}`);
        }
      });

      socket.addEventListener("error", () => {
        if (!disposed) {
          setConnectionState("error");
          terminal.writeln("> WebSocket connection failed. 请确认后端 server 正在运行。");
        }
      });

      socket.addEventListener("close", (event) => {
        if (!disposed) {
          setConnectionState("closed");
          terminal.writeln(
            `> WebSocket closed (${event.code}${event.reason ? `: ${event.reason}` : ""}).`,
          );
        }
      });
    }, 120);

    return () => {
      disposed = true;
      if (setupTimer !== null) {
        window.clearTimeout(setupTimer);
      }
      resizeObserver?.disconnect();
      disposeSocketDisposables();
      socketRef.current?.close();
      socketRef.current = null;
      terminalRef.current?.dispose();
      terminalRef.current = null;
    };
  }, [resolvedWsUrl, theme]);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal || !buildLog || lastBuildLogRef.current === buildLog) {
      return;
    }

    lastBuildLogRef.current = buildLog;
    terminal.writeln("");
    terminal.writeln("----- build log -----");
    buildLog.split("\n").forEach((line) => terminal.writeln(line));
    terminal.writeln("---------------------");
  }, [buildLog]);

  const bgColor = theme === "light" ? "#f8f6f1" : "#0d1117";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden border border-[var(--border)]" style={{ background: bgColor }}>
      <TerminalHeader state={connectionState} />
      <div ref={hostRef} className="min-h-0 flex-1 px-2 py-2" />
    </div>
  );
}

export default function Terminal({
  wsUrl,
  buildLog = "",
  waitingMessage,
  showProgress = false,
}: TerminalProps) {
  if (!wsUrl) {
    return (
      <TerminalWaitingPanel
        buildLog={buildLog}
        showProgress={showProgress}
        waitingMessage={waitingMessage}
      />
    );
  }

  return <ConnectedTerminal wsUrl={wsUrl} buildLog={buildLog} />;
}
