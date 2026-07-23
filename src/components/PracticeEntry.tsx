import { useEffect, useRef, useState } from 'preact/hooks';

type PracticeComponent = typeof import('./views/PracticeView').PracticeView;
type PracticeProps = Parameters<PracticeComponent>[0];

// Lazily loads the Practice view so the full card/domain prose (cards.ts +
// domains.ts) stays out of the initial landing bundle. App feeds Today/Blueprint
// from the lightweight content spine instead; only opening Practice pulls the
// heavy content. Mirrors GuideEntry/HandsOnEntry/QuizEntry.
export function PracticeEntry(props: PracticeProps) {
  const [Practice, setPractice] = useState<PracticeComponent | null>(null);
  const [error, setError] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setPractice(null); setError(false);
    void import('./views/PracticeView').then(
      (module) => { if (!cancelled) setPractice(() => module.PracticeView); },
      () => { if (!cancelled) { setError(true); requestAnimationFrame(() => errorRef.current?.focus()); } },
    );
    return () => { cancelled = true; };
  }, []);

  if (error) return <section class="practice-load-error" role="alert" tabIndex={-1} ref={errorRef}><p>{props.copy.practice.loadError}</p><button type="button" onClick={() => window.location.reload()}>{props.copy.practice.loadRetry}</button></section>;
  if (!Practice) return <section class="practice-loading" role="status" aria-live="polite" aria-busy="true"><p>{props.copy.practice.loading}</p></section>;
  return <Practice {...props}/>;
}
