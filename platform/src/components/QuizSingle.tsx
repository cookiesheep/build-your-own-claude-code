"use client";

import { useState, useEffect, useId } from "react";
import { isQuizAnswered, getQuizAnswer, recordQuizAnswer } from "@/lib/quiz-state";

type QuizSingleProps = {
  quizType?: string;
  question?: string;
  answer?: string;
  explanation?: string;
  children?: React.ReactNode;
};

type Option = { key: string; text: string };

/** Parse markdown list children into structured options:
 *  "- A) Option text" → { key: "A", text: "Option text" }
 */
function parseOptions(children: React.ReactNode): Option[] {
  const options: Option[] = [];
  const items = flattenListItems(children);

  for (const item of items) {
    const text = extractText(item);
    const match = text.match(/^([A-Z])\)\s*(.+)/);
    if (match) {
      options.push({ key: match[1], text: match[2] });
    }
  }
  return options;
}

function flattenListItems(node: React.ReactNode): React.ReactNode[] {
  if (!node) return [];
  if (Array.isArray(node)) return node.flatMap(flattenListItems);
  if (typeof node === "object" && "props" in (node as any)) {
    const el = node as React.ReactElement;
    const type = (el.props as any)?.className;
    /* If this is an <li>, return it directly */
    if ((el.type === "li") || (typeof type === "string" && type.includes("task-list")) || (el.type === "ul" || el.type === "ol")) {
      if (el.type === "ul" || el.type === "ol") {
        return flattenListItems((el.props as any).children);
      }
      return [el];
    }
    /* Otherwise recurse into children */
    return flattenListItems((el.props as any).children);
  }
  return [];
}

function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (!node) return "";
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (typeof node === "object" && "props" in node) {
    return extractText((node as React.ReactElement<Record<string, unknown>>).props?.children as React.ReactNode);
  }
  return "";
}

export default function QuizSingle({
  question = "",
  answer = "",
  explanation = "",
  children,
}: QuizSingleProps) {
  const uid = useId();
  const quizId = `quiz-${uid.replace(/:/g, "")}`;
  const options = parseOptions(children);
  const correctKey = answer.toUpperCase();

  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  /* Restore state from localStorage */
  useEffect(() => {
    const record = getQuizAnswer(quizId);
    if (record?.answered) {
      setSelected(record.answer);
      setSubmitted(true);
      setIsCorrect(record.correct);
    }
  }, [quizId]);

  const handleSubmit = () => {
    if (!selected || submitted) return;
    const correct = selected === correctKey;
    setIsCorrect(correct);
    setSubmitted(true);
    recordQuizAnswer(quizId, selected, correct);
  };

  return (
    <div className="quiz-block" role="region" aria-label="选择题">
      {/* Question */}
      {question && (
        <p className="quiz-question">{question}</p>
      )}

      {/* Options */}
      <div className="quiz-options" role="radiogroup" aria-label="选项">
        {options.map((opt) => {
          const isSelected = selected === opt.key;
          const showCorrect = submitted && opt.key === correctKey;
          const showWrong = submitted && isSelected && opt.key !== correctKey;

          return (
            <label
              key={opt.key}
              className={`quiz-option ${
                submitted ? "quiz-option--disabled" : ""
              } ${isSelected ? "quiz-option--selected" : ""} ${
                showCorrect ? "quiz-option--correct" : ""
              } ${showWrong ? "quiz-option--wrong" : ""}`}
            >
              <input
                type="radio"
                name={quizId}
                value={opt.key}
                checked={isSelected}
                disabled={submitted}
                onChange={() => setSelected(opt.key)}
                className="quiz-radio"
              />
              <span className="quiz-option-key">{opt.key}</span>
              <span className="quiz-option-text">{opt.text}</span>
              {showCorrect && (
                <span className="quiz-option-icon quiz-icon-correct" aria-label="正确">✓</span>
              )}
              {showWrong && (
                <span className="quiz-option-icon quiz-icon-wrong" aria-label="错误">✗</span>
              )}
            </label>
          );
        })}
      </div>

      {/* Submit button */}
      {!submitted && (
        <button
          type="button"
          className="quiz-submit"
          disabled={!selected}
          onClick={handleSubmit}
        >
          提交答案
        </button>
      )}

      {/* Result feedback */}
      {submitted && (
        <div
          className={`quiz-result ${isCorrect ? "quiz-result--correct" : "quiz-result--wrong"}`}
          role="alert"
          aria-live="polite"
        >
          <span className="quiz-result-label">
            {isCorrect ? "✓ 正确" : "✗ 不正确"}
          </span>
          {explanation && (
            <p className="quiz-result-explanation">{explanation}</p>
          )}
        </div>
      )}
    </div>
  );
}
