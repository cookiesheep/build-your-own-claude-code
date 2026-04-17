"use client";

import { useEffect, useRef, useCallback } from "react";
import { useTheme } from "./ThemeProvider";

// Simple 2D noise (no external dep)
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

type FlowFieldProps = {
  intensity?: number;      // 0-1, controls turbulence (default 0.6)
  particleCount?: number;  // total particles (default 700)
  mouseRadius?: number;    // mouse gravity well radius in px (default 200)
  trailAlpha?: number;     // trail persistence: lower = longer trails (dark: 0.04, light: 0.06)
  lineAlpha?: number;      // line opacity: dark 0.4, light 0.6
  noiseScale?: number;     // flow field resolution (default 0.002)
  speedMin?: number;       // min particle speed (default 0.4)
  speedMax?: number;       // max particle speed (default 1.2)
  shockwave?: { x: number; y: number; t: number } | null;
};

export default function LoginFlowField({
  intensity = 0.6,
  particleCount = 700,
  mouseRadius = 200,
  lineAlpha,
  noiseScale = 0.002,
  speedMin = 0.4,
  speedMax = 1.2,
  shockwave,
}: FlowFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const shockRef = useRef(shockwave);
  const animRef = useRef(0);
  const themeRef = useRef("dark");
  const { theme } = useTheme();

  shockRef.current = shockwave;

  const isDark = useCallback(() => {
    if (typeof document === "undefined") return true;
    return document.documentElement.getAttribute("data-theme") !== "light";
  }, []);

  // Clear canvas on theme change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dark = theme === "dark";
    ctx.fillStyle = dark ? "#0B0B0B" : "#F7F4EF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    themeRef.current = dark ? "dark" : "light";
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const noise = makeNoise(42);
    const noise2 = makeNoise(137);
    let w = 0;
    let h = 0;
    let time = 0;

    interface Particle {
      x: number;
      y: number;
      prevX: number;
      prevY: number;
      life: number;
      maxLife: number;
      speed: number;
      hue: number;
    }

    const particles: Particle[] = [];

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = w + "px";
      canvas!.style.height = h + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawnParticle(randomPosition: boolean): Particle {
      let x: number, y: number;
      if (randomPosition) {
        x = Math.random() * w;
        y = Math.random() * h;
      } else {
        const edge = Math.random() * 4;
        if (edge < 1) { x = Math.random() * w; y = -10; }
        else if (edge < 2) { x = w + 10; y = Math.random() * h; }
        else if (edge < 3) { x = Math.random() * w; y = h + 10; }
        else { x = -10; y = Math.random() * h; }
      }
      const maxLife = 150 + Math.random() * 250;
      return {
        x, y, prevX: x, prevY: y,
        life: 0, maxLife,
        speed: speedMin + Math.random() * (speedMax - speedMin),
        hue: Math.random(),
      };
    }

    function init() {
      resize();
      particles.length = 0;
      for (let i = 0; i < particleCount; i++) {
        particles.push(spawnParticle(true));
      }
    }

    function getColor(hue: number, alpha: number, dark: boolean): string {
      const t = hue;
      if (dark) {
        const r = Math.round(212 - t * 40);
        const g = Math.round(165 - t * 30 + (1 - t) * 20);
        const b = Math.round(116 - t * 50);
        return `rgba(${r},${g},${b},${alpha})`;
      } else {
        // Light mode: darker, more saturated for visibility on light bg
        const r = Math.round(180 - t * 40);
        const g = Math.round(110 - t * 25);
        const b = Math.round(55 - t * 20);
        return `rgba(${r},${g},${b},${alpha})`;
      }
    }

    function update() {
      time += 0.003;
      const dark = isDark();
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const sw = shockRef.current;

      const effectiveLineAlpha = lineAlpha ?? (dark ? 0.4 : 0.6);

      // Clear with trail
      if (dark) {
        ctx!.fillStyle = "rgba(11,11,11,0.04)";
      } else {
        ctx!.fillStyle = "rgba(247,244,239,0.06)";
      }
      ctx!.fillRect(0, 0, w, h);

      const scale = noiseScale * (0.8 + intensity * 0.4);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.prevX = p.x;
        p.prevY = p.y;

        const n1 = noise(p.x * scale, p.y * scale + time) * Math.PI * 2;
        const n2 = noise2(p.x * scale * 0.7 + 100, p.y * scale * 0.7 + time * 0.6) * Math.PI * 2;
        let angle = n1 * 0.7 + n2 * 0.3;

        // Mouse gravity well
        const dx = mx - p.x;
        const dy = my - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouseRadius && dist > 1) {
          const force = (mouseRadius - dist) / mouseRadius;
          angle += Math.atan2(dy, dx) * force * 0.6;
        }

        // Shockwave effect
        if (sw) {
          const sdx = p.x - sw.x;
          const sdy = p.y - sw.y;
          const sdist = Math.sqrt(sdx * sdx + sdy * sdy);
          const ring = Math.abs(sdist - sw.t * 400);
          if (ring < 80) {
            const push = (80 - ring) / 80;
            angle += Math.atan2(sdy, sdx) * push * 2;
            p.speed = Math.min(p.speed + push * 2, 4);
          }
        }

        p.x += Math.cos(angle) * p.speed;
        p.y += Math.sin(angle) * p.speed;
        p.speed = Math.max(speedMin, p.speed * 0.995);
        p.life++;

        const lifeRatio = p.life / p.maxLife;
        const alpha = lifeRatio < 0.1
          ? lifeRatio / 0.1
          : lifeRatio > 0.8
            ? (1 - lifeRatio) / 0.2
            : 1;

        ctx!.beginPath();
        ctx!.moveTo(p.prevX, p.prevY);
        ctx!.lineTo(p.x, p.y);
        ctx!.strokeStyle = getColor(p.hue, alpha * effectiveLineAlpha, dark);
        ctx!.lineWidth = dark ? 1.2 : 1.4;
        ctx!.stroke();

        // Respawn: 40% random interior, 60% edge — keeps center filled
        if (p.life > p.maxLife || p.x < -50 || p.x > w + 50 || p.y < -50 || p.y > h + 50) {
          particles[i] = spawnParticle(Math.random() < 0.4);
        }
      }

      // Mouse glow
      if (mx > 0 && my > 0) {
        const glow = ctx!.createRadialGradient(mx, my, 0, mx, my, 120);
        const accentColor = dark ? "rgba(212,165,116," : "rgba(180,110,55,";
        glow.addColorStop(0, accentColor + "0.04)");
        glow.addColorStop(1, accentColor + "0)");
        ctx!.fillStyle = glow;
        ctx!.fillRect(mx - 120, my - 120, 240, 240);
      }

      animRef.current = requestAnimationFrame(update);
    }

    init();
    animRef.current = requestAnimationFrame(update);

    const onResize = () => init();
    const onMouse = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };
    const onTouch = (e: TouchEvent) => {
      if (e.touches[0]) {
        mouseRef.current.x = e.touches[0].clientX;
        mouseRef.current.y = e.touches[0].clientY;
      }
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMouse);
    window.addEventListener("touchmove", onTouch, { passive: true });

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("touchmove", onTouch);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intensity, particleCount, mouseRadius, noiseScale, speedMin, speedMax, lineAlpha]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0"
      style={{ pointerEvents: "none" }}
    />
  );
}
