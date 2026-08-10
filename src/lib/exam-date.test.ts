import { describe, expect, it } from 'vitest';
import { createExamDateStorage, daysUntilExam, isExamDate, remainingGuideMinutes } from './exam-date';

// Minimal Map-backed fake of the three-method Storage surface these functions
// depend on (getItem / setItem / removeItem) — deliberately not the fuller
// memoryStorage() helper used by storage.test.ts, since exam-date.ts never
// touches anything else on Storage.
function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    values,
  };
}

describe('isExamDate', () => {
  it('accepts a zero-padded calendar date', () => {
    // #given a well-formed YYYY-MM-DD string
    // #when / #then
    expect(isExamDate('2026-09-05')).toBe(true);
  });

  it('rejects a date without zero-padding', () => {
    // #given a date missing zero-padding
    // #when / #then
    expect(isExamDate('2026-9-5')).toBe(false);
  });

  it('rejects a calendar date that does not exist', () => {
    // #given February 31st, which JavaScript's Date would otherwise roll into March
    // #when / #then
    expect(isExamDate('2026-02-31')).toBe(false);
  });

  it('rejects non-string and clearly-invalid values', () => {
    // #given values that are not a YYYY-MM-DD string
    // #when / #then
    expect(isExamDate(20_260_905)).toBe(false);
    expect(isExamDate(null)).toBe(false);
    expect(isExamDate('not a date')).toBe(false);
  });

  it('rejects a value carrying a time component', () => {
    // #given an ISO datetime instead of a plain calendar date
    // #when / #then
    expect(isExamDate('2026-09-05T00:00:00Z')).toBe(false);
  });
});

describe('createExamDateStorage', () => {
  it('round-trips a saved value through load', () => {
    // #given an empty storage
    const storage = createExamDateStorage(memoryStorage());

    // #when
    const saved = storage.save('2026-09-05');

    // #then
    expect(saved).toBe(true);
    expect(storage.load()).toBe('2026-09-05');
  });

  it('refuses to save an invalid value and leaves storage untouched', () => {
    // #given an empty storage
    const memory = memoryStorage();
    const storage = createExamDateStorage(memory);

    // #when
    const saved = storage.save('not a date');

    // #then
    expect(saved).toBe(false);
    expect(memory.values.size).toBe(0);
  });

  it('returns null after clear', () => {
    // #given a storage with a saved date
    const storage = createExamDateStorage(memoryStorage());
    storage.save('2026-09-05');

    // #when
    const cleared = storage.clear();

    // #then
    expect(cleared).toBe(true);
    expect(storage.load()).toBeNull();
  });

  it('returns null without throwing when storage already holds an invalid string', () => {
    // #given storage pre-populated with a value that is not a valid exam date
    const memory = memoryStorage();
    memory.setItem('cca-field-notes:exam-date', 'garbage');

    // #when / #then
    expect(createExamDateStorage(memory).load()).toBeNull();
  });

  it('degrades to null loads and failed saves when storage is undefined', () => {
    // #given no storage at all (e.g. detectStorageAvailable failed earlier)
    const storage = createExamDateStorage(undefined);

    // #when / #then
    expect(storage.load()).toBeNull();
    expect(storage.save('2026-09-05')).toBe(false);
  });

  it('returns false from save without throwing when setItem throws', () => {
    // #given a storage whose setItem throws (private-mode Safari style)
    const throwingStorage = {
      getItem: () => null,
      setItem: () => { throw new Error('QuotaExceededError'); },
      removeItem: () => {},
    };
    const storage = createExamDateStorage(throwingStorage);

    // #when / #then
    expect(storage.save('2026-09-05')).toBe(false);
  });
});

describe('daysUntilExam', () => {
  it('returns 0 for the same day', () => {
    // #given an exam date equal to now
    // #when / #then
    expect(daysUntilExam('2026-08-11', new Date('2026-08-11T09:00:00'))).toBe(0);
  });

  it('returns 1 for tomorrow', () => {
    // #given an exam date one calendar day after now
    // #when / #then
    expect(daysUntilExam('2026-08-12', new Date('2026-08-11T09:00:00'))).toBe(1);
  });

  it('returns a negative number once the date has passed', () => {
    // #given an exam date two calendar days before now
    // #when / #then
    expect(daysUntilExam('2026-08-09', new Date('2026-08-11T09:00:00'))).toBe(-2);
  });

  it('returns null for a missing or invalid exam date', () => {
    // #given no date and an invalid date
    // #when / #then
    expect(daysUntilExam(null, new Date('2026-08-11T09:00:00'))).toBeNull();
    expect(daysUntilExam('not a date', new Date('2026-08-11T09:00:00'))).toBeNull();
  });

  it('does not depend on the time of day', () => {
    // #given the same calendar day at two very different times
    const early = daysUntilExam('2026-08-12', new Date('2026-08-11T00:30:00'));
    const late = daysUntilExam('2026-08-12', new Date('2026-08-11T23:30:00'));

    // #when / #then
    expect(early).toBe(late);
  });
});

describe('remainingGuideMinutes', () => {
  const sections = [
    { id: 'a', revision: 1, estimatedMinutes: 20 },
    { id: 'b', revision: 1, estimatedMinutes: 30 },
    { id: 'c', revision: 1, estimatedMinutes: 50 },
  ];

  it('sums every section when none are completed', () => {
    // #given no section marked completed
    // #when
    const total = remainingGuideMinutes(sections, () => false);

    // #then
    expect(total).toBe(100);
  });

  it('subtracts the minutes of completed sections', () => {
    // #given only section "b" completed
    // #when
    const total = remainingGuideMinutes(sections, (id) => id === 'b');

    // #then
    expect(total).toBe(70);
  });

  it('returns 0 once every section is completed', () => {
    // #given every section completed
    // #when
    const total = remainingGuideMinutes(sections, () => true);

    // #then
    expect(total).toBe(0);
  });
});
