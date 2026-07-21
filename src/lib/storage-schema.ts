import type { ReviewState } from './scheduler';

// Stored study data, versioned. v1 is what shipped releases wrote; v2 adds the
// Study Guide and Hands-on progress records. Only v2 crosses the storage
// boundary into the app — v1 is normalized here and never leaks into the UI.
export type QuizStat = { attempts: number; correct: number; lastAnsweredAt: string; lastCorrect: boolean };

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

export type HandsOnProgress =
  | { revision: number; status: 'in_progress'; completedStepIds: string[]; updatedAt: string }
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

export type StudyData = StudyDataV2;

export const CURRENT_STUDY_DATA_VERSION = 2;

export function createEmptyStudyData(): StudyData {
  return { version: 2, reviews: {}, quizStats: {}, studyGuideProgress: {}, handsOnProgress: {} };
}

const ratings = new Set(['again', 'hard', 'good']);
// JSON.parse keeps `__proto__` as an own key, and assigning it would reach
// Object.prototype instead of the accumulator. `constructor` and `prototype` are
// ordinary own keys under plain assignment, so they stay usable as content ids.
const unsafeRecordKey = '__proto__';
// Date-only strings and 2026-02-30 style impossible dates must not pass.
const isoDateTime = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isParsableDate = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value));

const isIsoDateTime = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const match = isoDateTime.exec(value);
  if (!match) return false;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  // Date.parse rolls an impossible day over (2026-02-30 becomes 2026-03-02),
  // so the calendar date has to survive a UTC round trip unchanged.
  const roundTrip = new Date(Date.UTC(year, month - 1, day));
  return roundTrip.getUTCFullYear() === year && roundTrip.getUTCMonth() === month - 1 && roundTrip.getUTCDate() === day
    && hour <= 23 && minute <= 59 && second <= 59
    && Number.isFinite(Date.parse(value));
};

function isQuizStat(value: unknown): value is QuizStat {
  if (!isRecord(value)) return false;
  return Number.isInteger(value.attempts) && Number(value.attempts) >= 1
    && Number.isInteger(value.correct) && Number(value.correct) >= 0 && Number(value.correct) <= Number(value.attempts)
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
  return Array.isArray(steps)
    && steps.every((step) => typeof step === 'string')
    && new Set(steps).size === steps.length;
}

function pickValid<T>(source: Record<string, unknown>, isValid: (value: unknown, key: string) => value is T): Record<string, T> {
  const result: Record<string, T> = {};
  for (const [key, value] of Object.entries(source)) {
    if (key === unsafeRecordKey) continue;
    if (isValid(value, key)) result[key] = value;
  }
  return result;
}

const isQuizStatEntry = (value: unknown): value is QuizStat => isQuizStat(value);

// A missing record is an empty record; a present but non-record value means the
// document is not what it claims to be, so the caller must reject it.
function readRecord(source: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const value = source[key];
  if (value === undefined) return {};
  return isRecord(value) ? value : null;
}

export function parseStudyDataV1(value: unknown): StudyDataV1 | null {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.reviews)) return null;
  const reviews = pickValid(value.reviews, isReviewState);
  if (!isRecord(value.quizStats)) return { version: 1, reviews };
  return { version: 1, reviews, quizStats: pickValid(value.quizStats, isQuizStatEntry) };
}

export function parseStudyDataV2(value: unknown): StudyDataV2 | null {
  if (!isRecord(value) || value.version !== 2) return null;
  const reviews = readRecord(value, 'reviews');
  const quizStats = readRecord(value, 'quizStats');
  const studyGuideProgress = readRecord(value, 'studyGuideProgress');
  const handsOnProgress = readRecord(value, 'handsOnProgress');
  if (!reviews || !quizStats || !studyGuideProgress || !handsOnProgress) return null;
  return {
    version: 2,
    reviews: pickValid(reviews, isReviewState),
    quizStats: pickValid(quizStats, isQuizStatEntry),
    studyGuideProgress: pickValid(studyGuideProgress, isStudyGuideProgress),
    handsOnProgress: pickValid(handsOnProgress, isHandsOnProgress),
  };
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

export type ParsedStudyData = { data: StudyData; migrated: boolean };

// The single storage boundary: anything the app receives is a validated v2.
export function parseStudyData(value: unknown): ParsedStudyData | null {
  const current = parseStudyDataV2(value);
  if (current) return { data: current, migrated: false };
  const legacy = parseStudyDataV1(value);
  if (!legacy) return null;
  const migrated = parseStudyDataV2(migrateStudyDataV1ToV2(legacy));
  return migrated ? { data: migrated, migrated: true } : null;
}
