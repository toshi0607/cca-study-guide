import { expect, openHandsOnList, openOfficialScenarios, supportGuideTitle, test } from './fixtures/app';

for (const width of [360, 768, 1440]) {
  test(`hands-on detail does not overflow horizontally at ${width}px`, { tag: '@slow' }, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openHandsOnList(page);
    await page.getByRole('button', { name: supportGuideTitle }).click();
    const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
    expect(dimensions.document).toBe(dimensions.viewport);
    expect(dimensions.body).toBe(dimensions.viewport);
  });
}

for (const guideRoute of [{ path: '/', nav: 'ガイド' }, { path: '/en/', nav: 'Guide' }]) {
  test(`${guideRoute.path} guide has no horizontal overflow at 360px`, { tag: '@slow' }, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 900 });
    await page.goto(guideRoute.path);
    await page.getByRole('button', { name: guideRoute.nav }).first().click();
    await expect(page.locator('.guide-view')).toBeVisible();
    expect(await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }))).toEqual({ viewport: 360, document: 360, body: 360 });
  });
}

for (const route of [
  { name: 'Japanese app', path: '/' },
  { name: 'English app', path: '/en/' },
  { name: 'Japanese privacy page', path: '/privacy/' },
  { name: 'English privacy page', path: '/en/privacy/' },
]) {
  for (const width of [375, 768, 1000, 1120, 1121, 1440]) {
    test(`${route.name} does not overflow horizontally at ${width}px`, { tag: '@slow' }, async ({ page }) => {
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

for (const width of [360, 768, 1440]) {
  test(`official scenarios list and detail do not overflow horizontally at ${width}px`, { tag: '@slow' }, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openOfficialScenarios(page);
    let dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
    expect(dimensions.document).toBe(dimensions.viewport);
    expect(dimensions.body).toBe(dimensions.viewport);

    await page.getByRole('button', { name: 'カスタマーサポート解決エージェント' }).click();
    dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
    expect(dimensions.document).toBe(dimensions.viewport);
    expect(dimensions.body).toBe(dimensions.viewport);
  });
}
