import { expect, openHandsOnList, supportGuideTitle, test } from './fixtures/app';
import { STORAGE_KEY } from './fixtures/storage';

test('keeps the visible guide status unchanged and focuses the notice when saving fails', async ({ page }) => {
  await page.addInitScript((studyKey) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === studyKey) throw new DOMException('blocked', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  }, STORAGE_KEY);
  await page.goto('/');
  await page.getByRole('button', { name: 'ガイド' }).first().click();
  const first = page.locator('.guide-section').first();
  await first.locator('summary').press('Enter');
  await first.getByRole('button', { name: 'このセクションを開始' }).click();
  await expect(page.getByText('進捗を保存できませんでした。ブラウザのサイトデータ設定または空き容量を確認してください。')).toBeFocused();
  await expect(first).toContainText('未着手');
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
});

test('keeps the checkbox unchanged and focuses the notice when a step save fails', async ({ page }) => {
  await page.addInitScript((studyKey) => {
    const original = Storage.prototype.setItem;
    let allowed = 1; // let the "start" write through, block the step toggle
    Storage.prototype.setItem = function (key, value) {
      if (key === studyKey) {
        if (allowed <= 0) throw new DOMException('blocked', 'QuotaExceededError');
        allowed -= 1;
      }
      return original.call(this, key, value);
    };
  }, STORAGE_KEY);
  await page.goto('/');
  await openHandsOnList(page);
  await page.getByRole('button', { name: supportGuideTitle }).click();
  await page.getByRole('button', { name: 'このガイドを開始' }).click();

  const firstBox = page.getByRole('checkbox').first();
  // click (not check) — a controlled checkbox reverts when the save fails, which
  // would make Playwright's check() assertion throw before the notice appears.
  await firstBox.click();
  await expect(page.getByText('進捗を保存できませんでした。ブラウザのサイトデータ設定または空き容量を確認してください。')).toBeFocused();
  await expect(firstBox).not.toBeChecked();
  const record = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').handsOnProgress['ho-support-agent-escalation'], STORAGE_KEY);
  expect(record.completedStepIds).toEqual([]);
});

test('leaves an exact-target quiz question answerable when its stat cannot be saved', async ({ page }) => {
  await page.addInitScript((studyKey) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === studyKey) throw new DOMException('blocked', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  }, STORAGE_KEY);
  await page.goto('/');
  await page.getByRole('button', { name: 'ガイド' }).first().click();
  const first = page.locator('.guide-section').first();
  await first.locator('summary').press('Enter');
  await first.locator('.target-list').nth(1).getByRole('button').first().click();
  const choice = page.locator('.choice-button').first();
  await choice.click();
  await expect(page.getByText('進捗を保存できませんでした。ブラウザのサイトデータ設定または空き容量を確認してください。')).toBeFocused();
  await expect(page.locator('.quiz-feedback')).toHaveCount(0);
  await expect(choice).toBeEnabled();
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
});

test('keeps a session card in place and announces the failure when saving its rating fails', async ({ page }) => {
  // #given — localStorage.setItem throws for the study-data key, simulating a full or blocked store
  await page.addInitScript((studyKey) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === studyKey) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  }, STORAGE_KEY);
  await page.goto('/');

  // #when — starting a session and rating its first card
  await page.getByRole('button', { name: '練習' }).first().click();
  await page.getByRole('button', { name: 'セッションを開始' }).click();
  await expect(page.locator('.session-progress code')).toHaveText(/^1 \//);
  await page.locator('.reveal-button').click();
  await page.getByRole('button', { name: /できた/ }).click();

  // #then — the failure is announced and focused, and the card stays in place, still revealed
  await expect(page.getByText('進捗を保存できませんでした。ブラウザのサイトデータ設定または空き容量を確認してください。')).toBeFocused();
  await expect(page.locator('.session-progress code')).toHaveText(/^1 \//);
  await expect(page.locator('.session-card .answer')).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
});

test('keeps a failure notice through a view change, while a confirmation goes with the view', async ({ page }) => {
  // #given — the study-data key is blocked, so the guide "start" action fails
  await page.addInitScript((studyKey) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === studyKey) throw new DOMException('blocked', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  }, STORAGE_KEY);
  await page.goto('/');
  await page.getByRole('button', { name: 'ガイド' }).first().click();
  const first = page.locator('.guide-section').first();
  await first.locator('summary').press('Enter');
  await first.getByRole('button', { name: 'このセクションを開始' }).click();

  // #then — the failure is something to act on, so moving to another view keeps it
  const failure = '進捗を保存できませんでした。ブラウザのサイトデータ設定または空き容量を確認してください。';
  const notice = page.locator('.notice');
  await expect(notice).toHaveText(failure);
  await page.getByRole('button', { name: '練習' }).first().click();
  await expect(notice).toHaveText(failure);

  // #and — a newer transient notice still replaces it, and then goes with the view
  // (the confirmation-clears-on-navigation rule itself is pinned in guide.spec.ts)
  await page.getByRole('button', { name: 'セッションを開始' }).click();
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'セッションを中断' }).click();
  await expect(notice).toHaveText('セッションを中断しました。ここまでの評価は保存済みです。');
  await page.getByRole('button', { name: '今日' }).first().click();
  await expect(notice).toHaveText('');
});
