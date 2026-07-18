import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

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

test('refreshes due cards while a tab remains open', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-07-15T00:00:00.000Z') });
  await page.evaluate(() => localStorage.setItem('cca-field-notes:v1', JSON.stringify({
    version: 1,
    reviews: {
      'd1-loop-stop': {
        cardId: 'd1-loop-stop',
        cardRevisionSeen: 1,
        dueAt: '2026-07-15T00:00:30.000Z',
        intervalDays: 0,
        streak: 0,
        lapses: 1,
        lastRating: 'again',
      },
    },
  })));
  await page.reload();
  await page.getByRole('button', { name: '練習' }).first().click();
  await expect(page.locator('.practice-card')).toHaveCount(15);

  await page.clock.runFor(60_000);
  await expect(page.locator('.practice-card')).toHaveCount(16);
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

  await page.goto('/en/');
  await page.getByRole('button', { name: 'Progress' }).first().click();
  await expect(page.getByText('1/4').first()).toBeVisible();
});

test('runs a domain-scoped quiz round with immediate feedback, a summary, and persisted stats', async ({ page }) => {
  await page.getByRole('button', { name: '演習' }).first().click();
  await expect(page.getByRole('heading', { name: '選択式演習' })).toBeVisible();

  await page.getByRole('button', { name: '10問' }).click();
  await page.getByRole('button', { name: 'D2', exact: true }).click();
  await page.getByRole('button', { name: '演習を始める' }).click();

  const total = Number(await page.locator('.quiz-question > header code').innerText().then((text) => /全(\d+)問/.exec(text)?.[1]));
  expect(total).toBeGreaterThanOrEqual(3);

  for (let answered = 1; answered <= total; answered += 1) {
    await expect(page.locator('.quiz-question > header code')).toHaveText(`第${answered}問 / 全${total}問`);

    const isMultiple = await page.getByText('複数選択：当てはまる選択肢をすべて選び、「回答する」を押してください。').isVisible();
    if (isMultiple) {
      const submit = page.getByRole('button', { name: '回答する' });
      await expect(submit).toBeDisabled();
      await page.locator('.choice-button').nth(0).click();
      await page.locator('.choice-button').nth(1).click();
      await submit.click();
    } else {
      await page.locator('.choice-button').first().press('Enter');
    }

    const feedback = page.locator('.quiz-feedback');
    await expect(feedback).toBeVisible();
    await expect(feedback).toBeFocused();
    await expect(feedback.locator('.quiz-verdict')).toHaveText(/^(正解！|不正解)$/);
    await expect(feedback.getByText('正解：')).toBeVisible();
    await expect(feedback.locator('.source-links a').first()).toBeVisible();
    await expect(page.locator('.choice-button.correct').first()).toBeVisible();

    await page.getByRole('button', { name: answered === total ? '結果を見る' : '次の問題へ' }).click();
  }

  await expect(page.getByRole('heading', { name: '演習結果' })).toBeVisible();
  await expect(page.getByText('正答率')).toBeVisible();
  await expect(page.locator('.quiz-domains .progress-row')).toHaveCount(1);
  await expect(page.locator('.quiz-domains')).toContainText('D2');

  const stats = await page.evaluate(() => JSON.parse(localStorage.getItem('cca-field-notes:v1') ?? '{}').quizStats ?? {});
  expect(Object.keys(stats).length).toBe(total);
  for (const stat of Object.values(stats) as { attempts: number }[]) expect(stat.attempts).toBe(1);

  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(axe.violations).toEqual([]);
});

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

for (const route of [
  { name: 'Japanese app', path: '/' },
  { name: 'English app', path: '/en/' },
  { name: 'Japanese privacy page', path: '/privacy/' },
  { name: 'English privacy page', path: '/en/privacy/' },
]) {
  test(`${route.name} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(route.path);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
  });
}

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

for (const route of [
  { name: 'Japanese app', path: '/' },
  { name: 'English app', path: '/en/' },
  { name: 'Japanese privacy page', path: '/privacy/' },
  { name: 'English privacy page', path: '/en/privacy/' },
]) {
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
