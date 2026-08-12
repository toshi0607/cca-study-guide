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
  it.each([
    ['2026-09-05', true],
    ['2026-9-5', false],
    ['2026-02-31', false],
    [20_260_905, false],
    [null, false],
    ['not a date', false],
    ['2026-09-05T00:00:00Z', false],
  ] as const)('isExamDate(%o) => %s', (value, expected) => {
    expect(isExamDate(value)).toBe(expected);
  });
});

describe('createExamDateStorage', () => {
  it('round-trips a saved value through load', () => {
    const storage = createExamDateStorage(memoryStorage());
    const saved = storage.save('2026-09-05');
    expect(saved).toBe(true);
    expect(storage.load()).toBe('2026-09-05');
  });

  it('refuses to save an invalid value and leaves storage untouched', () => {
    const memory = memoryStorage();
    const storage = createExamDateStorage(memory);
    const saved = storage.save('not a date');
    expect(saved).toBe(false);
    expect(memory.values.size).toBe(0);
  });

  it('returns null after clear', () => {
    const storage = createExamDateStorage(memoryStorage());
    storage.save('2026-09-05');
    const cleared = storage.clear();
    expect(cleared).toBe(true);
    expect(storage.load()).toBeNull();
  });

  it('returns null without throwing when storage already holds an invalid string', () => {
    const memory = memoryStorage();
    memory.setItem('cca-field-notes:exam-date', 'garbage');
    expect(createExamDateStorage(memory).load()).toBeNull();
  });

  it('degrades to null loads and failed saves when storage is undefined', () => {
    const storage = createExamDateStorage(undefined);
    expect(storage.load()).toBeNull();
    expect(storage.save('2026-09-05')).toBe(false);
  });
});

describe('daysUntilExam', () => {
  it.each([
    ['2026-08-11', new Date('2026-08-11T09:00:00'), 0],
    ['2026-08-12', new Date('2026-08-11T09:00:00'), 1],
    ['2026-08-09', new Date('2026-08-11T09:00:00'), -2],
  ] as const)('daysUntilExam(%o) => %d', (date, now, expected) => {
    expect(daysUntilExam(date, now)).toBe(expected);
  });

  it('returns null for a missing or invalid exam date', () => {
    expect(daysUntilExam(null, new Date('2026-08-11T09:00:00'))).toBeNull();
    expect(daysUntilExam('not a date', new Date('2026-08-11T09:00:00'))).toBeNull();
  });

  it('does not depend on the time of day', () => {
    const early = daysUntilExam('2026-08-12', new Date('2026-08-11T00:30:00'));
    const late = daysUntilExam('2026-08-12', new Date('2026-08-11T23:30:00'));
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
    const total = remainingGuideMinutes(sections, () => false);
    expect(total).toBe(100);
  });

  it('subtracts the minutes of completed sections', () => {
    const total = remainingGuideMinutes(sections, (id) => id === 'b');
    expect(total).toBe(70);
  });

  it('returns 0 once every section is completed', () => {
    const total = remainingGuideMinutes(sections, () => true);
    expect(total).toBe(0);
  });
});
