import { describe, expect, it } from 'vitest';
import { scheduleReview } from './scheduler';
import {
  createEmptyStudyData,
  migrateStudyDataV1ToV2,
  migrateStudyDataV2ToV3,
  parseStudyData,
  parseStudyDataV1,
  parseStudyDataV2,
  parseStudyDataV3,
  type HandsOnProgress,
  type QuizStat,
  type StudyDataV1,
  type StudyDataV2,
  type StudyGuideProgress,
} from './storage-schema';

const review = (cardId: string) => scheduleReview(cardId, 1, 'good', undefined, new Date('2026-07-14T00:00:00Z'));
const stat = (overrides: Partial<QuizStat> = {}): QuizStat =>
  ({ attempts: 2, correct: 1, lastAnsweredAt: '2026-07-17T10:00:00.000Z', lastCorrect: false, ...overrides });

const guideProgress = (overrides: Partial<StudyGuideProgress> = {}): StudyGuideProgress =>
  ({ revision: 1, status: 'in_progress', updatedAt: '2026-07-20T09:00:00.000Z', ...overrides } as StudyGuideProgress);

const handsOnProgress = (overrides: Partial<HandsOnProgress> = {}): HandsOnProgress =>
  ({ revision: 1, status: 'in_progress', completedStepIds: ['step-1'], updatedAt: '2026-07-20T09:00:00.000Z', ...overrides } as HandsOnProgress);

// An explicit empty v2 document. The current-version helper (createEmptyStudyData)
// now returns v3, so the v2-specific tests build their fixtures from this instead.
const emptyV2 = (): StudyDataV2 => ({ version: 2, reviews: {}, quizStats: {}, studyGuideProgress: {}, handsOnProgress: {} });

const validV1 = (overrides: Partial<StudyDataV1> = {}): StudyDataV1 =>
  ({ version: 1, reviews: { card: review('card') }, quizStats: { question: stat() }, ...overrides });

const validV2 = (overrides: Partial<StudyDataV2> = {}): StudyDataV2 =>
  ({ ...emptyV2(), reviews: { card: review('card') }, quizStats: { question: stat() }, ...overrides });

describe('createEmptyStudyData', () => {
  it('returns a complete current-version document', () => {
    // #given / #when / #then
    expect(createEmptyStudyData()).toEqual({ version: 3, reviews: {}, quizStats: {}, studyGuideProgress: {}, handsOnProgress: {}, activeMockExam: null, mockExamAttempts: [] });
  });

  it('returns independent records on every call', () => {
    // #given
    const first = createEmptyStudyData();
    const second = createEmptyStudyData();

    // #when
    first.reviews.card = review('card');
    first.studyGuideProgress.section = guideProgress();
    first.handsOnProgress.guide = handsOnProgress();
    first.quizStats.question = stat();

    // #then
    expect(second).toEqual({ version: 3, reviews: {}, quizStats: {}, studyGuideProgress: {}, handsOnProgress: {}, activeMockExam: null, mockExamAttempts: [] });
  });
});

describe('parseStudyDataV1', () => {
  it('accepts a well-formed v1 document', () => {
    // #given / #when / #then
    expect(parseStudyDataV1(validV1())).toEqual(validV1());
  });

  it('rejects a document without a version', () => {
    // #given / #when / #then
    expect(parseStudyDataV1({ reviews: {} })).toBeNull();
  });

  it('does not accept a v2 document as v1', () => {
    // #given / #when / #then
    expect(parseStudyDataV1(validV2())).toBeNull();
  });

  it('rejects a document whose reviews are not a record', () => {
    // #given / #when / #then
    expect(parseStudyDataV1({ version: 1, reviews: [] })).toBeNull();
    expect(parseStudyDataV1({ version: 1, reviews: null })).toBeNull();
  });

  it('drops malformed quiz stats instead of trusting them', () => {
    // #given
    const document = { version: 1, reviews: {}, quizStats: { valid: stat(), broken: stat({ attempts: -1 }) } };

    // #when / #then
    expect(parseStudyDataV1(document)).toEqual({ version: 1, reviews: {}, quizStats: { valid: stat() } });
  });
});

describe('migrateStudyDataV1ToV2', () => {
  it('carries every review across unchanged', () => {
    // #given
    const input = validV1({ reviews: { a: review('a'), b: review('b') } });

    // #when / #then
    expect(migrateStudyDataV1ToV2(input).reviews).toEqual({ a: review('a'), b: review('b') });
  });

  it('carries every quiz stat across unchanged', () => {
    // #given
    const input = validV1({ quizStats: { one: stat(), two: stat({ attempts: 5, correct: 5 }) } });

    // #when / #then
    expect(migrateStudyDataV1ToV2(input).quizStats).toEqual({ one: stat(), two: stat({ attempts: 5, correct: 5 }) });
  });

  it('normalizes absent quiz stats to an empty record', () => {
    // #given / #when / #then
    expect(migrateStudyDataV1ToV2({ version: 1, reviews: {} }).quizStats).toEqual({});
  });

  it('starts the new progress records empty instead of guessing values', () => {
    // #given / #when
    const migrated = migrateStudyDataV1ToV2(validV1());

    // #then
    expect(migrated).toEqual({ ...validV1(), version: 2, studyGuideProgress: {}, handsOnProgress: {} });
  });

  it('does not mutate its input', () => {
    // #given
    const input = validV1();
    const snapshot = structuredClone(input);

    // #when
    migrateStudyDataV1ToV2(input).reviews.injected = review('injected');

    // #then
    expect(input).toEqual(snapshot);
  });

  it('is deterministic and idempotent for the same input', () => {
    // #given
    const input = validV1();

    // #when
    const first = migrateStudyDataV1ToV2(input);
    const second = migrateStudyDataV1ToV2(parseStudyDataV1(input)!);

    // #then
    expect(first).toEqual(second);
  });

  it('produces a document that passes v2 validation', () => {
    // #given / #when / #then
    expect(parseStudyDataV2(migrateStudyDataV1ToV2(validV1()))).toEqual(migrateStudyDataV1ToV2(validV1()));
  });
});

describe('parseStudyDataV2', () => {
  it('accepts an empty v2 document', () => {
    // #given / #when / #then
    expect(parseStudyDataV2(emptyV2())).toEqual(emptyV2());
  });

  it('accepts a document carrying study guide and hands-on progress', () => {
    // #given
    const document = validV2({
      studyGuideProgress: { section: guideProgress({ status: 'completed', completedAt: '2026-07-20T08:00:00.000Z' }) },
      handsOnProgress: { guide: handsOnProgress() },
    });

    // #when / #then
    expect(parseStudyDataV2(document)).toEqual(document);
  });

  it('accepts an in_progress hands-on record that preserves a prior completion time', () => {
    // #given — a stale completed guide reconfirmed keeps its original completion time
    const document = validV2({
      handsOnProgress: { guide: handsOnProgress({ previousCompletedAt: '2026-07-10T00:00:00.000Z' }) },
    });

    // #when / #then
    expect(parseStudyDataV2(document)).toEqual(document);
  });

  it('rejects an invalid or misplaced previousCompletedAt', () => {
    // #given — only valid on in_progress, a real datetime, no later than updatedAt
    const cases: Partial<HandsOnProgress>[] = [
      { previousCompletedAt: 'not-a-date' } as Partial<HandsOnProgress>,
      { previousCompletedAt: '2099-01-01T00:00:00.000Z' } as Partial<HandsOnProgress>, // after updatedAt
      { status: 'completed', completedAt: '2026-07-19T00:00:00.000Z', previousCompletedAt: '2026-07-10T00:00:00.000Z' } as Partial<HandsOnProgress>,
    ];
    for (const overrides of cases) {
      const document = validV2({ handsOnProgress: { guide: handsOnProgress(overrides) } });
      // #when / #then
      expect(parseStudyDataV2(document)).toBeNull();
    }
  });

  it('does not accept a v1 document as v2', () => {
    // #given / #when / #then
    expect(parseStudyDataV2(validV1())).toBeNull();
  });

  it('rejects an unknown future version', () => {
    // #given / #when / #then
    expect(parseStudyDataV2({ ...emptyV2(), version: 4 })).toBeNull();
  });

  it('rejects a document that declares the version but carries no records', () => {
    // #given / #when / #then
    expect(parseStudyDataV2({ version: 2 })).toBeNull();
  });

  it('rejects a document missing any one of the four records', () => {
    // #given / #when / #then
    for (const field of ['reviews', 'quizStats', 'studyGuideProgress', 'handsOnProgress'] as const) {
      const document: Record<string, unknown> = { ...emptyV2() };
      delete document[field];
      expect(parseStudyDataV2(document)).toBeNull();
    }
  });

  it('rejects the whole document when a single entry among valid ones is broken', () => {
    // #given — one unusable entry must not cost the learner the valid ones
    const document = {
      ...validV2(),
      studyGuideProgress: { good: guideProgress(), broken: { ...guideProgress(), status: 'paused' } },
    };

    // #when / #then
    expect(parseStudyDataV2(document)).toBeNull();
  });

  it('rejects a record keyed by a prototype-polluting name', () => {
    // #given — JSON.parse keeps these as own keys, unlike an object literal
    for (const field of ['reviews', 'quizStats', 'studyGuideProgress', 'handsOnProgress']) {
      for (const key of ['__proto__', 'constructor', 'prototype']) {
        const document = JSON.parse(`{"version":2,"reviews":{},"quizStats":{},"studyGuideProgress":{},"handsOnProgress":{},"${field}":{"${key}":{}}}`);

        // #when / #then
        expect(parseStudyDataV2(document)).toBeNull();
      }
    }
    expect(Object.prototype).not.toHaveProperty('polluted');
  });

  it('rejects a progress record whose container is an array', () => {
    // #given / #when / #then
    expect(parseStudyDataV2({ ...emptyV2(), studyGuideProgress: [] })).toBeNull();
    expect(parseStudyDataV2({ ...emptyV2(), handsOnProgress: [] })).toBeNull();
  });

  it('rejects a document containing a progress entry with an unknown status', () => {
    // #given
    const document = { ...emptyV2(), studyGuideProgress: { section: { ...guideProgress(), status: 'paused' } } };

    // #when / #then
    expect(parseStudyDataV2(document)).toBeNull();
  });

  it('rejects a document whose progress revision is not a positive integer', () => {
    // #given
    const document = {
      ...emptyV2(),
      studyGuideProgress: { zero: guideProgress({ revision: 0 }), negative: guideProgress({ revision: -1 }), fractional: guideProgress({ revision: 1.5 }) },
    };

    // #when / #then
    expect(parseStudyDataV2(document)).toBeNull();
  });

  it('rejects a document whose progress timestamp is not an ISO datetime', () => {
    // #given
    const document = {
      ...emptyV2(),
      studyGuideProgress: {
        dateOnly: guideProgress({ updatedAt: '2026-07-20' }),
        garbage: guideProgress({ updatedAt: 'not-a-date' }),
        impossible: guideProgress({ updatedAt: '2026-02-30T00:00:00.000Z' }),
      },
    };

    // #when / #then
    expect(parseStudyDataV2(document)).toBeNull();
  });

  it('rejects an in_progress entry that still carries a completion timestamp', () => {
    // #given
    const document = {
      ...emptyV2(),
      studyGuideProgress: { section: { ...guideProgress(), completedAt: '2026-07-20T08:00:00.000Z' } },
    };

    // #when / #then
    expect(parseStudyDataV2(document)).toBeNull();
  });

  it('rejects a completed entry that has no completion timestamp', () => {
    // #given
    const document = { ...emptyV2(), studyGuideProgress: { section: { revision: 1, status: 'completed', updatedAt: '2026-07-20T09:00:00.000Z' } } };

    // #when / #then
    expect(parseStudyDataV2(document)).toBeNull();
  });

  it('rejects a completed entry finished after its last update', () => {
    // #given
    const document = {
      ...emptyV2(),
      studyGuideProgress: { section: guideProgress({ status: 'completed', completedAt: '2026-07-20T09:00:01.000Z' }) },
    };

    // #when / #then
    expect(parseStudyDataV2(document)).toBeNull();
  });

  it('rejects a hands-on entry with duplicate completed step ids', () => {
    // #given
    const document = {
      ...emptyV2(),
      handsOnProgress: { guide: handsOnProgress({ completedStepIds: ['step-1', 'step-1'] }) },
    };

    // #when / #then
    expect(parseStudyDataV2(document)).toBeNull();
  });

  it('rejects a hands-on entry whose completed step ids are not strings', () => {
    // #given
    const document = {
      ...emptyV2(),
      handsOnProgress: { notArray: { ...handsOnProgress(), completedStepIds: 'step-1' }, notStrings: { ...handsOnProgress(), completedStepIds: [1] } },
    };

    // #when / #then
    expect(parseStudyDataV2(document)).toBeNull();
  });

  it('accepts a hands-on entry with no completed steps yet', () => {
    // #given
    const document = { ...emptyV2(), handsOnProgress: { guide: handsOnProgress({ completedStepIds: [] }) } };

    // #when / #then
    expect(parseStudyDataV2(document)?.handsOnProgress).toEqual({ guide: handsOnProgress({ completedStepIds: [] }) });
  });
});

describe('migrateStudyDataV2ToV3', () => {
  it('carries every existing record across unchanged and starts Mock Exam state empty', () => {
    // #given
    const input = validV2({
      studyGuideProgress: { section: guideProgress() },
      handsOnProgress: { guide: handsOnProgress() },
    });

    // #when
    const migrated = migrateStudyDataV2ToV3(input);

    // #then
    expect(migrated).toEqual({
      version: 3,
      reviews: input.reviews,
      quizStats: input.quizStats,
      studyGuideProgress: input.studyGuideProgress,
      handsOnProgress: input.handsOnProgress,
      activeMockExam: null,
      mockExamAttempts: [],
    });
  });

  it('does not mutate its input', () => {
    // #given
    const input = validV2();
    const snapshot = structuredClone(input);

    // #when
    migrateStudyDataV2ToV3(input).reviews.injected = review('injected');

    // #then
    expect(input).toEqual(snapshot);
  });

  it('produces a document that passes v3 validation', () => {
    // #given / #when / #then
    expect(parseStudyDataV3(migrateStudyDataV2ToV3(validV2()))).toEqual(migrateStudyDataV2ToV3(validV2()));
  });
});

describe('parseStudyDataV3', () => {
  it('accepts an empty current-version document', () => {
    // #given / #when / #then
    expect(parseStudyDataV3(createEmptyStudyData())).toEqual(createEmptyStudyData());
  });

  it('does not accept a v2 document as v3', () => {
    // #given / #when / #then
    expect(parseStudyDataV3(validV2())).toBeNull();
  });

  it('rejects a document missing either Mock Exam field', () => {
    // #given / #when / #then
    for (const field of ['activeMockExam', 'mockExamAttempts'] as const) {
      const document: Record<string, unknown> = { ...createEmptyStudyData() };
      delete document[field];
      expect(parseStudyDataV3(document)).toBeNull();
    }
  });

  it('rejects a document whose activeMockExam is neither null nor a valid session', () => {
    // #given / #when / #then
    expect(parseStudyDataV3({ ...createEmptyStudyData(), activeMockExam: { id: 'x' } })).toBeNull();
    expect(parseStudyDataV3({ ...createEmptyStudyData(), activeMockExam: 42 })).toBeNull();
  });

  it('rejects a document whose mockExamAttempts is not an array of valid attempts', () => {
    // #given / #when / #then
    expect(parseStudyDataV3({ ...createEmptyStudyData(), mockExamAttempts: {} })).toBeNull();
    expect(parseStudyDataV3({ ...createEmptyStudyData(), mockExamAttempts: [{ id: 'broken' }] })).toBeNull();
  });
});

describe('parseStudyData', () => {
  it('reports a v3 document as already current', () => {
    // #given / #when / #then
    expect(parseStudyData(createEmptyStudyData())).toEqual({ data: createEmptyStudyData(), migrated: false });
  });

  it('migrates a v2 document up to v3 and reports it as migrated', () => {
    // #given / #when
    const parsed = parseStudyData(validV2());

    // #then
    expect(parsed).toEqual({ data: migrateStudyDataV2ToV3(validV2()), migrated: true });
  });

  it('migrates a v1 document all the way to v3 and reports it as migrated', () => {
    // #given / #when
    const parsed = parseStudyData(validV1());

    // #then
    expect(parsed).toEqual({ data: migrateStudyDataV2ToV3(migrateStudyDataV1ToV2(validV1())), migrated: true });
  });

  it('rejects an unknown future version instead of treating it as legacy', () => {
    // #given / #when / #then
    expect(parseStudyData({ version: 4, reviews: {} })).toBeNull();
  });

  it('never copies prototype-polluting keys out of stored records', () => {
    // #given — a document whose review ids target Object.prototype
    const document = JSON.parse(`{
      "version": 1,
      "reviews": { "__proto__": { "polluted": true }, "constructor": { "polluted": true } }
    }`);

    // #when
    const parsed = parseStudyData(document);

    // #then
    expect(parsed?.data.reviews).toEqual({});
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty('polluted');
  });
});
