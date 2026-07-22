import { expect, test } from './fixtures/app';

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
