import { describe, expect, it } from 'vitest';
import type { Rating, ReviewState } from './scheduler';
import { isWeak } from './weakness';

const review = (lapses: number, lastRating: Rating): ReviewState => ({
  cardId: 'card',
  cardRevisionSeen: 1,
  dueAt: '2026-07-14T00:00:00.000Z',
  intervalDays: 3,
  streak: 1,
  lapses,
  lastRating,
});

describe('isWeak', () => {
  it('treats an unseen card as not weak', () => {
    // #given / #when / #then
    expect(isWeak(undefined)).toBe(false);
  });

  it('flags a card whose last rating was again', () => {
    // #given
    const state = review(0, 'again');

    // #when / #then
    expect(isWeak(state)).toBe(true);
  });

  it('flags a card whose last rating was hard', () => {
    // #given
    const state = review(0, 'hard');

    // #when / #then
    expect(isWeak(state)).toBe(true);
  });

  it('flags a recovered card that has lapsed twice or more', () => {
    // #given
    const state = review(2, 'good');

    // #when / #then
    expect(isWeak(state)).toBe(true);
  });

  it('does not flag a recovered card with fewer than two lapses', () => {
    // #given
    const state = review(1, 'good');

    // #when / #then
    expect(isWeak(state)).toBe(false);
  });
});
