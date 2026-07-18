import { describe, expect, it } from 'vitest';
import { emptyTally, rateSessionCard } from './session';

describe('rateSessionCard', () => {
  it('advances to the next card and counts the rating', () => {
    // #given
    const queue = ['a', 'b', 'c'];

    // #when
    const step = rateSessionCard(queue, 0, 'good', emptyTally());

    // #then
    expect(step).toEqual({ queue: ['a', 'b', 'c'], index: 1, tally: { again: 0, hard: 0, good: 1 }, finished: false });
  });

  it('re-queues an again-rated card at the end of the session', () => {
    // #given
    const queue = ['a', 'b'];

    // #when
    const step = rateSessionCard(queue, 0, 'again', emptyTally());

    // #then
    expect(step.queue).toEqual(['a', 'b', 'a']);
    expect(step.finished).toBe(false);
  });

  it('finishes when the last card is rated without re-queueing', () => {
    // #given
    const queue = ['a'];

    // #when
    const step = rateSessionCard(queue, 0, 'hard', emptyTally());

    // #then
    expect(step).toEqual({ queue: ['a'], index: 1, tally: { again: 0, hard: 1, good: 0 }, finished: true });
  });

  it('keeps the session alive when the last card is rated again', () => {
    // #given — a single-card queue rated 'again' must come back once more
    const queue = ['a'];

    // #when
    const step = rateSessionCard(queue, 0, 'again', emptyTally());

    // #then
    expect(step.queue).toEqual(['a', 'a']);
    expect(step.index).toBe(1);
    expect(step.finished).toBe(false);
  });

  it('accumulates tallies across consecutive ratings', () => {
    // #given
    let step = rateSessionCard(['a', 'b', 'c'], 0, 'again', emptyTally());

    // #when
    step = rateSessionCard(step.queue, step.index, 'hard', step.tally);
    step = rateSessionCard(step.queue, step.index, 'good', step.tally);
    step = rateSessionCard(step.queue, step.index, 'good', step.tally);

    // #then — 3 cards + 1 re-queued 'again' card, all rated
    expect(step.tally).toEqual({ again: 1, hard: 1, good: 2 });
    expect(step.finished).toBe(true);
  });
});
