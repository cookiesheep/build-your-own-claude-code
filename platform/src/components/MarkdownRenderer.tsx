"use client";

import React, { isValidElement } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkDirective from "remark-directive";

import { preprocessAdmonitions } from "@/lib/remark/admonition-preprocessor";
import { remarkAdmonition } from "@/lib/remark/remark-admonition";

import Admonition from "./Admonition";
import CodeBlock from "./CodeBlock";

type MarkdownRendererProps = {
  content: string;
};

// react-markdown Components type doesn't include custom element names,
// so we cast to allow our <admonition> element from remark-admonition plugin
const components = {
  admonition: ({ admonitionType, title, children }: any) => (
    <Admonition admonitionType={admonitionType} title={title}>
      {children}
    </Admonition>
  ),

  pre: ({ children }: any) => {
    const codeElement = extractCodeElement(children);
    if (codeElement) {
      const { language, code } = codeElement;
      return <CodeBlock language={language} code={code} />;
    }
    return <pre>{children}</pre>;
  },

  code: ({ className, children, ...props }: any) => {
    if (!className || !className.includes("language-")) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
} as Record<string, React.ComponentType<any>>;

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const processed = preprocessAdmonitions(content);

  return (
    <Markdown
      remarkPlugins={[remarkGfm, remarkDirective, remarkAdmonition]}
      components={components as any}
    >
      {processed}
    </Markdown>
  );
}

/** Extract language and code text from a react-markdown <pre><code> structure */
function extractCodeElement(children: React.ReactNode): { language: string; code: string } | null {
  const child = React.Children.toArray(children).find((c) =>
    isValidElement(c) && (c.type === "code" || (c.props as any)?.className?.includes?.("language-")),
  );

  if (!isValidElement(child)) return null;

  const props = child.props as any;
  const className: string = props.className || "";
  const match = /language-(\w+)/.exec(className);
  if (!match) return null;

  const code = String(props.children || "").replace(/\n$/, "");
  return { language: match[1], code };
}
