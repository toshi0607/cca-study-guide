// Test-only helpers for the Mock Exam engine. The real question bank cannot yet
// supply a 60-question exam (see the audit in tasks/task-8a-mock-exam-foundation.md),
// so unit tests build synthetic banks large enough to exercise selection, and
// synthetic sessions/attempts for the storage round-trips. Not imported by the
// app, so it never reaches the client bundle.
import type { ChoiceQuestion, QuestionDifficulty, SkillId } from '../content/types';
import { questionDifficulties } from '../content/types';
import type { MockExamAttempt, MockExamSession } from './mock-exam-types';

// A deterministic linear-congruential generator, mirroring the one the quiz
// tests use, so selection is reproducible without touching Math.random.
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const skillCycle: SkillId[] = ['agent-loop', 'orchestration', 'tool-design', 'evaluation'];

export function makeQuestion(id: string, domainId: string, index: number, overrides: Partial<ChoiceQuestion> = {}): ChoiceQuestion {
  const difficulty: QuestionDifficulty = questionDifficulties[index % questionDifficulties.length];
  // Every third question is a two-answer multiple-select, the rest single.
  const multiple = index % 3 === 2;
  const base: ChoiceQuestion = {
    id,
    revision: 1,
    domainId,
    objectiveIds: [`${domainId.slice(1)}.1`],
    format: multiple ? 'multiple' : 'single',
    difficulty,
    skills: [skillCycle[index % skillCycle.length]],
    stem: { ja: `${id} 問題`, en: `${id} stem` },
    choices: [
      { id: 'a', text: { ja: 'a', en: 'a' } },
      { id: 'b', text: { ja: 'b', en: 'b' } },
      { id: 'c', text: { ja: 'c', en: 'c' } },
      { id: 'd', text: { ja: 'd', en: 'd' } },
    ],
    correctChoiceIds: multiple ? ['a', 'b'] : ['a'],
    explanation: { ja: '解説', en: 'explanation' },
    sourceIds: ['exam-guide'],
    verifiedAt: '2026-07-14',
  };
  return { ...base, ...overrides };
}

// A bank with `perDomain` questions in each of the five domains (default 20,
// comfortably above the 16/11/12/12/9 quota). Ids are stable: `d1-q0`, `d1-q1`, …
export function makeBank(perDomain = 20): ChoiceQuestion[] {
  const domainIds = ['d1', 'd2', 'd3', 'd4', 'd5'];
  const bank: ChoiceQuestion[] = [];
  for (const domainId of domainIds) {
    for (let index = 0; index < perDomain; index += 1) {
      bank.push(makeQuestion(`${domainId}-q${index}`, domainId, index));
    }
  }
  return bank;
}

// A bank with a custom count per domain, for shortage tests.
export function makeBankWith(counts: Record<string, number>): ChoiceQuestion[] {
  const bank: ChoiceQuestion[] = [];
  for (const [domainId, count] of Object.entries(counts)) {
    for (let index = 0; index < count; index += 1) {
      bank.push(makeQuestion(`${domainId}-q${index}`, domainId, index));
    }
  }
  return bank;
}

// Builds a minimal valid in-progress session over the given question refs.
export function makeSession(overrides: Partial<MockExamSession> = {}): MockExamSession {
  const startedAt = '2026-07-20T00:00:00.000Z';
  return {
    id: 'exam-1',
    blueprintVersion: 1,
    status: 'in_progress',
    questionRefs: [
      { questionId: 'd1-q0', revision: 1 },
      { questionId: 'd2-q0', revision: 1 },
      { questionId: 'd3-q0', revision: 1 },
    ],
    currentIndex: 0,
    answers: {},
    flaggedQuestionIds: [],
    startedAt,
    expiresAt: '2026-07-20T02:00:00.000Z',
    updatedAt: startedAt,
    ...overrides,
  };
}

export function makeAttempt(overrides: Partial<MockExamAttempt> = {}): MockExamAttempt {
  const startedAt = '2026-07-20T00:00:00.000Z';
  return {
    id: 'exam-1',
    blueprintVersion: 1,
    outcome: 'submitted',
    questionRefs: [
      { questionId: 'd1-q0', revision: 1 },
      { questionId: 'd2-q0', revision: 1 },
    ],
    answers: [
      { questionId: 'd1-q0', questionRevision: 1, selectedChoiceIds: ['a'], correct: true, answeredAt: '2026-07-20T00:05:00.000Z' },
      { questionId: 'd2-q0', questionRevision: 1, selectedChoiceIds: [], correct: false },
    ],
    flaggedQuestionIds: ['d2-q0'],
    startedAt,
    expiresAt: '2026-07-20T02:00:00.000Z',
    completedAt: '2026-07-20T01:00:00.000Z',
    ...overrides,
  };
}
