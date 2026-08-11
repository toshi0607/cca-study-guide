import { describe, expect, it } from 'vitest';
import type { ReviewState } from './scheduler';
import { createEmptyStudyData, type QuizStat } from './storage-schema';
import { makeAttempt } from './mock-exam.fixture';
import { buildStudySummary, SUMMARY_ID_LIMIT, type StudySummaryInput, type SummaryCard, type SummaryDomain, type SummaryQuestion } from './study-summary';

const NOW = new Date('2026-08-11T00:00:00.000Z');

const card = (id: string, domainId = 'd1', revision = 1): SummaryCard => ({ id, domainId, revision });
const question = (id: string, domainId = 'd1'): SummaryQuestion => ({ id, domainId });
const domain = (id: string, number: number): SummaryDomain => ({ id, number });

const reviewState = (overrides: Partial<ReviewState> & { cardId: string }): ReviewState => ({
  cardRevisionSeen: 1,
  dueAt: '2099-01-01T00:00:00.000Z',
  intervalDays: 3,
  streak: 1,
  lapses: 0,
  lastRating: 'good',
  ...overrides,
});

const quizStat = (overrides: Partial<QuizStat> = {}): QuizStat => ({
  attempts: 1,
  correct: 1,
  lastAnsweredAt: '2026-08-01T00:00:00.000Z',
  lastCorrect: true,
  ...overrides,
});

function baseInput(overrides: Partial<StudySummaryInput> = {}): StudySummaryInput {
  return {
    data: createEmptyStudyData(),
    cards: [],
    questions: [],
    domains: [],
    studyGuideTotal: 0,
    studyGuideCompleted: 0,
    handsOnTotal: 0,
    handsOnCompleted: 0,
    now: NOW,
    ...overrides,
  };
}

describe('buildStudySummary', () => {
  it('returns a string with reviewed 0 and no weak cards for an empty StudyData set', () => {
    // #given an empty StudyData store and no content at all
    const input = baseInput();
    // #when
    const summary = buildStudySummary(input);
    // #then
    expect(summary).toContain('reviewed 0/');
    expect(summary).toContain('Weak card ids: none');
  });

  it('lists weak card ids for cards last rated again or with 2+ lapses', () => {
    // #given a card last rated again and a separate card with 2 recorded lapses
    const cards = [card('c-again'), card('c-lapses')];
    const data = {
      ...createEmptyStudyData(),
      reviews: {
        'c-again': reviewState({ cardId: 'c-again', lastRating: 'again' }),
        'c-lapses': reviewState({ cardId: 'c-lapses', lastRating: 'good', lapses: 2 }),
      },
    };
    const input = baseInput({ data, cards });
    // #when
    const summary = buildStudySummary(input);
    // #then
    expect(summary).toContain('Weak card ids: c-again, c-lapses');
  });

  it('truncates weak card ids beyond SUMMARY_ID_LIMIT and appends a remainder count', () => {
    // #given more weak cards than the display limit
    const overflow = 5;
    const cards = Array.from({ length: SUMMARY_ID_LIMIT + overflow }, (_, index) => card(`c${index}`));
    const reviews = Object.fromEntries(cards.map((c) => [c.id, reviewState({ cardId: c.id, lastRating: 'again' })]));
    const data = { ...createEmptyStudyData(), reviews };
    const input = baseInput({ data, cards });
    // #when
    const summary = buildStudySummary(input);
    // #then
    expect(summary).toContain(`(+${overflow} more)`);
  });

  it('counts a card as due when overdue, revision-mismatched, or never reviewed', () => {
    // #given a past-due card, a card whose stored revision no longer matches its content, and an unreviewed card
    const cards = [card('c-overdue', 'd1', 1), card('c-stale-rev', 'd1', 2), card('c-new', 'd1', 1)];
    const data = {
      ...createEmptyStudyData(),
      reviews: {
        'c-overdue': reviewState({ cardId: 'c-overdue', dueAt: '2020-01-01T00:00:00.000Z', cardRevisionSeen: 1 }),
        'c-stale-rev': reviewState({ cardId: 'c-stale-rev', dueAt: '2099-01-01T00:00:00.000Z', cardRevisionSeen: 1 }),
      },
    };
    const input = baseInput({ data, cards });
    // #when
    const summary = buildStudySummary(input);
    // #then
    expect(summary).toContain('due now 3');
  });

  it('does not count a card as due when its review is future-dated at the current revision', () => {
    // #given a review due far in the future, recorded at the card's current revision
    const cards = [card('c-fresh', 'd1', 1)];
    const data = {
      ...createEmptyStudyData(),
      reviews: { 'c-fresh': reviewState({ cardId: 'c-fresh', dueAt: '2099-01-01T00:00:00.000Z', cardRevisionSeen: 1 }) },
    };
    const input = baseInput({ data, cards });
    // #when
    const summary = buildStudySummary(input);
    // #then
    expect(summary).toContain('due now 0');
  });

  it('lists a quiz question as low accuracy only once it has 2+ attempts and under half correct', () => {
    // #given a question missed on 2 of 3 attempts, a question missed once, and a question answered well
    const questions = [question('q-low'), question('q-single-wrong'), question('q-good')];
    const data = {
      ...createEmptyStudyData(),
      quizStats: {
        'q-low': quizStat({ attempts: 3, correct: 1, lastCorrect: false }),
        'q-single-wrong': quizStat({ attempts: 1, correct: 0, lastCorrect: false }),
        'q-good': quizStat({ attempts: 3, correct: 3, lastCorrect: true }),
      },
    };
    const input = baseInput({ data, questions });
    // #when
    const summary = buildStudySummary(input);
    // #then
    // Scoped to the low-accuracy line: q-single-wrong legitimately appears in the
    // "never correct or partial" line, which is a different bucket.
    const lowAccuracyLine = summary.split('\n').find((line) => line.includes('under half the time'))!;
    expect(lowAccuracyLine).toContain('q-low');
    expect(lowAccuracyLine).not.toContain('q-single-wrong');
  });

  it('renders exactly one domain row per input domain, labeled with its D-number', () => {
    // #given two domains
    const domains = [domain('d1', 1), domain('d2', 2)];
    const input = baseInput({ domains });
    // #when
    const summary = buildStudySummary(input);
    // #then
    const domainLines = summary.split('\n').filter((line) => line.startsWith('- D'));
    expect(domainLines).toHaveLength(2);
    expect(domainLines[0]).toContain('D1:');
    expect(domainLines[1]).toContain('D2:');
  });

  it('reports no completed attempt when no mock exam attempt exists', () => {
    // #given the default empty StudyData, which has no mock exam attempts
    const input = baseInput();
    // #when
    const summary = buildStudySummary(input);
    // #then
    expect(summary).toContain('Mock exam: no completed attempt');
  });

  it('reports the most recently completed attempt\'s raw correct count out of its question total', () => {
    // #given an earlier fully-correct attempt and a later attempt with one wrong answer
    const earlier = makeAttempt({
      id: 'exam-1',
      completedAt: '2026-08-01T00:00:00.000Z',
      questionRefs: [{ questionId: 'd1-q0', revision: 1 }],
      answers: [{ questionId: 'd1-q0', questionRevision: 1, selectedChoiceIds: ['a'], correct: true, answeredAt: '2026-08-01T00:05:00.000Z' }],
    });
    const later = makeAttempt({
      id: 'exam-2',
      completedAt: '2026-08-05T00:00:00.000Z',
      questionRefs: [{ questionId: 'd1-q0', revision: 1 }, { questionId: 'd2-q0', revision: 1 }],
      answers: [
        { questionId: 'd1-q0', questionRevision: 1, selectedChoiceIds: ['a'], correct: true, answeredAt: '2026-08-05T00:05:00.000Z' },
        { questionId: 'd2-q0', questionRevision: 1, selectedChoiceIds: [], correct: false },
      ],
    });
    const data = { ...createEmptyStudyData(), mockExamAttempts: [earlier, later] };
    const input = baseInput({ data });
    // #when
    const summary = buildStudySummary(input);
    // #then
    expect(summary).toContain('Mock exam: 2 attempt(s), latest 1/2 correct');
  });
});
