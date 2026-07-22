// The storage boundary for Mock Exam state. It validates a persisted session or
// attempt purely structurally — no clock, no randomness, no content lookup — and
// rebuilds a clean object so unknown extra keys never ride along. Whether a
// selected choice still exists in the current content is a grade-time concern
// (see `validateMockExamCompatibility`), not a storage one.
//
// It imports only the low-level guards from `storage-primitives`, so wiring it
// into `storage-schema` adds no cycle and keeps the engine out of the bundle.
import {
  isIsoDateTime,
  isNonEmptyString,
  isPositiveInteger,
  isRecord,
  isUniqueNonEmptyStringArray,
  unsafeRecordKeys,
} from './storage-primitives';
import type {
  MockExamAnswer,
  MockExamAttempt,
  MockExamAttemptAnswer,
  MockExamQuestionRef,
  MockExamSession,
  MockExamStatus,
} from './mock-exam-types';

const statuses = new Set<MockExamStatus>(['in_progress', 'submitted', 'expired']);

function parseQuestionRefs(value: unknown): MockExamQuestionRef[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const refs: MockExamQuestionRef[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry) || !isNonEmptyString(entry.questionId) || !isPositiveInteger(entry.revision)) return null;
    if (seen.has(entry.questionId)) return null;
    seen.add(entry.questionId);
    refs.push({ questionId: entry.questionId, revision: entry.revision });
  }
  return refs;
}

// Live answers are only written while the session is in progress and before its
// expiry, and every write also bumps `updatedAt`. That makes the timing window a
// hard invariant the engine always satisfies: startedAt <= answeredAt <= updatedAt
// and answeredAt < expiresAt. The strict parser enforces it so an imported
// document can never claim an answer recorded before the exam began, after it was
// last touched, or once time was already up.
function parseAnswers(
  value: unknown,
  questionIds: ReadonlySet<string>,
  startedAtMs: number,
  updatedAtMs: number,
  expiresAtMs: number,
): Record<string, MockExamAnswer> | null {
  if (!isRecord(value)) return null;
  const answers: Record<string, MockExamAnswer> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (unsafeRecordKeys.has(key)) return null;
    // An answer keyed by a question not in this session is corruption, not a
    // future record to preserve: the two must correspond exactly.
    if (!questionIds.has(key)) return null;
    if (!isRecord(entry)) return null;
    const selected = entry.selectedChoiceIds;
    if (!isUniqueNonEmptyStringArray(selected) || selected.length === 0) return null;
    if (!isIsoDateTime(entry.answeredAt)) return null;
    const answeredAtMs = Date.parse(entry.answeredAt);
    if (answeredAtMs < startedAtMs || answeredAtMs > updatedAtMs || answeredAtMs >= expiresAtMs) return null;
    answers[key] = { selectedChoiceIds: [...selected], answeredAt: entry.answeredAt };
  }
  return answers;
}

function parseFlagged(value: unknown, questionIds: ReadonlySet<string>): string[] | null {
  if (!isUniqueNonEmptyStringArray(value)) return null;
  if (value.some((id) => !questionIds.has(id))) return null;
  return [...value];
}

export function parseMockExamSession(value: unknown): MockExamSession | null {
  if (!isRecord(value)) return null;
  if (!isNonEmptyString(value.id) || !isPositiveInteger(value.blueprintVersion)) return null;
  if (typeof value.status !== 'string' || !statuses.has(value.status as MockExamStatus)) return null;
  const status = value.status as MockExamStatus;

  const questionRefs = parseQuestionRefs(value.questionRefs);
  if (!questionRefs) return null;
  const questionIds = new Set(questionRefs.map((ref) => ref.questionId));

  if (!Number.isInteger(value.currentIndex) || (value.currentIndex as number) < 0 || (value.currentIndex as number) >= questionRefs.length) return null;

  if (!isIsoDateTime(value.startedAt) || !isIsoDateTime(value.expiresAt) || !isIsoDateTime(value.updatedAt)) return null;
  const startedAtMs = Date.parse(value.startedAt);
  const expiresAtMs = Date.parse(value.expiresAt);
  const updatedAtMs = Date.parse(value.updatedAt);
  if (expiresAtMs <= startedAtMs) return null;
  if (updatedAtMs < startedAtMs) return null;

  const answers = parseAnswers(value.answers, questionIds, startedAtMs, updatedAtMs, expiresAtMs);
  if (!answers) return null;
  const flaggedQuestionIds = parseFlagged(value.flaggedQuestionIds, questionIds);
  if (!flaggedQuestionIds) return null;

  // `submittedAt` exists exactly when the session was explicitly submitted. The
  // engine sets it and `updatedAt` to the same instant, before expiry, so the
  // parser enforces that canonical shape: present only on a submitted session,
  // equal to `updatedAt`, on or after the start, and strictly before expiry. An
  // expired or in-progress session must carry none.
  let submittedAt: string | undefined;
  if (value.submittedAt !== undefined) {
    if (status !== 'submitted' || !isIsoDateTime(value.submittedAt)) return null;
    const submittedAtMs = Date.parse(value.submittedAt);
    if (submittedAtMs < startedAtMs || submittedAtMs >= expiresAtMs || submittedAtMs !== updatedAtMs) return null;
    submittedAt = value.submittedAt;
  } else if (status === 'submitted') {
    return null;
  }

  const session: MockExamSession = {
    id: value.id,
    blueprintVersion: value.blueprintVersion,
    status,
    questionRefs,
    currentIndex: value.currentIndex as number,
    answers,
    flaggedQuestionIds,
    startedAt: value.startedAt,
    expiresAt: value.expiresAt,
    updatedAt: value.updatedAt,
  };
  if (submittedAt !== undefined) session.submittedAt = submittedAt;
  return session;
}

// The engine grades exactly one entry per question ref — unanswered questions
// included — carrying the ref's revision. The strict parser enforces that whole
// contract: a bijection with the refs (one answer each, same revision), the
// selection/answeredAt correspondence (an answered question has a timestamp, an
// unanswered one does not), and the timing window (startedAt <= answeredAt, on or
// before completion, and strictly before expiry). Anything else — a missing or
// extra answer, a drifted revision, a timestamp past completion — is a document
// this build cannot have produced and must not import.
function parseAttemptAnswers(
  value: unknown,
  refRevisionById: ReadonlyMap<string, number>,
  startedAtMs: number,
  completedAtMs: number,
  expiresAtMs: number,
): MockExamAttemptAnswer[] | null {
  if (!Array.isArray(value)) return null;
  const answers: MockExamAttemptAnswer[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry)) return null;
    if (!isNonEmptyString(entry.questionId) || !refRevisionById.has(entry.questionId) || seen.has(entry.questionId)) return null;
    // The graded revision must be the one captured in the ref, so a later content
    // change can never be mistaken for what the learner actually faced.
    if (entry.questionRevision !== refRevisionById.get(entry.questionId)) return null;
    // An answered question has a non-empty selection and a timestamp; an
    // unanswered one has neither. The two must agree in both directions.
    if (!isUniqueNonEmptyStringArray(entry.selectedChoiceIds)) return null;
    if (typeof entry.correct !== 'boolean') return null;
    const answered = entry.selectedChoiceIds.length > 0;
    let answeredAt: string | undefined;
    if (entry.answeredAt !== undefined) {
      if (!answered || !isIsoDateTime(entry.answeredAt)) return null;
      const answeredAtMs = Date.parse(entry.answeredAt);
      if (answeredAtMs < startedAtMs || answeredAtMs > completedAtMs || answeredAtMs >= expiresAtMs) return null;
      answeredAt = entry.answeredAt;
    } else if (answered) {
      return null;
    }
    seen.add(entry.questionId);
    const graded: MockExamAttemptAnswer = {
      questionId: entry.questionId,
      questionRevision: entry.questionRevision as number,
      selectedChoiceIds: [...entry.selectedChoiceIds],
      correct: entry.correct,
    };
    if (answeredAt !== undefined) graded.answeredAt = answeredAt;
    answers.push(graded);
  }
  // Exactly one answer per ref: same count, and every id already proven to be a
  // distinct ref id, so this is a full bijection.
  return answers.length === refRevisionById.size ? answers : null;
}

export function parseMockExamAttempt(value: unknown): MockExamAttempt | null {
  if (!isRecord(value)) return null;
  if (!isNonEmptyString(value.id) || !isPositiveInteger(value.blueprintVersion)) return null;
  if (value.outcome !== 'submitted' && value.outcome !== 'expired') return null;

  const questionRefs = parseQuestionRefs(value.questionRefs);
  if (!questionRefs) return null;
  const refRevisionById = new Map(questionRefs.map((ref) => [ref.questionId, ref.revision]));

  if (!isIsoDateTime(value.startedAt) || !isIsoDateTime(value.expiresAt) || !isIsoDateTime(value.completedAt)) return null;
  const startedAtMs = Date.parse(value.startedAt);
  const expiresAtMs = Date.parse(value.expiresAt);
  const completedAtMs = Date.parse(value.completedAt);
  if (expiresAtMs <= startedAtMs) return null;
  if (completedAtMs < startedAtMs) return null;
  // A submitted attempt finished before time ran out; an expired one finished
  // exactly at expiry — the engine sets completedAt from submittedAt or expiresAt.
  if (value.outcome === 'submitted' && completedAtMs >= expiresAtMs) return null;
  if (value.outcome === 'expired' && completedAtMs !== expiresAtMs) return null;

  const answers = parseAttemptAnswers(value.answers, refRevisionById, startedAtMs, completedAtMs, expiresAtMs);
  if (!answers) return null;
  const questionIds = new Set(questionRefs.map((ref) => ref.questionId));
  const flaggedQuestionIds = parseFlagged(value.flaggedQuestionIds, questionIds);
  if (!flaggedQuestionIds) return null;

  return {
    id: value.id,
    blueprintVersion: value.blueprintVersion,
    outcome: value.outcome,
    questionRefs,
    answers,
    flaggedQuestionIds,
    startedAt: value.startedAt,
    expiresAt: value.expiresAt,
    completedAt: value.completedAt,
  };
}

// The active session slot: either an explicit absence (null) or a valid session.
// `undefined`/missing is treated as null by the caller; anything else fails.
export function parseActiveMockExam(value: unknown): MockExamSession | null | undefined {
  if (value === null) return null;
  const session = parseMockExamSession(value);
  return session ?? undefined; // undefined signals "invalid" to the strict caller
}

// The completed-attempt history. Strict: one malformed entry rejects the whole
// list rather than silently dropping a finished exam.
export function parseMockExamAttempts(value: unknown): MockExamAttempt[] | null {
  if (!Array.isArray(value)) return null;
  const attempts: MockExamAttempt[] = [];
  for (const entry of value) {
    const attempt = parseMockExamAttempt(entry);
    if (!attempt) return null;
    attempts.push(attempt);
  }
  return attempts;
}
