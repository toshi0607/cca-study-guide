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

const DAY = 86_400_000;

export function scheduleReview(cardId: string, revision: number, rating: Rating, previous?: ReviewState, now = new Date()): ReviewState {
  let intervalDays = 0;
  let dueMs = now.getTime();
  let streak = previous?.streak ?? 0;
  let lapses = previous?.lapses ?? 0;

  if (rating === 'again') {
    dueMs += 10 * 60_000;
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
