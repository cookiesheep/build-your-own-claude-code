'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from './ThemeProvider';

/* ─── Types ─── */
interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  size: number;
  baseAlpha: number;
  alpha: number;
  vx: number;
  vy: number;
  floatPhase: number;
  floatSpeed: number;
  floatRadius: number;
  colorIdx: number;
  hasGlow: boolean;
  customColor?: string;
}

type Target = { x: number; y: number; color?: string };

type Phase =
  | 'scatter'       // random floating
  | 'terminal'       // particles form terminal window
  | 'explode1'       // burst outward
  | 'buildYourOwn'   // form "BUILD YOUR OWN"
  | 'explode2'       // burst again
  | 'stable';        // form "CLAUDE CODE" (final, loops back to scatter)

/* ─── Phase Timing (seconds) ─── */
const PHASE_DURATION: Record<Phase, number> = {
  scatter: 9,
  terminal: 15,
  explode1: 4,
  buildYourOwn: 9,
  explode2: 4,
  stable: 15,        // loops back to scatter after this
};


const PHASE_ORDER: Phase[] = [
  'scatter', 'terminal', 'explode1', 'buildYourOwn', 'explode2', 'stable',
];

/* ─── Config (user-tuned values preserved) ─── */
const CFG = {
  densityPerK: 2.0,
  mobileDensityPerK: 1.2,
  mouseRadius: 250,
  mouseForce: 1,
  ease: 0.005,
  damping: 0.78,
  breatheSpeed: 0.35,
  breatheAmp: 0.05,
  glowChance: 0.15,
  fadeInRate: 0.012,
  explosionForce: 18,
};

const PALETTE = {
  dark: {
    main: ['#D4A574', '#E8C49A', '#B8895A', '#C9A068'],
    glow: 'rgba(212,165,116,0.25)',
  },
  light: {
    main: ['#C17F4E', '#D4975E', '#A66A3C', '#B8814A'],
    glow: 'rgba(193,127,78,0.2)',
  },
};

/* ─── Terminal image preload ─── */
let terminalImg: HTMLImageElement | null = null;
let terminalImgPromise: Promise<HTMLImageElement | null> | null = null;

function preloadTerminalImage(): Promise<HTMLImageElement | null> {
  if (terminalImg) return Promise.resolve(terminalImg);
  if (terminalImgPromise) return terminalImgPromise;
  terminalImgPromise = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { terminalImg = img; resolve(img); };
    img.onerror = () => resolve(null);
    img.src = '/terminal-hero.png';
  });
  return terminalImgPromise;
}

function sampleImageToPoints(
  img: HTMLImageElement, canvasW: number, canvasH: number, maxPoints: number,
): Target[] {
  const off = document.createElement('canvas');
  off.width = canvasW;
  off.height = canvasH;
  const oc = off.getContext('2d');
  if (!oc) return [];

  const maxW = canvasW * 0.55;
  const maxH = canvasH * 0.4;
  const scale = Math.min(maxW / img.width, maxH / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const drawX = (canvasW - drawW) / 2;
  const drawY = (canvasH - drawH) * 0.35;

  oc.drawImage(img, drawX, drawY, drawW, drawH);

  const imgData = oc.getImageData(0, 0, canvasW, canvasH);
  const gap = canvasW < 768 ? 6 : 4;
  const pts: Target[] = [];

  for (let py = 0; py < canvasH; py += gap) {
    for (let px = 0; px < canvasW; px += gap) {
      const idx = (py * canvasW + px) * 4;
      const r = imgData.data[idx];
      const g = imgData.data[idx + 1];
      const b = imgData.data[idx + 2];
      const a = imgData.data[idx + 3];
      if (a < 64) continue;
      if (r + g + b < 50) continue;
      pts.push({ x: px, y: py, color: `rgb(${r},${g},${b})` });
    }
  }

  return pts;
}

/* ─── Sampling: generic text → points ─── */
function sampleWordsToPoints(
  w: number, h: number,
  lines: string[],
  centerY: number,
  fontSizeOverride?: number,
): { x: number; y: number }[] {
  if (w < 50 || h < 50) return [];

  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const oc = off.getContext('2d');
  if (!oc) return [];

  const fontSize = fontSizeOverride ?? Math.max(60, Math.min(w * 0.15, h * 0.3, 460));
  const lineGap = fontSize * 1.15;
  const totalHeight = lines.length * lineGap;
  const startY = centerY - totalHeight / 2 + lineGap / 2;

  oc.fillStyle = '#fff';
  oc.font = `bold ${fontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  oc.textAlign = 'center';
  oc.textBaseline = 'middle';

  for (let i = 0; i < lines.length; i++) {
    oc.fillText(lines[i], w / 2, startY + i * lineGap);
  }

  return sampleCanvasPixels(off, w, h, w < 768 ? 7 : Math.max(4, Math.round(6 - (w - 768) / 1500)));
}

/* ─── Sampling: scatter positions ─── */
function generateScatterPositions(w: number, h: number, count: number): { x: number; y: number }[] {
  const m = 20;
  return Array.from({ length: count }, () => ({
    x: m + Math.random() * (w - m * 2),
    y: m + Math.random() * (h - m * 2),
  }));
}

/* ─── Shared pixel sampling helper ─── */
function sampleCanvasPixels(
  canvas: HTMLCanvasElement, w: number, h: number, gap: number,
): { x: number; y: number }[] {
  const img = canvas.getContext('2d')!.getImageData(0, 0, w, h);
  const pts: { x: number; y: number }[] = [];
  for (let py = 0; py < h; py += gap) {
    for (let px = 0; px < w; px += gap) {
      if (img.data[(py * w + px) * 4 + 3] > 64) {
        pts.push({ x: px, y: py });
      }
    }
  }
  return pts;
}

/* ─── Fallback: ellipse ─── */
function generateFallbackPoints(w: number, h: number, count: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const cx = w / 2;
  const cy = h * 0.42;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const s = 0.6 + Math.random() * 0.8;
    pts.push({ x: cx + Math.cos(a) * w * 0.25 * s, y: cy + Math.sin(a) * h * 0.1 * s });
  }
  return pts;
}

/* ─── Component ─── */
export default function HeroParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const themeRef = useRef<'dark' | 'light'>('dark');
  const stateRef = useRef({
    particles: [] as Particle[],
    mouse: { x: -9999, y: -9999 },
    raf: 0,
    time: 0,
    w: 0,
    h: 0,
    dpr: 1,
    phase: 'scatter' as Phase,
    phaseStart: 0,
  });

  const { theme } = useTheme();
  themeRef.current = theme;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const el = canvas;
    const c = ctx;
    const S = stateRef.current;
    let alive = true;

    /* ─── Create Particle ─── */
    function makeParticle(tx: number, ty: number, scatter?: boolean, color?: string): Particle {
      const { w, h } = S;
      return {
        x: scatter ? tx : (Math.random() - 0.5) * w * 0.3 + w / 2,
        y: scatter ? ty : (Math.random() - 0.5) * h * 0.3 + h / 2,
        targetX: tx, targetY: ty,
        size: 3 + Math.random() * 2.5,
        baseAlpha: 0.4 + Math.random() * 0.6,
        alpha: 0,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        floatPhase: Math.random() * Math.PI * 2,
        floatSpeed: 0.3 + Math.random() * 0.5,
        floatRadius: 0.5 + Math.random() * 2.5,
        colorIdx: Math.floor(Math.random() * 4),
        hasGlow: Math.random() < CFG.glowChance,
        customColor: color,
      };
    }

    /* ─── Build particles from targets ─── */
    function buildParticles(targets: Target[], scatter?: boolean) {
      const existing = S.particles;
      if (existing.length === 0) {
        S.particles = targets.map((t) => makeParticle(t.x, t.y, scatter, t.color));
      } else {
        const minLen = Math.min(existing.length, targets.length);
        for (let i = 0; i < minLen; i++) {
          existing[i].targetX = targets[i].x;
          existing[i].targetY = targets[i].y;
          existing[i].customColor = targets[i].color;
        }
        if (targets.length > existing.length) {
          for (let i = existing.length; i < targets.length; i++) {
            existing.push(makeParticle(targets[i].x, targets[i].y, false, targets[i].color));
          }
        } else if (existing.length > targets.length) {
          existing.length = targets.length;
        }
      }
    }

    /* ─── Explosion: push all particles outward ─── */
    function triggerExplosion() {
      const cx = S.w / 2;
      const cy = S.h / 2;
      for (const p of S.particles) {
        const dx = p.x - cx;
        const dy = p.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        p.vx = (dx / dist) * CFG.explosionForce + (Math.random() - 0.5) * CFG.explosionForce * 0.3;
        p.vy = (dy / dist) * CFG.explosionForce + (Math.random() - 0.5) * CFG.explosionForce * 0.3;
      }
    }

    /* ─── Generate targets for current phase ─── */
    function getPhaseTargets(phase: Phase): Target[] {
      const { w, h } = S;
      const isMobile = w < 768;
      const density = isMobile ? CFG.mobileDensityPerK : CFG.densityPerK;
      const maxP = Math.min(Math.floor((w * h) / 1000 * density), isMobile ? 600 : 4000);
      const count = Math.min(maxP, 4000);

      let pts: Target[];

      switch (phase) {
        case 'scatter':
          pts = generateScatterPositions(w, h, count);
          break;

        case 'terminal':
          if (terminalImg) {
            pts = sampleImageToPoints(terminalImg, w, h, count);
          } else {
            pts = [];
          }
          if (pts.length === 0) pts = generateFallbackPoints(w, h, count);
          break;

        case 'explode1':
          // Keep current positions as targets (just drifting during explosion)
          pts = S.particles.map((p) => ({ x: p.x, y: p.y }));
          break;

        case 'buildYourOwn':
          pts = sampleWordsToPoints(w, h, ['BUILD YOUR', 'OWN'], h * 0.42, Math.max(50, Math.min(w * 0.12, h * 0.25, 360)));
          if (pts.length === 0) pts = generateFallbackPoints(w, h, count);
          break;

        case 'explode2':
          pts = S.particles.map((p) => ({ x: p.x, y: p.y }));
          break;

        case 'stable':
          pts = sampleWordsToPoints(w, h, ['CLAUDE', 'CODE'], h * 0.42);
          if (pts.length === 0) pts = generateFallbackPoints(w, h, count);
          break;

        default:
          pts = generateScatterPositions(w, h, count);
      }

      // Shuffle and limit
      for (let i = pts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pts[i], pts[j]] = [pts[j], pts[i]];
      }
      return pts.slice(0, count);
    }

    /* ─── Phase transition ─── */
    function advancePhase() {
      const idx = PHASE_ORDER.indexOf(S.phase);
      const nextIdx = (idx + 1) % PHASE_ORDER.length;
      const nextPhase = PHASE_ORDER[nextIdx];
      S.phase = nextPhase;
      S.phaseStart = S.time;

      if (nextPhase === 'explode1' || nextPhase === 'explode2') {
        triggerExplosion();
      } else {
        const targets = getPhaseTargets(nextPhase);
        if (targets.length > 0) buildParticles(targets, nextPhase === 'scatter');
      }
    }

    /* ─── Resize ─── */
    function resize() {
      S.dpr = Math.min(window.devicePixelRatio || 1, 2);
      S.w = window.innerWidth;
      S.h = window.innerHeight;
      el.width = S.w * S.dpr;
      el.height = S.h * S.dpr;
      el.style.width = `${S.w}px`;
      el.style.height = `${S.h}px`;

      // Reset to scatter on resize (re-run animation)
      S.phase = 'scatter';
      S.phaseStart = S.time;

      const targets = getPhaseTargets('scatter');
      if (targets.length > 0) {
        buildParticles(targets, true);
      }
    }

    /* ─── Animation Loop ─── */
    function animate() {
      if (!alive) return;

      const { dpr, w, h, particles, mouse } = S;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, w, h);

      S.time += 0.016;
      const t = S.time;

      // Phase transition check
      const phaseElapsed = t - S.phaseStart;
      if (phaseElapsed >= PHASE_DURATION[S.phase]) {
        advancePhase();
      }

      // For explode phases, set real targets partway through
      if (S.phase === 'explode1' && phaseElapsed > 0.4) {
        S.phase = 'buildYourOwn';
        S.phaseStart = t;
        const targets = getPhaseTargets('buildYourOwn');
        if (targets.length > 0) buildParticles(targets);
      }
      if (S.phase === 'explode2' && phaseElapsed > 0.4) {
        S.phase = 'stable';
        S.phaseStart = t;
        const targets = getPhaseTargets('stable');
        if (targets.length > 0) buildParticles(targets);
      }

      const breathe = Math.sin(t * CFG.breatheSpeed) * CFG.breatheAmp;
      const pal = themeRef.current === 'light' ? PALETTE.light : PALETTE.dark;
      const len = particles.length;
      for (let i = 0; i < len; i++) {
        const p = particles[i];

        // Float offset (stronger in scatter, gentler when formed)
        const floatMult = (S.phase === 'scatter' || S.phase === 'explode1' || S.phase === 'explode2') ? 3 : 1;
        const fx = Math.sin(t * p.floatSpeed + p.floatPhase) * p.floatRadius * floatMult;
        const fy = Math.cos(t * p.floatSpeed * 0.7 + p.floatPhase + 1.3) * p.floatRadius * floatMult;

        // Spring toward target
        const tx = p.targetX + fx;
        const ty = p.targetY + fy;
        p.vx += (tx - p.x) * CFG.ease;
        p.vy += (ty - p.y) * CFG.ease;

        // Mouse repulsion (all phases)
        const mdx = p.x - mouse.x;
        const mdy = p.y - mouse.y;
        const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mDist < CFG.mouseRadius && mDist > 0.1) {
          const str = 1 - mDist / CFG.mouseRadius;
          const force = str * str * str * CFG.mouseForce;
          p.vx += (mdx / mDist) * force;
          p.vy += (mdy / mDist) * force;
        }

        // Damping
        p.vx *= CFG.damping;
        p.vy *= CFG.damping;
        p.x += p.vx;
        p.y += p.vy;

        // Fade in + breathing
        p.alpha = Math.min(p.baseAlpha, p.alpha + CFG.fadeInRate);
        const alpha = Math.max(0.08, Math.min(1, p.alpha + breathe));

        // Glow layer
        if (p.hasGlow) {
          c.globalAlpha = alpha * 0.35;
          c.fillStyle = pal.glow;
          const gs = p.size * 3;
          c.fillRect(p.x - gs / 2, p.y - gs / 2, gs, gs);
        }

        // Main particle
        c.globalAlpha = alpha;
        c.fillStyle = p.customColor ?? pal.main[p.colorIdx];
        c.fillRect(p.x - p.size / 2 | 0, p.y - p.size / 2 | 0, p.size, p.size);
      }

      c.globalAlpha = 1;
      S.raf = requestAnimationFrame(animate);
    }

    /* ─── Event Handlers ─── */
    function onMouseMove(e: MouseEvent) {
      S.mouse.x = e.clientX;
      S.mouse.y = e.clientY;
    }
    function onMouseLeave() {
      S.mouse.x = -9999;
      S.mouse.y = -9999;
    }
    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 0) return;
      S.mouse.x = e.touches[0].clientX;
      S.mouse.y = e.touches[0].clientY;
    }
    function onTouchEnd() {
      S.mouse.x = -9999;
      S.mouse.y = -9999;
    }

    /* ─── Start ─── */
    preloadTerminalImage();
    resize();
    animate();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('resize', resize);

    return () => {
      alive = false;
      cancelAnimationFrame(S.raf);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-[2]"
    />
  );
}
