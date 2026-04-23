'use client';

import { useState } from 'react';
import type { LabMeta } from '@/lib/labs';
import PlatformTimeline from './PlatformTimeline';
import LabDetailPanel from './LabDetailPanel';

interface PlatformClientLayoutProps {
  labs: LabMeta[];
  labContents?: Record<number, string>;
}

export default function PlatformClientLayout({ labs, labContents }: PlatformClientLayoutProps) {
  const [selectedId, setSelectedId] = useState(() => {
    const active = labs.find((l) => l.status === 'in_progress');
    return active ? active.id : labs[0]?.id ?? 0;
  });

  const selectedLab = labs.find((l) => l.id === selectedId) ?? labs[0];

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 gap-4 px-6 pb-6 sm:px-8 lg:px-10">
      {/* Left: Timeline sidebar */}
      <aside className="hidden w-56 flex-shrink-0 md:block">
        <div className="sticky top-20 rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-3">
          <PlatformTimeline
            labs={labs}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
      </aside>

      {/* Right: Detail panel */}
      <div className="min-w-0 flex-1">
        <LabDetailPanel lab={selectedLab} markdownContent={labContents?.[selectedLab.id]} />
      </div>

      {/* Mobile: horizontal lab selector */}
      <div className="fixed inset-x-0 bottom-0 z-40 block md:hidden">
        <div className="border-t border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 backdrop-blur-lg">
          <div className="flex gap-2 overflow-x-auto">
            {labs.map((lab) => (
              <button
                key={lab.id}
                onClick={() => setSelectedId(lab.id)}
                className="flex flex-shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-colors"
                style={{
                  borderColor: lab.id === selectedId ? 'var(--accent)' : 'var(--border)',
                  background: lab.id === selectedId ? 'var(--accent-button-bg)' : 'transparent',
                  color: lab.id === selectedId ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                <span>{lab.emoji}</span>
                <span>{lab.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
