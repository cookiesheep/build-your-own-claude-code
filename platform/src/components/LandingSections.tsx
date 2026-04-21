'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import HeroParticles from './HeroParticles';
import ScrambleText from './ScrambleText';

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

/* ─── Scroll parallax hook ─── */
function useScrollParallax(rate = 0.04) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    const isMobile = window.innerWidth < 768;
    const effectiveRate = isMobile ? rate * 0.5 : rate;

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const viewH = window.innerHeight;
        if (rect.bottom > 0 && rect.top < viewH) {
          const center = rect.top + rect.height / 2;
          const fromCenter = (center - viewH / 2) / viewH;
          el.style.transform = `translateY(${fromCenter * effectiveRate * viewH}px)`;
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [rate]);

  return ref;
}

/* ─── Tilt card wrapper ─── */
function TiltCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return;
    const el = ref.current;
    if (!el) return;

    let enabled = false;
    const timer = setTimeout(() => { enabled = true; }, 800);

    const onMove = (e: MouseEvent) => {
      if (!enabled) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.transform = `perspective(800px) rotateY(${x * 20}deg) rotateX(${-y * 20}deg)`;
      el.style.setProperty('--tilt-x', `${x * 100 + 50}%`);
      el.style.setProperty('--tilt-y', `${y * 100 + 50}%`);
    };

    const onLeave = () => {
      if (!enabled) return;
      el.style.transform = '';
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      clearTimeout(timer);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <div ref={ref} className="relative" style={{ transition: 'transform 0.15s ease-out', willChange: 'transform' }}>
      <div
        className="pointer-events-none absolute inset-0 z-10 rounded-2xl"
        style={{
          background: 'radial-gradient(circle at var(--tilt-x, 50%) var(--tilt-y, 50%), rgba(212,165,116,0.12) 0%, transparent 60%)',
        }}
      />
      {children}
    </div>
  );
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
    peek: '// 416,500 lines of production TypeScript',
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
    peek: '// TODO: implement agent loop',
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
    peek: '> agent loop initialized \u2713',
  },
];

export function SellingPointsSection() {
  const { ref, visible } = useInView();
  const titleRef = useScrollParallax(0.04);

  return (
    <section className="relative py-28 sm:py-36 overflow-hidden" ref={ref}>
      {/* Soft ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 45%, rgba(212,165,116,0.04), transparent 70%)',
        }}
      />
      <div className="relative z-10 mx-auto max-w-6xl px-6 sm:px-8">
        <div ref={titleRef} className="will-change-transform">
          <h2
            className="text-center text-3xl font-bold tracking-[-0.03em] text-[var(--text-primary)] sm:text-4xl"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(16px)',
              transition: 'opacity 0.6s ease, transform 0.6s ease',
            }}
          >
            <ScrambleText text="为什么 BYOCC 不一样" mode="glow" />
          </h2>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SELLING_POINTS.map((point, i) => (
            <div
              key={point.title}
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(24px)',
                transition: `opacity 0.6s ease ${i * 0.12}s, transform 0.6s ease ${i * 0.12}s`,
              }}
            >
              <TiltCard>
                <div className="group relative rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-7 transition-all duration-300 hover:border-[var(--accent)]">
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
                  {/* Code peek-through on hover */}
                  <div
                    className="pointer-events-none mt-5 font-mono text-[0.72rem] leading-5 opacity-0 transition-opacity duration-300 group-hover:opacity-40"
                    style={{
                      fontFamily: 'var(--font-jetbrains-mono)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {point.peek}
                  </div>
                </div>
              </TiltCard>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   Section 3 — Skill Tree (替代 Lab Preview)
   ═══════════════════════════════════════ */
const SKILL_DATA = [
  { id: 0, name: '环境与体验', desc: '安装完整 Claude Code，看到真实 TUI 跑起来', difficulty: 1, core: false },
  { id: 1, name: '消息协议', desc: '理解 LLM 对话的数据结构，让 Agent 能回复文字', difficulty: 2, core: false },
  { id: 2, name: '工具系统', desc: '实现 read_file / write_file / bash，Agent 会用一次工具', difficulty: 3, core: false },
  { id: 3, name: 'Agent Loop', desc: 'while(true) 循环——chatbot 变成 agent 的关键一步', difficulty: 4, core: true },
  { id: 4, name: '规划能力', desc: 'TodoWrite 让 Agent 先想再做，会拆解任务', difficulty: 4, core: false },
  { id: 5, name: '上下文压缩', desc: '三层压缩策略，长对话不崩，掌握工程化思维', difficulty: 5, core: false },
];

function SkillNode({
  lab,
  index,
  isActive,
  isLast,
}: {
  lab: (typeof SKILL_DATA)[number];
  index: number;
  isActive: boolean;
  isLast: boolean;
}) {
  return (
    <div className="relative flex items-start gap-5">
      {/* Left rail: circle + line */}
      <div className="flex flex-col items-center">
        <div
          className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500"
          style={{
            borderColor: isActive ? (lab.core ? 'var(--accent)' : 'var(--accent)') : 'var(--border)',
            background: isActive ? (lab.core ? 'var(--accent)' : 'var(--accent-button-bg)') : 'transparent',
            boxShadow: isActive ? `0 0 12px ${lab.core ? 'rgba(212,165,116,0.3)' : 'rgba(212,165,116,0.1)'}` : 'none',
          }}
        >
          {isActive ? (
            <span className={`text-[0.65rem] font-bold ${lab.core ? 'text-[var(--bg-page)]' : 'text-[var(--accent)]'}`}>
              {lab.id}
            </span>
          ) : (
            <span className="text-[0.65rem] text-[var(--text-disabled)]">{lab.id}</span>
          )}
        </div>
        {!isLast && (
          <div
            className="relative w-0.5 transition-colors duration-500"
            style={{
              height: '64px',
              background: isActive ? 'var(--accent)' : 'var(--border)',
              opacity: isActive ? 0.5 : 0.3,
            }}
          >
            {isActive && (
              <span
                className="absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[var(--accent)]"
                style={{ animation: 'flowDown 2s ease-in-out infinite' }}
              />
            )}
          </div>
        )}
      </div>

      {/* Right content */}
      <Link
        href="/platform"
        className="group mb-4 flex-1 rounded-xl border bg-[var(--bg-card)] p-5 transition-all duration-300 hover:border-[var(--accent)]"
        style={{
          borderColor: lab.core && isActive ? 'var(--accent-border)' : 'var(--border)',
          boxShadow: lab.core && isActive ? '0 0 16px rgba(212,165,116,0.06)' : 'none',
          opacity: isActive ? 1 : 0.4,
          transform: isActive ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease, border-color 0.3s, box-shadow 0.3s',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[0.7rem] uppercase tracking-[0.15em] text-[var(--text-muted)]">
              Lab {lab.id}
            </span>
            {lab.core && (
              <span className="rounded-full border border-[var(--accent-border)] bg-[var(--accent-button-bg)] px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.15em] text-[var(--accent)]">
                Core
              </span>
            )}
          </div>
          <span className="text-sm font-medium text-[var(--accent)] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            →
          </span>
        </div>
        <h3 className="mt-2 text-base font-semibold text-[var(--text-primary)]">
          {lab.name}
        </h3>
        <p className="mt-1.5 text-[0.85rem] leading-6 text-[var(--text-secondary)]">
          {lab.desc}
        </p>
        {/* Difficulty bar */}
        <div className="mt-4 flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-all duration-500"
              style={{
                background: i < lab.difficulty ? 'var(--accent)' : 'var(--border)',
                opacity: i < lab.difficulty ? 1 : 0.3,
                transform: isActive ? 'scaleX(1)' : 'scaleX(0)',
                transformOrigin: 'left',
                transition: `transform 0.4s ease ${0.3 + i * 0.08}s`,
              }}
            />
          ))}
        </div>
      </Link>
    </div>
  );
}

export function SkillTreeSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const titleRef = useScrollParallax(0.04);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timers = SKILL_DATA.map((_, i) =>
      setTimeout(() => setActiveIdx(i), 200 + i * 300),
    );
    return () => timers.forEach(clearTimeout);
  }, [visible]);

  return (
    <section className="relative py-28 sm:py-36" ref={sectionRef}>
      <div className="mx-auto max-w-3xl px-6 sm:px-8">
        <div ref={titleRef} className="will-change-transform text-center">
          <h2
            className="text-3xl font-bold tracking-[-0.03em] text-[var(--text-primary)] sm:text-4xl"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(16px)',
              transition: 'opacity 0.6s ease, transform 0.6s ease',
            }}
          >
            <ScrambleText text="6 个 Lab，从零到 Agent" />
          </h2>
        </div>

        <div className="mt-16">
          {SKILL_DATA.map((lab, i) => (
            <SkillNode
              key={lab.id}
              lab={lab}
              index={i}
              isActive={i <= activeIdx}
              isLast={i === SKILL_DATA.length - 1}
            />
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
  {
    title: '学习者浏览器',
    lines: ['Monaco Editor', 'xterm.js'],
    terminal: ['xterm.js connected', 'Monaco ready'],
  },
  {
    title: 'Express 后端',
    lines: ['API + Auth', 'SQLite'],
    terminal: ['server listening :3000', 'auth OK'],
  },
  {
    title: 'Docker 容器',
    lines: ['代码注入', '构建触发'],
    terminal: ['container started', 'code injected'],
  },
  {
    title: 'Claude Code TUI',
    lines: ['真实 Agent', '工具调用循环'],
    terminal: ['agent loop init', 'tools loaded'],
  },
];

function Connector({ active }: { active: boolean }) {
  return (
    <div className="relative hidden h-0.5 w-12 flex-shrink-0 bg-[var(--border)] sm:block">
      <span
        className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[var(--accent)] transition-opacity duration-500"
        style={{
          animation: active ? 'flowRight 2.4s ease-in-out infinite' : 'none',
          opacity: active ? 1 : 0.3,
        }}
      />
    </div>
  );
}

export function ArchitectureSection() {
  const { ref, visible } = useInView();
  const titleRef = useScrollParallax(0.04);
  const [activeIdx, setActiveIdx] = useState(-1);

  useEffect(() => {
    if (!visible) return;
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      setActiveIdx(ARCH_NODES.length - 1);
      return;
    }

    const timers = ARCH_NODES.map((_, i) =>
      setTimeout(() => setActiveIdx(i), 400 + i * 350)
    );
    return () => timers.forEach(clearTimeout);
  }, [visible]);

  return (
    <section className="relative py-28 sm:py-36" ref={ref}>
      <div className="mx-auto max-w-5xl px-6 sm:px-8">
        <div ref={titleRef} className="will-change-transform">
          <h2
            className="text-center text-3xl font-bold tracking-[-0.03em] text-[var(--text-primary)] sm:text-4xl"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(16px)',
              transition: 'opacity 0.6s ease, transform 0.6s ease',
            }}
          >
            它是怎么工作的
          </h2>
        </div>

        {/* Desktop: horizontal layout with sequential reveal */}
        <div
          className="mt-16 hidden items-center justify-center sm:flex"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.6s ease 0.15s, transform 0.6s ease 0.15s',
          }}
        >
          {ARCH_NODES.map((node, i) => {
            const isActive = i <= activeIdx;
            const isCurrent = i === activeIdx;
            return (
              <div key={node.title} className="flex items-center">
                <div
                  className="overflow-hidden rounded-xl border bg-[var(--bg-card)] text-left"
                  style={{
                    minWidth: '155px',
                    opacity: isActive ? 1 : 0.3,
                    borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                    boxShadow: isActive ? '0 0 12px rgba(212,165,116,0.1)' : 'none',
                    transition: `all 0.5s ease ${i * 0.1}s`,
                  }}
                >
                  {/* Terminal title bar */}
                  <div
                    className="flex items-center gap-1.5 border-b px-3 py-1.5"
                    style={{ borderColor: isActive ? 'var(--accent-border)' : 'var(--border)', background: 'var(--surface-hover)' }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: isActive ? 'var(--status-success)' : 'var(--text-disabled)' }} />
                    <span className="text-[0.68rem] font-medium text-[var(--text-primary)]">{node.title}</span>
                  </div>
                  {/* Terminal body */}
                  <div className="px-3 py-2" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                    {isActive ? (
                      node.terminal.map((line, li) => (
                        <div
                          key={li}
                          className="text-[0.7rem] leading-5"
                          style={{
                            color: 'var(--status-success)',
                            animation: `code-reveal 0.3s ease-out ${li * 0.25}s both`,
                          }}
                        >
                          <span className="mr-1 text-[var(--text-disabled)]">&gt;</span>
                          {line} <span className="text-[var(--status-success)]">✓</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-[0.7rem] leading-5 text-[var(--text-disabled)]">
                        <span style={{ animation: 'cursor-blink 1s step-end infinite' }}>▌</span>
                      </div>
                    )}
                  </div>
                </div>
                {i < ARCH_NODES.length - 1 && <Connector active={activeIdx > i} />}
              </div>
            );
          })}
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
              <div
                className="overflow-hidden rounded-xl border bg-[var(--bg-card)] text-left"
                style={{
                  minWidth: '200px',
                  borderColor: i <= activeIdx ? 'var(--accent)' : 'var(--border)',
                  transition: `border-color 0.5s ease ${i * 0.1}s`,
                }}
              >
                <div
                  className="flex items-center gap-1.5 border-b px-3 py-1.5"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface-hover)' }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: i <= activeIdx ? 'var(--status-success)' : 'var(--text-disabled)' }} />
                  <span className="text-[0.68rem] font-medium text-[var(--text-primary)]">{node.title}</span>
                </div>
                <div className="px-3 py-2" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                  {i <= activeIdx ? (
                    node.terminal.map((line, li) => (
                      <div key={li} className="text-[0.7rem] leading-5" style={{ color: 'var(--status-success)' }}>
                        <span className="mr-1 text-[var(--text-disabled)]">&gt;</span>
                        {line} ✓
                      </div>
                    ))
                  ) : (
                    <div className="text-[0.7rem] leading-5 text-[var(--text-disabled)]">
                      <span style={{ animation: 'cursor-blink 1s step-end infinite' }}>▌</span>
                    </div>
                  )}
                </div>
              </div>
              {i < ARCH_NODES.length - 1 && (
                <div className="relative h-8 w-0.5 bg-[var(--border)]">
                  <span
                    className="absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[var(--accent)]"
                    style={{ animation: i < activeIdx ? 'flowDown 2s ease-in-out infinite' : 'none', opacity: i < activeIdx ? 1 : 0.3 }}
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
   Section 5 — 差异化 + 社区
   ═══════════════════════════════════════ */

function useCountUp(target: number, started: boolean, duration = 1500) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!started) return;
    let cur = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      cur += step;
      if (cur >= target) { setVal(target); clearInterval(timer); }
      else setVal(Math.floor(cur));
    }, 16);
    return () => clearInterval(timer);
  }, [started, target, duration]);
  return val;
}

function GitHubStats({ visible }: { visible: boolean }) {
  const [stars, setStars] = useState(0);
  const [started, setStarted] = useState(false);
  const displayStars = useCountUp(stars, started, 1200);
  const displayLines = useCountUp(416500, started, 2000);

  useEffect(() => {
    fetch('https://api.github.com/repos/cookiesheep/build-your-own-claude-code')
      .then(r => r.json())
      .then(d => setStars(d.stargazers_count ?? 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (visible && !started) {
      const t = setTimeout(() => setStarted(true), 400);
      return () => clearTimeout(t);
    }
  }, [visible, started]);

  return (
    <div className="flex flex-wrap items-center justify-center gap-8">
      <div className="text-center">
        <p className="text-2xl font-bold tabular-nums text-[var(--accent)]">
          {displayLines.toLocaleString()}
        </p>
        <p className="mt-1 text-[0.75rem] text-[var(--text-muted)]">行真实源码</p>
      </div>
      <div className="h-8 w-px bg-[var(--border)]" />
      <div className="text-center">
        <p className="text-2xl font-bold tabular-nums text-[var(--accent)]">
          ★ {displayStars}
        </p>
        <p className="mt-1 text-[0.75rem] text-[var(--text-muted)]">GitHub Stars</p>
      </div>
      <div className="h-8 w-px bg-[var(--border)]" />
      <div className="text-center">
        <p className="text-2xl font-bold text-[var(--accent)]">MIT</p>
        <p className="mt-1 text-[0.75rem] text-[var(--text-muted)]">开源协议</p>
      </div>
    </div>
  );
}

const DIFF_ITEMS = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
      </svg>
    ),
    title: '416,500 行真实源码',
    desc: '不是示例片段，是生产级代码',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
    title: '挖空补全模式',
    desc: '不是复制粘贴，是你自己写出来',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    title: '真实 TUI 即时运行',
    desc: '不是纸上谈兵，写完立即看到效果',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
      </svg>
    ),
    title: '核心代码只有 ~100 行',
    desc: '剥离生产级复杂度，只学最重要的',
  },
];

const COMPARE = [
  { left: '读 API 文档', right: '写进真实系统' },
  { left: '跟视频敲代码', right: '自己补全核心代码' },
  { left: '跑测试看绿灯', right: '看 Agent 活了' },
  { left: '学会用一个工具', right: '理解一类工具的原理' },
];

export function DifferenceSection() {
  const { ref, visible } = useInView();

  return (
    <section className="relative py-28 sm:py-36" ref={ref}>
      <div className="mx-auto max-w-5xl px-6 sm:px-8">
        {/* Icon cards */}
        <div className="grid gap-5 sm:grid-cols-2">
          {DIFF_ITEMS.map((item, i) => (
            <div
              key={item.title}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-all duration-300 hover:border-[var(--accent)]"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(20px)',
                transition: `opacity 0.5s ease ${i * 0.1}s, transform 0.5s ease ${i * 0.1}s, border-color 0.3s`,
              }}
            >
              <div className="flex items-start gap-4">
                <div className="mt-0.5 text-[var(--accent)]">{item.icon}</div>
                <div>
                  <h3 className="text-[0.95rem] font-semibold text-[var(--text-primary)]">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-[0.82rem] text-[var(--text-secondary)]">{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Lightweight comparison */}
        <div className="mt-16">
          <div
            className="mx-auto max-w-xl overflow-hidden rounded-xl border border-[var(--border)]"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.6s ease 0.3s, transform 0.6s ease 0.3s',
            }}
          >
            {COMPARE.map((row, i) => (
              <div
                key={i}
                className="group flex border-b border-[var(--border)] last:border-b-0"
              >
                <div className="flex-1 px-5 py-3.5 text-center text-[0.82rem] text-[var(--text-muted)] transition-opacity duration-200 group-hover:opacity-40">
                  {row.left}
                </div>
                <div className="w-px bg-[var(--border)]" />
                <div
                  className="flex-1 px-5 py-3.5 text-center text-[0.82rem] font-medium text-[var(--accent)] transition-all duration-200 group-hover:scale-105"
                >
                  {row.right}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Community */}
        <div
          className="mt-16 text-center"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.6s ease 0.5s, transform 0.6s ease 0.5s',
          }}
        >
          {/* Stats with count-up */}
          <GitHubStats visible={visible} />

          <p className="mt-4 text-[0.9rem] leading-7 text-[var(--text-secondary)]">
            基于 <a href="https://github.com/cookiesheep/claude-code-diy" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">claude-code-diy</a> — 416,500 行真实 Claude Code 源码，在 MIT License 下完全开放。
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <a
              href="https://github.com/cookiesheep/build-your-own-claude-code"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-5 py-2.5 text-[0.85rem] font-medium text-[var(--text-secondary)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
              Star on GitHub
            </a>
            <a
              href="https://cookiesheep.github.io/build-your-own-claude-code/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-5 py-2.5 text-[0.85rem] font-medium text-[var(--text-secondary)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              阅读文档
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17L17 7M17 7H7M17 7v10" /></svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   Section 6 — FAQ
   ═══════════════════════════════════════ */
const FAQS = [
  {
    q: '我需要什么基础？',
    a: '了解 JavaScript/TypeScript 基本语法即可。如果你能写一个 for 循环和一个 async function，你就能开始 Lab 0。',
  },
  {
    q: '需要付费吗？',
    a: '完全开源免费，MIT License。Claude Code 是 Anthropic 的商标，本项目仅用于教学目的。',
  },
  {
    q: 'Lab 3 为什么是核心？',
    a: 'Agent Loop（while(true) 循环）是 coding agent 的灵魂。理解了这个，你就理解了 Cursor、Copilot、Claude Code 等工具的底层原理。核心代码只有约 100 行。',
  },
  {
    q: '可以在手机上做吗？',
    a: '推荐使用桌面浏览器。Lab 中的代码编辑器（Monaco Editor）和终端（xterm.js）需要较大的屏幕和键盘输入。',
  },
  {
    q: '做完 6 个 Lab 能做什么？',
    a: '你会理解 coding agent 的完整架构——从消息协议到工具系统到 Agent Loop 到上下文管理。这不是学会用一个工具，而是理解一类工具的底层原理。',
  },
  {
    q: '和 claude-code-diy 是什么关系？',
    a: 'claude-code-diy 是完整的 Claude Code 源码（416,500 行 TypeScript），可以在本地运行。BYOCC 基于它构建教学骨架，让你通过补全关键代码来学习核心架构。',
  },
];

function FAQItem({ faq, index, openIdx, toggle }: {
  faq: (typeof FAQS)[number];
  index: number;
  openIdx: number;
  toggle: (i: number) => void;
}) {
  const isOpen = openIdx === index;
  return (
    <div className="border-b border-[var(--border)]">
      <button
        onClick={() => toggle(index)}
        className="flex w-full items-center justify-between py-5 text-left transition-colors hover:text-[var(--accent)]"
      >
        <div className="flex items-center gap-3">
          <span
            className="text-[0.7rem] font-mono font-bold tabular-nums"
            style={{ color: isOpen ? 'var(--accent)' : 'var(--text-disabled)' }}
          >
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="text-[0.95rem] font-medium text-[var(--text-primary)]">{faq.q}</span>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="shrink-0 text-[var(--text-muted)] transition-transform duration-300"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: isOpen ? 200 : 0, opacity: isOpen ? 1 : 0 }}
      >
        <p className="pb-5 pl-8 text-[0.88rem] leading-7 text-[var(--text-secondary)]">
          {faq.a}
        </p>
      </div>
    </div>
  );
}

export function FAQSection() {
  const { ref, visible } = useInView();
  const [openIdx, setOpenIdx] = useState(-1);

  return (
    <section className="relative py-28 sm:py-36" ref={ref}>
      <div className="mx-auto max-w-2xl px-6 sm:px-8">
        <h2
          className="text-center text-3xl font-bold tracking-[-0.03em] text-[var(--text-primary)] sm:text-4xl"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 0.6s ease, transform 0.6s ease',
          }}
        >
          常见问题
        </h2>

        <div
          className="mt-12"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.6s ease 0.15s, transform 0.6s ease 0.15s',
          }}
        >
          {FAQS.map((faq, i) => (
            <FAQItem
              key={i}
              faq={faq}
              index={i}
              openIdx={openIdx}
              toggle={setOpenIdx}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
/* ════════════════════════════════════════
   Section 7 — Footer
   ════════════════════════════════════════ */
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
              BYOCC — SYSU 软件工程课程项目
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
