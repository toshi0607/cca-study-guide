import { describe, expect, it } from 'vitest';
import type { StudyGuideSection } from '../content/types';
import type { StudyGuideProgress } from './storage-schema';
import {
  completeStudyGuideSection,
  deriveStudyGuideProgress,
  getStudyGuideSectionStatus,
  reconfirmStudyGuideSection,
  startStudyGuideSection,
} from './study-guide-progress';

const now = new Date('2026-07-22T10:30:00.000Z');
const inProgress = (revision = 2): StudyGuideProgress => ({ revision, status: 'in_progress', updatedAt: '2026-07-20T09:00:00.000Z' });
const completed = (revision = 2): Extract<StudyGuideProgress, { status: 'completed' }> => ({
  revision,
  status: 'completed',
  updatedAt: '2026-07-20T09:00:00.000Z',
  completedAt: '2026-07-20T09:00:00.000Z',
});
const section = (id: string, revision: number): Pick<StudyGuideSection, 'id' | 'revision'> => ({ id, revision });

describe('getStudyGuideSectionStatus', () => {
  it('classifies absent, current, stale, and future records without rewriting them', () => {
    expect(getStudyGuideSectionStatus(undefined, 2)).toBe('not_started');
    expect(getStudyGuideSectionStatus(inProgress(), 2)).toBe('in_progress');
    expect(getStudyGuideSectionStatus(completed(), 2)).toBe('completed');
    expect(getStudyGuideSectionStatus(completed(1), 2)).toBe('stale');
    expect(getStudyGuideSectionStatus(inProgress(3), 2)).toBe('future');
  });
});

describe('explicit Study Guide progress transitions', () => {
  it('starts an untouched section at the supplied time', () => {
    expect(startStudyGuideSection(undefined, 2, now)).toEqual({
      revision: 2,
      status: 'in_progress',
      updatedAt: '2026-07-22T10:30:00.000Z',
    });
  });

  it('completes only a current in-progress section', () => {
    expect(completeStudyGuideSection(inProgress(), 2, now)).toEqual({
      revision: 2,
      status: 'completed',
      updatedAt: '2026-07-22T10:30:00.000Z',
      completedAt: '2026-07-22T10:30:00.000Z',
    });
  });

  it('reconfirms stale records at the current revision while preserving their activity shape', () => {
    expect(reconfirmStudyGuideSection(inProgress(1), 2, now)).toEqual({
      revision: 2,
      status: 'in_progress',
      updatedAt: '2026-07-22T10:30:00.000Z',
    });
    const originalCompletion = completed(1);
    const reconfirmedCompletion = reconfirmStudyGuideSection(originalCompletion, 2, now);
    expect(reconfirmedCompletion).toEqual({
      revision: 2,
      status: 'completed',
      updatedAt: '2026-07-22T10:30:00.000Z',
      completedAt: '2026-07-20T09:00:00.000Z',
    });
    expect(reconfirmedCompletion?.status === 'completed' && reconfirmedCompletion.completedAt).toBe(originalCompletion.completedAt);
  });

  it('rejects incompatible, future, and invalid-revision actions without changing the supplied record', () => {
    const current = inProgress();
    const future = completed(3);
    const stale = completed(1);

    expect(startStudyGuideSection(current, 2, now)).toBe(current);
    expect(completeStudyGuideSection(undefined, 2, now)).toBeUndefined();
    expect(completeStudyGuideSection(future, 2, now)).toBe(future);
    expect(reconfirmStudyGuideSection(current, 2, now)).toBe(current);
    expect(reconfirmStudyGuideSection(stale, 0, now)).toBe(stale);
  });

  it('does not mutate records and is deterministic for a supplied time', () => {
    const input = inProgress();
    const snapshot = structuredClone(input);

    const first = completeStudyGuideSection(input, 2, now);
    const second = completeStudyGuideSection(input, 2, new Date(now));

    expect(first).toEqual(second);
    expect(input).toEqual(snapshot);
    expect(first).not.toBe(input);
  });

  it('rejects actions with an invalid supplied Date without changing the record', () => {
    const current = inProgress();
    expect(completeStudyGuideSection(current, 2, new Date('invalid'))).toBe(current);
    expect(startStudyGuideSection(undefined, 2, new Date('invalid'))).toBeUndefined();
  });
});

describe('deriveStudyGuideProgress', () => {
  it('derives each current status and the completed fraction from sections and records', () => {
    const records: Record<string, StudyGuideProgress> = {
      active: inProgress(2),
      done: completed(2),
      old: completed(1),
      newer: inProgress(3),
    };

    expect(deriveStudyGuideProgress([
      section('new', 2), section('active', 2), section('done', 2), section('old', 2), section('newer', 2),
    ], records)).toEqual({
      totalSections: 5,
      notStarted: 1,
      inProgress: 1,
      completed: 1,
      stale: 1,
      future: 1,
      completionRate: 0.2,
    });
  });

  it('ignores unknown records without deleting or mutating them', () => {
    const records: Record<string, StudyGuideProgress> = { known: completed(), removed: inProgress() };
    const snapshot = structuredClone(records);

    expect(deriveStudyGuideProgress([section('known', 2)], records)).toMatchObject({
      totalSections: 1,
      completed: 1,
      completionRate: 1,
    });
    expect(records).toEqual(snapshot);
  });

  it('uses zero for the rate when content contains no sections', () => {
    expect(deriveStudyGuideProgress([], { removed: completed() })).toEqual({
      totalSections: 0,
      notStarted: 0,
      inProgress: 0,
      completed: 0,
      stale: 0,
      future: 0,
      completionRate: 0,
    });
  });
});
