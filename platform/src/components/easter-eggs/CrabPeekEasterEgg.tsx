"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  preloadImages,
  shuffle,
  useIsMobile,
  useReducedMotion,
} from "./useCrabAssets";
import "./crabEasterEggs.css";

/* ─── Asset paths (flat in public/) ─── */
const BOTTOM_FRAMES = Array.from(
  { length: 11 },
  (_, i) => `/bottom${i + 1}.png`,
);

/* ─── Types ─── */
interface BottomCrab {
  id: string;
  src: string;
  left: string;
  delay: number;
  idleDuration: number;
  /** How far down to translate (%) — higher = less visible */
  peekAmount: number;
}

/* ═══════════════════════════════════════════════════════════
 *  CrabPeekEasterEgg (Platform page)
 *
 *  Platform 页面底部探头小螃蟹彩蛋。
 *  双触发：点击背景彩蛋代码块 OR 点击底部备用按钮。
 *  激活后 10-11 只小螃蟹从底部探头 → 常驻。
 *
 *  3-layer nesting (same as HomeCrabEasterEgg):
 *    Outer  → positioning (fixed, bottom: 0)
 *    Middle → idle animation (translateY bob)
 *    Inner  → hover interaction (translateY -8px)
 * ═══════════════════════════════════════════════════════════ */
export default function CrabPeekEasterEgg() {
  const [activated, setActivated] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState<Set<string>>(new Set());

  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  const crabCount = isMobile ? 3 : 11;

  /* ── Randomized bottom crab configs (stable per mount) ── */
  const crabs = useMemo<BottomCrab[]>(
    () =>
      shuffle(BOTTOM_FRAMES)
        .slice(0, crabCount)
        .map((src, i) => ({
          id: `b${i}`,
          src,
          left: `${5 + (90 / Math.max(crabCount - 1, 1)) * i + (Math.random() * 6 - 3)}%`,
          delay: i * (120 + Math.random() * 100),
          idleDuration: 2.6 + Math.random() * 2.0,
          peekAmount: 46 + Math.random() * 14, // show ~40-54% of body
        })),
    [crabCount],
  );

  /* ── Activate: preload → show ── */
  const activate = useCallback(async () => {
    if (activated) return;
    const urls = crabs.map((c) => c.src);
    const result = await preloadImages(urls);
    setLoaded(result);
    setActivated(true);
  }, [activated, crabs]);

  /* ── Trigger 1: Custom event from FloatingCodeBlocks ── */
  useEffect(() => {
    const handler = () => activate();
    window.addEventListener("crab-egg-trigger", handler);
    return () => window.removeEventListener("crab-egg-trigger", handler);
  }, [activate]);

  /* ── Mount animation trigger (double rAF) ── */
  useEffect(() => {
    if (!activated) return;
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setMounted(true)),
    );
    return () => cancelAnimationFrame(raf);
  }, [activated]);

  /* ══════════════════ Render ══════════════════ */
  return (
    <>
      {/* ── Backup hint button (bottom-right, always visible until activated) ── */}
      {!activated && (
        <button
          type="button"
          onClick={activate}
          className="crab-egg-hint"
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            zIndex: 30,
            fontFamily:
              "'Noto Serif SC', Georgia, 'Times New Roman', serif",
            fontSize: 12,
            color: "var(--text-muted)",
            letterSpacing: "0.03em",
            lineHeight: 1,
          }}
        >
          👀 下面好像有东西…
        </button>
      )}

      {/* ── Bottom peek crabs ── */}
      {activated &&
        crabs.map((crab) =>
          loaded.has(crab.src) ? (
            /* Layer 1: Positioning (fixed at viewport bottom) */
            <div
              key={crab.id}
              style={{
                position: "fixed",
                bottom: 0,
                left: crab.left,
                zIndex: 30,
                pointerEvents: "none",
                transform: mounted
                  ? `translateY(${crab.peekAmount}%)`
                  : "translateY(100%)",
                transition: `transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) ${crab.delay}ms`,
              }}
            >
              {/* Layer 2: Idle animation (translateY bob) */}
              <div
                style={{
                  animation: reducedMotion
                    ? "none"
                    : `crabEgg_bottom_idle ${crab.idleDuration}s ease-in-out infinite`,
                }}
              >
                {/* Layer 3: Hover interaction (translateY -8px) */}
                <div
                  className="crab-egg-bottom-hover"
                  style={{
                    pointerEvents: "auto",
                    cursor: "pointer",
                  }}
                >
                  <img
                    src={crab.src}
                    alt=""
                    draggable={false}
                    style={{
                      width: 64,
                      height: 64,
                      imageRendering: "pixelated",
                      userSelect: "none",
                      display: "block",
                      filter:
                        "drop-shadow(0 1px 6px rgba(212, 165, 116, 0.08))",
                    }}
                  />
                </div>
              </div>
            </div>
          ) : null,
        )}
    </>
  );
}
