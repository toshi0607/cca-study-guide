import { useEffect, useState } from 'preact/hooks';
import type { UiCopy } from '../../i18n/ui';
import type { ExamDateStorage } from '../../lib/exam-date';

export type ExamDateController = {
  examDate: string | null;
  saveExamDate: (value: string) => void;
  clearExamDate: () => void;
  // Clears storage and state without announcing anything, and reports whether the
  // clear succeeded. For the full data reset, which owns its own notice and must
  // keep the date visible if it could not be deleted.
  clearExamDateSilently: () => boolean;
};

// The learner's planned exam date. It lives under its own storage key, so it is
// loaded, saved and cleared independently of the study document.
export function useExamDate({ storage, copy, notify }: {
  storage: ExamDateStorage;
  copy: UiCopy;
  notify: (message: string) => void;
}): ExamDateController {
  const [examDate, setExamDate] = useState<string | null>(null);

  useEffect(() => {
    setExamDate(storage.load());
  }, []);

  const clearExamDateSilently = (): boolean => {
    const cleared = storage.clear();
    if (cleared) setExamDate(null);
    return cleared;
  };

  return {
    examDate,
    saveExamDate: (value: string): void => {
      // `<input type="date">` fires onChange (via Preact's input alias) for every
      // segment edit, and reports an empty value while a segment is still
      // incomplete. Treating that as "clear" would delete an already-saved date
      // mid-edit; only the explicit clear button may do that.
      if (!value) return;
      if (!storage.save(value)) {
        notify(copy.notices.examDateSaveFailed);
        return;
      }
      // No notice/focus on success: the visible input value and the updated
      // days-remaining figure are already the feedback, and moving focus to the
      // notice on every keystroke-driven segment edit would steal it from the
      // input the learner is still editing.
      setExamDate(value);
    },
    clearExamDate: (): void => {
      if (!clearExamDateSilently()) {
        notify(copy.notices.examDateSaveFailed);
        return;
      }
      notify(copy.notices.examDateCleared);
    },
    clearExamDateSilently,
  };
}
