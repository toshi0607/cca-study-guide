import { useRef, useState } from 'preact/hooks';
import type { UiCopy } from '../../i18n/ui';
import { isImportSizeAllowed, MAX_IMPORT_TEXT_LENGTH, parseStudyDataImport, type createStudyStorage, type ImportedStudyData, type StudyData } from '../../lib/storage';
import { mergeStudyData } from '../../lib/study-data-merge';

export type StudyStorage = ReturnType<typeof createStudyStorage>;

export type StudyImportController = {
  // A parsed import awaiting the learner's replace/merge/cancel choice.
  pendingImport: ImportedStudyData | null;
  // Whether the last save attempt for the pending import failed. The dialog
  // stays open and shows this instead of losing the parsed import.
  importError: boolean;
  importFile: (event: Event) => void;
  finishImport: (mode: 'replace' | 'merge') => void;
  cancelImport: () => void;
};

// The JSON import flow: read the picked file, hold the parsed document until the
// learner chooses replace or merge, then persist it.
export function useStudyImport({ storage, copy, notify, onImported }: {
  storage: StudyStorage;
  copy: UiCopy;
  notify: (message: string, sticky?: boolean) => void;
  onImported: (data: StudyData) => void;
}): StudyImportController {
  const [pendingImport, setPendingImport] = useState<ImportedStudyData | null>(null);
  const [importError, setImportError] = useState(false);
  // Serializes imports: a second file picked while one is still being read
  // would otherwise apply in resolution order, not selection order.
  const importBusyRef = useRef(false);

  const applyImport = (imported: ImportedStudyData | null): void => {
    if (!imported) {
      notify(copy.notices.importInvalid, true);
      return;
    }
    setImportError(false);
    setPendingImport(imported);
  };

  return {
    pendingImport,
    importError,
    importFile: (event: Event): void => {
      const input = event.currentTarget as HTMLInputElement;
      const file = input.files?.[0];
      input.value = '';
      if (!file || importBusyRef.current) return;
      // Reject an oversized file by its reported size, before reading it into memory
      // or handing it to JSON.parse — parseStudyDataImport repeats this check on the
      // decoded text, but that check should never fire when this one already ran.
      if (!isImportSizeAllowed(file.size)) {
        notify(copy.notices.importTooLarge(MAX_IMPORT_TEXT_LENGTH / (1024 * 1024)), true);
        return;
      }
      importBusyRef.current = true;
      void file.text()
        .then((text) => applyImport(parseStudyDataImport(text)), () => applyImport(null))
        .finally(() => {
          importBusyRef.current = false;
        });
    },
    // The pending import is only cleared once its save succeeds, or on an
    // explicit cancel: clearing it up front (as before) would drop the parsed
    // import on a save failure, forcing the learner to re-pick the file.
    finishImport: (mode: 'replace' | 'merge'): void => {
      if (!pendingImport) return;
      // Re-read canonical storage: another tab may have written since the file was
      // picked, and a merge must combine with what is actually stored now.
      const next = mode === 'merge' ? mergeStudyData(storage.load(), pendingImport.data) : pendingImport.data;
      if (!storage.save(next)) {
        setImportError(true);
        return;
      }
      setImportError(false);
      setPendingImport(null);
      onImported(next);
      notify(mode === 'merge' ? copy.notices.importMerged : copy.notices.importDone);
    },
    cancelImport: (): void => {
      setImportError(false);
      setPendingImport(null);
      notify(copy.notices.importCancelled);
    },
  };
}
