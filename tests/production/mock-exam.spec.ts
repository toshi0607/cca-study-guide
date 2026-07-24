import type { Page } from '@playwright/test';
import { readStudyData, STORAGE_KEY } from '../fixtures/storage';
import { expect, test } from './fixtures/production';

async function answerCurrent(page: Page): Promise<void> {
  const multiple = await page.getByText('当てはまるものをすべて選択してください。').isVisible();
  if (multiple) {
    await page.locator('.mock-exam-question .choice-button').nth(0).click();
    await page.locator('.mock-exam-question .choice-button').nth(1).click();
  } else {
    await page.locator('.mock-exam-question .choice-button').first().click();
  }
  await expect(page.locator('.mock-exam-question .choice-button.selected').first()).toBeVisible();
}

test('mock exam: start, answer, flag, resume after reload, submit exactly once, no pass/fail', async ({ page }) => {
  // #given — an empty state; open and start the exam from Today
  await page.goto('/');
  await page.locator('.mock-exam-launch-actions .btn:not(.btn--secondary)').click();
  await expect(page.getByRole('heading', { name: '60問の模試に挑戦する' })).toBeVisible();
  await page.getByRole('button', { name: '模試を開始' }).click();
  await expect(page.locator('.mock-exam-progress')).toHaveText('1 / 60');

  // #when — answer question 1, flag it, and open the palette
  await answerCurrent(page);
  await page.getByRole('button', { name: 'この問題にフラグを付ける' }).click();
  await expect(page.getByRole('button', { name: 'フラグを外す' })).toBeVisible();
  await page.getByRole('button', { name: '問題一覧を開く' }).click();
  await expect(page.getByRole('heading', { name: '問題一覧' })).toBeVisible();
  await page.getByRole('button', { name: '閉じる' }).click();

  // #when — reload; the session persists and resumes with answer + flag intact
  await page.reload();
  await page.locator('.mock-exam-launch-actions .btn:not(.btn--secondary)').click();
  await expect(page.getByRole('heading', { name: '進行中の模試があります' })).toBeVisible();
  await page.getByRole('button', { name: '模試を再開' }).click();
  await expect(page.locator('.mock-exam-progress')).toHaveText('1 / 60');
  await expect(page.locator('.mock-exam-question .choice-button.selected').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'フラグを外す' })).toBeVisible();

  // #when — submit through the confirmation dialog
  await page.getByRole('button', { name: '提出する', exact: true }).click();
  const dialog = page.locator('.mock-exam-submit-dialog');
  await expect(dialog.getByRole('heading', { name: '模試を提出しますか？' })).toBeVisible();
  await dialog.getByRole('button', { name: '提出する' }).click();

  // #then — the result shows raw accuracy and the disclaimer, with no official
  // scaled score and no pass/fail verdict
  await expect(page.getByRole('heading', { name: '結果', exact: true })).toBeVisible();
  await expect(page.locator('.mock-exam-result')).toContainText('単純正答率');
  await expect(page.locator('.mock-exam-disclaimer')).toContainText('scaled scoreや合否を再現するものではありません');
  await expect(page.locator('.mock-exam-result')).not.toContainText('合格圏');
  await expect(page.locator('.mock-exam-result')).not.toContainText('不合格');

  // #then — exactly one attempt is persisted and no active session remains
  const stored = await readStudyData(page, STORAGE_KEY);
  expect((stored?.mockExamAttempts as unknown[]).length).toBe(1);
  expect(stored?.activeMockExam).toBeNull();
});
