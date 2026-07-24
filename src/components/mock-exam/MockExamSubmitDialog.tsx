import type { UiCopy } from '../../i18n/ui';
import { useModalDialog } from '../../lib/use-mock-exam';

// Explicit-submit confirmation. Submitting stays possible with unanswered
// questions, but the dialog states plainly that unanswered questions count as
// incorrect within the 60-question total and that answers lock after submit.
export function MockExamSubmitDialog({ open, answered, unanswered, flagged, submitting, copy, onConfirm, onCancel }: {
  open: boolean;
  answered: number;
  unanswered: number;
  flagged: number;
  submitting: boolean;
  copy: UiCopy;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useModalDialog(open);
  return (
    <dialog ref={dialogRef} class="mock-exam-submit-dialog" aria-labelledby="mock-exam-submit-title" onClose={onCancel} onCancel={onCancel}>
      <h2 id="mock-exam-submit-title" class="card-title">{copy.mockExam.submitDialogTitle}</h2>
      <p>{copy.mockExam.submitDialogBody}</p>
      <ul class="mock-exam-submit-summary">
        <li>{copy.mockExam.submitDialogAnswered(answered)}</li>
        <li>{copy.mockExam.submitDialogUnanswered(unanswered)}</li>
        <li>{copy.mockExam.submitDialogFlagged(flagged)}</li>
      </ul>
      <p class="note note--warn mock-exam-submit-warn">{copy.mockExam.submitDialogWarnNoChange}</p>
      {unanswered > 0 && <p class="note note--warn mock-exam-submit-warn" role="note">{copy.mockExam.submitDialogWarnUnanswered}</p>}
      <div class="mock-exam-dialog-actions">
        <button type="button" class="btn btn--secondary" onClick={onCancel} disabled={submitting}>{copy.mockExam.submitDialogCancel}</button>
        <button type="button" class="btn" onClick={onConfirm} disabled={submitting}>{copy.mockExam.submitDialogConfirm}</button>
      </div>
    </dialog>
  );
}
