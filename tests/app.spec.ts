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

test('publishes canonical social metadata and public icon assets', async ({ page }) => {
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://cca.toshi0607.com/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://cca.toshi0607.com/ogp.png');
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200');
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', '630');
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');

  for (const asset of ['/ogp.png', '/favicon.svg', '/favicon.ico', '/apple-touch-icon.png']) {
    const response = await page.request.get(asset);
    expect(response.ok(), asset).toBe(true);
  }
});

test('does not load analytics before consent and remembers the choice', async ({ page }) => {
  const googleRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('googletagmanager.com') || request.url().includes('google-analytics.com')) googleRequests.push(request.url());
  });
  await page.route('**://www.googletagmanager.com/**', (route) => route.abort());

  const consent = page.locator('#analytics-consent');
  await expect(consent).toBeVisible();
  expect(googleRequests).toEqual([]);
  await page.getByRole('button', { name: '許可しない' }).click();
  await expect(consent).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('cca-analytics-consent:v1'))).toBe('denied');

  await page.reload();
  await expect(consent).toBeHidden();
  expect(googleRequests).toEqual([]);
  await page.getByRole('button', { name: '進捗' }).first().click();
  await page.getByRole('button', { name: 'アクセス解析の設定' }).click();
  await expect(consent).toBeVisible();
  await page.getByRole('button', { name: '許可する' }).click();
  await expect.poll(() => googleRequests.length).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem('cca-analytics-consent:v1'))).toBe('granted');

  await page.reload();
  await expect(consent).toBeHidden();
  await expect.poll(() => googleRequests.length).toBe(2);
  await page.getByRole('button', { name: '進捗' }).first().click();
  await page.getByRole('button', { name: 'アクセス解析の設定' }).click();
  await page.evaluate(() => { document.cookie = '_ga=synthetic; path=/'; });
  await page.getByRole('button', { name: '許可しない' }).click();
  expect(await page.evaluate(() => ({
    consent: localStorage.getItem('cca-analytics-consent:v1'),
    cookie: document.cookie,
    disabled: (window as unknown as Record<string, unknown>)['ga-disable-G-TEST123456'],
  }))).toMatchObject({ consent: 'denied', cookie: '', disabled: true });
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
