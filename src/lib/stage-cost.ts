// Time cost of a learning-path stage, derived from content that already carries
// `estimatedMinutes`. Stage 3 (Hands-on) is the largest single investment in the
// path — 480 minutes against the Study Guide's 360 — and the ordered list gave no
// hint of that, so a learner could not tell where their time would actually go.
//
// This is a fact (minutes of content), never a judgement: nothing here derives or
// suggests a score, a pass/fail outcome, or readiness. Stages whose content has no
// declared duration (Practice, Quiz, analysis, repeat) are absent from the map
// rather than shown as zero — an unbounded, repeatable activity has no total.
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
