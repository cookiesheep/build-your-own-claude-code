"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import {
  requestQuizCodeApply,
  subscribeQuizCodeApplyResult,
} from "@/lib/quiz-code-actions";
import { parseQuizFeedback, parseQuizOptions } from "@/lib/quiz-options";
import { getQuizAnswer, recordQuizAnswer, subscribeQuizState } from "@/lib/quiz-state";

import CodeBlock from "./CodeBlock";

type QuizCodeProps = {
  quizId?: string;
  question?: string;
  answer?: string;
  explanation?: string;
  code?: string;
  language?: string;
  applyFile?: string;
  applyMarker?: string;
  applyLabel?: string;
  applyCode?: string;
  applyLanguage?: string;
  feedback?: string;
  children?: React.ReactNode;
};

type ApplyState = "idle" | "applying" | "applied" | "copied" | "error";

function stableFallbackId(question: string, answer: string, code: string): string {
  const seed = `${question}:${answer}:${code}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return `quiz-code-${hash.toString(36)}`;
}

export default function QuizCode({
  quizId,
  question = "",
  answer = "",
  explanation = "",
  code = "",
  language = "text",
  applyFile = "",
  applyMarker = "",
  applyLabel = "",
  applyCode = "",
  applyLanguage = "typescript",
  feedback = "",
  children,
}: QuizCodeProps) {
  const resolvedQuizId = quizId || stableFallbackId(question, answer, code);
  const options = parseQuizOptions(children);
  const feedbackByOption = parseQuizFeedback(feedback);
  const correctKey = answer.toUpperCase();
  const pendingRequestIdRef = useRef<string | null>(null);

  const storedRecord = useSyncExternalStore(
    subscribeQuizState,
    () => getQuizAnswer(resolvedQuizId),
    () => null,
  );
  const [draftSelected, setDraftSelected] = useState<string | null>(null);
  const [wrongAttempt, setWrongAttempt] = useState<string | null>(null);
  const [applyState, setApplyState] = useState<ApplyState>("idle");
  const [applyMessage, setApplyMessage] = useState("");
  const completed = Boolean(storedRecord?.answered && storedRecord.correct);
  const selected = completed ? storedRecord?.answer ?? null : draftSelected;
  const showingWrongAttempt = Boolean(wrongAttempt && !completed);
  const activeFeedbackKey = completed ? correctKey : wrongAttempt;
  const feedbackText = activeFeedbackKey
    ? feedbackByOption[activeFeedbackKey] ?? explanation
    : explanation;
  const hasCodeAction = Boolean(applyFile && applyMarker && applyCode);

  useEffect(() => {
    return subscribeQuizCodeApplyResult((result) => {
      if (result.requestId !== pendingRequestIdRef.current) return;
      pendingRequestIdRef.current = null;
      setApplyState(result.success ? "applied" : "error");
      setApplyMessage(result.message);
    });
  }, []);

  useEffect(() => {
    pendingRequestIdRef.current = null;
    setApplyState("idle");
    setApplyMessage("");
  }, [resolvedQuizId, applyFile, applyMarker, applyCode]);

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

  const handleApplyCode = () => {
    if (!hasCodeAction || applyState === "applying") return;

    const requestId = `${resolvedQuizId}-${Date.now()}`;
    pendingRequestIdRef.current = requestId;
    setApplyState("applying");
    setApplyMessage("");

    requestQuizCodeApply({
      requestId,
      filePath: applyFile,
      marker: applyMarker,
      code: applyCode,
      label: applyLabel,
    });

    window.setTimeout(() => {
      if (pendingRequestIdRef.current !== requestId) return;
      pendingRequestIdRef.current = null;
      setApplyState("error");
      setApplyMessage("右侧编辑器暂未响应，请确认工作台已打开。");
    }, 1200);
  };

  const handleCopyCode = async () => {
    if (!applyCode) return;
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(applyCode);
      setApplyState("copied");
      setApplyMessage("代码片段已复制。");
    } catch {
      setApplyState("error");
      setApplyMessage("复制失败，请手动选中代码片段复制。");
    }
  };

  return (
    <div className="quiz-block quiz-code-block" role="region" aria-label="代码理解题">
      {question && <p className="quiz-question">{question}</p>}

      {code && (
        <div className="quiz-code-snippet">
          <CodeBlock language={language} code={code} showLineNumbers={false} />
        </div>
      )}

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
                <span className="quiz-option-icon quiz-icon-correct" aria-label="正确">
                  ✓
                </span>
              )}
              {showWrong && (
                <span className="quiz-option-icon quiz-icon-wrong" aria-label="错误">
                  ×
                </span>
              )}
            </label>
          );
        })}
      </div>

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

      {(completed || showingWrongAttempt) && (
        <div
          className={`quiz-result ${completed ? "quiz-result--correct" : "quiz-result--wrong"}`}
          role="alert"
          aria-live="polite"
        >
          <span className="quiz-result-label">
            {completed ? "✓ 正确" : "× 这项还不对，可以重新选择"}
          </span>
          {feedbackText && <p className="quiz-result-explanation">{feedbackText}</p>}
        </div>
      )}

      {completed && hasCodeAction && (
        <div className="quiz-code-apply">
          <div className="quiz-code-apply-header">
            <span>{applyLabel || "可应用代码片段"}</span>
          </div>
          <p className="quiz-code-apply-meta">
            目标文件：<code>{applyFile}</code>
            <span>插入位置：<code>{applyMarker}</code></span>
          </p>
          <div className="quiz-code-apply-snippet">
            <CodeBlock
              language={applyLanguage || "typescript"}
              code={applyCode}
              showLineNumbers={false}
            />
          </div>
          <div className="quiz-code-apply-actions">
            <button
              type="button"
              className="quiz-code-apply-button"
              disabled={applyState === "applying"}
              onClick={handleApplyCode}
            >
              {applyState === "applying" ? "应用中..." : "应用到右侧编辑器"}
            </button>
            <button
              type="button"
              className="quiz-code-copy-button"
              onClick={() => {
                void handleCopyCode();
              }}
            >
              复制代码
            </button>
          </div>
          {applyMessage && (
            <p className={`quiz-code-apply-status quiz-code-apply-status--${applyState}`}>
              {applyMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
