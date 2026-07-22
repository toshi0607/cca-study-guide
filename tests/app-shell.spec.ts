import { readFile } from 'node:fs/promises';
import { expect, test } from './fixtures/app';

for (const route of [
  { path: '/', heading: /思い出してから/, navigation: 'メインナビゲーション', today: '今日', blueprint: '5領域の設計図' },
  { path: '/en/', heading: /Recall first/, navigation: 'Main navigation', today: 'Today', blueprint: 'Map of the five domains' },
]) {
  test(`${route.path} prerenders meaningful landing content without JavaScript`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(route.path);

    await expect(page.getByRole('heading', { name: route.heading })).toBeVisible();
    await expect(page.getByRole('navigation', { name: route.navigation }).first()).toContainText(route.today);
    await expect(page.getByText(route.blueprint)).toBeVisible();
    await expect(page.locator('button:not([disabled])')).toHaveCount(0);

    await context.close();
  });
}

test('switches between complete localized routes and searches active-locale content', async ({ page }) => {
  await page.goto('/en/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: 'Recall first. Then reveal.' })).toBeVisible();
  await expect(page.locator('.rail .language-switcher a[lang="en"]')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.rail .language-switcher a[lang="ja"]')).toHaveAttribute('href', '/');

  await page.getByRole('button', { name: 'Practice' }).first().click();
  await expect(page.getByRole('heading', { name: 'Practice cards' })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search cards' }).fill('iteration count');
  await expect(page.getByText('Showing 1 card')).toBeVisible();
  await expect(page.locator('.practice-card')).toHaveCount(1);
  await expect(page.locator('.practice-card')).toContainText('agentic loop');

  await page.locator('.rail .language-switcher a[lang="ja"]').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await expect(page.getByRole('heading', { name: '思い出してから、 答えを開く。' })).toBeVisible();
});

test('publishes canonical social metadata and public icon assets', async ({ page }) => {
  const assetsManifest = JSON.parse(await readFile('public/assets-manifest.json', 'utf8')) as { ogp: { file: string } };
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://cca.toshi0607.com/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', `https://cca.toshi0607.com/${assetsManifest.ogp.file}`);
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200');
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', '630');
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');

  for (const asset of [`/${assetsManifest.ogp.file}`, '/ogp.png', '/favicon.svg', '/favicon.ico', '/apple-touch-icon.png']) {
    const response = await page.request.get(asset);
    expect(response.ok(), asset).toBe(true);
  }
});

for (const route of [
  { path: '/', lang: 'ja', canonical: 'https://cca.toshi0607.com/', japanese: 'https://cca.toshi0607.com/', english: 'https://cca.toshi0607.com/en/', title: 'CCA Field Notes — 非公式学習ガイド', ogLocale: 'ja_JP' },
  { path: '/en/', lang: 'en', canonical: 'https://cca.toshi0607.com/en/', japanese: 'https://cca.toshi0607.com/', english: 'https://cca.toshi0607.com/en/', title: 'CCA Field Notes — Unofficial Study Guide', ogLocale: 'en_US' },
  { path: '/privacy/', lang: 'ja', canonical: 'https://cca.toshi0607.com/privacy/', japanese: 'https://cca.toshi0607.com/privacy/', english: 'https://cca.toshi0607.com/en/privacy/', title: 'プライバシー — CCA Field Notes', ogLocale: 'ja_JP' },
  { path: '/en/privacy/', lang: 'en', canonical: 'https://cca.toshi0607.com/en/privacy/', japanese: 'https://cca.toshi0607.com/privacy/', english: 'https://cca.toshi0607.com/en/privacy/', title: 'Privacy — CCA Field Notes', ogLocale: 'en_US' },
]) {
  test(`${route.path} publishes locale-correct document metadata`, async ({ page }) => {
    await page.goto(route.path);
    await expect(page.locator('html')).toHaveAttribute('lang', route.lang);
    await expect(page).toHaveTitle(route.title);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', route.canonical);
    await expect(page.locator('link[rel="alternate"][hreflang="ja"]')).toHaveAttribute('href', route.japanese);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute('href', route.english);
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute('href', route.japanese);
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', route.ogLocale);
    await expect(page.locator('meta[property="og:locale:alternate"]')).toHaveCount(1);
  });
}
