import type { ReviewState } from './scheduler';

export const STORAGE_KEY = 'cca-field-notes:v1';

export type QuizStat = { attempts: number; correct: number; lastAnsweredAt: string; lastCorrect: boolean };
export type StudyData = { version: 1; reviews: Record<string, ReviewState>; quizStats?: Record<string, QuizStat> };
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const emptyData = (): StudyData => ({ version: 1, reviews: {} });
const ratings = new Set(['again', 'hard', 'good']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isParsableDate = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value));

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

export function parseStudyData(value: unknown): StudyData | null {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.reviews)) return null;
  const reviews = Object.fromEntries(
    Object.entries(value.reviews).filter(([cardId, review]) => isReviewState(review, cardId)),
  ) as Record<string, ReviewState>;
  if (!isRecord(value.quizStats)) return { version: 1, reviews };
  const quizStats = Object.fromEntries(
    Object.entries(value.quizStats).filter(([, stat]) => isQuizStat(stat)),
  ) as Record<string, QuizStat>;
  return { version: 1, reviews, quizStats };
}

export type StudyDataExportDocument = StudyData & { exportedAt: string; app: 'CCA Field Notes' };

export function buildStudyDataExport(data: StudyData, exportedAt: Date): StudyDataExportDocument {
  return { exportedAt: exportedAt.toISOString(), app: 'CCA Field Notes', ...data };
}

export type ImportedStudyData = { data: StudyData; exportedAt?: string };

// Accepts both a StudyDataExportDocument and a bare StudyData document —
// the export wrapper keeps the StudyData fields at the top level.
export function parseStudyDataImport(text: string): ImportedStudyData | null {
  try {
    const parsed: unknown = JSON.parse(text);
    const data = parseStudyData(parsed);
    if (!data) return null;
    return isRecord(parsed) && isParsableDate(parsed.exportedAt) ? { data, exportedAt: parsed.exportedAt } : { data };
  } catch {
    return null;
  }
}

export function createStudyStorage(storage: StorageLike | undefined) {
  return {
    load(): StudyData {
      if (!storage) return emptyData();
      try {
        return parseStudyData(JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null')) ?? emptyData();
      } catch {
        return emptyData();
      }
    },
    save(data: StudyData) {
      if (!storage) return false;
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
      } catch {
        return false;
      }
    },
    reset() {
      if (!storage) return false;
      try {
        storage.removeItem(STORAGE_KEY);
        return true;
      } catch {
        return false;
      }
    },
  };
}
