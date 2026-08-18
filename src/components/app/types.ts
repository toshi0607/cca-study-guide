export type View = 'today' | 'guide' | 'practice' | 'quiz' | 'progress' | 'hands-on' | 'official-scenarios' | 'mock-exam';

// The one place the learner is being sent, if any. A union rather than one
// nullable id per view because only a single target can be pending at a time:
// every target is set together with the navigation that opens its view, and the
// destination view consumes and clears it on arrival.
export type ViewTarget =
  | { kind: 'guide-section'; sectionId: string }
  // Always an array, even for a single card: the array is built once where the
  // target is created (click handler / deep-link parse), so its identity stays
  // stable across re-renders — a render-time wrapper array would defeat the
  // destination view's state identity check and re-fire its focus effect.
  | { kind: 'practice-cards'; cardIds: string[] }
  | { kind: 'quiz-question'; questionId: string }
  | { kind: 'quiz-scenario'; scenarioId: string }
  | { kind: 'hands-on'; guideId: string; stepId?: string };

// Where a cross-view excursion started, so the target view can offer a way back.
// The title travels with the id: the origin is rendered by Practice/Quiz, and
// carrying the localized title keeps the Study Guide content out of their —
// and App's — module graph.
export type GuideOrigin = { sectionId: string; title: string };
