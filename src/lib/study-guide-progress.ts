import type { StudyGuideSection } from '../content/types';
import type { StudyGuideProgress } from './storage-schema';

// A record is deliberately interpreted against the revision in content rather
// than normalized when it is read. This lets an older build leave a newer
// record untouched, and lets an updated guide ask the learner to review the
// changed section without losing the earlier activity.
export type StudyGuideSectionStatus = 'not_started' | 'in_progress' | 'completed' | 'stale' | 'future';

export type StudyGuideProgressSummary = Readonly<{
  totalSections: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  stale: number;
  future: number;
  // A fraction in the inclusive range 0–1. Only sections completed at their
  // current content revision contribute to it.
  completionRate: number;
}>;

type SectionRevision = Pick<StudyGuideSection, 'id' | 'revision'>;

function isCurrentRevision(revision: number): boolean {
  return Number.isInteger(revision) && revision > 0;
}

function timestamp(now: Date): string | null {
  const value = now.getTime();
  return Number.isFinite(value) ? now.toISOString() : null;
}

/** Classifies a stored record without changing it. */
export function getStudyGuideSectionStatus(
  progress: StudyGuideProgress | undefined,
  currentRevision: number,
): StudyGuideSectionStatus {
  if (!progress) return 'not_started';
  if (progress.revision < currentRevision) return 'stale';
  if (progress.revision > currentRevision) return 'future';
  return progress.status;
}

/** Starts only an untouched section. Repeated or incompatible actions preserve the exact input record. */
export function startStudyGuideSection(
  progress: StudyGuideProgress | undefined,
  currentRevision: number,
  now: Date,
): StudyGuideProgress | undefined {
  const updatedAt = timestamp(now);
  if (progress || !isCurrentRevision(currentRevision) || !updatedAt) return progress;
  return { revision: currentRevision, status: 'in_progress', updatedAt };
}

/** Completes only a section that is in progress at the current content revision. */
export function completeStudyGuideSection(
  progress: StudyGuideProgress | undefined,
  currentRevision: number,
  now: Date,
): StudyGuideProgress | undefined {
  const updatedAt = timestamp(now);
  if (!progress || !isCurrentRevision(currentRevision) || !updatedAt
    || getStudyGuideSectionStatus(progress, currentRevision) !== 'in_progress') return progress;
  return { revision: currentRevision, status: 'completed', updatedAt, completedAt: updatedAt };
}

/**
 * A learner must explicitly acknowledge a changed section. Its prior activity
 * shape is retained (in progress stays in progress; completed stays completed)
 * while the current revision receives a fresh acknowledgement timestamp. A
 * completed record keeps its original completedAt because v2 has no separate
 * field for the first completion time.
 */
export function reconfirmStudyGuideSection(
  progress: StudyGuideProgress | undefined,
  currentRevision: number,
  now: Date,
): StudyGuideProgress | undefined {
  const updatedAt = timestamp(now);
  if (!progress || !isCurrentRevision(currentRevision) || !updatedAt
    || getStudyGuideSectionStatus(progress, currentRevision) !== 'stale') return progress;
  if (progress.status === 'in_progress') {
    return { revision: currentRevision, status: 'in_progress', updatedAt };
  }
  return { revision: currentRevision, status: 'completed', updatedAt, completedAt: progress.completedAt };
}

/**
 * Derives display values from current content and stored records. Records for
 * removed or not-yet-known section ids are intentionally ignored, never pruned.
 */
export function deriveStudyGuideProgress(
  sections: readonly SectionRevision[],
  records: Readonly<Record<string, StudyGuideProgress>>,
): StudyGuideProgressSummary {
  const counts: Record<StudyGuideSectionStatus, number> = {
    not_started: 0,
    in_progress: 0,
    completed: 0,
    stale: 0,
    future: 0,
  };

  for (const section of sections) {
    const progress = Object.prototype.hasOwnProperty.call(records, section.id) ? records[section.id] : undefined;
    counts[getStudyGuideSectionStatus(progress, section.revision)] += 1;
  }

  return {
    totalSections: sections.length,
    notStarted: counts.not_started,
    inProgress: counts.in_progress,
    completed: counts.completed,
    stale: counts.stale,
    future: counts.future,
    completionRate: sections.length === 0 ? 0 : counts.completed / sections.length,
  };
}
