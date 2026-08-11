import { describe, expect, it } from 'vitest';
import type { ReviewState } from './scheduler';
import { scheduleReview } from './scheduler';
import type { HandsOnProgress, QuizStat, StudyData, StudyGuideProgress } from './storage-schema';
import { createEmptyStudyData } from './storage-schema';
import type { MockExamAttempt } from './mock-exam-types';
import {
  reviewedAtMs,
  mergeReviews,
  mergeQuizStat,
  mergeQuizStats,
  mergeStudyGuideProgress,
  mergeHandsOnRecord,
  mergeMockExamAttempts,
  mergeStudyData,
} from './study-data-merge';
import { makeAttempt, makeSession } from './mock-exam.fixture';

function review(cardId: string, rating: 'again' | 'hard' | 'good' = 'good', now = new Date('2026-08-11T00:00:00Z')): ReviewState {
  return scheduleReview(cardId, 1, rating, undefined, now);
}

function stat(overrides: Partial<QuizStat> = {}): QuizStat {
  return {
    attempts: 1,
    correct: 0,
    lastAnsweredAt: '2026-08-11T00:00:00.000Z',
    lastCorrect: false,
    ...overrides,
  };
}

function guideProgress(overrides: Partial<StudyGuideProgress> = {}): StudyGuideProgress {
  return {
    revision: 1,
    status: 'in_progress',
    updatedAt: '2026-08-11T00:00:00.000Z',
    ...overrides,
  } as StudyGuideProgress;
}

function handsOnProgress(overrides: Partial<HandsOnProgress> = {}): HandsOnProgress {
  return {
    revision: 1,
    status: 'in_progress',
    completedStepIds: [],
    updatedAt: '2026-08-11T00:00:00.000Z',
    ...overrides,
  } as HandsOnProgress;
}

function studyData(overrides: Partial<StudyData> = {}): StudyData {
  return {
    ...createEmptyStudyData(),
    ...overrides,
  };
}

function attempt(overrides: Partial<MockExamAttempt> = {}): MockExamAttempt {
  return makeAttempt(overrides);
}

describe('reviewedAtMs', () => {
  it.each([
    ['good', new Date('2026-08-11T00:00:00Z')],
    ['hard', new Date('2026-08-11T12:30:00Z')],
    ['again', new Date('2026-08-11T06:15:00Z')],
  ] as const)('recovers the review time from a %s rating', (rating, baseTime) => {
    const state = scheduleReview('card', 1, rating, undefined, baseTime);
    expect(reviewedAtMs(state)).toBe(baseTime.getTime());
  });

  it('returns NEGATIVE_INFINITY for an unparseable dueAt string', () => {
    const state: ReviewState = {
      cardId: 'card',
      cardRevisionSeen: 1,
      dueAt: 'not-a-date',
      intervalDays: 3,
      streak: 0,
      lapses: 0,
      lastRating: 'good',
    };
    expect(reviewedAtMs(state)).toBe(Number.NEGATIVE_INFINITY);
  });
});

describe('mergeReviews', () => {
  it('keeps a review that only exists on local', () => {
    const local = { card1: review('card1') };
    const incoming = {};
    const result = mergeReviews(local, incoming);
    expect(result).toEqual(local);
  });

  it('keeps a review that only exists on incoming', () => {
    const local = {};
    const incoming = { card1: review('card1') };
    const result = mergeReviews(local, incoming);
    expect(result).toEqual(incoming);
  });

  it('keeps the newer review when both sides have a card', () => {
    const oldTime = new Date('2026-08-10T00:00:00Z');
    const newTime = new Date('2026-08-11T00:00:00Z');
    const local = { card1: scheduleReview('card1', 1, 'good', undefined, oldTime) };
    const incoming = { card1: scheduleReview('card1', 1, 'good', undefined, newTime) };
    const result = mergeReviews(local, incoming);
    expect(result.card1).toEqual(incoming.card1);
  });

  it('prefers newer "again" over older "good" (dueAt is not a timestamp proxy)', () => {
    const oldGoodTime = new Date('2026-08-10T00:00:00Z');
    const newAgainTime = new Date('2026-08-11T23:50:00Z');
    const local = { card1: scheduleReview('card1', 1, 'good', undefined, oldGoodTime) };
    const incoming = { card1: scheduleReview('card1', 1, 'again', undefined, newAgainTime) };
    const result = mergeReviews(local, incoming);
    expect(result.card1).toEqual(incoming.card1);
    expect(result.card1.lastRating).toBe('again');
  });

  it('keeps local on a tie (same reviewedAtMs)', () => {
    const sameTime = new Date('2026-08-11T00:00:00Z');
    const local = { card1: scheduleReview('card1', 1, 'good', undefined, sameTime) };
    const incoming = { card1: scheduleReview('card1', 1, 'good', undefined, sameTime) };
    const result = mergeReviews(local, incoming);
    expect(result.card1).toBe(local.card1);
  });

  it('combines cards from both sides', () => {
    const local = { card1: review('card1') };
    const incoming = { card2: review('card2') };
    const result = mergeReviews(local, incoming);
    expect(result).toEqual({ card1: review('card1'), card2: review('card2') });
  });
});

describe('mergeQuizStat', () => {
  it('takes the maximum of attempts', () => {
    const local = stat({ attempts: 3 });
    const incoming = stat({ attempts: 5 });
    const result = mergeQuizStat(local, incoming);
    expect(result.attempts).toBe(5);
  });

  it('takes the maximum of correct', () => {
    const local = stat({ correct: 2 });
    const incoming = stat({ correct: 4 });
    const result = mergeQuizStat(local, incoming);
    expect(result.correct).toBe(4);
  });

  it('takes the newer lastAnsweredAt and its lastCorrect/lastConfidence', () => {
    const local = stat({
      lastAnsweredAt: '2026-08-10T00:00:00.000Z',
      lastCorrect: false,
      lastConfidence: 'unsure',
    });
    const incoming = stat({
      lastAnsweredAt: '2026-08-11T00:00:00.000Z',
      lastCorrect: true,
      lastConfidence: 'sure',
    });
    const result = mergeQuizStat(local, incoming);
    expect(result.lastAnsweredAt).toBe(incoming.lastAnsweredAt);
    expect(result.lastCorrect).toBe(true);
    expect(result.lastConfidence).toBe('sure');
  });

  it('omits partial field when both are absent or zero', () => {
    const local = stat({ partial: 0 });
    const incoming = stat({});
    const result = mergeQuizStat(local, incoming);
    expect('partial' in result).toBe(false);
  });

  it('includes partial field when result is nonzero', () => {
    const local = stat({ partial: 0 });
    const incoming = stat({ partial: 2 });
    const result = mergeQuizStat(local, incoming);
    expect(result.partial).toBe(2);
  });

  it('omits guessedCorrect field when both are absent or zero', () => {
    const local = stat({ guessedCorrect: 0 });
    const incoming = stat({});
    const result = mergeQuizStat(local, incoming);
    expect('guessedCorrect' in result).toBe(false);
  });

  it('includes guessedCorrect field when result is nonzero', () => {
    const local = stat({ guessedCorrect: 0 });
    const incoming = stat({ guessedCorrect: 3 });
    const result = mergeQuizStat(local, incoming);
    expect(result.guessedCorrect).toBe(3);
  });

  it('does not copy lastConfidence from the older side', () => {
    const local = stat({
      lastAnsweredAt: '2026-08-10T00:00:00.000Z',
      lastCorrect: false,
      lastConfidence: 'guess',
    });
    const incoming = stat({
      lastAnsweredAt: '2026-08-11T00:00:00.000Z',
      lastCorrect: true,
    });
    const result = mergeQuizStat(local, incoming);
    expect('lastConfidence' in result).toBe(false);
  });
});

describe('mergeStudyGuideProgress', () => {
  it('keeps the newer study guide progress record by updatedAt', () => {
    const local = {
      section1: guideProgress({ updatedAt: '2026-08-10T00:00:00.000Z', status: 'in_progress' }),
    };
    const incoming = {
      section1: guideProgress({ updatedAt: '2026-08-11T00:00:00.000Z', status: 'completed', completedAt: '2026-08-11T00:00:00.000Z' }),
    };
    const result = mergeStudyGuideProgress(local, incoming);
    expect(result.section1.status).toBe('completed');
  });

  it('preserves sections that only exist on local', () => {
    const local = { section1: guideProgress() };
    const incoming = { section2: guideProgress() };
    const result = mergeStudyGuideProgress(local, incoming);
    expect(result.section1).toBeDefined();
    expect(result.section2).toBeDefined();
  });

  // revision says WHICH content a record is about, so it outranks time: a device
  // that has not pulled new content can touch the old revision at any moment.
  it('prefers the higher revision even when the lower one was updated later', () => {
    const local = { section1: guideProgress({ revision: 2, updatedAt: '2026-08-10T00:00:00.000Z' }) };
    const incoming = { section1: guideProgress({ revision: 1, updatedAt: '2026-08-11T00:00:00.000Z' }) };
    expect(mergeStudyGuideProgress(local, incoming).section1).toBe(local.section1);
  });

  it('adopts an incoming higher revision even when local was updated later', () => {
    const local = { section1: guideProgress({ revision: 1, updatedAt: '2026-08-11T00:00:00.000Z' }) };
    const incoming = { section1: guideProgress({ revision: 2, updatedAt: '2026-08-10T00:00:00.000Z' }) };
    expect(mergeStudyGuideProgress(local, incoming).section1).toBe(incoming.section1);
  });

  it('keeps local when revision and updatedAt are both equal', () => {
    const local = { section1: guideProgress({ revision: 1, updatedAt: '2026-08-11T00:00:00.000Z' }) };
    const incoming = { section1: guideProgress({ revision: 1, updatedAt: '2026-08-11T00:00:00.000Z' }) };
    expect(mergeStudyGuideProgress(local, incoming).section1).toBe(local.section1);
  });
});

describe('mergeHandsOnRecord', () => {
  it('unions completedStepIds without duplication', () => {
    const local = handsOnProgress({ completedStepIds: ['step-1', 'step-2'], updatedAt: '2026-08-10T00:00:00.000Z' });
    const incoming = handsOnProgress({ completedStepIds: ['step-2', 'step-3'], updatedAt: '2026-08-11T00:00:00.000Z' });
    const result = mergeHandsOnRecord(local, incoming);
    expect(result.completedStepIds.sort()).toEqual(['step-1', 'step-2', 'step-3']);
    expect(new Set(result.completedStepIds).size).toBe(result.completedStepIds.length);
  });

  it('takes status and updatedAt from the newer record', () => {
    const local = handsOnProgress({
      completedStepIds: [],
      updatedAt: '2026-08-10T00:00:00.000Z',
      status: 'in_progress',
    });
    const incoming = handsOnProgress({
      completedStepIds: [],
      updatedAt: '2026-08-11T00:00:00.000Z',
      status: 'completed',
      completedAt: '2026-08-11T00:00:00.000Z',
    });
    const result = mergeHandsOnRecord(local, incoming);
    expect(result.status).toBe('completed');
    expect(result.updatedAt).toBe(incoming.updatedAt);
  });

  it('takes status from the higher revision even when the lower one was updated later, and still unions steps', () => {
    const local = handsOnProgress({
      revision: 2,
      status: 'completed',
      completedAt: '2026-08-10T00:00:00.000Z',
      updatedAt: '2026-08-10T00:00:00.000Z',
      completedStepIds: ['step-1'],
    });
    const incoming = handsOnProgress({
      revision: 1,
      status: 'in_progress',
      updatedAt: '2026-08-11T00:00:00.000Z',
      completedStepIds: ['step-2'],
    });
    const result = mergeHandsOnRecord(local, incoming);
    expect(result.status).toBe('completed');
    expect(result.revision).toBe(2);
    expect([...result.completedStepIds].sort()).toEqual(['step-1', 'step-2']);
  });

  it('preserves the lower revision completion time on a higher revision in-progress winner', () => {
    const completedAt = '2026-08-10T00:00:00.000Z';
    const local = handsOnProgress({
      revision: 2,
      status: 'in_progress',
      updatedAt: '2026-08-11T00:00:00.000Z',
    });
    const incoming = handsOnProgress({
      revision: 1,
      status: 'completed',
      updatedAt: '2026-08-10T00:00:00.000Z',
      completedAt,
    });
    const result = mergeHandsOnRecord(local, incoming);

    expect(result.status === 'in_progress' && result.previousCompletedAt).toBe(completedAt);
  });

  // A revision bump can happen more than once before the learner reconfirms, and
  // `reconfirmHandsOnGuide` keeps the original completion across every one of
  // them. A merge that only looked at a `completed` loser would drop the history
  // at the second bump, because by then the loser is itself `in_progress`.
  it('carries the original completion time across a chain of revision bumps', () => {
    const completedAt = '2026-08-09T00:00:00.000Z';
    const rev1 = handsOnProgress({
      revision: 1,
      status: 'completed',
      updatedAt: '2026-08-09T00:00:00.000Z',
      completedAt,
    });
    const rev2 = handsOnProgress({ revision: 2, status: 'in_progress', updatedAt: '2026-08-10T00:00:00.000Z' });
    const rev3 = handsOnProgress({ revision: 3, status: 'in_progress', updatedAt: '2026-08-11T00:00:00.000Z' });

    const afterFirstBump = mergeHandsOnRecord(rev1, rev2);
    const afterSecondBump = mergeHandsOnRecord(afterFirstBump, rev3);

    expect(afterFirstBump.status === 'in_progress' && afterFirstBump.previousCompletedAt).toBe(completedAt);
    expect(afterSecondBump.revision).toBe(3);
    expect(afterSecondBump.status === 'in_progress' && afterSecondBump.previousCompletedAt).toBe(completedAt);
  });

  it('carries the completion time to the higher revision regardless of which side it arrives on', () => {
    const completedAt = '2026-08-09T00:00:00.000Z';
    const older = handsOnProgress({ revision: 1, status: 'in_progress', updatedAt: '2026-08-10T00:00:00.000Z', previousCompletedAt: completedAt });
    const newer = handsOnProgress({ revision: 2, status: 'in_progress', updatedAt: '2026-08-11T00:00:00.000Z' });

    const localOlder = mergeHandsOnRecord(older, newer);
    const localNewer = mergeHandsOnRecord(newer, older);

    expect(localOlder.revision).toBe(2);
    expect(localNewer.revision).toBe(2);
    expect(localOlder.status === 'in_progress' && localOlder.previousCompletedAt).toBe(completedAt);
    expect(localNewer.status === 'in_progress' && localNewer.previousCompletedAt).toBe(completedAt);
  });

  it('is idempotent when inheriting from an in-progress loser', () => {
    const older = handsOnProgress({ revision: 1, status: 'in_progress', updatedAt: '2026-08-10T00:00:00.000Z', previousCompletedAt: '2026-08-09T00:00:00.000Z' });
    const newer = handsOnProgress({ revision: 2, status: 'in_progress', updatedAt: '2026-08-11T00:00:00.000Z' });

    const once = mergeHandsOnRecord(newer, older);
    const twice = mergeHandsOnRecord(once, older);

    expect(twice).toEqual(once);
  });

  it('does not overwrite a winner previousCompletedAt', () => {
    const previousCompletedAt = '2026-08-09T00:00:00.000Z';
    const local = handsOnProgress({
      revision: 2,
      status: 'in_progress',
      updatedAt: '2026-08-11T00:00:00.000Z',
      previousCompletedAt,
    });
    const incoming = handsOnProgress({
      revision: 1,
      status: 'completed',
      updatedAt: '2026-08-10T00:00:00.000Z',
      completedAt: '2026-08-10T00:00:00.000Z',
    });
    const result = mergeHandsOnRecord(local, incoming);

    expect(result.status === 'in_progress' && result.previousCompletedAt).toBe(previousCompletedAt);
  });

  it('does not inherit a completion time later than the winner updatedAt', () => {
    const local = handsOnProgress({
      revision: 2,
      status: 'in_progress',
      updatedAt: '2026-08-10T00:00:00.000Z',
    });
    const incoming = handsOnProgress({
      revision: 1,
      status: 'completed',
      updatedAt: '2026-08-11T00:00:00.000Z',
      completedAt: '2026-08-11T00:00:00.000Z',
    });
    const result = mergeHandsOnRecord(local, incoming);

    expect(result.status).toBe('in_progress');
    expect('previousCompletedAt' in result).toBe(false);
  });

  it('is idempotent when inheriting a lower revision completion time', () => {
    const local = handsOnProgress({
      revision: 2,
      status: 'in_progress',
      updatedAt: '2026-08-11T00:00:00.000Z',
    });
    const incoming = handsOnProgress({
      revision: 1,
      status: 'completed',
      updatedAt: '2026-08-10T00:00:00.000Z',
      completedAt: '2026-08-10T00:00:00.000Z',
    });
    const firstMerge = mergeHandsOnRecord(local, incoming);

    expect(mergeHandsOnRecord(firstMerge, incoming)).toEqual(firstMerge);
  });
});

describe('mergeMockExamAttempts', () => {
  it('does not duplicate attempts with the same id (local copy is kept)', () => {
    const att1 = attempt({ id: 'attempt-1', completedAt: '2026-08-11T00:00:00.000Z' });
    const att1Dup = attempt({ id: 'attempt-1', completedAt: '2026-08-11T12:00:00.000Z' });
    const local = [att1];
    const incoming = [att1Dup];
    const result = mergeMockExamAttempts(local, incoming);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(att1);
  });

  it('keeps local order and appends only the attempts local did not have', () => {
    const att1 = attempt({ id: 'attempt-1', completedAt: '2026-08-11T12:00:00.000Z' });
    const att2 = attempt({ id: 'attempt-2', completedAt: '2026-08-11T08:00:00.000Z' });
    const att3 = attempt({ id: 'attempt-3', completedAt: '2026-08-11T10:00:00.000Z' });
    const result = mergeMockExamAttempts([att1, att2], [att3]);
    expect(result).toEqual([att1, att2, att3]);
  });

  it('is identity on an unsorted list, which sorting here would break', () => {
    const unsorted = [
      attempt({ id: 'attempt-1', completedAt: '2026-08-11T12:00:00.000Z' }),
      attempt({ id: 'attempt-2', completedAt: '2026-08-11T08:00:00.000Z' }),
    ];
    const result = mergeMockExamAttempts(unsorted, unsorted);
    expect(result).toEqual(unsorted);
  });

  it('handles empty local and incoming arrays', () => {
    expect(mergeMockExamAttempts([], [])).toEqual([]);
  });
});

describe('mergeStudyData', () => {
  it('returns version 3', () => {
    const local = studyData();
    const incoming = studyData();
    const result = mergeStudyData(local, incoming);
    expect(result.version).toBe(3);
  });

  it('keeps local activeMockExam when present', () => {
    const sess = makeSession({ id: 'local-exam' });
    const local = studyData({ activeMockExam: sess });
    const incoming = studyData({ activeMockExam: makeSession({ id: 'incoming-exam' }) });
    const result = mergeStudyData(local, incoming);
    expect(result.activeMockExam).toBe(sess);
  });

  it('adopts incoming activeMockExam when local is null', () => {
    const sess = makeSession({ id: 'incoming-exam' });
    const local = studyData({ activeMockExam: null });
    const incoming = studyData({ activeMockExam: sess });
    const result = mergeStudyData(local, incoming);
    expect(result.activeMockExam).toBe(sess);
  });

  it('keeps null activeMockExam when both are null', () => {
    const local = studyData({ activeMockExam: null });
    const incoming = studyData({ activeMockExam: null });
    const result = mergeStudyData(local, incoming);
    expect(result.activeMockExam).toBeNull();
  });
});

describe('mergeStudyData idempotence', () => {
  it('is idempotent: merge(merge(a, b), b) === merge(a, b)', () => {
    const a = studyData({
      reviews: { card1: review('card1'), card2: review('card2', 'hard') },
      quizStats: { q1: stat({ attempts: 5, correct: 3 }), q2: stat({ attempts: 2, correct: 1 }) },
      studyGuideProgress: {
        section1: guideProgress({ status: 'in_progress' }),
        section2: guideProgress({ status: 'completed', completedAt: '2026-08-11T00:00:00.000Z' }),
      },
      handsOnProgress: {
        guide1: handsOnProgress({ completedStepIds: ['step-1', 'step-2'] }),
        guide2: handsOnProgress({ completedStepIds: [] }),
      },
      activeMockExam: makeSession({ id: 'exam-1' }),
      mockExamAttempts: [
        attempt({ id: 'attempt-1', completedAt: '2026-08-11T00:00:00.000Z' }),
        attempt({ id: 'attempt-2', completedAt: '2026-08-11T12:00:00.000Z' }),
      ],
    });
    const b = studyData({
      reviews: { card1: review('card1', 'again', new Date('2026-08-11T12:00:00Z')), card3: review('card3') },
      quizStats: { q1: stat({ attempts: 3, correct: 2 }), q3: stat({ attempts: 1, correct: 1 }) },
      studyGuideProgress: {
        section1: guideProgress({ status: 'completed', completedAt: '2026-08-11T06:00:00.000Z' }),
        section3: guideProgress(),
      },
      handsOnProgress: {
        guide1: handsOnProgress({ completedStepIds: ['step-2', 'step-3'] }),
      },
      activeMockExam: null,
      mockExamAttempts: [attempt({ id: 'attempt-2', completedAt: '2026-08-11T12:00:00.000Z' })],
    });
    const firstMerge = mergeStudyData(a, b);
    const secondMerge = mergeStudyData(firstMerge, b);
    expect(secondMerge).toEqual(firstMerge);
  });

  it('is idempotent: merge(a, a) === a', () => {
    const data = studyData({
      reviews: { card1: review('card1'), card2: review('card2', 'hard') },
      quizStats: {
        q1: stat({ attempts: 5, correct: 3, partial: 1, guessedCorrect: 1, lastConfidence: 'sure' }),
      },
      studyGuideProgress: {
        section1: guideProgress({ status: 'in_progress' }),
      },
      handsOnProgress: {
        guide1: handsOnProgress({ completedStepIds: ['step-1', 'step-2'] }),
      },
      activeMockExam: makeSession(),
      mockExamAttempts: [attempt({ id: 'attempt-1', completedAt: '2026-08-11T00:00:00.000Z' })],
    });
    const result = mergeStudyData(data, data);
    expect(result).toEqual(data);
  });

  it('is idempotent with empty records', () => {
    const empty = studyData();
    const firstMerge = mergeStudyData(empty, empty);
    const secondMerge = mergeStudyData(firstMerge, empty);
    expect(secondMerge).toEqual(firstMerge);
    expect(secondMerge).toEqual(empty);
  });
});
