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

test('has no serious accessibility violations on the privacy page', async ({ page }) => {
  await page.goto('/privacy/');
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

test('loads privacy-restricted analytics immediately and links to its disclosure', async ({ page, context }) => {
  await page.close();
  const analyticsPage = await context.newPage();
  const googleRequests: string[] = [];
  analyticsPage.on('request', (request) => {
    if (request.url().includes('googletagmanager.com') || request.url().includes('google-analytics.com')) googleRequests.push(request.url());
  });
  await analyticsPage.route('**://www.googletagmanager.com/**', (route) => route.abort());
  await analyticsPage.goto('/');
  await expect.poll(() => googleRequests.length).toBe(1);
  expect(googleRequests[0]).toContain('googletagmanager.com/gtag/js?id=G-TEST123456');
  await expect(analyticsPage.locator('#analytics-consent')).toHaveCount(0);
  await expect(analyticsPage.getByRole('button', { name: 'アクセス解析の設定' })).toHaveCount(0);

  const analyticsState = await analyticsPage.evaluate(() => ({
    consent: localStorage.getItem('cca-analytics-consent:v1'),
    dataLayer: ((window as unknown as { dataLayer?: IArguments[] }).dataLayer ?? []).map((entry) => Array.from(entry)),
  }));
  expect(analyticsState.consent).toBeNull();
  expect(analyticsState.dataLayer[0]).toEqual(['consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  }]);
  expect(analyticsState.dataLayer[1]?.[0]).toBe('js');
  expect(analyticsState.dataLayer[2]).toEqual(['config', 'G-TEST123456', {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_domain: 'none',
  }]);

  await analyticsPage.getByRole('button', { name: '進捗' }).first().click();
  await expect(analyticsPage.getByText('Google Analyticsで基本的なページ閲覧情報を収集します。')).toBeVisible();
  const disclosure = analyticsPage.getByRole('link', { name: 'アクセス解析について' });
  await expect(disclosure).toHaveAttribute('href', '/privacy/');
  await disclosure.click();
  await expect(analyticsPage).toHaveURL(/\/privacy\/$/);
  await expect(analyticsPage.getByRole('heading', { name: 'アクセス解析' })).toBeVisible();
});

for (const route of [{ name: 'app', path: '/' }, { name: 'privacy page', path: '/privacy/' }]) {
  for (const width of [375, 768, 1000, 1120, 1121, 1440]) {
    test(`${route.name} does not overflow horizontally at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route.path);
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }));
      expect(dimensions.document).toBe(dimensions.viewport);
      expect(dimensions.body).toBe(dimensions.viewport);
    });
  }
}
