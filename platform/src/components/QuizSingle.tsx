"use client";

import { useState, useSyncExternalStore } from "react";

import { parseQuizFeedback, parseQuizOptions } from "@/lib/quiz-options";
import { getQuizAnswer, recordQuizAnswer, subscribeQuizState } from "@/lib/quiz-state";

type QuizSingleProps = {
  quizType?: string;
  quizId?: string;
  question?: string;
  answer?: string;
  explanation?: string;
  feedback?: string;
  children?: React.ReactNode;
};

function stableFallbackId(question: string, answer: string): string {
  const seed = `${question}:${answer}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return `quiz-${hash.toString(36)}`;
}

export default function QuizSingle({
  quizId,
  question = "",
  answer = "",
  explanation = "",
  feedback = "",
  children,
}: QuizSingleProps) {
  const resolvedQuizId = quizId || stableFallbackId(question, answer);
  const options = parseQuizOptions(children);
  const feedbackByOption = parseQuizFeedback(feedback);
  const correctKey = answer.toUpperCase();

  const storedRecord = useSyncExternalStore(
    subscribeQuizState,
    () => getQuizAnswer(resolvedQuizId),
    () => null,
  );
  const [draftSelected, setDraftSelected] = useState<string | null>(null);
  const [wrongAttempt, setWrongAttempt] = useState<string | null>(null);
  const completed = Boolean(storedRecord?.answered && storedRecord.correct);
  const selected = completed ? storedRecord?.answer ?? null : draftSelected;
  const showingWrongAttempt = Boolean(wrongAttempt && !completed);
  const activeFeedbackKey = completed ? correctKey : wrongAttempt;
  const feedbackText = activeFeedbackKey
    ? feedbackByOption[activeFeedbackKey] ?? explanation
    : explanation;

  const handleSubmit = () => {
    if (!selected || completed) return;
    const correct = selected === correctKey;
    if (correct) {
      recordQuizAnswer(resolvedQuizId, selected, true);
      setWrongAttempt(null);
      return;
    }
    setWrongAttempt(selected);
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
          const showCorrect = completed && opt.key === correctKey;
          const showWrong = showingWrongAttempt && isSelected && opt.key !== correctKey;

          return (
            <label
              key={opt.key}
              className={`quiz-option ${
                completed ? "quiz-option--disabled" : ""
              } ${isSelected ? "quiz-option--selected" : ""} ${
                showCorrect ? "quiz-option--correct" : ""
              } ${showWrong ? "quiz-option--wrong" : ""}`}
            >
              <input
                type="radio"
                name={resolvedQuizId}
                value={opt.key}
                checked={isSelected}
                disabled={completed}
                onChange={() => {
                  setDraftSelected(opt.key);
                  setWrongAttempt(null);
                }}
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
      {!completed && (
        <button
          type="button"
          className="quiz-submit"
          disabled={!selected}
          onClick={handleSubmit}
        >
          {showingWrongAttempt ? "重新提交" : "提交答案"}
        </button>
      )}

      {/* Result feedback */}
      {(completed || showingWrongAttempt) && (
        <div
          className={`quiz-result ${completed ? "quiz-result--correct" : "quiz-result--wrong"}`}
          role="alert"
          aria-live="polite"
        >
          <span className="quiz-result-label">
            {completed ? "✓ 正确" : "✗ 这项还不对，可以重新选择"}
          </span>
          {feedbackText && (
            <p className="quiz-result-explanation">{feedbackText}</p>
          )}
        </div>
      )}
    </div>
  );
}
