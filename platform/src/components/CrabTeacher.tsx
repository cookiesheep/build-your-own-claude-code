"use client";

import { useEffect, useRef, useState } from "react";
import { getVisitorCount } from "@/lib/api";
import CrabTutorPanel from "@/components/crab-tutor/CrabTutorPanel";

/* ─── Props ─── */
interface CrabTeacherProps {
  className?: string;
  style?: React.CSSProperties;
  /** Overall scale multiplier (default 1) */
  scale?: number;
  /** Enable idle animations (default true) */
  animate?: boolean;
}

/* ─── Count-up hook ─── */
function useCountUp(target: number | null, duration = 2000) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    if (target === null || target === 0) return;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(target * e));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return target === null ? null : display;
}

/* ─── Responsive viewport hook ───
 *  Returns a scale factor based on viewport width:
 *  - ≥768px (tablet/desktop): scale = 1
 *  - <768px (mobile): scale = viewport / 768, clamped to min 0.35
 *  Prevents the component from overflowing on small screens.    */
function useViewportScale(breakpoint = 768, minScale = 0.35) {
  const [vpScale, setVpScale] = useState(1);

  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      setVpScale(vw >= breakpoint ? 1 : Math.max(minScale, vw / breakpoint));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [breakpoint, minScale]);

  return vpScale;
}

/* ═══════════════════════════════════════════════════════════
 *  LAYOUT CONFIG — 手动调整每个元素的位置和大小
 *
 *  sceneW/sceneH: 整个组件的画布尺寸
 *  每个元素: x, y (相对画布左上角), w, h (显示尺寸)
 *  原始图片都是 1254×1254, 通过 w/h 缩放
 *  text: 访问次数文字的位置和大小
 *
 *  ★ 调整指南:
 *  - 想移动黑板? 改 blackboard 的 x, y
 *  - 想放大螃蟹? 改 crab.* 的 w, h (保持一致)
 *  - 想调整文字? 改 text 的 x, y, fontSize, labelFontSize
 *  - 想移动整组螃蟹? 改 crab.x, crab.y (其他 crab.* 用 dx/dy 相对偏移)
 * ═══════════════════════════════════════════════════════════ */
/* ─── Per-element position type (w/h optional, falls back to crab.w/h) ─── */
interface PartLayout {
  dx: number;
  dy: number;
  w?: number;
  h?: number;
}

const LAYOUT = {
  sceneW: 500,
  sceneH: 420,

  /* ── 黑板 ── */
  blackboard: { x: 50, y: 210, w: 200, h: 140 },

  /* ── 访问次数文字 ── */
  text: {
    x: 150,       // 文字中心 x
    y: 255,        // 数字 y
    fontSize: 32, // 数字大小
    labelFontSize: 12, // "visits" 标签大小
    labelGap: 4,  // 数字与标签间距
  },

  /* ── 螃蟹整体基准位置和大小 ── */
  crab: {
    x: 5,       // 螃蟹整体基准 x
    y: 290,        // 螃蟹整体基准 y
    w: 150,       // 螃蟹部件统一显示宽度
    h: 150,       // 螃蟹部件统一显示高度

    /* 各部件相对 crab.x/crab.y 的偏移，可独立设 w/h */
    body:         { dx: 0,  dy: 0 } as PartLayout,
    eyesOpen:     { dx: 25,  dy: 0, w: 100, h: 140 } as PartLayout,
    eyesClosed:   { dx: 0,  dy: 0 } as PartLayout,
    leftArm:      { dx: -35, dy: 0 } as PartLayout,
    rightArm:     { dx: 55,  dy: -20 } as PartLayout,

    /* 教鞭旋转轴心 (% 相对 rightArm 图) */
    pivotX: "50%",
    pivotY: "68%",
  },
};

/* ─── Component ─── */
export default function CrabTeacher({
  className,
  style,
  scale = 1,
  animate = true,
}: CrabTeacherProps) {
  const [blinking, setBlinking] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const counted = useCountUp(total);

  /* ── Fetch visitor count ── */
  useEffect(() => {
    getVisitorCount()
      .then((n) => setTotal(n))
      .catch(() => setTotal(0));
  }, []);

  /* ── Blink timer ── */
  useEffect(() => {
    if (!animate) return;
    let blinkEnd: ReturnType<typeof setTimeout>;
    const blink = () => {
      setBlinking(true);
      blinkEnd = setTimeout(() => setBlinking(false), 130);
    };
    const first = setTimeout(blink, 2500);
    const loop = setInterval(blink, 5500);
    return () => {
      clearTimeout(first);
      clearTimeout(blinkEnd);
      clearInterval(loop);
    };
  }, [animate]);

  useEffect(() => {
    if (!tutorOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTutorOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tutorOpen]);

  const num = counted !== null ? counted.toLocaleString() : "";
  const vpScale = useViewportScale();
  const s = scale * vpScale; // user scale × responsive viewport scale

  /* Scaled dimensions */
  const SW = Math.round(LAYOUT.sceneW * s);
  const SH = Math.round(LAYOUT.sceneH * s);
  const bb = LAYOUT.blackboard;
  const tx = LAYOUT.text;
  const cr = LAYOUT.crab;
  const excited = hovered || tutorOpen || speaking;
  const tutorBottom = Math.max(88, Math.round(150 * s));

  /* Helper: image style for a layer */
  const imgStyle = (x: number, y: number, w: number, h: number): React.CSSProperties => ({
    position: "absolute",
    left: Math.round(x * s),
    top: Math.round(y * s),
    width: Math.round(w * s),
    height: Math.round(h * s),
    imageRendering: "pixelated",
    userSelect: "none",
    pointerEvents: "none",
  });

  return (
    <div
      className={className}
      data-crab-tutor-root
      data-html2canvas-ignore="true"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        width: SW,
        height: SH,
        flexShrink: 0,
        overflow: "visible",
        ...style,
        ...({ "--crab-tutor-bottom": `${tutorBottom}px` } as React.CSSProperties),
      }}
    >
      <CrabTutorPanel
        open={tutorOpen}
        onClose={() => setTutorOpen(false)}
        onSpeakingChange={setSpeaking}
      />

      {!tutorOpen && (
        <div
          className={`crab-teacher-wake-hint${hovered ? " is-visible" : ""}`}
          aria-hidden="true"
          style={{
            position: "absolute",
            left: Math.round((cr.x + cr.w / 2) * s),
            top: Math.round((cr.y - 42) * s),
            zIndex: 25,
          }}
        >
          点击唤醒助教
        </div>
      )}

      {/* ═══ 黑板 (static) ═══ */}
      <img
        src="/crab-teacher/crab-teacher-blackboard.png"
        alt=""
        draggable={false}
        style={imgStyle(bb.x, bb.y, bb.w, bb.h)}
      />

      {/* ═══ 访问次数文字 — 粉笔风格 ═══ */}
      <div
        className="vt-chalk-text"
        style={{
          position: "absolute",
          left: Math.round(tx.x * s),
          top: Math.round(tx.y * s),
          transform: "translateX(-50%)",
          zIndex: 5,
          pointerEvents: "none",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: Math.round(2 * s),
        }}
      >
        {/* 数字 — 粉笔白，带粉笔灰效果 */}
        <span
          style={{
            fontFamily: "Georgia, 'Times New Roman', 'Noto Serif SC', serif",
            fontSize: Math.round(tx.fontSize * s),
            fontWeight: 700,
            color: "rgba(255, 255, 245, 0.92)",
            textShadow:
              "0 0 8px rgba(255,255,245,0.10), 1px 1px 0 rgba(0,0,0,0.15)",
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.01em",
            lineHeight: 1.1,
          }}
        >
          {num}
        </span>

        {/* 装饰线 — 粉笔划线 */}
        <div
          style={{
            width: Math.round((tx.fontSize * 2.5) * s),
            height: Math.round(1 * s),
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,245,0.25), rgba(255,255,245,0.35), rgba(255,255,245,0.25), transparent)",
            borderRadius: 1,
          }}
        />

        {/* 中文标签 */}
        <span
          style={{
            fontFamily:
              "'Noto Serif SC', Georgia, 'Times New Roman', serif",
            fontSize: Math.round(tx.labelFontSize * s),
            color: "rgba(255, 255, 245, 0.55)",
            letterSpacing: "0.12em",
            lineHeight: 1,
          }}
        >
          次访问
        </span>
      </div>

      {/* ═══ 螃蟹容器 (呼吸动画) ═══ */}
      <div
        style={{
          position: "absolute",
          left: Math.round(cr.x * s),
          top: Math.round(cr.y * s),
          width: Math.round(cr.w * s),
          height: Math.round(cr.h * s),
          zIndex: 10,
          animation: animate
            ? speaking
              ? "crab_talk 0.44s ease-in-out infinite"
              : `crab_breathe ${excited ? "1.6s" : "3s"} ease-in-out infinite`
            : "none",
          filter: excited
            ? "brightness(1.2) drop-shadow(0 0 14px rgba(212,165,116,0.18))"
            : "none",
          transition: "filter 0.35s ease",
        }}
      >
        {/* Right arm + pointer (swing) */}
        <img
          src="/crab-teacher/crab-teacher-right-arm-pointer.png"
          alt=""
          draggable={false}
          style={{
            ...imgStyle(cr.rightArm.dx, cr.rightArm.dy, cr.rightArm.w ?? cr.w, cr.rightArm.h ?? cr.h),
            transformOrigin: `${cr.pivotX} ${cr.pivotY}`,
            animation: animate
              ? `crab_swing${excited ? "_excited" : ""} ${excited ? "1.2s" : "2.1s"} ease-in-out infinite`
              : "none",
          }}
        />
        {/* Left arm + book */}
        <img
          src="/crab-teacher/crab-teacher-left-arm-book.png"
          alt=""
          draggable={false}
          style={imgStyle(cr.leftArm.dx, cr.leftArm.dy, cr.leftArm.w ?? cr.w, cr.leftArm.h ?? cr.h)}
        />
        
        {/* Body */}
        <img
          src="/crab-teacher/crab-teacher-body.png"
          alt=""
          draggable={false}
          style={{
            ...imgStyle(cr.body.dx, cr.body.dy, cr.body.w ?? cr.w, cr.body.h ?? cr.h),
            transformOrigin: "50% 72%",
            animation: speaking && animate
              ? "crab_talk_body 240ms steps(2, end) infinite"
              : "none",
          }}
        />

        

        {/* Eyes open */}
        <img
          src="/crab-teacher/crab-teacher-eyes-open.png"
          alt=""
          draggable={false}
          style={{
            ...imgStyle(cr.eyesOpen.dx, cr.eyesOpen.dy, cr.eyesOpen.w ?? cr.w, cr.eyesOpen.h ?? cr.h),
            opacity: blinking ? 0 : 1,
            transition: "opacity 80ms",
          }}
        />

        {/* Eyes closed (blink) */}
        <img
          src="/crab-teacher/crab-teacher-eyes-closed.png"
          alt=""
          draggable={false}
          style={{
            ...imgStyle(cr.eyesClosed.dx, cr.eyesClosed.dy, cr.eyesClosed.w ?? cr.w, cr.eyesClosed.h ?? cr.h),
            opacity: blinking ? 1 : 0,
            transition: "opacity 80ms",
          }}
        />

        
      </div>

      <button
        type="button"
        aria-label={tutorOpen ? "收起蟹老师全模态助教" : "唤醒蟹老师全模态助教"}
        aria-expanded={tutorOpen}
        onClick={() => setTutorOpen((current) => !current)}
        style={{
          position: "absolute",
          left: Math.round((cr.x - 35) * s),
          top: Math.round((cr.y - 22) * s),
          width: Math.round((cr.w + 105) * s),
          height: Math.round((cr.h + 25) * s),
          zIndex: 22,
          padding: 0,
          border: 0,
          background: "transparent",
          cursor: "pointer",
        }}
      />

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes crab_breathe {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-4px); }
        }

        @keyframes crab_swing {
          0%, 100% { transform: rotate(0deg); }
          30%      { transform: rotate(-1.5deg); }
          70%      { transform: rotate(1.5deg); }
        }

        @keyframes crab_swing_excited {
          0%, 100% { transform: rotate(0deg); }
          25%      { transform: rotate(-3.5deg); }
          75%      { transform: rotate(3.5deg); }
        }

        @keyframes crab_talk {
          0%, 100% { transform: translateY(0) rotate(-0.4deg); }
          50% { transform: translateY(-3px) rotate(0.6deg); }
        }

        @keyframes crab_talk_body {
          0%, 100% { transform: scaleY(1) translateY(0); }
          50% { transform: scaleY(0.965) translateY(2px); }
        }

        .crab-teacher-wake-hint {
          padding: 7px 11px;
          border: 1px solid var(--accent-border);
          border-radius: 3px 6px 4px 5px;
          background: color-mix(in srgb, var(--bg-panel) 94%, transparent);
          color: var(--text-primary);
          font-family: Georgia, 'Noto Serif SC', serif;
          font-size: 11px;
          letter-spacing: 0.06em;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transform: translate(-50%, 7px) rotate(-1deg);
          transition: opacity 180ms ease, transform 260ms cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 8px 24px color-mix(in srgb, var(--bg-page) 68%, transparent);
        }

        .crab-teacher-wake-hint::after {
          content: '';
          position: absolute;
          left: 50%;
          bottom: -5px;
          width: 8px;
          height: 8px;
          border-right: 1px solid var(--accent-border);
          border-bottom: 1px solid var(--accent-border);
          background: var(--bg-panel);
          transform: translateX(-50%) rotate(45deg);
        }

        .crab-teacher-wake-hint.is-visible {
          opacity: 1;
          transform: translate(-50%, 0) rotate(-1deg);
        }

        @media (prefers-reduced-motion: reduce) {
          .crab-teacher-wake-hint {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
