import type { ReviewState } from './scheduler';

export const STORAGE_KEY = 'cca-field-notes:v1';

export type QuizStat = { attempts: number; correct: number; lastAnsweredAt: string; lastCorrect: boolean };
export type StudyData = { version: 1; reviews: Record<string, ReviewState>; quizStats?: Record<string, QuizStat> };
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const emptyData = (): StudyData => ({ version: 1, reviews: {} });
const ratings = new Set(['again', 'hard', 'good']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function isQuizStat(value: unknown): value is QuizStat {
  if (!isRecord(value)) return false;
  return Number.isInteger(value.attempts) && Number(value.attempts) >= 1
    && Number.isInteger(value.correct) && Number(value.correct) >= 0 && Number(value.correct) <= Number(value.attempts)
    && typeof value.lastAnsweredAt === 'string' && Number.isFinite(Date.parse(value.lastAnsweredAt))
    && typeof value.lastCorrect === 'boolean';
}

function isReviewState(value: unknown, cardId: string): value is ReviewState {
  if (!isRecord(value)) return false;
  return value.cardId === cardId
    && Number.isInteger(value.cardRevisionSeen) && Number(value.cardRevisionSeen) > 0
    && typeof value.dueAt === 'string' && Number.isFinite(Date.parse(value.dueAt))
    && typeof value.intervalDays === 'number' && Number.isFinite(value.intervalDays) && value.intervalDays >= 0
    && Number.isInteger(value.streak) && Number(value.streak) >= 0
    && Number.isInteger(value.lapses) && Number(value.lapses) >= 0
    && typeof value.lastRating === 'string' && ratings.has(value.lastRating);
}

export function createStudyStorage(storage: StorageLike | undefined) {
  return {
    load(): StudyData {
      if (!storage) return emptyData();
      try {
        const parsed = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null');
        if (!isRecord(parsed) || parsed.version !== 1 || !isRecord(parsed.reviews)) return emptyData();
        const reviews = Object.fromEntries(
          Object.entries(parsed.reviews).filter(([cardId, review]) => isReviewState(review, cardId)),
        ) as Record<string, ReviewState>;
        if (!isRecord(parsed.quizStats)) return { version: 1, reviews };
        const quizStats = Object.fromEntries(
          Object.entries(parsed.quizStats).filter(([, stat]) => isQuizStat(stat)),
        ) as Record<string, QuizStat>;
        return { version: 1, reviews, quizStats };
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
