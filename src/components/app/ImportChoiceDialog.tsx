import { useEffect, useRef } from 'preact/hooks';
import type { UiCopy } from '../../i18n/ui';
import { Button } from './Button';

// Three-way import choice. `window.confirm` can only ask yes/no, and replacing a
// learner's history is not a decision to make on their behalf — so replace and
// merge are offered as distinct, explicitly labelled actions.
//
// A native <dialog> opened with showModal(), not a styled <section>: the choice
// it presents is about the whole stored document, so the rest of the app must be
// unreachable while it is open. `window.confirm` was genuinely modal, and losing
// that would let a learner answer a quiz question behind the dialog and then have
// "replace" silently discard it. showModal() gives the focus trap, the inert
// backdrop, and Escape-to-close from the platform rather than from hand-rolled
// key handling that only approximates them.
export function ImportChoiceDialog({ copy, reviewedTotal, exportedAt, saveError, onReplace, onMerge, onCancel }: {
  copy: UiCopy;
  reviewedTotal: number;
  exportedAt: string | null;
  saveError: boolean;
  onReplace: () => void;
  onMerge: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && typeof dialog.showModal !== 'function') {
      // When showModal is unavailable (very old engines), display non-modally so
      // the dialog is still visible and the choices are still actionable
      // (background remains operable but the dialog is shown).
      dialog.open = true;
    } else {
      try {
        if (dialog && !dialog.open) dialog.showModal();
      } catch {
        if (dialog) dialog.open = true;
      }
    }
    const frame = requestAnimationFrame(() => headingRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <dialog
      class="panel import-choice-dialog"
      ref={dialogRef}
      aria-labelledby="import-choice-title"
      // Escape fires `cancel` on a modal dialog; routing it through onCancel
      // keeps the "nothing was changed" notice consistent with the button.
      onCancel={(event) => { event.preventDefault(); onCancel(); }}
    >
      <h2 id="import-choice-title" class="section-title" tabIndex={-1} ref={headingRef}>{copy.notices.importChoiceTitle}</h2>
      {saveError && <p class="note note--danger import-save-error" role="alert">{copy.notices.importSaveFailed}</p>}
      <p>{copy.notices.importChoiceSummary(reviewedTotal, exportedAt)}</p>
      <p>{copy.notices.importChoiceMergeNote}</p>
      <p>{copy.notices.importChoiceReplaceNote}</p>
      <div class="data-actions">
        <Button onClick={onMerge} class="import-merge">{copy.notices.importChoiceMerge}</Button>
        <Button variant="secondary" onClick={onReplace} class="import-replace">{copy.notices.importChoiceReplace}</Button>
        <Button variant="secondary" onClick={onCancel} class="import-cancel">{copy.notices.importChoiceCancel}</Button>
      </div>
    </dialog>
  );
}
