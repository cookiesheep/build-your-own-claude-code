"use client";

import { useEffect, useMemo, useState } from "react";

import { getQuizProgress, subscribeQuizState } from "@/lib/quiz-state";

type QuizProgressProps = {
  quizIds: string[];
};

export default function QuizProgress({ quizIds }: QuizProgressProps) {
  const stableQuizIds = useMemo(() => [...new Set(quizIds)].filter(Boolean), [quizIds]);
  const [progress, setProgress] = useState(() => getQuizProgress(stableQuizIds));

  useEffect(() => {
    const refresh = () => setProgress(getQuizProgress(stableQuizIds));
    refresh();
    return subscribeQuizState(refresh);
  }, [stableQuizIds]);

  if (stableQuizIds.length === 0) return null;

  const completionPercent = Math.round((progress.answered / progress.total) * 100);
  const correctPercent = progress.total === 0
    ? 0
    : Math.round((progress.correct / progress.total) * 100);
  const reachedThreshold = correctPercent >= 80;

  return (
    <aside className="quiz-progress" aria-label="理解检查进度">
      <div>
        <p className="quiz-progress-eyebrow">理解检查</p>
        <p className="quiz-progress-title">
          已完成 {progress.answered}/{progress.total}
          <span>正确 {progress.correct}/{progress.total}</span>
        </p>
      </div>
      <div className="quiz-progress-meter" aria-hidden="true">
        <span style={{ width: `${completionPercent}%` }} />
      </div>
      <p className={reachedThreshold ? "quiz-progress-hint quiz-progress-hint--ready" : "quiz-progress-hint"}>
        {reachedThreshold
          ? "达到 80% 掌握度，可以继续往下做。"
          : progress.answered === 0
            ? "先完成几道小题，确认消息协议真的看懂了。"
            : "建议读完解释后再继续，80% 以上就是通过线。"}
      </p>
    </aside>
  );
}
