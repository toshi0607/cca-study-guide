// Time cost of a learning-path stage, summed from content that already carries
// `estimatedMinutes` (see DESIGN.md §Study companion affordances).
//
// A stage with no declared duration is ABSENT from the map rather than zero: an
// unbounded, repeatable activity has no total, and showing 0 would read as a
// claim that it costs nothing.
import { handsOnGuides } from '../content/hands-on';
import type { LearningStageId } from '../content/learning-path';
import { studyGuideSections } from '../content/study-guide';
import { MOCK_EXAM_DURATION_SECONDS } from './mock-exam-blueprint';

export function sumEstimatedMinutes(items: readonly { readonly estimatedMinutes: number }[]): number {
  return items.reduce((total, item) => total + item.estimatedMinutes, 0);
}

// Computed from the content modules, so shipping a new guide or section updates
// the displayed total without anyone remembering to edit a number here.
export const learningStageMinutes: Readonly<Partial<Record<LearningStageId, number>>> = {
  guide: sumEstimatedMinutes(studyGuideSections),
  'hands-on': sumEstimatedMinutes(handsOnGuides),
  'mock-exam': MOCK_EXAM_DURATION_SECONDS / 60,
};

export function getLearningStageMinutes(stageId: LearningStageId): number | null {
  return learningStageMinutes[stageId] ?? null;
}
