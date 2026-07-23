// Task 9 — the pure analysis layer over completed Mock Exam attempts. It reads
// only stored attempts (never re-grades) and the current question bank (for
// grouping keys), and returns derived data that the UI merely displays. Nothing
// here is persisted: every value is recomputable from `mockExamAttempts`.
//
// Two hard rules shape the whole module, both from Task 9:
//   1. It never re-grades. An answer's correctness is `answer.correct` exactly as
//      the engine stored it at completion time; `isAnswerCorrect` is deliberately
//      NOT imported here.
//   2. It never attributes a stale answer to a current domain/difficulty/skill.
//      A stored answer is "compatible" only when its question still exists AND its
//      revision still matches; otherwise it is counted only in the raw,
//      content-free totals (per-attempt accuracy, trend) and excluded from every
//      axis breakdown. This is what keeps an old revision's result from being
//      mixed into the current content's analysis.
//
// It computes, but never names, a pass/fail verdict, a scaled score, a 720-point
// conversion, or a readiness prediction. `learning stability` describes only how
// consistent this app's own repeated practice has been — nothing about the
// official exam.
import type { ChoiceQuestion, QuestionDifficulty, SkillId } from '../content/types';
import { questionDifficulties } from '../content/types';
import type { MockExamAttempt, MockExamAttemptAnswer } from './mock-exam-types';

// Evidence thresholds, centralized so the UI copy and the candidate/stability
// gates all agree on the same boundaries. compatibleCount:
//   0..4   -> insufficient  (too few answers to say anything)
//   5..14  -> limited       (a reference value only)
//   15..   -> sufficient    (a trend can be read)
export const EVIDENCE_LIMITED_MIN = 5;
export const EVIDENCE_SUFFICIENT_MIN = 15;

export type EvidenceLevel = 'insufficient' | 'limited' | 'sufficient';

export function evidenceLevelFor(compatibleCount: number): EvidenceLevel {
  if (compatibleCount >= EVIDENCE_SUFFICIENT_MIN) return 'sufficient';
  if (compatibleCount >= EVIDENCE_LIMITED_MIN) return 'limited';
  return 'insufficient';
}

// The learning-stability spread threshold: the raw accuracy of the three most
// recent attempts must stay within this many percentage points to be considered
// consistent. A small epsilon absorbs float error so an exact 10.0pp spread (e.g.
// six-correct apart out of sixty) still counts as within range.
export const STABILITY_SPREAD_MAX_PP = 10;
export const STABILITY_MIN_ATTEMPTS = 3;
export const STABILITY_MIN_COMPATIBLE = 120;
const SPREAD_EPSILON = 1e-9;

export type MockExamAnalysisRange = 'all-time' | 'recent-3';

export type MockExamAxisKind = 'domain' | 'difficulty' | 'skill';

// One row of an axis breakdown. `total` and `compatibleCount` are equal by
// construction — a stale answer cannot be placed in an axis bucket at all, so the
// bucket only ever counts compatible answers — but both are surfaced because the
// UI labels them distinctly ("this many answers analyzed" vs. the evidence gate).
// `incorrect` = total - correct, so it includes unanswered questions, matching how
// the exam's raw accuracy already penalizes a blank answer.
export type MockExamAxisStat = {
  kind: MockExamAxisKind;
  key: string;
  total: number;
  answered: number;
  unanswered: number;
  correct: number;
  incorrect: number;
  rawAccuracy: number;
  compatibleCount: number;
  evidenceLevel: EvidenceLevel;
};

export type MockExamReviewCandidate = {
  kind: 'domain' | 'skill';
  key: string;
  rawAccuracy: number;
  incorrect: number;
  compatibleCount: number;
};

// Why there is (or is not) a review-priority list for an axis kind:
//   insufficient -> no axis reached `sufficient` evidence, so nothing is eligible
//   none         -> some axes are sufficient, but none sits below the learner's own
//                   compatible average, so nothing clearly stands out
//   ranked       -> the ordered candidates below the learner's own average
export type MockExamReviewPriority =
  | { status: 'insufficient' }
  | { status: 'none' }
  | { status: 'ranked'; candidates: MockExamReviewCandidate[] };

// Describes only this app's repeated-practice consistency, never exam readiness.
export type LearningStability = 'insufficient_data' | 'building_evidence' | 'stable_practice';

export type MockExamTrendPoint = {
  attemptId: string;
  completedAt: string;
  outcome: 'submitted' | 'expired';
  correct: number;
  total: number;
  rawAccuracy: number;
  answered: number;
  unanswered: number;
  staleCount: number;
};

export type MockExamNextActionType =
  | 'review-domain'
  | 'review-skill'
  | 'practice-weak-area'
  | 'take-another-exam'
  | 'retake-latest';

export type MockExamNextAction = {
  type: MockExamNextActionType;
  key?: string;
};

export type MockExamAnalysis = {
  range: MockExamAnalysisRange;
  // Attempts inside the selected range (all-time = every attempt; recent-3 = the
  // three most recent). `totalAttemptCount` is always the all-time count, so the
  // UI can show "showing 3 of 7".
  attemptCount: number;
  totalAttemptCount: number;
  // Answers inside the selected range, split by whether they could be attributed
  // to current content. `staleAnswerCount` are excluded from every axis below.
  compatibleAnswerCount: number;
  staleAnswerCount: number;
  byDomain: MockExamAxisStat[];
  byDifficulty: MockExamAxisStat[];
  bySkill: MockExamAxisStat[];
  reviewPriority: { domain: MockExamReviewPriority; skill: MockExamReviewPriority };
  // Stability is an all-time judgment and does not depend on `range`.
  stability: LearningStability;
  // Trend is the full all-time history, ascending by completedAt.
  trend: MockExamTrendPoint[];
  nextActions: MockExamNextAction[];
};

type MutableTally = {
  total: number;
  answered: number;
  correct: number;
};

const newTally = (): MutableTally => ({ total: 0, answered: 0, correct: 0 });

// Deterministic order over attempts: oldest first, ties broken by attempt id so
// the same set of attempts always yields the same sequence (and the same "recent
// three"). Never mutates the input array.
function orderAttemptsAscending(attempts: readonly MockExamAttempt[]): MockExamAttempt[] {
  return [...attempts].sort((a, b) => {
    const byTime = a.completedAt.localeCompare(b.completedAt);
    if (byTime !== 0) return byTime;
    return a.id.localeCompare(b.id);
  });
}

const compareStrings = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function isCompatible(answer: MockExamAttemptAnswer, byId: ReadonlyMap<string, ChoiceQuestion>): boolean {
  const question = byId.get(answer.questionId);
  return !!question && question.revision === answer.questionRevision;
}

const isAnswered = (answer: MockExamAttemptAnswer): boolean => answer.selectedChoiceIds.length > 0;

function toAxisStat(kind: MockExamAxisKind, key: string, tally: MutableTally): MockExamAxisStat {
  const { total, answered, correct } = tally;
  return {
    kind,
    key,
    total,
    answered,
    unanswered: total - answered,
    correct,
    incorrect: total - correct,
    rawAccuracy: total === 0 ? 0 : correct / total,
    compatibleCount: total,
    evidenceLevel: evidenceLevelFor(total),
  };
}

// Builds the three axis breakdowns from the compatible answers of the selected
// attempts. A multi-skill question contributes one entry to each of its skills,
// so the by-skill totals can sum to more than the number of questions — the UI
// states this. Domains and difficulties are enumerated from the whole current
// bank (so every domain/difficulty shows, even with zero data); skills are shown
// only when they have at least one compatible answer in the selection.
function buildAxes(
  selected: readonly MockExamAttempt[],
  byId: ReadonlyMap<string, ChoiceQuestion>,
  allDomainIds: readonly string[],
): { byDomain: MockExamAxisStat[]; byDifficulty: MockExamAxisStat[]; bySkill: MockExamAxisStat[]; compatibleAnswerCount: number; staleAnswerCount: number } {
  const domainTallies = new Map<string, MutableTally>(allDomainIds.map((id) => [id, newTally()]));
  const difficultyTallies = new Map<QuestionDifficulty, MutableTally>(questionDifficulties.map((d) => [d, newTally()]));
  const skillTallies = new Map<SkillId, MutableTally>();

  let compatibleAnswerCount = 0;
  let staleAnswerCount = 0;

  for (const attempt of selected) {
    for (const answer of attempt.answers) {
      const question = byId.get(answer.questionId);
      if (!question || question.revision !== answer.questionRevision) {
        staleAnswerCount += 1;
        continue;
      }
      compatibleAnswerCount += 1;
      const answered = isAnswered(answer);

      const domainTally = domainTallies.get(question.domainId) ?? newTally();
      if (!domainTallies.has(question.domainId)) domainTallies.set(question.domainId, domainTally);
      bumpTally(domainTally, answered, answer.correct);

      const difficultyTally = difficultyTallies.get(question.difficulty);
      if (difficultyTally) bumpTally(difficultyTally, answered, answer.correct);

      for (const skillId of question.skills) {
        let skillTally = skillTallies.get(skillId);
        if (!skillTally) { skillTally = newTally(); skillTallies.set(skillId, skillTally); }
        bumpTally(skillTally, answered, answer.correct);
      }
    }
  }

  const byDomain = [...domainTallies.entries()]
    .sort((a, b) => compareStrings(a[0], b[0]))
    .map(([key, tally]) => toAxisStat('domain', key, tally));
  const byDifficulty = questionDifficulties.map((d) => toAxisStat('difficulty', d, difficultyTallies.get(d) ?? newTally()));
  const bySkill = [...skillTallies.entries()]
    .sort((a, b) => compareStrings(a[0], b[0]))
    .map(([key, tally]) => toAxisStat('skill', key, tally));

  return { byDomain, byDifficulty, bySkill, compatibleAnswerCount, staleAnswerCount };
}

function bumpTally(tally: MutableTally, answered: boolean, correct: boolean): void {
  tally.total += 1;
  if (answered) tally.answered += 1;
  if (correct) tally.correct += 1;
}

// A sufficient-evidence axis is a review-priority candidate only when its raw
// accuracy sits below the learner's OWN compatible average — a self-referential,
// deterministic "relatively low" test that never invents a fixed pass line.
// Ranking: lowest accuracy first, then most incorrect, then most data, then key.
function computeReviewPriority(
  axes: readonly MockExamAxisStat[],
  overallCompatibleRawAccuracy: number,
): MockExamReviewPriority {
  const sufficient = axes.filter((axis) => axis.evidenceLevel === 'sufficient');
  if (sufficient.length === 0) return { status: 'insufficient' };

  const belowAverage = sufficient.filter((axis) => axis.rawAccuracy < overallCompatibleRawAccuracy);
  if (belowAverage.length === 0) return { status: 'none' };

  const candidates = [...belowAverage]
    .sort((a, b) =>
      a.rawAccuracy - b.rawAccuracy
      || b.incorrect - a.incorrect
      || b.compatibleCount - a.compatibleCount
      || compareStrings(a.key, b.key))
    .map((axis): MockExamReviewCandidate => ({
      kind: axis.kind as 'domain' | 'skill',
      key: axis.key,
      rawAccuracy: axis.rawAccuracy,
      incorrect: axis.incorrect,
      compatibleCount: axis.compatibleCount,
    }));
  return { status: 'ranked', candidates };
}

// Per-attempt raw accuracy uses ALL stored answers (stale included), because raw
// accuracy is content-free: it is just how many of this attempt's own answers the
// engine marked correct, out of the attempt's question count.
function attemptRawAccuracy(attempt: MockExamAttempt): number {
  const total = attempt.answers.length;
  if (total === 0) return 0;
  const correct = attempt.answers.reduce((sum, answer) => sum + (answer.correct ? 1 : 0), 0);
  return correct / total;
}

function buildTrend(orderedAscending: readonly MockExamAttempt[], byId: ReadonlyMap<string, ChoiceQuestion>): MockExamTrendPoint[] {
  return orderedAscending.map((attempt) => {
    const total = attempt.answers.length;
    let correct = 0;
    let answered = 0;
    let staleCount = 0;
    for (const answer of attempt.answers) {
      if (answer.correct) correct += 1;
      if (isAnswered(answer)) answered += 1;
      if (!isCompatible(answer, byId)) staleCount += 1;
    }
    return {
      attemptId: attempt.id,
      completedAt: attempt.completedAt,
      outcome: attempt.outcome,
      correct,
      total,
      rawAccuracy: total === 0 ? 0 : correct / total,
      answered,
      unanswered: total - answered,
      staleCount,
    };
  });
}

// Stability is all-time and never references how HIGH the accuracy is — only how
// much data exists and how tightly the three most recent attempts cluster. A
// learner who is consistently low still counts as `stable_practice`; the review
// priorities are what surface where to improve.
function computeStability(
  orderedAscending: readonly MockExamAttempt[],
  allTimeCompatibleAnswerCount: number,
  allTimeDomainAxes: readonly MockExamAxisStat[],
): LearningStability {
  const completedCount = orderedAscending.length;
  if (completedCount < STABILITY_MIN_ATTEMPTS || allTimeCompatibleAnswerCount < STABILITY_MIN_COMPATIBLE) {
    return 'insufficient_data';
  }

  const recentThree = orderedAscending.slice(-3);
  const accuracies = recentThree.map(attemptRawAccuracy);
  const spreadPp = (Math.max(...accuracies) - Math.min(...accuracies)) * 100;
  const spreadWithinRange = spreadPp <= STABILITY_SPREAD_MAX_PP + SPREAD_EPSILON;

  const everyDomainSufficient = allTimeDomainAxes.length > 0
    && allTimeDomainAxes.every((axis) => axis.evidenceLevel === 'sufficient');

  if (spreadWithinRange && everyDomainSufficient) return 'stable_practice';
  return 'building_evidence';
}

// Rule-based, deterministic, capped at three, in the fixed priority order of §7.
// Emits descriptors only — the mapping to copy and to an in-app destination is
// the UI's job, so nothing here fabricates a filter or a route.
function computeNextActions(input: {
  domainPriority: MockExamReviewPriority;
  skillPriority: MockExamReviewPriority;
  byDomain: readonly MockExamAxisStat[];
  bySkill: readonly MockExamAxisStat[];
  totalAttemptCount: number;
  compatibleAnswerCount: number;
  staleAnswerCount: number;
}): MockExamNextAction[] {
  const actions: MockExamNextAction[] = [];
  const seen = new Set<string>();
  const push = (action: MockExamNextAction): void => {
    const dedupeKey = `${action.type}:${action.key ?? ''}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    if (actions.length < 3) actions.push(action);
  };

  if (input.domainPriority.status === 'ranked') {
    push({ type: 'review-domain', key: input.domainPriority.candidates[0].key });
  }
  if (input.skillPriority.status === 'ranked') {
    push({ type: 'review-skill', key: input.skillPriority.candidates[0].key });
  }

  // Additional practice for an under-sampled area: a domain that has some data and
  // some wrong answers but has not reached sufficient evidence. Not a weakness
  // claim — the framing (in copy) is "gather more data".
  const underSampled = [...input.byDomain]
    .filter((axis) => axis.evidenceLevel !== 'sufficient' && axis.total > 0 && axis.incorrect > 0)
    .sort((a, b) => a.rawAccuracy - b.rawAccuracy || b.incorrect - a.incorrect || compareStrings(a.key, b.key));
  if (underSampled.length > 0) push({ type: 'practice-weak-area', key: underSampled[0].key });

  if (input.totalAttemptCount < STABILITY_MIN_ATTEMPTS) push({ type: 'take-another-exam' });

  const answerTotal = input.compatibleAnswerCount + input.staleAnswerCount;
  if (answerTotal > 0 && input.staleAnswerCount / answerTotal >= 0.5) push({ type: 'retake-latest' });

  return actions;
}

// The single entry point. Pure: given the same attempts, questions, and range it
// always returns the same value, and it never mutates its inputs.
export function analyzeMockExams(
  attempts: readonly MockExamAttempt[],
  questions: readonly ChoiceQuestion[],
  range: MockExamAnalysisRange,
): MockExamAnalysis {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const allDomainIds = [...new Set(questions.map((question) => question.domainId))].sort(compareStrings);

  const orderedAscending = orderAttemptsAscending(attempts);
  const selected = range === 'recent-3' ? orderedAscending.slice(-3) : orderedAscending;

  const { byDomain, byDifficulty, bySkill, compatibleAnswerCount, staleAnswerCount } = buildAxes(selected, byId, allDomainIds);

  // The gate reference is the learner's own compatible raw accuracy in the
  // selection (correct over all compatible answers), so "relatively low" means
  // "below your own average", not below any official bar.
  const compatibleCorrect = byDomain.reduce((sum, axis) => sum + axis.correct, 0);
  const overallCompatibleRawAccuracy = compatibleAnswerCount === 0 ? 0 : compatibleCorrect / compatibleAnswerCount;

  const domainPriority = computeReviewPriority(byDomain, overallCompatibleRawAccuracy);
  const skillPriority = computeReviewPriority(bySkill, overallCompatibleRawAccuracy);

  // Stability and its domain-evidence requirement are all-time, independent of the
  // range toggle above.
  const allTimeAxes = range === 'all-time'
    ? { byDomain, compatibleAnswerCount }
    : buildAxes(orderedAscending, byId, allDomainIds);
  const stability = computeStability(orderedAscending, allTimeAxes.compatibleAnswerCount, allTimeAxes.byDomain);

  const trend = buildTrend(orderedAscending, byId);

  const nextActions = computeNextActions({
    domainPriority,
    skillPriority,
    byDomain,
    bySkill,
    totalAttemptCount: orderedAscending.length,
    compatibleAnswerCount,
    staleAnswerCount,
  });

  return {
    range,
    attemptCount: selected.length,
    totalAttemptCount: orderedAscending.length,
    compatibleAnswerCount,
    staleAnswerCount,
    byDomain,
    byDifficulty,
    bySkill,
    reviewPriority: { domain: domainPriority, skill: skillPriority },
    stability,
    trend,
    nextActions,
  };
}
