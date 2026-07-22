import { expect, openOfficialScenarios, test } from './fixtures/app';

test('walks the keyboard path from the guide into official scenarios and manages focus', async ({ page }) => {
  await page.getByRole('button', { name: 'ガイド' }).first().click();
  // The learning path stage-5 link is now live, not a dead label.
  await page.getByRole('button', { name: 'シナリオ判断' }).click();
  await expect(page.getByRole('heading', { name: '公式シナリオで設計判断を学ぶ' })).toBeFocused();
  await expect(page.locator('.official-card')).toHaveCount(6);
  await expect(page.locator('.official-badge--official').first()).toBeVisible();
  // Guide stays the current nav item while inside the sub-area.
  await expect(page.getByRole('navigation', { name: 'メインナビゲーション' }).first().getByRole('button', { name: 'ガイド' })).toHaveAttribute('aria-current', 'page');

  await page.getByRole('button', { name: 'カスタマーサポート解決エージェント' }).click();
  await expect(page.getByRole('heading', { name: 'カスタマーサポート解決エージェント' })).toBeFocused();
  // Official vs practice distinction is explicit in the detail.
  await expect(page.locator('.official-badge--official').first()).toBeVisible();
  await expect(page.getByText('練習ケース（当アプリ独自）')).toBeVisible();

  await page.getByRole('button', { name: '公式シナリオ一覧に戻る' }).click();
  await expect(page.getByRole('heading', { name: '公式シナリオで設計判断を学ぶ' })).toBeFocused();
});

test('navigates from an official scenario to the exact related card, question, hands-on guide, and practice case', async ({ page }) => {
  const openDetail = async () => {
    await openOfficialScenarios(page);
    await page.getByRole('button', { name: 'カスタマーサポート解決エージェント' }).click();
    await expect(page.getByRole('heading', { name: 'カスタマーサポート解決エージェント' })).toBeFocused();
  };

  // Exact related card -> practice target, focused.
  await openDetail();
  await page.locator('.official-view').getByRole('button', { name: /d1-loop-stop/ }).click();
  await expect(page.locator('.practice-target p')).toBeFocused();

  // Exact related question -> quiz target, single question.
  await openDetail();
  await page.locator('.official-view').getByRole('button', { name: /q-d1-fanout/ }).click();
  await expect(page.locator('.quiz-target')).toBeFocused();
  await expect(page.locator('.quiz-question')).toHaveCount(1);

  // Exact related hands-on guide -> that guide's DETAIL (not the list), focused.
  await openDetail();
  await page.getByRole('button', { name: '複数ツールと人へのエスカレーションを持つエージェント' }).click();
  await expect(page.getByRole('heading', { name: '複数ツールと人へのエスカレーションを持つエージェント' })).toBeFocused();

  // Exact related practice case -> that case's background, heading focused.
  await openDetail();
  await page.getByRole('button', { name: 'ECカスタマーサポートのエージェント構成選定' }).click();
  await expect(page.getByRole('heading', { name: 'ECカスタマーサポートのエージェント構成選定' })).toBeFocused();
});

test('renders the official scenarios in English', async ({ page }) => {
  await page.goto('/en/');
  await page.getByRole('button', { name: 'Guide' }).first().click();
  await page.getByRole('button', { name: 'Go to the official scenarios' }).click();
  await expect(page.getByRole('heading', { name: 'Learn design judgment from the official scenarios' })).toBeFocused();
  await expect(page.locator('.official-card')).toHaveCount(6);
  await expect(page.locator('.official-badge--official').first()).toHaveText('Official scenario');
  await page.getByRole('button', { name: 'Customer Support Resolution Agent' }).click();
  await expect(page.getByText('Practice case (this app’s own)')).toBeVisible();
});
