import type { Page } from '@playwright/test';
import { questions } from '../src/content/questions';
import { expectNoViolations } from './fixtures/accessibility';
import { expect, test } from './fixtures/app';
import { readStudyData, seedStorage, STORAGE_KEY } from './fixtures/storage';

// Real question refs from the production bank, so seeded sessions pass the strict
// storage parser and the compatibility check (revision 1 across the bank).
const refs = questions.slice(0, 3).map((question) => ({ questionId: question.id, revision: question.revision }));
const firstChoiceId = questions[0].choices[0].id;

function emptyV3() {
  return { version: 3, reviews: {}, quizStats: {}, studyGuideProgress: {}, handsOnProgress: {}, activeMockExam: null, mockExamAttempts: [] as unknown[] };
}

// Builds an internally consistent in-progress session. Times are derived from
// `now` so `startedAt <= answeredAt <= updatedAt < expiresAt` always holds.
function makeSession(opts: {
  startedMsAgo: number;
  durationMs: number;
  currentIndex?: number;
  answer?: { questionId: string; selectedChoiceIds: string[] };
  flagged?: string[];
  refsOverride?: { questionId: string; revision: number }[];
}) {
  const now = Date.now();
  const start = now - opts.startedMsAgo;
  const expiresAt = start + opts.durationMs;
  const answers: Record<string, { selectedChoiceIds: string[]; answeredAt: string }> = {};
  let updatedMs = start + 1000;
  if (opts.answer) {
    const answeredMs = start + 2000;
    answers[opts.answer.questionId] = { selectedChoiceIds: opts.answer.selectedChoiceIds, answeredAt: new Date(answeredMs).toISOString() };
    updatedMs = Math.max(updatedMs, answeredMs);
  }
  return {
    id: 'exam-seed-1',
    blueprintVersion: 1,
    status: 'in_progress',
    questionRefs: opts.refsOverride ?? refs,
    currentIndex: opts.currentIndex ?? 0,
    answers,
    flaggedQuestionIds: opts.flagged ?? [],
    startedAt: new Date(start).toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
    updatedAt: new Date(updatedMs).toISOString(),
  };
}

async function openMockExam(page: Page): Promise<void> {
  await page.locator('.mock-exam-launch-actions .btn:not(.btn--secondary)').click();
}

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

test('runs a full mock exam: start, answer, flag, move, resume after reload, submit, review', async ({ page }) => {
  await openMockExam(page);
  await expect(page.getByRole('heading', { name: '60問の模試に挑戦する' })).toBeVisible();
  await page.getByRole('button', { name: '模試を開始' }).click();

  await expect(page.locator('.mock-exam-progress')).toHaveText('1 / 60');
  await answerCurrent(page);
  await page.getByRole('button', { name: 'この問題にフラグを付ける' }).click();
  await expect(page.getByRole('button', { name: 'フラグを外す' })).toBeVisible();

  await page.getByRole('button', { name: '次の問題' }).click();
  await expect(page.locator('.mock-exam-progress')).toHaveText('2 / 60');

  await page.getByRole('button', { name: '問題一覧を開く' }).click();
  await expect(page.getByRole('heading', { name: '問題一覧' })).toBeVisible();
  await page.getByRole('button', { name: /^問題1（/ }).click();
  await expect(page.locator('.mock-exam-progress')).toHaveText('1 / 60');

  // Reload: the app returns to Today; reopening shows resume (session persisted),
  // and the answer, flag, and cursor are restored exactly.
  await page.reload();
  await openMockExam(page);
  await expect(page.getByRole('heading', { name: '進行中の模試があります' })).toBeVisible();
  await page.getByRole('button', { name: '模試を再開' }).click();
  await expect(page.locator('.mock-exam-progress')).toHaveText('1 / 60');
  await expect(page.locator('.mock-exam-question .choice-button.selected').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'フラグを外す' })).toBeVisible();

  // Submit through the confirmation dialog.
  await page.getByRole('button', { name: '提出する', exact: true }).click();
  const dialog = page.locator('.mock-exam-submit-dialog');
  await expect(dialog.getByRole('heading', { name: '模試を提出しますか？' })).toBeVisible();
  await dialog.getByRole('button', { name: '提出する' }).click();

  await expect(page.getByRole('heading', { name: '結果', exact: true })).toBeVisible();
  await expect(page.locator('.mock-exam-outcome')).toHaveText('提出済み');
  // Raw accuracy is the only score-shaped output; the disclaimer states plainly
  // that no official scaled score or pass/fail is reproduced. No pass/fail verdict
  // ("合格" / "不合格") is rendered as a result.
  await expect(page.locator('.mock-exam-result')).toContainText('単純正答率');
  await expect(page.locator('.mock-exam-disclaimer')).toContainText('scaled scoreや合否を再現するものではありません');
  await expect(page.locator('.mock-exam-result')).not.toContainText('合格圏');
  await expect(page.locator('.mock-exam-result')).not.toContainText('不合格');

  await page.getByRole('button', { name: '問題を復習する' }).click();
  await expect(page.getByRole('heading', { name: '問題の復習' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '選択肢別の解説' }).first()).toBeVisible();
  await expect(page.locator('.mock-exam-review .source-links a').first()).toBeVisible();

  // Exactly one attempt persisted.
  const stored = await readStudyData(page, STORAGE_KEY);
  expect((stored?.mockExamAttempts as unknown[]).length).toBe(1);
  expect(stored?.activeMockExam).toBeNull();
});

test('resumes a seeded in-progress session with its answer, flag, and cursor intact', async ({ page }) => {
  await seedStorage(page, STORAGE_KEY, {
    ...emptyV3(),
    activeMockExam: makeSession({ startedMsAgo: 60_000, durationMs: 7_200_000, currentIndex: 1, answer: { questionId: refs[0].questionId, selectedChoiceIds: [firstChoiceId] }, flagged: [refs[2].questionId] }),
  });
  await page.reload();
  await openMockExam(page);

  await page.getByRole('button', { name: '模試を再開' }).click();
  await expect(page.locator('.mock-exam-progress')).toHaveText('2 / 3');
  await expect(page.locator('.mock-exam-counts')).toContainText('回答済み 1');

  // Jump to the seeded-answered question; its choice is still selected.
  await page.getByRole('button', { name: '問題一覧を開く' }).click();
  await page.getByRole('button', { name: /^問題1（/ }).click();
  await expect(page.locator('.mock-exam-question .choice-button.selected').first()).toBeVisible();
});

test('auto-grades an expired session on reopen and stores exactly one attempt', async ({ page }) => {
  await seedStorage(page, STORAGE_KEY, {
    ...emptyV3(),
    activeMockExam: makeSession({ startedMsAgo: 3 * 3_600_000, durationMs: 3_600_000, answer: { questionId: refs[0].questionId, selectedChoiceIds: [firstChoiceId] } }),
  });
  await page.reload();
  await openMockExam(page);

  await expect(page.getByRole('heading', { name: '結果', exact: true })).toBeVisible();
  await expect(page.locator('.mock-exam-outcome')).toHaveText('時間切れ');

  const stored = await readStudyData(page, STORAGE_KEY);
  expect((stored?.mockExamAttempts as unknown[]).length).toBe(1);
  expect(stored?.activeMockExam).toBeNull();
});

test('surfaces an incompatible session without grading or discarding it', async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept());
  await seedStorage(page, STORAGE_KEY, {
    ...emptyV3(),
    activeMockExam: makeSession({ startedMsAgo: 60_000, durationMs: 7_200_000, refsOverride: [{ questionId: refs[0].questionId, revision: 999 }, refs[1], refs[2]] }),
  });
  await page.reload();
  await openMockExam(page);

  await expect(page.getByRole('heading', { name: '模試を再開できません' })).toBeVisible();
  let stored = await readStudyData(page, STORAGE_KEY);
  expect((stored?.mockExamAttempts as unknown[]).length).toBe(0);
  expect(stored?.activeMockExam).not.toBeNull();

  await page.getByRole('button', { name: 'この模試を破棄する' }).click();
  await expect(page.getByRole('heading', { name: '60問の模試に挑戦する' })).toBeVisible();
  stored = await readStudyData(page, STORAGE_KEY);
  expect(stored?.activeMockExam).toBeNull();
});

test('auto-expires a running exam when the clock runs out', { tag: '@slow' }, async ({ page }) => {
  await seedStorage(page, STORAGE_KEY, {
    ...emptyV3(),
    activeMockExam: makeSession({ startedMsAgo: 7_200_000 - 3_000, durationMs: 7_200_000, answer: { questionId: refs[0].questionId, selectedChoiceIds: [firstChoiceId] } }),
  });
  await page.reload();
  await openMockExam(page);
  await page.getByRole('button', { name: '模試を再開' }).click();
  await expect(page.locator('.mock-exam-runner')).toBeVisible();

  await expect(page.getByRole('heading', { name: '結果', exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.mock-exam-outcome')).toHaveText('時間切れ');
  const stored = await readStudyData(page, STORAGE_KEY);
  expect((stored?.mockExamAttempts as unknown[]).length).toBe(1);
});

test('does not claim submission when the result cannot be saved, and keeps the exam resumable', async ({ page }) => {
  // #given — a seeded in-progress exam, then localStorage.setItem blocked for the
  // study-data key (quota/blocked), so the submit write will fail.
  await seedStorage(page, STORAGE_KEY, {
    ...emptyV3(),
    activeMockExam: makeSession({ startedMsAgo: 60_000, durationMs: 7_200_000, answer: { questionId: refs[0].questionId, selectedChoiceIds: [firstChoiceId] } }),
  });
  await page.addInitScript((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === key) throw new DOMException('blocked', 'QuotaExceededError');
      return original.call(this, k, v);
    };
  }, STORAGE_KEY);
  await page.reload();
  await openMockExam(page);
  await page.getByRole('button', { name: '模試を再開' }).click();

  // #when — submitting through the dialog while the write is blocked
  await page.getByRole('button', { name: '提出する', exact: true }).click();
  await page.locator('.mock-exam-submit-dialog').getByRole('button', { name: '提出する' }).click();

  // #then — a save-error screen, NOT a result; storage still holds the active
  // session and no attempt was persisted, so the exam remains resumable.
  await expect(page.getByRole('heading', { name: '結果を保存できませんでした' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '結果', exact: true })).toHaveCount(0);
  const stored = await readStudyData(page, STORAGE_KEY);
  expect(stored?.activeMockExam).not.toBeNull();
  expect((stored?.mockExamAttempts as unknown[]).length).toBe(0);
});

test('reviews a stale stored attempt without mixing in current question content', async ({ page }) => {
  const start = 1_690_000_000_000; // fixed past epoch; independent of the machine clock
  await seedStorage(page, STORAGE_KEY, {
    ...emptyV3(),
    mockExamAttempts: [{
      id: 'attempt-stale-1',
      blueprintVersion: 1,
      outcome: 'submitted',
      questionRefs: [{ questionId: refs[0].questionId, revision: 999 }, refs[1]],
      answers: [
        { questionId: refs[0].questionId, questionRevision: 999, selectedChoiceIds: [firstChoiceId], correct: true, answeredAt: new Date(start + 5 * 60_000).toISOString() },
        { questionId: refs[1].questionId, questionRevision: refs[1].revision, selectedChoiceIds: [], correct: false },
      ],
      flaggedQuestionIds: [],
      startedAt: new Date(start).toISOString(),
      expiresAt: new Date(start + 7_200_000).toISOString(),
      completedAt: new Date(start + 30 * 60_000).toISOString(),
    }],
  });
  await page.reload();
  await openMockExam(page);

  await page.getByRole('button', { name: '過去の模試' }).click();
  await page.getByRole('button', { name: '結果を開く' }).click();

  // Result: raw scoreboard shown, but the content-dependent breakdowns are hidden.
  await expect(page.getByRole('heading', { name: '結果', exact: true })).toBeVisible();
  await expect(page.getByText('ドメイン・難易度・スキル別の内訳は表示しません')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ドメイン別' })).toHaveCount(0);

  // Review: the stale question shows only the saved answer, not current content.
  await page.getByRole('button', { name: '問題を復習する' }).click();
  await expect(page.getByText('この問題は内容が更新されたため、保存された回答のみを表示します。').first()).toBeVisible();
});

test('has no accessibility violations across landing, runner, and result', { tag: '@slow' }, async ({ page }) => {
  await openMockExam(page);
  await expect(page.getByRole('heading', { name: '60問の模試に挑戦する' })).toBeVisible();
  await expectNoViolations(page);

  await page.getByRole('button', { name: '模試を開始' }).click();
  await expect(page.locator('.mock-exam-runner')).toBeVisible();
  await expectNoViolations(page);

  await page.getByRole('button', { name: '提出する', exact: true }).click();
  await page.locator('.mock-exam-submit-dialog').getByRole('button', { name: '提出する' }).click();
  await expect(page.getByRole('heading', { name: '結果', exact: true })).toBeVisible();
  await expectNoViolations(page);
});


// Task 10B: the palette and submit-confirmation dialogs are separate <dialog>
// surfaces that the landing/runner/result axe pass never opened. Scan both, and
// verify the 60-cell palette stays within the viewport (no horizontal overflow)
// at a 360px mobile width.
test('palette and submit dialogs are accessible at desktop and mobile widths', { tag: '@slow' }, async ({ page }) => {
  await openMockExam(page);
  await page.getByRole('button', { name: '模試を開始' }).click();
  await expect(page.locator('.mock-exam-runner')).toBeVisible();

  // #then — the question palette dialog is accessible and does not overflow at 1280 or 360
  for (const width of [1280, 360]) {
    await page.setViewportSize({ width, height: 800 });
    await page.getByRole('button', { name: '問題一覧を開く' }).click();
    await expect(page.getByRole('heading', { name: '問題一覧' })).toBeVisible();
    await expectNoViolations(page);
    const dims = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }));
    expect(dims.document, `palette horizontal overflow @${width}`).toBe(dims.viewport);
    await page.getByRole('button', { name: '閉じる' }).click();
    await expect(page.getByRole('heading', { name: '問題一覧' })).toHaveCount(0);
  }

  // #then — the submit confirmation dialog is accessible
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByRole('button', { name: '提出する', exact: true }).click();
  await expect(page.locator('.mock-exam-submit-dialog').getByRole('heading', { name: '模試を提出しますか？' })).toBeVisible();
  await expectNoViolations(page);
  await page.locator('.mock-exam-submit-dialog').getByRole('button', { name: 'キャンセル' }).click();
  await expect(page.locator('.mock-exam-runner')).toBeVisible();
});
