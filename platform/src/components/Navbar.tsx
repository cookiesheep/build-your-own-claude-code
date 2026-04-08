'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LABS, STATUS_COLORS } from "@/lib/labs";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-6 border-b border-[var(--surface-hover)] bg-[color:rgba(10,10,10,0.86)] px-6 backdrop-blur-xl"
      aria-label="Primary"
    >
      <Link
        href="/"
        className="flex shrink-0 flex-col gap-0.5 text-decoration-none"
      >
        <span className="text-[0.95rem] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
          ⚗️ Build Your Own Claude Code
        </span>
        <span className="text-[0.63rem] uppercase tracking-[0.22em] text-[var(--text-muted)]">
          Learn Agent Harness Engineering
        </span>
      </Link>

      <div className="h-6 w-px bg-[var(--border)]" />

      <div className="flex min-w-0 flex-1 items-center overflow-x-auto">
        {LABS.map((lab) => {
          const isActive = pathname === `/lab/${lab.id}`;
          const isDone = lab.status === "completed";

          return (
            <Link
              key={lab.id}
              href={`/lab/${lab.id}`}
              className="group relative flex h-14 shrink-0 items-center gap-2 border-b-2 border-transparent px-4 text-[0.8rem] transition-all duration-150 hover:bg-[color:rgba(255,255,255,0.02)]"
              style={{
                color: isActive
                  ? "var(--accent)"
                  : isDone
                    ? "var(--text-primary)"
                    : "var(--text-muted)",
                borderBottomColor: isActive ? "var(--accent)" : "transparent",
                background:
                  lab.highlight && !isActive
                    ? "linear-gradient(180deg, rgba(34,211,238,0.08), rgba(34,211,238,0.02))"
                    : "transparent",
              }}
            >
              <span className="text-[0.78rem]">{lab.emoji}</span>
              <span>{isDone ? "✓ " : ""}Lab {lab.id}</span>
              {lab.highlight ? (
                <span className="rounded-full border border-[color:rgba(34,211,238,0.35)] bg-[color:rgba(34,211,238,0.12)] px-1.5 py-0.5 text-[0.58rem] font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
                  Core
                </span>
              ) : null}
              {!isActive ? (
                <span className="pointer-events-none absolute inset-x-3 bottom-0 h-px scale-x-0 bg-[var(--border-hover)] transition-transform duration-150 group-hover:scale-x-100" />
              ) : null}
            </Link>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: STATUS_COLORS.completed }}
        />
        <span className="text-[0.72rem] text-[var(--text-muted)]">容器未连接</span>
      </div>
    </nav>
  );
}
