'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from './ThemeProvider';

/* ─── Types ─── */
interface Particle {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
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
  scatter: 6,
  terminal: 12,
  explode1: 4,
  buildYourOwn: 7,
  explode2: 4,
  stable: 12,        // loops back to scatter after this
};


const PHASE_ORDER: Phase[] = [
  'scatter', 'terminal', 'explode1', 'buildYourOwn', 'explode2', 'stable',
];

/* ─── Config (user-tuned values preserved) ─── */
const CFG = {
  densityPerK: 5.0,
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
  flowNoiseScale: 0.005,
  flowNoiseForce: 0.0015,
  flowDamping: 0.98,
  flowVortexRadius: 200,
  flowVortexForce: 0.09,
  flowIllumRadius: 200,
  flowIllumBoost: 1.9,
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

/* ─── Perlin Noise (ported from LoginFlowField) ─── */

function makeNoise(seed: number) {
  const perm = new Uint8Array(512);
  const grad = [
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [1, 0], [-1, 0], [0, 1], [0, -1],
  ];
  let s = seed;
  function rng() {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  }
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  function dot(g: number[], x: number, y: number) {
    return g[0] * x + g[1] * y;
  }
  function fade(t: number) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  return function noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);

    const aa = perm[perm[X] + Y] & 7;
    const ab = perm[perm[X] + Y + 1] & 7;
    const ba = perm[perm[X + 1] + Y] & 7;
    const bb = perm[perm[X + 1] + Y + 1] & 7;

    const x1 = dot(grad[aa], xf, yf) * (1 - u) + dot(grad[ba], xf - 1, yf) * u;
    const x2 = dot(grad[ab], xf, yf - 1) * (1 - u) + dot(grad[bb], xf - 1, yf - 1) * u;
    return x1 * (1 - v) + x2 * v;
  };
}

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
    flowTime: 100,
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

    // Flow field noise generators (seed offset from login page)
    const noiseFn = makeNoise(42);
    const noiseFn2 = makeNoise(137);

    /* ─── Create Particle ─── */
    function makeParticle(tx: number, ty: number, scatter?: boolean, color?: string): Particle {
      const { w, h } = S;
      const startX = scatter ? tx : (Math.random() - 0.5) * w * 0.3 + w / 2;
      const startY = scatter ? ty : (Math.random() - 0.5) * h * 0.3 + h / 2;
      return {
        x: startX,
        y: startY,
        prevX: startX,
        prevY: startY,
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
      const maxP = Math.min(Math.floor((w * h) / 1000 * density), isMobile ? 600 : 8000);
      const count = Math.min(maxP, 8000);

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
      const isMobile = w < 768;

      // ── Scroll-based mode blending ──
      const scrollY = window.scrollY || 0;
      const heroH = h;
      let blend = 0;     // 0 = Hero, 1 = Flow
      let deepFade = 1;  // additional fade deep in flow

      if (!isMobile) {
        if (scrollY < heroH * 0.3) {
          blend = 0;
        } else if (scrollY < heroH * 0.7) {
          blend = (scrollY - heroH * 0.3) / (heroH * 0.4);
        } else {
          blend = 1;
          // Fade based on total page content, not viewport — consistent across screen sizes
          const scrollRange = document.documentElement.scrollHeight - heroH;
          const fadeLen = scrollRange * 1.0;
          deepFade = fadeLen > 0 ? Math.max(0, 1 - (scrollY - heroH * 0.7) / fadeLen) : 0;
        }
      }

      const mobileDissolve = isMobile
        ? (scrollY > h * 0.2 ? Math.min(1, (scrollY - h * 0.2) / (h * 0.6)) : 0)
        : 0;

      // ── Canvas: always clear (transparent → background effects visible) ──
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, w, h);

      S.time += 0.016;
      S.flowTime += 0.003;
      const t = S.time;
      const ft = S.flowTime;

      // ── Phase transition (Hero mode only) ──
      if (blend < 0.3) {
        const phaseElapsed = t - S.phaseStart;
        if (phaseElapsed >= PHASE_DURATION[S.phase]) {
          advancePhase();
        }
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
      }

      const breathe = Math.sin(t * CFG.breatheSpeed) * CFG.breatheAmp;
      const pal = themeRef.current === 'light' ? PALETTE.light : PALETTE.dark;
      const len = particles.length;

      for (let i = 0; i < len; i++) {
        const p = particles[i];

        // Skip when fully faded out deep in flow
        if (deepFade < 0.01 && blend > 0.5) continue;

        // ── Hero: spring toward target (diminishes with blend) ──
        if (blend < 1) {
          const springMult = 1 - blend;
          const floatMult = (S.phase === 'scatter' || S.phase === 'explode1' || S.phase === 'explode2') ? 3 : 1;
          const fx = Math.sin(t * p.floatSpeed + p.floatPhase) * p.floatRadius * floatMult;
          const fy = Math.cos(t * p.floatSpeed * 0.7 + p.floatPhase + 1.3) * p.floatRadius * floatMult;
          p.vx += (p.targetX + fx - p.x) * CFG.ease * springMult;
          p.vy += (p.targetY + fy - p.y) * CFG.ease * springMult;
        }

        // ── Flow: gentle noise drift (all particles) ──
        if (blend > 0) {
          // Normalize force by viewport — same perceived speed on all screens
          const viewNorm = h / 900;
          const ns = CFG.flowNoiseScale;
          const n1 = noiseFn(p.x * ns, p.y * ns + ft) * Math.PI * 2;
          const n2 = noiseFn2(p.x * ns * 0.7 + 100, p.y * ns * 0.7 + ft * 0.6) * Math.PI * 2;
          const angle = n1 * 0.7 + n2 * 0.3;
          const force = CFG.flowNoiseForce * viewNorm * blend;
          p.vx += Math.cos(angle) * force;
          p.vy += Math.sin(angle) * force;
        }

        // ── Mouse interaction ──
        const mdx = p.x - mouse.x;
        const mdy = p.y - mouse.y;
        const mDist = Math.sqrt(mdx * mdx + mdy * mdy);

        // Hero repulsion (diminishes with blend)
        if (blend < 1 && mDist < CFG.mouseRadius && mDist > 0.1) {
          const str = 1 - mDist / CFG.mouseRadius;
          const force = str * str * str * CFG.mouseForce * (1 - blend);
          p.vx += (mdx / mDist) * force;
          p.vy += (mdy / mDist) * force;
        }

        // Flow vortex (spiral around cursor)
        if (blend > 0 && mDist < CFG.flowVortexRadius && mDist > 1) {
          const vStr = 1 - mDist / CFG.flowVortexRadius;
          const vForce = vStr * vStr * CFG.flowVortexForce * blend;
          const tanX = -mdy / mDist;
          const tanY = mdx / mDist;
          const radX = -mdx / mDist;
          const radY = -mdy / mDist;
          p.vx += (tanX * 0.85 + radX * 0.15) * vForce;
          p.vy += (tanY * 0.85 + radY * 0.15) * vForce;
        }

        // ── Damping (blend hero → flow) ──
        p.vx *= CFG.damping + (CFG.flowDamping - CFG.damping) * blend;
        p.vy *= CFG.damping + (CFG.flowDamping - CFG.damping) * blend;

        // Mobile dissolve drift
        if (mobileDissolve > 0) p.vy += mobileDissolve * 0.4;

        // ── Position update ──
        p.x += p.vx;
        p.y += p.vy;

        // ── Edge wrapping (Flow mode) ──
        if (blend > 0.3) {
          const m = 10;
          if (p.x < -m) p.x = w + m;
          else if (p.x > w + m) p.x = -m;
          if (p.y < -m) p.y = h + m;
          else if (p.y > h + m) p.y = -m;
        }

        // ── Alpha (smooth blend hero ↔ flow) ──
        p.alpha = Math.min(p.baseAlpha, p.alpha + CFG.fadeInRate);
        let alpha: number;

        if (blend < 0.01) {
          // Pure Hero + mobile dissolve
          const dissolveAlpha = 1 - mobileDissolve * 0.85;
          alpha = Math.max(0.02, Math.min(1, (p.alpha + breathe) * dissolveAlpha));
        } else {
          // Transition / Flow
          const heroAlpha = Math.max(0.02, Math.min(1, p.alpha + breathe));
          const flowAlpha = 0.07 + (i % 10) * 0.08; // 0.05-0.14
          alpha = heroAlpha * (1 - blend) + flowAlpha * blend;

          // Illumination: brighten near cursor
          if (mDist < CFG.flowIllumRadius) {
            const illum = 1 - mDist / CFG.flowIllumRadius;
            alpha += illum * illum * blend * CFG.flowIllumBoost;
          }

          alpha = Math.max(0, Math.min(1, alpha * deepFade));
        }

        if (alpha < 0.01) continue;

        const color = p.customColor ?? pal.main[p.colorIdx];

        // ── Draw (always pixel rect — never lines) ──
        if (p.hasGlow && alpha > 0.1) {
          c.globalAlpha = alpha * 0.35;
          c.fillStyle = pal.glow;
          const gs = p.size * 3;
          c.fillRect(p.x - gs / 2, p.y - gs / 2, gs, gs);
        }

        c.globalAlpha = alpha;
        c.fillStyle = color;
        c.fillRect(p.x - p.size / 2 | 0, p.y - p.size / 2 | 0, p.size, p.size);
      }

      // Cursor glow in Flow mode
      if (blend > 0.5 && mouse.x > 0 && deepFade > 0.1) {
        const glow = c.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 150);
        const accentBase = themeRef.current === 'light' ? '180,110,55' : '212,165,116';
        glow.addColorStop(0, `rgba(${accentBase},${0.04 * deepFade})`);
        glow.addColorStop(1, `rgba(${accentBase},0)`);
        c.fillStyle = glow;
        c.globalAlpha = 1;
        c.fillRect(mouse.x - 150, mouse.y - 150, 300, 300);
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
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
