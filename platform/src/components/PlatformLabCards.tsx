'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { STATUS_LABELS } from '@/lib/labs';

interface Lab {
  id: number;
  name: string;
  desc: string;
  emoji: string;
  tag: string;
  status: string;
  highlight?: boolean;
}

function LabCard({ lab, index, visible }: { lab: Lab; index: number; visible: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
    el.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
  };

  return (
    <Link
      ref={ref}
      href={`/lab/${lab.id}`}
      className="group relative overflow-hidden rounded-[24px] border bg-[var(--bg-panel)] p-5"
      style={{
        borderColor: lab.highlight ? 'var(--accent-border)' : 'var(--border)',
        boxShadow: lab.highlight
          ? '0 0 0 1px rgba(212,165,116,0.06), 0 18px 48px rgba(212,165,116,0.06)'
          : '0 12px 36px rgba(0,0,0,0.15)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.5s ease ${index * 0.08}s, transform 0.5s ease ${index * 0.08}s, border-color 0.2s, box-shadow 0.2s`,
      }}
      onMouseMove={handleMouseMove}
    >
      {/* Mouse spotlight */}
      <div
        className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: 'radial-gradient(400px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(212,165,116,0.1), transparent 50%)',
        }}
      />
      {/* Hover gradient */}
      <div className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(212,165,116,0.04), transparent 65%)' }}
        />
      </div>
      {/* Hover border */}
      <div className="absolute inset-0 rounded-[24px] border border-transparent transition-colors duration-200 group-hover:border-[var(--accent)]" aria-hidden="true" />

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
              color: lab.highlight ? 'var(--accent)' : 'var(--text-secondary)',
              borderColor: lab.highlight ? 'var(--accent-border)' : 'var(--border)',
              background: lab.highlight ? 'var(--accent-button-bg)' : 'rgba(255,255,255,0.02)',
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
                  lab.status === 'completed'
                    ? 'var(--status-success)'
                    : lab.status === 'in_progress'
                      ? 'var(--status-progress)'
                      : 'var(--text-disabled)',
              }}
            />
            <span>{STATUS_LABELS[lab.status as keyof typeof STATUS_LABELS]}</span>
          </div>
          <span className="text-sm font-medium text-[var(--accent)] transition-transform duration-200 group-hover:translate-x-1">
            开始 →
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function PlatformLabCards({ labs }: { labs: Lab[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {labs.map((lab, i) => (
        <LabCard key={lab.id} lab={lab} index={i} visible={visible} />
      ))}
    </section>
  );
}
