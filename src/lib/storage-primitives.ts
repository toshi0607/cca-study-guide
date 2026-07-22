// Low-level guards shared by the storage boundary. They live apart from
// `storage-schema.ts` so the Mock Exam storage validators can reuse them without
// importing the whole schema module (which would create a cycle), and so the
// exact rules for a record, a real datetime, and an unsafe key have one home.

// JSON.parse keeps these as own keys, and `__proto__` in particular would reach
// Object.prototype instead of the accumulator. No content id uses them, so the
// storage boundary refuses all three rather than relying on how a later merge or
// copy happens to be written.
export const unsafeRecordKeys = new Set(['__proto__', 'constructor', 'prototype']);

// Date-only strings and 2026-02-30 style impossible dates must not pass.
const isoDateTime = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isParsableDate = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value));

export const isIsoDateTime = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const match = isoDateTime.exec(value);
  if (!match) return false;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  // Date.parse rolls an impossible day over (2026-02-30 becomes 2026-03-02),
  // so the calendar date has to survive a UTC round trip unchanged.
  const roundTrip = new Date(Date.UTC(year, month - 1, day));
  return roundTrip.getUTCFullYear() === year && roundTrip.getUTCMonth() === month - 1 && roundTrip.getUTCDate() === day
    && hour <= 23 && minute <= 59 && second <= 59
    && Number.isFinite(Date.parse(value));
};

export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

export const isPositiveInteger = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) > 0;

// A string array with no duplicate and no empty member. Used for choice-id and
// question-id lists, where a repeat or a blank entry is corruption.
export const isUniqueNonEmptyStringArray = (value: unknown): value is string[] =>
  Array.isArray(value)
  && value.every((item) => isNonEmptyString(item))
  && new Set(value as string[]).size === value.length;
