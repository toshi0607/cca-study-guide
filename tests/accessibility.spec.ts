import { expectNoSeriousOrCritical, expectNoViolations } from './fixtures/accessibility';
import { expect, openHandsOnList, openOfficialScenarios, supportGuideTitle, test } from './fixtures/app';

test('hands-on list and detail have no serious or critical axe violations', { tag: '@slow' }, async ({ page }) => {
  await openHandsOnList(page);
  await expectNoSeriousOrCritical(page);

  await page.getByRole('button', { name: supportGuideTitle }).click();
  await page.getByRole('button', { name: 'このガイドを開始' }).click();
  await expectNoSeriousOrCritical(page);
});

for (const guideRoute of [
  { path: '/', nav: 'ガイド', start: 'このセクションを開始' },
  { path: '/en/', nav: 'Guide', start: 'Start this section', saved: 'Section start recorded.', inProgress: 'In progress' },
]) {
  test(`${guideRoute.path} guide has no serious or critical axe violations`, { tag: '@slow' }, async ({ page }) => {
    await page.goto(guideRoute.path);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole('button', { name: guideRoute.nav }).first().click();
    await page.locator('.guide-section').first().locator('summary').press('Enter');
    await expect(page.getByRole('button', { name: guideRoute.start })).toBeVisible();
    await expectNoSeriousOrCritical(page);
    if ('saved' in guideRoute && guideRoute.saved && guideRoute.inProgress) {
      await page.getByRole('button', { name: guideRoute.start }).click();
      await expect(page.getByText(guideRoute.saved)).toBeFocused();
      await page.reload();
      await page.getByRole('button', { name: guideRoute.nav }).first().click();
      await expect(page.locator('.guide-section').first()).toContainText(guideRoute.inProgress);
    }
  });
}

for (const route of [
  { name: 'Japanese app', path: '/' },
  { name: 'English app', path: '/en/' },
  { name: 'Japanese privacy page', path: '/privacy/' },
  { name: 'English privacy page', path: '/en/privacy/' },
]) {
  test(`${route.name} has no serious accessibility violations`, { tag: '@slow' }, async ({ page }) => {
    await page.goto(route.path);
    await expectNoViolations(page);
  });
}

test('official scenarios list and detail have no serious or critical accessibility violations', { tag: '@slow' }, async ({ page }) => {
  await openOfficialScenarios(page);
  await expectNoSeriousOrCritical(page);

  await page.getByRole('button', { name: 'カスタマーサポート解決エージェント' }).click();
  await expectNoSeriousOrCritical(page);
});
