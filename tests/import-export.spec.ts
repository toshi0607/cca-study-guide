import { writeFile } from 'node:fs/promises';
import { cards } from '../src/content/cards';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/app';
import { readStudyData, seedStorage, STORAGE_KEY } from './fixtures/storage';

// A local review/quiz-stat/mock-exam-attempt trio (device A) and a distinct
// trio for the file being imported (device B) — disjoint ids throughout, so a
// merge's union is distinguishable from either side alone. Shapes mirror the
// seeds already exercised in storage.spec.ts (Mock Exam schema section).
const reviewA = { cardId: 'd1-loop-stop', cardRevisionSeen: 1, dueAt: '2027-01-01T00:00:00.000Z', intervalDays: 3, streak: 1, lapses: 0, lastRating: 'good' };
const quizStatA = { attempts: 1, correct: 1, lastAnsweredAt: '2026-07-01T00:00:00.000Z', lastCorrect: true };
const attemptA = {
  id: 'attempt-device-a', blueprintVersion: 1, outcome: 'submitted',
  questionRefs: [{ questionId: 'q-a', revision: 1 }],
  answers: [{ questionId: 'q-a', questionRevision: 1, selectedChoiceIds: ['a'], correct: true, answeredAt: '2026-07-01T00:05:00.000Z' }],
  flaggedQuestionIds: [], startedAt: '2026-07-01T00:00:00.000Z', expiresAt: '2026-07-01T02:00:00.000Z', completedAt: '2026-07-01T01:00:00.000Z',
};
const localStudyData = {
  version: 3, reviews: { 'd1-loop-stop': reviewA }, quizStats: { 'q-d1-loop-continue': quizStatA },
  studyGuideProgress: {}, handsOnProgress: {}, activeMockExam: null, mockExamAttempts: [attemptA],
};

const reviewB = { cardId: 'd2-tool-contract', cardRevisionSeen: 1, dueAt: '2027-02-01T00:00:00.000Z', intervalDays: 2, streak: 1, lapses: 0, lastRating: 'good' };
const quizStatB = { attempts: 1, correct: 1, lastAnsweredAt: '2026-07-02T00:00:00.000Z', lastCorrect: true };
const attemptB = {
  id: 'attempt-device-b', blueprintVersion: 1, outcome: 'submitted',
  questionRefs: [{ questionId: 'q-b', revision: 1 }],
  answers: [{ questionId: 'q-b', questionRevision: 1, selectedChoiceIds: ['b'], correct: true, answeredAt: '2026-07-02T00:05:00.000Z' }],
  flaggedQuestionIds: [], startedAt: '2026-07-02T00:00:00.000Z', expiresAt: '2026-07-02T02:00:00.000Z', completedAt: '2026-07-02T01:00:00.000Z',
};
const fileStudyData = {
  version: 3, reviews: { 'd2-tool-contract': reviewB }, quizStats: { 'q-d2-something': quizStatB },
  studyGuideProgress: {}, handsOnProgress: {}, activeMockExam: null, mockExamAttempts: [attemptB],
};

test('restores exported progress through the JSON import after a reset', async ({ page }, testInfo) => {
  // #given — one rated card, exported as JSON and then wiped by a reset
  await page.getByRole('button', { name: '練習' }).first().click();
  await page.locator('.reveal-button').first().click();
  await page.getByRole('button', { name: /できた/ }).first().click();
  await expect.poll(() => page.evaluate((key) => Object.keys(JSON.parse(localStorage.getItem(key) ?? '{}').reviews ?? {}).length, STORAGE_KEY)).toBe(1);

  await page.getByRole('button', { name: '進捗' }).first().click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '進捗をJSONで書き出す' }).click();
  const exportPath = testInfo.outputPath('progress-export.json');
  await (await downloadPromise).saveAs(exportPath);

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'この端末の進捗を削除' }).click();
  await expect(page.getByText('この端末の進捗を削除しました。')).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();

  // #when — importing the exported file and choosing to replace in the import dialog
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '進捗をJSONから読み込む' }).click();
  await (await chooserPromise).setFiles(exportPath);

  // #then — the dialog summarizes the payload and progress is back without a reload
  await expect(page.getByText('復習記録1件を含むファイルです。')).toBeVisible();
  await page.getByRole('button', { name: '置き換える' }).click();
  await expect(page.getByText('JSONから進捗を読み込みました。')).toBeFocused();
  await expect.poll(() => page.evaluate((key) => Object.keys(JSON.parse(localStorage.getItem(key) ?? '{}').reviews ?? {}).length, STORAGE_KEY)).toBe(1);
  const d1Total = cards.filter((card) => card.domainId === 'd1').length;
  await expect(page.getByText(`1/${d1Total}`).first()).toBeVisible();
});

test('rejects a file that is not exported progress data', async ({ page }, testInfo) => {
  // #given — a JSON file with an unrecognized shape
  const bogusPath = testInfo.outputPath('not-progress.json');
  await writeFile(bogusPath, JSON.stringify({ hello: 'world' }));

  // #when — importing it from the progress view
  await page.getByRole('button', { name: '進捗' }).first().click();
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '進捗をJSONから読み込む' }).click();
  await (await chooserPromise).setFiles(bogusPath);

  // #then — the failure is announced and nothing is stored
  await expect(page.getByText('進捗データとして読み込めませんでした。', { exact: false })).toBeFocused();
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
});

test('merges an imported file into this device\'s existing records instead of replacing them', async ({ page }, testInfo) => {
  // #given — device-local record A already on this device
  await seedStorage(page, STORAGE_KEY, localStudyData);
  await page.reload();

  // #given — record B, with card/question/attempt ids disjoint from A, as a JSON file
  const importPath = testInfo.outputPath('merge-import.json');
  await writeFile(importPath, JSON.stringify(fileStudyData));

  // #when — importing it and choosing "統合する" in the dialog
  await page.getByRole('button', { name: '進捗' }).first().click();
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '進捗をJSONから読み込む' }).click();
  await (await chooserPromise).setFiles(importPath);
  await expect(page.getByText('復習記録1件を含むファイルです。')).toBeVisible();
  await page.getByRole('button', { name: '統合する' }).click();
  await expect(page.getByText('読み込んだデータをこの端末の記録に統合しました。')).toBeFocused();

  // #then — both sides' keys survive as a union, by count and by which keys are present
  const data = await readStudyData(page, STORAGE_KEY);
  if (!data) throw new Error('expected merged study data to be stored');
  const reviews = data.reviews as Record<string, unknown>;
  const quizStats = data.quizStats as Record<string, unknown>;
  const attempts = data.mockExamAttempts as { id: string }[];
  expect(Object.keys(reviews)).toHaveLength(2);
  expect(Object.keys(reviews).sort()).toEqual(['d1-loop-stop', 'd2-tool-contract']);
  expect(Object.keys(quizStats)).toHaveLength(2);
  expect(Object.keys(quizStats).sort()).toEqual(['q-d1-loop-continue', 'q-d2-something']);
  expect(attempts).toHaveLength(2);
  expect(attempts.map((attempt) => attempt.id).sort()).toEqual(['attempt-device-a', 'attempt-device-b']);
});

test('discards this device\'s existing records when "置き換える" is chosen instead of "統合する"', async ({ page }, testInfo) => {
  // #given — the same device-local record A, and the same file B — the contrast case for the merge test above
  await seedStorage(page, STORAGE_KEY, localStudyData);
  await page.reload();
  const importPath = testInfo.outputPath('replace-import.json');
  await writeFile(importPath, JSON.stringify(fileStudyData));

  // #when — importing and choosing "置き換える" this time
  await page.getByRole('button', { name: '進捗' }).first().click();
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '進捗をJSONから読み込む' }).click();
  await (await chooserPromise).setFiles(importPath);
  await page.getByRole('button', { name: '置き換える' }).click();
  await expect(page.getByText('JSONから進捗を読み込みました。')).toBeFocused();

  // #then — only B's records remain; A's are gone, not unioned in
  const data = await readStudyData(page, STORAGE_KEY);
  if (!data) throw new Error('expected replaced study data to be stored');
  expect(data.reviews).toEqual({ 'd2-tool-contract': reviewB });
  expect(data.quizStats).toEqual({ 'q-d2-something': quizStatB });
  expect((data.mockExamAttempts as { id: string }[]).map((attempt) => attempt.id)).toEqual(['attempt-device-b']);
});

test('keeps the import dialog open with an in-dialog error when the merge save fails, and succeeds on retry', async ({ page }, testInfo) => {
  // #given — a device-local record and an import file, both already picked in the choice dialog
  await seedStorage(page, STORAGE_KEY, localStudyData);
  await page.reload();
  const importPath = testInfo.outputPath('save-failure-import.json');
  await writeFile(importPath, JSON.stringify(fileStudyData));
  await page.getByRole('button', { name: '進捗' }).first().click();
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '進捗をJSONから読み込む' }).click();
  await (await chooserPromise).setFiles(importPath);
  await expect(page.getByText('復習記録1件を含むファイルです。')).toBeVisible();

  // #given — localStorage.setItem throws for the study-data key while a sessionStorage marker is set
  // (same monkey-patch shape as tests/save-failure.spec.ts, but toggled mid-test rather than fixed at load)
  await page.evaluate((studyKey) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === studyKey && sessionStorage.getItem('__blockStudySave')) throw new DOMException('blocked', 'QuotaExceededError');
      return original.call(this, key, value);
    };
    sessionStorage.setItem('__blockStudySave', '1');
  }, STORAGE_KEY);

  // #when — merging while saves are blocked
  await page.getByRole('button', { name: '統合する' }).click();

  // #then — the dialog stays open with the in-dialog error, and the parsed import is still held
  await expect(page.locator('.import-choice-dialog')).toBeVisible();
  await expect(page.locator('.import-save-error')).toBeVisible();
  await expect(page.getByText('復習記録1件を含むファイルです。')).toBeVisible();

  // #when — saves are unblocked and the same button is pressed again
  await page.evaluate(() => sessionStorage.removeItem('__blockStudySave'));
  await page.getByRole('button', { name: '統合する' }).click();

  // #then — the retry succeeds: the dialog closes and the merge result is persisted
  await expect(page.getByText('読み込んだデータをこの端末の記録に統合しました。')).toBeFocused();
  await expect(page.locator('.import-choice-dialog')).toHaveCount(0);
  const data = await readStudyData(page, STORAGE_KEY);
  if (!data) throw new Error('expected merged study data to be stored');
  expect(Object.keys(data.reviews as Record<string, unknown>).sort()).toEqual(['d1-loop-stop', 'd2-tool-contract']);
});

// The clipboard write is the app's only user-visible promise that can outlive
// the view that started it, so it is where the "a notice belongs to the view it
// was raised on" rule is actually testable.
type ClipboardControl = { settle?: (ok: boolean) => void };

async function stubPendingClipboard(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const control: ClipboardControl = {};
    (window as unknown as { clipboardControl: ClipboardControl }).clipboardControl = control;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: () => new Promise<void>((resolve, reject) => {
          control.settle = (ok: boolean) => (ok ? resolve() : reject(new Error('denied')));
        }),
      },
    });
  });
  await page.reload();
}

const settleClipboard = (page: Page, ok: boolean) =>
  page.evaluate((succeeded) => (window as unknown as { clipboardControl: ClipboardControl }).clipboardControl.settle?.(succeeded), ok);

for (const outcome of [true, false]) {
  test(`does not announce a ${outcome ? 'copied' : 'failed'} clipboard write on the view the learner moved to`, async ({ page }) => {
    // #given — a clipboard write that stays pending until the test settles it
    await stubPendingClipboard(page);
    await page.getByRole('button', { name: '進捗' }).first().click();
    await page.getByRole('button', { name: '学習状況を要約してコピー' }).click();

    // #when — the learner leaves before it settles
    await page.getByRole('button', { name: '今日' }).first().click();
    await settleClipboard(page, outcome);

    // #then — the result belongs to the view that started it, so nothing is announced here
    await expect(page.locator('.notice')).toHaveText('');
  });
}

test('announces the clipboard result to the learner who stayed on the view', async ({ page }) => {
  await stubPendingClipboard(page);
  await page.getByRole('button', { name: '進捗' }).first().click();
  await page.getByRole('button', { name: '学習状況を要約してコピー' }).click();
  await settleClipboard(page, true);
  await expect(page.locator('.notice')).toHaveText('学習状況の要約をクリップボードへコピーしました。');

  // #and — the failure of a second attempt is announced too, and stays put
  await page.getByRole('button', { name: '学習状況を要約してコピー' }).click();
  await settleClipboard(page, false);
  await expect(page.locator('.notice')).toHaveText('クリップボードへコピーできませんでした。JSONエクスポートをお使いください。');
});
