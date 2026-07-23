import { openHandsOnList, supportGuideTitle, supportStepIds } from '../fixtures/app';
import { STORAGE_KEY } from '../fixtures/storage';
import { expect, test } from './fixtures/production';

test('records and persists a hands-on completion on production', async ({ page }) => {
  // #given — the support-agent hands-on guide, opened from an empty state
  await page.goto('/');
  await openHandsOnList(page);
  await page.getByRole('button', { name: supportGuideTitle }).click();
  await expect(page.getByRole('heading', { name: supportGuideTitle })).toBeFocused();

  // #when — starting the guide and checking every step
  await page.getByRole('button', { name: 'このガイドを開始' }).click();
  const complete = page.getByRole('button', { name: '完了として記録' });
  await expect(complete).toBeDisabled();
  const checkboxes = page.getByRole('checkbox');
  await expect(checkboxes).toHaveCount(supportStepIds.length);
  for (const box of await checkboxes.all()) await box.check();
  await expect(complete).toBeEnabled();

  // #when — recording completion
  await complete.click();
  await expect(page.getByText('ガイドを完了として記録しました。')).toBeVisible();

  // #then — Progress reflects one completed hands-on guide
  await page.getByRole('button', { name: '進捗' }).first().click();
  await expect(page.getByText(/完了ガイド 1 \//)).toBeVisible();

  // #then — completion survives a reload (persisted, not just in-memory)
  await page.reload();
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').handsOnProgress['ho-support-agent-escalation'], STORAGE_KEY);
  expect(saved.status).toBe('completed');
  await openHandsOnList(page);
  await expect(page.locator('.handson-card').filter({ hasText: '完了' }).first()).toBeVisible();
});
