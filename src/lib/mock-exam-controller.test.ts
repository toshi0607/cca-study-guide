import { describe, expect, it } from 'vitest';
import { createEmptyStudyData } from './storage';
import { defaultMockExamBlueprint } from './mock-exam';
import { makeAttempt, makeBank, makeQuestion, makeSession, seededRandom } from './mock-exam.fixture';
import {
  applyMockExamCreate,
  applyMockExamDiscard,
  applyMockExamSessionChange,
  finalizeMockExam,
} from './mock-exam-controller';
import { setMockExamAnswer, toggleMockExamFlag } from './mock-exam';

const createId = () => 'exam-1';
const START = new Date('2026-07-20T00:00:00.000Z');
const PAST_EXPIRY = new Date('2026-07-20T03:00:00.000Z');

describe('applyMockExamCreate', () => {
  it('sets an active session on a clean document', () => {
    const { data, result } = applyMockExamCreate(createEmptyStudyData(), {
      questions: makeBank(), blueprint: defaultMockExamBlueprint, now: START, random: seededRandom(1), createId,
    });
    expect(result.ok).toBe(true);
    expect(data.activeMockExam?.status).toBe('in_progress');
    expect(data.activeMockExam?.questionRefs).toHaveLength(60);
  });

  it('never replaces a session already in flight', () => {
    const seeded = { ...createEmptyStudyData(), activeMockExam: makeSession() };
    const { data, result } = applyMockExamCreate(seeded, {
      questions: makeBank(), blueprint: defaultMockExamBlueprint, now: START, random: seededRandom(1), createId,
    });
    expect(result).toEqual({ ok: false, reason: 'exam-in-progress' });
    expect(data.activeMockExam).toBe(seeded.activeMockExam);
  });

  it('passes an insufficient-bank rejection through untouched', () => {
    const { data, result } = applyMockExamCreate(createEmptyStudyData(), {
      questions: makeBank(5), blueprint: defaultMockExamBlueprint, now: START, random: seededRandom(1), createId,
    });
    expect(result.ok).toBe(false);
    expect(data.activeMockExam).toBeNull();
  });
});

describe('applyMockExamSessionChange', () => {
  it('returns the same data reference on an engine no-op', () => {
    const data = { ...createEmptyStudyData(), activeMockExam: makeSession() };
    const next = applyMockExamSessionChange(data, (session) => setMockExamAnswer({
      session, questionId: 'not-in-session', selectedChoiceIds: ['a'], now: START,
    }));
    expect(next).toBe(data);
  });

  it('records a real answer change', () => {
    const data = { ...createEmptyStudyData(), activeMockExam: makeSession() };
    const next = applyMockExamSessionChange(data, (session) => setMockExamAnswer({
      session, questionId: 'd1-q0', selectedChoiceIds: ['a'], now: new Date('2026-07-20T00:05:00.000Z'),
    }));
    expect(next).not.toBe(data);
    expect(next.activeMockExam?.answers['d1-q0'].selectedChoiceIds).toEqual(['a']);
  });

  it('toggles a flag', () => {
    const data = { ...createEmptyStudyData(), activeMockExam: makeSession() };
    const next = applyMockExamSessionChange(data, (session) => toggleMockExamFlag(session, 'd2-q0', new Date('2026-07-20T00:05:00.000Z')));
    expect(next.activeMockExam?.flaggedQuestionIds).toContain('d2-q0');
  });

  it('is a no-op when no session is active', () => {
    const data = createEmptyStudyData();
    const next = applyMockExamSessionChange(data, (session) => session);
    expect(next).toBe(data);
  });
});

describe('finalizeMockExam — explicit submit', () => {
  it('grades, stores exactly one attempt, and clears the active session', () => {
    const session = makeSession({ answers: { 'd1-q0': { selectedChoiceIds: ['a'], answeredAt: '2026-07-20T00:05:00.000Z' } } });
    const data = { ...createEmptyStudyData(), activeMockExam: session };
    const { data: next, outcome } = finalizeMockExam(data, { questions: makeBank(), mode: 'submit', now: new Date('2026-07-20T00:30:00.000Z') });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) throw new Error('expected ok');
    expect(outcome.attempt.outcome).toBe('submitted');
    expect(next.activeMockExam).toBeNull();
    expect(next.mockExamAttempts).toHaveLength(1);
    expect(next.mockExamAttempts[0].id).toBe(session.id);
  });

  it('does not append a second attempt for an id already stored (exactly-once)', () => {
    const session = makeSession();
    const data = { ...createEmptyStudyData(), activeMockExam: session, mockExamAttempts: [makeAttempt({ id: session.id })] };
    const { data: next, outcome } = finalizeMockExam(data, { questions: makeBank(), mode: 'submit', now: new Date('2026-07-20T00:30:00.000Z') });
    expect(outcome.ok).toBe(true);
    expect(next.mockExamAttempts).toHaveLength(1);
    expect(next.activeMockExam).toBeNull();
  });

  it('returns no-active once the session is already cleared (serialized double finalize)', () => {
    const data = { ...createEmptyStudyData(), activeMockExam: makeSession() };
    const first = finalizeMockExam(data, { questions: makeBank(), mode: 'submit', now: new Date('2026-07-20T00:30:00.000Z') });
    const second = finalizeMockExam(first.data, { questions: makeBank(), mode: 'submit', now: new Date('2026-07-20T00:31:00.000Z') });
    expect(second.outcome).toEqual({ ok: false, reason: 'no-active' });
    expect(second.data.mockExamAttempts).toHaveLength(1);
  });

  it('preserves existing attempts when clearing the active session', () => {
    const prior = makeAttempt({ id: 'prior' });
    const session = makeSession({ id: 'exam-2' });
    const data = { ...createEmptyStudyData(), activeMockExam: session, mockExamAttempts: [prior] };
    const { data: next } = finalizeMockExam(data, { questions: makeBank(), mode: 'submit', now: new Date('2026-07-20T00:30:00.000Z') });
    expect(next.mockExamAttempts.map((a) => a.id)).toEqual(['prior', 'exam-2']);
  });
});

describe('finalizeMockExam — automatic expiry', () => {
  it('does nothing before the deadline', () => {
    const data = { ...createEmptyStudyData(), activeMockExam: makeSession() };
    const { data: next, outcome } = finalizeMockExam(data, { questions: makeBank(), mode: 'expire', now: new Date('2026-07-20T01:00:00.000Z') });
    expect(outcome).toEqual({ ok: false, reason: 'not-due' });
    expect(next).toBe(data);
  });

  it('grades an expired attempt once the deadline has passed', () => {
    const data = { ...createEmptyStudyData(), activeMockExam: makeSession() };
    const { data: next, outcome } = finalizeMockExam(data, { questions: makeBank(), mode: 'expire', now: PAST_EXPIRY });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) throw new Error('expected ok');
    expect(outcome.attempt.outcome).toBe('expired');
    expect(next.activeMockExam).toBeNull();
    expect(next.mockExamAttempts).toHaveLength(1);
  });
});

describe('finalizeMockExam — compatibility', () => {
  it('refuses to grade or clear when content revision changed', () => {
    const session = makeSession();
    const data = { ...createEmptyStudyData(), activeMockExam: session };
    // Bump d1-q0 to revision 2 so the session ref (revision 1) is stale.
    const bank = makeBank().map((q) => (q.id === 'd1-q0' ? makeQuestion('d1-q0', 'd1', 0, { revision: 2 }) : q));
    const { data: next, outcome } = finalizeMockExam(data, { questions: bank, mode: 'submit', now: new Date('2026-07-20T00:30:00.000Z') });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) throw new Error('expected failure');
    expect(outcome.reason).toBe('incompatible-content');
    expect(next.activeMockExam).toBe(session);
    expect(next.mockExamAttempts).toHaveLength(0);
  });
});

describe('applyMockExamDiscard', () => {
  it('clears the active session but keeps history', () => {
    const prior = makeAttempt({ id: 'prior' });
    const data = { ...createEmptyStudyData(), activeMockExam: makeSession(), mockExamAttempts: [prior] };
    const next = applyMockExamDiscard(data);
    expect(next.activeMockExam).toBeNull();
    expect(next.mockExamAttempts).toEqual([prior]);
  });

  it('is a no-op with no active session', () => {
    const data = createEmptyStudyData();
    expect(applyMockExamDiscard(data)).toBe(data);
  });
});
