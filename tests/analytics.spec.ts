import { expect, test } from './fixtures/app';

test('loads no third-party analytics and always links to privacy information', async ({ page }) => {
  const googleRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('googletagmanager.com') || request.url().includes('google-analytics.com')) googleRequests.push(request.url());
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect.poll(() => googleRequests).toEqual([]);
  expect(await page.content()).not.toMatch(/googletagmanager|google-analytics|gtag/i);

  const disclosure = page.getByRole('link', { name: 'プライバシー' });
  await expect(disclosure).toHaveAttribute('href', '/privacy/');
  await disclosure.click();
  await expect(page).toHaveURL(/\/privacy\/$/);
  await expect(page.getByRole('heading', { name: '外部送信と第三者解析' })).toBeVisible();
  await expect(page.getByText('このサイトは第三者のアクセス解析、広告タグ、行動追跡を読み込みません。')).toBeVisible();

  await page.goto('/en/');
  await expect(page.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/en/privacy/');
});
