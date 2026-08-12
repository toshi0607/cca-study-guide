import { describe, it, expect } from 'vitest';
import { countAnsweredExamQuestions } from './mock-exam-overlap';

describe('countAnsweredExamQuestions', () => {
  it('returns 0 when quizStats is empty', () => {
    const questions = [
      { id: 'q1' },
      { id: 'q2' },
      { id: 'q3' },
    ] as const;
    const quizStats: Record<string, unknown> = {};
    expect(countAnsweredExamQuestions(questions, quizStats)).toBe(0);
  });

  it('returns the total count when all questions are answered', () => {
    const questions = [
      { id: 'q1' },
      { id: 'q2' },
      { id: 'q3' },
    ] as const;
    const quizStats: Record<string, unknown> = {
      q1: { attempts: 1, correct: 1 },
      q2: { attempts: 2, correct: 1 },
      q3: { attempts: 1, correct: 0 },
    };
    expect(countAnsweredExamQuestions(questions, quizStats)).toBe(3);
  });

  it('returns the partial count when some questions are answered', () => {
    const questions = [
      { id: 'q1' },
      { id: 'q2' },
      { id: 'q3' },
      { id: 'q4' },
    ] as const;
    const quizStats: Record<string, unknown> = {
      q1: { attempts: 1, correct: 1 },
      q3: { attempts: 2, correct: 1 },
    };
    expect(countAnsweredExamQuestions(questions, quizStats)).toBe(2);
  });

  it('does not count quiz entries for questions outside the exam bank', () => {
    const questions = [
      { id: 'q1' },
      { id: 'q2' },
    ] as const;
    const quizStats: Record<string, unknown> = {
      q1: { attempts: 1, correct: 1 },
      q2: { attempts: 1, correct: 1 },
      q999: { attempts: 1, correct: 1 }, // Not in exam
    };
    expect(countAnsweredExamQuestions(questions, quizStats)).toBe(2);
  });

  it('does not treat an inherited Object member as an answered question', () => {
    expect(countAnsweredExamQuestions([{ id: 'constructor' }, { id: 'toString' }], {})).toBe(0);
  });
});
