import { describe, expect, it } from 'vitest';
import { isDue, scheduleReview } from './scheduler';

const NOW = new Date('2026-07-14T00:00:00.000Z');

describe('review scheduler', () => {
  it('schedules again in ten minutes and records a lapse', () => {
    const state = scheduleReview('card', 1, 'again', undefined, NOW);
    expect(state.dueAt).toBe('2026-07-14T00:10:00.000Z');
    expect(state.lapses).toBe(1);
    expect(state.streak).toBe(0);
  });

  it('schedules hard for one day', () => {
    const state = scheduleReview('card', 1, 'hard', undefined, NOW);
    expect(state.intervalDays).toBe(1);
    expect(state.dueAt).toBe('2026-07-15T00:00:00.000Z');
  });

  it('starts good at three days and doubles repeated good intervals', () => {
    const first = scheduleReview('card', 1, 'good', undefined, NOW);
    const second = scheduleReview('card', 1, 'good', first, NOW);
    expect(first.intervalDays).toBe(3);
    expect(second.intervalDays).toBe(6);
    expect(second.streak).toBe(2);
  });

  it('marks unseen, expired, and revised cards due', () => {
    const future = scheduleReview('card', 1, 'good', undefined, NOW);
    expect(isDue(undefined, 1, NOW)).toBe(true);
    expect(isDue(future, 1, NOW)).toBe(false);
    expect(isDue(future, 2, NOW)).toBe(true);
    expect(isDue(future, 1, new Date('2026-07-18T00:00:00.000Z'))).toBe(true);
  });
});
