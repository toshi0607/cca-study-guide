import { useRef, useState } from 'preact/hooks';
import type { UiCopy } from '../../i18n/ui';
import { isImportSizeAllowed, MAX_IMPORT_TEXT_LENGTH, parseStudyDataImport, type createStudyStorage, type ImportedStudyData, type StudyData } from '../../lib/storage';
import { mergeStudyData } from '../../lib/study-data-merge';

export type StudyStorage = ReturnType<typeof createStudyStorage>;

export type StudyImportController = {
  // A parsed import awaiting the learner's replace/merge/cancel choice.
  pendingImport: ImportedStudyData | null;
  importFile: (event: Event) => void;
  finishImport: (mode: 'replace' | 'merge') => void;
  cancelImport: () => void;
};

// The JSON import flow: read the picked file, hold the parsed document until the
// learner chooses replace or merge, then persist it.
export function useStudyImport({ storage, copy, notify, onImported }: {
  storage: StudyStorage;
  copy: UiCopy;
  notify: (message: string) => void;
  onImported: (data: StudyData) => void;
}): StudyImportController {
  const [pendingImport, setPendingImport] = useState<ImportedStudyData | null>(null);
  // Serializes imports: a second file picked while one is still being read
  // would otherwise apply in resolution order, not selection order.
  const importBusyRef = useRef(false);

  const applyImport = (imported: ImportedStudyData | null): void => {
    if (!imported) {
      notify(copy.notices.importInvalid);
      return;
    }
    setPendingImport(imported);
  };

  return {
    pendingImport,
    importFile: (event: Event): void => {
      const input = event.currentTarget as HTMLInputElement;
      const file = input.files?.[0];
      input.value = '';
      if (!file || importBusyRef.current) return;
      // Reject an oversized file by its reported size, before reading it into memory
      // or handing it to JSON.parse — parseStudyDataImport repeats this check on the
      // decoded text, but that check should never fire when this one already ran.
      if (!isImportSizeAllowed(file.size)) {
        notify(copy.notices.importTooLarge(MAX_IMPORT_TEXT_LENGTH / (1024 * 1024)));
        return;
      }
      importBusyRef.current = true;
      void file.text()
        .then((text) => applyImport(parseStudyDataImport(text)), () => applyImport(null))
        .finally(() => {
          importBusyRef.current = false;
        });
    },
    finishImport: (mode: 'replace' | 'merge'): void => {
      const pending = pendingImport;
      setPendingImport(null);
      if (!pending) return;
      // Re-read canonical storage: another tab may have written since the file was
      // picked, and a merge must combine with what is actually stored now.
      const next = mode === 'merge' ? mergeStudyData(storage.load(), pending.data) : pending.data;
      if (!storage.save(next)) {
        notify(copy.notices.saveFailed);
        return;
      }
      onImported(next);
      notify(mode === 'merge' ? copy.notices.importMerged : copy.notices.importDone);
    },
    cancelImport: (): void => {
      setPendingImport(null);
      notify(copy.notices.importCancelled);
    },
  };
}
