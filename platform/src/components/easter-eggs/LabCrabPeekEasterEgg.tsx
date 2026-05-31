"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
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
  peekAmount: number;
}

/* ═══════════════════════════════════════════════════════════
 *  LabCrabPeekEasterEgg
 *
 *  Lab 页面底部探头小螃蟹彩蛋。
 *  初始显示提示 → 点击后小螃蟹从底部探头 → 常驻。
 *
 *  ★ 使用 createPortal 挂载到 document.body，
 *    绕过 LabLayout 的 overflow-hidden 和
 *    react-resizable-panels 的隐式 containing block，
 *    确保 position:fixed 正常工作。
 *
 *  Architecture (3-layer nesting):
 *    Outer div  → positioning (fixed, bottom: 0)
 *    Middle div → idle animation (keyframe translateY bob)
 *    Inner div  → hover interaction (CSS transition translateY)
 *    img        → pixel art crab
 * ═══════════════════════════════════════════════════════════ */
export default function LabCrabPeekEasterEgg() {
  /* ── SSR guard: portal needs document ── */
  const [clientReady, setClientReady] = useState(false);
  useEffect(() => setClientReady(true), []);

  const [activated, setActivated] = useState(false);
  const [animReady, setAnimReady] = useState(false);
  const [loaded, setLoaded] = useState<Set<string>>(new Set());

  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  const crabCount = isMobile ? 2 : 4;

  /* ── Randomized bottom crab configs (stable per mount) ── */
  const crabs = useMemo<BottomCrab[]>(
    () =>
      shuffle(BOTTOM_FRAMES)
        .slice(0, crabCount)
        .map((src, i) => ({
          id: `b${i}`,
          src,
          left: `${10 + (80 / Math.max(crabCount - 1, 1)) * i + (Math.random() * 8 - 4)}%`,
          delay: i * (200 + Math.random() * 150),
          idleDuration: 2.8 + Math.random() * 1.5,
          peekAmount: 48 + Math.random() * 12,
        })),
    [crabCount],
  );

  /* ── Click handler: preload → activate ── */
  const handleClick = async () => {
    const urls = crabs.map((c) => c.src);
    const result = await preloadImages(urls);
    setLoaded(result);
    setActivated(true);
  };

  /* ── Mount animation trigger (double rAF) ── */
  useEffect(() => {
    if (!activated) return;
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setAnimReady(true)),
    );
    return () => cancelAnimationFrame(raf);
  }, [activated]);

  /* ── SSR: render nothing until client hydrates ── */
  if (!clientReady) return null;

  /* ══════════════════ Portal to body ══════════════════ */
  return createPortal(
    <>
      {/* ── Hint button (initial state) ── */}
      {!activated && (
        <button
          type="button"
          onClick={handleClick}
          className="crab-egg-hint"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 30,
            fontFamily:
              "'Noto Serif SC', Georgia, 'Times New Roman', serif",
            fontSize: 13,
            color: "var(--text-secondary)",
            letterSpacing: "0.04em",
            lineHeight: 1.4,
          }}
        >
          👀 下面好像有东西…
        </button>
      )}

      {/* ── Bottom peek crabs ── */}
      {activated &&
        crabs.map((crab) =>
          loaded.has(crab.src) ? (
            <div
              key={crab.id}
              style={{
                position: "fixed",
                bottom: 0,
                left: crab.left,
                zIndex: 30,
                pointerEvents: "none",
                transform: animReady
                  ? `translateY(${crab.peekAmount}%)`
                  : "translateY(100%)",
                transition: `transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) ${crab.delay}ms`,
              }}
            >
              <div
                style={{
                  animation: reducedMotion
                    ? "none"
                    : `crabEgg_bottom_idle ${crab.idleDuration}s ease-in-out infinite`,
                }}
              >
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
    </>,
    document.body,
  );
}
