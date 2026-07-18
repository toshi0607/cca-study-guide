import type { Rating } from './scheduler';

export type SessionTally = Record<Rating, number>;

export const emptyTally = (): SessionTally => ({ again: 0, hard: 0, good: 0 });

export type SessionStep<T> = { queue: T[]; index: number; tally: SessionTally; finished: boolean };

// 'again' re-queues the current card at the end of this session so it comes up
// once more before the summary; the persisted dueAt is unaffected.
export function rateSessionCard<T>(queue: readonly T[], index: number, rating: Rating, tally: SessionTally): SessionStep<T> {
  const next = rating === 'again' ? [...queue, queue[index]] : [...queue];
  const nextIndex = index + 1;
  return {
    queue: next,
    index: nextIndex,
    tally: { ...tally, [rating]: tally[rating] + 1 },
    finished: nextIndex >= next.length,
  };
}
