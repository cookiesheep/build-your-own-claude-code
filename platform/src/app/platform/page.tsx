import { LABS } from "@/lib/labs";
import PlatformClientLayout from "@/components/PlatformClientLayout";
import ScrollReactiveOrbs from "@/components/ScrollReactiveOrbs";
import FloatingCodeBlocks from "@/components/FloatingCodeBlocks";

export const metadata = {
  title: "BYOCC — 选择 Lab",
};

export default function PlatformPage() {
  return (
    <div className="grid-pattern relative flex min-h-[calc(100vh-56px)] flex-col bg-[var(--bg-page)]">
      <FloatingCodeBlocks />
      <ScrollReactiveOrbs />

      {/* Compact hero bar */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-4 pt-5 sm:px-8 lg:px-10">
        <header className="flex items-end justify-between gap-4">
          <div>
            <div
              className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.22em]"
              style={{
                borderColor: 'var(--accent-border)',
                color: 'var(--accent)',
                background: 'var(--accent-button-bg)',
              }}
            >
              BYOCC Teaching Platform
            </div>
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:text-3xl">
              Build Your Own Claude Code
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              通过 6 个渐进式 Lab，从零实现 Agent Harness 核心。
            </p>
          </div>

          {/* Progress indicator */}
          <div className="hidden flex-shrink-0 sm:block">
            <div className="text-right">
              <span className="text-xs text-[var(--text-muted)]">
                {LABS.filter((l) => l.status === 'completed').length}/{LABS.length} Labs
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-32 overflow-hidden rounded-full bg-[var(--surface-hover)]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(LABS.filter((l) => l.status === 'completed').length / LABS.length) * 100}%`,
                  background: 'linear-gradient(90deg, var(--accent-dark), var(--accent))',
                }}
              />
            </div>
          </div>
        </header>
      </div>

      {/* Main split layout */}
      <PlatformClientLayout labs={LABS} />
    </div>
  );
}
