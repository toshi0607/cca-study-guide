import { useEffect, useRef, useState } from 'preact/hooks';
import type { Locale } from '../i18n/locales';
import type { UiCopy } from '../i18n/ui';
import type { QuizStat } from '../lib/storage';
import { Button } from './app/Button';

type QuizComponent = typeof import('./views/QuizView').QuizView;

// Lazily loads the Quiz view so its content dependency — the full question bank
// (questions.ts) plus QuestionMetadata — stays out of the initial landing
// bundle. App imports this wrapper (which holds no question data) instead of
// QuizView directly, mirroring GuideEntry/HandsOnEntry/MockExamEntry.
export function QuizEntry(props: {
  locale: Locale;
  copy: UiCopy;
  quizStats?: Record<string, QuizStat>;
  onAnswer: (questionId: string, correct: boolean) => boolean;
  targetQuestionId: string | null;
  onTargetOpened: () => void;
  targetScenarioId: string | null;
  onTargetScenarioOpened: () => void;
}) {
  const [Quiz, setQuiz] = useState<QuizComponent | null>(null);
  const [error, setError] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setQuiz(null); setError(false);
    void import('./views/QuizView').then(
      (module) => { if (!cancelled) setQuiz(() => module.QuizView); },
      () => { if (!cancelled) { setError(true); requestAnimationFrame(() => errorRef.current?.focus()); } },
    );
    return () => { cancelled = true; };
  }, []);

  if (error) return <section class="quiz-load-error panel" role="alert" tabIndex={-1} ref={errorRef}><p>{props.copy.quiz.loadError}</p><Button onClick={() => window.location.reload()}>{props.copy.quiz.loadRetry}</Button></section>;
  if (!Quiz) return <section class="quiz-loading panel" role="status" aria-live="polite" aria-busy="true"><p>{props.copy.quiz.loading}</p></section>;
  return <Quiz {...props}/>;
}
