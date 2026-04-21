'use client';

import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import Link from 'next/link';

/* ─── Syntax Highlighter ─── */

const KEYWORDS = new Set([
  'async', 'await', 'function', 'const', 'let', 'var', 'if', 'else',
  'while', 'for', 'return', 'true', 'false', 'null', 'undefined', 'new',
  'this', 'class', 'extends', 'import', 'export', 'from', 'default',
  'switch', 'case', 'break', 'throw', 'try', 'catch', 'typeof', 'of', 'in',
]);

function hl(line: string): ReactNode {
  if (!line.trim()) return null;

  const nodes: ReactNode[] = [];
  let rem = line;
  let k = 0;

  const push = (text: string, cls?: string) => {
    nodes.push(cls ? <span key={k++} className={cls}>{text}</span> : text);
  };

  while (rem.length > 0) {
    // Whitespace
    const ws = rem.match(/^\s+/);
    if (ws) { push(ws[0]); rem = rem.slice(ws[0].length); continue; }

    // Comment
    if (rem.startsWith('//')) { push(rem, 'syn-comment'); break; }

    // String
    const strSingle = rem.match(/^(['"])(?:\\.|[^\\])*?\1/);
    const strTpl = rem.match(/^`(?:\\.|[^\\`])*?`/);
    const strMatch = strTpl?.[0] || strSingle?.[0];
    if (strMatch) { push(strMatch, 'syn-string'); rem = rem.slice(strMatch.length); continue; }

    // Number
    const num = rem.match(/^\d+\.?\d*/);
    if (num && !rem.match(/^[a-zA-Z_$]/)) { push(num[0], 'syn-number'); rem = rem.slice(num[0].length); continue; }

    // Keyword or identifier
    const ident = rem.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/);
    if (ident) {
      const word = ident[0];
      const rest = rem.slice(word.length);
      if (rest.match(/^\s*\(/)) {
        push(word, KEYWORDS.has(word) ? 'syn-keyword' : 'syn-function');
      } else if (KEYWORDS.has(word)) {
        push(word, 'syn-keyword');
      } else {
        push(word, 'syn-variable');
      }
      rem = rest;
      continue;
    }

    // Operators
    const op = rem.match(/^(=>|===|!==|\.\.\.|\+\+|--|[+\-*/%=<>!&|^~?:]+)/);
    if (op) { push(op[0], 'syn-operator'); rem = rem.slice(op[0].length); continue; }

    // Dot
    if (rem[0] === '.') { push('.', 'syn-operator'); rem = rem.slice(1); continue; }

    // Fallback
    push(rem[0]);
    rem = rem.slice(1);
  }

  return <>{nodes}</>;
}

/* ─── Data ─── */

const STEPS = [
  { id: 0, label: 'Step 1: 理解用户意图', code: ['  const goal = await analyze(task);'] },
  { id: 1, label: 'Step 2: 思考下一步', code: ['  const plan = await model.think(context);'] },
  { id: 2, label: 'Step 3: 执行动作', code: ['  const result = await execute(plan);', '  context = update(context, result);'] },
];

const TERMINAL = [
  { text: 'Agent initialized', ok: true },
  { text: 'Analyzing task: "Fix the bug in main.ts"', ok: false },
  { text: 'Reading source files...', ok: false },
  { text: 'Tool call: read_file("src/main.ts")', ok: false, tool: true },
  { text: 'Bug identified at line 42', ok: false },
  { text: 'Fixing...', ok: false },
  { text: 'Tool call: write_file("src/main.ts", ...)', ok: false, tool: true },
  { text: 'Task completed', ok: true },
];

// Lines that cycle after initial output to keep the terminal alive
const IDLE_LINES = [
  '> Listening for changes...',
  '> File watcher active',
  '> System idle',
  '> Monitoring src/...',
  '> Ready for next task',
];

/* ─── Component ─── */

export default function CodePreview() {
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [animatingId, setAnimatingId] = useState<number | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [termLines, setTermLines] = useState(0);
  const [showCTA, setShowCTA] = useState(false);
  const [idleLine, setIdleLine] = useState<string | null>(null);

  const allRevealed = revealed.size === STEPS.length;

  const reveal = useCallback((id: number) => {
    if (animatingId !== null || revealed.has(id)) return;
    setAnimatingId(id);
    setTimeout(() => {
      setRevealed(prev => new Set([...prev, id]));
      setAnimatingId(null);
    }, 180);
  }, [animatingId, revealed]);

  // Show terminal after all steps
  useEffect(() => {
    if (!allRevealed) return;
    const t1 = setTimeout(() => setShowTerminal(true), 500);
    return () => clearTimeout(t1);
  }, [allRevealed]);

  // Animate terminal lines
  useEffect(() => {
    if (!showTerminal) return;
    setTermLines(0);
    const timers = TERMINAL.map((_, i) =>
      setTimeout(() => setTermLines(i + 1), 200 + i * 220),
    );
    const tCta = setTimeout(() => setShowCTA(true), 200 + TERMINAL.length * 220 + 300);
    return () => { timers.forEach(clearTimeout); clearTimeout(tCta); };
  }, [showTerminal]);

  // Idle activity loop — keeps terminal feeling alive
  useEffect(() => {
    if (!showCTA) return;
    let idx = 0;
    const cycle = () => {
      setIdleLine(IDLE_LINES[idx % IDLE_LINES.length]);
      idx++;
    };
    // First idle line after 3s, then every 4s
    const t1 = setTimeout(cycle, 3000);
    const iv = setInterval(cycle, 4000);
    return () => { clearTimeout(t1); clearInterval(iv); };
  }, [showCTA]);

  // Build code lines with interleaved steps
  let lineNum = 1;
  const codeLines: ReactNode[] = [];

  const pushLine = (text: string) => {
    const n = lineNum++;
    codeLines.push(
      <div key={`l${n}`} className="flex gap-4 leading-[1.7]">
        <span className="w-7 shrink-0 text-right text-[var(--editor-gutter)] select-none tabular-nums">{n}</span>
        <code className="text-[0.82rem]">{hl(text)}</code>
      </div>,
    );
  };

  const pushBlank = () => {
    const n = lineNum++;
    codeLines.push(
      <div key={`b${n}`} className="flex gap-4 leading-[1.7]">
        <span className="w-7 shrink-0 text-right text-[var(--editor-gutter)] select-none tabular-nums">{n}</span>
        <span>&nbsp;</span>
      </div>,
    );
  };

  pushLine('async function runAgent(task) {');
  pushBlank();

  // Step 0
  if (revealed.has(0)) {
    STEPS[0].code.forEach((line, i) => {
      const n = lineNum++;
      codeLines.push(
        <div
          key={`s0-${i}`}
          className="flex gap-4 leading-[1.7]"
          style={{ animation: `code-reveal 0.3s ease-out ${i * 0.08}s both` }}
        >
          <span className="w-7 shrink-0 text-right text-[var(--editor-gutter)] select-none tabular-nums">{n}</span>
          <span className="w-3.5 shrink-0 text-[var(--status-success)]" style={{ animation: i === 0 ? 'checkmark-pop 0.3s ease-out 0.1s both' : undefined }}>
            {i === 0 ? '✓' : ''}
          </span>
          <code className="text-[0.82rem] border-l-2 border-[var(--status-success)] pl-3">{hl(line)}</code>
        </div>,
      );
    });
  } else {
    const startLine = lineNum;
    lineNum++;
    codeLines.push(
      <div
        key="step0"
        role="button"
        tabIndex={0}
        aria-label={`${STEPS[0].label}，点击查看`}
        onClick={() => reveal(0)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); reveal(0); } }}
        className="group relative my-0.5 cursor-pointer rounded-md border border-[var(--todo-border)] px-3 py-1 transition-all duration-200 hover:border-[var(--todo-border-hover)] hover:shadow-md active:scale-[0.98]"
        style={{
          background: 'var(--todo-bg)',
          opacity: animatingId === 0 ? 0.4 : 1,
          transform: animatingId === 0 ? 'scale(0.98)' : undefined,
        }}
      >
        <div className="flex gap-4 leading-[1.7]">
          <span className="w-7 shrink-0 text-right text-[var(--editor-gutter)] select-none tabular-nums">{startLine}</span>
          <code className="text-[0.82rem]">
            <span className="syn-comment">// ▸ </span>
            <span className="text-[var(--accent)] font-medium">{STEPS[0].label}</span>
          </code>
        </div>
        <div className="pointer-events-none absolute inset-0 rounded-md opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(212,165,116,0.04), transparent)', backgroundSize: '200% 100%', animation: 'todo-shimmer 3s linear infinite' }}
        />
      </div>,
    );
  }

  pushBlank();
  pushLine('  while (running) {');

  // Steps 1 and 2
  [1, 2].forEach(stepIdx => {
    const step = STEPS[stepIdx];
    if (revealed.has(step.id)) {
      step.code.forEach((line, i) => {
        const n = lineNum++;
        codeLines.push(
          <div
            key={`s${step.id}-${i}`}
            className="flex gap-4 leading-[1.7]"
            style={{ animation: `code-reveal 0.3s ease-out ${i * 0.08}s both` }}
          >
            <span className="w-7 shrink-0 text-right text-[var(--editor-gutter)] select-none tabular-nums">{n}</span>
            <span className="w-3.5 shrink-0 text-[var(--status-success)]" style={{ animation: i === 0 ? 'checkmark-pop 0.3s ease-out 0.1s both' : undefined }}>
              {i === 0 ? '✓' : ''}
            </span>
            <code className="text-[0.82rem] border-l-2 border-[var(--status-success)] pl-3">{hl(line)}</code>
          </div>,
        );
      });
    } else {
      const startLine = lineNum;
      lineNum += 1;
      codeLines.push(
        <div
          key={`step${step.id}`}
          role="button"
          tabIndex={0}
          aria-label={`${step.label}，点击查看`}
          onClick={() => reveal(step.id)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); reveal(step.id); } }}
          className="group relative my-0.5 cursor-pointer rounded-md border border-[var(--todo-border)] px-3 py-1 transition-all duration-200 hover:border-[var(--todo-border-hover)] hover:shadow-md active:scale-[0.98]"
          style={{
            background: 'var(--todo-bg)',
            opacity: animatingId === step.id ? 0.4 : 1,
            transform: animatingId === step.id ? 'scale(0.98)' : undefined,
          }}
        >
          <div className="flex gap-4 leading-[1.7]">
            <span className="w-7 shrink-0 text-right text-[var(--editor-gutter)] select-none tabular-nums">{startLine}</span>
            <code className="text-[0.82rem]">
              <span className="syn-comment">// ▸ </span>
              <span className="text-[var(--accent)] font-medium">{step.label}</span>
            </code>
          </div>
          <div className="pointer-events-none absolute inset-0 rounded-md opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(212,165,116,0.04), transparent)', backgroundSize: '200% 100%', animation: 'todo-shimmer 3s linear infinite' }}
          />
        </div>,
      );
    }
  });

  pushLine('  }');
  pushLine('}');

  return (
    <div
      className="mx-auto w-full max-w-[680px] overflow-hidden rounded-xl border"
      style={{ borderColor: 'var(--editor-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
    >
      {/* File name bar */}
      <div
        className="flex items-center border-b px-4 py-2"
        style={{ borderColor: 'var(--editor-border)', background: 'var(--editor-header)' }}
      >
        <span
          className="text-[0.78rem]"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-jetbrains-mono)' }}
        >
          agent.ts
        </span>
        <span className="ml-auto text-[0.68rem]" style={{ color: 'var(--text-disabled)' }}>
          TypeScript
        </span>
      </div>

      {/* Code area */}
      <div
        className="overflow-x-auto px-4 py-4 hide-scrollbar"
        style={{ background: 'var(--editor-bg)', fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        {codeLines}
      </div>

      {/* Hint or progress */}
      <div
        className="flex items-center gap-3 border-t px-4 py-2.5 transition-all duration-300"
        style={{ borderColor: 'var(--editor-border)', background: 'var(--editor-header)' }}
      >
        <div className="flex gap-1">
          {STEPS.map(s => (
            <div
              key={s.id}
              className="h-1.5 w-1.5 rounded-full transition-all duration-300"
              style={{ background: revealed.has(s.id) ? 'var(--status-success)' : 'var(--border)' }}
            />
        ))}
        </div>
        {!allRevealed && (
          <span className="text-[0.72rem]" style={{ color: 'var(--text-disabled)' }}>
            💡 点击每个步骤，看 Agent 如何思考
          </span>
        )}
        {allRevealed && !showTerminal && (
          <span className="text-[0.72rem]" style={{ color: 'var(--accent)' }}>
            Agent 启动中...
          </span>
        )}
      </div>

      {/* Terminal panel */}
      <div
        className="overflow-hidden transition-all duration-500"
        style={{
          maxHeight: showTerminal ? 420 : 0,
          opacity: showTerminal ? 1 : 0,
        }}
      >
        <div
          className="border-t px-4 pt-3 pb-4"
          style={{ borderColor: 'var(--editor-border)', background: 'var(--editor-bg)', fontFamily: 'var(--font-jetbrains-mono)' }}
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[0.68rem]" style={{ color: 'var(--text-disabled)' }}>terminal</span>
            <div className="h-px flex-1" style={{ background: 'var(--editor-gutter-border)' }} />
          </div>

          {TERMINAL.slice(0, termLines).map((line, i) => (
            <div
              key={i}
              className="py-0.5 text-[0.78rem] leading-6"
              style={{ animation: 'code-reveal 0.2s ease-out both', color: line.ok ? 'var(--status-success)' : line.tool ? 'var(--accent)' : 'var(--text-secondary)' }}
            >
              <span className="mr-2" style={{ color: 'var(--text-disabled)' }}>&gt;</span>
              {line.text}
              {line.ok && <span className="ml-1">✓</span>}
            </div>
          ))}

          {/* Idle cycling line */}
          {idleLine && (
            <div
              key={idleLine}
              className="py-0.5 text-[0.78rem] leading-6 text-[var(--text-disabled)]"
              style={{ animation: 'code-reveal 0.3s ease-out both' }}
            >
              {idleLine}
            </div>
          )}

          {/* Persistent blinking cursor */}
          {showCTA && !idleLine && (
            <div className="py-0.5 text-[0.78rem] leading-6">
              <span style={{ animation: 'cursor-blink 1s step-end infinite', color: 'var(--accent)' }}>▌</span>
            </div>
          )}

          {/* Summary */}
          {showCTA && (
            <div
              className="mt-4 flex items-center justify-between border-t pt-4"
              style={{ borderColor: 'var(--editor-gutter-border)', animation: 'code-reveal 0.4s ease-out both' }}
            >
              <p className="text-[0.82rem] text-[var(--text-secondary)]">
                几行代码，一个能思考、会行动的 Agent。
              </p>
              <Link
                href="/platform"
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-[0.8rem] font-semibold transition-transform duration-200 hover:scale-105 active:scale-95"
                style={{ background: 'var(--accent)', color: 'var(--bg-page)', animation: 'pulse-glow 2s infinite' }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                开始实验
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
