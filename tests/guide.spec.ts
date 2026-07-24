import { cards } from '../src/content/cards';
import { expect, test } from './fixtures/app';
import { STORAGE_KEY } from './fixtures/storage';

test('uses the keyboard diagnosis, saves only explicit guide progress, and opens exact related material', async ({ page }) => {
  await page.getByRole('button', { name: 'ガイド' }).first().click();
  await expect(page.getByRole('heading', { name: '学習ガイド', exact: true })).toBeVisible();

  for (const option of ['エージェントループと委譲の基礎から始めたい', 'ツール契約とMCPの境界を整理したい', 'エスカレーション・人のレビュー・出典追跡を整理したい']) {
    await page.getByLabel(option).press('Space');
    await page.getByRole('button', { name: '開始セクションを提案する' }).press('Enter');
    await expect(page.locator('.guide-recommendation')).toBeFocused();
  }
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{"studyGuideProgress":{}}').studyGuideProgress, STORAGE_KEY)).toEqual({});

  const first = page.locator('.guide-section').first();
  await first.locator('summary').press('Enter');
  await expect(first.locator('.domain-labels')).toContainText('D1');
  await expect(first.locator('.statement-ids')).toContainText('1.1');
  await expect(first.locator('.statement-ids')).toContainText('1.6');
  await expect(first.locator('.source-links a').first()).toHaveAttribute('href', /anthropic|everpath/);
  await first.getByRole('button', { name: 'このセクションを開始' }).press('Enter');
  await first.getByRole('button', { name: '完了として記録' }).press('Enter');
  await page.reload();
  await page.getByRole('button', { name: 'ガイド' }).first().click();
  await expect(page.locator('.guide-section').first().getByText('完了', { exact: true })).toBeVisible();

  await page.locator('.guide-section').first().locator('summary').press('Enter');
  const relatedCard = page.locator('.guide-section').first().locator('.target-list button').first();
  await relatedCard.click();
  await expect(page.locator('.practice-target p')).toBeFocused();
  await page.getByRole('button', { name: 'カード一覧に戻る' }).click();
  await expect(page.getByRole('searchbox', { name: 'カードを検索' })).toBeFocused();
  await expect(page.locator('.practice-card')).toHaveCount(cards.length);

  await page.getByRole('button', { name: 'ガイド' }).first().click();
  await page.locator('.guide-section').first().locator('summary').press('Enter');
  const relatedQuestion = page.locator('.guide-section').first().locator('.target-list').nth(1).getByRole('button').first();
  await relatedQuestion.click();
  await expect(page.locator('.quiz-target')).toBeFocused();
  await expect(page.locator('.quiz-question')).toHaveCount(1);
});

test('drops a synchronous duplicate guide action before it can write twice', async ({ page }) => {
  await page.addInitScript((studyKey) => {
    const original = Storage.prototype.setItem;
    const state = window as Window & { guideWrites?: number };
    state.guideWrites = 0;
    Storage.prototype.setItem = function (key, value) {
      if (key === studyKey) state.guideWrites = (state.guideWrites ?? 0) + 1;
      return original.call(this, key, value);
    };
  }, STORAGE_KEY);
  await page.goto('/');
  await page.getByRole('button', { name: 'ガイド' }).first().click();
  const first = page.locator('.guide-section').first();
  await first.locator('summary').press('Enter');
  await page.evaluate(() => {
    const action = document.querySelector('.guide-section .guide-actions button') as HTMLButtonElement;
    action.click(); action.click();
  });
  await expect(first).toContainText('進行中');
  expect(await page.evaluate(() => (window as Window & { guideWrites?: number }).guideWrites)).toBe(1);
});
