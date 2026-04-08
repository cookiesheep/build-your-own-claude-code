import Link from "next/link";

import { LABS, STATUS_LABELS } from "@/lib/labs";

export default function Home() {
  return (
    <div className="grid-pattern min-h-[calc(100vh-56px)] overflow-y-auto bg-[var(--bg-page)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col px-6 pb-16 pt-12 sm:px-8 lg:px-10">
        <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(17,17,17,0.96),rgba(10,10,10,0.92))] px-8 py-10 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:px-10 sm:py-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_28%)]" />
          <div className="relative max-w-4xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[color:rgba(34,211,238,0.25)] bg-[color:rgba(34,211,238,0.08)] px-3 py-1 text-xs uppercase tracking-[0.22em] text-[var(--accent)]">
              BYOCC Teaching Platform MVP
            </div>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
              Build Your Own Claude Code
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
              通过 6 个渐进式 Lab，从零实现 Agent Harness 核心，最终看到真实 Claude Code TUI
              由你的代码驱动。
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/lab/0"
                className="inline-flex items-center justify-center rounded-2xl border border-[var(--border-hover)] bg-transparent px-5 py-3 text-sm font-medium text-[var(--text-primary)] transition-colors duration-200 hover:border-[var(--accent)] hover:bg-[color:rgba(34,211,238,0.08)]"
              >
                开始 Lab 0
              </Link>
              <Link
                href="/lab/3"
                className="inline-flex items-center justify-center rounded-2xl border border-[var(--accent-dark)] bg-[var(--accent-button-bg)] px-5 py-3 text-sm font-medium text-[var(--accent-button-text)] shadow-[0_14px_30px_rgba(8,145,178,0.18)] transition duration-200 hover:brightness-110"
              >
                直接看 Lab 3 ★
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {LABS.map((lab) => (
            <Link
              key={lab.id}
              href={`/lab/${lab.id}`}
              className="group relative overflow-hidden rounded-[24px] border bg-[var(--bg-panel)] p-5 transition duration-200"
              style={{
                borderColor: lab.highlight ? "rgba(34,211,238,0.28)" : "#222222",
                boxShadow: lab.highlight
                  ? "0 0 0 1px rgba(34,211,238,0.06), 0 18px 48px rgba(34,211,238,0.08)"
                  : "0 12px 36px rgba(0,0,0,0.24)",
              }}
            >
              <div className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(34,211,238,0.05),transparent_65%)]" />
              </div>
              <div
                className="absolute inset-0 rounded-[24px] border border-transparent transition-colors duration-200 group-hover:border-[var(--accent)]"
                aria-hidden="true"
              />
              <div className="relative flex h-full flex-col">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{lab.emoji}</span>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                        Lab {lab.id}
                      </p>
                      <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                        {lab.name}
                      </h2>
                    </div>
                  </div>
                  <span
                    className="rounded-full border px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.15em]"
                    style={{
                      color: lab.highlight ? "var(--accent)" : "var(--text-secondary)",
                      borderColor: lab.highlight
                        ? "rgba(34,211,238,0.35)"
                        : "var(--border)",
                      background: lab.highlight
                        ? "rgba(34,211,238,0.08)"
                        : "rgba(255,255,255,0.02)",
                    }}
                  >
                    {lab.tag}
                  </span>
                </div>

                <p className="mt-4 flex-1 text-sm leading-7 text-[var(--text-secondary)]">
                  {lab.desc}
                </p>

                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor:
                          lab.status === "completed"
                            ? "var(--status-success)"
                            : lab.status === "in_progress"
                              ? "var(--status-progress)"
                              : "var(--text-disabled)",
                      }}
                    />
                    <span>{STATUS_LABELS[lab.status]}</span>
                  </div>
                  <span className="text-sm font-medium text-[var(--accent)] transition-transform duration-200 group-hover:translate-x-1">
                    开始 →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
