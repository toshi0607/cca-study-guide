import type { UiCopy } from '../../i18n/ui';
import { MOCK_EXAM_DURATION_SECONDS, MOCK_EXAM_QUESTION_COUNT } from '../../lib/mock-exam';

// Start screen. Exam size and duration come from the blueprint constants, never
// re-hardcoded here. When a session is already in flight, resume is the primary
// action and starting over is a distinct, guarded secondary action.
export function MockExamLanding({ hasActiveSession, hasHistory, createError, copy, onStart, onResume, onNewExam, onOpenHistory, onOpenAnalysis }: {
  hasActiveSession: boolean;
  hasHistory: boolean;
  createError: boolean;
  copy: UiCopy;
  onStart: () => void;
  onResume: () => void;
  onNewExam: () => void;
  onOpenHistory: () => void;
  onOpenAnalysis: () => void;
}) {
  return (
    <section class="mock-exam-landing" aria-labelledby="mock-exam-title">
      <header class="panel--hero">
        <p class="eyebrow">{copy.mockExam.eyebrow}</p>
        <h2 id="mock-exam-title" class="page-title">{copy.mockExam.title}</h2>
        <p>{copy.mockExam.introduction}</p>
      </header>
      <ul class="mock-exam-specs">
        <li>{copy.mockExam.specQuestions(MOCK_EXAM_QUESTION_COUNT)}</li>
        <li>{copy.mockExam.specDuration(Math.round(MOCK_EXAM_DURATION_SECONDS / 60))}</li>
        <li>{copy.mockExam.specDomainBased}</li>
      </ul>
      <ul class="mock-exam-disclaimers">
        <li>{copy.mockExam.disclaimerNot4of6}</li>
        <li>{copy.mockExam.disclaimerRawOnly}</li>
        <li>{copy.mockExam.disclaimerNoScaled}</li>
        <li>{copy.mockExam.disclaimerResumable}</li>
      </ul>
      {createError && <p class="note note--danger mock-exam-error" role="alert">{copy.mockExam.createFailed}</p>}
      {hasActiveSession
        ? <div class="panel panel--sm mock-exam-resume">
            <h3 class="card-title">{copy.mockExam.resumeHeading}</h3>
            <div class="mock-exam-landing-actions">
              <button type="button" class="btn" onClick={onResume}>{copy.mockExam.resumeButton}</button>
              <button type="button" class="btn btn--secondary" onClick={onNewExam}>{copy.mockExam.newExamButton}</button>
            </div>
          </div>
        : <div class="mock-exam-landing-actions">
            <button type="button" class="btn" onClick={onStart}>{copy.mockExam.startButton}</button>
          </div>}
      <div class="mock-exam-landing-links">
        {hasHistory && <button type="button" class="btn--text mock-exam-link" onClick={onOpenHistory}>{copy.mockExam.historyButton}</button>}
        <button type="button" class="btn--text mock-exam-link" onClick={onOpenAnalysis}>{copy.mockExam.analysis.openButton}</button>
      </div>
    </section>
  );
}
