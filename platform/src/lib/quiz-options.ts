import { isValidElement } from "react";
import type { ReactNode } from "react";

export type QuizOption = { key: string; text: string };
export type QuizFeedbackMap = Record<string, string>;
type ElementWithChildren = React.ReactElement<{ children?: ReactNode }>;

/** Parse markdown list children into options:
 *  "- A) Option text" -> { key: "A", text: "Option text" }
 */
export function parseQuizOptions(children: ReactNode): QuizOption[] {
  return flattenListItems(children)
    .map(extractText)
    .map((text) => text.trim())
    .map((text) => text.match(/^([A-Z])\)\s*(.+)/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => ({ key: match[1], text: match[2] }));
}

export function parseQuizFeedback(feedback?: string): QuizFeedbackMap {
  if (!feedback) return {};
  try {
    const parsed = JSON.parse(feedback) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .filter((entry): entry is [string, string] => typeof entry[1] === "string")
        .map(([key, value]) => [key.toUpperCase(), value]),
    );
  } catch {
    return {};
  }
}

function flattenListItems(node: ReactNode): ReactNode[] {
  if (!node) return [];
  if (Array.isArray(node)) return node.flatMap(flattenListItems);
  if (!isValidElement(node)) return [];

  const element = node as ElementWithChildren;

  if (element.type === "ul" || element.type === "ol") {
    return flattenListItems(element.props.children);
  }

  if (element.type === "li") {
    return [element];
  }

  return flattenListItems(element.props.children);
}

function extractText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (!node) return "";
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    return extractText((node as ElementWithChildren).props.children);
  }
  return "";
}
