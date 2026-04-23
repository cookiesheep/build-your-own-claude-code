"use client";

import { useState, useCallback, type ReactNode } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

import { useTheme } from "./ThemeProvider";

type CodeBlockProps = {
  language?: string;
  code: string;
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="code-block-copy"
      aria-label={copied ? "已复制" : "复制代码"}
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

export default function CodeBlock({ language, code }: CodeBlockProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        {language ? (
          <span className="code-block-lang">{language}</span>
        ) : (
          <span />
        )}
        <CopyButton text={code} />
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        style={isDark ? oneDark : oneLight}
        showLineNumbers={!!language}
        customStyle={{
          margin: 0,
          borderRadius: "0 0 8px 8px",
          background: "var(--editor-bg)",
          border: `1px solid var(--border)`,
          borderTop: "none",
          fontSize: "0.82rem",
          padding: "1rem",
        }}
        lineNumberStyle={{
          color: "var(--editor-gutter)",
          minWidth: "2.5em",
          paddingRight: "1em",
        }}
        codeTagProps={{
          style: {
            fontFamily: "var(--font-jetbrains-mono), 'Fira Code', monospace",
          },
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

/** Fallback pre renderer for code blocks without a language */
export function PreFallback({ children }: { children: ReactNode }) {
  return (
    <pre className="markdown-body-pre">
      <code>{children}</code>
    </pre>
  );
}
