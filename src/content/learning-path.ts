// Locale-independent single source of truth for the recommended study cycle.
// Only stage identity, order, and destination live here; i18n (`copy.guide.stages`)
// supplies the display title, description, and CTA label per locale. This keeps
// the number of stages, their order, and their targets identical across locales,
// and prevents the "implemented feature shown as unavailable" drift by construction:
// every stage listed here is a feature the app ships today.

export type LearningStageId =
  | 'start'
  | 'guide'
  | 'hands-on'
  | 'practice'
  | 'quiz'
  | 'mock-exam'
  | 'analysis'
  | 'repeat';

// Where a stage's CTA leads. `guide-diagnosis` and `guide-sections` are in-page
// anchors inside the Guide view; the rest map to an App View (see
// LEARNING_STAGE_VIEW_TARGETS). No stage points at a future/unbuilt feature.
export type LearningStageTarget =
  | 'guide-diagnosis'
  | 'guide-sections'
  | 'hands-on'
  | 'practice'
  | 'quiz'
  | 'mock-exam'
  | 'mock-exam-analysis';

export type LearningStage = {
  readonly id: LearningStageId;
  readonly order: number;
  readonly target: LearningStageTarget;
  // Stable, locale-independent key naming the capability this stage exercises.
  // Used for drift checks and analytics-free bookkeeping, never rendered.
  readonly capability: string;
};

export const learningPath: readonly LearningStage[] = [
  { id: 'start', order: 1, target: 'guide-diagnosis', capability: 'orientation' },
  { id: 'guide', order: 2, target: 'guide-sections', capability: 'study-guide' },
  { id: 'hands-on', order: 3, target: 'hands-on', capability: 'hands-on' },
  { id: 'practice', order: 4, target: 'practice', capability: 'practice-cards' },
  { id: 'quiz', order: 5, target: 'quiz', capability: 'quiz' },
  { id: 'mock-exam', order: 6, target: 'mock-exam', capability: 'mock-exam' },
  { id: 'analysis', order: 7, target: 'mock-exam-analysis', capability: 'learning-analysis' },
  { id: 'repeat', order: 8, target: 'practice', capability: 'practice-cards' },
] as const;

// Targets that resolve to an App View. The App maps each of these to a real
// navigation; anything not here is an in-page Guide anchor handled by GuideView.
export const LEARNING_STAGE_VIEW_TARGETS: Readonly<Record<Exclude<LearningStageTarget, 'guide-diagnosis' | 'guide-sections'>, string>> = {
  'hands-on': 'hands-on',
  practice: 'practice',
  quiz: 'quiz',
  'mock-exam': 'mock-exam',
  'mock-exam-analysis': 'mock-exam',
};

// In-page Guide anchors (not App views).
export const LEARNING_STAGE_GUIDE_ANCHORS = ['guide-diagnosis', 'guide-sections'] as const;

// Study Guide section a "choose where to start" answer maps to, indexed by the
// answer option order. Each id must exist in `studyGuideSections`; the drift test
// enforces that so a renamed/removed section can never leave the picker dangling.
export const diagnosisStartSectionIds = ['sg-agentic-loop', 'sg-tool-and-mcp', 'sg-context-and-handoff'] as const;
