import { visit } from "unist-util-visit";
import type { Root } from "mdast";

const QUIZ_TYPES = new Set(["quiz-single", "quiz-code"]);

/** Extract text content from an mdast node tree */
function toString(node: any): string {
  if (node.type === "text") return node.value || "";
  if (node.children) return node.children.map(toString).join("");
  return "";
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
    visit(tree, (node: any) => {
      if (node.type !== "containerDirective") return;
      if (!QUIZ_TYPES.has(node.name)) return;

      /* Extract question text from directive label [...] */
      let question = "";
      const labelIndex = node.children.findIndex(
        (child: any) => child.data?.directiveLabel,
      );
      if (labelIndex !== -1) {
        question = toString(node.children[labelIndex]);
        node.children.splice(labelIndex, 1);
      }

      /* Extract answer and explanation from attributes {...} */
      const attrs = node.attributes || {};
      const answer = attrs.answer || "";
      const explanation = attrs.explanation || "";

      /* Tell remark-rehype to render as <quiz-block> with props */
      node.data = node.data || {};
      node.data.hName = "quiz-block";
      node.data.hProperties = {
        quizType: node.name,
        question,
        answer,
        explanation,
      };
    });
  };
}
