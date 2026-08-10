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
import type { ReviewState } from './scheduler';
import type { MockExamAttempt } from './mock-exam-types';
import type { HandsOnProgress, QuizStat, StudyData, StudyGuideProgress } from './storage-schema';

const DAY = 86_400_000;
// scheduleReview's 'again' branch: due 10 minutes out with intervalDays 0.
const AGAIN_DELAY_MS = 10 * 60_000;

// When this review actually happened, recovered by inverting scheduleReview.
//
// The memo that asked for this proposed comparing `dueAt` directly, but `dueAt`
// is not a proxy for recency: a card just rated 'again' is due in ten minutes
// while a card rated 'good' days ago is still due tomorrow, so the raw
// comparison prefers the older review. ReviewState carries no timestamp, but
// scheduleReview derives `dueAt` from the review time plus a delay that is fully
// determined by `lastRating` and `intervalDays` — so the review time is exactly
// recoverable.
export function reviewedAtMs(state: ReviewState): number {
  const due = Date.parse(state.dueAt);
  if (Number.isNaN(due)) return Number.NEGATIVE_INFINITY;
  return state.lastRating === 'again' ? due - AGAIN_DELAY_MS : due - state.intervalDays * DAY;
}

// Ties keep the local record: a merge that changes nothing is preferable to one
// that swaps in an identical-age record from elsewhere.
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

// Counters take the larger of the two rather than the sum. The sum is what a
// learner intuitively wants, but it is not idempotent — re-importing the same
// file would inflate every count — and the counts are only ever used to rank what
// to review, where the larger value carries the same signal. `correct`,
// `partial` and `guessedCorrect` are each bounded by `attempts` on both sides, so
// taking the maximum of each independently can never break that invariant.
//
// The "last answered" facts come as a set from whichever side answered more
// recently, so `lastCorrect` and `lastConfidence` always describe the same answer.
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
    // Absent stays absent, so a merge of two records that never used these fields
    // does not start writing them.
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

// Study Guide progress is a single status per section, so the record written more
// recently simply wins; there is nothing to combine.
export function mergeStudyGuideProgress(
  local: Readonly<Record<string, StudyGuideProgress>>,
  incoming: Readonly<Record<string, StudyGuideProgress>>,
): Record<string, StudyGuideProgress> {
  const merged: Record<string, StudyGuideProgress> = { ...local };
  for (const [sectionId, candidate] of Object.entries(incoming)) {
    const current = merged[sectionId];
    if (!current || Date.parse(candidate.updatedAt) > Date.parse(current.updatedAt)) merged[sectionId] = candidate;
  }
  return merged;
}

// Hands-on differs from the Study Guide in that it also holds a checklist, and
// the two-device case this exists for is exactly "steps 1-3 on the laptop, 4-5 on
// the phone". So the newer record supplies the status while the completed steps
// are unioned. Unchecking a step on one device therefore does not propagate — a
// deliberate trade: losing a deliberate uncheck is recoverable by unchecking
// again, losing finished steps is not.
export function mergeHandsOnRecord(local: HandsOnProgress, incoming: HandsOnProgress): HandsOnProgress {
  const newer = Date.parse(incoming.updatedAt) > Date.parse(local.updatedAt) ? incoming : local;
  const steps = [...new Set([...local.completedStepIds, ...incoming.completedStepIds])];
  return { ...newer, completedStepIds: steps };
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
// both sides is the same attempt and the local copy is kept. Sorted by completion
// time so history reads in order regardless of which side contributed what.
export function mergeMockExamAttempts(
  local: readonly MockExamAttempt[],
  incoming: readonly MockExamAttempt[],
): MockExamAttempt[] {
  const byId = new Map(local.map((attempt) => [attempt.id, attempt]));
  for (const attempt of incoming) {
    if (!byId.has(attempt.id)) byId.set(attempt.id, attempt);
  }
  return [...byId.values()].sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt));
}

// Two live exam sessions cannot be combined — they are different draws with
// different clocks — so the local one is kept whenever it exists. An import only
// contributes a session when this device has none in flight, which is the case
// where adopting it loses nothing.
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
