import { useEffect, useRef, useState } from 'preact/hooks';
import type { ProgressOverviewProps } from './ProgressOverview';

type OverviewComponent = typeof import('./ProgressOverview').ProgressOverview;

// Lazy wrapper: the overview is the only non-lazy-view consumer of the full Study
// Guide and Hands-on content, so it is dynamically imported to keep that content
// out of the initial landing bundle. Mirrors GuideEntry/HandsOnEntry/MockExamEntry.
export function ProgressOverviewEntry(props: ProgressOverviewProps) {
  const [Overview, setOverview] = useState<OverviewComponent | null>(null);
  const [error, setError] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setOverview(null); setError(false);
    void import('./ProgressOverview').then(
      (module) => { if (!cancelled) setOverview(() => module.ProgressOverview); },
      () => { if (!cancelled) { setError(true); requestAnimationFrame(() => errorRef.current?.focus()); } },
    );
    return () => { cancelled = true; };
  }, []);

  if (error) return <section class="progress-overview-error" role="alert" tabIndex={-1} ref={errorRef}><p>{props.copy.progress.overview.loadError}</p><button type="button" onClick={() => window.location.reload()}>{props.copy.progress.overview.retry}</button></section>;
  if (!Overview) return <section class="progress-overview-loading" role="status" aria-live="polite" aria-busy="true"><p>{props.copy.progress.overview.loading}</p></section>;
  return <Overview {...props}/>;
}
