import type { ReviewState } from './scheduler';
import {
  isIsoDateTime,
  isParsableDate,
  isRecord,
  unsafeRecordKeys,
} from './storage-primitives';
import type { MockExamAttempt, MockExamSession } from './mock-exam-types';
import { parseActiveMockExam, parseMockExamAttempts } from './mock-exam-storage';

// Re-exported so `storage.ts` keeps importing these guards from one place.
export { isParsableDate, isRecord } from './storage-primitives';

// Stored study data, versioned. v1 is what shipped releases wrote; v2 added the
// Study Guide and Hands-on progress records; v3 adds the Mock Exam active session
// and completed-attempt history. Only the current version crosses the storage
// boundary into the app — older versions are migrated here and never leak into
// the UI.
// Self-reported certainty attached to an answer. Optional at every level: the
// learner may skip it, and every release before this field existed wrote answers
// without it.
export type QuizConfidence = 'sure' | 'unsure' | 'guess';

// `attempts`/`correct`/`lastAnsweredAt`/`lastCorrect` are the original v1 shape.
//
// The three optional fields are backward-compatible additions (no version bump,
// no migration), each recording something the plain right/wrong tally could not
// distinguish:
//   * `partial` — answers that picked a non-empty subset of the correct choices
//     and nothing incorrect. Set equality alone filed "one of two correct choices
//     selected" and "two wrong choices selected" as the same non-correct answer.
//   * `lastConfidence` / `guessedCorrect` — a correct answer the learner was sure
//     of and one they guessed counted identically, so a topic understood and a
//     topic gotten lucky on looked the same in the record.
// None of these is a score or a readiness signal; they are the learner's own
// report and the shape of their selection, kept so review can be aimed better.
export type QuizStat = {
  attempts: number;
  correct: number;
  lastAnsweredAt: string;
  lastCorrect: boolean;
  partial?: number;
  lastConfidence?: QuizConfidence;
  guessedCorrect?: number;
};

export type StudyDataV1 = {
  version: 1;
  reviews: Record<string, ReviewState>;
  quizStats?: Record<string, QuizStat>;
};

// `not_started` is the absence of a record, so an untouched section costs nothing.
// `completedAt` exists exactly when the status is `completed`, which the runtime
// validation enforces in both directions.
export type StudyGuideProgress =
  | { revision: number; status: 'in_progress'; updatedAt: string }
  | { revision: number; status: 'completed'; updatedAt: string; completedAt: string };

// `previousCompletedAt` is an optional, backward-compatible v2 field (no version
// bump, no migration): it rides along on an `in_progress` record so that a guide
// which was completed at an older revision keeps its original completion time
// after the learner reconfirms it. Records written before this field existed —
// and every `completed` record — simply omit it.
export type HandsOnProgress =
  | { revision: number; status: 'in_progress'; completedStepIds: string[]; updatedAt: string; previousCompletedAt?: string }
  | { revision: number; status: 'completed'; completedStepIds: string[]; updatedAt: string; completedAt: string };

export type StudyDataV2 = {
  version: 2;
  reviews: Record<string, ReviewState>;
  quizStats: Record<string, QuizStat>;
  // Keyed by StudyGuideSection.id and HandsOnGuide.id. The ids stay open
  // strings so shipping new content never changes the stored schema.
  studyGuideProgress: Record<string, StudyGuideProgress>;
  handsOnProgress: Record<string, HandsOnProgress>;
};

// v3 adds the Mock Exam foundation: at most one live session, and the immutable
// history of completed attempts. `activeMockExam` is `null` when no exam is in
// flight; `mockExamAttempts` is `[]` when none has finished. The whole Mock Exam
// schema lives behind `mock-exam-storage`, so the parser here only wires it in.
export type StudyDataV3 = {
  version: 3;
  reviews: Record<string, ReviewState>;
  quizStats: Record<string, QuizStat>;
  studyGuideProgress: Record<string, StudyGuideProgress>;
  handsOnProgress: Record<string, HandsOnProgress>;
  activeMockExam: MockExamSession | null;
  mockExamAttempts: MockExamAttempt[];
};

export type StudyData = StudyDataV3;

export const CURRENT_STUDY_DATA_VERSION = 3;

export function createEmptyStudyData(): StudyData {
  return {
    version: 3,
    reviews: {},
    quizStats: {},
    studyGuideProgress: {},
    handsOnProgress: {},
    activeMockExam: null,
    mockExamAttempts: [],
  };
}

const ratings = new Set(['again', 'hard', 'good']);
const confidences = new Set<string>(['sure', 'unsure', 'guess']);

// Optional counters are bounded by `attempts` rather than by a tighter derived
// invariant (`partial <= attempts - correct`, `guessedCorrect <= correct`). Those
// tighter rules hold for anything this app writes, but a v3 document failing one
// entry rejects the WHOLE document and the caller then refuses to overwrite it —
// so a stricter check trades a real risk of stranding a learner's history for no
// protection this loose one does not already give.
function isOptionalCount(value: unknown, attempts: number): boolean {
  if (value === undefined) return true;
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= attempts;
}

function isQuizStat(value: unknown): value is QuizStat {
  if (!isRecord(value)) return false;
  if (!Number.isInteger(value.attempts) || Number(value.attempts) < 1) return false;
  const attempts = Number(value.attempts);
  if (!isOptionalCount(value.partial, attempts) || !isOptionalCount(value.guessedCorrect, attempts)) return false;
  if (value.lastConfidence !== undefined && !(typeof value.lastConfidence === 'string' && confidences.has(value.lastConfidence))) return false;
  return Number.isInteger(value.correct) && Number(value.correct) >= 0 && Number(value.correct) <= attempts
    && isParsableDate(value.lastAnsweredAt)
    && typeof value.lastCorrect === 'boolean';
}

function isReviewState(value: unknown, cardId: string): value is ReviewState {
  if (!isRecord(value)) return false;
  return value.cardId === cardId
    && Number.isInteger(value.cardRevisionSeen) && Number(value.cardRevisionSeen) > 0
    && isParsableDate(value.dueAt)
    && typeof value.intervalDays === 'number' && Number.isFinite(value.intervalDays) && value.intervalDays >= 0
    && Number.isInteger(value.streak) && Number(value.streak) >= 0
    && Number.isInteger(value.lapses) && Number(value.lapses) >= 0
    && typeof value.lastRating === 'string' && ratings.has(value.lastRating);
}

function hasValidProgressCore(value: Record<string, unknown>): boolean {
  if (!Number.isInteger(value.revision) || Number(value.revision) < 1) return false;
  if (!isIsoDateTime(value.updatedAt)) return false;
  if (value.status === 'in_progress') return value.completedAt === undefined;
  if (value.status !== 'completed') return false;
  return isIsoDateTime(value.completedAt) && Date.parse(value.completedAt) <= Date.parse(value.updatedAt);
}

function isStudyGuideProgress(value: unknown): value is StudyGuideProgress {
  return isRecord(value) && hasValidProgressCore(value);
}

function isHandsOnProgress(value: unknown): value is HandsOnProgress {
  if (!isRecord(value) || !hasValidProgressCore(value)) return false;
  const steps = value.completedStepIds;
  if (!Array.isArray(steps) || !steps.every((step) => typeof step === 'string') || new Set(steps).size !== steps.length) return false;
  // Optional prior-completion time: only on an in_progress record, a real
  // datetime, and no later than when the record was last written.
  if (value.previousCompletedAt !== undefined) {
    const prev = value.previousCompletedAt;
    const updated = value.updatedAt;
    if (value.status !== 'in_progress' || !isIsoDateTime(prev) || !isIsoDateTime(updated)) return false;
    if (Date.parse(prev) > Date.parse(updated)) return false;
  }
  return true;
}

// v1 only: releases before v2 stored data this validator never saw, so a single
// broken entry salvages the rest instead of discarding a learner's history. The
// v1 key is never rewritten, so nothing dropped here becomes unrecoverable.
function salvageValid<T>(source: Record<string, unknown>, isValid: (value: unknown, key: string) => value is T): Record<string, T> {
  const result: Record<string, T> = {};
  for (const [key, value] of Object.entries(source)) {
    if (unsafeRecordKeys.has(key)) continue;
    if (isValid(value, key)) result[key] = value;
  }
  return result;
}

// v2: every entry must validate. Dropping one and writing the rest back would
// destroy data this build simply failed to understand, so the whole document is
// rejected instead and the caller refuses to overwrite it.
function strictRecord<T>(source: unknown, isValid: (value: unknown, key: string) => value is T): Record<string, T> | null {
  if (!isRecord(source)) return null;
  const result: Record<string, T> = {};
  for (const [key, value] of Object.entries(source)) {
    if (unsafeRecordKeys.has(key) || !isValid(value, key)) return null;
    result[key] = value;
  }
  return result;
}

const isQuizStatEntry = (value: unknown): value is QuizStat => isQuizStat(value);

// `quizStats` stayed optional through every v1 release, and a v1 document that
// carries something else there still has reviews worth keeping — rejecting it
// would lose more than ignoring the field does.
export function parseStudyDataV1(value: unknown): StudyDataV1 | null {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.reviews)) return null;
  const reviews = salvageValid(value.reviews, isReviewState);
  if (!isRecord(value.quizStats)) return { version: 1, reviews };
  return { version: 1, reviews, quizStats: salvageValid(value.quizStats, isQuizStatEntry) };
}

// Strict: all four records are required and every entry must validate. Anything
// else is a document this build cannot represent, and the caller must leave it
// alone rather than store a pruned version of it.
export function parseStudyDataV2(value: unknown): StudyDataV2 | null {
  if (!isRecord(value) || value.version !== 2) return null;
  const reviews = strictRecord(value.reviews, isReviewState);
  const quizStats = strictRecord(value.quizStats, isQuizStatEntry);
  const studyGuideProgress = strictRecord(value.studyGuideProgress, isStudyGuideProgress);
  const handsOnProgress = strictRecord(value.handsOnProgress, isHandsOnProgress);
  if (!reviews || !quizStats || !studyGuideProgress || !handsOnProgress) return null;
  return { version: 2, reviews, quizStats, studyGuideProgress, handsOnProgress };
}

// Strict: every v2 record plus the two Mock Exam fields. `activeMockExam` must be
// present and either null or a valid session; `mockExamAttempts` must be an array
// of valid attempts. A single malformed Mock Exam entry rejects the whole
// document rather than quietly discarding a session or a finished attempt.
export function parseStudyDataV3(value: unknown): StudyDataV3 | null {
  if (!isRecord(value) || value.version !== 3) return null;
  const reviews = strictRecord(value.reviews, isReviewState);
  const quizStats = strictRecord(value.quizStats, isQuizStatEntry);
  const studyGuideProgress = strictRecord(value.studyGuideProgress, isStudyGuideProgress);
  const handsOnProgress = strictRecord(value.handsOnProgress, isHandsOnProgress);
  if (!reviews || !quizStats || !studyGuideProgress || !handsOnProgress) return null;

  if (!('activeMockExam' in value) || !('mockExamAttempts' in value)) return null;
  const activeMockExam = parseActiveMockExam(value.activeMockExam);
  if (activeMockExam === undefined) return null; // undefined means the value was invalid
  const mockExamAttempts = parseMockExamAttempts(value.mockExamAttempts);
  if (!mockExamAttempts) return null;

  return { version: 3, reviews, quizStats, studyGuideProgress, handsOnProgress, activeMockExam, mockExamAttempts };
}

// Pure: no clock, no randomness, no content lookup. v1 carries no Study Guide or
// Hands-on progress, so those start empty rather than being guessed.
export function migrateStudyDataV1ToV2(input: StudyDataV1): StudyDataV2 {
  return {
    version: 2,
    reviews: { ...input.reviews },
    quizStats: { ...input.quizStats },
    studyGuideProgress: {},
    handsOnProgress: {},
  };
}

// v2 carries no Mock Exam state, so an active session is absent and the attempt
// history is empty. Every existing record is preserved untouched.
export function migrateStudyDataV2ToV3(input: StudyDataV2): StudyDataV3 {
  return {
    version: 3,
    reviews: { ...input.reviews },
    quizStats: { ...input.quizStats },
    studyGuideProgress: { ...input.studyGuideProgress },
    handsOnProgress: { ...input.handsOnProgress },
    activeMockExam: null,
    mockExamAttempts: [],
  };
}

export type ParsedStudyData = { data: StudyData; migrated: boolean };

// The single storage boundary: anything the app receives is a validated current
// version. A v2 or v1 document is migrated up to v3 in memory; the legacy v1
// path (v1 -> v2 -> v3) still reaches the latest version.
export function parseStudyData(value: unknown): ParsedStudyData | null {
  const current = parseStudyDataV3(value);
  if (current) return { data: current, migrated: false };

  const v2 = parseStudyDataV2(value);
  if (v2) {
    const migrated = parseStudyDataV3(migrateStudyDataV2ToV3(v2));
    return migrated ? { data: migrated, migrated: true } : null;
  }

  const legacy = parseStudyDataV1(value);
  if (!legacy) return null;
  const migrated = parseStudyDataV3(migrateStudyDataV2ToV3(migrateStudyDataV1ToV2(legacy)));
  return migrated ? { data: migrated, migrated: true } : null;
}
