import { visit } from "unist-util-visit";
import type { Root } from "mdast";

const QUIZ_TYPES = new Set(["quiz-single", "quiz-code"]);
const FEEDBACK_DIRECTIVE = "quiz-feedback";

type DirectiveChild = {
  type: string;
  value?: string;
  lang?: string | null;
  meta?: string | null;
  children?: DirectiveChild[];
  data?: {
    directiveLabel?: boolean;
  };
};

type QuizDirective = {
  type: "containerDirective";
  name: string;
  attributes?: Record<string, unknown>;
  children: DirectiveChild[];
  data?: {
    hName?: string;
    hProperties?: Record<string, unknown>;
  };
};

type FeedbackDirective = {
  type: "containerDirective";
  name: "quiz-feedback";
  children: DirectiveChild[];
};

function isQuizDirective(node: unknown): node is QuizDirective {
  if (!node || typeof node !== "object") return false;
  const maybeDirective = node as Partial<QuizDirective>;
  return (
    maybeDirective.type === "containerDirective" &&
    typeof maybeDirective.name === "string" &&
    QUIZ_TYPES.has(maybeDirective.name) &&
    Array.isArray(maybeDirective.children)
  );
}

function attrToString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

/** Extract text content from an mdast node tree */
function toString(node: DirectiveChild): string {
  if (node.type === "text" || node.type === "inlineCode" || node.type === "code") {
    return node.value || "";
  }
  if (node.children) return node.children.map(toString).join("");
  return "";
}

function isFeedbackDirective(node: DirectiveChild): node is DirectiveChild & FeedbackDirective {
  return node.type === "containerDirective" && "name" in node && node.name === FEEDBACK_DIRECTIVE;
}

/**
 * remark plugin: transform containerDirective nodes (from remark-directive)
 * that match known quiz types into `<quiz-block>` elements.
 *
 * Syntax:
 *   :::quiz-single[Question text?]{answer="B" explanation="Because..."}
 *   - A) Option A
 *   - B) Option B
 *   - C) Option C
 *   :::
 */
export function remarkQuiz() {
  return (tree: Root) => {
    let directiveIndex = 0;

    visit(tree, (node: unknown) => {
      if (!isQuizDirective(node)) return;
      directiveIndex += 1;

      /* Extract question text from directive label [...] */
      let question = "";
      const labelIndex = node.children.findIndex(
        (child) => child.data?.directiveLabel,
      );
      if (labelIndex !== -1) {
        question = toString(node.children[labelIndex]);
        node.children.splice(labelIndex, 1);
      }

      /* Extract answer and explanation from attributes {...} */
      const attrs = node.attributes || {};
      const quizId = attrToString(attrs.id) || `${node.name}-${directiveIndex}`;
      const answer = attrToString(attrs.answer);
      const explanation = attrToString(attrs.explanation);
      const applyFile = attrToString(attrs.applyFile);
      const applyMarker = attrToString(attrs.applyMarker);
      const applyLabel = attrToString(attrs.applyLabel);
      const feedback: Record<string, string> = {};
      let code = "";
      let language = "";
      let applyCode = "";
      let applyLanguage = "";

      const feedbackIndexes: number[] = [];
      node.children.forEach((child, index) => {
        if (!isFeedbackDirective(child)) return;
        const feedbackKey = attrToString(node.children[index].children?.[0]?.value)
          || toString(child.children.find((item) => item.data?.directiveLabel) ?? child).trim();
        const normalizedKey = feedbackKey.trim().toUpperCase();
        const body = child.children
          .filter((item) => !item.data?.directiveLabel)
          .map(toString)
          .join("\n")
          .trim();
        if (normalizedKey && body) {
          feedback[normalizedKey] = body;
        }
        feedbackIndexes.push(index);
      });

      feedbackIndexes
        .sort((a, b) => b - a)
        .forEach((index) => node.children.splice(index, 1));

      if (node.name === "quiz-code") {
        const codeChildren = node.children
          .map((child, index) => ({ child, index }))
          .filter(({ child }) => child.type === "code");
        const applyEntry = codeChildren.find(({ child }) =>
          (child.meta || "").split(/\s+/).includes("apply"),
        );
        const displayEntry = codeChildren.find(({ index }) => index !== applyEntry?.index);
        const removeIndexes = new Set<number>();

        if (displayEntry) {
          const codeNode = displayEntry.child;
          code = codeNode.value || "";
          language = codeNode.lang || "";
          removeIndexes.add(displayEntry.index);
        }

        if (applyEntry) {
          const codeNode = applyEntry.child;
          applyCode = codeNode.value || "";
          applyLanguage = codeNode.lang || "";
          removeIndexes.add(applyEntry.index);
        }

        [...removeIndexes]
          .sort((a, b) => b - a)
          .forEach((index) => node.children.splice(index, 1));
      }

      /* Tell remark-rehype to render as <quiz-block> with props */
      node.data = node.data || {};
      node.data.hName = "quiz-block";
      node.data.hProperties = {
        quizType: node.name,
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
        feedback: JSON.stringify(feedback),
      };
    });
  };
}
