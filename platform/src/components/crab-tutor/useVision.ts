"use client";

import { useCallback, useState } from "react";
import type { VisionAnnotation } from "@/lib/minicpm-client";

export interface VisionCapture {
  dataUrl: string;
  annotations: VisionAnnotation[];
  visibleHeadings: string[];
}
function visibleHeadingElements(): HTMLElement[] {
  const tutorRoot = document.querySelector("[data-crab-tutor-root]");
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      "h1, h2, h3, [data-crab-vision-label]",
    ),
  ).filter((element) => {
    if (tutorRoot?.contains(element)) return false;
    const rect = element.getBoundingClientRect();
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom > 0 &&
      rect.top < window.innerHeight &&
      rect.right > 0 &&
      rect.left < window.innerWidth
    );
  });
}

function trimLabel(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length > 18 ? `${cleaned.slice(0, 18)}…` : cleaned;
}

function createAnnotations(elements: HTMLElement[]): VisionAnnotation[] {
  const viewportWidth = Math.max(window.innerWidth, 1);
  const viewportHeight = Math.max(window.innerHeight, 1);
  const selected = elements.slice(0, 3);

  if (!selected.length) {
    return [
      {
        id: "vision-main",
        label: "当前学习区域",
        x: 8,
        y: 18,
        width: 76,
        height: 50,
      },
      {
        id: "vision-action",
        label: "Agent 学习线索",
        x: 58,
        y: 70,
        width: 34,
        height: 18,
      },
    ];
  }

  return selected.map((element, index) => {
    const rect = element.getBoundingClientRect();
    const paddingX = 10;
    const paddingY = 7;
    const x = Math.max(1, ((rect.left - paddingX) / viewportWidth) * 100);
    const y = Math.max(1, ((rect.top - paddingY) / viewportHeight) * 100);
    const width = Math.min(
      98 - x,
      ((Math.min(rect.width + paddingX * 2, viewportWidth) / viewportWidth) * 100),
    );
    const height = Math.min(
      98 - y,
      ((Math.min(rect.height + paddingY * 2, viewportHeight) / viewportHeight) * 100),
    );
    return {
      id: `vision-${index}`,
      label: trimLabel(element.textContent || `学习区域 ${index + 1}`),
      x,
      y,
      width: Math.max(width, 18),
      height: Math.max(height, 8),
    };
  });
}

function downscaleCanvas(source: HTMLCanvasElement): string {
  const maxWidth = 960;
  const maxHeight = 600;
  const ratio = Math.min(maxWidth / source.width, maxHeight / source.height, 1);
  const output = document.createElement("canvas");
  output.width = Math.max(1, Math.round(source.width * ratio));
  output.height = Math.max(1, Math.round(source.height * ratio));
  const context = output.getContext("2d");
  if (!context) return source.toDataURL("image/jpeg", 0.68);
  context.drawImage(source, 0, 0, output.width, output.height);
  return output.toDataURL("image/jpeg", 0.68);
}

export function useVision() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const captureViewport = useCallback(async (): Promise<VisionCapture | null> => {
    setError(null);
    setIsCapturing(true);
    try {
      const [{ default: html2canvas }] = await Promise.all([
        import("html2canvas"),
        document.fonts?.ready ?? Promise.resolve(),
      ]);
      const elements = visibleHeadingElements();
      const styles = getComputedStyle(document.documentElement);
      const canvas = await html2canvas(document.body, {
        x: window.scrollX,
        y: window.scrollY,
        width: window.innerWidth,
        height: window.innerHeight,
        scale: Math.min(window.devicePixelRatio || 1, 1.35),
        useCORS: true,
        logging: false,
        backgroundColor: styles.getPropertyValue("--bg-page").trim() || "#0B0B0B",
        ignoreElements: (element) =>
          element instanceof HTMLElement &&
          (element.dataset.html2canvasIgnore === "true" ||
            element.closest("[data-html2canvas-ignore='true']") !== null),
      });

      return {
        dataUrl: downscaleCanvas(canvas),
        annotations: createAnnotations(elements),
        visibleHeadings: elements
          .map((element) => trimLabel(element.textContent ?? ""))
          .filter(Boolean)
          .slice(0, 4),
      };
    } catch (caught) {
      console.error("[crab-tutor] viewport capture failed", caught);
      setError("屏幕截图没有完成，请检查页面权限后再试。 ");
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, []);

  return { captureViewport, isCapturing, error };
}
