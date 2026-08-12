// A short, pasteable digest for a study companion (see DESIGN.md §Study companion
// affordances). Every figure is one the Progress view already displays; it derives
// nothing new and returns a string that only the caller's clipboard ever sees.
//
// Deliberately locale-independent — stable English labels and raw content ids —
// because its reader is a companion rather than the UI, and the ids are the app's
// compatibility-contract ids, so they stay valid over time.
import { collectQuizInsightIds } from './quiz-insight';
import { isWeak } from './weakness';
import type { ReviewState } from './scheduler';
import type { QuizStat, StudyData } from './storage-schema';

// Structural minimums, so the builder stays testable without the real content
// modules and never depends on fields it does not read.
export type SummaryCard = { readonly id: string; readonly domainId: string; readonly revision: number };
export type SummaryQuestion = { readonly id: string; readonly domainId: string };
export type SummaryDomain = { readonly id: string; readonly number: number };

export type StudySummaryInput = {
  readonly data: StudyData;
  readonly cards: readonly SummaryCard[];
  readonly questions: readonly SummaryQuestion[];
  readonly domains: readonly SummaryDomain[];
  readonly studyGuideTotal: number;
  readonly studyGuideCompleted: number;
  readonly handsOnTotal: number;
  readonly handsOnCompleted: number;
  readonly now: Date;
};

// Long enough to be actionable, short enough to paste. Beyond this the list is
// truncated and says so, rather than silently dropping the tail.
export const SUMMARY_ID_LIMIT = 20;

// A question counts as "low accuracy" only once it has been attempted more than
// once: a single wrong answer is not yet a pattern, and listing it would bury the
// questions that have actually resisted repeated attempts.
const LOW_ACCURACY_MIN_ATTEMPTS = 2;
const LOW_ACCURACY_THRESHOLD = 0.5;

function isDueNow(review: ReviewState | undefined, revision: number, now: Date): boolean {
  return !review || review.cardRevisionSeen !== revision || Date.parse(review.dueAt) <= now.getTime();
}

function isLowAccuracy(stat: QuizStat): boolean {
  return stat.attempts >= LOW_ACCURACY_MIN_ATTEMPTS && stat.correct / stat.attempts < LOW_ACCURACY_THRESHOLD;
}

function formatIdList(ids: readonly string[]): string {
  if (!ids.length) return 'none';
  const shown = ids.slice(0, SUMMARY_ID_LIMIT).join(', ');
  return ids.length > SUMMARY_ID_LIMIT ? `${shown} (+${ids.length - SUMMARY_ID_LIMIT} more)` : shown;
}

export function buildStudySummary(input: StudySummaryInput): string {
  const { data, cards, questions, domains, now } = input;
  const reviews = data.reviews;

  const reviewed = cards.filter((card) => reviews[card.id]);
  const weakCards = cards.filter((card) => isWeak(reviews[card.id]));
  const dueCards = cards.filter((card) => isDueNow(reviews[card.id], card.revision, now));

  const perDomain = domains.map((domain) => {
    const inDomain = cards.filter((card) => card.domainId === domain.id);
    const domainQuestions = questions.filter((question) => question.domainId === domain.id);
    const answered = domainQuestions.filter((question) => data.quizStats[question.id]);
    const correct = answered.reduce((sum, question) => sum + data.quizStats[question.id]!.correct, 0);
    const attempts = answered.reduce((sum, question) => sum + data.quizStats[question.id]!.attempts, 0);
    return {
      label: `D${domain.number}`,
      reviewed: inDomain.filter((card) => reviews[card.id]).length,
      total: inDomain.length,
      weak: inDomain.filter((card) => isWeak(reviews[card.id])).length,
      quizAnswered: answered.length,
      quizTotal: domainQuestions.length,
      quizCorrect: correct,
      quizAttempts: attempts,
    };
  });

  const lowAccuracyQuestionIds = questions
    .filter((question) => {
      const stat = data.quizStats[question.id];
      return stat ? isLowAccuracy(stat) : false;
    })
    .map((question) => question.id);

  const insight = collectQuizInsightIds(questions, data.quizStats);
  const quizValues = Object.values(data.quizStats);
  const quizAttempts = quizValues.reduce((sum, stat) => sum + stat.attempts, 0);
  const quizCorrect = quizValues.reduce((sum, stat) => sum + stat.correct, 0);
  const quizAnswered = questions.filter((question) => data.quizStats[question.id]).length;

  // Latest = most recently completed. Raw correct count only, read from the
  // stored per-answer flags — the same basis the Progress view already shows.
  const latestAttempt = data.mockExamAttempts.reduce<StudyData['mockExamAttempts'][number] | null>(
    (latest, attempt) => (!latest || Date.parse(attempt.completedAt) >= Date.parse(latest.completedAt) ? attempt : latest),
    null,
  );

  const lines = [
    `CCA Field Notes study summary (generated ${now.toISOString().slice(0, 10)})`,
    'Counts only. No score, pass/fail, or readiness is derived here or anywhere in this app.',
    '',
    `Practice cards: reviewed ${reviewed.length}/${cards.length}, weak ${weakCards.length}, due now ${dueCards.length}`,
    `Quiz: answered ${quizAnswered}/${questions.length} questions, attempts ${quizAttempts}, correct ${quizCorrect}`,
    `Study Guide: completed ${input.studyGuideCompleted}/${input.studyGuideTotal} sections`,
    `Hands-on: completed ${input.handsOnCompleted}/${input.handsOnTotal} guides`,
    latestAttempt
      ? `Mock exam: ${data.mockExamAttempts.length} attempt(s), latest ${latestAttempt.answers.filter((answer) => answer.correct).length}/${latestAttempt.questionRefs.length} correct`
      : 'Mock exam: no completed attempt',
    '',
    'By domain (cards reviewed/total, weak cards, quiz answered/total, quiz correct/attempts):',
    ...perDomain.map((domain) =>
      `- ${domain.label}: cards ${domain.reviewed}/${domain.total}, weak ${domain.weak}, quiz ${domain.quizAnswered}/${domain.quizTotal}, correct ${domain.quizCorrect}/${domain.quizAttempts}`),
    '',
    `Weak card ids: ${formatIdList(weakCards.map((card) => card.id))}`,
    `Question ids answered correctly under half the time (${LOW_ACCURACY_MIN_ATTEMPTS}+ attempts): ${formatIdList(lowAccuracyQuestionIds)}`,
    // The three buckets the plain right/wrong tally cannot express. They only
    // appear once the learner has actually produced such an answer, so a record
    // written before these fields existed prints nothing extra.
    `Question ids answered partially but never fully (close): ${formatIdList(insight.close)}`,
    `Question ids never answered correctly or partially: ${formatIdList(insight.notUnderstood)}`,
    `Question ids the learner marked as a lucky guess: ${formatIdList(insight.guessedRight)}`,
  ];

  return lines.join('\n');
}
