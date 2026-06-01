"use client";

import { useEffect, useState } from "react";

export default function ScrollNav() {
  const [scrollRatio, setScrollRatio] = useState(0);
  const [hintDismissed, setHintDismissed] = useState(false);
  const [hintReady, setHintReady] = useState(false);

  /* ── Scroll tracking (snap to 1.0 near bottom) ── */
  useEffect(() => {
    const update = () => {
      const { scrollY, innerHeight } = window;
      const max = document.documentElement.scrollHeight - innerHeight;
      const ratio = max > 0 ? scrollY / max : 0;
      /* Snap to 1.0 when within 0.5% of bottom to avoid sub-pixel gap */
      setScrollRatio(ratio > 0.995 ? 1 : Math.min(1, ratio));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  /* ── Show hint after 4s ── */
  useEffect(() => {
    const timer = setTimeout(() => setHintReady(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  const scrollToTop = () =>
    window.scrollTo({ top: 0, behavior: "smooth" });

  /* Scroll to absolute bottom — smooth first, then forced instant overshoot
   * to guarantee the IntersectionObserver sentinel enters the viewport. */
  const scrollToBottom = () => {
    window.scrollTo({ top: 999999, behavior: "smooth" });
    /* After smooth animation completes (~800ms), force an instant scroll
     * past the sentinel to guarantee it enters the viewport. */
    setTimeout(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight + 200, behavior: "instant" as ScrollBehavior });
    }, 900);
    setHintDismissed(true);
  };

  const showUp = scrollRatio > 0.12;
  const showDown = scrollRatio < 0.88;
  const showHint = hintReady && !hintDismissed && scrollRatio < 0.25;

  return (
    <>
      <nav
        className="scroll-nav"
        role="navigation"
        aria-label="页面滚动导航"
      >
        {/* ── Scroll to top ── */}
        <button
          className="sn-btn sn-up"
          onClick={scrollToTop}
          aria-label="回到顶部"
          style={{
            opacity: showUp ? 1 : 0,
            pointerEvents: showUp ? "auto" : "none",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M6 10V2M6 2L1.5 6.5M6 2L10.5 6.5"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* ── Progress track ── */}
        <div className="sn-track">
          <div
            className="sn-fill"
            style={{ height: `${scrollRatio * 100}%` }}
          />
        </div>

        {/* ── Scroll to bottom (easter egg) ── */}
        <div className="sn-down-wrap">
          <button
            className="sn-btn sn-down"
            onClick={scrollToBottom}
            aria-label="发现彩蛋，跳转到底部"
            style={{
              opacity: showDown ? 1 : 0,
              pointerEvents: showDown ? "auto" : "none",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M6 2V10M6 10L1.5 5.5M6 10L10.5 5.5"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* ── "发现彩蛋" hint label ── */}
          {showHint && (
            <div className="sn-hint">
              <span className="sn-hint-dot" />
              <span className="sn-hint-text">发现彩蛋</span>
            </div>
          )}
        </div>
      </nav>

      <style>{`
        /* ── Theme-aware variables ── */
        :root {
          --sn-color: #D4A574;
          --sn-rgb: 212, 165, 116;
          --sn-btn-bg: rgba(212, 165, 116, 0.03);
          --sn-btn-border: rgba(212, 165, 116, 0.12);
          --sn-hover-bg: rgba(212, 165, 116, 0.08);
          --sn-hover-border: rgba(212, 165, 116, 0.28);
          --sn-track-bg: rgba(212, 165, 116, 0.06);
          --sn-hint-bg: rgba(212, 165, 116, 0.05);
          --sn-hint-border: rgba(212, 165, 116, 0.14);
          --sn-hint-text: rgba(212, 165, 116, 0.65);
        }

        [data-theme="light"] {
          --sn-color: #A66A3C;
          --sn-rgb: 166, 106, 60;
          --sn-btn-bg: rgba(166, 106, 60, 0.04);
          --sn-btn-border: rgba(166, 106, 60, 0.15);
          --sn-hover-bg: rgba(166, 106, 60, 0.09);
          --sn-hover-border: rgba(166, 106, 60, 0.32);
          --sn-track-bg: rgba(166, 106, 60, 0.07);
          --sn-hint-bg: rgba(166, 106, 60, 0.05);
          --sn-hint-border: rgba(166, 106, 60, 0.16);
          --sn-hint-text: rgba(166, 106, 60, 0.6);
        }

        /* ── Container ── */
        .scroll-nav {
          position: fixed;
          right: max(14px, env(safe-area-inset-right));
          top: 50%;
          transform: translateY(-50%);
          z-index: 45;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        /* ── Buttons ── */
        .sn-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: 1px solid var(--sn-btn-border);
          border-radius: 7px;
          background: var(--sn-btn-bg);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: var(--sn-color);
          cursor: pointer;
          padding: 0;
          margin: 0;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          outline: none;
        }

        .sn-btn:hover {
          background: var(--sn-hover-bg);
          border-color: var(--sn-hover-border);
          box-shadow: 0 0 18px rgba(var(--sn-rgb), 0.12);
          transform: scale(1.12);
        }

        .sn-btn:focus-visible {
          border-color: var(--sn-color);
          box-shadow: 0 0 0 2px rgba(var(--sn-rgb), 0.2);
        }

        /* ── Scroll-to-bottom: float + wrapper for hint ── */
        .sn-down-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .sn-down {
          animation: sn-float 2.8s ease-in-out infinite;
        }

        .sn-down:hover {
          animation: none;
          transform: scale(1.12);
        }

        @keyframes sn-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(3px); }
        }

        /* ── "发现彩蛋" hint ── */
        .sn-hint {
          position: absolute;
          right: 36px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
          pointer-events: none;
          animation: sn-hint-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }

        .sn-hint-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--sn-color);
          animation: sn-hint-pulse 1.8s ease-in-out infinite;
          flex-shrink: 0;
        }

        .sn-hint-text {
          font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);
          font-size: 0.65rem;
          letter-spacing: 0.06em;
          color: var(--sn-hint-text);
          background: var(--sn-hint-bg);
          border: 1px solid var(--sn-hint-border);
          border-radius: 4px;
          padding: 3px 8px;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }

        @keyframes sn-hint-in {
          from { opacity: 0; transform: translateY(-50%) translateX(6px); }
          to   { opacity: 1; transform: translateY(-50%) translateX(0); }
        }

        @keyframes sn-hint-pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50%      { opacity: 0.9; transform: scale(1.4); }
        }

        /* ── Progress track ── */
        .sn-track {
          width: 2px;
          height: 36px;
          border-radius: 1px;
          background: var(--sn-track-bg);
          position: relative;
          overflow: hidden;
        }

        .sn-fill {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          background: var(--sn-color);
          border-radius: 1px;
          transition: height 0.12s ease-out;
          opacity: 0.5;
        }

        /* ── Mobile ── */
        @media (max-width: 640px) {
          .scroll-nav {
            right: max(8px, env(safe-area-inset-right));
          }
          .sn-btn {
            width: 24px;
            height: 24px;
            border-radius: 6px;
          }
          .sn-track {
            height: 24px;
          }
          .sn-hint-text {
            font-size: 0.58rem;
            padding: 2px 6px;
          }
          .sn-hint {
            right: 30px;
          }
        }
      `}</style>
    </>
  );
}
