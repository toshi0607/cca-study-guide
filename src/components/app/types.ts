export type View = 'today' | 'guide' | 'practice' | 'quiz' | 'progress' | 'hands-on' | 'official-scenarios' | 'mock-exam';

// The one place the learner is being sent, if any. A union rather than one
// nullable id per view because only a single target can be pending at a time:
// every target is set together with the navigation that opens its view, and the
// destination view consumes and clears it on arrival.
export type ViewTarget =
  | { kind: 'guide-section'; sectionId: string }
  | { kind: 'practice-card'; cardId: string }
  | { kind: 'practice-cards'; cardIds: string[] }
  | { kind: 'quiz-question'; questionId: string }
  | { kind: 'quiz-scenario'; scenarioId: string }
  | { kind: 'hands-on'; guideId: string; stepId?: string };
