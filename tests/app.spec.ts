import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('reveals an answer, records a rating, and persists progress', async ({ page }) => {
  await page.getByRole('button', { name: '練習' }).first().click();
  const reveal = page.locator('.reveal-button').first();
  await expect(reveal).toHaveAttribute('aria-expanded', 'false');
  await reveal.press('Enter');
  await expect(reveal).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('ANSWER').first()).toBeVisible();

  await page.getByRole('button', { name: /できた/ }).first().press('Enter');
  await expect(page.getByText('できた：次の復習日を更新しました。')).toBeFocused();
  await expect.poll(() => page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('cca-field-notes:v1') ?? '{}').reviews ?? {}).length)).toBe(1);

  await page.reload();
  await page.getByRole('button', { name: '進捗' }).first().click();
  await expect(page.getByText('1/4').first()).toBeVisible();
});

test('has no serious accessibility violations on the landing view', async ({ page }) => {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
});

for (const width of [375, 768, 1000, 1120, 1121, 1440]) {
  test(`does not overflow horizontally at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.reload();
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    }));
    expect(dimensions.document).toBe(dimensions.viewport);
    expect(dimensions.body).toBe(dimensions.viewport);
  });
}
