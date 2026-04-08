'use client';

import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "xterm";
import { AttachAddon } from "xterm-addon-attach";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

type TerminalProps = {
  wsUrl?: string;
  buildLog?: string;
};

export default function Terminal({ wsUrl, buildLog }: TerminalProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hostRef.current) {
      return;
    }

    const terminal = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "JetBrains Mono, Fira Code, monospace",
      theme: {
        background: "#0d1117",
        foreground: "#e5e5e5",
        cursor: "#22d3ee",
        selectionBackground: "rgba(34,211,238,0.25)",
        black: "#0d1117",
        brightBlack: "#666666",
        cyan: "#22d3ee",
        brightCyan: "#67e8f9",
      },
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(hostRef.current);
    requestAnimationFrame(() => {
      try {
        fitAddon.fit();
      } catch {
        // Fit can race with layout in dev; a later resize will recover.
      }
    });

    terminal.writeln("BYOCC Terminal");
    terminal.writeln("");

    if (wsUrl) {
      terminal.writeln(`> Connecting to ${wsUrl}`);
      const socket = new WebSocket(wsUrl);
      const attachAddon = new AttachAddon(socket);
      terminal.loadAddon(attachAddon);
    } else {
      terminal.writeln("$ 等待连接到容器...");
      terminal.writeln("> 当前为前端占位模式，后续接入真实 WebSocket。");
    }

    if (buildLog) {
      terminal.writeln("");
      buildLog.split("\n").forEach((line) => terminal.writeln(line));
    }

    const handleResize = () => {
      try {
        fitAddon.fit();
      } catch {
        // Ignore transient resize timing errors during initial mount.
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      terminal.dispose();
    };
  }, [buildLog, wsUrl]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-b-2xl border border-[var(--border)] bg-[#0d1117] shadow-[0_-8px_30px_rgba(0,0,0,0.25)]">
      <div className="flex h-9 items-center justify-between border-b border-[var(--border)] bg-[color:rgba(10,10,10,0.92)] px-4">
        <span className="text-[0.7rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Terminal
        </span>
        <span className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: wsUrl ? "var(--status-success)" : "var(--status-warning)" }}
          />
          {wsUrl ? "已连接" : "未连接"}
        </span>
      </div>
      <div ref={hostRef} className="min-h-0 flex-1 px-2 py-2" />
    </div>
  );
}
