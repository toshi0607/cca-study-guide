// Three buckets the plain right/wrong tally cannot express:
//   close         — partially correct at least once, never fully correct
//   notUnderstood — attempted, never correct and never even partial
//   guessedRight  — correct answers the learner themselves labelled a guess
// Counts of recorded events, not a grade. Field semantics live on `QuizStat`.
import type { QuizStat } from './storage-schema';

export type QuizInsight = {
  close: number;
  notUnderstood: number;
  guessedRight: number;
};

export function isClose(stat: QuizStat): boolean {
  return (stat.partial ?? 0) > 0 && stat.correct === 0;
}

export function isNotUnderstood(stat: QuizStat): boolean {
  return stat.attempts > 0 && stat.correct === 0 && (stat.partial ?? 0) === 0;
}

export function deriveQuizInsight(quizStats: Readonly<Record<string, QuizStat>>): QuizInsight {
  const stats = Object.values(quizStats);
  return {
    close: stats.filter(isClose).length,
    notUnderstood: stats.filter(isNotUnderstood).length,
    guessedRight: stats.reduce((sum, stat) => sum + (stat.guessedCorrect ?? 0), 0),
  };
}

// Question ids in each bucket, in the caller's question order so the output is
// stable rather than dependent on record insertion order.
export function collectQuizInsightIds(
  questions: readonly { readonly id: string }[],
  quizStats: Readonly<Record<string, QuizStat>>,
): { close: string[]; notUnderstood: string[]; guessedRight: string[] } {
  const close: string[] = [];
  const notUnderstood: string[] = [];
  const guessedRight: string[] = [];
  for (const question of questions) {
    const stat = quizStats[question.id];
    if (!stat) continue;
    if (isClose(stat)) close.push(question.id);
    if (isNotUnderstood(stat)) notUnderstood.push(question.id);
    if ((stat.guessedCorrect ?? 0) > 0) guessedRight.push(question.id);
  }
  return { close, notUnderstood, guessedRight };
}
