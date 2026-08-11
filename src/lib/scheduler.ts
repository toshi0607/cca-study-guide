export type Rating = 'again' | 'hard' | 'good';

export type ReviewState = {
  cardId: string;
  cardRevisionSeen: number;
  dueAt: string;
  intervalDays: number;
  streak: number;
  lapses: number;
  lastRating: Rating;
};

export const DAY = 86_400_000;

// How far out an `again` rating pushes the next review. Exported because a
// ReviewState records only `dueAt`, so recovering when a review happened means
// subtracting exactly this delay back out (see `reviewedAtMs` in
// study-data-merge). A copy of the number in the other module would drift
// silently the day this one changes.
export const AGAIN_DELAY_MS = 10 * 60_000;

export function scheduleReview(cardId: string, revision: number, rating: Rating, previous?: ReviewState, now = new Date()): ReviewState {
  let intervalDays = 0;
  let dueMs = now.getTime();
  let streak = previous?.streak ?? 0;
  let lapses = previous?.lapses ?? 0;

  if (rating === 'again') {
    dueMs += AGAIN_DELAY_MS;
    streak = 0;
    lapses += 1;
  } else if (rating === 'hard') {
    intervalDays = 1;
    dueMs += DAY;
    streak = 0;
  } else {
    streak += 1;
    intervalDays = previous?.lastRating === 'good' && previous.intervalDays >= 3 ? Math.min(previous.intervalDays * 2, 60) : 3;
    dueMs += intervalDays * DAY;
  }

  return { cardId, cardRevisionSeen: revision, dueAt: new Date(dueMs).toISOString(), intervalDays, streak, lapses, lastRating: rating };
}

export function isDue(state: ReviewState | undefined, revision: number, now = new Date()) {
  return !state || state.cardRevisionSeen !== revision || new Date(state.dueAt).getTime() <= now.getTime();
}
