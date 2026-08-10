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
  it('returns true when partial >= 1 and correct === 0', () => {
    // #given — one partial attempt, never correct
    const quizStat = stat({ partial: 1, correct: 0 });

    // #when / #then
    expect(isClose(quizStat)).toBe(true);
  });

  it('returns false when partial >= 1 but correct >= 1 (not close anymore)', () => {
    // #given — has both partial and correct attempts
    const quizStat = stat({ partial: 2, correct: 1 });

    // #when / #then
    expect(isClose(quizStat)).toBe(false);
  });

  it('returns false when partial is undefined (no close attempts)', () => {
    // #given — partial field not set
    const quizStat = stat({ partial: undefined, correct: 0 });

    // #when / #then
    expect(isClose(quizStat)).toBe(false);
  });

  it('returns false when partial is 0 (treats undefined and 0 the same)', () => {
    // #given — partial explicitly set to 0
    const quizStat = stat({ partial: 0, correct: 0 });

    // #when / #then
    expect(isClose(quizStat)).toBe(false);
  });
});

describe('isNotUnderstood', () => {
  it('returns true when attempts >= 1, correct === 0, and partial is undefined', () => {
    // #given — attempted but never correct or partial
    const quizStat = stat({ attempts: 3, correct: 0, partial: undefined });

    // #when / #then
    expect(isNotUnderstood(quizStat)).toBe(true);
  });

  it('returns true when attempts >= 1, correct === 0, and partial is 0', () => {
    // #given — attempted but never correct or partial (partial explicitly 0)
    const quizStat = stat({ attempts: 2, correct: 0, partial: 0 });

    // #when / #then
    expect(isNotUnderstood(quizStat)).toBe(true);
  });

  it('returns false when partial >= 1 (overlaps with close, not notUnderstood)', () => {
    // #given — has partial attempts, so it's "close" not "not understood"
    const quizStat = stat({ attempts: 1, correct: 0, partial: 1 });

    // #when / #then
    expect(isNotUnderstood(quizStat)).toBe(false);
  });

  it('returns false when correct >= 1 (understood because answered correctly)', () => {
    // #given — has correct attempts
    const quizStat = stat({ attempts: 2, correct: 1, partial: undefined });

    // #when / #then
    expect(isNotUnderstood(quizStat)).toBe(false);
  });

  it('returns false when attempts === 0 (never attempted)', () => {
    // #given — never attempted
    const quizStat = stat({ attempts: 0, correct: 0, partial: undefined });

    // #when / #then
    expect(isNotUnderstood(quizStat)).toBe(false);
  });
});

describe('deriveQuizInsight', () => {
  it('returns zero counts for an empty quizStats record', () => {
    // #given
    const quizStats: Record<string, QuizStat> = {};

    // #when
    const insight = deriveQuizInsight(quizStats);

    // #then
    expect(insight).toEqual({ close: 0, notUnderstood: 0, guessedRight: 0 });
  });

  it('counts close questions in the close bucket', () => {
    // #given — two close (partial but not correct), two not-understood, one guessed-right
    const quizStats: Record<string, QuizStat> = {
      q1: stat({ partial: 1, correct: 0 }),
      q2: stat({ partial: 2, correct: 0 }),
      q3: stat({ attempts: 1, correct: 0, partial: 0 }),
      q4: stat({ attempts: 1, correct: 0, partial: undefined }),
      q5: stat({ correct: 1, guessedCorrect: 1 }),
    };

    // #when
    const insight = deriveQuizInsight(quizStats);

    // #then
    expect(insight.close).toBe(2);
    expect(insight.notUnderstood).toBe(2);
    expect(insight.guessedRight).toBe(1);
  });

  it('sums guessedCorrect across all stats (not just counts them)', () => {
    // #given — two questions with guessedCorrect: 2 and 3 respectively
    const quizStats: Record<string, QuizStat> = {
      q1: stat({ correct: 1, guessedCorrect: 2 }),
      q2: stat({ correct: 1, guessedCorrect: 3 }),
    };

    // #when
    const insight = deriveQuizInsight(quizStats);

    // #then — guessedRight should be 2 + 3 = 5, not 2 (count of questions)
    expect(insight.guessedRight).toBe(5);
  });

  it('ignores undefined guessedCorrect (treats as 0)', () => {
    // #given — one question with guessedCorrect: 1, one without
    const quizStats: Record<string, QuizStat> = {
      q1: stat({ correct: 1, guessedCorrect: 1 }),
      q2: stat({ correct: 1, guessedCorrect: undefined }),
    };

    // #when
    const insight = deriveQuizInsight(quizStats);

    // #then
    expect(insight.guessedRight).toBe(1);
  });
});

describe('collectQuizInsightIds', () => {
  it('returns ids in the questions array order, not quizStats insertion order', () => {
    // #given — questions in order [q3, q1, q2], but quizStats inserted as q1, q2, q3
    const questions = [{ id: 'q3' }, { id: 'q1' }, { id: 'q2' }];
    const quizStats: Record<string, QuizStat> = {
      q1: stat({ partial: 1, correct: 0 }), // close
      q2: stat({ attempts: 1, correct: 0, partial: 0 }), // notUnderstood
      q3: stat({ correct: 1, guessedCorrect: 1 }), // guessedRight
    };

    // #when
    const result = collectQuizInsightIds(questions, quizStats);

    // #then — order should be [q3, q1, q2], not insertion order
    expect(result.close).toEqual(['q1']);
    expect(result.notUnderstood).toEqual(['q2']);
    expect(result.guessedRight).toEqual(['q3']);
  });

  it('skips questions that have no quizStats entry', () => {
    // #given — q3 has no quizStats entry
    const questions = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }];
    const quizStats: Record<string, QuizStat> = {
      q1: stat({ partial: 1, correct: 0 }),
      q2: stat({ attempts: 1, correct: 0, partial: 0 }),
    };

    // #when
    const result = collectQuizInsightIds(questions, quizStats);

    // #then — q3 should not appear in any bucket
    expect(result.close).toEqual(['q1']);
    expect(result.notUnderstood).toEqual(['q2']);
    expect(result.guessedRight).toEqual([]);
  });

  it('includes guessedRight only when guessedCorrect > 0', () => {
    // #given — q1 has guessedCorrect: 0, q2 has guessedCorrect: 1
    const questions = [{ id: 'q1' }, { id: 'q2' }];
    const quizStats: Record<string, QuizStat> = {
      q1: stat({ correct: 1, guessedCorrect: 0 }),
      q2: stat({ correct: 1, guessedCorrect: 1 }),
    };

    // #when
    const result = collectQuizInsightIds(questions, quizStats);

    // #then — only q2 should be in guessedRight
    expect(result.guessedRight).toEqual(['q2']);
  });

  it('excludes guessedRight when guessedCorrect is undefined', () => {
    // #given — q1 has no guessedCorrect field
    const questions = [{ id: 'q1' }, { id: 'q2' }];
    const quizStats: Record<string, QuizStat> = {
      q1: stat({ correct: 1, guessedCorrect: undefined }),
      q2: stat({ correct: 1, guessedCorrect: 2 }),
    };

    // #when
    const result = collectQuizInsightIds(questions, quizStats);

    // #then — only q2 should be in guessedRight
    expect(result.guessedRight).toEqual(['q2']);
  });

  it('returns three empty arrays for no matches', () => {
    // #given — questions with no quizStats entries
    const questions = [{ id: 'q1' }, { id: 'q2' }];
    const quizStats: Record<string, QuizStat> = {};

    // #when
    const result = collectQuizInsightIds(questions, quizStats);

    // #then
    expect(result).toEqual({ close: [], notUnderstood: [], guessedRight: [] });
  });

  it('handles mixed buckets in the correct questions order', () => {
    // #given — questions in specific order with mixed bucket assignments
    const questions = [
      { id: 'q1' },
      { id: 'q2' },
      { id: 'q3' },
      { id: 'q4' },
    ];
    const quizStats: Record<string, QuizStat> = {
      q1: stat({ correct: 1, guessedCorrect: 1 }), // guessedRight
      q2: stat({ partial: 1, correct: 0 }), // close
      q3: stat({ attempts: 1, correct: 0, partial: 0 }), // notUnderstood
      q4: stat({ correct: 2, guessedCorrect: 0 }), // neither
    };

    // #when
    const result = collectQuizInsightIds(questions, quizStats);

    // #then — each bucket should be in question order, not stat insertion order
    expect(result.guessedRight).toEqual(['q1']);
    expect(result.close).toEqual(['q2']);
    expect(result.notUnderstood).toEqual(['q3']);
  });
});
