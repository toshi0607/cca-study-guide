import type { Page } from '@playwright/test';

// The storage generation keys, re-exported so specs share one import site.
export { STORAGE_KEY, LEGACY_STORAGE_KEY } from '../../src/lib/storage';

// Seeds a storage key with a JSON-serializable value before the app re-reads it.
// Call this, then page.reload(), to exercise the app's load path over the seed.
export async function seedStorage(page: Page, key: string, value: unknown): Promise<void> {
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, JSON.stringify(value)] as [string, string]);
}

// Reads and parses the study-data document under the given key (null if absent).
export async function readStudyData(page: Page, key: string): Promise<Record<string, unknown> | null> {
  const raw = await page.evaluate((k) => localStorage.getItem(k), key);
  return raw === null ? null : (JSON.parse(raw) as Record<string, unknown>);
}
