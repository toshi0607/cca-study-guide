import type { ReviewState } from './scheduler';

export function isWeak(review: ReviewState | undefined): boolean {
  if (!review) return false;
  return review.lapses >= 2 || review.lastRating === 'again' || review.lastRating === 'hard';
}
