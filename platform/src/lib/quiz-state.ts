/**
 * Quiz state management via localStorage.
 *
 * State persists across page refreshes and survives tab closes (localStorage).
 * Key: "byocc-quiz-state"
 * Value: { [quizId]: { answered: boolean, answer: string, correct: boolean, timestamp: number } }
 */

const STORAGE_KEY = "byocc-quiz-state";

type QuizRecord = {
  answered: boolean;
  answer: string;
  correct: boolean;
  timestamp: number;
};

type QuizState = Record<string, QuizRecord>;

function readState(): QuizState {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeState(state: QuizState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* localStorage full or unavailable — silently ignore */
  }
}

/** Check if a quiz has already been answered */
export function isQuizAnswered(quizId: string): boolean {
  return Boolean(readState()[quizId]?.answered);
}

/** Get the recorded answer for a quiz */
export function getQuizAnswer(quizId: string): QuizRecord | null {
  return readState()[quizId] ?? null;
}

/** Record a quiz answer */
export function recordQuizAnswer(
  quizId: string,
  answer: string,
  correct: boolean,
): void {
  const state = readState();
  state[quizId] = {
    answered: true,
    answer,
    correct,
    timestamp: Date.now(),
  };
  writeState(state);
}
