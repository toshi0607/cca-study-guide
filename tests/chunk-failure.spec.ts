import { expect, openScenarioQuestion, test } from './fixtures/app';
import { STORAGE_KEY } from './fixtures/storage';

test('reloads the page after a Guide chunk failure instead of retrying a cached import', async ({ page }) => {
  let failedOnce = false;
  await page.route('**/GuideView.*.js', async (route) => {
    if (!failedOnce) {
      failedOnce = true;
      await route.abort();
    } else {
      await route.continue();
    }
  });
  await page.reload();
  await page.getByRole('button', { name: 'ガイド' }).first().click();
  await expect(page.locator('.guide-load-error')).toBeFocused();
  const loaded = page.waitForEvent('load');
  await page.getByRole('button', { name: 'ページを再読み込み' }).click();
  await loaded;
  await expect(page.getByRole('heading', { name: /思い出してから/ })).toBeVisible();
});

test('recovers from an official scenarios chunk failure and then loads the list', async ({ page }) => {
  let failedOnce = false;
  await page.route('**/OfficialScenariosView.*.js', async (route) => {
    if (!failedOnce) {
      failedOnce = true;
      await route.abort();
    } else {
      await route.continue();
    }
  });
  await page.getByRole('button', { name: 'ガイド' }).first().click();
  await page.getByRole('button', { name: '公式シナリオ一覧へ' }).click();
  await expect(page.locator('.guide-load-error')).toBeFocused();
  const loaded = page.waitForEvent('load');
  await page.getByRole('button', { name: 'ページを再読み込み' }).click();
  await loaded;
  await expect(page.getByRole('heading', { name: /思い出してから/ })).toBeVisible();
  // The retried import now succeeds.
  await page.getByRole('button', { name: 'ガイド' }).first().click();
  await page.getByRole('button', { name: '公式シナリオ一覧へ' }).click();
  await expect(page.getByRole('heading', { name: '公式シナリオで設計判断を学ぶ' })).toBeFocused();
  await expect(page.locator('.official-card')).toHaveCount(6);
});

// Task 7 (#34): the per-choice rationale is a deferred chunk; its failure must
// not lose the answer or its stat, and the reload path must recover it.
test('keeps the answer and quizStats when the rationale chunk fails, and recovers via reload', async ({ page }) => {
  let failedOnce = false;
  await page.route('**/rationales.*.js', async (route) => {
    if (!failedOnce) { failedOnce = true; await route.abort(); }
    else await route.continue();
  });

  await openScenarioQuestion(page, 'ja', 'カスタマーサポート解決エージェント', 'q-d1-fanout');
  await page.locator('.choice-button').nth(2).click();

  // #then — the verdict stands and the stat is saved despite the failed chunk
  const feedback = page.locator('.quiz-feedback');
  await expect(feedback.locator('.quiz-verdict.is-correct')).toBeVisible();
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').quizStats?.['q-d1-fanout']?.attempts ?? 0, STORAGE_KEY)).toBe(1);

  // #then — correctness labels survive without rationale text, and the failure is announced with a real reload path
  await expect(feedback.locator('.choice-review-list > li')).toHaveCount(4);
  await expect(feedback.locator('.choice-rationale')).toHaveCount(0);
  const error = page.locator('.rationale-error');
  await expect(error).toBeVisible();
  const reload = error.getByRole('button', { name: 'ページを再読み込み' });
  await expect(reload).toBeVisible();

  // #when — using the reload recovery, then answering again
  const loaded = page.waitForEvent('load');
  await reload.click();
  await loaded;
  await openScenarioQuestion(page, 'ja', 'カスタマーサポート解決エージェント', 'q-d1-fanout');
  await page.locator('.choice-button').nth(2).click();

  // #then — the retried import now succeeds and the rationale renders
  await expect(page.locator('.quiz-feedback .choice-rationale')).toHaveCount(4);
});
