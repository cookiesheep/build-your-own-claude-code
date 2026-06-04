"use client";

import React, { isValidElement } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkDirective from "remark-directive";

import { preprocessAdmonitions } from "@/lib/remark/admonition-preprocessor";
import { remarkAdmonition } from "@/lib/remark/remark-admonition";
import { remarkQuiz } from "@/lib/remark/remark-quiz";

import Admonition from "./Admonition";
import CodeBlock from "./CodeBlock";
import QuizCode from "./QuizCode";
import QuizSingle from "./QuizSingle";

type MarkdownRendererProps = {
  content: string;
};

type CustomElementProps = {
  children?: ReactNode;
  [key: string]: unknown;
};

type CodeElementProps = {
  className?: string;
  children?: ReactNode;
};

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

// react-markdown Components type doesn't include custom element names,
// so we cast to allow our <admonition> element from remark-admonition plugin
const components = {
  admonition: ({ admonitionType, title, children }: CustomElementProps) => (
    <Admonition admonitionType={asString(admonitionType)} title={asString(title)}>
      {children}
    </Admonition>
  ),

  "quiz-block": ({
    quizType,
    quizId,
    question,
    answer,
    explanation,
    code,
    language,
    applyFile,
    applyMarker,
    applyLabel,
    applyCode,
    applyLanguage,
    feedback,
    children,
  }: CustomElementProps) => {
    if (quizType === "quiz-single") {
      return (
        <QuizSingle
          quizId={asString(quizId)}
          question={asString(question)}
          answer={asString(answer)}
          explanation={asString(explanation)}
          feedback={asString(feedback)}
        >
          {children}
        </QuizSingle>
      );
    }
    if (quizType === "quiz-code") {
      return (
        <QuizCode
          quizId={asString(quizId)}
          question={asString(question)}
          answer={asString(answer)}
          explanation={asString(explanation)}
          code={asString(code)}
          language={asString(language)}
          applyFile={asString(applyFile)}
          applyMarker={asString(applyMarker)}
          applyLabel={asString(applyLabel)}
          applyCode={asString(applyCode)}
          applyLanguage={asString(applyLanguage)}
          feedback={asString(feedback)}
        >
          {children}
        </QuizCode>
      );
    }
    return <div>{children}</div>;
  },

  pre: ({ children }: { children?: ReactNode }) => {
    const codeElement = extractCodeElement(children);
    if (codeElement) {
      const { language, code } = codeElement;
      return <CodeBlock language={language} code={code} />;
    }
    return <pre>{children}</pre>;
  },

  code: ({ className, children, ...props }: ComponentPropsWithoutRef<"code">) => {
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
} as Components;

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const processed = preprocessAdmonitions(content);

  return (
    <Markdown
      remarkPlugins={[remarkGfm, remarkDirective, remarkAdmonition, remarkQuiz]}
      components={components}
    >
      {processed}
    </Markdown>
  );
}

/** Extract language and code text from a react-markdown <pre><code> structure */
function extractCodeElement(children: React.ReactNode): { language: string; code: string } | null {
  const child = React.Children.toArray(children).find(
    (item): item is React.ReactElement<CodeElementProps> =>
      isValidElement<CodeElementProps>(item) &&
      (item.type === "code" ||
        (typeof item.props.className === "string" &&
          item.props.className.includes("language-"))),
  );

  if (!child) return null;

  const className = child.props.className || "";
  const match = /language-(\w+)/.exec(className);
  if (!match) return null;

  const code = String(child.props.children || "").replace(/\n$/, "");
  return { language: match[1], code };
}
