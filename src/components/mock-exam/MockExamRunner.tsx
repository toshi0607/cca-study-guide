import { useEffect, useRef, useState } from 'preact/hooks';
import type { ChoiceQuestion } from '../../content/types';
import type { Locale } from '../../i18n/locales';
import type { UiCopy } from '../../i18n/ui';
import { deriveMockExamProgress, type MockExamSession } from '../../lib/mock-exam';
import { MockExamPalette } from './MockExamPalette';
import { MockExamQuestion } from './MockExamQuestion';
import { MockExamSubmitDialog } from './MockExamSubmitDialog';
import { MockExamTimer } from './MockExamTimer';

// The timed runner. All state (answers, flags, cursor) lives in the session, so
// this component only derives progress and dispatches engine calls upward; the
// palette and submit dialog own only their open/closed UI state. Focus moves to
// the question heading on every cursor change so keyboard users are anchored to
// the new question.
export function MockExamRunner({ session, question, remainingSeconds, submitting, locale, copy, onSelect, onToggleFlag, onMove, onSubmit }: {
  session: MockExamSession;
  question: ChoiceQuestion;
  remainingSeconds: number;
  submitting: boolean;
  locale: Locale;
  copy: UiCopy;
  onSelect: (questionId: string, selectedChoiceIds: string[]) => void;
  onToggleFlag: (questionId: string) => void;
  onMove: (index: number) => void;
  onSubmit: () => void;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  const progress = deriveMockExamProgress(session);
  const currentIndex = session.currentIndex;
  const answeredSet = new Set(progress.answeredQuestionIds);
  const flaggedSet = new Set(session.flaggedQuestionIds);
  const selected = session.answers[question.id]?.selectedChoiceIds ?? [];

  useEffect(() => {
    requestAnimationFrame(() => headingRef.current?.focus());
  }, [currentIndex]);

  const handleSelect = (choiceId: string) => {
    if (question.format === 'single') {
      onSelect(question.id, [choiceId]);
    } else {
      onSelect(question.id, selected.includes(choiceId) ? selected.filter((id) => id !== choiceId) : [...selected, choiceId]);
    }
  };

  return (
    <section class="mock-exam-runner" aria-labelledby="mock-exam-runner-title">
      <h2 id="mock-exam-runner-title" class="sr-only">{copy.views['mock-exam']}</h2>
      <div class="mock-exam-runner-head">
        <code class="mock-exam-progress">{copy.mockExam.questionProgress(currentIndex + 1, progress.total)}</code>
        <MockExamTimer remainingSeconds={remainingSeconds} copy={copy}/>
      </div>
      <div class="mock-exam-counts">
        <span>{copy.mockExam.answeredCount(progress.answeredCount)}</span>
        <span>{copy.mockExam.unansweredCount(progress.unansweredCount)}</span>
        <button type="button" class="mock-exam-secondary" onClick={() => setPaletteOpen(true)}>{copy.mockExam.openPalette}</button>
      </div>
      <MockExamQuestion
        question={question}
        selected={selected}
        flagged={flaggedSet.has(question.id)}
        locale={locale}
        copy={copy}
        headingRef={headingRef}
        onSelect={handleSelect}
        onToggleFlag={() => onToggleFlag(question.id)}
      />
      <div class="mock-exam-runner-nav">
        <button type="button" class="mock-exam-secondary" disabled={currentIndex === 0} onClick={() => onMove(currentIndex - 1)}>{copy.mockExam.prevQuestion}</button>
        <button type="button" class="mock-exam-secondary" disabled={currentIndex >= progress.total - 1} onClick={() => onMove(currentIndex + 1)}>{copy.mockExam.nextQuestion}</button>
        <button type="button" class="mock-exam-primary" onClick={() => setSubmitOpen(true)}>{copy.mockExam.submitExam}</button>
      </div>
      <MockExamPalette
        open={paletteOpen}
        refs={session.questionRefs}
        currentIndex={currentIndex}
        answered={answeredSet}
        flagged={flaggedSet}
        copy={copy}
        onSelect={(index) => { onMove(index); setPaletteOpen(false); }}
        onClose={() => setPaletteOpen(false)}
      />
      <MockExamSubmitDialog
        open={submitOpen}
        answered={progress.answeredCount}
        unanswered={progress.unansweredCount}
        flagged={progress.flaggedCount}
        submitting={submitting}
        copy={copy}
        onConfirm={onSubmit}
        onCancel={() => setSubmitOpen(false)}
      />
    </section>
  );
}
