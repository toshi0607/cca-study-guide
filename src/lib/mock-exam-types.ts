// Pure type declarations for the Mock Exam foundation (Task 8A). Types only — no
// runtime code — so importing this from the storage boundary costs nothing in the
// client bundle, while the engine (`mock-exam.ts`) and the storage validators
// (`mock-exam-storage.ts`) share exactly one definition of each shape.
//
// Scoring note: this app does not know the official CCA scaling algorithm, so no
// type here carries a pass/fail flag, a scaled score, or a readiness verdict. A
// result is the raw number of this app's own questions answered correctly — it
// does not reproduce the official exam's scaled score or its pass/fail outcome.
import type { QuestionDifficulty, SkillId } from '../content/types';

// A per-domain question count, keyed by domain id (d1..d5). Kept as an open
// string map so a future blueprint can weight domains differently without a type
// change; `validateMockExamBlueprint` is what rejects unknown domains.
export type MockExamDomainDistribution = Record<string, number>;

export type MockExamBlueprint = {
  version: number;
  questionCount: number;
  durationSeconds: number;
  domainDistribution: MockExamDomainDistribution;
};

// The three states a session can be in. `submitted` is an explicit hand-in;
// `expired` is the timer running out. They are kept distinct on purpose.
export type MockExamStatus = 'in_progress' | 'submitted' | 'expired';

// The minimum a session stores per question: its id and the content revision at
// the moment the session was created. Storing the revision (not the whole
// question) lets grading detect that the content changed underneath a session.
export type MockExamQuestionRef = {
  questionId: string;
  revision: number;
};

// A learner's in-progress selection for one question. `selectedChoiceIds` may be
// empty (a question opened and cleared); it never contains duplicates.
export type MockExamAnswer = {
  selectedChoiceIds: string[];
  answeredAt: string;
};

// The live session. `activeMockExam` in storage holds one of these. Question
// order is fixed at creation (`questionRefs`) and never re-drawn on resume.
// `submittedAt` is present only once the learner explicitly submits.
export type MockExamSession = {
  id: string;
  blueprintVersion: number;
  status: MockExamStatus;
  questionRefs: MockExamQuestionRef[];
  currentIndex: number;
  answers: Record<string, MockExamAnswer>;
  flaggedQuestionIds: string[];
  startedAt: string;
  expiresAt: string;
  updatedAt: string;
  submittedAt?: string;
};

// A graded answer inside a completed attempt. It carries the revision the
// question had when the session was created, so a later content change never
// silently rewrites what the learner actually faced. `answeredAt` is absent for
// a question that was never answered.
export type MockExamAttemptAnswer = {
  questionId: string;
  questionRevision: number;
  selectedChoiceIds: string[];
  correct: boolean;
  answeredAt?: string;
};

// The immutable record of a finished exam. Stored in `mockExamAttempts`. It is
// self-contained enough for a later wrong-answer analysis (Task 9): every
// question ref, the graded answers, and how the attempt ended.
export type MockExamAttempt = {
  id: string;
  blueprintVersion: number;
  outcome: 'submitted' | 'expired';
  questionRefs: MockExamQuestionRef[];
  answers: MockExamAttemptAnswer[];
  flaggedQuestionIds: string[];
  startedAt: string;
  expiresAt: string;
  completedAt: string;
};

// A correct/answered/total tally for one grouping key (domain, difficulty, or
// skill). `total` is how many of the exam's questions fall in the group;
// `answered` how many the learner answered; `correct` how many were right.
export type MockExamTally = {
  correct: number;
  answered: number;
  total: number;
};

// The aggregation of an attempt. Raw counts only, never a pass/fail or scaled
// score. `rawAccuracy` is `correctAnswers / totalQuestions` (the denominator is
// the full exam, so an unanswered question counts against accuracy).
export type MockExamResult = {
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  rawAccuracy: number;
  byDomain: Record<string, MockExamTally>;
  byDifficulty: Record<QuestionDifficulty, MockExamTally>;
  // A question with several skills counts toward every one of its skills, so the
  // per-skill totals can sum to more than the number of questions.
  bySkill: Partial<Record<SkillId, MockExamTally>>;
};

// The result of asking the engine to build a session. A shortage or a broken
// blueprint is a typed failure, never a thrown error, so the caller (Task 8B)
// can show "not enough questions" without a try/catch.
export type CreateMockExamResult =
  | { ok: true; session: MockExamSession }
  | { ok: false; reason: 'invalid-blueprint'; errors: string[] }
  | { ok: false; reason: 'insufficient-question-bank'; shortages: Record<string, number> };

// Why a completed session cannot be graded against the current content. Each
// issue names the question and, for a missing choice, the offending choice id.
export type MockExamCompatibilityIssue =
  | { questionId: string; kind: 'missing-question' }
  | { questionId: string; kind: 'revision-mismatch'; expectedRevision: number; actualRevision: number }
  | { questionId: string; kind: 'missing-choice'; choiceId: string };

export type MockExamCompatibility =
  | { compatible: true }
  | { compatible: false; issues: MockExamCompatibilityIssue[] };

// The result of grading. Grading refuses (does not silently regrade) when the
// content changed under the session, and refuses a session that is not finished.
export type GradeMockExamResult =
  | { ok: true; attempt: MockExamAttempt; result: MockExamResult }
  | { ok: false; reason: 'incompatible-content'; issues: MockExamCompatibilityIssue[] }
  | { ok: false; reason: 'not-completed' };

// A read-only view of how far a session has progressed, derived purely from the
// session (no content lookup). Feeds Task 8B's question palette and counters.
export type MockExamProgress = {
  total: number;
  currentIndex: number;
  answeredCount: number;
  unansweredCount: number;
  flaggedCount: number;
  answeredQuestionIds: string[];
  unansweredQuestionIds: string[];
  flaggedQuestionIds: string[];
};
