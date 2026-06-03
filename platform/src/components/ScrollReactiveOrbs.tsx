'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from './ThemeProvider';

const ORBS = [
  {
    cls: 'absolute -left-[8%] -top-[5%] h-[65vh] w-[65vh] rounded-full',
    color: '#D4A574',
    colorLight: '#C17F4E',
    blur: 60,
    rate: 0.15,
    opacity: [0.20, 0.12, 0.18] as [number, number, number],
  },
  {
    cls: 'absolute -right-[5%] -top-[10%] h-[50vh] w-[50vh] rounded-full',
    color: '#8B5CF6',
    colorLight: '#8B5CF6',
    blur: 55,
    rate: -0.08,
    opacity: [0.25, 0.15, 0.10] as [number, number, number],
  },
  {
    cls: 'absolute left-[10%] bottom-[5%] h-[45vh] w-[45vh] rounded-full',
    color: '#2DD4BF',
    colorLight: '#2DD4BF',
    blur: 50,
    rate: 0.12,
    opacity: [0.08, 0.20, 0.15] as [number, number, number],
  },
  {
    cls: 'absolute right-[20%] top-[40%] h-[40vh] w-[40vh] rounded-full',
    color: '#F472B6',
    colorLight: '#F472B6',
    blur: 50,
    rate: -0.10,
    opacity: [0.35, 0.18, 0.25] as [number, number, number],
  },
];

function lerp3(v: [number, number, number], t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c <= 0.5
    ? v[0] + (v[1] - v[0]) * (c / 0.5)
    : v[1] + (v[2] - v[1]) * ((c - 0.5) / 0.5);
}

export default function ScrollReactiveOrbs() {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const { theme } = useTheme();

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? scrollY / docHeight : 0;

        ORBS.forEach((orb, i) => {
          const el = refs.current[i];
          if (!el) return;
          el.style.transform = `translateY(${scrollY * orb.rate}px)`;
          el.style.opacity = String(lerp3(orb.opacity, progress));
        });
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
      {ORBS.map((orb, i) => (
        <div
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          className={orb.cls}
          style={{
            background: `radial-gradient(circle, ${i === 0 && theme === 'light' ? orb.colorLight : orb.color} 0%, transparent 60%)`,
            filter: `blur(${orb.blur}px)`,
            willChange: 'transform',
          }}
        />
      ))}
    </div>
  );
}
