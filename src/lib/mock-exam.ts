// The Mock Exam engine (Task 8A): a set of pure functions that build a 60-question
// session with a guaranteed domain distribution, move through it, and grade it.
// Nothing here reads the clock, randomness, ids, or content on its own — every
// such dependency is injected, so the whole engine is deterministic under test.
//
// This module is deliberately NOT imported by the app shell. Task 8B builds the
// exam UI on top of these functions; until then the engine stays out of the
// initial client bundle. The functions take the question bank as an argument
// rather than importing it, so the bank is never duplicated into this module.
//
// Scoring policy: results are raw correct-answer counts over this app's own
// questions. The engine never derives, and its types never name, a pass/fail
// outcome, a scaled score, or an exam-readiness verdict — this app does not know
// the official scaling algorithm and must not imitate it.
import type { ChoiceQuestion } from '../content/types';
import { questionDifficulties } from '../content/types';
import { isAnswerCorrect } from './quiz';
import { validateMockExamBlueprint } from './mock-exam-blueprint';
import type {
  CreateMockExamResult,
  GradeMockExamResult,
  MockExamAttempt,
  MockExamAttemptAnswer,
  MockExamBlueprint,
  MockExamCompatibility,
  MockExamCompatibilityIssue,
  MockExamProgress,
  MockExamResult,
  MockExamSession,
  MockExamTally,
} from './mock-exam-types';

export {
  MOCK_EXAM_QUESTION_COUNT,
  MOCK_EXAM_DURATION_SECONDS,
  MOCK_EXAM_DOMAIN_DISTRIBUTION,
  MOCK_EXAM_BLUEPRINT_VERSION,
  MOCK_EXAM_DOMAIN_IDS,
  defaultMockExamBlueprint,
  validateMockExamBlueprint,
} from './mock-exam-blueprint';
export type {
  CreateMockExamResult,
  GradeMockExamResult,
  MockExamAnswer,
  MockExamAttempt,
  MockExamAttemptAnswer,
  MockExamBlueprint,
  MockExamCompatibility,
  MockExamCompatibilityIssue,
  MockExamDomainDistribution,
  MockExamProgress,
  MockExamQuestionRef,
  MockExamResult,
  MockExamSession,
  MockExamStatus,
  MockExamTally,
} from './mock-exam-types';

// Fisher-Yates over a copy, driven by the injected random so a seeded generator
// makes selection reproducible. Never mutates its input.
function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

const dedupe = (values: readonly string[]): string[] => [...new Set(values)];

export type CreateMockExamInput = {
  questions: readonly ChoiceQuestion[];
  blueprint: MockExamBlueprint;
  now: Date;
  random?: () => number;
  createId: () => string;
};

// Builds a session or returns a typed failure. Order of checks: a broken
// blueprint fails first (`invalid-blueprint`), then any domain that cannot supply
// its quota fails together (`insufficient-question-bank`, listing every shortage
// so the caller sees the full gap, never a partial exam). On success the drawn
// order is frozen into `questionRefs` and never re-drawn on resume.
export function createMockExamSession(input: CreateMockExamInput): CreateMockExamResult {
  const { questions, blueprint, now, createId } = input;
  const random = input.random ?? Math.random;

  const blueprintErrors = validateMockExamBlueprint(blueprint);
  if (blueprintErrors.length > 0) {
    return { ok: false, reason: 'invalid-blueprint', errors: blueprintErrors };
  }

  const byDomain = new Map<string, ChoiceQuestion[]>();
  for (const question of questions) {
    const bucket = byDomain.get(question.domainId);
    if (bucket) bucket.push(question);
    else byDomain.set(question.domainId, [question]);
  }

  // Never borrow from another domain, never round the distribution down, never
  // start a short exam: any domain that cannot meet its quota is a shortage, and
  // one shortage fails the whole build closed.
  const shortages: Record<string, number> = {};
  for (const [domainId, need] of Object.entries(blueprint.domainDistribution)) {
    const have = byDomain.get(domainId)?.length ?? 0;
    if (have < need) shortages[domainId] = need - have;
  }
  if (Object.keys(shortages).length > 0) {
    return { ok: false, reason: 'insufficient-question-bank', shortages };
  }

  // Randomize within each domain, take the quota, then randomize the combined
  // order so the exam is not grouped by domain. Each domain pool is sorted by id
  // before the shuffle, so the outcome depends only on the injected random and
  // the quota — never on the order the bank happened to arrive in.
  const selected: ChoiceQuestion[] = [];
  for (const [domainId, need] of Object.entries(blueprint.domainDistribution)) {
    const pool = [...(byDomain.get(domainId) ?? [])].sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
    selected.push(...shuffle(pool, random).slice(0, need));
  }
  const ordered = shuffle(selected, random);

  const startedAtMs = now.getTime();
  const startedAt = now.toISOString();
  const expiresAt = new Date(startedAtMs + blueprint.durationSeconds * 1000).toISOString();

  return {
    ok: true,
    session: {
      id: createId(),
      blueprintVersion: blueprint.version,
      status: 'in_progress',
      questionRefs: ordered.map((question) => ({ questionId: question.id, revision: question.revision })),
      currentIndex: 0,
      answers: {},
      flaggedQuestionIds: [],
      startedAt,
      expiresAt,
      updatedAt: startedAt,
    },
  };
}

// A session accepts changes only while it is in progress and the clock has not
// reached its expiry. Both conditions are enforced here so no transition can
// record an answer into a finished or timed-out exam.
function isWritable(session: MockExamSession, now: Date): boolean {
  return session.status === 'in_progress' && now.getTime() < Date.parse(session.expiresAt);
}

const questionIdSet = (session: MockExamSession): Set<string> =>
  new Set(session.questionRefs.map((ref) => ref.questionId));

export type SetMockExamAnswerInput = {
  session: MockExamSession;
  questionId: string;
  selectedChoiceIds: readonly string[];
  now: Date;
  // When provided, a selected id outside this set rejects the update (defense in
  // depth over the caller). Omit to trust the caller's own choice validation.
  validChoiceIds?: readonly string[];
};

// Records (or overwrites) the answer for one question. Returns the input session
// unchanged — same reference — when the exam is closed, the question is not part
// of this session, or a selected id is not a valid choice. A selection is
// de-duplicated; clearing it (empty after de-dup) removes the answer entirely.
export function setMockExamAnswer(input: SetMockExamAnswerInput): MockExamSession {
  const { session, questionId, selectedChoiceIds, now } = input;
  if (!isWritable(session, now)) return session;
  if (!questionIdSet(session).has(questionId)) return session;

  const canonical = dedupe(selectedChoiceIds);
  if (input.validChoiceIds) {
    const valid = new Set(input.validChoiceIds);
    if (canonical.some((id) => !valid.has(id))) return session;
  }

  const answers = { ...session.answers };
  if (canonical.length === 0) {
    if (!(questionId in answers)) return session;
    delete answers[questionId];
  } else {
    answers[questionId] = { selectedChoiceIds: canonical, answeredAt: now.toISOString() };
  }
  return { ...session, answers, updatedAt: now.toISOString() };
}

// Flags or unflags a question for later review. Toggling a flag never touches the
// answer for that question. Unchanged when the exam is closed or the id is not
// part of this session.
export function toggleMockExamFlag(session: MockExamSession, questionId: string, now: Date): MockExamSession {
  if (!isWritable(session, now)) return session;
  if (!questionIdSet(session).has(questionId)) return session;

  const flagged = session.flaggedQuestionIds.includes(questionId)
    ? session.flaggedQuestionIds.filter((id) => id !== questionId)
    : [...session.flaggedQuestionIds, questionId];
  return { ...session, flaggedQuestionIds: flagged, updatedAt: now.toISOString() };
}

// Moves the cursor to an absolute question index. Rejects (returns unchanged) a
// non-integer or out-of-range target, and any move once the exam is closed —
// including the window after the clock passes expiry but before the status has
// flipped, so navigation is gated on the same `now`-aware rule as answering and
// flagging. Moving the cursor never changes an answer.
export function moveMockExamCursor(session: MockExamSession, index: number, now: Date): MockExamSession {
  if (!isWritable(session, now)) return session;
  if (!Number.isInteger(index) || index < 0 || index >= session.questionRefs.length) return session;
  if (index === session.currentIndex) return session;
  return { ...session, currentIndex: index, updatedAt: now.toISOString() };
}

// Explicit hand-in. A session already finished is returned unchanged. If the
// clock has already reached expiry, the outcome is `expired`, not `submitted` —
// the two are kept distinct. Unanswered questions are allowed; submitting does
// not require every question to be answered.
export function submitMockExam(session: MockExamSession, now: Date): MockExamSession {
  if (session.status !== 'in_progress') return session;
  if (now.getTime() >= Date.parse(session.expiresAt)) return expireMockExamIfNeeded(session, now);
  const iso = now.toISOString();
  return { ...session, status: 'submitted', submittedAt: iso, updatedAt: iso };
}

// Marks an in-progress session `expired` once the wall clock reaches its expiry.
// A no-op otherwise, so it is safe to call on every render or resume.
export function expireMockExamIfNeeded(session: MockExamSession, now: Date): MockExamSession {
  if (session.status !== 'in_progress') return session;
  if (now.getTime() < Date.parse(session.expiresAt)) return session;
  return { ...session, status: 'expired', updatedAt: now.toISOString() };
}

// Seconds left, derived purely from `expiresAt - now` so a backgrounded tab, a
// reload, or a sleeping machine all show the true remaining time — never a count
// of timer ticks. Zero once submitted, expired, or past expiry; negative values
// clamp to zero.
export function deriveMockExamRemainingSeconds(session: MockExamSession, now: Date): number {
  if (session.status !== 'in_progress') return 0;
  const remainingMs = Date.parse(session.expiresAt) - now.getTime();
  return remainingMs <= 0 ? 0 : Math.ceil(remainingMs / 1000);
}

// A content-free view of progress for the question palette and counters.
export function deriveMockExamProgress(session: MockExamSession): MockExamProgress {
  const answeredQuestionIds: string[] = [];
  const unansweredQuestionIds: string[] = [];
  for (const ref of session.questionRefs) {
    const answer = session.answers[ref.questionId];
    if (answer && answer.selectedChoiceIds.length > 0) answeredQuestionIds.push(ref.questionId);
    else unansweredQuestionIds.push(ref.questionId);
  }
  return {
    total: session.questionRefs.length,
    currentIndex: session.currentIndex,
    answeredCount: answeredQuestionIds.length,
    unansweredCount: unansweredQuestionIds.length,
    flaggedCount: session.flaggedQuestionIds.length,
    answeredQuestionIds,
    unansweredQuestionIds,
    flaggedQuestionIds: [...session.flaggedQuestionIds],
  };
}

// Whether a completed session can still be graded against the current content.
// A question that vanished, a revision that moved, or a selected choice that no
// longer exists all make the session incompatible — none is silently ignored, so
// Task 8B can tell the learner the exam can no longer be resumed while the
// attempt record itself is still preserved.
export function validateMockExamCompatibility(
  session: MockExamSession,
  questions: readonly ChoiceQuestion[],
): MockExamCompatibility {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const issues: MockExamCompatibilityIssue[] = [];
  for (const ref of session.questionRefs) {
    const question = byId.get(ref.questionId);
    if (!question) {
      issues.push({ questionId: ref.questionId, kind: 'missing-question' });
      continue;
    }
    if (question.revision !== ref.revision) {
      issues.push({ questionId: ref.questionId, kind: 'revision-mismatch', expectedRevision: ref.revision, actualRevision: question.revision });
      continue;
    }
    const answer = session.answers[ref.questionId];
    if (!answer) continue;
    const choiceIds = new Set(question.choices.map((choice) => choice.id));
    for (const selectedId of answer.selectedChoiceIds) {
      if (!choiceIds.has(selectedId)) issues.push({ questionId: ref.questionId, kind: 'missing-choice', choiceId: selectedId });
    }
  }
  return issues.length === 0 ? { compatible: true } : { compatible: false, issues };
}

const emptyTally = (): MockExamTally => ({ correct: 0, answered: 0, total: 0 });

function bump(tally: MockExamTally, answered: boolean, correct: boolean): void {
  tally.total += 1;
  if (answered) tally.answered += 1;
  if (correct) tally.correct += 1;
}

// Aggregates an attempt into raw counts by domain, difficulty, and skill. Joins
// each graded answer to the current question for its grouping keys; a question no
// longer present is still counted in the exam total but cannot be attributed to a
// group (grading refuses on incompatibility, so this only bites a later re-derive
// against changed content). A multi-skill question counts toward every skill.
export function deriveMockExamResult(
  attempt: MockExamAttempt,
  questions: readonly ChoiceQuestion[],
): MockExamResult {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const totalQuestions = attempt.questionRefs.length;
  let answeredQuestions = 0;
  let correctAnswers = 0;

  const byDomain: Record<string, MockExamTally> = {};
  const byDifficulty = Object.fromEntries(
    questionDifficulties.map((difficulty) => [difficulty, emptyTally()]),
  ) as MockExamResult['byDifficulty'];
  const bySkill: MockExamResult['bySkill'] = {};

  for (const answer of attempt.answers) {
    const answered = answer.selectedChoiceIds.length > 0;
    if (answered) answeredQuestions += 1;
    if (answer.correct) correctAnswers += 1;

    const question = byId.get(answer.questionId);
    if (!question) continue;
    (byDomain[question.domainId] ??= emptyTally());
    bump(byDomain[question.domainId], answered, answer.correct);
    bump(byDifficulty[question.difficulty], answered, answer.correct);
    for (const skillId of question.skills) {
      bump((bySkill[skillId] ??= emptyTally()), answered, answer.correct);
    }
  }

  return {
    totalQuestions,
    answeredQuestions,
    correctAnswers,
    rawAccuracy: totalQuestions === 0 ? 0 : correctAnswers / totalQuestions,
    byDomain,
    byDifficulty,
    bySkill,
  };
}

// Grades a finished session against the current content. Refuses a session still
// in progress (`not-completed`) and refuses to grade over changed content
// (`incompatible-content`) rather than scoring the wrong questions. The attempt
// it returns is the immutable record for storage and later analysis; the result
// is the derived aggregation. Correctness reuses `isAnswerCorrect` — no second
// definition of "right answer".
export function gradeMockExamAttempt(
  session: MockExamSession,
  questions: readonly ChoiceQuestion[],
): GradeMockExamResult {
  if (session.status === 'in_progress') return { ok: false, reason: 'not-completed' };

  const compatibility = validateMockExamCompatibility(session, questions);
  if (!compatibility.compatible) return { ok: false, reason: 'incompatible-content', issues: compatibility.issues };

  const byId = new Map(questions.map((question) => [question.id, question]));
  const answers: MockExamAttemptAnswer[] = session.questionRefs.map((ref) => {
    const question = byId.get(ref.questionId)!;
    const answer = session.answers[ref.questionId];
    const selectedChoiceIds = answer ? [...answer.selectedChoiceIds] : [];
    const graded: MockExamAttemptAnswer = {
      questionId: ref.questionId,
      questionRevision: ref.revision,
      selectedChoiceIds,
      correct: answer ? isAnswerCorrect(question, answer.selectedChoiceIds) : false,
    };
    if (answer?.answeredAt) graded.answeredAt = answer.answeredAt;
    return graded;
  });

  const attempt: MockExamAttempt = {
    id: session.id,
    blueprintVersion: session.blueprintVersion,
    outcome: session.status === 'expired' ? 'expired' : 'submitted',
    questionRefs: session.questionRefs.map((ref) => ({ ...ref })),
    answers,
    flaggedQuestionIds: [...session.flaggedQuestionIds],
    startedAt: session.startedAt,
    expiresAt: session.expiresAt,
    completedAt: session.submittedAt ?? session.expiresAt,
  };

  return { ok: true, attempt, result: deriveMockExamResult(attempt, questions) };
}
