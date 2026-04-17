# BYOCC 首页滚动动效增强 — 提示词

> 给正在开发首页的 Claude Code 会话使用。
> **前提**：粒子效果和内容布局已完成且满意，本次只添加滚动交互动效。
> **不要修改**：HeroParticles.tsx 的粒子逻辑、所有文案内容、页面结构。

---

## 一、现状诊断

当前页面的动效问题：

1. **4 个渐变光晕是 `position: fixed` 的死物** — 完全不响应滚动，从上滑到下它们一动不动
2. **Section 动画是二值开关** — `useInView` 触发一次 fadeInUp 就结束，没有持续的滚动关联运动
3. **卡片没有鼠标互动** — hover 只变色，没有空间感
4. **架构图的 connector 小圆点只有 CSS 动画** — 不和滚动关联

**参考 benchmark**：
- Linear.app 的渐变 mesh 随滚动缓慢流动
- Stripe 的标题文字有 scroll-linked 颜色填充
- Apple 产品页的 sticky section 逐帧揭示
- 这些都不花哨，但每个都让页面"活"起来

---

## 二、要添加的 5 个动效（按优先级）

### 动效 1：渐变光晕视差滚动（MUST HAVE）

**改哪里**：`platform/src/app/page.tsx` 的 4 个光晕 div

**当前代码**：
```tsx
<div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
  {/* 4 个 static gradient blobs */}
</div>
```

**目标效果**：
- 4 个光晕随滚动以不同速度移动（视差效果）
- 每个光晕有自己的视差速率和方向
- 滚动时光晕之间的相对位置变化，产生"大气层在流动"的感觉
- 光晕的 opacity 随滚动微妙变化（页首饱满 → 中间淡化 → 页尾再次浓郁）

**实现方案**：

创建一个新的 Client Component `ScrollReactiveOrbs.tsx`：

```tsx
// 核心思路：用 useScrollPosition hook 获取 scrollY，
// 给每个 orb 应用不同的 parallax transform

const orbs = [
  { id: 'amber',   rate: 0.15,  direction: 'down',   opacity: [0.20, 0.12, 0.18] },
  { id: 'purple',  rate: -0.08, direction: 'up',     opacity: [0.25, 0.15, 0.10] },
  { id: 'teal',    rate: 0.12,  direction: 'down',   opacity: [0.08, 0.20, 0.15] },
  { id: 'rose',    rate: -0.10, direction: 'up',     opacity: [0.35, 0.18, 0.25] },
];
// rate: 视差速率（正=跟随滚动方向，负=反向）
// opacity: [页面顶部, 页面中间, 页面底部] — 三点插值
```

关键细节：
- 用 `requestAnimationFrame` 节流 scroll 事件（不要直接在 onscroll 里 setState）
- 用 `transform: translateY(${offset}px)` 移动，不要改 top（GPU 加速）
- opacity 用三点线性插值：根据 scrollY / documentHeight 计算 0-1 进度
- 亮色模式下光晕颜色跟着主题变（amber → #C17F4E 色系）
- `will-change: transform` 提示浏览器优化

**验收标准**：从页首慢速滑到页尾，能明显看到光晕在缓慢流动、明暗交替。不是突然跳变，是丝滑的。

---

### 动效 2：卖点卡片的 3D 鼠标倾斜（HIGH VALUE）

**改哪里**：`LandingSections.tsx` 的 `SellingPointsSection` 卡片

**目标效果**：
- 鼠标在卡片上移动时，卡片跟随鼠标位置做微小的 3D 倾斜
- 鼠标在左上 → 卡片向左上倾斜，鼠标在右下 → 向右下倾斜
- 倾斜角度很小（最大 ±3°），不会让人觉得晕
- 鼠标离开时卡片平滑回正
- 卡片表面有微妙的光泽跟随鼠标（像 Apple TV 的卡片效果）

**实现方案**：

新建 `useTilt` hook：

```tsx
function useTilt(intensity = 3) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;   // -0.5 to 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.transform = `perspective(800px) rotateY(${x * intensity}deg) rotateX(${-y * intensity}deg)`;
      // 可选：加光泽层
      el.style.setProperty('--tilt-x', `${x * 100}%`);
      el.style.setProperty('--tilt-y', `${y * 100}%`);
    };

    const onLeave = () => {
      el.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg)';
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [intensity]);

  return ref;
}
```

光泽效果（可选，用 CSS 伪元素实现）：
```css
/* 卡片上的光泽 follow 鼠标 */
.tilt-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(
    circle at var(--tilt-x, 50%) var(--tilt-y, 50%),
    rgba(212, 165, 116, 0.06) 0%,
    transparent 60%
  );
  pointer-events: none;
}
```

**验收标准**：鼠标在卡片上缓慢移动，卡片微微倾斜 + 有光泽跟随。鼠标离开后 0.3s 平滑回正。不晕、不夸张。

---

### 动效 3：Section 标题视差偏移（HIGH VALUE，简单）

**改哪里**：`LandingSections.tsx` 的每个 section 的 `<h2>`

**目标效果**：
- 每个 section 的标题文字比内容区以更慢的速度移动
- 产生"标题浮在内容上方"的轻微深度感
- 效果微妙（每 1000px 滚动偏移 30-50px），不是明显的视差

**实现方案**：

扩展现有 `useInView` 为 `useScrollParallax`：

```tsx
function useScrollParallax(rate = 0.03) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const viewH = window.innerHeight;
        // 只在元素可见时计算
        if (rect.bottom > 0 && rect.top < viewH) {
          const center = rect.top + rect.height / 2;
          const fromCenter = (center - viewH / 2) / viewH;
          setOffset(fromCenter * rate * viewH);
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [rate]);

  return { ref, offset };
}

// 使用：
const { ref: titleRef, offset } = useScrollParallax(0.04);
<h2 ref={titleRef} style={{ transform: `translateY(${offset}px)` }}>...</h2>
```

注意：和现有的 `useInView` 合并使用，不要冲突。标题同时有 fadeInUp 入场 + 视差偏移。

**验收标准**：慢慢滚动页面，section 标题比卡片内容稍微"飘"一些。不要很明显，是潜意识能感知到的深度。

---

### 动效 4：架构图节点逐个点亮（MEDIUM VALUE）

**改哪里**：`LandingSections.tsx` 的 `ArchitectureSection`

**目标效果**：
- 当前：所有节点一次性 fadeInUp 出现
- 改为：节点根据滚动位置逐个"激活"
- 每个节点有一个 scroll threshold（比如进入视口 60% 时激活第一个，继续滚 80px 激活第二个）
- 未激活的节点是暗淡的（opacity 0.3，边框暗色）
- 激活时：opacity 1，边框变为 accent 色，有一个微弱的 glow flash
- 节点之间的 connector 小圆点在前后两个节点都激活后开始流动

**实现方案**：

不用 sticky（太复杂，容易出 bug），用 Intersection Observer + threshold 梯度：

```tsx
function useSequentialReveal(count: number, gap = 0.15) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(-1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = container.querySelectorAll('[data-reveal-item]');
    const observers: IntersectionObserver[] = [];

    items.forEach((item, i) => {
      // 每个元素需要更大的 threshold 才激活
      const threshold = 0.3 + i * gap;
      const obs = new IntersectionObserver(
        ([e]) => {
          if (e.isIntersecting && activeIdx < i) {
            setActiveIdx(i);
          }
        },
        { threshold: Math.min(threshold, 0.9) }
      );
      obs.observe(item);
      observers.push(obs);
    });

    return () => observers.forEach(o => o.disconnect());
  }, [count, gap]);

  return { containerRef, activeIdx };
}
```

每个节点的样式根据 `activeIdx` 决定：
```tsx
const isActive = i <= activeIdx;
style={{
  opacity: isActive ? 1 : 0.3,
  borderColor: isActive ? 'var(--accent)' : 'var(--border)',
  boxShadow: isActive ? '0 0 12px rgba(212,165,116,0.1)' : 'none',
  transition: `all 0.5s ease ${i * 0.1}s`,
}}
```

**验收标准**：从架构区域上方开始滚动，节点从左到右逐个亮起，connector 圆点在前一个节点亮起后开始流动。激活过程约 1-2 秒完成。

---

### 动效 5：顶部滚动进度条（EASY，锦上添花）

**改哪里**：`page.tsx` 或 `Navbar.tsx`

**目标效果**：
- 页面最顶部有一条极细的线（2px），颜色是 accent 色
- 宽度从 0% 到 100%，跟随滚动进度
- 用 CSS + 一个 scroll listener 实现
- 不是粗重的进度条，是极细的一条线，像读文章的进度指示

**实现方案**：

在 `page.tsx` 的最外层 div 内加：

```tsx
function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      className="fixed top-0 left-0 z-50 h-[2px]"
      style={{
        width: `${progress}%`,
        background: 'var(--accent)',
        transition: 'width 0.1s linear',
      }}
    />
  );
}
```

**验收标准**：从页首滚到页尾，顶部有一条琥珀金的细线匀速延伸到右边。

---

## 三、实施顺序

```
Step 1: 动效 5（进度条）— 最简单，5 分钟，先热手
Step 2: 动效 1（光晕视差）— 用户最想要的，也是效果最明显的
Step 3: 动效 2（卡片 3D 倾斜）— 交互感提升大
Step 4: 动效 3（标题视差）— 简单，加深空间感
Step 5: 动效 4（架构逐个点亮）— 最复杂，放最后
```

每完成一个动效就 `npm run dev` 确认效果，不要攒到最后一起看。

---

## 四、技术约束

### 性能要求
- 所有 scroll 监听必须 `{ passive: true }`
- 所有 state 更新必须通过 `requestAnimationFrame` 节流
- transform 动画只改 `transform` 和 `opacity`（GPU 合成层，不触发 layout）
- 不要用 `top`/`left`/`width`/`height` 做动画（触发 reflow）
- 加 `will-change: transform` 在需要频繁 transform 的元素上

### 不要碰的东西
- `HeroParticles.tsx` — 粒子效果不动
- 所有文案内容 — 一个字都不改
- 页面 section 顺序和结构 — 不动
- `ThemeProvider.tsx` — 主题切换不动
- `globals.css` 的 CSS 变量 — 不动（可以新增 keyframes）
- `/platform` 和 `/lab/:id` 路由 — 确保不受影响

### 响应式
- 移动端（<768px）：关闭 3D 卡片倾斜（触摸设备不需要）
- 移动端：视差速率减半（手机 scroll 体验更敏感）
- 移动端：进度条保留（用户习惯）
- 移动端：架构逐个点亮改为一次性全部出现（触摸滚动不够精确）

---

## 五、完成标准

```bash
cd platform && npm run dev

# 验证：
# 1. 慢速从页首滚到页尾 — 光晕在流动（动效 1）
# 2. 鼠标在卖点卡片上移动 — 卡片微微倾斜 + 光泽（动效 2）
# 3. 滚动时 section 标题比内容稍慢移动（动效 3）
# 4. 架构区域节点逐个亮起（动效 4）
# 5. 顶部有琥珀金进度条（动效 5）
# 6. 粒子动画不受影响
# 7. 明暗模式切换后所有动效正常
# 8. 移动端（DevTools 模拟）无明显卡顿
# 9. /platform 和 /lab/3 页面不受影响
# 10. npm run build 无报错

# 性能验证：
# Chrome DevTools → Performance → 录制一次完整滚动
# 确认没有 Long Tasks > 50ms
# 确认 FPS 保持在 55+ 
```
