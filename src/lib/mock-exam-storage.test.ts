import { describe, expect, it } from 'vitest';
import {
  parseActiveMockExam,
  parseMockExamAttempt,
  parseMockExamAttempts,
  parseMockExamSession,
} from './mock-exam-storage';
import { makeAttempt, makeSession } from './mock-exam.fixture';

describe('parseMockExamSession', () => {
  it('round-trips a valid in-progress session', () => {
    const session = makeSession({
      currentIndex: 1,
      answers: { 'd1-q0': { selectedChoiceIds: ['a', 'b'], answeredAt: '2026-07-20T00:05:00.000Z' } },
      flaggedQuestionIds: ['d2-q0'],
    });
    expect(parseMockExamSession(JSON.parse(JSON.stringify(session)))).toEqual(session);
  });

  it('round-trips a submitted session with its submittedAt', () => {
    const session = makeSession({ status: 'submitted', submittedAt: '2026-07-20T01:00:00.000Z', updatedAt: '2026-07-20T01:00:00.000Z' });
    expect(parseMockExamSession(session)).toEqual(session);
  });

  it('strips unknown extra keys rather than carrying them through', () => {
    const session = makeSession();
    const parsed = parseMockExamSession({ ...session, sneaky: true });
    expect(parsed).toEqual(session);
    expect(parsed && 'sneaky' in parsed).toBe(false);
  });

  it('rejects a currentIndex out of range', () => {
    expect(parseMockExamSession(makeSession({ currentIndex: 3 }))).toBeNull();
    expect(parseMockExamSession(makeSession({ currentIndex: -1 }))).toBeNull();
    expect(parseMockExamSession(makeSession({ currentIndex: 1.5 }))).toBeNull();
  });

  it('rejects a duplicate question ref', () => {
    const session = makeSession({ questionRefs: [{ questionId: 'd1-q0', revision: 1 }, { questionId: 'd1-q0', revision: 1 }] });
    expect(parseMockExamSession(session)).toBeNull();
  });

  it('rejects an answer keyed by a question not in the session', () => {
    const session = makeSession({ answers: { 'not-in-exam': { selectedChoiceIds: ['a'], answeredAt: '2026-07-20T00:05:00.000Z' } } });
    expect(parseMockExamSession(session)).toBeNull();
  });

  it('rejects an answer with a duplicate or non-string selected choice', () => {
    expect(parseMockExamSession(makeSession({ answers: { 'd1-q0': { selectedChoiceIds: ['a', 'a'], answeredAt: '2026-07-20T00:05:00.000Z' } } }))).toBeNull();
    expect(parseMockExamSession(makeSession({ answers: { 'd1-q0': { selectedChoiceIds: [1] as unknown as string[], answeredAt: '2026-07-20T00:05:00.000Z' } } }))).toBeNull();
    // An empty stored selection is corruption: the engine removes cleared answers.
    expect(parseMockExamSession(makeSession({ answers: { 'd1-q0': { selectedChoiceIds: [], answeredAt: '2026-07-20T00:05:00.000Z' } } }))).toBeNull();
  });

  it('rejects a flagged id not in the session and a duplicate flag', () => {
    expect(parseMockExamSession(makeSession({ flaggedQuestionIds: ['not-in-exam'] }))).toBeNull();
    expect(parseMockExamSession(makeSession({ flaggedQuestionIds: ['d1-q0', 'd1-q0'] }))).toBeNull();
  });

  it('rejects a malformed or impossible timestamp', () => {
    expect(parseMockExamSession(makeSession({ startedAt: 'not-a-date' }))).toBeNull();
    expect(parseMockExamSession(makeSession({ startedAt: '2026-07-20' }))).toBeNull();
    expect(parseMockExamSession(makeSession({ expiresAt: '2026-02-30T00:00:00.000Z' }))).toBeNull();
  });

  it('rejects an expiresAt that is not after startedAt', () => {
    expect(parseMockExamSession(makeSession({ expiresAt: '2026-07-20T00:00:00.000Z' }))).toBeNull();
  });

  it('rejects an updatedAt or answeredAt before the start', () => {
    expect(parseMockExamSession(makeSession({ updatedAt: '2026-07-19T23:59:59.000Z' }))).toBeNull();
    expect(parseMockExamSession(makeSession({ answers: { 'd1-q0': { selectedChoiceIds: ['a'], answeredAt: '2026-07-19T00:00:00.000Z' } } }))).toBeNull();
  });

  it('enforces submittedAt consistency with status and start', () => {
    // in_progress must not carry a submittedAt
    expect(parseMockExamSession(makeSession({ submittedAt: '2026-07-20T01:00:00.000Z' }))).toBeNull();
    // submitted must carry one, and it cannot predate the start
    expect(parseMockExamSession(makeSession({ status: 'submitted' }))).toBeNull();
    expect(parseMockExamSession(makeSession({ status: 'submitted', submittedAt: '2026-07-19T00:00:00.000Z', updatedAt: '2026-07-20T01:00:00.000Z' }))).toBeNull();
  });

  it('rejects non-record and prototype-polluting answer keys', () => {
    expect(parseMockExamSession(42)).toBeNull();
    const polluting = JSON.parse('{"id":"e","blueprintVersion":1,"status":"in_progress","questionRefs":[{"questionId":"d1-q0","revision":1}],"currentIndex":0,"answers":{"__proto__":{"selectedChoiceIds":["a"],"answeredAt":"2026-07-20T00:05:00.000Z"}},"flaggedQuestionIds":[],"startedAt":"2026-07-20T00:00:00.000Z","expiresAt":"2026-07-20T02:00:00.000Z","updatedAt":"2026-07-20T00:00:00.000Z"}');
    expect(parseMockExamSession(polluting)).toBeNull();
    expect(Object.prototype).not.toHaveProperty('selectedChoiceIds');
  });
});

describe('parseMockExamAttempt', () => {
  it('round-trips a valid attempt, including an unanswered graded entry', () => {
    const attempt = makeAttempt();
    expect(parseMockExamAttempt(JSON.parse(JSON.stringify(attempt)))).toEqual(attempt);
  });

  it('rejects an unknown outcome', () => {
    expect(parseMockExamAttempt(makeAttempt({ outcome: 'cancelled' as unknown as 'submitted' }))).toBeNull();
  });

  it('rejects an answer for a question not among the refs', () => {
    const attempt = makeAttempt({ answers: [{ questionId: 'ghost', questionRevision: 1, selectedChoiceIds: ['a'], correct: true, answeredAt: '2026-07-20T00:05:00.000Z' }] });
    expect(parseMockExamAttempt(attempt)).toBeNull();
  });

  it('rejects a completedAt before the start', () => {
    expect(parseMockExamAttempt(makeAttempt({ completedAt: '2026-07-19T00:00:00.000Z' }))).toBeNull();
  });

  it('rejects a non-boolean correctness flag', () => {
    const attempt = makeAttempt({ answers: [{ questionId: 'd1-q0', questionRevision: 1, selectedChoiceIds: ['a'], correct: 'yes' as unknown as boolean }] });
    expect(parseMockExamAttempt(attempt)).toBeNull();
  });
});

describe('parseActiveMockExam and parseMockExamAttempts', () => {
  it('accepts null for no active exam and a valid session otherwise', () => {
    expect(parseActiveMockExam(null)).toBeNull();
    expect(parseActiveMockExam(makeSession())).toEqual(makeSession());
  });

  it('signals invalid (undefined) for a malformed active exam', () => {
    expect(parseActiveMockExam({ id: 'x' })).toBeUndefined();
  });

  it('accepts an empty history and a list of valid attempts', () => {
    expect(parseMockExamAttempts([])).toEqual([]);
    expect(parseMockExamAttempts([makeAttempt()])).toEqual([makeAttempt()]);
  });

  it('rejects the whole history when one attempt is malformed', () => {
    expect(parseMockExamAttempts([makeAttempt(), { id: 'broken' }])).toBeNull();
    expect(parseMockExamAttempts('nope')).toBeNull();
  });
});
