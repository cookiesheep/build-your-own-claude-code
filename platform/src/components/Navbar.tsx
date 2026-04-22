'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { LABS, STATUS_COLORS } from "@/lib/labs";
import { checkAuth, logout, type User } from "@/lib/auth";
import { getApiKeyStatus, type ApiKeyStatus } from "@/lib/settings";
import SettingsModal from "./SettingsModal";
import { useTheme } from "./ThemeProvider";

/* ─── Sun / Moon icons ─── */
function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

/* ─── Landing Navbar ─── */
function LandingNav({ scrolled }: { scrolled: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  const links = [
    { label: "首页", href: "/" },
    { label: "平台", href: "/platform" },
    {
      label: "文档",
      href: "https://cookiesheep.github.io/build-your-own-claude-code/",
      external: true,
    },
    { label: "团队", href: "#team" },
  ];

  return (
    <nav
      className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between px-6 transition-all duration-300"
      style={{
        backgroundColor: scrolled ? "var(--bg-page)" : "transparent",
        borderBottomWidth: scrolled ? "1px" : "0",
        borderBottomColor: "var(--border)",
        backdropFilter: scrolled ? "blur(16px)" : "none",
      }}
      aria-label="Primary"
    >
      {/* Logo */}
      <Link href="/" className="flex shrink-0 items-center gap-2">
        <span className="text-[0.95rem] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
          BYOCC
        </span>
        <span className="hidden text-[0.72rem] uppercase tracking-[0.18em] text-[var(--text-muted)] sm:inline">
          Build Your Own Claude Code
        </span>
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-1">
        {links.map((link) => {
          const isActive = link.external ? false : pathname === link.href;
          return (
            <Link
              key={link.label}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              className="rounded-lg px-3 py-1.5 text-[0.82rem] transition-colors duration-200 hover:bg-[var(--surface-hover)]"
              style={{
                color: isActive ? "var(--accent)" : "var(--text-secondary)",
              }}
            >
              {link.label}
            </Link>
          );
        })}

        {/* GitHub */}
        <a
          href="https://github.com/cookiesheep/build-your-own-claude-code"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1 rounded-lg p-1.5 text-[var(--text-muted)] transition-colors duration-200 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          aria-label="GitHub"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
        </a>

        {/* Divider */}
        <div className="mx-2 h-4 w-px bg-[var(--border)]" />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors duration-200 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          aria-label={theme === 'dark' ? '切换亮色模式' : '切换暗色模式'}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </nav>
  );
}

/* ─── Lab Navbar ─── */
function LabNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [keyStatus, setKeyStatus] = useState<ApiKeyStatus | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void checkAuth().then((auth) => {
      setUser(auth.isAuthenticated ? auth.user : null);
      if (!auth.isAuthenticated) {
        setKeyStatus(null);
      }
    });
  }, [pathname]);

  useEffect(() => {
    if (!user || settingsOpen) {
      return;
    }

    void getApiKeyStatus()
      .then(setKeyStatus)
      .catch(() => setKeyStatus(null));
  }, [settingsOpen, user]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleLogout = async () => {
    setShowDropdown(false);
    await logout();
    setUser(null);
    router.push("/");
  };

  return (
    <nav
      className="fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-6 border-b border-[var(--border)] px-6 backdrop-blur-xl"
      style={{ backgroundColor: "color-mix(in srgb, var(--bg-page) 86%, transparent)" }}
      aria-label="Primary"
    >
      <Link
        href="/"
        className="flex shrink-0 flex-col gap-0.5"
      >
        <span className="text-[0.95rem] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
          BYOCC
        </span>
        <span className="text-[0.63rem] uppercase tracking-[0.22em] text-[var(--text-muted)]">
          Learn Agent Harness Engineering
        </span>
      </Link>

      <div className="h-6 w-px bg-[var(--border)]" />

      <div className="flex min-w-0 flex-1 items-center overflow-x-auto">
        {LABS.map((lab) => {
          const isActive = pathname === `/lab/${lab.id}`;
          const isDone = lab.status === "completed";

          return (
            <Link
              key={lab.id}
              href={`/lab/${lab.id}`}
              className="group relative flex h-14 shrink-0 items-center gap-2 border-b-2 border-transparent px-4 text-[0.8rem] transition-all duration-150 hover:bg-[var(--surface-hover)]"
              style={{
                color: isActive
                  ? "var(--accent)"
                  : isDone
                    ? "var(--text-primary)"
                    : "var(--text-muted)",
                borderBottomColor: isActive ? "var(--accent)" : "transparent",
                background:
                  lab.highlight && !isActive
                    ? "linear-gradient(180deg, rgba(212,165,116,0.08), rgba(212,165,116,0.02))"
                    : "transparent",
              }}
            >
              <span className="text-[0.78rem]">{lab.emoji}</span>
              <span>{isDone ? "✓ " : ""}Lab {lab.id}</span>
              {lab.highlight ? (
                <span className="rounded-full border border-[var(--accent-border)] bg-[var(--accent-button-bg)] px-1.5 py-0.5 text-[0.58rem] font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
                  Core
                </span>
              ) : null}
              {!isActive ? (
                <span className="pointer-events-none absolute inset-x-3 bottom-0 h-px scale-x-0 bg-[var(--border-hover)] transition-transform duration-150 group-hover:scale-x-100" />
              ) : null}
            </Link>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {user ? (
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-[0.72rem] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
            >
              <span className="h-2 w-2 rounded-full bg-[var(--status-success)]" />
              <span>{user.username}</span>
            </button>
            {showDropdown && (
              <div className="absolute right-0 top-full mt-1 w-48 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] shadow-lg">
                <div className="border-b border-[var(--border)] px-3 py-2 text-xs text-[var(--text-muted)]">
                  <div>Key: {keyStatus?.source === "user" ? "自定义" : "平台共享"}</div>
                  {keyStatus?.source === "default" && keyStatus.remaining !== undefined ? (
                    <div className="mt-1">剩余 {keyStatus.remaining} 次</div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowDropdown(false);
                    setSettingsOpen(true);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                >
                  API Key 设置
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full px-3 py-2 text-left text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                >
                  登出
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href={`/login?redirect=${encodeURIComponent(pathname)}`}
            className="rounded-xl border border-[color:rgba(212,165,116,0.35)] bg-[color:rgba(212,165,116,0.08)] px-3 py-1.5 text-xs text-[var(--accent)] transition-colors hover:bg-[color:rgba(212,165,116,0.14)]"
          >
            登录
          </Link>
        )}

        <button
          onClick={toggleTheme}
          className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors duration-200 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          aria-label={theme === 'dark' ? '切换亮色模式' : '切换暗色模式'}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </nav>
  );
}

/* ─── Main Navbar ─── */
export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  const isLanding = pathname === '/';

  useEffect(() => {
    if (!isLanding) return;

    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isLanding]);

  if (isLanding) return <LandingNav scrolled={scrolled} />;
  return <LabNav />;
}
