'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import type { LabMeta } from '@/lib/labs';
import { STATUS_LABELS, DOCS_BASE_URL } from '@/lib/labs';
import { useTheme } from './ThemeProvider';
import MarkdownRenderer from './MarkdownRenderer';
import {
  tokenizeLine,
  TOKEN_COLORS_DARK,
  TOKEN_COLORS_LIGHT,
  SNIPPETS,
  type TokenType,
} from '@/lib/syntax-tokenizer';

interface LabDetailPanelProps {
  lab: LabMeta;
  markdownContent?: string;
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  completed: { bg: 'rgba(126,191,142,0.1)', color: 'var(--status-success)' },
  in_progress: { bg: 'rgba(212,165,116,0.1)', color: 'var(--status-warning)' },
  not_started: { bg: 'rgba(107,101,96,0.1)', color: 'var(--text-muted)' },
};

const DIFFICULTY_STYLES: Record<string, { label: string; color: string }> = {
  easy: { label: 'Easy', color: 'var(--status-success)' },
  medium: { label: 'Medium', color: 'var(--status-warning)' },
  hard: { label: 'Hard', color: 'var(--status-error)' },
};

/** Take the first N ## sections from markdown, stripping admonitions to avoid <div>-in-<p>. */
function truncateMarkdown(md: string, maxSections: number, labId: number): string {
  if (!md) return '';
  const lines = md.split('\n');
  const result: string[] = [];
  let sectionCount = 0;
  let inFirstH1 = true;
  let inAdmonition = false;

  for (const line of lines) {
    // Skip admonition blocks (cause <div>-in-<p> hydration error)
    if (line.match(/^!!!\s/)) { inAdmonition = true; continue; }
    if (inAdmonition) {
      if (line === '' || line.match(/^\s{4}\S/) || line.match(/^\t\S/)) continue;
      inAdmonition = false;
    }

    if (line.startsWith('## ')) {
      sectionCount++;
      if (sectionCount > maxSections) break;
      inFirstH1 = false;
    } else if (line.startsWith('# ') && inFirstH1) {
      inFirstH1 = false;
      continue;
    }
    result.push(line);
  }

  let text = result.join('\n').trim();

  // Rewrite relative .md links to lab page (e.g. "./tasks.md" → "/lab/3")
  text = text.replace(
    /\[([^\]]*)\]\(\.?\/?[^)]*\.md\)/g,
    `[$1](/lab/${labId})`,
  );

  return text;
}

export default function LabDetailPanel({ lab, markdownContent }: LabDetailPanelProps) {
  const { theme } = useTheme();
  const colors = theme === 'light' ? TOKEN_COLORS_LIGHT : TOKEN_COLORS_DARK;

  const snippet = SNIPPETS.find((s) => s.labId === lab.id);
  const codeLines = snippet ? snippet.lines.slice(0, 8) : [];
  const statusStyle = STATUS_STYLES[lab.status] || STATUS_STYLES.not_started;
  const diffStyle = DIFFICULTY_STYLES[lab.difficulty] || DIFFICULTY_STYLES.easy;

  const truncatedMd = useMemo(
    () => truncateMarkdown(markdownContent || '', 3, lab.id),
    [markdownContent, lab.id],
  );

  // Typing animation
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
    }, 120);

    return () => {
      if (typingRef.current) clearInterval(typingRef.current);
    };
  }, [lab.id, codeLines.length]);

  const [hoveredLine, setHoveredLine] = useState(-1);

  return (
    <div
      key={lab.id}
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-6 shadow-lg"
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
          {/* Difficulty + Time */}
          <span
            className="rounded-full px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.12em]"
            style={{ color: diffStyle.color, background: `${diffStyle.color}15` }}
          >
            {diffStyle.label}
          </span>
          <span className="text-[0.65rem] text-[var(--text-muted)]">
            {lab.estimatedTime}
          </span>
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
      <div className="my-3 h-px bg-[var(--border)]" />

      {/* Description */}
      <p className="text-sm leading-7 text-[var(--text-secondary)]">
        {lab.desc}
      </p>

      {/* Terminal code preview (compressed) */}
      {codeLines.length > 0 && (
        <div className="mt-3 flex-shrink-0 overflow-hidden rounded-xl border border-[var(--border)]">
          {/* Terminal title bar */}
          <div
            className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-1.5"
            style={{
              background: theme === 'dark' ? 'rgba(13,17,23,0.6)' : 'rgba(248,246,241,0.6)',
            }}
          >
            <span className="h-2 w-2 rounded-full bg-[var(--status-error)] opacity-60" />
            <span className="h-2 w-2 rounded-full bg-[var(--status-warning)] opacity-60" />
            <span className="h-2 w-2 rounded-full bg-[var(--status-success)] opacity-60" />
            <span className="ml-3 text-[0.6rem] text-[var(--text-muted)]">
              {lab.id === 0 ? 'README.md' : `lab-0${lab.id}.ts`}
            </span>
          </div>

          {/* Code body */}
          <div
            className="relative overflow-hidden p-3"
            style={{
              background: theme === 'dark' ? '#0d1117' : '#f8f6f1',
              maxHeight: '180px',
            }}
          >
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
              className="text-xs leading-5"
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
                  <span
                    className="mr-3 inline-block w-4 select-none text-right"
                    style={{
                      color: hoveredLine === i ? 'var(--accent)' : 'var(--text-disabled)',
                      transition: 'color 0.15s',
                    }}
                  >
                    {i + 1}
                  </span>
                  <span>
                    {tokenizeLine(line).map((token, ti) => (
                      <span key={ti} style={{ color: colors[token.type as TokenType] }}>
                        {token.text}
                      </span>
                    ))}
                  </span>
                </div>
              ))}
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

      {/* Markdown content section */}
      {truncatedMd && (
        <div className="mt-4 flex-1 overflow-y-auto rounded-xl border border-[var(--border)] p-4">
          <div className="markdown-body text-sm">
            <MarkdownRenderer content={truncatedMd} />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-shrink-0 items-center gap-3">
        {lab.enabled ? (
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
        ) : (
          <span
            className="inline-flex items-center justify-center rounded-xl border px-5 py-2.5 text-sm font-medium"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--text-muted)',
              background: 'var(--surface-hover)',
              cursor: 'not-allowed',
              opacity: 0.7,
            }}
          >
            开发中...
          </span>
        )}
        <a
          href={`${DOCS_BASE_URL}/lab-${String(lab.id).padStart(2, '0')}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[var(--text-muted)] underline decoration-dotted underline-offset-4 transition-colors hover:text-[var(--accent)]"
        >
          查看完整文档 ↗
        </a>
      </div>
    </div>
  );
}
