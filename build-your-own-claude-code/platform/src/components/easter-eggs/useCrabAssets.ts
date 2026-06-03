import { useEffect, useState } from "react";

/* ═══════════════════════════════════════════════════════════
 *  Shared utilities for crab easter egg components
 * ═══════════════════════════════════════════════════════════ */

/** Fisher-Yates shuffle */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Preload images with a deadline.
 * Returns a Set of URLs that loaded successfully.
 * Unresolved URLs at deadline are silently skipped.
 */
export function preloadImages(
  urls: string[],
  deadline = 3000,
): Promise<Set<string>> {
  return new Promise((resolve) => {
    if (urls.length === 0) {
      resolve(new Set());
      return;
    }

    const loaded = new Set<string>();
    let settled = 0;
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      resolve(loaded);
    };

    // Deadline: resolve with whatever loaded so far
    setTimeout(finish, deadline);

    for (const url of urls) {
      const img = new Image();
      img.onload = () => {
        loaded.add(url);
        settled++;
        if (settled === urls.length) finish();
      };
      img.onerror = () => {
        settled++;
        if (settled === urls.length) finish();
      };
      img.src = url;
    }
  });
}

/** Detect prefers-reduced-motion */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return reduced;
}

/** Detect mobile viewport (width < breakpoint) */
export function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return mobile;
}
