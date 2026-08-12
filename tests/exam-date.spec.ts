import { EXAM_DATE_STORAGE_KEY } from '../src/lib/exam-date';
import { expect, test } from './fixtures/app';

test('types a planned exam date segment by segment without losing focus, then clears it', async ({ page }) => {
  // #given — the progress view's empty exam-date input
  await page.getByRole('button', { name: '進捗' }).first().click();
  const input = page.locator('#exam-date-input');
  await input.click();

  // #when — month, day, and year are typed as separate keyboard segments. This
  // is the native <input type="date"> control's own segment order (Chromium's
  // UI locale, independent of the page's html lang or Playwright's `locale`
  // context option — verified against the running control, not assumed), but
  // the point under test does not depend on which field is which: every
  // segment fires the app's onChange handler, and the fix under test is that
  // none of those handler calls steals focus away from the input.
  await page.keyboard.type('09');
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('exam-date-input');
  await page.keyboard.type('15');
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('exam-date-input');
  await page.keyboard.type('2026');
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('exam-date-input');

  // #then — focus never moved to the notice region, and the completed date is what committed
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('2026-09-15');
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), EXAM_DATE_STORAGE_KEY)).toBe('2026-09-15');

  // #when — clearing the date via the explicit button
  await page.getByRole('button', { name: '受験予定日を消す' }).click();

  // #then — the stored value and the input are both cleared, and this explicit
  // action (unlike a mid-typing save) does move focus to its confirmation notice
  await expect(page.getByText('受験予定日を消しました。')).toBeFocused();
  expect(await page.evaluate((key) => localStorage.getItem(key), EXAM_DATE_STORAGE_KEY)).toBeNull();
  await expect(input).toHaveValue('');
});
