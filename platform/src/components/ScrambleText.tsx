'use client';

import { useEffect, useRef } from 'react';

const SCRAMBLE_CHARS = '{}<>=()/;:+-*&|!?#@[]~01';

function rnd() {
  return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
}

type Mode = 'scramble' | 'typewriter' | 'glow';

interface Props {
  text: string;
  className?: string;
  mode?: Mode;
  stagger?: number;
  speed?: number;
}

export default function ScrambleText({
  text,
  className,
  mode = 'scramble',
  stagger,
  speed,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  const defaultStagger = stagger ?? (mode === 'scramble' ? 80 : mode === 'typewriter' ? 55 : 45);
  const defaultSpeed = speed ?? 50;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (mode === 'scramble') runScramble(el, text, defaultStagger, defaultSpeed);
    else if (mode === 'typewriter') runTypewriter(el, text, defaultStagger);
    else runGlow(el, text, defaultStagger);
  }, [text, mode, defaultStagger, defaultSpeed]);

  return (
    <span ref={ref} className={className} aria-label={text} />
  );
}

/* ─── Mode: Scramble (random code chars → correct text) ─── */

function runScramble(el: HTMLSpanElement, text: string, stagger: number, speed: number) {
  const chars = text.split('');
  let revealed = -1;
  let scrambleTimer: ReturnType<typeof setInterval> | undefined;
  let revealTimer: ReturnType<typeof setInterval> | undefined;

  const render = () => {
    el.textContent = chars
      .map((c, i) => (i <= revealed || c === ' ' ? c : rnd()))
      .join('');
  };

  const start = () => {
    clearInterval(scrambleTimer);
    clearInterval(revealTimer);
    revealed = -1;
    render();
    scrambleTimer = setInterval(render, speed);
    revealTimer = setInterval(() => {
      revealed++;
      if (revealed >= chars.length) {
        clearInterval(revealTimer);
        clearInterval(scrambleTimer);
        el.textContent = text;
      }
    }, stagger);
  };

  const stop = () => {
    clearInterval(scrambleTimer);
    clearInterval(revealTimer);
    revealed = -1;
    render();
  };

  observe(el, start, stop);
}

/* ─── Mode: Typewriter (chars appear one by one with blinking cursor) ─── */

function runTypewriter(el: HTMLSpanElement, text: string, stagger: number) {
  let idx = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  const CURSOR = '<span style="color:var(--accent);animation:cursor-blink 1s step-end infinite;font-weight:100">▌</span>';

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const start = () => {
    clearInterval(timer);
    idx = 0;
    el.innerHTML = CURSOR;

    timer = setInterval(() => {
      if (idx < text.length) {
        idx++;
        el.innerHTML = esc(text.slice(0, idx)) + CURSOR;
      } else {
        clearInterval(timer);
      }
    }, stagger);
  };

  const stop = () => {
    clearInterval(timer);
    idx = 0;
    el.textContent = text; // keep final text → no layout shift
  };

  observe(el, start, stop);
}

/* ─── Mode: Glow (amber light wave sweeps across text) ─── */

function runGlow(el: HTMLSpanElement, text: string, stagger: number) {
  const chars = text.split('');
  const timeouts: ReturnType<typeof setTimeout>[] = [];

  const start = () => {
    timeouts.forEach(clearTimeout);
    el.innerHTML = '';
    chars.forEach((char, i) => {
      const span = document.createElement('span');
      span.textContent = char;
      span.style.cssText = 'opacity:0;display:inline-block;transition:opacity 0.35s ease,text-shadow 0.35s ease,color 0.35s ease;';
      el.appendChild(span);

      const t = setTimeout(() => {
        span.style.opacity = '1';
        span.style.color = 'var(--accent)';
        span.style.textShadow = '0 0 12px var(--accent)';
        setTimeout(() => {
          span.style.color = '';
          span.style.textShadow = 'none';
        }, 350);
      }, i * stagger);
      timeouts.push(t);
    });
  };

  const stop = () => {
    timeouts.forEach(clearTimeout);
    el.textContent = text; // keep final text → no layout shift
  };

  observe(el, start, stop);
}

/* ─── Shared IntersectionObserver ─── */

function observe(
  el: HTMLSpanElement,
  onEnter: () => void,
  onLeave: () => void,
) {
  const obs = new IntersectionObserver(
    ([e]) => {
      if (e.isIntersecting) onEnter();
      else onLeave();
    },
    { threshold: 0.3 },
  );
  obs.observe(el);
}
