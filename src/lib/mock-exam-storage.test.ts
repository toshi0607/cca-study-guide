import { describe, expect, it } from 'vitest';
import {
  parseActiveMockExam,
  parseMockExamAttempt,
  parseMockExamAttempts,
  parseMockExamSession,
} from './mock-exam-storage';
import { defaultMockExamBlueprint } from './mock-exam-blueprint';
import { createMockExamSession, gradeMockExamAttempt, setMockExamAnswer, submitMockExam } from './mock-exam';
import { makeAttempt, makeBank, makeSession, seededRandom } from './mock-exam.fixture';

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

  it('enforces submittedAt consistency with status, start, expiry, and updatedAt', () => {
    // in_progress must not carry a submittedAt
    expect(parseMockExamSession(makeSession({ submittedAt: '2026-07-20T01:00:00.000Z' }))).toBeNull();
    // submitted must carry one, and it cannot predate the start
    expect(parseMockExamSession(makeSession({ status: 'submitted' }))).toBeNull();
    expect(parseMockExamSession(makeSession({ status: 'submitted', submittedAt: '2026-07-19T00:00:00.000Z', updatedAt: '2026-07-20T01:00:00.000Z' }))).toBeNull();
    // submittedAt must be strictly before expiry (2h window) and equal to updatedAt
    expect(parseMockExamSession(makeSession({ status: 'submitted', submittedAt: '2026-07-20T02:30:00.000Z', updatedAt: '2026-07-20T02:30:00.000Z' }))).toBeNull();
    expect(parseMockExamSession(makeSession({ status: 'submitted', submittedAt: '2026-07-20T01:00:00.000Z', updatedAt: '2026-07-20T01:05:00.000Z' }))).toBeNull();
  });

  it('accepts a submitted session whose submittedAt equals updatedAt and is before expiry', () => {
    const session = makeSession({ status: 'submitted', submittedAt: '2026-07-20T01:00:00.000Z', updatedAt: '2026-07-20T01:00:00.000Z' });
    expect(parseMockExamSession(session)).toEqual(session);
  });

  it('rejects a live answer recorded after the last update or at/after expiry', () => {
    // answeredAt after updatedAt (10 min): impossible, since every write bumps updatedAt
    expect(parseMockExamSession(makeSession({ answers: { 'd1-q0': { selectedChoiceIds: ['a'], answeredAt: '2026-07-20T00:20:00.000Z' } } }))).toBeNull();
    // answeredAt at/after expiry: writes are blocked once time is up
    expect(parseMockExamSession(makeSession({ updatedAt: '2026-07-20T02:30:00.000Z', answers: { 'd1-q0': { selectedChoiceIds: ['a'], answeredAt: '2026-07-20T02:00:00.000Z' } } }))).toBeNull();
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

  it('round-trips a valid expired attempt whose completedAt equals expiry', () => {
    const attempt = makeAttempt({
      outcome: 'expired',
      completedAt: '2026-07-20T02:00:00.000Z', // === expiresAt
    });
    expect(parseMockExamAttempt(JSON.parse(JSON.stringify(attempt)))).toEqual(attempt);
  });

  it('rejects an unknown outcome', () => {
    expect(parseMockExamAttempt(makeAttempt({ outcome: 'cancelled' as unknown as 'submitted' }))).toBeNull();
  });

  it('rejects an answer for a question not among the refs', () => {
    const attempt = makeAttempt({
      questionRefs: [{ questionId: 'd1-q0', revision: 1 }],
      answers: [{ questionId: 'ghost', questionRevision: 1, selectedChoiceIds: ['a'], correct: true, answeredAt: '2026-07-20T00:05:00.000Z' }],
    });
    expect(parseMockExamAttempt(attempt)).toBeNull();
  });

  it('requires exactly one answer per question ref', () => {
    // one ref left ungraded (missing answer)
    expect(parseMockExamAttempt(makeAttempt({ answers: [{ questionId: 'd1-q0', questionRevision: 1, selectedChoiceIds: ['a'], correct: true, answeredAt: '2026-07-20T00:05:00.000Z' }] }))).toBeNull();
    // a duplicate answer for the same ref
    expect(parseMockExamAttempt(makeAttempt({ answers: [
      { questionId: 'd1-q0', questionRevision: 1, selectedChoiceIds: ['a'], correct: true, answeredAt: '2026-07-20T00:05:00.000Z' },
      { questionId: 'd1-q0', questionRevision: 1, selectedChoiceIds: ['a'], correct: true, answeredAt: '2026-07-20T00:05:00.000Z' },
    ] }))).toBeNull();
  });

  it('rejects an answer whose graded revision differs from the question ref revision', () => {
    expect(parseMockExamAttempt(makeAttempt({ answers: [
      { questionId: 'd1-q0', questionRevision: 2, selectedChoiceIds: ['a'], correct: true, answeredAt: '2026-07-20T00:05:00.000Z' },
      { questionId: 'd2-q0', questionRevision: 1, selectedChoiceIds: [], correct: false },
    ] }))).toBeNull();
  });

  it('enforces the selection / answeredAt correspondence', () => {
    // answered (non-empty selection) but no timestamp
    expect(parseMockExamAttempt(makeAttempt({ answers: [
      { questionId: 'd1-q0', questionRevision: 1, selectedChoiceIds: ['a'], correct: true },
      { questionId: 'd2-q0', questionRevision: 1, selectedChoiceIds: [], correct: false },
    ] }))).toBeNull();
    // unanswered (empty selection) but a stray timestamp
    expect(parseMockExamAttempt(makeAttempt({ answers: [
      { questionId: 'd1-q0', questionRevision: 1, selectedChoiceIds: ['a'], correct: true, answeredAt: '2026-07-20T00:05:00.000Z' },
      { questionId: 'd2-q0', questionRevision: 1, selectedChoiceIds: [], correct: false, answeredAt: '2026-07-20T00:06:00.000Z' },
    ] }))).toBeNull();
  });

  it('rejects an answer timestamped after completion', () => {
    expect(parseMockExamAttempt(makeAttempt({ answers: [
      { questionId: 'd1-q0', questionRevision: 1, selectedChoiceIds: ['a'], correct: true, answeredAt: '2026-07-20T01:30:00.000Z' }, // after completedAt 01:00
      { questionId: 'd2-q0', questionRevision: 1, selectedChoiceIds: [], correct: false },
    ] }))).toBeNull();
  });

  it('rejects a completedAt inconsistent with the outcome', () => {
    // completedAt before the start
    expect(parseMockExamAttempt(makeAttempt({ completedAt: '2026-07-19T00:00:00.000Z' }))).toBeNull();
    // submitted but completedAt at/after expiry
    expect(parseMockExamAttempt(makeAttempt({ completedAt: '2026-07-20T02:00:00.000Z' }))).toBeNull();
    // expired but completedAt not exactly at expiry
    expect(parseMockExamAttempt(makeAttempt({ outcome: 'expired', completedAt: '2026-07-20T01:00:00.000Z' }))).toBeNull();
  });

  it('rejects a non-boolean correctness flag', () => {
    const attempt = makeAttempt({ answers: [
      { questionId: 'd1-q0', questionRevision: 1, selectedChoiceIds: ['a'], correct: 'yes' as unknown as boolean, answeredAt: '2026-07-20T00:05:00.000Z' },
      { questionId: 'd2-q0', questionRevision: 1, selectedChoiceIds: [], correct: false },
    ] });
    expect(parseMockExamAttempt(attempt)).toBeNull();
  });
});

// The strict parser encodes the engine's canonical contract, so anything the
// engine actually produces must survive a JSON round trip through it. This guards
// against the parser drifting stricter than the engine (which would silently drop
// real sessions and attempts on import).
describe('engine output satisfies the storage contract', () => {
  const START = new Date('2026-07-20T00:00:00.000Z');
  let counter = 0;
  const createId = () => `exam-${(counter += 1)}`;

  function freshSession() {
    const result = createMockExamSession({ questions: makeBank(), blueprint: defaultMockExamBlueprint, now: START, random: seededRandom(5), createId });
    if (!result.ok) throw new Error('expected a session');
    return result.session;
  }

  it('round-trips a live session that has answers through parseMockExamSession', () => {
    let session = freshSession();
    const target = session.questionRefs[0].questionId;
    session = setMockExamAnswer({ session, questionId: target, selectedChoiceIds: ['a'], now: new Date(START.getTime() + 5 * 60_000) });
    expect(parseMockExamSession(JSON.parse(JSON.stringify(session)))).toEqual(session);
  });

  it('round-trips a submitted attempt through parseMockExamAttempt', () => {
    let session = freshSession();
    const target = session.questionRefs[0].questionId;
    session = setMockExamAnswer({ session, questionId: target, selectedChoiceIds: ['a'], now: new Date(START.getTime() + 5 * 60_000) });
    const submitted = submitMockExam(session, new Date(START.getTime() + 30 * 60_000));
    const graded = gradeMockExamAttempt(submitted, makeBank());
    if (!graded.ok) throw new Error('expected a graded attempt');
    expect(parseMockExamAttempt(JSON.parse(JSON.stringify(graded.attempt)))).toEqual(graded.attempt);
  });

  it('round-trips an expired attempt through parseMockExamAttempt', () => {
    const expired = submitMockExam(freshSession(), new Date(START.getTime() + 120 * 60_000)); // at expiry → expired
    const graded = gradeMockExamAttempt(expired, makeBank());
    if (!graded.ok) throw new Error('expected a graded attempt');
    expect(graded.attempt.outcome).toBe('expired');
    expect(parseMockExamAttempt(JSON.parse(JSON.stringify(graded.attempt)))).toEqual(graded.attempt);
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
