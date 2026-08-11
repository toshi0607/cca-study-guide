import { useEffect, useRef } from 'preact/hooks';
import { formatDeepLink, parseDeepLink, type DeepLink } from '../../lib/deep-link';
import type { View } from './types';

// Both directions of the hash ↔ view relationship. What a link *means* stays in
// App (it is the one that owns the state a link lands on); this hook owns only
// the URL mechanics.
export function useDeepLinkRouting({ view, onApplyLink }: {
  view: View;
  onApplyLink: (link: DeepLink) => void;
}): void {
  // Skips the very first run of the hash-reflecting effect below: it always
  // fires during this same mount, regardless of whether a deep link was just
  // applied, so acting on it would risk clobbering the hash the learner opened.
  const hashReflectSkipped = useRef(false);

  useEffect(() => {
    // A hash present at load time (someone opened a shared link) opens straight
    // onto its target. `hashchange` covers both the browser Back/Forward buttons
    // moving across a hash we wrote ourselves and a link pasted into the address
    // bar of an already-open tab.
    const applyHashLink = () => {
      const link = parseDeepLink(window.location.hash);
      if (link) onApplyLink(link);
    };
    applyHashLink();
    window.addEventListener('hashchange', applyHashLink);
    return () => window.removeEventListener('hashchange', applyHashLink);
  }, []);

  // Keeps the address bar in sync with the current view, under three contracts:
  // it only ever follows an existing hash and never creates one (a session with
  // no deep link must reload back to Today); a target-bearing hash stays intact
  // while its own view is open; and it writes with `replaceState`, which adds no
  // history entry and fires no `hashchange` to re-enter the effect above.
  useEffect(() => {
    if (!hashReflectSkipped.current) {
      hashReflectSkipped.current = true;
      return;
    }
    if (!window.location.hash) return;
    const current = parseDeepLink(window.location.hash);
    if (current && current.view === view) return;
    try {
      history.replaceState(null, '', formatDeepLink({ view }));
    } catch {
      // history unavailable in this environment (e.g. a sandboxed preview) —
      // the app still works, it just cannot own the URL.
    }
  }, [view]);
}
