import { readFile } from 'node:fs/promises';
import { cards } from '../../src/content/cards';
import { LEGACY_STORAGE_KEY, seedStorage, STORAGE_KEY } from '../fixtures/storage';
import { expect, test } from './fixtures/production';

// A complete v3 document exercising every record family the export/import
// roundtrip must round-trip. Ids are arbitrary where the parser only checks
// structure (mock-exam refs); the review sits on a real D1 card so the Progress
// by-domain tally reflects it. Mirrors tests/storage.spec.ts.
const review = { cardId: 'd1-loop-stop', cardRevisionSeen: 1, dueAt: '2027-01-01T00:00:00.000Z', intervalDays: 3, streak: 1, lapses: 0, lastRating: 'good' };
const quizStat = { attempts: 1, correct: 1, lastAnsweredAt: '2026-07-20T00:00:00.000Z', lastCorrect: true };
const guideDone = { revision: 1, status: 'completed', updatedAt: '2026-07-20T00:00:00.000Z', completedAt: '2026-07-20T00:00:00.000Z' };
const handsOnDone = { revision: 1, status: 'completed', completedStepIds: ['step-a'], updatedAt: '2026-07-20T00:00:00.000Z', completedAt: '2026-07-20T00:00:00.000Z' };
const activeMockExam = {
  id: 'exam-smoke', blueprintVersion: 1, status: 'in_progress',
  questionRefs: [{ questionId: 'q-a', revision: 1 }, { questionId: 'q-b', revision: 1 }],
  currentIndex: 0,
  answers: { 'q-a': { selectedChoiceIds: ['a'], answeredAt: '2026-07-20T00:05:00.000Z' } },
  flaggedQuestionIds: ['q-b'],
  startedAt: '2026-07-20T00:00:00.000Z', expiresAt: '2026-07-20T02:00:00.000Z', updatedAt: '2026-07-20T00:05:00.000Z',
};
const mockExamAttempt = {
  id: 'attempt-smoke', blueprintVersion: 1, outcome: 'submitted',
  questionRefs: [{ questionId: 'q-a', revision: 1 }],
  answers: [{ questionId: 'q-a', questionRevision: 1, selectedChoiceIds: ['a'], correct: true, answeredAt: '2026-07-19T00:05:00.000Z' }],
  flaggedQuestionIds: [], startedAt: '2026-07-19T00:00:00.000Z', expiresAt: '2026-07-19T02:00:00.000Z', completedAt: '2026-07-19T01:00:00.000Z',
};

test('exports, resets, and re-imports the full study document on production', async ({ page }, testInfo) => {
  // Accept both the Reset and the Import confirmation dialogs.
  page.on('dialog', (dialog) => dialog.accept());

  // #given — a fully-populated v3 document
  await page.goto('/');
  const seed = {
    version: 3,
    reviews: { 'd1-loop-stop': review },
    quizStats: { 'q-d1-loop-continue': quizStat },
    studyGuideProgress: { 'sg-agentic-loop': guideDone },
    handsOnProgress: { 'ho-support-agent-escalation': handsOnDone },
    activeMockExam,
    mockExamAttempts: [mockExamAttempt],
  };
  await seedStorage(page, STORAGE_KEY, seed);
  await page.reload();

  // #then — the review is reflected in the Progress by-domain tally
  await page.getByRole('button', { name: '進捗' }).first().click();
  const d1Total = cards.filter((card) => card.domainId === 'd1').length;
  await expect(page.getByText(`1/${d1Total}`).first()).toBeVisible();

  // #when — exporting; the file carries every seeded record
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '進捗をJSONで書き出す' }).click();
  const exportPath = testInfo.outputPath('prod-export.json');
  await (await downloadPromise).saveAs(exportPath);
  const exported = JSON.parse(await readFile(exportPath, 'utf8'));
  expect(exported.reviews['d1-loop-stop']).toEqual(review);
  expect(exported.quizStats['q-d1-loop-continue']).toEqual(quizStat);
  expect(exported.studyGuideProgress['sg-agentic-loop']).toEqual(guideDone);
  expect(exported.handsOnProgress['ho-support-agent-escalation']).toEqual(handsOnDone);
  expect(exported.activeMockExam).toEqual(activeMockExam);
  expect(exported.mockExamAttempts).toEqual([mockExamAttempt]);

  // #when — resetting clears both storage generations
  await page.getByRole('button', { name: 'この端末の進捗を削除' }).click();
  await expect(page.getByText('この端末の進捗を削除しました。')).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
  expect(await page.evaluate((key) => localStorage.getItem(key), LEGACY_STORAGE_KEY)).toBeNull();

  // #when — importing the real downloaded file restores every record
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '進捗をJSONから読み込む' }).click();
  await (await chooserPromise).setFiles(exportPath);
  await expect(page.getByText('JSONから進捗を読み込みました。')).toBeVisible();

  const restored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), STORAGE_KEY);
  expect(restored.reviews['d1-loop-stop']).toEqual(review);
  expect(restored.quizStats['q-d1-loop-continue']).toEqual(quizStat);
  expect(restored.studyGuideProgress['sg-agentic-loop']).toEqual(guideDone);
  expect(restored.handsOnProgress['ho-support-agent-escalation']).toEqual(handsOnDone);
  expect(restored.activeMockExam).toEqual(activeMockExam);
  expect(restored.mockExamAttempts).toEqual([mockExamAttempt]);

  // #then — a reload keeps the restoration visible in the Progress UI
  await page.reload();
  await page.getByRole('button', { name: '進捗' }).first().click();
  await expect(page.getByText(`1/${d1Total}`).first()).toBeVisible();
});

// Covers both unreadable shapes (malformed JSON + a future version) across both
// locales in one body: the persistent warning must show, Export and Reset must
// be disabled (no false-empty backup, no destructive wipe of recoverable bytes),
// Import must stay available, and the raw bytes must survive untouched.
const futureVersion = (v: number) => JSON.stringify({ version: v, reviews: { 'd1-loop-stop': { cardId: 'd1-loop-stop', cardRevisionSeen: 1, dueAt: '2027-01-01T00:00:00.000Z', intervalDays: 1, streak: 1, lapses: 0, lastRating: 'good' } } });
const unreadableCases = [
  { locale: 'ja', path: '/', payload: '{ this is not valid json', alert: '読み込めませんでした', nav: '進捗', exportName: '進捗をJSONで書き出す', importName: '進捗をJSONから読み込む', resetName: 'この端末の進捗を削除', exportedNotice: '進捗をJSONで書き出しました。' },
  { locale: 'ja', path: '/', payload: futureVersion(99), alert: '読み込めませんでした', nav: '進捗', exportName: '進捗をJSONで書き出す', importName: '進捗をJSONから読み込む', resetName: 'この端末の進捗を削除', exportedNotice: '進捗をJSONで書き出しました。' },
  { locale: 'en', path: '/en/', payload: '{bad', alert: 'could not be read', nav: 'Progress', exportName: 'Export progress as JSON', importName: 'Import progress from JSON', resetName: 'Delete progress on this device', exportedNotice: 'Your progress was exported as JSON.' },
  { locale: 'en', path: '/en/', payload: futureVersion(99), alert: 'could not be read', nav: 'Progress', exportName: 'Export progress as JSON', importName: 'Import progress from JSON', resetName: 'Delete progress on this device', exportedNotice: 'Your progress was exported as JSON.' },
] as const;

test('keeps unreadable storage recoverable with export and reset disabled (ja + en, malformed + future)', async ({ page }) => {
  // A confirm dialog here would mean a destructive action escaped its disabled
  // state; flag any dialog so the final assertion catches it.
  let confirmFired = false;
  page.on('dialog', (dialog) => { confirmFired = true; void dialog.dismiss(); });

  for (const unreadable of unreadableCases) {
    // #given — an unreadable document under the current key
    await page.goto(unreadable.path);
    await page.evaluate(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, unreadable.payload]);
    await page.reload();

    // #then — the persistent warning is shown
    await expect(page.getByRole('alert')).toContainText(unreadable.alert);

    // #then — export and reset are disabled, import stays available
    await page.getByRole('button', { name: unreadable.nav }).first().click();
    const exportBtn = page.getByRole('button', { name: unreadable.exportName });
    const resetBtn = page.getByRole('button', { name: unreadable.resetName });
    await expect(exportBtn).toBeDisabled();
    await expect(resetBtn).toBeDisabled();
    await expect(page.getByRole('button', { name: unreadable.importName })).toBeEnabled();

    // #then — the disabled reason is programmatically associated (aria-describedby
    // points at a present, non-empty explanation) so it is exposed accessibly
    const describedBy = await exportBtn.getAttribute('aria-describedby');
    expect(describedBy, 'export button aria-describedby').toBeTruthy();
    expect(await resetBtn.getAttribute('aria-describedby')).toBe(describedBy);
    await expect(page.locator(`#${describedBy}`)).toHaveText(/\S/);

    // #then — the raw bytes are preserved and no export ever succeeded
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(unreadable.payload);
    await expect(page.getByText(unreadable.exportedNotice)).toHaveCount(0);
  }

  expect(confirmFired, 'no confirm dialog should fire while data is unreadable').toBe(false);
});
