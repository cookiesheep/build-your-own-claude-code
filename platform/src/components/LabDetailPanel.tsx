'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import type { LabMeta } from '@/lib/labs';
import { STATUS_LABELS } from '@/lib/labs';
import { useTheme } from './ThemeProvider';
import {
  tokenizeLine,
  TOKEN_COLORS_DARK,
  TOKEN_COLORS_LIGHT,
  SNIPPETS,
  type TokenType,
} from '@/lib/syntax-tokenizer';

interface LabDetailPanelProps {
  lab: LabMeta;
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  completed: { bg: 'rgba(126,191,142,0.1)', color: 'var(--status-success)' },
  in_progress: { bg: 'rgba(212,165,116,0.1)', color: 'var(--status-warning)' },
  not_started: { bg: 'rgba(107,101,96,0.1)', color: 'var(--text-muted)' },
};

export default function LabDetailPanel({ lab }: LabDetailPanelProps) {
  const { theme } = useTheme();
  const colors = theme === 'light' ? TOKEN_COLORS_LIGHT : TOKEN_COLORS_DARK;

  const snippet = SNIPPETS.find((s) => s.labId === lab.id);
  const codeLines = snippet ? snippet.lines.slice(0, 14) : [];
  const statusStyle = STATUS_STYLES[lab.status] || STATUS_STYLES.not_started;

  // Effect A: Typing animation — lines appear one by one
  const [visibleCount, setVisibleCount] = useState(0);
  const [typingDone, setTypingDone] = useState(false);
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setVisibleCount(0);
    setTypingDone(false);

    if (codeLines.length === 0) {
      setTypingDone(true);
      return;
    }

    let count = 0;
    typingRef.current = setInterval(() => {
      count++;
      setVisibleCount(count);
      if (count >= codeLines.length) {
        if (typingRef.current) clearInterval(typingRef.current);
        setTypingDone(true);
      }
    }, 170);

    return () => {
      if (typingRef.current) clearInterval(typingRef.current);
    };
  }, [lab.id, codeLines.length]);

  // Effect E: Hovered code line
  const [hoveredLine, setHoveredLine] = useState(-1);

  return (
    <div
      key={lab.id}
      className="flex h-full flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-6 shadow-lg"
      style={{ animation: 'slideInRight 0.35s ease-out' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{lab.emoji}</span>
          <div>
            <p className="text-[0.7rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Lab {lab.id}
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
              {lab.name}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="rounded-full border px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.15em]"
            style={{
              borderColor: lab.highlight ? 'var(--accent-border)' : 'var(--border)',
              color: lab.highlight ? 'var(--accent)' : 'var(--text-secondary)',
              background: lab.highlight ? 'var(--accent-button-bg)' : 'transparent',
            }}
          >
            {lab.tag}
          </span>
          <span
            className="rounded-full px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.12em]"
            style={{ background: statusStyle.bg, color: statusStyle.color }}
          >
            {STATUS_LABELS[lab.status]}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="my-4 h-px bg-[var(--border)]" />

      {/* Description */}
      <p className="text-sm leading-7 text-[var(--text-secondary)]">
        {lab.desc}
      </p>

      {/* Code preview with Effects A/B/C/E */}
      {codeLines.length > 0 && (
        <div className="mt-5 flex-1 overflow-hidden rounded-xl border border-[var(--border)]">
          {/* Terminal title bar */}
          <div
            className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2"
            style={{
              background: theme === 'dark' ? 'rgba(13,17,23,0.6)' : 'rgba(248,246,241,0.6)',
            }}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--status-error)] opacity-60" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--status-warning)] opacity-60" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--status-success)] opacity-60" />
            <span className="ml-3 text-[0.65rem] text-[var(--text-muted)]">
              {lab.id === 0 ? 'README.md' : `lab-0${lab.id}.ts`}
            </span>
          </div>

          {/* Code body */}
          <div
            className="relative overflow-auto p-4"
            style={{
              background: theme === 'dark' ? '#0d1117' : '#f8f6f1',
              maxHeight: '340px',
            }}
          >
            {/* Effect C: Scan line */}
            <div
              className="pointer-events-none absolute left-0 right-0 h-px"
              style={{
                background: theme === 'dark'
                  ? 'linear-gradient(90deg, transparent, rgba(212,165,116,0.08), transparent)'
                  : 'linear-gradient(90deg, transparent, rgba(193,127,78,0.08), transparent)',
                animation: 'scan-line 4s linear infinite',
              }}
            />

            <pre
              className="text-xs leading-6"
              style={{ fontFamily: '"JetBrains Mono", "Fira Code", monospace' }}
            >
              {codeLines.slice(0, visibleCount).map((line, i) => (
                <div
                  key={i}
                  className="flex rounded"
                  style={{
                    background: hoveredLine === i
                      ? theme === 'dark' ? 'rgba(212,165,116,0.06)' : 'rgba(193,127,78,0.06)'
                      : 'transparent',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={() => setHoveredLine(i)}
                  onMouseLeave={() => setHoveredLine(-1)}
                >
                  {/* Line number */}
                  <span
                    className="mr-4 inline-block w-5 select-none text-right"
                    style={{
                      color: hoveredLine === i ? 'var(--accent)' : 'var(--text-disabled)',
                      transition: 'color 0.15s',
                    }}
                  >
                    {i + 1}
                  </span>

                  {/* Tokenized code */}
                  <span>
                    {tokenizeLine(line).map((token, ti) => (
                      <span key={ti} style={{ color: colors[token.type as TokenType] }}>
                        {token.text}
                      </span>
                    ))}
                  </span>
                </div>
              ))}

              {/* Effect B: Blinking cursor */}
              {typingDone && (
                <span
                  style={{
                    color: 'var(--accent)',
                    animation: 'cursor-blink 0.8s step-end infinite',
                    fontWeight: 'bold',
                  }}
                >
                  ▌
                </span>
              )}
            </pre>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-5 flex items-center gap-3">
        <Link
          href={`/lab/${lab.id}`}
          className="inline-flex items-center justify-center rounded-xl border px-5 py-2.5 text-sm font-medium transition duration-200 hover:brightness-110"
          style={{
            borderColor: 'var(--accent-dark)',
            background: 'var(--accent-button-bg)',
            color: 'var(--accent-button-text)',
            boxShadow: '0 10px 24px rgba(212,165,116,0.1)',
          }}
        >
          {lab.status === 'completed' ? '重新挑战' : lab.status === 'in_progress' ? '继续 Lab' : '开始 Lab'} →
        </Link>
        <span className="text-xs text-[var(--text-muted)]">
          {snippet?.labLabel}
        </span>
      </div>
    </div>
  );
}
