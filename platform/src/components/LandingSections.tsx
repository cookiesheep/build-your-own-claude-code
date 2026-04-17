'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import HeroParticles from './HeroParticles';

/* ─── Intersection Observer hook ─── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

/* ═══════════════════════════════════════
   Section 1 — Hero
   ═══════════════════════════════════════ */
export function HeroSection() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-14">
      {/* Particle canvas — the soul of the page */}
      <HeroParticles />

      {/* Subtle noise texture for depth */}
      <div
        className="pointer-events-none absolute inset-0 z-[3] opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '256px 256px',
        }}
      />

      {/* Text content */}
      <div
        className="relative z-10 mx-auto max-w-3xl px-6 text-center"
        style={{
          opacity: show ? 1 : 0,
          transform: show ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 1s ease, transform 1s ease',
        }}
      >
        <h1 className="text-5xl font-bold tracking-[-0.04em] text-[var(--text-primary)] sm:text-6xl lg:text-7xl">
          Build Your Own
          <br />
          <span className="text-[var(--accent)]">Claude Code</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-[var(--text-secondary)] sm:text-xl">
          通过 6 个渐进式 Lab，从零实现 Agent Harness 核心——
          <br className="hidden sm:block" />
          最终看到真实 Claude Code TUI 由你的代码驱动
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/platform"
            className="group inline-flex items-center justify-center rounded-xl px-7 py-3.5 text-[0.95rem] font-semibold transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(212,165,116,0.2)] active:scale-[0.98]"
            style={{
              background: 'var(--accent)',
              color: 'var(--bg-page)',
            }}
          >
            开始实验
            <svg className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>

          <a
            href="https://cookiesheep.github.io/build-your-own-claude-code/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl border px-7 py-3.5 text-[0.95rem] font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              borderColor: 'var(--accent-border)',
              color: 'var(--accent-button-text)',
              background: 'var(--accent-button-bg)',
            }}
          >
            阅读文档
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-8 left-1/2 text-[var(--text-muted)]"
        style={{ animation: 'bounceDown 2.4s ease-in-out infinite' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   Section 2 — Selling Points
   ═══════════════════════════════════════ */
const SELLING_POINTS = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    title: '真实源码',
    subtitle: '不是 toy demo',
    desc: '面对的是真正的 416,500 行 Claude Code 源码。你写的每一行代码都跑在真实系统里。',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    title: '挖空模式',
    subtitle: '只需补全关键代码',
    desc: '只需补全 100–300 行关键代码。不需要理解全部，但理解的是最核心的。',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    title: '即时反馈',
    subtitle: '代码即效果',
    desc: '改完代码点提交，几秒内看到真实 TUI 变化。不是测试变绿，是 Agent 活了。',
  },
];

export function SellingPointsSection() {
  const { ref, visible } = useInView();

  return (
    <section className="relative py-28 sm:py-36" ref={ref}>
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <h2 className="text-center text-3xl font-bold tracking-[-0.03em] text-[var(--text-primary)] sm:text-4xl">
          为什么 BYOCC 不一样
        </h2>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SELLING_POINTS.map((point, i) => (
            <div
              key={point.title}
              className="group rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-7 transition-all duration-300 hover:border-[var(--accent)]"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(24px)',
                transition: `opacity 0.6s ease ${i * 0.12}s, transform 0.6s ease ${i * 0.12}s`,
              }}
            >
              <div className="mb-5 text-[var(--accent)]">{point.icon}</div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                {point.title}
              </h3>
              <p className="mt-1 text-sm font-medium uppercase tracking-[0.15em] text-[var(--accent)]">
                {point.subtitle}
              </p>
              <p className="mt-4 text-[0.92rem] leading-7 text-[var(--text-secondary)]">
                {point.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   Section 3 — Lab Preview
   ═══════════════════════════════════════ */
const LAB_DATA = [
  { id: 0, name: '环境与体验', desc: '安装运行完整 Claude Code', difficulty: 1, core: false },
  { id: 1, name: '消息协议', desc: '理解 LLM 对话的数据结构', difficulty: 2, core: false },
  { id: 2, name: '工具系统', desc: '实现 read_file / write_file / bash', difficulty: 3, core: false },
  { id: 3, name: 'Agent Loop', desc: 'while(true) 循环——chatbot 变成 agent', difficulty: 4, core: true },
  { id: 4, name: '规划能力', desc: 'TodoWrite 让 Agent 先想再做', difficulty: 4, core: false },
  { id: 5, name: '上下文压缩', desc: '三层压缩策略，长对话不崩', difficulty: 5, core: false },
];

export function LabPreviewSection() {
  const { ref, visible } = useInView();

  return (
    <section className="relative py-28 sm:py-36" ref={ref}>
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <h2 className="text-center text-3xl font-bold tracking-[-0.03em] text-[var(--text-primary)] sm:text-4xl">
          6 个 Lab，从 0 到 Agent
        </h2>

        {/* Horizontal scroll */}
        <div
          className="mt-16 flex gap-5 overflow-x-auto pb-4 sm:justify-center"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s',
          }}
        >
          {LAB_DATA.map((lab) => (
            <Link
              key={lab.id}
              href="/platform"
              className="group flex-shrink-0 rounded-2xl border p-6 transition-all duration-300 hover:border-[var(--accent)]"
              style={{
                width: '200px',
                borderColor: lab.core ? 'var(--accent-border)' : 'var(--border)',
                background: lab.core ? 'var(--accent-button-bg)' : 'var(--bg-card)',
                boxShadow: lab.core
                  ? '0 0 24px rgba(212,165,116,0.08)'
                  : 'none',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  Lab {lab.id}
                </span>
                {lab.core && (
                  <span className="rounded-full border border-[var(--accent-border)] bg-[var(--accent-button-bg)] px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-[var(--accent)]">
                    Core
                  </span>
                )}
              </div>
              <h3 className="mt-3 text-base font-semibold text-[var(--text-primary)]">
                {lab.name}
              </h3>
              <p className="mt-2 text-[0.82rem] leading-6 text-[var(--text-secondary)]">
                {lab.desc}
              </p>

              {/* Difficulty bar */}
              <div className="mt-5 flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-1 flex-1 rounded-full"
                    style={{
                      background: i < lab.difficulty ? 'var(--accent)' : 'var(--border)',
                      opacity: i < lab.difficulty ? 1 : 0.4,
                    }}
                  />
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   Section 4 — Architecture
   ═══════════════════════════════════════ */
const ARCH_NODES = [
  { title: '学习者浏览器', lines: ['Monaco Editor', 'xterm.js'] },
  { title: 'Express 后端', lines: ['API + Auth', 'SQLite'] },
  { title: 'Docker 容器', lines: ['代码注入', '构建触发'] },
  { title: 'Claude Code TUI', lines: ['真实 Agent', '工具调用循环'] },
];

function Connector() {
  return (
    <div className="relative hidden h-0.5 w-12 flex-shrink-0 bg-[var(--border)] sm:block">
      <span
        className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[var(--accent)]"
        style={{ animation: 'flowRight 2.4s ease-in-out infinite' }}
      />
    </div>
  );
}

export function ArchitectureSection() {
  const { ref, visible } = useInView();

  return (
    <section className="relative py-28 sm:py-36" ref={ref}>
      <div className="mx-auto max-w-5xl px-6 sm:px-8">
        <h2 className="text-center text-3xl font-bold tracking-[-0.03em] text-[var(--text-primary)] sm:text-4xl">
          它是怎么工作的
        </h2>

        {/* Desktop: horizontal layout */}
        <div
          className="mt-16 hidden items-center justify-center sm:flex"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.6s ease 0.15s, transform 0.6s ease 0.15s',
          }}
        >
          {ARCH_NODES.map((node, i) => (
            <div key={node.title} className="flex items-center">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-5 py-4 text-center transition-colors duration-300 hover:border-[var(--accent)]" style={{ minWidth: '140px' }}>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{node.title}</p>
                {node.lines.map((line) => (
                  <p key={line} className="mt-1 text-xs text-[var(--text-muted)]">{line}</p>
                ))}
              </div>
              {i < ARCH_NODES.length - 1 && <Connector />}
            </div>
          ))}
        </div>

        {/* Mobile: vertical layout */}
        <div
          className="mt-12 flex flex-col items-center gap-4 sm:hidden"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.6s ease 0.15s, transform 0.6s ease 0.15s',
          }}
        >
          {ARCH_NODES.map((node, i) => (
            <div key={node.title} className="flex flex-col items-center">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-5 py-4 text-center" style={{ minWidth: '180px' }}>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{node.title}</p>
                {node.lines.map((line) => (
                  <p key={line} className="mt-1 text-xs text-[var(--text-muted)]">{line}</p>
                ))}
              </div>
              {i < ARCH_NODES.length - 1 && (
                <div className="relative h-8 w-0.5 bg-[var(--border)]">
                  <span
                    className="absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[var(--accent)]"
                    style={{ animation: 'flowRight 2.4s ease-in-out infinite', transformOrigin: 'center' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   Section 5 — Footer
   ═══════════════════════════════════════ */
export function FooterSection() {
  return (
    <footer id="team" className="border-t border-[var(--border)] py-16">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-3">
          {/* Project */}
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Build Your Own Claude Code
            </h3>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              基于 Claude Code 真实源码的渐进式教学平台。
              <br />
              从零实现 Agent Harness 核心模块。
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              资源
            </h3>
            <ul className="mt-3 space-y-2">
              <li>
                <a
                  href="https://cookiesheep.github.io/build-your-own-claude-code/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                >
                  文档 →
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/cookiesheep/build-your-own-claude-code"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                >
                  GitHub →
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/cookiesheep/claude-code-diy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                >
                  claude-code-diy →
                </a>
              </li>
            </ul>
          </div>

          {/* Team */}
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              团队
            </h3>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              CookieSheep — SYSU 软件工程课程项目
              <br />
              因为信任所以简单
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[var(--border)] pt-8 sm:flex-row">
          <p className="text-xs text-[var(--text-muted)]">
            MIT License. Built with Next.js + Tailwind CSS.
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Claude Code is a trademark of Anthropic. This project is for educational purposes.
          </p>
        </div>
      </div>
    </footer>
  );
}
