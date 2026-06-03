'use client';

import { useState, useEffect } from 'react';
import { LABS, type LabMeta } from '@/lib/labs';
import { getProgress, SESSION_STORAGE_KEY } from '@/lib/api';
import PlatformClientLayout from './PlatformClientLayout';

interface PlatformPageClientProps {
  labContents?: Record<number, string>;
}

export default function PlatformPageClient({ labContents }: PlatformPageClientProps) {
  const [labs, setLabs] = useState<LabMeta[]>(LABS);

  useEffect(() => {
    const sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId) return;

    getProgress(sessionId)
      .then((progress) => {
        setLabs((prev) =>
          prev.map((lab) => {
            const p = progress.labs.find((l) => l.labNumber === lab.id);
            if (!p) return lab;
            return { ...lab, status: p.completed ? 'completed' : 'not_started' };
          }),
        );
      })
      .catch(() => {
        // API unavailable — keep defaults
      });
  }, []);

  const completed = labs.filter((l) => l.status === 'completed').length;

  return (
    <>
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

          {/* Dynamic progress indicator */}
          <div className="hidden flex-shrink-0 sm:block">
            <div className="text-right">
              <span className="text-xs text-[var(--text-muted)]">
                {completed}/{labs.length} Labs
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-32 overflow-hidden rounded-full bg-[var(--surface-hover)]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(completed / labs.length) * 100}%`,
                  background: 'linear-gradient(90deg, var(--accent-dark), var(--accent))',
                }}
              />
            </div>
          </div>
        </header>
      </div>

      {/* Main split layout */}
      <PlatformClientLayout labs={labs} labContents={labContents} />
    </>
  );
}
