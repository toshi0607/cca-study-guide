import { describe, expect, it } from 'vitest';
import type { ChoiceQuestion } from '../content/types';
import type { MockExamAttempt, MockExamAttemptAnswer } from './mock-exam-types';
import { makeBank, makeQuestion } from './mock-exam.fixture';
import {
  analyzeMockExams,
  evidenceLevelFor,
  EVIDENCE_LIMITED_MIN,
  EVIDENCE_SUFFICIENT_MIN,
  type MockExamAxisStat,
} from './mock-exam-analysis';

const bank = makeBank(20); // d1-q0..d1-q19, …, d5-q0..d5-q19, all revision 1

// A compatible answer on an existing bank question (revision 1 by default).
function ans(questionId: string, correct: boolean, opts: { answered?: boolean; revision?: number } = {}): MockExamAttemptAnswer {
  const answered = opts.answered ?? true;
  const base: MockExamAttemptAnswer = {
    questionId,
    questionRevision: opts.revision ?? 1,
    selectedChoiceIds: answered ? ['a'] : [],
    correct,
  };
  return answered ? { ...base, answeredAt: '2026-07-20T00:05:00.000Z' } : base;
}

// `count` answered answers on `${domainId}-q0..` — the first `correctCount` correct.
function domainAnswers(domainId: string, count: number, correctCount: number): MockExamAttemptAnswer[] {
  return Array.from({ length: count }, (_unused, index) => ans(`${domainId}-q${index}`, index < correctCount));
}

function attempt(id: string, completedAt: string, answers: MockExamAttemptAnswer[], outcome: 'submitted' | 'expired' = 'submitted'): MockExamAttempt {
  return {
    id,
    blueprintVersion: 1,
    outcome,
    questionRefs: answers.map((answer) => ({ questionId: answer.questionId, revision: answer.questionRevision })),
    answers,
    flaggedQuestionIds: [],
    startedAt: '2026-07-20T00:00:00.000Z',
    expiresAt: '2026-07-20T02:00:00.000Z',
    completedAt,
  };
}

const axisByKey = (axes: readonly MockExamAxisStat[], key: string): MockExamAxisStat | undefined => axes.find((axis) => axis.key === key);

// Builds an attempt covering all five domains with `perDomain` answers each and a
// total of `totalCorrect` correct answers, distributed greedily across domains.
function uniformAttempt(id: string, completedAt: string, perDomain: number, totalCorrect: number): MockExamAttempt {
  const domains = ['d1', 'd2', 'd3', 'd4', 'd5'];
  let remaining = totalCorrect;
  const answers: MockExamAttemptAnswer[] = [];
  for (const domainId of domains) {
    const correctHere = Math.max(0, Math.min(perDomain, remaining));
    remaining -= correctHere;
    answers.push(...domainAnswers(domainId, perDomain, correctHere));
  }
  return attempt(id, completedAt, answers);
}

describe('evidenceLevelFor', () => {
  it('uses the centralized boundaries 4/5/14/15', () => {
    expect(evidenceLevelFor(0)).toBe('insufficient');
    expect(evidenceLevelFor(4)).toBe('insufficient');
    expect(evidenceLevelFor(EVIDENCE_LIMITED_MIN)).toBe('limited'); // 5
    expect(evidenceLevelFor(5)).toBe('limited');
    expect(evidenceLevelFor(14)).toBe('limited');
    expect(evidenceLevelFor(EVIDENCE_SUFFICIENT_MIN)).toBe('sufficient'); // 15
    expect(evidenceLevelFor(15)).toBe('sufficient');
    expect(evidenceLevelFor(100)).toBe('sufficient');
  });
});

describe('analyzeMockExams — empty and tiny inputs', () => {
  it('handles no attempts without throwing or dividing by zero', () => {
    const analysis = analyzeMockExams([], bank, 'all-time');
    expect(analysis.attemptCount).toBe(0);
    expect(analysis.totalAttemptCount).toBe(0);
    expect(analysis.compatibleAnswerCount).toBe(0);
    expect(analysis.staleAnswerCount).toBe(0);
    expect(analysis.byDomain).toHaveLength(5);
    expect(analysis.byDomain.every((axis) => axis.total === 0 && axis.rawAccuracy === 0)).toBe(true);
    expect(analysis.byDifficulty).toHaveLength(3);
    expect(analysis.bySkill).toHaveLength(0);
    expect(analysis.trend).toEqual([]);
    expect(analysis.stability).toBe('insufficient_data');
    expect(analysis.reviewPriority.domain).toEqual({ status: 'insufficient' });
    expect(analysis.reviewPriority.skill).toEqual({ status: 'insufficient' });
    // With zero attempts the only sensible nudge is to take an exam.
    expect(analysis.nextActions).toContainEqual({ type: 'take-another-exam' });
  });

  it('treats a single attempt as insufficient data for stability', () => {
    const analysis = analyzeMockExams([uniformAttempt('a', '2026-07-20T01:00:00Z', 20, 10)], bank, 'all-time');
    expect(analysis.totalAttemptCount).toBe(1);
    expect(analysis.stability).toBe('insufficient_data');
  });

  it('does not produce NaN for an attempt with zero answers', () => {
    const analysis = analyzeMockExams([attempt('a', '2026-07-20T01:00:00Z', [])], bank, 'all-time');
    expect(analysis.trend[0].rawAccuracy).toBe(0);
    expect(Number.isNaN(analysis.trend[0].rawAccuracy)).toBe(false);
    expect(analysis.byDomain.every((axis) => !Number.isNaN(axis.rawAccuracy))).toBe(true);
  });
});

describe('analyzeMockExams — ordering', () => {
  it('orders trend ascending by completedAt', () => {
    const attempts = [
      attempt('late', '2026-07-22T00:00:00Z', domainAnswers('d1', 2, 1)),
      attempt('early', '2026-07-20T00:00:00Z', domainAnswers('d1', 2, 1)),
      attempt('mid', '2026-07-21T00:00:00Z', domainAnswers('d1', 2, 1)),
    ];
    const analysis = analyzeMockExams(attempts, bank, 'all-time');
    expect(analysis.trend.map((point) => point.attemptId)).toEqual(['early', 'mid', 'late']);
  });

  it('breaks completedAt ties deterministically by attempt id', () => {
    const sameTime = '2026-07-20T00:00:00Z';
    const attempts = [
      attempt('exam-c', sameTime, domainAnswers('d1', 2, 1)),
      attempt('exam-a', sameTime, domainAnswers('d1', 2, 1)),
      attempt('exam-b', sameTime, domainAnswers('d1', 2, 1)),
    ];
    const analysis = analyzeMockExams(attempts, bank, 'all-time');
    expect(analysis.trend.map((point) => point.attemptId)).toEqual(['exam-a', 'exam-b', 'exam-c']);
  });

  it('recent-3 selects the three most recent attempts, all-time selects everything', () => {
    const attempts = [
      attempt('a1', '2026-07-20T00:00:00Z', domainAnswers('d1', 2, 2)),
      attempt('a2', '2026-07-21T00:00:00Z', domainAnswers('d1', 2, 2)),
      attempt('a3', '2026-07-22T00:00:00Z', domainAnswers('d1', 2, 0)),
      attempt('a4', '2026-07-23T00:00:00Z', domainAnswers('d1', 2, 0)),
    ];
    const allTime = analyzeMockExams(attempts, bank, 'all-time');
    const recent = analyzeMockExams(attempts, bank, 'recent-3');
    expect(allTime.attemptCount).toBe(4);
    expect(recent.attemptCount).toBe(3);
    expect(recent.totalAttemptCount).toBe(4);
    // a1 (oldest) is excluded from recent-3, so its 2 compatible answers drop out.
    expect(allTime.compatibleAnswerCount).toBe(8);
    expect(recent.compatibleAnswerCount).toBe(6);
    // Trend is always full history regardless of range.
    expect(recent.trend).toHaveLength(4);
  });
});

describe('analyzeMockExams — axis aggregation', () => {
  it('aggregates by domain from compatible answers', () => {
    const attempts = [attempt('a', '2026-07-20T01:00:00Z', [
      ...domainAnswers('d1', 4, 3),
      ...domainAnswers('d2', 2, 0),
    ])];
    const analysis = analyzeMockExams(attempts, bank, 'all-time');
    const d1 = axisByKey(analysis.byDomain, 'd1')!;
    expect(d1).toMatchObject({ total: 4, answered: 4, unanswered: 0, correct: 3, incorrect: 1 });
    expect(d1.rawAccuracy).toBeCloseTo(0.75);
    const d2 = axisByKey(analysis.byDomain, 'd2')!;
    expect(d2).toMatchObject({ total: 2, correct: 0, incorrect: 2 });
    const d3 = axisByKey(analysis.byDomain, 'd3')!;
    expect(d3.total).toBe(0);
  });

  it('aggregates by difficulty and always returns all three levels', () => {
    // makeQuestion cycles difficulty foundation/application/analysis by index.
    const analysis = analyzeMockExams([attempt('a', '2026-07-20T01:00:00Z', domainAnswers('d1', 6, 3))], bank, 'all-time');
    expect(analysis.byDifficulty.map((axis) => axis.key)).toEqual(['foundation', 'application', 'analysis']);
    const totalByDifficulty = analysis.byDifficulty.reduce((sum, axis) => sum + axis.total, 0);
    expect(totalByDifficulty).toBe(6);
  });

  it('counts a multi-skill question toward every skill, so by-skill can exceed the answer count', () => {
    const multiSkill = makeQuestion('m1', 'd1', 0, { skills: ['agent-loop', 'orchestration', 'evaluation'] });
    const localBank: ChoiceQuestion[] = [...bank, multiSkill];
    const attempts = [attempt('a', '2026-07-20T01:00:00Z', [ans('m1', true)])];
    const analysis = analyzeMockExams(attempts, localBank, 'all-time');
    expect(analysis.compatibleAnswerCount).toBe(1);
    const skillTotals = analysis.bySkill.reduce((sum, axis) => sum + axis.total, 0);
    expect(skillTotals).toBe(3); // one answer counted into three skills
    expect(axisByKey(analysis.bySkill, 'agent-loop')!.correct).toBe(1);
    expect(axisByKey(analysis.bySkill, 'orchestration')!.correct).toBe(1);
    expect(axisByKey(analysis.bySkill, 'evaluation')!.correct).toBe(1);
  });

  it('handles a question with a skill outside the fixture cycle without crashing', () => {
    const oddSkill = makeQuestion('odd', 'd1', 0, { skills: ['human-oversight'] });
    const analysis = analyzeMockExams([attempt('a', '2026-07-20T01:00:00Z', [ans('odd', false)])], [...bank, oddSkill], 'all-time');
    expect(axisByKey(analysis.bySkill, 'human-oversight')).toMatchObject({ total: 1, correct: 0 });
  });

  it('counts unanswered questions in total and incorrect but not answered', () => {
    const attempts = [attempt('a', '2026-07-20T01:00:00Z', [
      ans('d1-q0', false, { answered: false }),
      ans('d1-q1', true),
    ])];
    const analysis = analyzeMockExams(attempts, bank, 'all-time');
    const d1 = axisByKey(analysis.byDomain, 'd1')!;
    expect(d1).toMatchObject({ total: 2, answered: 1, unanswered: 1, correct: 1, incorrect: 1 });
    expect(d1.rawAccuracy).toBeCloseTo(0.5);
  });
});

describe('analyzeMockExams — stale handling', () => {
  it('excludes stale answers (missing question / revision mismatch) from every axis but keeps them in raw totals', () => {
    const attempts = [attempt('a', '2026-07-20T01:00:00Z', [
      ans('d1-q0', true), // compatible
      ans('d1-q1', true, { revision: 2 }), // revision mismatch -> stale
      ans('ghost', true), // missing question -> stale
    ])];
    const analysis = analyzeMockExams(attempts, bank, 'all-time');
    // Only the compatible answer feeds the domain axis.
    expect(analysis.compatibleAnswerCount).toBe(1);
    expect(analysis.staleAnswerCount).toBe(2);
    expect(axisByKey(analysis.byDomain, 'd1')!.total).toBe(1);
    // Raw trend keeps all three answers: correct=3, staleCount=2.
    expect(analysis.trend[0]).toMatchObject({ correct: 3, total: 3, staleCount: 2 });
    expect(analysis.trend[0].rawAccuracy).toBeCloseTo(1);
  });

  it('uses only compatible answers of a partially-stale attempt for axes', () => {
    const attempts = [attempt('a', '2026-07-20T01:00:00Z', [
      ...domainAnswers('d1', 3, 3),
      ans('d2-q0', false, { revision: 9 }), // stale
    ])];
    const analysis = analyzeMockExams(attempts, bank, 'all-time');
    expect(axisByKey(analysis.byDomain, 'd1')!.total).toBe(3);
    expect(axisByKey(analysis.byDomain, 'd2')!.total).toBe(0);
    expect(analysis.staleAnswerCount).toBe(1);
  });
});

describe('analyzeMockExams — review priority', () => {
  it('ranks sufficient-evidence domains below the learner’s own average, lowest accuracy first', () => {
    // Single attempt, 20 answers per domain (all sufficient). Overall = 70/100 = 70%.
    const answers = [
      ...domainAnswers('d1', 20, 5), // 25%
      ...domainAnswers('d2', 20, 8), // 40%
      ...domainAnswers('d3', 20, 18), // 90%
      ...domainAnswers('d4', 20, 19), // 95%
      ...domainAnswers('d5', 20, 20), // 100%
    ];
    const analysis = analyzeMockExams([attempt('a', '2026-07-20T01:00:00Z', answers)], bank, 'all-time');
    expect(analysis.reviewPriority.domain.status).toBe('ranked');
    if (analysis.reviewPriority.domain.status !== 'ranked') throw new Error('unreachable');
    expect(analysis.reviewPriority.domain.candidates.map((candidate) => candidate.key)).toEqual(['d1', 'd2']);
  });

  it('breaks candidate ties by key when accuracy, incorrect, and count are equal', () => {
    const answers = [
      ...domainAnswers('d1', 20, 5), // 25%
      ...domainAnswers('d2', 20, 5), // 25% (tie with d1)
      ...domainAnswers('d3', 20, 20),
      ...domainAnswers('d4', 20, 20),
      ...domainAnswers('d5', 20, 20),
    ];
    const analysis = analyzeMockExams([attempt('a', '2026-07-20T01:00:00Z', answers)], bank, 'all-time');
    if (analysis.reviewPriority.domain.status !== 'ranked') throw new Error('expected ranked');
    expect(analysis.reviewPriority.domain.candidates.map((candidate) => candidate.key)).toEqual(['d1', 'd2']);
  });

  it('never makes a limited/insufficient axis a review candidate even at 0% accuracy', () => {
    const answers = [
      ...domainAnswers('d1', 20, 14), // sufficient, 70%
      ...domainAnswers('d2', 20, 20), // sufficient, 100%
      ...domainAnswers('d3', 4, 0), // insufficient, 0% — must NOT be a candidate
    ];
    const analysis = analyzeMockExams([attempt('a', '2026-07-20T01:00:00Z', answers)], bank, 'all-time');
    if (analysis.reviewPriority.domain.status === 'ranked') {
      expect(analysis.reviewPriority.domain.candidates.some((candidate) => candidate.key === 'd3')).toBe(false);
    }
    expect(axisByKey(analysis.byDomain, 'd3')!.evidenceLevel).toBe('insufficient');
  });

  it('reports "none" when sufficient axes exist but none sits below the average', () => {
    const answers = [
      ...domainAnswers('d1', 20, 20),
      ...domainAnswers('d2', 20, 20),
      ...domainAnswers('d3', 20, 20),
    ];
    const analysis = analyzeMockExams([attempt('a', '2026-07-20T01:00:00Z', answers)], bank, 'all-time');
    expect(analysis.reviewPriority.domain.status).toBe('none');
  });

  it('reports "insufficient" when no axis reaches sufficient evidence', () => {
    const analysis = analyzeMockExams([attempt('a', '2026-07-20T01:00:00Z', domainAnswers('d1', 4, 1))], bank, 'all-time');
    expect(analysis.reviewPriority.domain.status).toBe('insufficient');
  });
});

describe('analyzeMockExams — learning stability', () => {
  // 3 attempts × 40 compatible answers (8 per domain × 5) = 120 compatible, each domain 24 (sufficient).
  const stableThree = (accuracies: number[]): MockExamAttempt[] =>
    accuracies.map((correct, index) => uniformAttempt(`a${index}`, `2026-07-2${index}T00:00:00Z`, 8, correct));

  it('is insufficient_data with two attempts even when there is plenty of data', () => {
    const attempts = [uniformAttempt('a', '2026-07-20T00:00:00Z', 8, 20), uniformAttempt('b', '2026-07-21T00:00:00Z', 8, 20)];
    expect(analyzeMockExams(attempts, bank, 'all-time').stability).toBe('insufficient_data');
  });

  it('is insufficient_data when fewer than 120 compatible answers', () => {
    // 2 answers per domain × 5 × 3 attempts = 30 compatible total (< 120).
    const attempts = [
      uniformAttempt('a', '2026-07-20T00:00:00Z', 2, 1),
      uniformAttempt('b', '2026-07-21T00:00:00Z', 2, 1),
      uniformAttempt('c', '2026-07-22T00:00:00Z', 2, 1),
    ];
    expect(analyzeMockExams(attempts, bank, 'all-time').stability).toBe('insufficient_data');
  });

  it('is stable_practice when the recent-3 spread is within 10pp and every domain is sufficient', () => {
    const attempts = stableThree([20, 20, 20]); // all 50%
    expect(analyzeMockExams(attempts, bank, 'all-time').stability).toBe('stable_practice');
  });

  it('treats an exactly-10pp spread as stable (boundary, inclusive)', () => {
    // 20/40=50%, 22/40=55%, 24/40=60% -> spread exactly 10pp.
    const attempts = stableThree([20, 22, 24]);
    expect(analyzeMockExams(attempts, bank, 'all-time').stability).toBe('stable_practice');
  });

  it('treats a >10pp spread as building_evidence', () => {
    // 20/40=50%, 22/40=55%, 25/40=62.5% -> 12.5pp.
    const attempts = stableThree([20, 22, 25]);
    expect(analyzeMockExams(attempts, bank, 'all-time').stability).toBe('building_evidence');
  });

  it('still counts a consistently LOW score as stable_practice (accuracy level is not a condition)', () => {
    const attempts = stableThree([8, 8, 8]); // all 20%
    expect(analyzeMockExams(attempts, bank, 'all-time').stability).toBe('stable_practice');
  });

  it('is building_evidence when a domain has not reached sufficient evidence', () => {
    // d1 gets only 3 answers/attempt (9 total < 15); others get plenty so total >= 120.
    const build = (id: string, completedAt: string): MockExamAttempt => attempt(id, completedAt, [
      ...domainAnswers('d1', 3, 2),
      ...domainAnswers('d2', 20, 10),
      ...domainAnswers('d3', 20, 10),
      ...domainAnswers('d4', 20, 10),
      ...domainAnswers('d5', 20, 10),
    ]);
    const attempts = [build('a', '2026-07-20T00:00:00Z'), build('b', '2026-07-21T00:00:00Z'), build('c', '2026-07-22T00:00:00Z')];
    const analysis = analyzeMockExams(attempts, bank, 'all-time');
    expect(analysis.stability).toBe('building_evidence');
    expect(axisByKey(analysis.byDomain, 'd1')!.evidenceLevel).not.toBe('sufficient');
  });

  it('computes stability from all-time data even when the range is recent-3', () => {
    const attempts = stableThree([20, 20, 20]);
    expect(analyzeMockExams(attempts, bank, 'recent-3').stability).toBe('stable_practice');
  });
});

describe('analyzeMockExams — next actions', () => {
  it('caps at three actions and leads with a sufficient-evidence domain review', () => {
    const answers = [
      ...domainAnswers('d1', 20, 3), // 15% — clear review candidate
      ...domainAnswers('d2', 20, 19),
      ...domainAnswers('d3', 20, 19),
      ...domainAnswers('d4', 20, 19),
      ...domainAnswers('d5', 20, 19),
    ];
    const analysis = analyzeMockExams([attempt('a', '2026-07-20T01:00:00Z', answers)], bank, 'all-time');
    expect(analysis.nextActions.length).toBeGreaterThan(0);
    expect(analysis.nextActions.length).toBeLessThanOrEqual(3);
    expect(analysis.nextActions[0]).toEqual({ type: 'review-domain', key: 'd1' });
  });

  it('recommends retaking with the latest questions when most answers are stale', () => {
    const attempts = [attempt('a', '2026-07-20T01:00:00Z', [
      ans('d1-q0', true),
      ans('ghost1', true),
      ans('ghost2', true),
    ])];
    const analysis = analyzeMockExams(attempts, bank, 'all-time');
    expect(analysis.nextActions).toContainEqual({ type: 'retake-latest' });
  });
});

describe('analyzeMockExams — purity', () => {
  const sample = (): MockExamAttempt[] => [
    uniformAttempt('a', '2026-07-20T00:00:00Z', 20, 10),
    uniformAttempt('b', '2026-07-21T00:00:00Z', 20, 12),
    uniformAttempt('c', '2026-07-22T00:00:00Z', 20, 8),
  ];

  it('returns identical output for identical input', () => {
    const attempts = sample();
    expect(analyzeMockExams(attempts, bank, 'all-time')).toEqual(analyzeMockExams(attempts, bank, 'all-time'));
  });

  it('does not mutate its inputs', () => {
    const attempts = sample();
    const snapshot = JSON.stringify(attempts);
    const bankSnapshot = JSON.stringify(bank);
    analyzeMockExams(attempts, bank, 'recent-3');
    expect(JSON.stringify(attempts)).toBe(snapshot);
    expect(JSON.stringify(bank)).toBe(bankSnapshot);
  });
});
