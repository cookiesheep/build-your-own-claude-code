"use client";

import { useEffect } from "react";
import { recordVisit } from "@/lib/api";

/**
 * App-level visit recorder.
 * Mount once in root layout — records a visit on the first load of each
 * browser session (sessionStorage dedup). Closing the tab/window resets
 * the flag so the next visit counts as a new session.
 */
export default function VisitRecorder() {
  useEffect(() => {
    recordVisit().catch(() => {
      /* Silently ignore — counter display will fall back to 0 */
    });
  }, []);

  return null;
}
