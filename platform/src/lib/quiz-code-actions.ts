"use client";

export type QuizCodeApplyRequest = {
  requestId: string;
  filePath: string;
  marker: string;
  code: string;
  label?: string;
};

export type QuizCodeApplyResult = {
  requestId: string;
  success: boolean;
  message: string;
};

const REQUEST_EVENT = "byocc-quiz-code-action-request";
const RESULT_EVENT = "byocc-quiz-code-action-result";

type QuizCodeApplyRequestListener = (request: QuizCodeApplyRequest) => void;
type QuizCodeApplyResultListener = (result: QuizCodeApplyResult) => void;

export function requestQuizCodeApply(request: QuizCodeApplyRequest) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<QuizCodeApplyRequest>(REQUEST_EVENT, { detail: request }));
}

export function subscribeQuizCodeApplyRequest(listener: QuizCodeApplyRequestListener) {
  if (typeof window === "undefined") return () => {};

  const handleRequest = (event: Event) => {
    listener((event as CustomEvent<QuizCodeApplyRequest>).detail);
  };

  window.addEventListener(REQUEST_EVENT, handleRequest);
  return () => window.removeEventListener(REQUEST_EVENT, handleRequest);
}

export function publishQuizCodeApplyResult(result: QuizCodeApplyResult) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<QuizCodeApplyResult>(RESULT_EVENT, { detail: result }));
}

export function subscribeQuizCodeApplyResult(listener: QuizCodeApplyResultListener) {
  if (typeof window === "undefined") return () => {};

  const handleResult = (event: Event) => {
    listener((event as CustomEvent<QuizCodeApplyResult>).detail);
  };

  window.addEventListener(RESULT_EVENT, handleResult);
  return () => window.removeEventListener(RESULT_EVENT, handleResult);
}
