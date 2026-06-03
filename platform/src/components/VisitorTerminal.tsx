"use client";

import { useEffect, useRef, useState } from "react";
import { getVisitorCount } from "@/lib/api";

const STORAGE_KEY = "byocc-terminal-state";

/* ─── Count-up hook with ease-out cubic ─── */
function useCountUp(target: number | null, duration = 2000) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    if (target === null || target === 0) return;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(target * e));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return target === null ? null : display;
}

type Mode = "showcase" | "pill";

function getInitialMode(): Mode {
  if (typeof window === "undefined") return "showcase";
  return localStorage.getItem(STORAGE_KEY) === "pill" ? "pill" : "showcase";
}

export default function VisitorTerminal() {
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>("showcase");
  const [total, setTotal] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  const counted = useCountUp(total);

  /* Mount + appear */
  useEffect(() => {
    const t = setTimeout(() => {
      setMode(getInitialMode());
      setReady(true);
      requestAnimationFrame(() => setVisible(true));
    }, 800);
    return () => clearTimeout(t);
  }, []);

  /* Fetch visitor count */
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    getVisitorCount()
      .then((n) => {
        if (alive) setTotal(n);
      })
      .catch(() => {
        if (alive) setTotal(0);
      });
    return () => {
      alive = false;
    };
  }, [ready]);

  const collapse = () => {
    localStorage.setItem(STORAGE_KEY, "pill");
    setMode("pill");
  };

  const expand = () => setMode("showcase");

  if (!ready) return null;

  const num = counted !== null ? counted.toLocaleString() : "";
  const numStr = total !== null ? total.toLocaleString() : "";

  /* Orbit dot angle sets */
  const outerDots = [0, 45, 90, 135, 180, 225, 270, 315];
  const innerDots = [0, 72, 144, 216, 288];
  const sparkles = [
    { x: "14%", y: "20%", delay: 0 },
    { x: "80%", y: "16%", delay: 1.4 },
    { x: "84%", y: "70%", delay: 2.8 },
    { x: "16%", y: "74%", delay: 4.2 },
  ];

  /* ── CSS-variable-driven theme colors ──
   *  All visual elements use var(--vt-c) for their RGB base,
   *  so [data-theme="light"] overrides just work.            */

  const c = "var(--vt-c)"; // e.g. "212, 165, 116"

  return (
    <>
      {/* ═══════════════════════════════════════════
       *  SHOWCASE — orbital counter system
       * ═══════════════════════════════════════════ */}
      {mode === "showcase" && (
        <div
          role="button"
          tabIndex={0}
          onClick={collapse}
          onKeyDown={(e) => e.key === "Enter" && collapse()}
          className="vt-showcase"
          style={{
            position: "fixed",
            right: "max(24px, env(safe-area-inset-right))",
            bottom: "max(24px, env(safe-area-inset-bottom))",
            zIndex: 50,
            width: "180px",
            height: "180px",
            cursor: "pointer",
            opacity: visible ? 1 : 0,
            transform: visible
              ? "translateY(0) scale(1)"
              : "translateY(24px) scale(0.88)",
            transition: "all 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* ── Layer 0: Ambient glow ── */}
          <div
            style={{
              position: "absolute",
              inset: "-70px",
              borderRadius: "50%",
              background: `radial-gradient(circle, rgba(${c}, var(--vt-glow1)) 0%, rgba(${c}, var(--vt-glow2)) 40%, transparent 65%)`,
              animation: "vt_ambient 6s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />

          {/* ── Layer 1: Pulse rings ── */}
          {[0, 2].map((delay) => (
            <div
              key={delay}
              style={{
                position: "absolute",
                inset: "16px",
                borderRadius: "50%",
                border: `1px solid rgba(${c}, var(--vt-pulse))`,
                animation: `vt_pulse 4s ease-out ${delay}s infinite`,
                pointerEvents: "none",
              }}
            />
          ))}

          {/* ── Layer 2: Outer orbit — clockwise ── */}
          <div
            className="vt-orbit-outer"
            style={{
              position: "absolute",
              inset: "0",
              animation: "vt_spin_cw 25s linear infinite",
              pointerEvents: "none",
            }}
          >
            {outerDots.map((angle, i) => {
              const big = i % 2 === 0;
              return (
                <div
                  key={angle}
                  style={{
                    position: "absolute",
                    width: big ? 3 : 2,
                    height: big ? 3 : 2,
                    borderRadius: "50%",
                    background: `rgba(${c}, var(--vt-dot${i % 3 + 1}))`,
                    boxShadow: `0 0 ${big ? 7 : 4}px rgba(${c}, var(--vt-dot-glow${big ? 1 : 2}))`,
                    top: "50%",
                    left: "50%",
                    transform: `rotate(${angle}deg) translateX(82px)`,
                  }}
                />
              );
            })}
          </div>

          {/* ── Layer 3: Inner orbit — counter-clockwise ── */}
          <div
            className="vt-orbit-inner"
            style={{
              position: "absolute",
              inset: "20px",
              animation: "vt_spin_ccw 16s linear infinite",
              pointerEvents: "none",
            }}
          >
            {innerDots.map((angle, i) => (
              <div
                key={angle}
                style={{
                  position: "absolute",
                  width: 2,
                  height: 2,
                  borderRadius: "50%",
                  background: `rgba(${c}, var(--vt-dot${i % 2 === 0 ? 1 : 2}))`,
                  boxShadow: `0 0 4px rgba(${c}, var(--vt-dot-glow2))`,
                  top: "50%",
                  left: "50%",
                  transform: `rotate(${angle}deg) translateX(55px)`,
                }}
              />
            ))}
          </div>

          {/* ── Layer 4: Sparkle stars ── */}
          {sparkles.map((s, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: s.x,
                top: s.y,
                width: 2,
                height: 2,
                borderRadius: "50%",
                background: `rgb(${c})`,
                boxShadow: `0 0 5px rgba(${c}, var(--vt-sparkle-glow))`,
                animation: `vt_sparkle 4.5s ease-in-out ${s.delay}s infinite`,
                pointerEvents: "none",
              }}
            />
          ))}

          {/* ── Layer 5: Center content ── */}
          <div
            style={{
              position: "absolute",
              inset: "0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            {/* ── Number — theme-aware gradient ── */}
            <div
              className="vt-number vt-grad-text"
              style={{
                fontFamily:
                  "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace)",
                fontSize: "clamp(2.4rem, 4.5vw, 3.2rem)",
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: "-0.04em",
                fontVariantNumeric: "tabular-nums",
                animation: "vt_shimmer 3s ease-in-out infinite",
                filter: "drop-shadow(0 0 24px var(--vt-number-glow))",
                transition: "filter 0.3s ease",
              }}
            >
              {num}
            </div>

            {/* ── Label ── */}
            <span
              style={{
                fontFamily:
                  "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace)",
                fontSize: "0.58rem",
                letterSpacing: "0.28em",
                color: `rgba(${c}, var(--vt-label))`,
                textTransform: "uppercase",
              }}
            >
              visits
            </span>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
       *  PILL — collapsed minimal state
       * ═══════════════════════════════════════════ */}
      {mode === "pill" && (
        <button
          type="button"
          onClick={expand}
          aria-label="展开访问统计"
          style={{
            position: "fixed",
            right: "max(16px, env(safe-area-inset-right))",
            bottom: "max(16px, env(safe-area-inset-bottom))",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily:
              "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace)",
            fontVariantNumeric: "tabular-nums",
            fontSize: "0.8rem",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(8px)",
            transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <span
            className="vt-grad-text-pill"
            style={{
              fontWeight: 600,
              animation: "vt_shimmer 3s ease-in-out infinite",
            }}
          >
            {numStr}
          </span>
          <span style={{ color: `rgba(${c}, var(--vt-pill-text))` }}>
            次访问
          </span>
          <span
            style={{
              display: "block",
              width: 3,
              height: 3,
              borderRadius: "50%",
              background: `rgb(${c})`,
              boxShadow: `0 0 6px rgba(${c}, var(--vt-pill-glow))`,
              animation: "vt_breathe 2s ease-in-out infinite",
            }}
          />
        </button>
      )}

      {/* ── Theme-aware CSS variables + keyframes ── */}
      <style>{`
        /* ────────────────────────────────────────
         *  Dark mode (default)
         * ──────────────────────────────────────── */
        :root {
          --vt-c: 212, 165, 116;
          --vt-dot1: 0.22;
          --vt-dot2: 0.30;
          --vt-dot3: 0.26;
          --vt-dot-glow1: 0.14;
          --vt-dot-glow2: 0.10;
          --vt-pulse: 0.18;
          --vt-glow1: 0.08;
          --vt-glow2: 0.02;
          --vt-sparkle-glow: 0.5;
          --vt-label: 0.32;
          --vt-number-glow: rgba(212, 165, 116, 0.28);
          --vt-number-glow-hover: rgba(212, 165, 116, 0.45);
          --vt-pill-text: 0.4;
          --vt-pill-glow: 0.3;
          --vt-grad: linear-gradient(135deg, #C8956C 0%, #D4A574 18%, #E8C99B 36%, #FFF5E6 50%, #E8C99B 64%, #D4A574 82%, #C8956C 100%);
          --vt-grad-pill: linear-gradient(90deg, #D4A574, #E8C99B, #D4A574);
        }

        /* ────────────────────────────────────────
         *  Light mode — deeper amber, higher contrast
         * ──────────────────────────────────────── */
        [data-theme="light"] {
          --vt-c: 140, 90, 45;
          --vt-dot1: 0.38;
          --vt-dot2: 0.48;
          --vt-dot3: 0.42;
          --vt-dot-glow1: 0.22;
          --vt-dot-glow2: 0.18;
          --vt-pulse: 0.22;
          --vt-glow1: 0.04;
          --vt-glow2: 0.01;
          --vt-sparkle-glow: 0.35;
          --vt-label: 0.50;
          --vt-number-glow: rgba(140, 90, 45, 0.18);
          --vt-number-glow-hover: rgba(140, 90, 45, 0.32);
          --vt-pill-text: 0.50;
          --vt-pill-glow: 0.20;
          --vt-grad: linear-gradient(135deg, #8B5A30 0%, #A66A3C 18%, #C17F4E 36%, #D4975E 50%, #C17F4E 64%, #A66A3C 82%, #8B5A30 100%);
          --vt-grad-pill: linear-gradient(90deg, #A66A3C, #C17F4E, #A66A3C);
        }

        /* ── Keyframes ── */
        @keyframes vt_ambient {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%      { opacity: 0.75; transform: scale(1.12); }
        }

        @keyframes vt_pulse {
          0%   { transform: scale(0.4); opacity: 0.5; }
          100% { transform: scale(1.6); opacity: 0; }
        }

        @keyframes vt_spin_cw {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        @keyframes vt_spin_ccw {
          from { transform: rotate(360deg); }
          to   { transform: rotate(0deg); }
        }

        @keyframes vt_shimmer {
          0%, 100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }

        @keyframes vt_sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50%      { opacity: 0.75; transform: scale(1.8); }
        }

        @keyframes vt_breathe {
          0%, 100% { opacity: 0.45; }
          50%      { opacity: 1; }
        }

        /* ── Gradient text (avoids React shorthand/longhand conflict) ── */
        .vt-grad-text {
          background: var(--vt-grad);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .vt-grad-text-pill {
          background: var(--vt-grad-pill);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* ── Hover: orbit accelerates, glow intensifies ── */
        .vt-showcase:hover .vt-orbit-outer {
          animation-duration: 10s;
        }
        .vt-showcase:hover .vt-orbit-inner {
          animation-duration: 7s;
        }
        .vt-showcase:hover .vt-number {
          filter: drop-shadow(0 0 36px var(--vt-number-glow-hover));
        }

        /* ── Mobile ── */
        @media (max-width: 640px) {
          .vt-showcase {
            width: 140px !important;
            height: 140px !important;
          }
        }
      `}</style>
    </>
  );
}
