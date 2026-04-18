'use client';

import type { LabMeta, LabStatus } from '@/lib/labs';
import { useTheme } from './ThemeProvider';

interface PlatformTimelineProps {
  labs: LabMeta[];
  selectedId: number;
  onSelect: (id: number) => void;
}

const STATUS_CONFIG: Record<LabStatus, { dotClass: string; labelClass: string; icon: string }> = {
  completed: {
    dotClass: 'bg-[var(--accent)] text-[var(--bg-page)]',
    labelClass: 'text-[var(--text-primary)]',
    icon: '✓',
  },
  in_progress: {
    dotClass: 'bg-[var(--accent)] text-[var(--bg-page)] animate-[node-pulse_2s_ease-in-out_infinite]',
    labelClass: 'text-[var(--text-primary)]',
    icon: '▶',
  },
  not_started: {
    dotClass: 'border-2 border-[var(--text-disabled)] bg-transparent text-transparent',
    labelClass: 'text-[var(--text-muted)]',
    icon: '',
  },
};

function Connector({ type, delay }: { type: 'solid' | 'dashed'; delay: number }) {
  return (
    <div className="relative flex items-center" style={{ height: '28px', paddingLeft: '17px' }}>
      <div
        className="h-full"
        style={{
          width: '2px',
          background: type === 'solid'
            ? 'var(--accent)'
            : 'repeating-linear-gradient(to bottom, var(--text-disabled) 0px, var(--text-disabled) 4px, transparent 4px, transparent 8px)',
        }}
      />
      {/* Effect D: Data flow pulse dot on solid connectors */}
      {type === 'solid' && (
        <div
          className="absolute left-[14px] top-0 h-2 w-2 rounded-full"
          style={{
            background: 'var(--accent)',
            boxShadow: '0 0 6px var(--particle-glow)',
            animation: `data-flow 2.5s ease-in-out ${delay}s infinite`,
          }}
        />
      )}
    </div>
  );
}

export default function PlatformTimeline({ labs, selectedId, onSelect }: PlatformTimelineProps) {
  const { theme } = useTheme();

  return (
    <nav className="flex flex-col py-2" aria-label="Lab 选择">
      {labs.map((lab, i) => {
        const config = STATUS_CONFIG[lab.status];
        const isSelected = lab.id === selectedId;
        const isLast = i === labs.length - 1;

        // Connector type: solid if this lab OR the next one is completed/in_progress
        const nextCompleted = !isLast && (labs[i + 1].status === 'completed' || labs[i + 1].status === 'in_progress');
        const currentCompleted = lab.status === 'completed' || lab.status === 'in_progress';
        const connectorType = currentCompleted && nextCompleted ? 'solid' : 'dashed';

        return (
          <div key={lab.id}>
            <button
              onClick={() => onSelect(lab.id)}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200"
              style={{
                background: isSelected
                  ? theme === 'dark' ? 'rgba(212,165,116,0.08)' : 'rgba(193,127,78,0.08)'
                  : 'transparent',
                borderLeft: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
              }}
              aria-current={isSelected ? 'true' : undefined}
            >
              {/* Status dot */}
              <span
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition-transform duration-200 ${config.dotClass}`}
                style={lab.highlight ? { fontSize: '13px' } : undefined}
              >
                {lab.highlight && lab.status === 'not_started' ? '★' : config.icon || (
                  <span className="h-2 w-2 rounded-full bg-[var(--text-disabled)]" />
                )}
              </span>

              {/* Label */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[0.7rem] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Lab {lab.id}
                  </span>
                  {lab.highlight && (
                    <span className="text-[0.6rem] text-[var(--accent)]">★</span>
                  )}
                </div>
                <p className={`text-sm font-medium leading-tight ${config.labelClass}`}>
                  {lab.name}
                </p>
              </div>

              {/* Hover arrow */}
              <span
                className="text-xs text-[var(--accent)] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                style={{ opacity: isSelected ? 0.6 : undefined }}
              >
                →
              </span>
            </button>

            {!isLast && <Connector type={connectorType} delay={i * 0.4} />}
          </div>
        );
      })}
    </nav>
  );
}
