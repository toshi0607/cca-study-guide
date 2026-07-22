import { useEffect, useState } from 'preact/hooks';
import type { ChoiceRationales } from '../content/types';

// The per-choice rationale text is review-only and large, so it must never ride
// in the initial or pre-answer quiz bundle. It is loaded on demand through this
// module-level cache: the first caller triggers the dynamic import, and every
// later caller (a subsequent question, the summary) reuses the same promise, so
// the `rationales.<hash>.js` chunk is requested at most once per session.
let rationalesPromise: Promise<ChoiceRationales> | null = null;

export function loadChoiceRationales(): Promise<ChoiceRationales> {
  if (!rationalesPromise) {
    rationalesPromise = import('../content/rationales').then((module) => module.choiceRationales);
  }
  return rationalesPromise;
}

// Test-only: reset the module cache so a mocked import can be exercised freshly.
export function resetChoiceRationalesCache(): void {
  rationalesPromise = null;
}

export type RationalesState =
  | { status: 'idle'; rationales: null }
  | { status: 'loading'; rationales: null }
  | { status: 'loaded'; rationales: ChoiceRationales }
  | { status: 'error'; rationales: null };

// Loads the rationale module once `active` becomes true (i.e. after the first
// answer is recorded). The cancelled guard makes a late resolution after unmount
// or after leaving the quiz a no-op, and because the loaded map is keyed by
// question id and localized at render time, a stale result can never surface the
// wrong question's or wrong locale's text. Recovery from a failed chunk load is a
// page reload — there is no cached-rejection replay masquerading as a retry.
export function useChoiceRationales(active: boolean): RationalesState {
  const [state, setState] = useState<RationalesState>({ status: 'idle', rationales: null });

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setState({ status: 'loading', rationales: null });
    loadChoiceRationales().then(
      (rationales) => { if (!cancelled) setState({ status: 'loaded', rationales }); },
      () => { if (!cancelled) setState({ status: 'error', rationales: null }); },
    );
    return () => { cancelled = true; };
  }, [active]);

  return state;
}
