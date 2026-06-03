'use client';

import { useEffect, useState } from 'react';
import type { LabMeta } from '@/lib/labs';
import { getLeaderboard, type LeaderboardData } from '@/lib/api';
import PlatformTimeline from './PlatformTimeline';
import LabDetailPanel from './LabDetailPanel';
import LeaderboardPanel from './LeaderboardPanel';

interface PlatformClientLayoutProps {
  labs: LabMeta[];
  labContents?: Record<number, string>;
}

export default function PlatformClientLayout({ labs, labContents }: PlatformClientLayoutProps) {
  const [selectedId, setSelectedId] = useState(() => {
    const active = labs.find((l) => l.status === 'in_progress');
    return active ? active.id : labs[0]?.id ?? 0;
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    getLeaderboard()
      .then((data) => {
        if (alive) setLeaderboard(data);
      })
      .catch(() => {
        if (alive) setLeaderboard(null);
      })
      .finally(() => {
        if (alive) setLeaderboardLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const selectedLab = labs.find((l) => l.id === selectedId) ?? labs[0];

  return (
    <div className="relative z-10 mx-auto grid w-full max-w-[90rem] flex-1 grid-cols-1 gap-4 px-6 pb-28 sm:px-8 md:grid-cols-[14rem_minmax(0,1fr)] md:pb-6 lg:grid-cols-[14rem_minmax(0,1fr)_20rem] lg:px-10 xl:grid-cols-[15rem_minmax(0,1fr)_22rem]">
      {/* Left: Timeline sidebar */}
      <aside className="hidden md:block">
        <div className="sticky top-20 rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-3">
          <PlatformTimeline
            labs={labs}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
      </aside>

      {/* Center: Detail panel */}
      <div className="min-w-0 flex-1">
        <LabDetailPanel lab={selectedLab} markdownContent={labContents?.[selectedLab.id]} />
        <div className="mt-4 lg:hidden">
          <LeaderboardPanel
            data={leaderboard}
            loading={leaderboardLoading}
            collapsible
          />
        </div>
      </div>

      {/* Right: Leaderboard panel */}
      <aside className="hidden lg:block">
        <div className="sticky top-20">
          <LeaderboardPanel
            data={leaderboard}
            loading={leaderboardLoading}
          />
        </div>
      </aside>

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
