"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  preloadImages,
  shuffle,
  useIsMobile,
  useReducedMotion,
} from "./useCrabAssets";
import "./crabEasterEggs.css";

/* ─── Asset paths (flat in public/) ─── */
const JUMP_FRAMES = Array.from(
  { length: 11 },
  (_, i) => `/jump${i + 1}.png`,
);
const LEFT_PEEK = Array.from(
  { length: 5 },
  (_, i) => `/left${i + 1}.png`,
);
const RIGHT_PEEK = Array.from(
  { length: 6 },
  (_, i) => `/right${i + 1}.png`,
);

/* ─── Types ─── */
type Phase = "idle" | "jumping" | "peeking";

interface JumpCrab {
  id: string;
  src: string;
  left: string;
  delay: number;
  peak: number;
  size: number;
}

interface PeekCrab {
  id: string;
  src: string;
  side: "left" | "right";
  bottom: string;
  idleDuration: number;
  delay: number;
}

/* ═══════════════════════════════════════════════════════════
 *  HomeCrabEasterEgg
 *
 *  State machine: idle → jumping → peeking
 *  - idle:      waiting for IntersectionObserver trigger
 *  - jumping:   crabs pop up from viewport bottom (stagger, fade out)
 *  - peeking:   left/right crabs peek from screen edges (permanent)
 *
 *  Architecture:
 *    Outer div  → positioning (fixed)
 *    Middle div → idle animation (keyframe translateY)
 *    Inner div  → hover interaction (CSS transition translateX/scale)
 *    img        → pixel art crab
 * ═══════════════════════════════════════════════════════════ */
export default function HomeCrabEasterEgg() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [jumpLoaded, setJumpLoaded] = useState<Set<string>>(new Set());
  const [peekMounted, setPeekMounted] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const triggeredRef = useRef(false);

  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  /* ── Crab counts ── */
  const jumpCount = isMobile ? 4 : 9;
  const peekLeftCount = isMobile ? 1 : LEFT_PEEK.length;  // 5
  const peekRightCount = isMobile ? 1 : RIGHT_PEEK.length; // 6

  /* ── Randomized jump crab configs (stable per mount) ── */
  const jumpCrabs = useMemo<JumpCrab[]>(
    () =>
      shuffle(JUMP_FRAMES)
        .slice(0, jumpCount)
        .map((src, i) => ({
          id: `j${i}`,
          src,
          /* spread across 8%–92% viewport width with slight randomness */
          left: `${8 + (84 / Math.max(jumpCount - 1, 1)) * i + (Math.random() * 6 - 3)}%`,
          delay: i * (110 + Math.random() * 90),
          peak: -(38 + Math.random() * 38),
          size: 48 + Math.floor(Math.random() * 16),
        })),
    [jumpCount],
  );

  /* ── Randomized peek crab configs ──
   *  Position crabs evenly along the screen edge.
   *  80px crab ≈ 9% of 900px viewport, so leave gaps between them.
   *  Left (5):  5% → 81%, step ≈ 19%
   *  Right (6): 3% → 80%, step ≈ 15.4%                    */
  const peekCrabs = useMemo<PeekCrab[]>(() => {
    const leftStep = 76 / Math.max(peekLeftCount - 1, 1);
    const rightStep = 77 / Math.max(peekRightCount - 1, 1);

    const left = shuffle(LEFT_PEEK)
      .slice(0, peekLeftCount)
      .map((src, i) => ({
        id: `pl${i}`,
        src,
        side: "left" as const,
        bottom: `${5 + i * leftStep}%`,
        idleDuration: 3.0 + Math.random() * 2.0,
        delay: i * 350,
      }));
    const right = shuffle(RIGHT_PEEK)
      .slice(0, peekRightCount)
      .map((src, i) => ({
        id: `pr${i}`,
        src,
        side: "right" as const,
        bottom: `${3 + i * rightStep}%`,
        idleDuration: 3.2 + Math.random() * 2.0,
        delay: i * 320,
      }));
    return [...left, ...right];
  }, [peekLeftCount, peekRightCount]);

  /* ── IntersectionObserver: one-shot trigger ── */
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || triggeredRef.current) return;
        triggeredRef.current = true;
        observer.disconnect();

        /* Preload Phase 1 (jump) assets, then start animation */
        const jumpUrls = jumpCrabs.map((c) => c.src);
        preloadImages(jumpUrls).then((loaded) => {
          setJumpLoaded(loaded);
          setPhase(reducedMotion ? "peeking" : "jumping");
        });

        /* Preload Phase 2 (peek) assets in background */
        preloadImages(peekCrabs.map((c) => c.src));
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [jumpCrabs, peekCrabs, reducedMotion]);

  /* ── Auto-advance: jumping → peeking after ~3.2s ── */
  useEffect(() => {
    if (phase !== "jumping") return;
    const timer = setTimeout(() => setPhase("peeking"), 3200);
    return () => clearTimeout(timer);
  }, [phase]);

  /* ── Mount peek crabs with CSS transition trigger ── */
  useEffect(() => {
    if (phase !== "peeking") return;
    /* Double rAF ensures browser paints initial hidden state first */
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setPeekMounted(true)),
    );
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  /* ══════════════════ Render ══════════════════ */
  return (
    <>
      {/* Invisible sentinel — placed after FooterSection in page.tsx */}
      <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />

      {/* ── Phase 1: Jumping crabs ── */}
      {phase === "jumping" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 30,
            pointerEvents: "none",
          }}
        >
          {jumpCrabs.map((crab) =>
            /* Skip crabs whose image failed to load */
            jumpLoaded.has(crab.src) ? (
              <img
                key={crab.id}
                src={crab.src}
                alt=""
                draggable={false}
                style={
                  {
                    position: "absolute",
                    left: crab.left,
                    bottom: isMobile
                      ? "calc(64px + env(safe-area-inset-bottom, 0px))"
                      : 0,
                    width: crab.size,
                    height: crab.size,
                    imageRendering: "pixelated",
                    userSelect: "none",
                    pointerEvents: "none",
                    /* per-crab jump height via CSS custom property */
                    "--jump-peak": `${crab.peak}px`,
                    animation: `crabEgg_jump 1.5s cubic-bezier(0.22, 1, 0.36, 1) ${crab.delay}ms both`,
                    filter:
                      "drop-shadow(0 2px 8px rgba(212, 165, 116, 0.12))",
                  } as React.CSSProperties
                }
              />
            ) : null,
          )}
        </div>
      )}

      {/* ── Phase 2: Peeking crabs (fixed at screen edges) ── */}
      {phase === "peeking" &&
        peekCrabs.map((crab) => {
          const isLeft = crab.side === "left";
          return (
            /* Layer 1: Positioning (fixed at edge) */
            <div
              key={crab.id}
              style={{
                position: "fixed",
                [crab.side]: -32,
                bottom: crab.bottom,
                zIndex: 30,
                pointerEvents: "none",
                /* Entry transition: opacity + slide in from edge */
                opacity: peekMounted ? 1 : 0,
                transform: peekMounted
                  ? "translateX(0)"
                  : isLeft
                    ? "translateX(-24px)"
                    : "translateX(24px)",
                transition: `opacity 0.6s ease ${crab.delay}ms, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${crab.delay}ms`,
              }}
            >
              {/* Layer 2: Idle animation (translateY float) */}
              <div
                style={{
                  animation: reducedMotion
                    ? "none"
                    : `crabEgg_peek_idle ${crab.idleDuration}s ease-in-out infinite`,
                }}
              >
                {/* Layer 3: Hover interaction (translateX + scale) */}
                <div
                  className={
                    isLeft
                      ? "crab-egg-peek-left"
                      : "crab-egg-peek-right"
                  }
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
                      width: 80,
                      height: 80,
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
          );
        })}
    </>
  );
}
