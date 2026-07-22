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

function parseAnswers(value: unknown, questionIds: ReadonlySet<string>, startedAtMs: number): Record<string, MockExamAnswer> | null {
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
    if (!isIsoDateTime(entry.answeredAt) || Date.parse(entry.answeredAt) < startedAtMs) return null;
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
  if (Date.parse(value.expiresAt) <= startedAtMs) return null;
  if (Date.parse(value.updatedAt) < startedAtMs) return null;

  const answers = parseAnswers(value.answers, questionIds, startedAtMs);
  if (!answers) return null;
  const flaggedQuestionIds = parseFlagged(value.flaggedQuestionIds, questionIds);
  if (!flaggedQuestionIds) return null;

  // `submittedAt` exists exactly when the session was explicitly submitted; an
  // expired or in-progress session must not carry one, and it can never predate
  // the start.
  let submittedAt: string | undefined;
  if (value.submittedAt !== undefined) {
    if (status !== 'submitted' || !isIsoDateTime(value.submittedAt) || Date.parse(value.submittedAt) < startedAtMs) return null;
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

function parseAttemptAnswers(value: unknown, questionIds: ReadonlySet<string>, startedAtMs: number): MockExamAttemptAnswer[] | null {
  if (!Array.isArray(value)) return null;
  const answers: MockExamAttemptAnswer[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry)) return null;
    if (!isNonEmptyString(entry.questionId) || !questionIds.has(entry.questionId) || seen.has(entry.questionId)) return null;
    if (!isPositiveInteger(entry.questionRevision)) return null;
    // Unanswered questions are graded too, so an empty selection is valid here
    // (unlike a live answer record); it must still be a clean string array.
    if (!isUniqueNonEmptyStringArray(entry.selectedChoiceIds)) return null;
    if (typeof entry.correct !== 'boolean') return null;
    let answeredAt: string | undefined;
    if (entry.answeredAt !== undefined) {
      if (!isIsoDateTime(entry.answeredAt) || Date.parse(entry.answeredAt) < startedAtMs) return null;
      answeredAt = entry.answeredAt;
    }
    seen.add(entry.questionId);
    const graded: MockExamAttemptAnswer = {
      questionId: entry.questionId,
      questionRevision: entry.questionRevision,
      selectedChoiceIds: [...entry.selectedChoiceIds],
      correct: entry.correct,
    };
    if (answeredAt !== undefined) graded.answeredAt = answeredAt;
    answers.push(graded);
  }
  return answers;
}

export function parseMockExamAttempt(value: unknown): MockExamAttempt | null {
  if (!isRecord(value)) return null;
  if (!isNonEmptyString(value.id) || !isPositiveInteger(value.blueprintVersion)) return null;
  if (value.outcome !== 'submitted' && value.outcome !== 'expired') return null;

  const questionRefs = parseQuestionRefs(value.questionRefs);
  if (!questionRefs) return null;
  const questionIds = new Set(questionRefs.map((ref) => ref.questionId));

  if (!isIsoDateTime(value.startedAt) || !isIsoDateTime(value.expiresAt) || !isIsoDateTime(value.completedAt)) return null;
  const startedAtMs = Date.parse(value.startedAt);
  if (Date.parse(value.expiresAt) <= startedAtMs) return null;
  if (Date.parse(value.completedAt) < startedAtMs) return null;

  const answers = parseAttemptAnswers(value.answers, questionIds, startedAtMs);
  if (!answers) return null;
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
