import { expect, openHandsOnList, supportGuideTitle, supportStepIds, test } from './fixtures/app';
import { STORAGE_KEY } from './fixtures/storage';

test('walks the keyboard path from the guide into hands-on, checks every step, and completes save-first', async ({ page }) => {
  await openHandsOnList(page);
  await expect(page.locator('.handson-card')).toHaveCount(4);

  await page.getByRole('button', { name: supportGuideTitle }).click();
  // Focus moves to the detail heading on open.
  await expect(page.getByRole('heading', { name: supportGuideTitle })).toBeFocused();

  await page.getByRole('button', { name: 'このガイドを開始' }).click();
  await expect(page.getByText('ガイドを開始として記録しました。')).toBeFocused();

  const complete = page.getByRole('button', { name: '完了として記録' });
  await expect(complete).toBeDisabled();
  const checkboxes = page.getByRole('checkbox');
  await expect(checkboxes).toHaveCount(supportStepIds.length);
  for (const box of await checkboxes.all()) await box.check();
  await expect(complete).toBeEnabled();

  // Progress is derived from content and completed ids, never persisted.
  const beforeComplete = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').handsOnProgress['ho-support-agent-escalation'], STORAGE_KEY);
  expect(beforeComplete.status).toBe('in_progress');
  expect([...beforeComplete.completedStepIds].sort()).toEqual([...supportStepIds].sort());
  expect('completedAt' in beforeComplete).toBe(false);

  await complete.click();
  await expect(page.getByText('ガイドを完了として記録しました。')).toBeFocused();
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').handsOnProgress['ho-support-agent-escalation'], STORAGE_KEY);
  expect(saved.status).toBe('completed');
  expect(typeof saved.completedAt).toBe('string');

  // Explicit in-app back returns to the list and focuses its heading.
  await page.getByRole('button', { name: 'ハンズオン一覧に戻る' }).click();
  await expect(page.getByRole('heading', { name: 'ハンズオン', exact: true })).toBeFocused();
  await expect(page.locator('.handson-card').first()).toContainText('完了');
});

test('shows a stale hands-on guide read-only and reconfirms it without inventing a completion time', async ({ page }) => {
  // ho-ci-review is revision 2; a revision-1 record is a valid prior v2 record.
  const originalCompletedAt = '2026-07-05T08:00:00.000Z';
  const initial = {
    version: 2, reviews: {}, quizStats: {}, studyGuideProgress: {},
    handsOnProgress: { 'ho-ci-review': { revision: 1, status: 'completed', completedStepIds: ['step-scope', 'step-local-run'], updatedAt: originalCompletedAt, completedAt: originalCompletedAt } },
  };
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, JSON.stringify(initial)]);
  await page.reload();
  const beforeRead = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);

  await openHandsOnList(page);
  await page.getByRole('button', { name: 'Claude Codeのチーム設定とCI差分レビュー' }).click();
  await expect(page.locator('.note--warn')).toContainText('内容が更新されています');
  // Reading a stale record never rewrites storage.
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(beforeRead);
  // Its step checkboxes are read-only until reconfirmed.
  await expect(page.getByRole('checkbox').first()).toBeDisabled();

  await page.getByRole('button', { name: '更新内容を再確認して再開' }).click();
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').handsOnProgress['ho-ci-review'], STORAGE_KEY);
  expect(saved.revision).toBe(2);
  expect(saved.status).toBe('in_progress');
  expect([...saved.completedStepIds].sort()).toEqual(['step-local-run', 'step-scope']);
  expect('completedAt' in saved).toBe(false);
  // The original completion time is preserved, not erased and not overwritten with now.
  expect(saved.previousCompletedAt).toBe(originalCompletedAt);
  await expect(page.locator('.note--success')).toBeVisible();
  // The two preserved steps are checked; the rest are not.
  await expect(page.getByRole('checkbox').first()).toBeEnabled();
});
