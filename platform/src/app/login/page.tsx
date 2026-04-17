"use client";

import { FormEvent, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import LoginFlowField from "@/components/LoginFlowField";
import { useTheme } from "@/components/ThemeProvider";
import { login as loginApi } from "@/lib/auth";

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
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

type FormState = "idle" | "submitting" | "error" | "success";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, toggleTheme } = useTheme();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [shockwave, setShockwave] = useState<{ x: number; y: number; t: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Shockwave animation tick
  useEffect(() => {
    if (!shockwave) return;
    const start = performance.now();
    let raf = 0;
    function tick() {
      const elapsed = (performance.now() - start) / 1000;
      if (elapsed > 1.5) {
        setShockwave(null);
        return;
      }
      setShockwave((prev) => (prev ? { ...prev, t: elapsed } : null));
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [shockwave === null]);

  const triggerShockwave = useCallback(() => {
    if (!submitBtnRef.current) return;
    const rect = submitBtnRef.current.getBoundingClientRect();
    setShockwave({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, t: 0 });
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!username.trim() || !password.trim()) {
        setErrorMsg("请输入用户名和密码");
        setFormState("error");
        triggerShockwave();
        return;
      }

      setFormState("submitting");
      setErrorMsg("");

      const result = await loginApi(username, password);

      if (result.success) {
        setFormState("success");
        const redirect = searchParams.get("redirect") || "/platform";
        setTimeout(() => router.push(redirect), 800);
      } else {
        setFormState("error");
        setErrorMsg(result.error || "登录失败");
        triggerShockwave();
      }
    },
    [username, password, searchParams, router, triggerShockwave],
  );

  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-hidden" style={{ background: isDark ? "#0B0B0B" : "#F7F4EF" }}>
      <LoginFlowField intensity={formState === "error" ? 0.9 : 0.6} shockwave={shockwave} />

      {/* Theme toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        className="fixed bottom-6 right-6 z-50 rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-2.5 text-[var(--text-muted)] transition-all duration-200 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        aria-label="切换主题"
      >
        {isDark ? <SunIcon /> : <MoonIcon />}
      </button>

      {/* Login form card */}
      <div
        className={`relative z-10 w-full max-w-md px-6 transition-all duration-700 ${
          mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        } ${formState === "success" ? "scale-95 opacity-0" : ""} ${
          formState === "error" ? "animate-shake" : ""
        }`}
      >
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)]/80 p-8 shadow-[0_32px_64px_rgba(0,0,0,0.3)] backdrop-blur-xl"
        >
          {/* Subtle inner glow on focus */}
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-500"
            style={{
              opacity: focusedField ? 0.6 : 0,
              background: focusedField
                ? isDark
                  ? "radial-gradient(ellipse at 50% 40%, rgba(212,165,116,0.06), transparent 70%)"
                  : "radial-gradient(ellipse at 50% 40%, rgba(193,127,78,0.06), transparent 70%)"
                : "none",
            }}
          />

          {/* Brand */}
          <div className="relative mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
              BYOCC
            </h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Build Your Own Claude Code
            </p>
            <div
              className="mx-auto mt-4 h-px w-16"
              style={{
                background: isDark
                  ? "linear-gradient(90deg, transparent, #D4A574, transparent)"
                  : "linear-gradient(90deg, transparent, #C17F4E, transparent)",
              }}
            />
          </div>

          {/* Username */}
          <div className="relative mb-5">
            <label htmlFor="username" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
              用户名
            </label>
            <div className="group relative">
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setFocusedField("username")}
                onBlur={() => setFocusedField(null)}
                autoComplete="username"
                className="peer h-11 w-full rounded-xl border bg-transparent px-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 transition-all duration-300 focus:outline-none"
                style={{
                  borderColor: focusedField === "username"
                    ? "var(--accent)"
                    : "var(--border)",
                  boxShadow: focusedField === "username"
                    ? isDark
                      ? "0 0 0 3px rgba(212,165,116,0.12), 0 0 20px rgba(212,165,116,0.06)"
                      : "0 0 0 3px rgba(193,127,78,0.1), 0 0 20px rgba(193,127,78,0.05)"
                    : "none",
                }}
                placeholder="输入用户名"
              />
              {/* Flowing border animation on focus */}
              {focusedField === "username" && (
                <div
                  className="pointer-events-none absolute inset-0 animate-border-flow rounded-xl"
                  style={{
                    background: isDark
                      ? "linear-gradient(90deg, transparent, rgba(212,165,116,0.3), transparent)"
                      : "linear-gradient(90deg, transparent, rgba(193,127,78,0.3), transparent)",
                    backgroundSize: "200% 100%",
                    WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                    WebkitMaskComposite: "xor",
                    maskComposite: "exclude",
                    padding: 1,
                  }}
                />
              )}
            </div>
          </div>

          {/* Password */}
          <div className="relative mb-6">
            <label htmlFor="password" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
              密码
            </label>
            <div className="group relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                autoComplete="current-password"
                className="peer h-11 w-full rounded-xl border bg-transparent px-4 pr-12 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 transition-all duration-300 focus:outline-none"
                style={{
                  borderColor: focusedField === "password"
                    ? "var(--accent)"
                    : "var(--border)",
                  boxShadow: focusedField === "password"
                    ? isDark
                      ? "0 0 0 3px rgba(212,165,116,0.12), 0 0 20px rgba(212,165,116,0.06)"
                      : "0 0 0 3px rgba(193,127,78,0.1), 0 0 20px rgba(193,127,78,0.05)"
                    : "none",
                }}
                placeholder="输入密码"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
              {focusedField === "password" && (
                <div
                  className="pointer-events-none absolute inset-0 animate-border-flow rounded-xl"
                  style={{
                    background: isDark
                      ? "linear-gradient(90deg, transparent, rgba(212,165,116,0.3), transparent)"
                      : "linear-gradient(90deg, transparent, rgba(193,127,78,0.3), transparent)",
                    backgroundSize: "200% 100%",
                    WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                    WebkitMaskComposite: "xor",
                    maskComposite: "exclude",
                    padding: 1,
                  }}
                />
              )}
            </div>
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="mb-4 rounded-lg border border-[#E57373]/30 bg-[#E57373]/10 px-4 py-2.5 text-sm text-[#E57373] animate-fade-in">
              {errorMsg}
            </div>
          )}

          {/* Submit button */}
          <button
            ref={submitBtnRef}
            type="submit"
            disabled={formState === "submitting"}
            className="group relative h-12 w-full overflow-hidden rounded-xl font-medium transition-all duration-300 disabled:cursor-not-allowed"
            style={{
              background: formState === "success"
                ? "var(--status-success)"
                : isDark
                  ? "rgba(212,165,116,0.12)"
                  : "rgba(193,127,78,0.12)",
              color: formState === "success"
                ? "#fff"
                : isDark ? "#D4A574" : "#C17F4E",
              border: `1px solid ${formState === "success" ? "transparent" : isDark ? "rgba(212,165,116,0.25)" : "rgba(193,127,78,0.25)"}`,
            }}
          >
            {/* Hover sweep effect */}
            <span
              className="absolute inset-0 -translate-x-full transition-transform duration-500 group-hover:translate-x-0 group-disabled:translate-x-full"
              style={{
                background: isDark
                  ? "linear-gradient(90deg, transparent, rgba(212,165,116,0.08), transparent)"
                  : "linear-gradient(90deg, transparent, rgba(193,127,78,0.08), transparent)",
              }}
            />

            {formState === "submitting" ? (
              <span className="relative flex items-center justify-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>验证中...</span>
              </span>
            ) : formState === "success" ? (
              <span className="relative flex items-center justify-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                <span>登录成功</span>
              </span>
            ) : (
              <span className="relative">登录</span>
            )}
          </button>

          {/* Decorative footer */}
          <p className="mt-6 text-center text-xs text-[var(--text-muted)]/60">
            Agent Harness Engineering Platform
          </p>
        </form>
      </div>

      {/* CSS animations */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        @keyframes border-flow {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .animate-border-flow {
          animation: border-flow 2s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: "#0B0B0B" }}>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4A574] border-t-transparent" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
