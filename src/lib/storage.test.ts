import { describe, expect, it } from 'vitest';
import { scheduleReview } from './scheduler';
import {
  buildStudyDataExport,
  createEmptyStudyData,
  createStudyStorage,
  LEGACY_STORAGE_KEY,
  parseStudyDataImport,
  STORAGE_KEY,
  type StudyData,
} from './storage';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    values,
  };
}

const review = (cardId = 'card') => scheduleReview(cardId, 1, 'good', undefined, new Date('2026-07-14T00:00:00Z'));
const stat = { attempts: 3, correct: 2, lastAnsweredAt: '2026-07-17T10:00:00.000Z', lastCorrect: true };
const withProgress = (data: StudyData): StudyData => ({
  ...data,
  studyGuideProgress: { 'sg-exam-overview': { revision: 1, status: 'in_progress', updatedAt: '2026-07-20T09:00:00.000Z' } },
  handsOnProgress: { 'ho-first-agent': { revision: 1, status: 'in_progress', completedStepIds: ['step-1'], updatedAt: '2026-07-20T09:00:00.000Z' } },
});

describe('study storage', () => {
  it('round-trips current-version data and resets it', () => {
    // #given
    const memory = memoryStorage();
    const storage = createStudyStorage(memory);
    const data = withProgress({ ...createEmptyStudyData(), reviews: { card: review() }, quizStats: { question: stat } });

    // #when / #then
    expect(storage.save(data)).toBe(true);
    expect(storage.load()).toEqual(data);
    expect(storage.reset()).toBe(true);
    expect(memory.values.has(STORAGE_KEY)).toBe(false);
    expect(storage.load()).toEqual(createEmptyStudyData());
  });

  it('stores version 2 documents', () => {
    // #given
    const memory = memoryStorage();

    // #when
    createStudyStorage(memory).save(createEmptyStudyData());

    // #then
    expect(JSON.parse(memory.values.get(STORAGE_KEY)!)).toEqual(createEmptyStudyData());
  });

  it('does not mutate the data it is asked to save', () => {
    // #given
    const memory = memoryStorage();
    const data = withProgress({ ...createEmptyStudyData(), reviews: { card: review() } });
    const snapshot = structuredClone(data);

    // #when
    createStudyStorage(memory).save(data);

    // #then
    expect(data).toEqual(snapshot);
  });

  it('returns empty data when nothing is stored', () => {
    // #given / #when / #then
    expect(createStudyStorage(memoryStorage()).load()).toEqual(createEmptyStudyData());
  });

  it('migrates a legacy v1 document into the current key', () => {
    // #given
    const memory = memoryStorage();
    memory.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ version: 1, reviews: { card: review() }, quizStats: { question: stat } }));

    // #when
    const loaded = createStudyStorage(memory).load();

    // #then
    expect(loaded).toEqual({ ...createEmptyStudyData(), reviews: { card: review() }, quizStats: { question: stat } });
    expect(JSON.parse(memory.values.get(STORAGE_KEY)!)).toEqual(loaded);
  });

  it('keeps the legacy key after a successful migration', () => {
    // #given
    const memory = memoryStorage();
    const legacy = JSON.stringify({ version: 1, reviews: { card: review() } });
    memory.setItem(LEGACY_STORAGE_KEY, legacy);

    // #when
    createStudyStorage(memory).load();

    // #then
    expect(memory.values.get(LEGACY_STORAGE_KEY)).toBe(legacy);
  });

  it('keeps the legacy key when persisting the migration fails', () => {
    // #given — a store that refuses writes, as a full or blocked store would
    const values = new Map<string, string>([[LEGACY_STORAGE_KEY, JSON.stringify({ version: 1, reviews: { card: review() } })]]);
    const failing = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: () => { throw new Error('quota'); },
      removeItem: (key: string) => values.delete(key),
    };

    // #when
    const loaded = createStudyStorage(failing).load();

    // #then — the caller still sees its data and the legacy copy survives
    expect(loaded.reviews.card).toEqual(review());
    expect(values.has(LEGACY_STORAGE_KEY)).toBe(true);
  });

  it('prefers the current key over the legacy key', () => {
    // #given
    const memory = memoryStorage();
    memory.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ version: 1, reviews: { legacy: review('legacy') } }));
    memory.setItem(STORAGE_KEY, JSON.stringify({ ...createEmptyStudyData(), reviews: { current: review('current') } }));

    // #when / #then
    expect(Object.keys(createStudyStorage(memory).load().reviews)).toEqual(['current']);
  });

  it('recovers safely from invalid JSON or an unknown version without overwriting it', () => {
    // #given
    const memory = memoryStorage();

    // #when / #then
    memory.setItem(STORAGE_KEY, '{bad json');
    expect(createStudyStorage(memory).load()).toEqual(createEmptyStudyData());
    expect(memory.values.get(STORAGE_KEY)).toBe('{bad json');

    const future = JSON.stringify({ version: 3, reviews: {} });
    memory.setItem(STORAGE_KEY, future);
    expect(createStudyStorage(memory).load()).toEqual(createEmptyStudyData());
    expect(memory.values.get(STORAGE_KEY)).toBe(future);
  });

  it('refuses to save over a document it could not read', () => {
    // #given — a document written by a newer release, as a deploy rollback would leave
    const memory = memoryStorage();
    const future = JSON.stringify({ version: 3, reviews: { card: review() } });
    memory.setItem(STORAGE_KEY, future);
    const storage = createStudyStorage(memory);

    // #when — the app loads empty data and then tries to persist a rating
    const loaded = storage.load();

    // #then — the write is reported as failed and the newer document survives
    expect(loaded).toEqual(createEmptyStudyData());
    expect(storage.save({ ...loaded, reviews: { card: review() } })).toBe(false);
    expect(memory.values.get(STORAGE_KEY)).toBe(future);
  });

  it('refuses to save over a corrupt document instead of replacing it', () => {
    // #given
    const memory = memoryStorage();
    memory.setItem(STORAGE_KEY, '{bad json');
    const storage = createStudyStorage(memory);

    // #when / #then
    expect(storage.save(storage.load())).toBe(false);
    expect(memory.values.get(STORAGE_KEY)).toBe('{bad json');
  });

  it('drops entries that would not survive a reload instead of storing them', () => {
    // #given — a review whose revision is out of range, as tampering would produce
    const memory = memoryStorage();
    const broken = { ...createEmptyStudyData(), reviews: { bad: { ...review('bad'), cardRevisionSeen: 0 } } };

    // #when
    expect(createStudyStorage(memory).save(broken)).toBe(true);

    // #then — what was stored is exactly what the next load returns
    expect(JSON.parse(memory.values.get(STORAGE_KEY)!)).toEqual(createEmptyStudyData());
  });

  it('does not migrate an unknown version stored under the legacy key', () => {
    // #given
    const memory = memoryStorage();
    memory.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ version: 99, reviews: { card: review() } }));

    // #when / #then
    expect(createStudyStorage(memory).load()).toEqual(createEmptyStudyData());
    expect(memory.values.has(STORAGE_KEY)).toBe(false);
  });

  it('survives a localStorage getter that throws', () => {
    // #given — Safari private mode style failures
    const throwingGetter = {
      getItem: () => { throw new DOMException('denied', 'SecurityError'); },
      setItem: () => undefined,
      removeItem: () => undefined,
    };

    // #when / #then
    expect(createStudyStorage(throwingGetter).load()).toEqual(createEmptyStudyData());
  });

  it('drops malformed review records instead of trusting stored data', () => {
    // #given
    const memory = memoryStorage();
    const valid = review('valid');
    memory.setItem(STORAGE_KEY, JSON.stringify({
      ...createEmptyStudyData(),
      reviews: {
        valid,
        wrongKey: { ...valid, cardId: 'different' },
        badDate: { ...valid, cardId: 'badDate', dueAt: 'not-a-date' },
      },
    }));

    // #when / #then
    expect(createStudyStorage(memory).load()).toEqual({ ...createEmptyStudyData(), reviews: { valid } });
  });

  it('drops malformed quiz stat entries instead of trusting stored data', () => {
    // #given
    const memory = memoryStorage();
    memory.setItem(STORAGE_KEY, JSON.stringify({
      ...createEmptyStudyData(),
      quizStats: {
        valid: stat,
        negativeAttempts: { ...stat, attempts: -1 },
        moreCorrectThanAttempts: { ...stat, correct: 5 },
        badDate: { ...stat, lastAnsweredAt: 'not-a-date' },
        stringFlag: { ...stat, lastCorrect: 'yes' },
        notARecord: 7,
      },
    }));

    // #when / #then
    expect(createStudyStorage(memory).load()).toEqual({ ...createEmptyStudyData(), quizStats: { valid: stat } });
  });

  it('loads a legacy document without quizStats as empty quiz stats', () => {
    // #given
    const memory = memoryStorage();
    memory.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ version: 1, reviews: { card: review() } }));

    // #when / #then
    expect(createStudyStorage(memory).load()).toEqual({ ...createEmptyStudyData(), reviews: { card: review() } });
  });

  it('refuses to store a document of an unknown version', () => {
    // #given — a document whose version was tampered with at runtime
    const memory = memoryStorage();
    const broken = { ...createEmptyStudyData(), version: 3 } as unknown as StudyData;

    // #when / #then
    expect(createStudyStorage(memory).save(broken)).toBe(false);
    expect(memory.values.has(STORAGE_KEY)).toBe(false);
  });

  it('clears both storage generations on an explicit reset', () => {
    // #given
    const memory = memoryStorage();
    memory.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ version: 1, reviews: { card: review() } }));
    const storage = createStudyStorage(memory);
    storage.load();

    // #when
    expect(storage.reset()).toBe(true);

    // #then — nothing is left for the next load to migrate back
    expect(memory.values.has(STORAGE_KEY)).toBe(false);
    expect(memory.values.has(LEGACY_STORAGE_KEY)).toBe(false);
    expect(storage.load()).toEqual(createEmptyStudyData());
  });

  it('reports unavailable or failing persistence without throwing', () => {
    // #given
    const failing = {
      getItem: () => null,
      setItem: () => { throw new Error('quota'); },
      removeItem: () => { throw new Error('blocked'); },
    };

    // #when / #then
    expect(createStudyStorage(undefined).save(createEmptyStudyData())).toBe(false);
    expect(createStudyStorage(undefined).reset()).toBe(false);
    expect(createStudyStorage(undefined).load()).toEqual(createEmptyStudyData());
    expect(createStudyStorage(failing).save(createEmptyStudyData())).toBe(false);
    expect(createStudyStorage(failing).reset()).toBe(false);
  });
});

describe('study data import and export', () => {
  it('exports the current version with every progress record', () => {
    // #given
    const data = withProgress({ ...createEmptyStudyData(), reviews: { card: review() }, quizStats: { question: stat } });

    // #when
    const document = buildStudyDataExport(data, new Date('2026-07-17T10:00:00Z'));

    // #then
    expect(document).toEqual({ exportedAt: '2026-07-17T10:00:00.000Z', app: 'CCA Field Notes', ...data });
  });

  it('round-trips a document built by buildStudyDataExport', () => {
    // #given — the same builder exportData uses, so export/import cannot drift
    const data = withProgress({ ...createEmptyStudyData(), reviews: { card: review() }, quizStats: { question: stat } });

    // #when
    const imported = parseStudyDataImport(JSON.stringify(buildStudyDataExport(data, new Date('2026-07-17T10:00:00Z'))));

    // #then
    expect(imported).toEqual({ data, migrated: false, exportedAt: '2026-07-17T10:00:00.000Z' });
  });

  it('migrates a legacy v1 import to the current version', () => {
    // #given
    const document = { version: 1, reviews: { card: review() }, quizStats: { question: stat } };

    // #when
    const imported = parseStudyDataImport(JSON.stringify(document));

    // #then
    expect(imported).toEqual({
      data: { ...createEmptyStudyData(), reviews: { card: review() }, quizStats: { question: stat } },
      migrated: true,
    });
  });

  it('parses the export wrapper format and surfaces its export timestamp', () => {
    // #given
    const wrapper = { exportedAt: '2026-07-17T10:00:00.000Z', app: 'CCA Field Notes', version: 1, reviews: { card: review() } };

    // #when
    const imported = parseStudyDataImport(JSON.stringify(wrapper));

    // #then
    expect(imported?.exportedAt).toBe('2026-07-17T10:00:00.000Z');
  });

  it('rejects broken JSON and unrecognized document shapes', () => {
    // #given / #when / #then
    expect(parseStudyDataImport('{bad json')).toBeNull();
    expect(parseStudyDataImport('null')).toBeNull();
    expect(parseStudyDataImport('[]')).toBeNull();
    expect(parseStudyDataImport(JSON.stringify({ version: 99, reviews: {} }))).toBeNull();
    expect(parseStudyDataImport(JSON.stringify({ version: 1, reviews: null }))).toBeNull();
  });

  it('leaves stored data untouched when an import is rejected', () => {
    // #given
    const memory = memoryStorage();
    const storage = createStudyStorage(memory);
    const data = { ...createEmptyStudyData(), reviews: { card: review() } };
    storage.save(data);

    // #when — the app only writes what parseStudyDataImport accepted
    const imported = parseStudyDataImport('{bad json');

    // #then
    expect(imported).toBeNull();
    expect(storage.load()).toEqual(data);
  });

  it('drops malformed entries from an import while keeping valid ones, like load does', () => {
    // #given
    const valid = review('valid');
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
    expect(imported).toEqual({ data: { ...createEmptyStudyData(), reviews: { valid }, quizStats: { stat } }, migrated: true });
  });

  it('keeps imported entries whose ids are unknown to the current content, like load does', () => {
    // #given — an id that no shipped card uses
    const future = review('card-from-a-future-release');

    // #when
    const imported = parseStudyDataImport(JSON.stringify({ version: 1, reviews: { 'card-from-a-future-release': future } }));

    // #then
    expect(imported?.data.reviews['card-from-a-future-release']).toEqual(future);
  });

  it('does not let an import reach Object.prototype', () => {
    // #given — JSON.parse keeps __proto__ as an own property, unlike an object literal
    const document = `{"version":2,"reviews":{},"quizStats":{},"handsOnProgress":{},"studyGuideProgress":{"__proto__":{"polluted":true}}}`;

    // #when
    const imported = parseStudyDataImport(document);

    // #then
    expect(imported?.data.studyGuideProgress).toEqual({});
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty('polluted');
  });
});
