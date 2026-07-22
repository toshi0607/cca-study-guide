import { expect, test } from './fixtures/app';

test('reloads the page after a Guide chunk failure instead of retrying a cached import', async ({ page }) => {
  let failedOnce = false;
  await page.route('**/GuideView.*.js', async (route) => {
    if (!failedOnce) {
      failedOnce = true;
      await route.abort();
    } else {
      await route.continue();
    }
  });
  await page.reload();
  await page.getByRole('button', { name: 'ガイド' }).first().click();
  await expect(page.locator('.guide-load-error')).toBeFocused();
  const loaded = page.waitForEvent('load');
  await page.getByRole('button', { name: 'ページを再読み込み' }).click();
  await loaded;
  await expect(page.getByRole('heading', { name: /思い出してから/ })).toBeVisible();
});

test('recovers from an official scenarios chunk failure and then loads the list', async ({ page }) => {
  let failedOnce = false;
  await page.route('**/OfficialScenariosView.*.js', async (route) => {
    if (!failedOnce) {
      failedOnce = true;
      await route.abort();
    } else {
      await route.continue();
    }
  });
  await page.getByRole('button', { name: 'ガイド' }).first().click();
  await page.getByRole('button', { name: '公式シナリオ一覧へ' }).click();
  await expect(page.locator('.guide-load-error')).toBeFocused();
  const loaded = page.waitForEvent('load');
  await page.getByRole('button', { name: 'ページを再読み込み' }).click();
  await loaded;
  await expect(page.getByRole('heading', { name: /思い出してから/ })).toBeVisible();
  // The retried import now succeeds.
  await page.getByRole('button', { name: 'ガイド' }).first().click();
  await page.getByRole('button', { name: '公式シナリオ一覧へ' }).click();
  await expect(page.getByRole('heading', { name: '公式シナリオで設計判断を学ぶ' })).toBeFocused();
  await expect(page.locator('.official-card')).toHaveCount(6);
});
