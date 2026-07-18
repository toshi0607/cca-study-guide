import { describe, expect, it } from 'vitest';
import { createStudyStorage, STORAGE_KEY } from './storage';
import { scheduleReview } from './scheduler';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    values,
  };
}

describe('study storage', () => {
  it('round-trips review state and resets it', () => {
    const memory = memoryStorage();
    const storage = createStudyStorage(memory);
    const review = scheduleReview('card', 1, 'good', undefined, new Date('2026-07-14T00:00:00Z'));
    expect(storage.save({ version: 1, reviews: { card: review } })).toBe(true);
    expect(storage.load().reviews.card).toEqual(review);
    expect(storage.reset()).toBe(true);
    expect(memory.values.has(STORAGE_KEY)).toBe(false);
    expect(storage.load()).toEqual({ version: 1, reviews: {} });
  });

  it('recovers safely from invalid JSON or an unknown version', () => {
    const memory = memoryStorage();
    memory.setItem(STORAGE_KEY, '{bad json');
    expect(createStudyStorage(memory).load()).toEqual({ version: 1, reviews: {} });
    memory.setItem(STORAGE_KEY, JSON.stringify({ version: 99, reviews: {} }));
    expect(createStudyStorage(memory).load()).toEqual({ version: 1, reviews: {} });
  });

  it('drops malformed review records instead of trusting stored data', () => {
    const memory = memoryStorage();
    const valid = scheduleReview('valid', 1, 'good', undefined, new Date('2026-07-14T00:00:00Z'));
    memory.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      reviews: {
        valid,
        wrongKey: { ...valid, cardId: 'different' },
        badDate: { ...valid, cardId: 'badDate', dueAt: 'not-a-date' },
      },
    }));
    expect(createStudyStorage(memory).load()).toEqual({ version: 1, reviews: { valid } });

    memory.setItem(STORAGE_KEY, JSON.stringify({ version: 1, reviews: null }));
    expect(createStudyStorage(memory).load()).toEqual({ version: 1, reviews: {} });
    memory.setItem(STORAGE_KEY, JSON.stringify({ version: 1, reviews: [] }));
    expect(createStudyStorage(memory).load()).toEqual({ version: 1, reviews: {} });
  });

  it('round-trips quiz stats alongside review state', () => {
    // #given
    const memory = memoryStorage();
    const storage = createStudyStorage(memory);
    const stat = { attempts: 3, correct: 2, lastAnsweredAt: '2026-07-17T10:00:00.000Z', lastCorrect: true };

    // #when
    expect(storage.save({ version: 1, reviews: {}, quizStats: { 'q-d1-loop-continue': stat } })).toBe(true);

    // #then
    expect(storage.load()).toEqual({ version: 1, reviews: {}, quizStats: { 'q-d1-loop-continue': stat } });
  });

  it('loads legacy data without quizStats unchanged', () => {
    // #given
    const memory = memoryStorage();
    const review = scheduleReview('card', 1, 'good', undefined, new Date('2026-07-14T00:00:00Z'));
    memory.setItem(STORAGE_KEY, JSON.stringify({ version: 1, reviews: { card: review } }));

    // #when / #then
    expect(createStudyStorage(memory).load()).toEqual({ version: 1, reviews: { card: review } });
  });

  it('drops malformed quiz stat entries instead of trusting stored data', () => {
    // #given
    const memory = memoryStorage();
    const valid = { attempts: 2, correct: 1, lastAnsweredAt: '2026-07-17T10:00:00.000Z', lastCorrect: false };
    memory.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      reviews: {},
      quizStats: {
        valid,
        negativeAttempts: { ...valid, attempts: -1 },
        moreCorrectThanAttempts: { ...valid, correct: 5 },
        badDate: { ...valid, lastAnsweredAt: 'not-a-date' },
        stringFlag: { ...valid, lastCorrect: 'yes' },
        notARecord: 7,
      },
    }));

    // #when / #then
    expect(createStudyStorage(memory).load()).toEqual({ version: 1, reviews: {}, quizStats: { valid } });

    memory.setItem(STORAGE_KEY, JSON.stringify({ version: 1, reviews: {}, quizStats: [] }));
    expect(createStudyStorage(memory).load()).toEqual({ version: 1, reviews: {} });
  });

  it('reports unavailable or failing persistence without throwing', () => {
    expect(createStudyStorage(undefined).save({ version: 1, reviews: {} })).toBe(false);
    expect(createStudyStorage(undefined).reset()).toBe(false);
    const failing = {
      getItem: () => null,
      setItem: () => { throw new Error('quota'); },
      removeItem: () => { throw new Error('blocked'); },
    };
    expect(createStudyStorage(failing).save({ version: 1, reviews: {} })).toBe(false);
    expect(createStudyStorage(failing).reset()).toBe(false);
  });
});
