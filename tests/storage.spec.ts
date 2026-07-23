import { readFile } from 'node:fs/promises';
import { cards } from '../src/content/cards';
import { expect, openHandsOnList, openOfficialScenarios, supportGuideTitle, test } from './fixtures/app';
import { LEGACY_STORAGE_KEY, STORAGE_KEY } from './fixtures/storage';

// A valid v3 Mock Exam active session and one completed attempt, as a future
// Task 8B build would persist. The question ids are arbitrary — storage validates
// structure, not content existence — so this exercises the schema, not the UI.
const activeMockExam = {
  id: 'exam-e2e',
  blueprintVersion: 1,
  status: 'in_progress',
  questionRefs: [{ questionId: 'q-a', revision: 1 }, { questionId: 'q-b', revision: 1 }],
  currentIndex: 0,
  answers: { 'q-a': { selectedChoiceIds: ['a'], answeredAt: '2026-07-20T00:05:00.000Z' } },
  flaggedQuestionIds: ['q-b'],
  startedAt: '2026-07-20T00:00:00.000Z',
  expiresAt: '2026-07-20T02:00:00.000Z',
  updatedAt: '2026-07-20T00:05:00.000Z',
};
const mockExamAttempt = {
  id: 'attempt-e2e',
  blueprintVersion: 1,
  outcome: 'submitted',
  questionRefs: [{ questionId: 'q-a', revision: 1 }],
  answers: [{ questionId: 'q-a', questionRevision: 1, selectedChoiceIds: ['a'], correct: true, answeredAt: '2026-07-19T00:05:00.000Z' }],
  flaggedQuestionIds: [],
  startedAt: '2026-07-19T00:00:00.000Z',
  expiresAt: '2026-07-19T02:00:00.000Z',
  completedAt: '2026-07-19T01:00:00.000Z',
};

test('does not write stale guide progress on read and reconfirms without replacing its original completion time', async ({ page }) => {
  // This section is revision 2 after a material content update; revision 1 is
  // a valid prior v2 record and therefore exercises the real stale path.
  const originalCompletedAt = '2026-07-01T08:00:00.000Z';
  const initial = {
    version: 2, reviews: {}, quizStats: {}, handsOnProgress: {},
    studyGuideProgress: { 'sg-agentic-loop': { revision: 1, status: 'completed', updatedAt: originalCompletedAt, completedAt: originalCompletedAt } },
  };
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, JSON.stringify(initial)]);
  await page.reload();
  const beforeRead = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  await page.getByRole('button', { name: 'ガイド' }).first().click();
  await expect(page.locator('.guide-section').first()).toContainText('更新内容の再確認が必要');
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(beforeRead);

  await page.locator('.guide-section').first().locator('summary').press('Enter');
  await expect(page.locator('.guide-section').first()).toContainText('以前の記録は「完了」として保持されています');
  await page.getByRole('button', { name: '更新内容を再確認した' }).click();
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').studyGuideProgress['sg-agentic-loop'], STORAGE_KEY);
  expect(saved.revision).toBe(2);
  expect(saved.completedAt).toBe(originalCompletedAt);
  expect(saved.updatedAt).not.toBe(originalCompletedAt);
});

test('keeps future and unrelated v2 records intact while another guide section is saved', async ({ page }) => {
  const review = { cardId: 'd1-loop-stop', cardRevisionSeen: 1, dueAt: '2026-08-01T00:00:00.000Z', intervalDays: 3, streak: 1, lapses: 0, lastRating: 'good' };
  const quizStat = { attempts: 1, correct: 1, lastAnsweredAt: '2026-07-20T00:00:00.000Z', lastCorrect: true };
  const handsOn = { revision: 1, status: 'completed', completedStepIds: ['step-a'], updatedAt: '2026-07-20T00:00:00.000Z', completedAt: '2026-07-20T00:00:00.000Z' };
  const future = { revision: 3, status: 'in_progress', updatedAt: '2026-07-20T00:00:00.000Z' };
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, JSON.stringify({
    version: 2, reviews: { 'd1-loop-stop': review }, quizStats: { 'q-d1-loop-continue': quizStat }, handsOnProgress: { 'hands-on-example': handsOn }, studyGuideProgress: { 'sg-agentic-loop': future },
  })]);
  await page.reload();
  await page.getByRole('button', { name: 'ガイド' }).first().click();
  await expect(page.locator('.guide-section').first()).toContainText('この端末では新しい版の記録');
  await expect(page.locator('.guide-section').first().locator('summary')).toContainText('この端末では新しい版の記録');
  await page.locator('.guide-section').first().locator('summary').press('Enter');
  await expect(page.locator('.guide-section').first()).toContainText('以前の記録は「進行中」です');
  await page.locator('.guide-section').nth(1).locator('summary').press('Enter');
  await page.locator('.guide-section').nth(1).getByRole('button', { name: 'このセクションを開始' }).click();
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), STORAGE_KEY);
  expect(saved.studyGuideProgress['sg-agentic-loop']).toEqual(future);
  expect(saved.reviews['d1-loop-stop']).toEqual(review);
  expect(saved.quizStats['q-d1-loop-continue']).toEqual(quizStat);
  expect(saved.handsOnProgress['hands-on-example']).toEqual(handsOn);
});

test('preserves future and unrelated records while a hands-on step is saved', async ({ page }) => {
  const review = { cardId: 'd1-loop-stop', cardRevisionSeen: 1, dueAt: '2026-08-01T00:00:00.000Z', intervalDays: 3, streak: 1, lapses: 0, lastRating: 'good' };
  const quizStat = { attempts: 1, correct: 1, lastAnsweredAt: '2026-07-20T00:00:00.000Z', lastCorrect: true };
  const studyGuide = { revision: 2, status: 'completed', updatedAt: '2026-07-20T00:00:00.000Z', completedAt: '2026-07-20T00:00:00.000Z' };
  const futureGuide = { revision: 9, status: 'in_progress', completedStepIds: ['x'], updatedAt: '2026-07-20T00:00:00.000Z' };
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, JSON.stringify({
    version: 2, reviews: { 'd1-loop-stop': review }, quizStats: { 'q-d1-loop-continue': quizStat },
    studyGuideProgress: { 'sg-agentic-loop': studyGuide }, handsOnProgress: { 'ho-multi-agent-research': futureGuide, 'ho-removed-guide': { revision: 1, status: 'in_progress', completedStepIds: [], updatedAt: '2026-07-20T00:00:00.000Z' } },
  })]);
  await page.reload();

  await openHandsOnList(page);
  await page.getByRole('button', { name: supportGuideTitle }).click();
  await page.getByRole('button', { name: 'このガイドを開始' }).click();
  await page.getByRole('checkbox').first().check();
  await expect(page.getByText('ステップを完了として記録しました（1/5）。')).toBeVisible();

  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), STORAGE_KEY);
  expect(saved.reviews['d1-loop-stop']).toEqual(review);
  expect(saved.quizStats['q-d1-loop-continue']).toEqual(quizStat);
  expect(saved.studyGuideProgress['sg-agentic-loop']).toEqual(studyGuide);
  expect(saved.handsOnProgress['ho-multi-agent-research']).toEqual(futureGuide);
  expect(saved.handsOnProgress['ho-removed-guide']).toBeDefined();
  expect(saved.handsOnProgress['ho-support-agent-escalation'].completedStepIds).toEqual(['step-tool-contracts']);
});

test('merges a Guide write with a review saved by another already-open tab', async ({ page, context }) => {
  const guidePage = await context.newPage();
  await guidePage.goto('/');

  // Tab A writes after tab B has already loaded its empty in-memory document.
  await page.getByRole('button', { name: '練習' }).first().click();
  await page.locator('.reveal-button').first().click();
  await page.getByRole('button', { name: /できた/ }).first().click();
  await expect.poll(() => page.evaluate((key) => Object.keys(JSON.parse(localStorage.getItem(key) ?? '{}').reviews ?? {}).length, STORAGE_KEY)).toBe(1);

  // Tab B must re-read canonical storage before adding its Guide record.
  await guidePage.getByRole('button', { name: 'ガイド' }).first().click();
  const first = guidePage.locator('.guide-section').first();
  await first.locator('summary').press('Enter');
  await first.getByRole('button', { name: 'このセクションを開始' }).click();
  const saved = await guidePage.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), STORAGE_KEY);
  expect(Object.keys(saved.reviews)).toHaveLength(1);
  expect(saved.studyGuideProgress['sg-agentic-loop']?.status).toBe('in_progress');
  await guidePage.close();
});

test('migrates progress saved by an earlier release without losing anything', async ({ page }) => {
  // #given — a v1 document written by a shipped release, under the legacy key
  const legacy = {
    version: 1,
    reviews: {
      'd1-loop-stop': {
        cardId: 'd1-loop-stop',
        cardRevisionSeen: 1,
        dueAt: '2027-01-01T00:00:00.000Z',
        intervalDays: 3,
        streak: 1,
        lapses: 0,
        lastRating: 'good',
      },
    },
    quizStats: { 'q-d1-loop-continue': { attempts: 2, correct: 1, lastAnsweredAt: '2026-07-17T10:00:00.000Z', lastCorrect: true } },
  };
  await page.evaluate(([key, document]) => localStorage.setItem(key, document), [LEGACY_STORAGE_KEY, JSON.stringify(legacy)]);

  // #when — the app starts
  await page.reload();
  await page.getByRole('button', { name: '進捗' }).first().click();

  // #then — the earlier review is still counted in the progress view
  const d1Total = cards.filter((card) => card.domainId === 'd1').length;
  await expect(page.getByText(`1/${d1Total}`).first()).toBeVisible();

  // #then — the migrated document is stored under the current key at the latest
  // version, with the new progress and Mock Exam records empty and the legacy key
  // left in place for a rollback
  const migrated = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), STORAGE_KEY);
  expect(migrated).toEqual({
    version: 3,
    reviews: legacy.reviews,
    quizStats: legacy.quizStats,
    studyGuideProgress: {},
    handsOnProgress: {},
    activeMockExam: null,
    mockExamAttempts: [],
  });
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), LEGACY_STORAGE_KEY)).toEqual(legacy);

  // #then — a reload keeps the migrated values and does not re-read the legacy key
  await page.evaluate(([key, document]) => localStorage.setItem(key, document), [LEGACY_STORAGE_KEY, JSON.stringify({ ...legacy, reviews: {} })]);
  await page.reload();
  await page.getByRole('button', { name: '進捗' }).first().click();
  await expect(page.getByText(`1/${d1Total}`).first()).toBeVisible();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), STORAGE_KEY)).toEqual(migrated);
});

test('does not bring migrated legacy progress back after a reset', async ({ page }) => {
  // #given — legacy progress that the app migrated on start
  page.on('dialog', (dialog) => dialog.accept());
  await page.evaluate(([key, document]) => localStorage.setItem(key, document), [LEGACY_STORAGE_KEY, JSON.stringify({
    version: 1,
    reviews: { 'd1-loop-stop': { cardId: 'd1-loop-stop', cardRevisionSeen: 1, dueAt: '2027-01-01T00:00:00.000Z', intervalDays: 3, streak: 1, lapses: 0, lastRating: 'good' } },
  })]);
  await page.reload();

  // #when — the learner deletes the progress of this device
  await page.getByRole('button', { name: '進捗' }).first().click();
  await page.getByRole('button', { name: 'この端末の進捗を削除' }).click();
  await expect(page.getByText('この端末の進捗を削除しました。')).toBeVisible();

  // #then — both storage generations are gone, so a reload cannot migrate it back
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
  expect(await page.evaluate((key) => localStorage.getItem(key), LEGACY_STORAGE_KEY)).toBeNull();
  await page.reload();
  await page.getByRole('button', { name: '進捗' }).first().click();
  const d1Total = cards.filter((card) => card.domainId === 'd1').length;
  await expect(page.getByText(`0/${d1Total}`).first()).toBeVisible();
});

test('viewing official scenarios never writes storage and preserves unknown or future records', async ({ page }) => {
  const initial = {
    version: 2,
    reviews: {},
    quizStats: { 'q-d1-fanout': { attempts: 3, correct: 2, lastAnsweredAt: '2026-07-01T00:00:00.000Z', lastCorrect: true } },
    studyGuideProgress: { 'sg-future-section': { revision: 9, status: 'completed', updatedAt: '2026-07-01T00:00:00.000Z', completedAt: '2026-07-01T00:00:00.000Z' } },
    handsOnProgress: { 'ho-future-guide': { revision: 9, status: 'in_progress', completedStepIds: [], updatedAt: '2026-07-01T00:00:00.000Z' } },
  };
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, JSON.stringify(initial)]);
  await page.reload();

  await openOfficialScenarios(page);
  await page.getByRole('button', { name: 'カスタマーサポート解決エージェント' }).click();
  await page.getByRole('button', { name: '公式シナリオ一覧に戻る' }).click();

  const after = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  expect(JSON.parse(after ?? '{}')).toEqual(initial);
});

test('exports, resets, and re-imports Mock Exam state alongside existing progress', async ({ page }, testInfo) => {
  page.on('dialog', (dialog) => dialog.accept());
  const review = { cardId: 'd1-loop-stop', cardRevisionSeen: 1, dueAt: '2027-01-01T00:00:00.000Z', intervalDays: 3, streak: 1, lapses: 0, lastRating: 'good' };
  const seed = {
    version: 3,
    reviews: { 'd1-loop-stop': review },
    quizStats: {},
    studyGuideProgress: {},
    handsOnProgress: {},
    activeMockExam,
    mockExamAttempts: [mockExamAttempt],
  };
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, JSON.stringify(seed)]);
  await page.reload();

  // #then — existing progress survives loading a document that carries Mock Exam state
  await page.getByRole('button', { name: '進捗' }).first().click();
  const d1Total = cards.filter((card) => card.domainId === 'd1').length;
  await expect(page.getByText(`1/${d1Total}`).first()).toBeVisible();

  // #when — exporting writes the Mock Exam state into the file
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '進捗をJSONで書き出す' }).click();
  const exportPath = testInfo.outputPath('mock-export.json');
  await (await downloadPromise).saveAs(exportPath);
  const exported = JSON.parse(await readFile(exportPath, 'utf8'));
  expect(exported.activeMockExam).toEqual(activeMockExam);
  expect(exported.mockExamAttempts).toEqual([mockExamAttempt]);

  // #when — a reset clears everything, Mock Exam state included
  await page.getByRole('button', { name: 'この端末の進捗を削除' }).click();
  await expect(page.getByText('この端末の進捗を削除しました。')).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();

  // #when — importing the exported file restores the Mock Exam state and the review
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '進捗をJSONから読み込む' }).click();
  await (await chooserPromise).setFiles(exportPath);
  await expect(page.getByText('JSONから進捗を読み込みました。')).toBeVisible();

  const restored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), STORAGE_KEY);
  expect(restored.activeMockExam).toEqual(activeMockExam);
  expect(restored.mockExamAttempts).toEqual([mockExamAttempt]);
  expect(restored.reviews['d1-loop-stop']).toEqual(review);
});


// Task 10B (reviewer finding 2): when the current-key document cannot be read
// (corrupt, or a future version after a deploy rollback), load() shows empty but
// the raw bytes remain and save() refuses to overwrite. The UI must not let the
// learner take an EMPTY export (a false backup) or Reset away the recoverable
// raw document. Export and Reset are disabled and the raw value is preserved.
for (const seed of [
  { name: 'corrupt', payload: '{ this is not valid json' },
  { name: 'future-version', payload: JSON.stringify({ version: 99, reviews: { 'd1-loop-stop': { cardId: 'd1-loop-stop', cardRevisionSeen: 1, dueAt: '2027-01-01T00:00:00.000Z', intervalDays: 1, streak: 1, lapses: 0, lastRating: 'good' } } }) },
]) {
  test(`unreadable ${seed.name} data disables export and reset and keeps the raw document`, async ({ page }) => {
    // #given an unreadable document under the current key
    await page.goto('/');
    await page.evaluate(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, seed.payload]);
    await page.reload();

    // #then the persistent warning is shown and the raw bytes are untouched
    await expect(page.getByRole('alert')).toContainText('読み込めませんでした');
    await page.getByRole('button', { name: '進捗' }).first().click();
    const exportBtn = page.getByRole('button', { name: '進捗をJSONで書き出す' });
    const resetBtn = page.getByRole('button', { name: 'この端末の進捗を削除' });

    // #then export and reset are disabled (no empty backup, no destructive reset)
    await expect(exportBtn).toBeDisabled();
    await expect(resetBtn).toBeDisabled();

    // #then the recoverable raw document is still on disk, unchanged
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(seed.payload);
  });
}

test('unreadable data warning and disabled actions are present in English too', async ({ page }) => {
  // #given an unreadable document, English locale
  await page.goto('/en/');
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, '{bad']);
  await page.reload();

  // #then the English warning shows and destructive actions are disabled
  await expect(page.getByRole('alert')).toContainText('could not be read');
  await page.getByRole('button', { name: 'Progress' }).first().click();
  await expect(page.getByRole('button', { name: 'Export progress as JSON' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Delete progress on this device' })).toBeDisabled();
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe('{bad');
});
