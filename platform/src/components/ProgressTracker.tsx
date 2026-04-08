import Link from "next/link";

import { LABS, STATUS_LABELS } from "@/lib/labs";

type ProgressTrackerProps = {
  currentLabId: number;
};

export default function ProgressTracker({
  currentLabId,
}: ProgressTrackerProps) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/80 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          进度追踪
        </h3>
        <span className="text-xs text-[var(--text-muted)]">
          {LABS.filter((lab) => lab.status === "completed").length}/{LABS.length}
        </span>
      </div>
      <div className="space-y-2">
        {LABS.map((lab) => {
          const isCurrent = lab.id === currentLabId;
          const prefix =
            lab.status === "completed"
              ? "✓"
              : lab.status === "in_progress"
                ? "●"
                : "○";

          return (
            <Link
              key={lab.id}
              href={`/lab/${lab.id}`}
              className="flex items-center justify-between rounded-xl border px-3 py-2 transition-colors duration-150 hover:border-[var(--border-hover)] hover:bg-[var(--surface-hover)]"
              style={{
                borderColor: isCurrent ? "rgba(34,211,238,0.35)" : "var(--border)",
                background: isCurrent
                  ? "linear-gradient(90deg, rgba(34,211,238,0.12), rgba(34,211,238,0.02))"
                  : "transparent",
              }}
            >
              <span className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                <span className="w-4 text-center">{prefix}</span>
                <span className="text-xs">{lab.emoji}</span>
                <span>Lab {lab.id}</span>
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                {STATUS_LABELS[lab.status]}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
