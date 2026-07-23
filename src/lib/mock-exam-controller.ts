import type { ChoiceQuestion } from '../content/types';
import type { StudyData } from './storage';
import {
  createMockExamSession,
  expireMockExamIfNeeded,
  gradeMockExamAttempt,
  submitMockExam,
  type CreateMockExamResult,
  type MockExamAttempt,
  type MockExamBlueprint,
  type MockExamCompatibilityIssue,
  type MockExamResult,
  type MockExamSession,
} from './mock-exam';

// Pure StudyData -> StudyData transforms for the Mock Exam flow. Keeping the
// state machine here (rather than inside the React view) means the exactly-once
// finalize, resume-expiry, and compatibility rules are unit-testable without a
// DOM, and the view/App layer only has to re-read canonical storage, call one of
// these, and save the whole document via the existing save-first commitData.

export type MockExamCreateInput = {
  questions: readonly ChoiceQuestion[];
  blueprint: MockExamBlueprint;
  now: Date;
  random?: () => number;
  createId: () => string;
};

// Creates a session only when there is no exam already in flight. A live session
// is never silently replaced — the caller must discard it explicitly first.
export function applyMockExamCreate(
  data: StudyData,
  input: MockExamCreateInput,
): { data: StudyData; result: CreateMockExamResult | { ok: false; reason: 'exam-in-progress' } } {
  if (data.activeMockExam) return { data, result: { ok: false, reason: 'exam-in-progress' } };
  const result = createMockExamSession(input);
  if (!result.ok) return { data, result };
  return { data: { ...data, activeMockExam: result.session }, result };
}

// Applies an in-place session mutation (answer/flag/cursor). The engine returns
// the identical reference on a no-op, so an unchanged session leaves data
// untouched and the caller can skip the save.
export function applyMockExamSessionChange(
  data: StudyData,
  change: (session: MockExamSession) => MockExamSession,
): StudyData {
  const session = data.activeMockExam;
  if (!session) return data;
  const next = change(session);
  if (next === session) return data;
  return { ...data, activeMockExam: next };
}

export function applyMockExamDiscard(data: StudyData): StudyData {
  if (!data.activeMockExam) return data;
  return { ...data, activeMockExam: null };
}

export type MockExamFinalizeOutcome =
  | { ok: true; attempt: MockExamAttempt; result: MockExamResult }
  | { ok: false; reason: 'incompatible-content'; issues: MockExamCompatibilityIssue[] }
  | { ok: false; reason: 'no-active' }
  | { ok: false; reason: 'not-due' };

export type MockExamFinalizeInput = {
  questions: readonly ChoiceQuestion[];
  mode: 'submit' | 'expire';
  now: Date;
};

// The single exactly-once completion path. Both explicit submit and automatic
// expiry funnel through here so the attempt is appended at most once (keyed by
// session id) and the active session is cleared in the same transform — there is
// no window where the attempt is saved but the active session still lingers, and
// no window where the active session is cleared without the attempt saved.
//
// On incompatible content it neither grades nor clears: the session is preserved
// so the UI can surface the mismatch and let the learner decide, never silently
// regrading against changed questions.
export function finalizeMockExam(
  data: StudyData,
  input: MockExamFinalizeInput,
): { data: StudyData; outcome: MockExamFinalizeOutcome } {
  const session = data.activeMockExam;
  if (!session) return { data, outcome: { ok: false, reason: 'no-active' } };

  const completed = input.mode === 'expire'
    ? expireMockExamIfNeeded(session, input.now)
    : submitMockExam(session, input.now);

  const graded = gradeMockExamAttempt(completed, input.questions);
  if (!graded.ok) {
    if (graded.reason === 'incompatible-content') {
      return { data, outcome: { ok: false, reason: 'incompatible-content', issues: graded.issues } };
    }
    // not-completed: expire was called before the deadline (or submit was a
    // no-op). Nothing is persisted and the session stays in progress.
    return { data, outcome: { ok: false, reason: 'not-due' } };
  }

  const alreadyStored = data.mockExamAttempts.some((attempt) => attempt.id === graded.attempt.id);
  const mockExamAttempts = alreadyStored
    ? data.mockExamAttempts
    : [...data.mockExamAttempts, graded.attempt];

  return {
    data: { ...data, activeMockExam: null, mockExamAttempts },
    outcome: { ok: true, attempt: graded.attempt, result: graded.result },
  };
}
