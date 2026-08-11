// Merging two study documents, so a learner using two devices does not have to
// nominate one of them as canonical and throw the other's work away.
//
// Import has always been a full replacement (`save(imported.data)`), which is the
// right behaviour when restoring a backup and the wrong one when combining a
// phone and a laptop: whichever side was imported second won outright, and every
// review, quiz answer, and attempt recorded on the other side was gone.
//
// The single rule every merge here obeys is IDEMPOTENCE — merging the same export
// twice must equal merging it once. That rules out the obvious "add the two
// counters together", which double-counts on a re-import and on any two devices
// that share an ancestor export. Every rule below is either "take the newer" or
// "take the larger" or "take the union", all of which are stable under repeats.
//
// Nothing here is a score or a judgement; it only decides which recorded fact
// survives when both sides recorded one.
import { AGAIN_DELAY_MS, DAY, type ReviewState } from './scheduler';
import type { MockExamAttempt } from './mock-exam-types';
import type { HandsOnProgress, QuizStat, StudyData, StudyGuideProgress } from './storage-schema';

// When this review actually happened, recovered by inverting scheduleReview.
// `dueAt` alone is NOT a recency proxy — a card just rated 'again' is due in ten
// minutes while one rated 'good' days ago is still due tomorrow — but the delay
// scheduleReview added is fully determined by `lastRating` and `intervalDays`,
// so subtracting it back out is exact.
export function reviewedAtMs(state: ReviewState): number {
  const due = Date.parse(state.dueAt);
  if (Number.isNaN(due)) return Number.NEGATIVE_INFINITY;
  return state.lastRating === 'again' ? due - AGAIN_DELAY_MS : due - state.intervalDays * DAY;
}

// Ties keep the local record.
export function mergeReviews(
  local: Readonly<Record<string, ReviewState>>,
  incoming: Readonly<Record<string, ReviewState>>,
): Record<string, ReviewState> {
  const merged: Record<string, ReviewState> = { ...local };
  for (const [cardId, candidate] of Object.entries(incoming)) {
    const current = merged[cardId];
    if (!current || reviewedAtMs(candidate) > reviewedAtMs(current)) merged[cardId] = candidate;
  }
  return merged;
}

// Counters take the larger, never the sum: summing is not idempotent. Each
// optional counter is bounded by `attempts` on both sides, so an independent
// maximum cannot break that invariant. The "last answered" facts move together
// from the more recent side, so `lastCorrect` and `lastConfidence` always
// describe the same answer.
export function mergeQuizStat(local: QuizStat, incoming: QuizStat): QuizStat {
  const localIsNewer = Date.parse(local.lastAnsweredAt) >= Date.parse(incoming.lastAnsweredAt);
  const newer = localIsNewer ? local : incoming;
  const partial = Math.max(local.partial ?? 0, incoming.partial ?? 0);
  const guessedCorrect = Math.max(local.guessedCorrect ?? 0, incoming.guessedCorrect ?? 0);
  return {
    attempts: Math.max(local.attempts, incoming.attempts),
    correct: Math.max(local.correct, incoming.correct),
    lastAnsweredAt: newer.lastAnsweredAt,
    lastCorrect: newer.lastCorrect,
    // Absent stays absent.
    ...(partial > 0 ? { partial } : {}),
    ...(guessedCorrect > 0 ? { guessedCorrect } : {}),
    ...(newer.lastConfidence !== undefined ? { lastConfidence: newer.lastConfidence } : {}),
  };
}

export function mergeQuizStats(
  local: Readonly<Record<string, QuizStat>>,
  incoming: Readonly<Record<string, QuizStat>>,
): Record<string, QuizStat> {
  const merged: Record<string, QuizStat> = { ...local };
  for (const [questionId, candidate] of Object.entries(incoming)) {
    const current = merged[questionId];
    merged[questionId] = current ? mergeQuizStat(current, candidate) : candidate;
  }
  return merged;
}

// Which of two progress records is authoritative. `revision` outranks time,
// because it says WHICH content the record is about: a device that reconfirmed
// the current revision must not lose to a device that merely touched the previous
// revision more recently (perfectly possible when one device has not pulled the
// new content yet). Only within the same revision does `updatedAt` decide, and a
// tie there keeps the local record.
function prefersIncoming(
  local: { revision: number; updatedAt: string },
  incoming: { revision: number; updatedAt: string },
): boolean {
  if (incoming.revision !== local.revision) return incoming.revision > local.revision;
  return Date.parse(incoming.updatedAt) > Date.parse(local.updatedAt);
}

// A single status per section, so the authoritative record wins outright; there
// is nothing to combine.
export function mergeStudyGuideProgress(
  local: Readonly<Record<string, StudyGuideProgress>>,
  incoming: Readonly<Record<string, StudyGuideProgress>>,
): Record<string, StudyGuideProgress> {
  const merged: Record<string, StudyGuideProgress> = { ...local };
  for (const [sectionId, candidate] of Object.entries(incoming)) {
    const current = merged[sectionId];
    if (!current || prefersIncoming(current, candidate)) merged[sectionId] = candidate;
  }
  return merged;
}

// Hands-on also holds a checklist, and the two-device case this exists for is
// exactly "steps 1-3 on the laptop, 4-5 on the phone" — so the authoritative
// record supplies the status while completed steps are unioned. Unchecking on one
// device therefore does not propagate: losing a deliberate uncheck is recoverable
// by unchecking again, losing finished steps is not.
//
// When a higher revision wins over a record that was `completed` at the older
// revision, that completion time is carried across as `previousCompletedAt` —
// the same field `reconfirmHandsOnGuide` uses on a single device, so a merge
// does not lose context the normal flow preserves. Only ever onto an
// `in_progress` winner that has none, and only when it precedes `updatedAt`:
// both are hard requirements of `isHandsOnProgress`, and a record that fails it
// would make the storage layer reject the WHOLE document.
export function mergeHandsOnRecord(local: HandsOnProgress, incoming: HandsOnProgress): HandsOnProgress {
  const incomingIsAuthoritative = prefersIncoming(local, incoming);
  const authoritative = incomingIsAuthoritative ? incoming : local;
  const loser = incomingIsAuthoritative ? local : incoming;
  const steps = [...new Set([...local.completedStepIds, ...incoming.completedStepIds])];

  if (
    authoritative.status === 'in_progress'
    && authoritative.previousCompletedAt === undefined
    && loser.status === 'completed'
    && Date.parse(loser.completedAt) <= Date.parse(authoritative.updatedAt)
  ) {
    return { ...authoritative, completedStepIds: steps, previousCompletedAt: loser.completedAt };
  }

  return { ...authoritative, completedStepIds: steps };
}

export function mergeHandsOnProgress(
  local: Readonly<Record<string, HandsOnProgress>>,
  incoming: Readonly<Record<string, HandsOnProgress>>,
): Record<string, HandsOnProgress> {
  const merged: Record<string, HandsOnProgress> = { ...local };
  for (const [guideId, candidate] of Object.entries(incoming)) {
    const current = merged[guideId];
    merged[guideId] = current ? mergeHandsOnRecord(current, candidate) : candidate;
  }
  return merged;
}

// Union by attempt id — an attempt is immutable once finished, so the same id on
// both sides is the same attempt and the local copy is kept.
//
// Deliberately NOT sorted. Sorting here would break idempotence on an already
// stored document whose attempts are not in completion order: merging it with
// itself would reorder it, so merge(a, a) !== a. Every reader sorts for display
// anyway (MockExamHistory, mock-exam-analysis), so the stored order is not a
// contract this needs to establish.
export function mergeMockExamAttempts(
  local: readonly MockExamAttempt[],
  incoming: readonly MockExamAttempt[],
): MockExamAttempt[] {
  const byId = new Map(local.map((attempt) => [attempt.id, attempt]));
  for (const attempt of incoming) {
    if (!byId.has(attempt.id)) byId.set(attempt.id, attempt);
  }
  return [...byId.values()];
}

// Two live exam sessions cannot be combined (different draws, different clocks),
// so the local one is kept whenever it exists.
export function mergeStudyData(local: StudyData, incoming: StudyData): StudyData {
  return {
    version: 3,
    reviews: mergeReviews(local.reviews, incoming.reviews),
    quizStats: mergeQuizStats(local.quizStats, incoming.quizStats),
    studyGuideProgress: mergeStudyGuideProgress(local.studyGuideProgress, incoming.studyGuideProgress),
    handsOnProgress: mergeHandsOnProgress(local.handsOnProgress, incoming.handsOnProgress),
    activeMockExam: local.activeMockExam ?? incoming.activeMockExam,
    mockExamAttempts: mergeMockExamAttempts(local.mockExamAttempts, incoming.mockExamAttempts),
  };
}
