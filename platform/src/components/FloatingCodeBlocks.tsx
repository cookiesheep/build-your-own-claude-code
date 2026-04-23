'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from './ThemeProvider';
import {
  tokenizeLine,
  TOKEN_COLORS_DARK,
  TOKEN_COLORS_LIGHT,
  SNIPPETS,
  type CodeSnippet,
  type TokenType,
} from '@/lib/syntax-tokenizer';

// ── Floating block state ──

interface BlockState {
  id: number;
  snippet: CodeSnippet;
  x: number;
  y: number;
  rotation: number;
  vx: number;
  vy: number;
  phase: 'entering' | 'floating';
  enterProgress: number;
  enterDelay: number;
  targetX: number;
  targetY: number;
}

// ── Component ──

interface FloatingCodeBlocksProps {
  maxBlocks?: number;
  baseOpacity?: number;
  hoverOpacity?: number;
  speedMultiplier?: number;
}

export default function FloatingCodeBlocks({
  maxBlocks: maxBlocksProp,
  baseOpacity = 0.25,
  hoverOpacity = 0.8,
  speedMultiplier = 1,
}: FloatingCodeBlocksProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const blocksRef = useRef<BlockState[]>([]);
  const animFrameRef = useRef<number>(0);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const hoveredIdRef = useRef<number>(-1);
  const [hoveredId, setHoveredId] = useState(-1);
  const [mounted, setMounted] = useState(false);
  const [resizeKey, setResizeKey] = useState(0);
  const { theme } = useTheme();
  const blockElsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Initialize blocks (desktop only — skip on narrow screens)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    // Don't render floating code on narrow/mobile screens
    if (w < 768) return;

    const maxBlocks = maxBlocksProp ?? Math.max(26, Math.floor(w * h / 50000));

    const used = new Set<number>();
    const blocks: BlockState[] = [];

    // Block size estimates for spacing
    const BW = 300, BH = 140;

    // Check if a new block at (x,y) overlaps existing blocks by > 10%
    function overlapsTooMuch(x: number, y: number): boolean {
      for (const b of blocks) {
        const ox = Math.max(0, Math.min(x + BW, b.targetX + BW) - Math.max(x, b.targetX));
        const oy = Math.max(0, Math.min(y + BH, b.targetY + BH) - Math.max(y, b.targetY));
        if (ox * oy > BW * BH * 0.1) return true;
      }
      return false;
    }

    // Organic grid: scatter blocks across viewport with jitter
    // Columns/rows spaced for coverage, random offset for organic feel
    const cols = Math.max(3, Math.floor(w / (BW * 0.5)));
    const rows = Math.max(2, Math.floor(h / (BH * 0.6)));
    const cellW = w / cols;
    const cellH = h / rows;
    let id = 0;

    for (let row = 0; row < rows && id < maxBlocks; row++) {
      for (let col = 0; col < cols && id < maxBlocks; col++) {
        // Skip some cells randomly for organic gaps (20% chance)
        if (Math.random() < 0.05) continue;

        // Base position: center of grid cell
        const baseX = col * cellW + cellW * 0.1;
        const baseY = row * cellH + cellH * 0.1;

        // Jitter: ±40% of cell size for staggered look
        const jitterX = (Math.random() - 0.5) * cellW * 0.6;
        const jitterY = (Math.random() - 0.5) * cellH * 0.6;

        const tx = Math.max(-30, Math.min(w - BW + 30, baseX + jitterX));
        const ty = Math.max(-20, Math.min(h - BH + 20, baseY + jitterY));

        // Skip if overlaps too much
        if (overlapsTooMuch(tx, ty)) continue;

        let idx: number;
        do { idx = Math.floor(Math.random() * SNIPPETS.length); }
        while (used.has(idx) && used.size < SNIPPETS.length);
        used.add(idx);

        blocks.push({
          id: id,
          snippet: SNIPPETS[idx],
          x: tx,
        y: ty,
        rotation: (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 0.015 * speedMultiplier,
        vy: (Math.random() - 0.5) * 0.012 * speedMultiplier,
        phase: 'entering',
        enterProgress: 0,
        enterDelay: Math.random() * 400,
        targetX: tx,
        targetY: ty,
      });

        id++;
      }
    }

    blocksRef.current = blocks;
    setMounted(true);
  }, [maxBlocksProp, speedMultiplier, resizeKey]);

  // Reinitialize on resize (debounced)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setResizeKey((k) => k + 1), 300);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(timer);
    };
  }, []);

  // Animation loop
  useEffect(() => {
    if (!mounted) return;
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;

      blocksRef.current.forEach((block, i) => {
        const el = blockElsRef.current[i];
        if (!el) return;

        // Enter: staggered fade-in (position already set)
        if (block.phase === 'entering') {
          if (elapsed < block.enterDelay) return;
          block.enterProgress = Math.min(1, block.enterProgress + 0.06);
          if (block.enterProgress >= 1) block.phase = 'floating';
        }

        // Slow drift
        if (block.phase === 'floating') {
          block.x += block.vx;
          block.y += block.vy;

          if (block.x < -280) block.x = w + 50;
          if (block.x > w + 50) block.x = -280;
          if (block.y < -200) block.y = h + 50;
          if (block.y > h + 50) block.y = -200;
        }

        // Mouse proximity
        const cx = block.x + 140;
        const cy = block.y + 60;
        const dx = mouseRef.current.x - cx;
        const dy = mouseRef.current.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const isHovered = dist < 160;

        if (isHovered && hoveredIdRef.current !== block.id) {
          hoveredIdRef.current = block.id;
          setHoveredId(block.id);
        } else if (!isHovered && hoveredIdRef.current === block.id) {
          hoveredIdRef.current = -1;
          setHoveredId(-1);
        }

        // Smooth opacity lerp
        const currentOpacity = parseFloat(el.style.opacity || '0');
        const target = isHovered ? hoverOpacity : baseOpacity;
        const lerped = currentOpacity + (target - currentOpacity) * 0.06;

        el.style.transform = `translate(${block.x}px, ${block.y}px) rotate(${block.rotation}deg)`;
        el.style.opacity = String(lerped);
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [mounted, baseOpacity, hoverOpacity]);

  // Document-level mouse tracking (pointer-events: none on container)
  useEffect(() => {
    if (!mounted) return;

    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const onLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
      hoveredIdRef.current = -1;
      setHoveredId(-1);
    };

    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, [mounted]);

  const colors = theme === 'light' ? TOKEN_COLORS_LIGHT : TOKEN_COLORS_DARK;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
      style={{ pointerEvents: 'none' }}
    >
      {blocksRef.current.map((block, i) => {
        const lineCount = 5 + (block.id % 4);
        const visibleLines = block.snippet.lines.slice(0, lineCount);
        const isHovered = hoveredId === block.id;

        return (
          <div
            key={block.id}
            ref={(el) => { blockElsRef.current[i] = el; }}
            className="absolute left-0 top-0"
            style={{ willChange: 'transform, opacity', pointerEvents: 'none' }}
          >
            <div
              style={{
                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                fontSize: '14px',
                lineHeight: '1.65',
                whiteSpace: 'pre',
                padding: '12px 16px',
                borderRadius: '8px',
                background: theme === 'dark' ? 'rgba(13,17,23,0.3)' : 'rgba(248,246,241,0.35)',
                border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                backdropFilter: 'blur(2px)',
                maxWidth: '360px',
                overflow: 'hidden',
              }}
            >
              {visibleLines.map((line, li) => (
                <div key={li}>
                  {tokenizeLine(line).map((token, ti) => (
                    <span key={ti} style={{ color: colors[token.type as TokenType] }}>
                      {token.text}
                    </span>
                  ))}
                </div>
              ))}

              {isHovered && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-28px',
                    left: '0',
                    fontSize: '10px',
                    color: theme === 'dark' ? 'rgba(212,165,116,0.7)' : 'rgba(158,123,82,0.7)',
                    fontFamily: 'system-ui, sans-serif',
                    letterSpacing: '0.04em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {block.snippet.labLabel}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
