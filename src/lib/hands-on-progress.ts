import type { HandsOnGuide } from '../content/types';
import type { HandsOnProgress } from './storage-schema';

// A record is interpreted against the revision in content when it is read, never
// normalized. An older build leaves a newer record untouched, and an updated
// guide asks the learner to re-confirm the changed exercise without losing the
// earlier activity. Unlike a Study Guide section, a guide has sub-steps, so a
// record completed at an older revision is not treated as completed at a revision
// that may have added steps.
export type HandsOnGuideStatus = 'not_started' | 'in_progress' | 'completed' | 'stale' | 'future';

export type HandsOnProgressSummary = Readonly<{
  totalGuides: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  stale: number;
  future: number;
  // A fraction in the inclusive range 0–1. Only guides completed at their current
  // content revision contribute to it.
  completionRate: number;
}>;

export type HandsOnStepProgress = Readonly<{ completed: number; total: number }>;

type GuideRevisionSteps = Pick<HandsOnGuide, 'id' | 'revision'> & { steps: ReadonlyArray<{ id: string }> };

function isCurrentRevision(revision: number): boolean {
  return Number.isInteger(revision) && revision > 0;
}

function timestamp(now: Date): string | null {
  const value = now.getTime();
  return Number.isFinite(value) ? now.toISOString() : null;
}

/** Classifies a stored record without changing it. */
export function getHandsOnGuideStatus(
  progress: HandsOnProgress | undefined,
  currentRevision: number,
): HandsOnGuideStatus {
  if (!progress) return 'not_started';
  if (progress.revision < currentRevision) return 'stale';
  if (progress.revision > currentRevision) return 'future';
  return progress.status;
}

/**
 * Derives the step count to display. Only a record at the current revision
 * contributes a non-zero completed count; a stale or future record shows zero
 * against the current steps because its completed ids belong to another revision.
 * Reads never prune unknown ids: only current step ids are counted, the record is
 * left exactly as stored.
 */
export function getHandsOnStepProgress(
  progress: HandsOnProgress | undefined,
  currentRevision: number,
  currentStepIds: readonly string[],
): HandsOnStepProgress {
  const total = currentStepIds.length;
  if (!progress || getHandsOnGuideStatus(progress, currentRevision) === 'stale'
    || getHandsOnGuideStatus(progress, currentRevision) === 'future') {
    return { completed: 0, total };
  }
  const done = new Set(progress.completedStepIds);
  return { completed: currentStepIds.filter((id) => done.has(id)).length, total };
}

/** Starts only an untouched guide. Repeated or incompatible actions preserve the exact input record. */
export function startHandsOnGuide(
  progress: HandsOnProgress | undefined,
  currentRevision: number,
  now: Date,
): HandsOnProgress | undefined {
  const updatedAt = timestamp(now);
  if (progress || !isCurrentRevision(currentRevision) || !updatedAt) return progress;
  return { revision: currentRevision, status: 'in_progress', completedStepIds: [], updatedAt };
}

/**
 * Checks or unchecks one step on a current-revision record. Completing steps
 * never auto-completes the guide (that is an explicit action); unchecking a step
 * on a completed guide moves it back to in_progress because a required step is no
 * longer done. The target step must be one of the current steps. Ids already in
 * the record that are not current steps are preserved, never pruned.
 */
export function setHandsOnStepCompletion(
  progress: HandsOnProgress | undefined,
  currentRevision: number,
  currentStepIds: readonly string[],
  stepId: string,
  complete: boolean,
  now: Date,
): HandsOnProgress | undefined {
  const updatedAt = timestamp(now);
  const status = getHandsOnGuideStatus(progress, currentRevision);
  if (!progress || !updatedAt || (status !== 'in_progress' && status !== 'completed')) return progress;
  if (!currentStepIds.includes(stepId)) return progress;

  const has = progress.completedStepIds.includes(stepId);
  if (complete === has) return progress;
  const completedStepIds = complete
    ? [...progress.completedStepIds, stepId]
    : progress.completedStepIds.filter((id) => id !== stepId);

  // A completed guide that loses a required step is no longer complete.
  if (progress.status === 'completed' && !complete) {
    return { revision: currentRevision, status: 'in_progress', completedStepIds, updatedAt };
  }
  return { ...progress, completedStepIds, updatedAt };
}

/** Completes only a current in-progress guide whose every current step is done. */
export function completeHandsOnGuide(
  progress: HandsOnProgress | undefined,
  currentRevision: number,
  currentStepIds: readonly string[],
  now: Date,
): HandsOnProgress | undefined {
  const updatedAt = timestamp(now);
  if (!progress || !updatedAt || getHandsOnGuideStatus(progress, currentRevision) !== 'in_progress') return progress;
  const done = new Set(progress.completedStepIds);
  if (currentStepIds.length === 0 || !currentStepIds.every((id) => done.has(id))) return progress;
  return { revision: currentRevision, status: 'completed', completedStepIds: progress.completedStepIds, updatedAt, completedAt: updatedAt };
}

/**
 * A learner must explicitly acknowledge a changed guide. A stale record moves to
 * the current revision as in_progress: because the guide's steps may have changed,
 * completion has to be re-earned rather than silently carried over. The record is
 * never shown as completed at a revision that may have added steps, but the prior
 * completion time is preserved in `previousCompletedAt` rather than being erased
 * or overwritten with the current time — so the learner never loses the fact that
 * they finished the earlier revision. The original time survives repeated bumps
 * (a stale in_progress record already carrying `previousCompletedAt` forwards it).
 * completedStepIds are kept as stored (not pruned); the display intersects them
 * with the current steps.
 */
export function reconfirmHandsOnGuide(
  progress: HandsOnProgress | undefined,
  currentRevision: number,
  now: Date,
): HandsOnProgress | undefined {
  const updatedAt = timestamp(now);
  if (!progress || !updatedAt || getHandsOnGuideStatus(progress, currentRevision) !== 'stale') return progress;
  const previousCompletedAt = progress.status === 'completed' ? progress.completedAt : progress.previousCompletedAt;
  const base = { revision: currentRevision, status: 'in_progress' as const, completedStepIds: progress.completedStepIds, updatedAt };
  return previousCompletedAt ? { ...base, previousCompletedAt } : base;
}

/**
 * Derives display values from current content and stored records. Records for
 * removed or not-yet-known guide ids are intentionally ignored, never pruned.
 */
export function deriveHandsOnProgress(
  guides: readonly GuideRevisionSteps[],
  records: Readonly<Record<string, HandsOnProgress>>,
): HandsOnProgressSummary {
  const counts: Record<HandsOnGuideStatus, number> = {
    not_started: 0,
    in_progress: 0,
    completed: 0,
    stale: 0,
    future: 0,
  };

  for (const guide of guides) {
    const progress = Object.prototype.hasOwnProperty.call(records, guide.id) ? records[guide.id] : undefined;
    counts[getHandsOnGuideStatus(progress, guide.revision)] += 1;
  }

  return {
    totalGuides: guides.length,
    notStarted: counts.not_started,
    inProgress: counts.in_progress,
    completed: counts.completed,
    stale: counts.stale,
    future: counts.future,
    completionRate: guides.length === 0 ? 0 : counts.completed / guides.length,
  };
}
