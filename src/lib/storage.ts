import {
  createEmptyStudyData,
  isParsableDate,
  isRecord,
  parseStudyData,
  parseStudyDataV3,
  type StudyData,
} from './storage-schema';

export {
  createEmptyStudyData,
  migrateStudyDataV1ToV2,
  migrateStudyDataV2ToV3,
  parseStudyData,
  parseStudyDataV1,
  parseStudyDataV2,
  parseStudyDataV3,
  CURRENT_STUDY_DATA_VERSION,
} from './storage-schema';
export type {
  HandsOnProgress,
  ParsedStudyData,
  QuizStat,
  StudyData,
  StudyDataV1,
  StudyDataV2,
  StudyDataV3,
  StudyGuideProgress,
} from './storage-schema';

// The key names a storage generation, not the schema version inside it. v2 data
// lives under its own key so a deploy rollback still finds intact v1 data, and a
// failed v2 write can never damage what v1 already holds.
export const STORAGE_KEY = 'cca-field-notes:v2';
export const LEGACY_STORAGE_KEY = 'cca-field-notes:v1';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type StudyDataExportDocument = StudyData & { exportedAt: string; app: 'CCA Field Notes' };

export function buildStudyDataExport(data: StudyData, exportedAt: Date): StudyDataExportDocument {
  return { exportedAt: exportedAt.toISOString(), app: 'CCA Field Notes', ...data };
}

export type ImportedStudyData = { data: StudyData; exportedAt?: string; migrated: boolean };

// Every major browser guarantees at least 5MB of localStorage per origin, and this
// app's largest realistic export — every card reviewed, every quiz answered, full
// study-guide and hands-on progress — runs to a few hundred KB (see the fixtures in
// storage.test.ts). 5MB rejects a file that could not possibly be a legitimate
// export long before we would otherwise find out the slow way, via a browser
// QuotaExceededError on save. The export format is effectively ASCII (ids, ISO
// dates, numbers, booleans), so `string.length` (UTF-16 code units) and a File's
// byte size track closely enough for this guard.
export const MAX_IMPORT_TEXT_LENGTH = 5 * 1024 * 1024; // 5MB

// Pure so both the file-size check (before the file is even read into memory) and
// parseStudyDataImport (before JSON.parse) can share one rule, and so the boundary
// is unit-testable without needing a real File object.
export function isImportSizeAllowed(length: number): boolean {
  return length <= MAX_IMPORT_TEXT_LENGTH;
}

// Accepts both a StudyDataExportDocument and a bare StudyData document —
// the export wrapper keeps the StudyData fields at the top level. A v1 document
// is migrated before it reaches the caller, so imports never apply v1 shapes.
export function parseStudyDataImport(text: string): ImportedStudyData | null {
  if (!isImportSizeAllowed(text.length)) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    const result = parseStudyData(parsed);
    if (!result) return null;
    const imported: ImportedStudyData = { data: result.data, migrated: result.migrated };
    return isRecord(parsed) && isParsableDate(parsed.exportedAt) ? { ...imported, exportedAt: parsed.exportedAt } : imported;
  } catch {
    return null;
  }
}

// A value that is not JSON is as unreadable as one that fails validation, and
// both must take the same branch instead of aborting the whole read.
function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function createStudyStorage(storage: StorageLike | undefined) {
  const persist = (data: StudyData): boolean => {
    if (!storage) return false;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  };

  // A stored value this build cannot read — a corrupt document, or one written by
  // a newer release after a deploy rollback — must never be overwritten: whoever
  // wrote it can still read it. A v2 (or v1) document under the current key is
  // readable-and-migratable, so it is safe to write over; only a truly unknown
  // shape blocks saving until the user resets, reported like any write failure.
  const isCurrentKeyWritable = (): boolean => {
    if (!storage) return false;
    try {
      const current = storage.getItem(STORAGE_KEY);
      return current === null || parseStudyData(parseJson(current)) !== null;
    } catch {
      return false;
    }
  };

  return {
    // Always returns current-version data. Reading never writes: a v2 document
    // under the current key is migrated to v3 in memory and left on disk as v2
    // until the next genuine save upgrades it, so loading a page never mutates
    // storage. Only a legacy v1 document is written onto the current key on load,
    // because it lives under a different key that would otherwise be re-migrated
    // on every start (and an existing test depends on that one-time move).
    load(): StudyData {
      if (!storage) return createEmptyStudyData();
      try {
        const current = storage.getItem(STORAGE_KEY);
        if (current !== null) return parseStudyData(parseJson(current))?.data ?? createEmptyStudyData();

        const legacy = storage.getItem(LEGACY_STORAGE_KEY);
        if (legacy === null) return createEmptyStudyData();
        const parsedLegacy = parseStudyData(parseJson(legacy));
        // Only a genuine older document migrates from the legacy key; a shape this
        // build cannot read is left untouched rather than written to the current key.
        if (!parsedLegacy || !parsedLegacy.migrated) return createEmptyStudyData();

        // Best effort: if the write fails the legacy key still holds the data,
        // so the next load migrates again instead of losing it.
        persist(parsedLegacy.data);
        return parsedLegacy.data;
      } catch {
        return createEmptyStudyData();
      }
    },
    // Validation is strict, so a document is either stored whole or refused —
    // nothing is silently pruned on the way in, and what is reported as saved
    // reloads identically. The parsed copy drops only export-wrapper fields.
    save(data: StudyData): boolean {
      const validated = parseStudyDataV3(data);
      if (!validated || !isCurrentKeyWritable()) return false;
      return persist(validated);
    },
    // True only when the current key holds a value this build cannot read (corrupt
    // JSON, or a newer release's document after a deploy rollback). load() returns
    // empty data in that case so the app looks fresh, and save() refuses to
    // overwrite it — so the UI must warn the learner not to reset, which would
    // discard the still-recoverable document. An absent or readable doc returns
    // false; a throwing storage is a separate (availability) failure.
    hasUnreadableCurrentDocument(): boolean {
      if (!storage) return false;
      try {
        const current = storage.getItem(STORAGE_KEY);
        if (current === null) return false;
        return parseStudyData(parseJson(current)) === null;
      } catch {
        return false;
      }
    },
    // An explicit reset clears both generations; leaving v1 behind would let the
    // next load migrate the deleted data back.
    reset(): boolean {
      if (!storage) return false;
      try {
        storage.removeItem(STORAGE_KEY);
        storage.removeItem(LEGACY_STORAGE_KEY);
        return true;
      } catch {
        return false;
      }
    },
  };
}
