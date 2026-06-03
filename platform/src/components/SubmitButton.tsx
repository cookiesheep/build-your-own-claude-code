'use client';

import { useTransition } from "react";

type SubmitButtonProps = {
  onSubmit: () => Promise<void>;
  compact?: boolean;
};

export default function SubmitButton({ onSubmit, compact }: SubmitButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(() => {
          void onSubmit();
        });
      }}
      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-70"
      style={{
        background: "var(--accent-button-bg)",
        color: "var(--accent-button-text)",
        borderColor: "var(--accent-dark)",
        boxShadow: isPending
          ? "0 0 0 1px rgba(34,211,238,0.15)"
          : "0 4px 12px rgba(8,145,178,0.15)",
      }}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{
          backgroundColor: isPending ? "var(--text-primary)" : "var(--accent)",
          animation: isPending ? "pulse-dot 1s ease-in-out infinite" : "none",
        }}
      />
      {isPending ? "构建中..." : compact ? "提交" : "提交代码"}
    </button>
  );
}
