import { describe, expect, it } from 'vitest';
import { questions } from '../content/questions';
import { defaultMockExamBlueprint } from './mock-exam-blueprint';
import {
  createMockExamSession,
  deriveMockExamProgress,
  deriveMockExamRemainingSeconds,
  deriveMockExamResult,
  expireMockExamIfNeeded,
  gradeMockExamAttempt,
  moveMockExamCursor,
  setMockExamAnswer,
  submitMockExam,
  toggleMockExamFlag,
  validateMockExamCompatibility,
} from './mock-exam';
import type { MockExamSession } from './mock-exam-types';
import { makeBank, makeBankWith, makeQuestion, seededRandom } from './mock-exam.fixture';

const START = new Date('2026-07-20T00:00:00.000Z');
const EXPIRES = new Date('2026-07-20T02:00:00.000Z'); // START + 7200s
let idCounter = 0;
const createId = () => `exam-${(idCounter += 1)}`;

function newSession(random = seededRandom(1)): MockExamSession {
  const result = createMockExamSession({ questions: makeBank(), blueprint: defaultMockExamBlueprint, now: START, random, createId });
  if (!result.ok) throw new Error(`expected a session, got ${result.reason}`);
  return result.session;
}

describe('createMockExamSession — selection', () => {
  it('draws exactly 60 unique questions in the 16/11/12/12/9 distribution', () => {
    // #when
    const session = newSession();

    // #then
    expect(session.questionRefs).toHaveLength(60);
    const ids = session.questionRefs.map((ref) => ref.questionId);
    expect(new Set(ids).size).toBe(60);
    const byDomain = ids.reduce<Record<string, number>>((counts, id) => {
      const domain = id.split('-')[0];
      counts[domain] = (counts[domain] ?? 0) + 1;
      return counts;
    }, {});
    expect(byDomain).toEqual({ d1: 16, d2: 11, d3: 12, d4: 12, d5: 9 });
  });

  it('records the content revision alongside each question id', () => {
    // #given — a bank where one question is at revision 4
    const bank = makeBank().map((question) => (question.id === 'd1-q0' ? { ...question, revision: 4 } : question));
    const result = createMockExamSession({ questions: bank, blueprint: defaultMockExamBlueprint, now: START, random: seededRandom(1), createId });

    // #then
    if (!result.ok) throw new Error('expected a session');
    const ref = result.session.questionRefs.find((entry) => entry.questionId === 'd1-q0');
    if (ref) expect(ref.revision).toBe(4);
    expect(result.session.questionRefs.every((entry) => entry.revision >= 1)).toBe(true);
  });

  it('is reproducible for the same seed and differs for another seed', () => {
    // #given
    const first = newSession(seededRandom(7));
    const same = newSession(seededRandom(7));
    const other = newSession(seededRandom(8));

    // #then — identical order under the same seed, different order under another
    expect(same.questionRefs).toEqual(first.questionRefs);
    expect(other.questionRefs).not.toEqual(first.questionRefs);
  });

  it('does not depend on the order the bank arrives in', () => {
    // #given — the same bank, reversed
    const forward = createMockExamSession({ questions: makeBank(), blueprint: defaultMockExamBlueprint, now: START, random: seededRandom(3), createId });
    const reversed = createMockExamSession({ questions: [...makeBank()].reverse(), blueprint: defaultMockExamBlueprint, now: START, random: seededRandom(3), createId });

    // #then — same seed yields the identical exam regardless of input order
    if (!forward.ok || !reversed.ok) throw new Error('expected sessions');
    expect(reversed.session.questionRefs).toEqual(forward.session.questionRefs);
  });

  it('sets the timer window from the injected clock and blueprint duration', () => {
    // #when
    const session = newSession();

    // #then
    expect(session.startedAt).toBe(START.toISOString());
    expect(session.expiresAt).toBe(EXPIRES.toISOString());
    expect(session.status).toBe('in_progress');
    expect(session.currentIndex).toBe(0);
  });
});

describe('createMockExamSession — failure', () => {
  it('fails closed with per-domain shortages when a domain cannot meet its quota', () => {
    // #given — d1 needs 16 but only 10 exist, d5 needs 9 but only 5 exist
    const bank = makeBankWith({ d1: 10, d2: 11, d3: 12, d4: 12, d5: 5 });

    // #when
    const result = createMockExamSession({ questions: bank, blueprint: defaultMockExamBlueprint, now: START, random: seededRandom(1), createId });

    // #then — every shortage is listed, and no partial exam is produced
    expect(result).toEqual({ ok: false, reason: 'insufficient-question-bank', shortages: { d1: 6, d5: 4 } });
  });

  it('fails with a typed invalid-blueprint result rather than throwing', () => {
    // #given — a distribution that sums to 59
    const result = createMockExamSession({
      questions: makeBank(),
      blueprint: { ...defaultMockExamBlueprint, domainDistribution: { d1: 16, d2: 11, d3: 12, d4: 12, d5: 8 } },
      now: START,
      random: seededRandom(1),
      createId,
    });

    // #then
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('invalid-blueprint');
    if (result.reason === 'invalid-blueprint') expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('createMockExamSession — production question bank', () => {
  const domainById = new Map(questions.map((question) => [question.id, question.domainId]));
  const revisionById = new Map(questions.map((question) => [question.id, question.revision]));

  it('builds a full 60-question exam in the blueprint distribution from the shipped bank', () => {
    // #given — the real, shipped question bank (see tasks/task-8a1-question-bank-expansion.md)
    const result = createMockExamSession({ questions, blueprint: defaultMockExamBlueprint, now: START, random: seededRandom(1), createId });

    // #then — no shortage; exactly 60 unique questions
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { questionRefs } = result.session;
    expect(questionRefs).toHaveLength(60);
    const ids = questionRefs.map((ref) => ref.questionId);
    expect(new Set(ids).size).toBe(60);

    // #then — distribution is exactly 16/11/12/12/9, keyed off each question's real domain
    const byDomain = ids.reduce<Record<string, number>>((counts, id) => {
      const domainId = domainById.get(id)!;
      counts[domainId] = (counts[domainId] ?? 0) + 1;
      return counts;
    }, {});
    expect(byDomain).toEqual({ d1: 16, d2: 11, d3: 12, d4: 12, d5: 9 });

    // #then — each ref revision matches the bank's revision for that question
    for (const ref of questionRefs) expect(ref.revision).toBe(revisionById.get(ref.questionId));
  });

  it('is reproducible for one seed and independent of the bank input order', () => {
    // #given — the same seed over the shipped bank, and over its reverse
    const forward = createMockExamSession({ questions, blueprint: defaultMockExamBlueprint, now: START, random: seededRandom(5), createId });
    const same = createMockExamSession({ questions, blueprint: defaultMockExamBlueprint, now: START, random: seededRandom(5), createId });
    const reversed = createMockExamSession({ questions: [...questions].reverse(), blueprint: defaultMockExamBlueprint, now: START, random: seededRandom(5), createId });

    // #then — identical draw regardless of input order under the same seed
    if (!forward.ok || !same.ok || !reversed.ok) throw new Error('expected sessions');
    expect(same.session.questionRefs).toEqual(forward.session.questionRefs);
    expect(reversed.session.questionRefs).toEqual(forward.session.questionRefs);
  });

  it('keeps the distribution invariant across different random inputs', () => {
    // #given — two different seeds
    const first = createMockExamSession({ questions, blueprint: defaultMockExamBlueprint, now: START, random: seededRandom(11), createId });
    const second = createMockExamSession({ questions, blueprint: defaultMockExamBlueprint, now: START, random: seededRandom(22), createId });

    // #then — different order, same 16/11/12/12/9 domain counts
    if (!first.ok || !second.ok) throw new Error('expected sessions');
    const distribution = (session: MockExamSession) =>
      session.questionRefs.reduce<Record<string, number>>((counts, ref) => {
        const domainId = domainById.get(ref.questionId)!;
        counts[domainId] = (counts[domainId] ?? 0) + 1;
        return counts;
      }, {});
    expect(distribution(first.session)).toEqual({ d1: 16, d2: 11, d3: 12, d4: 12, d5: 9 });
    expect(distribution(second.session)).toEqual({ d1: 16, d2: 11, d3: 12, d4: 12, d5: 9 });
  });
});

describe('answering, flagging, cursor', () => {
  const at = (minutes: number) => new Date(START.getTime() + minutes * 60_000);

  it('records and overwrites an answer without mutating the input', () => {
    // #given
    const session = newSession();
    const target = session.questionRefs[0].questionId;
    const snapshot = structuredClone(session);

    // #when
    const answered = setMockExamAnswer({ session, questionId: target, selectedChoiceIds: ['a'], now: at(1) });
    const overwritten = setMockExamAnswer({ session: answered, questionId: target, selectedChoiceIds: ['b'], now: at(2) });

    // #then
    expect(answered.answers[target].selectedChoiceIds).toEqual(['a']);
    expect(overwritten.answers[target].selectedChoiceIds).toEqual(['b']);
    expect(session).toEqual(snapshot); // input untouched
  });

  it('canonicalizes a duplicated multiple-select selection', () => {
    // #given
    const session = newSession();
    const target = session.questionRefs[0].questionId;

    // #when
    const answered = setMockExamAnswer({ session, questionId: target, selectedChoiceIds: ['a', 'b', 'a'], now: at(1) });

    // #then
    expect(answered.answers[target].selectedChoiceIds).toEqual(['a', 'b']);
  });

  it('rejects a selection outside the given valid choice ids', () => {
    // #given
    const session = newSession();
    const target = session.questionRefs[0].questionId;

    // #when
    const unchanged = setMockExamAnswer({ session, questionId: target, selectedChoiceIds: ['z'], validChoiceIds: ['a', 'b', 'c', 'd'], now: at(1) });

    // #then — same reference returned, nothing recorded
    expect(unchanged).toBe(session);
  });

  it('ignores an answer for a question outside the session', () => {
    // #given
    const session = newSession();

    // #when
    const unchanged = setMockExamAnswer({ session, questionId: 'not-in-exam', selectedChoiceIds: ['a'], now: at(1) });

    // #then
    expect(unchanged).toBe(session);
  });

  it('clears an answer when the selection empties out', () => {
    // #given
    const session = newSession();
    const target = session.questionRefs[0].questionId;
    const answered = setMockExamAnswer({ session, questionId: target, selectedChoiceIds: ['a'], now: at(1) });

    // #when
    const cleared = setMockExamAnswer({ session: answered, questionId: target, selectedChoiceIds: [], now: at(2) });

    // #then
    expect(cleared.answers[target]).toBeUndefined();
  });

  it('adds and removes a review flag without touching answers', () => {
    // #given
    const session = newSession();
    const target = session.questionRefs[0].questionId;
    const answered = setMockExamAnswer({ session, questionId: target, selectedChoiceIds: ['a'], now: at(1) });

    // #when
    const flagged = toggleMockExamFlag(answered, target, at(2));
    const unflagged = toggleMockExamFlag(flagged, target, at(3));

    // #then
    expect(flagged.flaggedQuestionIds).toEqual([target]);
    expect(flagged.answers[target].selectedChoiceIds).toEqual(['a']); // answer intact
    expect(unflagged.flaggedQuestionIds).toEqual([]);
  });

  it('moves the cursor within range and rejects out-of-range moves', () => {
    // #given
    const session = newSession();

    // #when
    const moved = moveMockExamCursor(session, 5, at(1));
    const last = moveMockExamCursor(moved, 59, at(2));
    const rejectedHigh = moveMockExamCursor(last, 60, at(3));
    const rejectedLow = moveMockExamCursor(last, -1, at(3));

    // #then
    expect(moved.currentIndex).toBe(5);
    expect(last.currentIndex).toBe(59);
    expect(rejectedHigh).toBe(last);
    expect(rejectedLow).toBe(last);
  });
});

describe('submission and expiry', () => {
  const at = (minutes: number) => new Date(START.getTime() + minutes * 60_000);

  it('submits explicitly before expiry, with unanswered questions allowed', () => {
    // #given — a session with only one of 60 answered
    const session = setMockExamAnswer({ session: newSession(), questionId: newSession().questionRefs[0].questionId, selectedChoiceIds: ['a'], now: at(1) });

    // #when
    const submitted = submitMockExam(session, at(30));

    // #then
    expect(submitted.status).toBe('submitted');
    expect(submitted.submittedAt).toBe(at(30).toISOString());
  });

  it('marks a session expired once the clock reaches expiry', () => {
    // #given
    const session = newSession();

    // #when
    const before = expireMockExamIfNeeded(session, at(119));
    const after = expireMockExamIfNeeded(session, at(120));

    // #then — a no-op before expiry, expired at the boundary
    expect(before).toBe(session);
    expect(after.status).toBe('expired');
    expect(after.submittedAt).toBeUndefined();
  });

  it('treats a submit at or after expiry as expired, not submitted', () => {
    // #given / #when
    const session = newSession();
    const submitted = submitMockExam(session, at(120));

    // #then
    expect(submitted.status).toBe('expired');
    expect(submitted.submittedAt).toBeUndefined();
  });

  it('refuses to change a session once it is submitted or expired', () => {
    // #given
    const target = newSession().questionRefs[0].questionId;
    const submitted = submitMockExam(newSession(), at(10));
    const expired = expireMockExamIfNeeded(newSession(), at(120));

    // #when / #then — writes are no-ops on both
    expect(setMockExamAnswer({ session: submitted, questionId: target, selectedChoiceIds: ['a'], now: at(11) })).toBe(submitted);
    expect(toggleMockExamFlag(submitted, target, at(11))).toBe(submitted);
    expect(moveMockExamCursor(submitted, 3, at(11))).toBe(submitted);
    expect(setMockExamAnswer({ session: expired, questionId: target, selectedChoiceIds: ['a'], now: at(121) })).toBe(expired);
    expect(submitMockExam(submitted, at(11))).toBe(submitted);
  });

  it('refuses to write an answer or move the cursor once the wall clock has passed expiry, even before the status flips', () => {
    // #given — status is still in_progress but the clock is past expiry
    const session = newSession();
    const target = session.questionRefs[0].questionId;

    // #when / #then — answering, flagging, and cursor moves are all gated on the clock
    expect(setMockExamAnswer({ session, questionId: target, selectedChoiceIds: ['a'], now: at(121) })).toBe(session);
    expect(toggleMockExamFlag(session, target, at(121))).toBe(session);
    expect(moveMockExamCursor(session, 5, at(121))).toBe(session);
  });
});

describe('deriveMockExamRemainingSeconds', () => {
  it('counts down from the full duration to zero at the boundaries', () => {
    const session = newSession();
    expect(deriveMockExamRemainingSeconds(session, START)).toBe(7200);
    expect(deriveMockExamRemainingSeconds(session, new Date(EXPIRES.getTime() - 1000))).toBe(1);
    expect(deriveMockExamRemainingSeconds(session, EXPIRES)).toBe(0);
    expect(deriveMockExamRemainingSeconds(session, new Date(EXPIRES.getTime() + 1000))).toBe(0);
  });

  it('does not depend on how long the tab was open — only on expiresAt and now', () => {
    // #given — a reload that keeps the same expiresAt
    const session = newSession();
    const reloaded: MockExamSession = { ...session, currentIndex: 30, updatedAt: '2026-07-20T00:45:00.000Z' };

    // #then — 45 minutes in, 75 minutes (4500s) remain, unaffected by any tick count
    expect(reloaded.expiresAt).toBe(session.expiresAt);
    expect(deriveMockExamRemainingSeconds(reloaded, new Date('2026-07-20T00:45:00.000Z'))).toBe(4500);
  });

  it('reports zero remaining once submitted or expired', () => {
    const submitted = submitMockExam(newSession(), new Date(START.getTime() + 60_000));
    const expired = expireMockExamIfNeeded(newSession(), EXPIRES);
    expect(deriveMockExamRemainingSeconds(submitted, new Date(START.getTime() + 61_000))).toBe(0);
    expect(deriveMockExamRemainingSeconds(expired, EXPIRES)).toBe(0);
  });
});

describe('deriveMockExamProgress', () => {
  it('separates answered, unanswered, and flagged questions', () => {
    // #given
    let session = newSession();
    const [q0, q1] = session.questionRefs.map((ref) => ref.questionId);
    session = setMockExamAnswer({ session, questionId: q0, selectedChoiceIds: ['a'], now: new Date(START.getTime() + 60_000) });
    session = toggleMockExamFlag(session, q1, new Date(START.getTime() + 120_000));

    // #when
    const progress = deriveMockExamProgress(session);

    // #then
    expect(progress.total).toBe(60);
    expect(progress.answeredCount).toBe(1);
    expect(progress.unansweredCount).toBe(59);
    expect(progress.answeredQuestionIds).toEqual([q0]);
    expect(progress.flaggedQuestionIds).toEqual([q1]);
  });
});

describe('grading', () => {
  const bank = makeBank();
  const at = (minutes: number) => new Date(START.getTime() + minutes * 60_000);

  function answered(): MockExamSession {
    let session = newSession();
    // Answer the first single-select correctly, a multiple-select partially, and
    // leave the rest unanswered.
    const single = session.questionRefs.map((ref) => bank.find((question) => question.id === ref.questionId)!).find((question) => question.format === 'single')!;
    const multiple = session.questionRefs.map((ref) => bank.find((question) => question.id === ref.questionId)!).find((question) => question.format === 'multiple')!;
    session = setMockExamAnswer({ session, questionId: single.id, selectedChoiceIds: single.correctChoiceIds, now: at(1) });
    session = setMockExamAnswer({ session, questionId: multiple.id, selectedChoiceIds: [multiple.correctChoiceIds[0]], now: at(2) }); // partial → wrong
    return submitMockExam(session, at(30));
  }

  it('grades single and multiple correctly and counts unanswered as wrong', () => {
    // #when
    const result = gradeMockExamAttempt(answered(), bank);

    // #then
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.totalQuestions).toBe(60);
    expect(result.result.answeredQuestions).toBe(2);
    expect(result.result.correctAnswers).toBe(1); // the single-select; the partial multiple is wrong
    expect(result.result.rawAccuracy).toBeCloseTo(1 / 60, 10);
    // The attempt records every question, unanswered ones included.
    expect(result.attempt.answers).toHaveLength(60);
    expect(result.attempt.answers.filter((entry) => entry.selectedChoiceIds.length === 0)).toHaveLength(58);
    expect(result.attempt.outcome).toBe('submitted');
  });

  it('divides raw accuracy by the full 60 and stays safe on an empty exam', () => {
    // #given — nothing answered
    const result = gradeMockExamAttempt(submitMockExam(newSession(), at(30)), bank);
    if (!result.ok) throw new Error('expected a graded result');
    expect(result.result.correctAnswers).toBe(0);
    expect(result.result.rawAccuracy).toBe(0);
  });

  it('aggregates by domain, difficulty, and skill', () => {
    // #when
    const result = gradeMockExamAttempt(answered(), bank);
    if (!result.ok) throw new Error('expected a graded result');

    // #then — domain totals reproduce the distribution
    const domainTotals = Object.fromEntries(Object.entries(result.result.byDomain).map(([id, tally]) => [id, tally.total]));
    expect(domainTotals).toEqual({ d1: 16, d2: 11, d3: 12, d4: 12, d5: 9 });
    const difficultyTotal = Object.values(result.result.byDifficulty).reduce((sum, tally) => sum + tally.total, 0);
    expect(difficultyTotal).toBe(60);
    // Skill totals can exceed 60 because a question counts toward each of its skills.
    const skillTotal = Object.values(result.result.bySkill).reduce((sum, tally) => sum + (tally?.total ?? 0), 0);
    expect(skillTotal).toBeGreaterThanOrEqual(60);
  });

  it('refuses to grade a session that is still in progress', () => {
    expect(gradeMockExamAttempt(newSession(), bank)).toEqual({ ok: false, reason: 'not-completed' });
  });

  it('refuses to grade when a question is missing from current content', () => {
    // #given — the first question no longer exists
    const submitted = submitMockExam(newSession(), at(30));
    const missingId = submitted.questionRefs[0].questionId;
    const reduced = bank.filter((question) => question.id !== missingId);

    // #when
    const result = gradeMockExamAttempt(submitted, reduced);

    // #then
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('incompatible-content');
    if (result.reason === 'incompatible-content') {
      expect(result.issues).toContainEqual({ questionId: missingId, kind: 'missing-question' });
    }
  });

  it('refuses to grade when a question revision moved under the session', () => {
    // #given
    const submitted = submitMockExam(newSession(), at(30));
    const movedId = submitted.questionRefs[0].questionId;
    const bumped = bank.map((question) => (question.id === movedId ? { ...question, revision: 2 } : question));

    // #when
    const compatibility = validateMockExamCompatibility(submitted, bumped);

    // #then
    expect(compatibility.compatible).toBe(false);
    if (!compatibility.compatible) {
      expect(compatibility.issues).toContainEqual({ questionId: movedId, kind: 'revision-mismatch', expectedRevision: 1, actualRevision: 2 });
    }
  });

  it('flags a selected choice that no longer exists on the question', () => {
    // #given — the learner selected d, then the question lost choice d
    let session = newSession();
    const target = session.questionRefs[0].questionId;
    session = setMockExamAnswer({ session, questionId: target, selectedChoiceIds: ['d'], now: at(1) });
    const submitted = submitMockExam(session, at(30));
    const trimmed = bank.map((question) => (question.id === target ? { ...question, choices: question.choices.filter((choice) => choice.id !== 'd') } : question));

    // #when
    const compatibility = validateMockExamCompatibility(submitted, trimmed);

    // #then
    expect(compatibility.compatible).toBe(false);
    if (!compatibility.compatible) {
      expect(compatibility.issues).toContainEqual({ questionId: target, kind: 'missing-choice', choiceId: 'd' });
    }
  });

  it('re-derives a result from a stored attempt', () => {
    // #given — a graded attempt
    const graded = gradeMockExamAttempt(answered(), bank);
    if (!graded.ok) throw new Error('expected a graded result');

    // #when — re-derive from the attempt alone
    const rederived = deriveMockExamResult(graded.attempt, bank);

    // #then
    expect(rederived).toEqual(graded.result);
  });
});

describe('grading a single question directly', () => {
  it('reuses isAnswerCorrect semantics for a multiple-select', () => {
    // #given — a session over one multiple-select question answered exactly right
    const question = makeQuestion('d1-q2', 'd1', 2); // index 2 => multiple, correct a,b
    const session: MockExamSession = {
      id: 'exam-x',
      blueprintVersion: 1,
      status: 'submitted',
      questionRefs: [{ questionId: 'd1-q2', revision: 1 }],
      currentIndex: 0,
      answers: { 'd1-q2': { selectedChoiceIds: ['b', 'a'], answeredAt: '2026-07-20T00:10:00.000Z' } },
      flaggedQuestionIds: [],
      startedAt: '2026-07-20T00:00:00.000Z',
      expiresAt: '2026-07-20T02:00:00.000Z',
      updatedAt: '2026-07-20T00:10:00.000Z',
      submittedAt: '2026-07-20T00:10:00.000Z',
    };

    // #when
    const result = gradeMockExamAttempt(session, [question]);

    // #then — order-independent correct match
    if (!result.ok) throw new Error('expected a graded result');
    expect(result.result.correctAnswers).toBe(1);
    expect(result.attempt.answers[0].correct).toBe(true);
  });
});
