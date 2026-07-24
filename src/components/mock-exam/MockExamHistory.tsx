import type { MutableRef } from 'preact/hooks';
import type { Locale } from '../../i18n/locales';
import type { UiCopy } from '../../i18n/ui';
import type { MockExamAttempt } from '../../lib/mock-exam';
import { mockExamAccuracyPercent } from '../../lib/use-mock-exam';
import { formatDate } from '../app/format';

// A minimal history of completed attempts (most recent first). Correct/total and
// accuracy are read straight from the stored attempt's own correctness flags, so
// the list is stable even after the question content changes — no re-grading, no
// trend analysis (that is deliberately out of scope for this task).
export function MockExamHistory({ attempts, headingRef, locale, copy, onOpen, onBack, onOpenAnalysis }: {
  attempts: readonly MockExamAttempt[];
  headingRef: MutableRef<HTMLHeadingElement | null>;
  locale: Locale;
  copy: UiCopy;
  onOpen: (attempt: MockExamAttempt) => void;
  onBack: () => void;
  onOpenAnalysis: () => void;
}) {
  const ordered = [...attempts].sort((a, b) => b.completedAt.localeCompare(a.completedAt));

  return (
    <section class="mock-exam-history" aria-labelledby="mock-exam-history-title">
      <header class="panel--hero is-compact">
        <p class="eyebrow">{copy.mockExam.eyebrow}</p>
        <h2 id="mock-exam-history-title" class="page-title" tabIndex={-1} ref={headingRef}>{copy.mockExam.historyTitle}</h2>
        <p>{copy.mockExam.historyIntro}</p>
      </header>
      {ordered.length === 0
        ? <p class="mock-exam-history-empty">{copy.mockExam.historyEmpty}</p>
        : <ul class="mock-exam-history-list">
            {ordered.map((attempt) => {
              const correct = attempt.answers.filter((answer) => answer.correct).length;
              const total = attempt.answers.length;
              const percent = mockExamAccuracyPercent(total === 0 ? 0 : correct / total);
              return (
                <li key={attempt.id} class="mock-exam-history-item">
                  <div class="mock-exam-history-meta">
                    <strong>{copy.mockExam.historyEntryDate(formatDate(new Date(attempt.completedAt), locale))}</strong>
                    <span>{attempt.outcome === 'expired' ? copy.mockExam.outcomeExpired : copy.mockExam.outcomeSubmitted}</span>
                    <span>{copy.mockExam.historyEntryScore(correct, total)}</span>
                    <span>{copy.mockExam.historyEntryAccuracy(percent)}</span>
                  </div>
                  <button type="button" class="btn btn--secondary" onClick={() => onOpen(attempt)}>{copy.mockExam.historyOpen}</button>
                </li>
              );
            })}
          </ul>}
      <div class="mock-exam-landing-links">
        {ordered.length > 0 && <button type="button" class="btn--text mock-exam-link" onClick={onOpenAnalysis}>{copy.mockExam.analysis.openButton}</button>}
        <button type="button" class="btn--text mock-exam-link" onClick={onBack}>{copy.mockExam.backToLanding}</button>
      </div>
    </section>
  );
}
