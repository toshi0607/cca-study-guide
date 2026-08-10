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
  mergeHandsOnProgress,
  mergeMockExamAttempts,
  mergeStudyData,
} from './study-data-merge';
import { makeAttempt, makeSession } from './mock-exam.fixture';

// ============================================================================
// Helpers: build test fixtures with reasonable defaults and overrides
// ============================================================================

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

// ============================================================================
// reviewedAtMs: Recover the timestamp when a review actually occurred
// ============================================================================

describe('reviewedAtMs', () => {
  it('returns the correct time for a "good" rating with 3-day interval', () => {
    // #given
    const baseTime = new Date('2026-08-11T00:00:00Z');
    const state = scheduleReview('card', 1, 'good', undefined, baseTime);

    // #when
    const timestamp = reviewedAtMs(state);

    // #then
    expect(timestamp).toBe(baseTime.getTime());
  });

  it('returns the correct time for a "hard" rating with 1-day interval', () => {
    // #given
    const baseTime = new Date('2026-08-11T12:30:00Z');
    const state = scheduleReview('card', 1, 'hard', undefined, baseTime);

    // #when
    const timestamp = reviewedAtMs(state);

    // #then
    expect(timestamp).toBe(baseTime.getTime());
  });

  it('returns the correct time for an "again" rating with 10-minute interval', () => {
    // #given
    const baseTime = new Date('2026-08-11T06:15:00Z');
    const state = scheduleReview('card', 1, 'again', undefined, baseTime);

    // #when
    const timestamp = reviewedAtMs(state);

    // #then
    expect(timestamp).toBe(baseTime.getTime());
  });

  it('returns NEGATIVE_INFINITY for an unparseable dueAt string', () => {
    // #given
    const state: ReviewState = {
      cardId: 'card',
      cardRevisionSeen: 1,
      dueAt: 'not-a-date',
      intervalDays: 3,
      streak: 0,
      lapses: 0,
      lastRating: 'good',
    };

    // #when
    const timestamp = reviewedAtMs(state);

    // #then
    expect(timestamp).toBe(Number.NEGATIVE_INFINITY);
  });
});

// ============================================================================
// mergeReviews: Combine two review histories, using recency to decide conflicts
// ============================================================================

describe('mergeReviews', () => {
  it('keeps a review that only exists on local', () => {
    // #given
    const local = { card1: review('card1') };
    const incoming = {};

    // #when
    const result = mergeReviews(local, incoming);

    // #then
    expect(result).toEqual(local);
  });

  it('keeps a review that only exists on incoming', () => {
    // #given
    const local = {};
    const incoming = { card1: review('card1') };

    // #when
    const result = mergeReviews(local, incoming);

    // #then
    expect(result).toEqual(incoming);
  });

  it('keeps the newer review when both sides have a card', () => {
    // #given
    const oldTime = new Date('2026-08-10T00:00:00Z');
    const newTime = new Date('2026-08-11T00:00:00Z');
    const local = { card1: scheduleReview('card1', 1, 'good', undefined, oldTime) };
    const incoming = { card1: scheduleReview('card1', 1, 'good', undefined, newTime) };

    // #when
    const result = mergeReviews(local, incoming);

    // #then
    expect(result.card1).toEqual(incoming.card1);
  });

  it('prefers newer "again" over older "good" (dueAt is not a timestamp proxy)', () => {
    // #given — This is the critical test from the spec:
    // A "good" card due days out looks older than "again" due 10 minutes out,
    // but the "again" was actually reviewed more recently.
    const oldGoodTime = new Date('2026-08-10T00:00:00Z');
    const newAgainTime = new Date('2026-08-11T23:50:00Z');
    const local = { card1: scheduleReview('card1', 1, 'good', undefined, oldGoodTime) };
    const incoming = { card1: scheduleReview('card1', 1, 'again', undefined, newAgainTime) };

    // #when
    const result = mergeReviews(local, incoming);

    // #then — Incoming "again" is newer and should win, not the "good".
    expect(result.card1).toEqual(incoming.card1);
    expect(result.card1.lastRating).toBe('again');
  });

  it('keeps local on a tie (same reviewedAtMs)', () => {
    // #given
    const sameTime = new Date('2026-08-11T00:00:00Z');
    const local = { card1: scheduleReview('card1', 1, 'good', undefined, sameTime) };
    const incoming = { card1: scheduleReview('card1', 1, 'good', undefined, sameTime) };

    // #when
    const result = mergeReviews(local, incoming);

    // #then
    expect(result.card1).toBe(local.card1);
  });

  it('combines cards from both sides', () => {
    // #given
    const local = { card1: review('card1') };
    const incoming = { card2: review('card2') };

    // #when
    const result = mergeReviews(local, incoming);

    // #then
    expect(result).toEqual({ card1: review('card1'), card2: review('card2') });
  });
});

// ============================================================================
// mergeQuizStat: Combine answer statistics using maximum counters
// ============================================================================

describe('mergeQuizStat', () => {
  it('takes the maximum of attempts', () => {
    // #given
    const local = stat({ attempts: 3 });
    const incoming = stat({ attempts: 5 });

    // #when
    const result = mergeQuizStat(local, incoming);

    // #then
    expect(result.attempts).toBe(5);
  });

  it('takes the maximum of correct', () => {
    // #given
    const local = stat({ correct: 2 });
    const incoming = stat({ correct: 4 });

    // #when
    const result = mergeQuizStat(local, incoming);

    // #then
    expect(result.correct).toBe(4);
  });

  it('takes the newer lastAnsweredAt and its lastCorrect/lastConfidence', () => {
    // #given
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

    // #when
    const result = mergeQuizStat(local, incoming);

    // #then
    expect(result.lastAnsweredAt).toBe(incoming.lastAnsweredAt);
    expect(result.lastCorrect).toBe(true);
    expect(result.lastConfidence).toBe('sure');
  });

  it('omits partial field when both are absent or zero', () => {
    // #given
    const local = stat({ partial: 0 });
    const incoming = stat({});

    // #when
    const result = mergeQuizStat(local, incoming);

    // #then
    expect('partial' in result).toBe(false);
  });

  it('includes partial field when result is nonzero', () => {
    // #given
    const local = stat({ partial: 0 });
    const incoming = stat({ partial: 2 });

    // #when
    const result = mergeQuizStat(local, incoming);

    // #then
    expect(result.partial).toBe(2);
  });

  it('omits guessedCorrect field when both are absent or zero', () => {
    // #given
    const local = stat({ guessedCorrect: 0 });
    const incoming = stat({});

    // #when
    const result = mergeQuizStat(local, incoming);

    // #then
    expect('guessedCorrect' in result).toBe(false);
  });

  it('includes guessedCorrect field when result is nonzero', () => {
    // #given
    const local = stat({ guessedCorrect: 0 });
    const incoming = stat({ guessedCorrect: 3 });

    // #when
    const result = mergeQuizStat(local, incoming);

    // #then
    expect(result.guessedCorrect).toBe(3);
  });

  it('does not copy lastConfidence from the older side', () => {
    // #given
    const local = stat({
      lastAnsweredAt: '2026-08-10T00:00:00.000Z',
      lastCorrect: false,
      lastConfidence: 'guess',
    });
    const incoming = stat({
      lastAnsweredAt: '2026-08-11T00:00:00.000Z',
      lastCorrect: true,
    });

    // #when
    const result = mergeQuizStat(local, incoming);

    // #then
    expect('lastConfidence' in result).toBe(false);
  });
});

// ============================================================================
// mergeStudyGuideProgress: Newer updatedAt wins
// ============================================================================

describe('mergeStudyGuideProgress', () => {
  it('keeps the newer study guide progress record by updatedAt', () => {
    // #given
    const local = {
      section1: guideProgress({ updatedAt: '2026-08-10T00:00:00.000Z', status: 'in_progress' }),
    };
    const incoming = {
      section1: guideProgress({ updatedAt: '2026-08-11T00:00:00.000Z', status: 'completed', completedAt: '2026-08-11T00:00:00.000Z' }),
    };

    // #when
    const result = mergeStudyGuideProgress(local, incoming);

    // #then
    expect(result.section1.status).toBe('completed');
  });

  it('preserves sections that only exist on local', () => {
    // #given
    const local = { section1: guideProgress() };
    const incoming = { section2: guideProgress() };

    // #when
    const result = mergeStudyGuideProgress(local, incoming);

    // #then
    expect(result.section1).toBeDefined();
    expect(result.section2).toBeDefined();
  });
});

// ============================================================================
// mergeHandsOnRecord: Union completedStepIds, newer status
// ============================================================================

describe('mergeHandsOnRecord', () => {
  it('unions completedStepIds without duplication', () => {
    // #given
    const local = handsOnProgress({ completedStepIds: ['step-1', 'step-2'], updatedAt: '2026-08-10T00:00:00.000Z' });
    const incoming = handsOnProgress({ completedStepIds: ['step-2', 'step-3'], updatedAt: '2026-08-11T00:00:00.000Z' });

    // #when
    const result = mergeHandsOnRecord(local, incoming);

    // #then
    expect(result.completedStepIds.sort()).toEqual(['step-1', 'step-2', 'step-3']);
    expect(new Set(result.completedStepIds).size).toBe(result.completedStepIds.length);
  });

  it('takes status and updatedAt from the newer record', () => {
    // #given
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

    // #when
    const result = mergeHandsOnRecord(local, incoming);

    // #then
    expect(result.status).toBe('completed');
    expect(result.updatedAt).toBe(incoming.updatedAt);
  });
});

// ============================================================================
// mergeMockExamAttempts: Union by id, sorted by completedAt
// ============================================================================

describe('mergeMockExamAttempts', () => {
  it('does not duplicate attempts with the same id (local copy is kept)', () => {
    // #given
    const att1 = attempt({ id: 'attempt-1', completedAt: '2026-08-11T00:00:00.000Z' });
    const att1Dup = attempt({ id: 'attempt-1', completedAt: '2026-08-11T12:00:00.000Z' });
    const local = [att1];
    const incoming = [att1Dup];

    // #when
    const result = mergeMockExamAttempts(local, incoming);

    // #then
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(att1);
  });

  it('sorts results by completedAt in ascending order', () => {
    // #given
    const att1 = attempt({ id: 'attempt-1', completedAt: '2026-08-11T12:00:00.000Z' });
    const att2 = attempt({ id: 'attempt-2', completedAt: '2026-08-11T08:00:00.000Z' });
    const att3 = attempt({ id: 'attempt-3', completedAt: '2026-08-11T10:00:00.000Z' });
    const local = [att1];
    const incoming = [att2, att3];

    // #when
    const result = mergeMockExamAttempts(local, incoming);

    // #then
    expect(result).toHaveLength(3);
    expect(result[0]).toBe(att2);
    expect(result[1]).toBe(att3);
    expect(result[2]).toBe(att1);
  });

  it('handles empty local and incoming arrays', () => {
    // #given / #when / #then
    expect(mergeMockExamAttempts([], [])).toEqual([]);
  });
});

// ============================================================================
// mergeStudyData: Full merge with activeMockExam precedence
// ============================================================================

describe('mergeStudyData', () => {
  it('returns version 3', () => {
    // #given
    const local = studyData();
    const incoming = studyData();

    // #when
    const result = mergeStudyData(local, incoming);

    // #then
    expect(result.version).toBe(3);
  });

  it('keeps local activeMockExam when present', () => {
    // #given
    const sess = makeSession({ id: 'local-exam' });
    const local = studyData({ activeMockExam: sess });
    const incoming = studyData({ activeMockExam: makeSession({ id: 'incoming-exam' }) });

    // #when
    const result = mergeStudyData(local, incoming);

    // #then
    expect(result.activeMockExam).toBe(sess);
  });

  it('adopts incoming activeMockExam when local is null', () => {
    // #given
    const sess = makeSession({ id: 'incoming-exam' });
    const local = studyData({ activeMockExam: null });
    const incoming = studyData({ activeMockExam: sess });

    // #when
    const result = mergeStudyData(local, incoming);

    // #then
    expect(result.activeMockExam).toBe(sess);
  });

  it('keeps null activeMockExam when both are null', () => {
    // #given
    const local = studyData({ activeMockExam: null });
    const incoming = studyData({ activeMockExam: null });

    // #when
    const result = mergeStudyData(local, incoming);

    // #then
    expect(result.activeMockExam).toBeNull();
  });
});

// ============================================================================
// IDEMPOTENCE (Critical): merging the same data twice = merging once
// ============================================================================

describe('mergeStudyData idempotence', () => {
  it('is idempotent: merge(merge(a, b), b) === merge(a, b)', () => {
    // #given — Comprehensive StudyData with all fields populated
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

    // #when
    const firstMerge = mergeStudyData(a, b);
    const secondMerge = mergeStudyData(firstMerge, b);

    // #then
    expect(secondMerge).toEqual(firstMerge);
  });

  it('is idempotent: merge(a, a) === a', () => {
    // #given — Comprehensive data to ensure all branches work
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

    // #when
    const result = mergeStudyData(data, data);

    // #then
    expect(result).toEqual(data);
  });

  it('is idempotent with empty records', () => {
    // #given
    const empty = studyData();

    // #when
    const firstMerge = mergeStudyData(empty, empty);
    const secondMerge = mergeStudyData(firstMerge, empty);

    // #then
    expect(secondMerge).toEqual(firstMerge);
    expect(secondMerge).toEqual(empty);
  });
});

// ============================================================================
// Integration: mergeQuizStats (collection) uses mergeQuizStat (single)
// ============================================================================

describe('mergeQuizStats', () => {
  it('merges all entries correctly', () => {
    // #given
    const local = {
      q1: stat({ attempts: 5, correct: 3 }),
      q2: stat({ attempts: 2 }),
    };
    const incoming = {
      q1: stat({ attempts: 3, correct: 2 }),
      q3: stat({ attempts: 1 }),
    };

    // #when
    const result = mergeQuizStats(local, incoming);

    // #then
    expect(result.q1.attempts).toBe(5);
    expect(result.q2.attempts).toBe(2);
    expect(result.q3.attempts).toBe(1);
  });
});

// ============================================================================
// Integration: mergeHandsOnProgress (collection) uses mergeHandsOnRecord (single)
// ============================================================================

describe('mergeHandsOnProgress', () => {
  it('merges all entries correctly', () => {
    // #given
    const local = {
      guide1: handsOnProgress({ completedStepIds: ['step-1'] }),
      guide2: handsOnProgress({ completedStepIds: ['step-2'] }),
    };
    const incoming = {
      guide1: handsOnProgress({ completedStepIds: ['step-2'], updatedAt: '2026-08-11T12:00:00.000Z' }),
      guide3: handsOnProgress({ completedStepIds: ['step-1'] }),
    };

    // #when
    const result = mergeHandsOnProgress(local, incoming);

    // #then
    expect(result.guide1.completedStepIds.sort()).toEqual(['step-1', 'step-2']);
    expect(result.guide2.completedStepIds).toEqual(['step-2']);
    expect(result.guide3.completedStepIds).toEqual(['step-1']);
  });
});
