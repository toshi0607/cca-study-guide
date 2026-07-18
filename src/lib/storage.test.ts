import { describe, expect, it } from 'vitest';
import { buildStudyDataExport, createStudyStorage, parseStudyDataImport, STORAGE_KEY } from './storage';
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

  it('parses a bare StudyData document for import', () => {
    // #given
    const review = scheduleReview('card', 1, 'good', undefined, new Date('2026-07-14T00:00:00Z'));
    const stat = { attempts: 1, correct: 1, lastAnsweredAt: '2026-07-17T10:00:00.000Z', lastCorrect: true };

    // #when
    const imported = parseStudyDataImport(JSON.stringify({ version: 1, reviews: { card: review }, quizStats: { question: stat } }));

    // #then
    expect(imported).toEqual({ data: { version: 1, reviews: { card: review }, quizStats: { question: stat } } });
  });

  it('parses the export wrapper format and surfaces its export timestamp', () => {
    // #given
    const review = scheduleReview('card', 1, 'good', undefined, new Date('2026-07-14T00:00:00Z'));
    const wrapper = { exportedAt: '2026-07-17T10:00:00.000Z', app: 'CCA Field Notes', version: 1, reviews: { card: review } };

    // #when
    const imported = parseStudyDataImport(JSON.stringify(wrapper));

    // #then
    expect(imported).toEqual({ data: { version: 1, reviews: { card: review } }, exportedAt: '2026-07-17T10:00:00.000Z' });
  });

  it('round-trips a document built by buildStudyDataExport', () => {
    // #given — the same builder exportData uses, so export/import cannot drift
    const review = scheduleReview('card', 1, 'good', undefined, new Date('2026-07-14T00:00:00Z'));
    const data = { version: 1 as const, reviews: { card: review } };

    // #when
    const imported = parseStudyDataImport(JSON.stringify(buildStudyDataExport(data, new Date('2026-07-17T10:00:00Z'))));

    // #then
    expect(imported).toEqual({ data, exportedAt: '2026-07-17T10:00:00.000Z' });
  });

  it('rejects broken JSON and unrecognized document shapes', () => {
    // #given / #when / #then
    expect(parseStudyDataImport('{bad json')).toBeNull();
    expect(parseStudyDataImport('null')).toBeNull();
    expect(parseStudyDataImport('[]')).toBeNull();
    expect(parseStudyDataImport(JSON.stringify({ version: 99, reviews: {} }))).toBeNull();
    expect(parseStudyDataImport(JSON.stringify({ version: 1, reviews: null }))).toBeNull();
  });

  it('drops malformed entries from an import while keeping valid ones, like load does', () => {
    // #given
    const valid = scheduleReview('valid', 1, 'good', undefined, new Date('2026-07-14T00:00:00Z'));
    const stat = { attempts: 2, correct: 1, lastAnsweredAt: '2026-07-17T10:00:00.000Z', lastCorrect: false };
    const document = {
      exportedAt: 'not-a-date',
      version: 1,
      reviews: {
        valid,
        wrongKey: { ...valid, cardId: 'different' },
        badDate: { ...valid, cardId: 'badDate', dueAt: 'not-a-date' },
      },
      quizStats: { stat, negativeAttempts: { ...stat, attempts: -1 } },
    };

    // #when
    const imported = parseStudyDataImport(JSON.stringify(document));

    // #then — invalid entries and the unparsable timestamp are discarded
    expect(imported).toEqual({ data: { version: 1, reviews: { valid }, quizStats: { stat } } });
  });

  it('keeps imported entries whose ids are unknown to the current content, like load does', () => {
    // #given — an id that no shipped card uses
    const review = scheduleReview('card-from-a-future-release', 1, 'good', undefined, new Date('2026-07-14T00:00:00Z'));

    // #when
    const imported = parseStudyDataImport(JSON.stringify({ version: 1, reviews: { 'card-from-a-future-release': review } }));

    // #then
    expect(imported?.data.reviews['card-from-a-future-release']).toEqual(review);
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
