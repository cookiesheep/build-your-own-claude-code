"use client";

import { useEffect, useRef } from "react";

interface VoiceWaveformProps {
  active: boolean;
  analyser?: AnalyserNode | null;
  variant?: "listening" | "speaking";
  className?: string;
}
export default function VoiceWaveform({
  active,
  analyser,
  variant = "speaking",
  className,
}: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let frame = 0;
    let animationFrame = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue("--accent").trim() || "#D4A574";
    const chalk = styles.getPropertyValue("--text-primary").trim() || "#E8E4DD";
    const timeData = analyser ? new Uint8Array(analyser.fftSize) : null;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect();
      context.clearRect(0, 0, width, height);
      const middle = height / 2;

      context.beginPath();
      context.moveTo(0, middle);
      context.lineTo(width, middle);
      context.strokeStyle = `${chalk}24`;
      context.lineWidth = 1;
      context.stroke();

      context.beginPath();
      const points = Math.max(28, Math.floor(width / 3));
      if (analyser && timeData && active) analyser.getByteTimeDomainData(timeData);

      for (let index = 0; index <= points; index += 1) {
        const x = (index / points) * width;
        let normalized = 0;
        if (analyser && timeData && active) {
          const sampleIndex = Math.min(
            timeData.length - 1,
            Math.floor((index / points) * timeData.length),
          );
          normalized = (timeData[sampleIndex] - 128) / 128;
        } else if (active && !reducedMotion) {
          const envelope = Math.sin((index / points) * Math.PI);
          normalized =
            (Math.sin(index * 0.74 + frame * 0.12) * 0.55 +
              Math.sin(index * 0.27 - frame * 0.08) * 0.25) *
            envelope;
        }
        const amplitude = active ? height * (variant === "listening" ? 0.38 : 0.3) : 0;
        const y = middle + normalized * amplitude;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }

      context.strokeStyle = active ? accent : `${chalk}45`;
      context.lineWidth = variant === "listening" ? 1.6 : 1.35;
      context.lineJoin = "round";
      context.lineCap = "round";
      context.shadowColor = active ? accent : "transparent";
      context.shadowBlur = active ? 5 : 0;
      context.stroke();
      frame += 1;

      if (active && !reducedMotion) animationFrame = requestAnimationFrame(draw);
    };

    resize();
    draw();
    const observer = new ResizeObserver(() => {
      resize();
      draw();
    });
    observer.observe(canvas);
    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, [active, analyser, variant]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
