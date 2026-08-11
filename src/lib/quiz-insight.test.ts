import { describe, expect, it } from 'vitest';
import type { QuizStat } from './storage-schema';
import {
  collectQuizInsightIds,
  deriveQuizInsight,
  isClose,
  isNotUnderstood,
} from './quiz-insight';

// Helper to reduce boilerplate: default values for QuizStat with overrides.
function stat(overrides: Partial<QuizStat> = {}): QuizStat {
  return {
    attempts: 1,
    correct: 0,
    lastAnsweredAt: '2026-08-11T00:00:00.000Z',
    lastCorrect: false,
    ...overrides,
  };
}

describe('isClose', () => {
  it.each([
    [{ partial: 1, correct: 0 }, true],
    [{ partial: 2, correct: 1 }, false],
    [{ partial: undefined, correct: 0 }, false],
    [{ partial: 0, correct: 0 }, false],
  ] as const)('isClose(%o) => %s', (overrides, expected) => {
    const quizStat = stat(overrides);
    expect(isClose(quizStat)).toBe(expected);
  });
});

describe('isNotUnderstood', () => {
  it.each([
    [{ attempts: 3, correct: 0, partial: undefined }, true],
    [{ attempts: 2, correct: 0, partial: 0 }, true],
    [{ attempts: 1, correct: 0, partial: 1 }, false],
    [{ attempts: 2, correct: 1, partial: undefined }, false],
    [{ attempts: 0, correct: 0, partial: undefined }, false],
  ] as const)('isNotUnderstood(%o) => %s', (overrides, expected) => {
    const quizStat = stat(overrides);
    expect(isNotUnderstood(quizStat)).toBe(expected);
  });
});

describe('deriveQuizInsight', () => {
  it('returns zero counts for an empty quizStats record', () => {
    const quizStats: Record<string, QuizStat> = {};
    const insight = deriveQuizInsight(quizStats);
    expect(insight).toEqual({ close: 0, notUnderstood: 0, guessedRight: 0 });
  });

  it('counts close questions in the close bucket', () => {
    const quizStats: Record<string, QuizStat> = {
      q1: stat({ partial: 1, correct: 0 }),
      q2: stat({ partial: 2, correct: 0 }),
      q3: stat({ attempts: 1, correct: 0, partial: 0 }),
      q4: stat({ attempts: 1, correct: 0, partial: undefined }),
      q5: stat({ correct: 1, guessedCorrect: 1 }),
    };
    const insight = deriveQuizInsight(quizStats);
    expect(insight.close).toBe(2);
    expect(insight.notUnderstood).toBe(2);
    expect(insight.guessedRight).toBe(1);
  });

  it('sums guessedCorrect across all stats (not just counts them)', () => {
    const quizStats: Record<string, QuizStat> = {
      q1: stat({ correct: 1, guessedCorrect: 2 }),
      q2: stat({ correct: 1, guessedCorrect: 3 }),
    };
    const insight = deriveQuizInsight(quizStats);
    expect(insight.guessedRight).toBe(5);
  });

  it('ignores undefined guessedCorrect (treats as 0)', () => {
    const quizStats: Record<string, QuizStat> = {
      q1: stat({ correct: 1, guessedCorrect: 1 }),
      q2: stat({ correct: 1, guessedCorrect: undefined }),
    };
    const insight = deriveQuizInsight(quizStats);
    expect(insight.guessedRight).toBe(1);
  });
});

describe('collectQuizInsightIds', () => {
  it('returns ids in the questions array order, not quizStats insertion order', () => {
    const questions = [{ id: 'q3' }, { id: 'q1' }, { id: 'q2' }];
    const quizStats: Record<string, QuizStat> = {
      q1: stat({ partial: 1, correct: 0 }),
      q2: stat({ attempts: 1, correct: 0, partial: 0 }),
      q3: stat({ correct: 1, guessedCorrect: 1 }),
    };
    const result = collectQuizInsightIds(questions, quizStats);
    expect(result.close).toEqual(['q1']);
    expect(result.notUnderstood).toEqual(['q2']);
    expect(result.guessedRight).toEqual(['q3']);
  });

  it('skips questions that have no quizStats entry', () => {
    const questions = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }];
    const quizStats: Record<string, QuizStat> = {
      q1: stat({ partial: 1, correct: 0 }),
      q2: stat({ attempts: 1, correct: 0, partial: 0 }),
    };
    const result = collectQuizInsightIds(questions, quizStats);
    expect(result.close).toEqual(['q1']);
    expect(result.notUnderstood).toEqual(['q2']);
    expect(result.guessedRight).toEqual([]);
  });

  it.each([
    [{ correct: 1, guessedCorrect: 0 }, false],
    [{ correct: 1, guessedCorrect: 1 }, true],
    [{ correct: 1, guessedCorrect: undefined }, false],
  ] as const)('guessedRight: guessedCorrect %o => %s', (overrides, included) => {
    const questions = [{ id: 'q' }];
    const quizStats: Record<string, QuizStat> = { q: stat(overrides) };
    const result = collectQuizInsightIds(questions, quizStats);
    expect(result.guessedRight).toEqual(included ? ['q'] : []);
  });

  it('returns three empty arrays for no matches', () => {
    const questions = [{ id: 'q1' }, { id: 'q2' }];
    const quizStats: Record<string, QuizStat> = {};
    const result = collectQuizInsightIds(questions, quizStats);
    expect(result).toEqual({ close: [], notUnderstood: [], guessedRight: [] });
  });

  it('handles mixed buckets in the correct questions order', () => {
    const questions = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }, { id: 'q4' }];
    const quizStats: Record<string, QuizStat> = {
      q1: stat({ correct: 1, guessedCorrect: 1 }),
      q2: stat({ partial: 1, correct: 0 }),
      q3: stat({ attempts: 1, correct: 0, partial: 0 }),
      q4: stat({ correct: 2, guessedCorrect: 0 }),
    };
    const result = collectQuizInsightIds(questions, quizStats);
    expect(result.guessedRight).toEqual(['q1']);
    expect(result.close).toEqual(['q2']);
    expect(result.notUnderstood).toEqual(['q3']);
  });
});
