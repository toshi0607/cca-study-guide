import { useEffect, useRef, useState } from 'preact/hooks';
import type { MockExamViewProps } from './mock-exam/MockExamView';

type MockExamComponent = typeof import('./mock-exam/MockExamView').MockExamView;

// Lazy wrapper: the whole Mock Exam view tree (runner, timer, palette, review,
// history) is a large chunk that only matters once the learner opens the exam,
// so it is dynamically imported here — mirroring GuideEntry/HandsOnEntry — and
// never rides in the initial App bundle. The per-choice rationale text is
// deferred a second step further, loaded only when the review screen mounts.
export function MockExamEntry(props: MockExamViewProps) {
  const [View, setView] = useState<MockExamComponent | null>(null);
  const [error, setError] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setView(null); setError(false);
    void import('./mock-exam/MockExamView').then(
      (module) => { if (!cancelled) setView(() => module.MockExamView); },
      () => { if (!cancelled) { setError(true); requestAnimationFrame(() => errorRef.current?.focus()); } },
    );
    return () => { cancelled = true; };
  }, []);

  if (error) return <section class="mock-exam-load-error" role="alert" tabIndex={-1} ref={errorRef}><p>{props.copy.mockExam.loadError}</p><button type="button" onClick={() => window.location.reload()}>{props.copy.mockExam.retry}</button></section>;
  if (!View) return <section class="mock-exam-loading" role="status" aria-live="polite" aria-busy="true"><p>{props.copy.mockExam.loading}</p></section>;
  return <View {...props}/>;
}
