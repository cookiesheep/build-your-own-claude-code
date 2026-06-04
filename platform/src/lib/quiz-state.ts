/**
 * Quiz state management via localStorage.
 *
 * State persists across page refreshes and survives tab closes (localStorage).
 * Key: "byocc-quiz-state"
 * Value: { [quizId]: { answered: boolean, answer: string, correct: boolean, timestamp: number } }
 */

const STORAGE_KEY = "byocc-quiz-state";
const CHANGE_EVENT = "byocc-quiz-state-change";
const EMPTY_STATE: QuizState = {};

let cachedRawState: string | null = null;
let cachedState: QuizState = EMPTY_STATE;

export type QuizRecord = {
  answered: boolean;
  answer: string;
  correct: boolean;
  timestamp: number;
};

type QuizState = Record<string, QuizRecord>;

function readState(): QuizState {
  if (typeof window === "undefined") return EMPTY_STATE;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRawState) {
      return cachedState;
    }

    if (!raw) {
      cachedRawState = raw;
      cachedState = EMPTY_STATE;
      return cachedState;
    }

    cachedRawState = raw;
    cachedState = JSON.parse(raw) as QuizState;
    return cachedState;
  } catch {
    cachedState = EMPTY_STATE;
    return cachedState;
  }
}

function writeState(state: QuizState): void {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, raw);
    cachedRawState = raw;
    cachedState = state;
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* localStorage full or unavailable — silently ignore */
  }
}

function uniqueIds(quizIds: string[]): string[] {
  return [...new Set(quizIds.filter(Boolean))];
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

export function getQuizProgress(quizIds: string[]): {
  total: number;
  answered: number;
  correct: number;
} {
  const ids = uniqueIds(quizIds);
  const state = readState();
  const answeredRecords = ids
    .map((id) => state[id])
    .filter((record): record is QuizRecord => Boolean(record?.answered));

  return {
    total: ids.length,
    answered: answeredRecords.length,
    correct: answeredRecords.filter((record) => record.correct).length,
  };
}

export function subscribeQuizState(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };

  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function extractQuizIdsFromMarkdown(markdown: string): string[] {
  const ids: string[] = [];
  const directivePattern = /^:{3,}(quiz-single|quiz-code)\[[^\]]*\]\{([^}]*)\}/gm;
  let match: RegExpExecArray | null;

  while ((match = directivePattern.exec(markdown)) !== null) {
    const attrs = match[2];
    const idMatch = attrs.match(/\bid=(?:"([^"]+)"|'([^']+)'|([^\s}]+))/);
    const id = idMatch?.[1] ?? idMatch?.[2] ?? idMatch?.[3];
    if (id) ids.push(id);
  }

  return uniqueIds(ids);
}
