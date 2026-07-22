import { writeFile } from 'node:fs/promises';
import { cards } from '../src/content/cards';
import { expect, test } from './fixtures/app';
import { STORAGE_KEY } from './fixtures/storage';

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

  // #when — importing the exported file and confirming the overwrite dialog
  const dialogMessage = new Promise<string>((resolve) => page.once('dialog', (dialog) => {
    resolve(dialog.message());
    void dialog.accept();
  }));
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '進捗をJSONから読み込む' }).click();
  await (await chooserPromise).setFiles(exportPath);

  // #then — the dialog summarizes the payload and progress is back without a reload
  expect(await dialogMessage).toContain('復習済みカード1枚');
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
