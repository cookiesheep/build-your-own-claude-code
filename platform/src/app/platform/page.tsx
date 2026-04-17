import Link from "next/link";

import { LABS } from "@/lib/labs";
import PlatformLabCards from "@/components/PlatformLabCards";
import ScrollReactiveOrbs from "@/components/ScrollReactiveOrbs";

export const metadata = {
  title: "BYOCC — 选择 Lab",
};

export default function PlatformPage() {
  return (
    <div className="grid-pattern relative min-h-[calc(100vh-56px)] overflow-y-auto bg-[var(--bg-page)] pt-14">
      <ScrollReactiveOrbs />
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col px-6 pb-16 pt-12 sm:px-8 lg:px-10">
        <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--bg-panel)] px-8 py-10 shadow-[0_24px_80px_rgba(0,0,0,0.25)] sm:px-10 sm:py-12">
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at top right, rgba(212,165,116,0.1), transparent 32%), radial-gradient(circle at bottom left, rgba(139,157,175,0.06), transparent 28%)',
            }}
          />
          <div className="relative max-w-4xl">
            <div
              className="mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.22em]"
              style={{
                borderColor: 'var(--accent-border)',
                color: 'var(--accent)',
                background: 'var(--accent-button-bg)',
              }}
            >
              BYOCC Teaching Platform
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
                className="inline-flex items-center justify-center rounded-2xl border border-[var(--border-hover)] bg-transparent px-5 py-3 text-sm font-medium text-[var(--text-primary)] transition-colors duration-200 hover:border-[var(--accent)] hover:bg-[var(--accent-button-bg)]"
              >
                开始 Lab 0
              </Link>
              <Link
                href="/lab/3"
                className="inline-flex items-center justify-center rounded-2xl border px-5 py-3 text-sm font-medium transition duration-200 hover:brightness-110"
                style={{
                  borderColor: 'var(--accent-dark)',
                  background: 'var(--accent-button-bg)',
                  color: 'var(--accent-button-text)',
                  boxShadow: '0 14px 30px rgba(212,165,116,0.12)',
                }}
              >
                直接看 Lab 3 ★
              </Link>
            </div>
          </div>
        </section>

        <PlatformLabCards labs={LABS} />
      </div>
    </div>
  );
}
