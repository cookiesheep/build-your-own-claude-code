"use client";

import { useEffect, useRef, useState } from "react";
import { getVisitorCount } from "@/lib/api";

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

  const num = counted !== null ? counted.toLocaleString() : "";
  const vpScale = useViewportScale();
  const s = scale * vpScale; // user scale × responsive viewport scale

  /* Scaled dimensions */
  const SW = Math.round(LAYOUT.sceneW * s);
  const SH = Math.round(LAYOUT.sceneH * s);
  const bb = LAYOUT.blackboard;
  const tx = LAYOUT.text;
  const cr = LAYOUT.crab;

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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        width: SW,
        height: SH,
        flexShrink: 0,
        cursor: "pointer",
        ...style,
      }}
    >
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
            ? `crab_breathe ${hovered ? "1.6s" : "3s"} ease-in-out infinite`
            : "none",
          filter: hovered
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
              ? `crab_swing${hovered ? "_excited" : ""} ${hovered ? "1.2s" : "2.1s"} ease-in-out infinite`
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
          style={imgStyle(cr.body.dx, cr.body.dy, cr.body.w ?? cr.w, cr.body.h ?? cr.h)}
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
      `}</style>
    </div>
  );
}
