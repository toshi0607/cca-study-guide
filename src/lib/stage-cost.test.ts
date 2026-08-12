import { describe, expect, it } from 'vitest';
import { handsOnGuides } from '../content/hands-on';
import { learningPath } from '../content/learning-path';
import { studyGuideSections } from '../content/study-guide';
import { getLearningStageMinutes, learningStageMinutes, sumEstimatedMinutes } from './stage-cost';

describe('sumEstimatedMinutes', () => {
  it('returns 0 for an empty list', () => {
    expect(sumEstimatedMinutes([])).toBe(0);
  });

  it('adds the declared minutes of every item', () => {
    expect(sumEstimatedMinutes([{ estimatedMinutes: 45 }, { estimatedMinutes: 15 }])).toBe(60);
  });
});

describe('learningStageMinutes', () => {
  it('totals the shipped Study Guide sections', () => {
    expect(learningStageMinutes.guide).toBe(studyGuideSections.reduce((total, section) => total + section.estimatedMinutes, 0));
  });

  it('totals the shipped Hands-on guides', () => {
    expect(learningStageMinutes['hands-on']).toBe(handsOnGuides.reduce((total, guide) => total + guide.estimatedMinutes, 0));
  });

  it('reports the Mock Exam duration in minutes', () => {
    expect(learningStageMinutes['mock-exam']).toBe(120);
  });

  it('shows Hands-on as the heaviest stage, which is the whole point of displaying the cost', () => {
    expect(learningStageMinutes['hands-on']!).toBeGreaterThan(learningStageMinutes.guide!);
  });

  it('only names stages that exist in the learning path', () => {
    const stageIds = new Set(learningPath.map((stage) => stage.id));
    for (const key of Object.keys(learningStageMinutes)) expect(stageIds).toContain(key);
  });

  it('has no entry for stages whose content declares no duration', () => {
    for (const stageId of ['start', 'practice', 'quiz', 'analysis', 'repeat'] as const) {
      expect(getLearningStageMinutes(stageId)).toBeNull();
    }
  });
});
