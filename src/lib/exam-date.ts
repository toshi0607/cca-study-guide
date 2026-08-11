// The learner's planned exam date, under its own key rather than in StudyData
// (why: DESIGN.md §Study companion affordances). What it enables is arithmetic on
// a calendar and nothing more — never a pace, a verdict, or a readiness call.
import type { StorageLike } from './storage';

export const EXAM_DATE_STORAGE_KEY = 'cca-field-notes:exam-date';

// Calendar day, `YYYY-MM-DD`. Stored as the plain local date the learner typed —
// the same value an <input type="date"> reads and writes — so no timezone
// conversion can shift it by a day.
export function isExamDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return false;
  // Rejects impossible calendar dates that still match the pattern (2026-02-31
  // would otherwise roll forward into March).
  return parsed.getFullYear() === Number(value.slice(0, 4))
    && parsed.getMonth() + 1 === Number(value.slice(5, 7))
    && parsed.getDate() === Number(value.slice(8, 10));
}

export type ExamDateStorage = {
  load: () => string | null;
  save: (value: string) => boolean;
  clear: () => boolean;
};

// Mirrors createStudyStorage: a missing or throwing Storage degrades to a no-op
// rather than breaking the view (private-mode Safari throws on setItem).
export function createExamDateStorage(storage: StorageLike | undefined): ExamDateStorage {
  return {
    load: () => {
      try {
        const raw = storage?.getItem(EXAM_DATE_STORAGE_KEY);
        return isExamDate(raw) ? raw : null;
      } catch {
        return null;
      }
    },
    save: (value: string) => {
      if (!isExamDate(value)) return false;
      try {
        storage?.setItem(EXAM_DATE_STORAGE_KEY, value);
        return Boolean(storage);
      } catch {
        return false;
      }
    },
    clear: () => {
      try {
        storage?.removeItem(EXAM_DATE_STORAGE_KEY);
        return Boolean(storage);
      } catch {
        return false;
      }
    },
  };
}

// Whole days from `now` to the exam date, counted on local calendar days so that
// "tomorrow" is 1 regardless of the time of day. Negative once the date has
// passed; null when there is no valid date to count to.
export function daysUntilExam(examDate: string | null, now: Date): number | null {
  if (!examDate || !isExamDate(examDate)) return null;
  const target = new Date(`${examDate}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

// Minutes of Study Guide material not yet marked completed. A fact about how much
// content is left, not an estimate of how long the learner will need.
export function remainingGuideMinutes(
  sections: readonly { readonly id: string; readonly revision: number; readonly estimatedMinutes: number }[],
  isCompleted: (sectionId: string, revision: number) => boolean,
): number {
  return sections
    .filter((section) => !isCompleted(section.id, section.revision))
    .reduce((total, section) => total + section.estimatedMinutes, 0);
}
