import { describe, expect, it } from 'vitest';
import type { HandsOnProgress } from './storage-schema';
import {
  completeHandsOnGuide,
  deriveHandsOnProgress,
  getHandsOnGuideStatus,
  getHandsOnStepProgress,
  reconfirmHandsOnGuide,
  setHandsOnStepCompletion,
  startHandsOnGuide,
} from './hands-on-progress';

const now = new Date('2026-07-22T10:30:00.000Z');
const inProgress = (revision = 2, completedStepIds: string[] = []): HandsOnProgress => ({
  revision,
  status: 'in_progress',
  completedStepIds,
  updatedAt: '2026-07-20T09:00:00.000Z',
});
const completed = (revision = 2, completedStepIds: string[] = ['s1', 's2']): Extract<HandsOnProgress, { status: 'completed' }> => ({
  revision,
  status: 'completed',
  completedStepIds,
  updatedAt: '2026-07-20T09:00:00.000Z',
  completedAt: '2026-07-20T09:00:00.000Z',
});
const guide = (id: string, revision: number, stepIds: string[]) => ({ id, revision, steps: stepIds.map((sid) => ({ id: sid })) });

describe('getHandsOnGuideStatus', () => {
  it('classifies absent, current, stale, and future records without rewriting them', () => {
    expect(getHandsOnGuideStatus(undefined, 2)).toBe('not_started');
    expect(getHandsOnGuideStatus(inProgress(), 2)).toBe('in_progress');
    expect(getHandsOnGuideStatus(completed(), 2)).toBe('completed');
    expect(getHandsOnGuideStatus(completed(1), 2)).toBe('stale');
    expect(getHandsOnGuideStatus(inProgress(3), 2)).toBe('future');
  });
});

describe('getHandsOnStepProgress', () => {
  it('counts only current steps that are done at the current revision', () => {
    expect(getHandsOnStepProgress(inProgress(2, ['s1', 's3']), 2, ['s1', 's2', 's3'])).toEqual({ completed: 2, total: 3 });
  });

  it('reports zero completed for stale, future, and absent records but keeps the total', () => {
    // #given a stale record whose ids happen to overlap current steps
    expect(getHandsOnStepProgress(completed(1, ['s1', 's2']), 2, ['s1', 's2'])).toEqual({ completed: 0, total: 2 });
    expect(getHandsOnStepProgress(inProgress(3, ['s1']), 2, ['s1', 's2'])).toEqual({ completed: 0, total: 2 });
    expect(getHandsOnStepProgress(undefined, 2, ['s1', 's2'])).toEqual({ completed: 0, total: 2 });
  });

  it('ignores completed ids that are not current steps without pruning them', () => {
    const record = inProgress(2, ['s1', 'removed-step']);
    const snapshot = structuredClone(record);
    expect(getHandsOnStepProgress(record, 2, ['s1', 's2'])).toEqual({ completed: 1, total: 2 });
    expect(record).toEqual(snapshot);
  });
});

describe('startHandsOnGuide', () => {
  it('starts an untouched guide with an empty step list at the supplied time', () => {
    expect(startHandsOnGuide(undefined, 2, now)).toEqual({
      revision: 2,
      status: 'in_progress',
      completedStepIds: [],
      updatedAt: '2026-07-22T10:30:00.000Z',
    });
  });

  it('rejects starting an existing record, an invalid revision, or an invalid date', () => {
    const current = inProgress();
    expect(startHandsOnGuide(current, 2, now)).toBe(current);
    expect(startHandsOnGuide(undefined, 0, now)).toBeUndefined();
    expect(startHandsOnGuide(undefined, 2, new Date('invalid'))).toBeUndefined();
  });
});

describe('setHandsOnStepCompletion', () => {
  it('checks a step, avoiding duplicates, and updates the time', () => {
    const record = inProgress(2, ['s1']);
    expect(setHandsOnStepCompletion(record, 2, ['s1', 's2'], 's2', true, now)).toEqual({
      revision: 2, status: 'in_progress', completedStepIds: ['s1', 's2'], updatedAt: '2026-07-22T10:30:00.000Z',
    });
  });

  it('does not add a duplicate when a checked step is checked again', () => {
    const record = inProgress(2, ['s1']);
    expect(setHandsOnStepCompletion(record, 2, ['s1', 's2'], 's1', true, now)).toBe(record);
  });

  it('unchecks a step and keeps the guide in progress', () => {
    const record = inProgress(2, ['s1', 's2']);
    expect(setHandsOnStepCompletion(record, 2, ['s1', 's2'], 's2', false, now)).toEqual({
      revision: 2, status: 'in_progress', completedStepIds: ['s1'], updatedAt: '2026-07-22T10:30:00.000Z',
    });
  });

  it('moves a completed guide back to in progress when a required step is unchecked', () => {
    const record = completed(2, ['s1', 's2']);
    const next = setHandsOnStepCompletion(record, 2, ['s1', 's2'], 's2', false, now);
    expect(next).toEqual({ revision: 2, status: 'in_progress', completedStepIds: ['s1'], updatedAt: '2026-07-22T10:30:00.000Z' });
    expect(next && 'completedAt' in next).toBe(false);
  });

  it('rejects an unknown step id and never touches stale, future, or absent records', () => {
    const current = inProgress(2, ['s1']);
    expect(setHandsOnStepCompletion(current, 2, ['s1', 's2'], 'nope', true, now)).toBe(current);
    const stale = completed(1, ['s1']);
    expect(setHandsOnStepCompletion(stale, 2, ['s1'], 's1', false, now)).toBe(stale);
    const future = inProgress(3, ['s1']);
    expect(setHandsOnStepCompletion(future, 2, ['s1'], 's1', true, now)).toBe(future);
    expect(setHandsOnStepCompletion(undefined, 2, ['s1'], 's1', true, now)).toBeUndefined();
  });

  it('preserves completed ids that are not current steps', () => {
    const record = inProgress(2, ['s1', 'legacy-step']);
    expect(setHandsOnStepCompletion(record, 2, ['s1', 's2'], 's2', true, now)).toEqual({
      revision: 2, status: 'in_progress', completedStepIds: ['s1', 'legacy-step', 's2'], updatedAt: '2026-07-22T10:30:00.000Z',
    });
  });

  it('does not mutate the input record', () => {
    const record = inProgress(2, ['s1']);
    const snapshot = structuredClone(record);
    setHandsOnStepCompletion(record, 2, ['s1', 's2'], 's2', true, now);
    expect(record).toEqual(snapshot);
  });
});

describe('completeHandsOnGuide', () => {
  it('completes a current in-progress guide once every current step is done', () => {
    expect(completeHandsOnGuide(inProgress(2, ['s1', 's2']), 2, ['s1', 's2'], now)).toEqual({
      revision: 2, status: 'completed', completedStepIds: ['s1', 's2'], updatedAt: '2026-07-22T10:30:00.000Z', completedAt: '2026-07-22T10:30:00.000Z',
    });
  });

  it('refuses to complete when a required step is unfinished', () => {
    const record = inProgress(2, ['s1']);
    expect(completeHandsOnGuide(record, 2, ['s1', 's2'], now)).toBe(record);
  });

  it('refuses to complete a guide with no steps', () => {
    const record = inProgress(2, []);
    expect(completeHandsOnGuide(record, 2, [], now)).toBe(record);
  });

  it('refuses when not a current in-progress record', () => {
    const done = completed(2, ['s1']);
    expect(completeHandsOnGuide(done, 2, ['s1'], now)).toBe(done);
    const stale = inProgress(1, ['s1']);
    expect(completeHandsOnGuide(stale, 2, ['s1'], now)).toBe(stale);
    expect(completeHandsOnGuide(undefined, 2, ['s1'], now)).toBeUndefined();
  });
});

describe('reconfirmHandsOnGuide', () => {
  it('moves a stale record to the current revision as in progress, dropping the old completion time', () => {
    const stale = completed(1, ['s1', 's2']);
    const next = reconfirmHandsOnGuide(stale, 2, now);
    expect(next).toEqual({ revision: 2, status: 'in_progress', completedStepIds: ['s1', 's2'], updatedAt: '2026-07-22T10:30:00.000Z' });
    expect(next && 'completedAt' in next).toBe(false);
  });

  it('keeps stored completed step ids so unchanged steps stay credited', () => {
    const stale = inProgress(1, ['s1', 'old-only']);
    expect(reconfirmHandsOnGuide(stale, 2, now)?.completedStepIds).toEqual(['s1', 'old-only']);
  });

  it('rejects non-stale records and invalid revisions without changing them', () => {
    const current = inProgress(2);
    const future = inProgress(3);
    expect(reconfirmHandsOnGuide(current, 2, now)).toBe(current);
    expect(reconfirmHandsOnGuide(future, 2, now)).toBe(future);
    expect(reconfirmHandsOnGuide(undefined, 2, now)).toBeUndefined();
    const stale = completed(1);
    expect(reconfirmHandsOnGuide(stale, 0, now)).toBe(stale);
  });
});

describe('deriveHandsOnProgress', () => {
  it('derives each current status and the completed fraction from guides and records', () => {
    const records: Record<string, HandsOnProgress> = {
      active: inProgress(2),
      done: completed(2),
      old: completed(1),
      newer: inProgress(3),
    };

    expect(deriveHandsOnProgress([
      guide('new', 2, ['s1']), guide('active', 2, ['s1']), guide('done', 2, ['s1']), guide('old', 2, ['s1']), guide('newer', 2, ['s1']),
    ], records)).toEqual({
      totalGuides: 5,
      notStarted: 1,
      inProgress: 1,
      completed: 1,
      stale: 1,
      future: 1,
      completionRate: 0.2,
    });
  });

  it('ignores unknown records without deleting or mutating them', () => {
    const records: Record<string, HandsOnProgress> = { known: completed(), removed: inProgress() };
    const snapshot = structuredClone(records);
    expect(deriveHandsOnProgress([guide('known', 2, ['s1'])], records)).toMatchObject({ totalGuides: 1, completed: 1, completionRate: 1 });
    expect(records).toEqual(snapshot);
  });

  it('uses zero for the rate when content contains no guides', () => {
    expect(deriveHandsOnProgress([], { removed: completed() })).toEqual({
      totalGuides: 0, notStarted: 0, inProgress: 0, completed: 0, stale: 0, future: 0, completionRate: 0,
    });
  });
});
