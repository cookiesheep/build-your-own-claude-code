'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { LeaderboardData, LeaderboardEntry } from '@/lib/api';
import byoccIcon from '@/app/icon.png';

const TOTAL_LABS = 6;
const SHARE_URL = 'https://byocc.cc/platform';

interface LeaderboardPanelProps {
  data: LeaderboardData | null;
  loading?: boolean;
  collapsible?: boolean;
}

function clampCompletedLabs(value: number): number {
  return Math.min(TOTAL_LABS, Math.max(0, value));
}

function getDisplayName(entry: LeaderboardEntry): string {
  return entry.nickname?.trim() || entry.username?.trim() || '匿名学习者';
}

function getInitial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '?';
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back for browsers that expose clipboard but deny this call.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

function Avatar({ entry }: { entry: LeaderboardEntry }) {
  const name = getDisplayName(entry);
  const backgroundImage = entry.avatarUrl ? `url(${JSON.stringify(entry.avatarUrl)})` : undefined;

  return (
    <span
      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-hover)] bg-cover bg-center text-[0.65rem] font-semibold text-[var(--accent)]"
      style={{ backgroundImage }}
      aria-hidden="true"
    >
      {!entry.avatarUrl ? getInitial(name) : null}
    </span>
  );
}

function LearnerRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const completedLabs = clampCompletedLabs(entry.completedLabs);
  const progress = (completedLabs / TOTAL_LABS) * 100;
  const displayName = getDisplayName(entry);

  return (
    <li className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-[var(--surface-hover)]">
      <span className="w-4 flex-shrink-0 text-right font-mono text-[0.65rem] tabular-nums text-[var(--text-disabled)]">
        {rank}
      </span>
      <Avatar entry={entry} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-[0.82rem] font-medium text-[var(--text-primary)]">
            {displayName}
          </p>
          <span className="flex-shrink-0 font-mono text-[0.68rem] tabular-nums text-[var(--text-muted)]">
            {completedLabs}/{TOTAL_LABS}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-hover)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </li>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2 px-2 py-1">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 py-2">
          <div className="h-7 w-7 rounded-full bg-[var(--surface-hover)]" />
          <div className="min-w-0 flex-1">
            <div className="h-3 w-2/3 rounded-full bg-[var(--surface-hover)]" />
            <div className="mt-2 h-1.5 rounded-full bg-[var(--surface-hover)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LeaderboardPanel({
  data,
  loading = false,
  collapsible = false,
}: LeaderboardPanelProps) {
  const [collapsed, setCollapsed] = useState(collapsible);
  const [copied, setCopied] = useState(false);
  const learners = data?.leaderboard ?? [];
  const totalLearners = data?.totalLearners ?? 0;
  const leaderboardLimit = data?.limit ?? learners.length;

  const handleShare = async () => {
    await copyText(SHARE_URL);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] shadow-lg">
      <button
        type="button"
        onClick={() => collapsible && setCollapsed((value) => !value)}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left lg:hidden"
        aria-expanded={!collapsed}
      >
        <span className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Learners
        </span>
        <span className="rounded-full border border-[var(--accent-border)] bg-[var(--accent-button-bg)] px-2 py-0.5 font-mono text-[0.68rem] text-[var(--accent)]">
          {totalLearners}
        </span>
      </button>

      <div className={collapsed ? 'hidden lg:block' : 'block'}>
        <div className="px-4 pb-4 pt-5">
          <div className="flex flex-col items-center">
            <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-hover)] p-2">
              <Image
                src={byoccIcon}
                alt="BYOCC"
                width={64}
                height={64}
                className="h-full w-full object-contain"
                priority={false}
              />
            </div>

            <div className="mt-5 flex items-center gap-2">
              <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[var(--text-primary)]">
                Learners
              </h2>
              <span className="rounded-full border border-[var(--accent-border)] bg-[var(--accent-button-bg)] px-2 py-0.5 font-mono text-[0.68rem] text-[var(--accent)]">
                {totalLearners}
              </span>
            </div>
            <p className="mt-2 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Top {leaderboardLimit}
            </p>
          </div>

          <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] py-2">
            {loading ? (
              <SkeletonRows />
            ) : learners.length > 0 ? (
              <ol className="space-y-0.5">
                {learners.map((entry, index) => (
                  <LearnerRow
                    key={`${entry.username ?? entry.nickname ?? 'learner'}-${index}`}
                    entry={entry}
                    rank={index + 1}
                  />
                ))}
              </ol>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  成为第一个学习者 →
                </p>
                <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                  完成 Lab 后会出现在这里。
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleShare}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-button-bg)] px-4 py-3 text-sm font-medium text-[var(--accent-button-text)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <span className="font-mono text-base leading-none">+</span>
            {copied ? '已复制链接' : '分享给朋友'}
          </button>
        </div>
      </div>
    </section>
  );
}
