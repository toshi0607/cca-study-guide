import { useEffect, useRef, useState } from 'preact/hooks';
import type { UiCopy } from '../../i18n/ui';
import type { MockExamAnalysisProps } from './MockExamAnalysis';
import { Button } from '../app/Button';

type MockExamAnalysisComponent = typeof import('./MockExamAnalysis').MockExamAnalysis;

// Second-stage lazy split: the analysis view (analyzer + content lookups + its
// tables) is a distinct chunk from the exam runner, loaded only when the learner
// opens "learning analysis" — so neither the initial App bundle nor the mock-exam
// runner chunk carries the analysis logic. Mirrors MockExamEntry's own pattern.
export function MockExamAnalysisEntry(props: MockExamAnalysisProps & { copy: UiCopy }) {
  const [View, setView] = useState<MockExamAnalysisComponent | null>(null);
  const [error, setError] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setView(null); setError(false);
    void import('./MockExamAnalysis').then(
      (module) => { if (!cancelled) setView(() => module.MockExamAnalysis); },
      () => { if (!cancelled) { setError(true); requestAnimationFrame(() => errorRef.current?.focus()); } },
    );
    return () => { cancelled = true; };
  }, []);

  if (error) return <section class="mock-exam-load-error" role="alert" tabIndex={-1} ref={errorRef}><p>{props.copy.mockExam.loadError}</p><Button variant="secondary" onClick={() => window.location.reload()}>{props.copy.mockExam.retry}</Button></section>;
  if (!View) return <section class="mock-exam-loading" role="status" aria-live="polite" aria-busy="true"><p>{props.copy.mockExam.loading}</p></section>;
  return <View {...props}/>;
}
