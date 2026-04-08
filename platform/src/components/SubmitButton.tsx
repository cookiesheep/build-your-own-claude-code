'use client';

import { useTransition } from "react";

type SubmitButtonProps = {
  onSubmit: () => Promise<void>;
};

export default function SubmitButton({ onSubmit }: SubmitButtonProps) {
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
      className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-70"
      style={{
        background: "var(--accent-button-bg)",
        color: "var(--accent-button-text)",
        borderColor: "var(--accent-dark)",
        boxShadow: isPending
          ? "0 0 0 1px rgba(34,211,238,0.15)"
          : "0 10px 24px rgba(8,145,178,0.18)",
      }}
    >
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{
          backgroundColor: isPending ? "var(--text-primary)" : "var(--accent)",
          animation: isPending ? "pulse-dot 1s ease-in-out infinite" : "none",
        }}
      />
      {isPending ? "构建中..." : "提交代码"}
    </button>
  );
}
