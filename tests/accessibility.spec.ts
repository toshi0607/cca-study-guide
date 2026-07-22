import { expectNoSeriousOrCritical, expectNoViolations } from './fixtures/accessibility';
import { expect, openHandsOnList, openOfficialScenarios, openScenarioQuestion, supportGuideTitle, test } from './fixtures/app';

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

// Task 7 (#34): the quiz answer-review (metadata + per-choice rationale) and
// summary states. @slow — heavy axe + multi-width overflow in one flow.
test('answer review and summary are accessible, keyboard-drivable, and free of horizontal overflow', { tag: '@slow' }, async ({ page }) => {
  // #given — reach and answer q-d1-fanout with the keyboard
  await openScenarioQuestion(page, 'ja', 'カスタマーサポート解決エージェント', 'q-d1-fanout');
  await page.locator('.choice-button').nth(2).press('Enter');
  const feedback = page.locator('.quiz-feedback');
  await expect(feedback).toBeVisible();
  await expect(feedback).toBeFocused();

  // #then — the lazily-loaded rationale does not steal focus from the feedback region
  await expect(feedback.locator('.choice-rationale')).toHaveCount(4);
  await expect(feedback).toBeFocused();

  // #then — no serious or critical axe violations in the answer-review state
  await expectNoSeriousOrCritical(page);

  // #when — moving to the summary and expanding the missed-question review
  await page.getByRole('button', { name: '結果を見る' }).click();
  await expect(page.getByRole('heading', { name: '演習結果' })).toBeVisible();

  await expectNoSeriousOrCritical(page);

  // #then — no horizontal overflow at three widths
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const dims = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
    expect(dims.document, `document ${width}`).toBe(dims.viewport);
    expect(dims.body, `body ${width}`).toBe(dims.viewport);
  }
});
