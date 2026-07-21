import {
  createEmptyStudyData,
  isParsableDate,
  isRecord,
  migrateStudyDataV1ToV2,
  parseStudyData,
  parseStudyDataV1,
  parseStudyDataV2,
  type StudyData,
} from './storage-schema';

export {
  createEmptyStudyData,
  migrateStudyDataV1ToV2,
  parseStudyData,
  parseStudyDataV1,
  parseStudyDataV2,
  CURRENT_STUDY_DATA_VERSION,
} from './storage-schema';
export type {
  HandsOnProgress,
  ParsedStudyData,
  QuizStat,
  StudyData,
  StudyDataV1,
  StudyDataV2,
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

// Accepts both a StudyDataExportDocument and a bare StudyData document —
// the export wrapper keeps the StudyData fields at the top level. A v1 document
// is migrated before it reaches the caller, so imports never apply v1 shapes.
export function parseStudyDataImport(text: string): ImportedStudyData | null {
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
  // wrote it can still read it. Saving is refused until the user resets, which is
  // reported like any other write failure.
  const isCurrentKeyWritable = (): boolean => {
    if (!storage) return false;
    try {
      const current = storage.getItem(STORAGE_KEY);
      return current === null || parseStudyDataV2(parseJson(current)) !== null;
    } catch {
      return false;
    }
  };

  return {
    // Always returns current-version data. Reading never writes over a document it
    // could not parse, and never deletes a key.
    load(): StudyData {
      if (!storage) return createEmptyStudyData();
      try {
        const current = storage.getItem(STORAGE_KEY);
        // An unreadable value is reported as empty rather than migrated over:
        // migrating the legacy key here would mean overwriting it.
        if (current !== null) return parseStudyDataV2(parseJson(current)) ?? createEmptyStudyData();

        const legacy = storage.getItem(LEGACY_STORAGE_KEY);
        if (legacy === null) return createEmptyStudyData();
        const parsedLegacy = parseStudyDataV1(parseJson(legacy));
        if (!parsedLegacy) return createEmptyStudyData();
        const migrated = parseStudyDataV2(migrateStudyDataV1ToV2(parsedLegacy));
        if (!migrated) return createEmptyStudyData();

        // Best effort: if the v2 write fails the legacy key still holds the data,
        // so the next load migrates again instead of losing it.
        persist(migrated);
        return migrated;
      } catch {
        return createEmptyStudyData();
      }
    },
    // Validation is strict, so a document is either stored whole or refused —
    // nothing is silently pruned on the way in, and what is reported as saved
    // reloads identically. The parsed copy drops only export-wrapper fields.
    save(data: StudyData): boolean {
      const validated = parseStudyDataV2(data);
      if (!validated || !isCurrentKeyWritable()) return false;
      return persist(validated);
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
