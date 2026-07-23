import type { Page } from '@playwright/test';
import { cards } from '../src/content/cards';
import { questions } from '../src/content/questions';
import { expectNoViolations } from './fixtures/accessibility';
import { expect, test } from './fixtures/app';
import { seedStorage, STORAGE_KEY } from './fixtures/storage';

// Task 10A product-coherence E2E. Everything is driven from seeded storage — no
// 120-minute exam is ever run — and heavy axe/responsive passes are tagged @slow
// so the fast suite stays fast, matching the existing spec split.

function emptyV3() {
  return { version: 3, reviews: {}, quizStats: {}, studyGuideProgress: {}, handsOnProgress: {}, activeMockExam: null, mockExamAttempts: [] as unknown[] };
}

// A full 60-question attempt over the real production bank so its mix is realistic.
function fullAttempt(id: string, startMs: number, correctThrough: number) {
  const questionRefs = questions.map((question) => ({ questionId: question.id, revision: question.revision }));
  const answers = questions.map((question, index) => ({
    questionId: question.id,
    questionRevision: question.revision,
    selectedChoiceIds: [question.choices[0].id],
    correct: index < correctThrough,
    answeredAt: new Date(startMs + 5 * 60_000).toISOString(),
  }));
  return {
    id, blueprintVersion: 1, outcome: 'submitted' as const, questionRefs, answers,
    flaggedQuestionIds: [] as string[],
    startedAt: new Date(startMs).toISOString(),
    expiresAt: new Date(startMs + 7_200_000).toISOString(),
    completedAt: new Date(startMs + 30 * 60_000).toISOString(),
  };
}

// A schema-valid in-flight session (real refs, not expired) so load() keeps it.
function makeSession() {
  const now = Date.now();
  const start = now - 60_000;
  const refs = questions.slice(0, 3).map((question) => ({ questionId: question.id, revision: question.revision }));
  return {
    id: 'exam-seed-coherence', blueprintVersion: 1, status: 'in_progress' as const,
    questionRefs: refs, currentIndex: 0, answers: {}, flaggedQuestionIds: [] as string[],
    startedAt: new Date(start).toISOString(),
    expiresAt: new Date(start + 7_200_000).toISOString(),
    updatedAt: new Date(start + 1000).toISOString(),
  };
}

async function seed(page: Page, data: Record<string, unknown>): Promise<void> {
  await seedStorage(page, STORAGE_KEY, { ...emptyV3(), ...data });
  await page.reload();
}

async function openGuide(page: Page, nav = 'ガイド'): Promise<void> {
  await page.getByRole('button', { name: nav }).first().click();
  await expect(page.locator('.guide-view')).toBeVisible();
}

// --- Learning path numbering (§4, §12.1–2) ---

for (const { locale, path, nav } of [
  { locale: 'ja', path: '/', nav: 'ガイド' },
  { locale: 'en', path: '/en/', nav: 'Guide' },
]) {
  test(`${locale} learning path renders each number exactly once`, async ({ page }) => {
    await page.goto(path);
    await openGuide(page, nav);
    const list = page.locator('.guide-path-list');
    await expect(list).toBeVisible();

    // The ordered-list native marker is the sole number source: list-style must
    // NOT be hidden, and the copy must carry no manual "N." prefix (the old bug).
    const listStyle = await list.evaluate((el) => getComputedStyle(el).listStyleType);
    expect(listStyle).not.toBe('none');

    const titles = await list.locator('li .guide-path-copy strong').allInnerTexts();
    expect(titles.length).toBe(8);
    for (const title of titles) {
      expect(title).not.toMatch(/^\s*\d+\./); // no manual number in the text
      expect(title).not.toMatch(/^\s*\d+\.\s*\d+\./); // no doubled "1. 1."
    }
  });
}

// --- Every stage reaches an implemented feature (§3, §12.3) ---

test('every learning-path stage navigates to an implemented feature', async ({ page }) => {
  await seed(page, { mockExamAttempts: [fullAttempt('a1', 1_690_000_000_000, 40)] });
  await openGuide(page);
  const list = page.locator('.guide-path-list');

  // In-page anchors keep the Guide view and move focus to a heading.
  await list.getByRole('button', { name: '開始地点を選ぶ' }).click();
  await expect(page.getByRole('heading', { name: '最初に取り組む場所を選ぶ' })).toBeFocused();
  await list.getByRole('button', { name: 'Study Guideを開く' }).click();
  await expect(page.locator('.guide-sections h3').first()).toBeFocused();

  // View-bound stages navigate to their feature; return to Guide between each.
  const hops: Array<[string, () => Promise<void>]> = [
    ['Hands-onを開く', async () => { await expect(page.getByRole('heading', { name: 'ハンズオン', exact: true })).toBeVisible(); }],
    ['Practiceを開く', async () => { await expect(page.locator('.practice-view')).toBeVisible(); }],
    ['Quizを開く', async () => { await expect(page.locator('.quiz-view')).toBeVisible(); }],
    ['模試を開く', async () => { await expect(page.locator('.mock-exam-landing')).toBeVisible(); }],
    ['模試結果の分析を開く', async () => { await expect(page.getByRole('heading', { name: '模試結果を分析する' })).toBeVisible(); }],
    ['Practiceで復習する', async () => { await expect(page.locator('.practice-view')).toBeVisible(); }],
  ];
  for (const [cta, assertDestination] of hops) {
    await openGuide(page);
    await list.getByRole('button', { name: cta }).click();
    await assertDestination();
  }
});

// --- Availability accuracy (§2.2, §12.4–5) ---

test('mock exam and learning analysis are shown as available, never future', async ({ page }) => {
  await seed(page, { mockExamAttempts: [fullAttempt('a1', 1_690_000_000_000, 30)] });
  await openGuide(page);
  const guide = page.locator('.guide-view');
  await expect(guide.getByRole('button', { name: '模試を開く' })).toBeVisible();
  await expect(guide.getByRole('button', { name: '模試結果の分析を開く' })).toBeVisible();
  // No "future / coming later" framing anywhere in the guide.
  await expect(guide).not.toContainText('今後');
  await expect(guide).not.toContainText('今後利用可能');
});

// --- No person/date-specific framing (§2.1, §12.6–7) ---

test('Japanese UI contains no fixed-date framing', async ({ page }) => {
  await openGuide(page);
  const body = await page.locator('body').innerText();
  expect(body).not.toContain('8月末');
  expect(body).not.toContain('残り期間');
});

test('English UI contains no fixed-date framing', async ({ page }) => {
  await page.goto('/en/');
  await openGuide(page, 'Guide');
  const body = await page.locator('body').innerText();
  expect(body).not.toMatch(/end of August/i);
  expect(body).not.toMatch(/remaining time/i);
});

// --- Actionable start-point selection (§5, §12.8–9) ---

test('start-point selection expands and focuses the target guide section', async ({ page }) => {
  await openGuide(page);
  await page.getByLabel('エージェントループと委譲の基礎から始めたい').check();
  await page.getByRole('button', { name: '開始セクションを提案する' }).click();
  await expect(page.locator('.guide-recommendation')).toBeFocused();

  const target = page.locator('#guide-section-sg-agentic-loop');
  await page.locator('.guide-recommendation-open').click();
  await expect(target).toHaveAttribute('open', '');
  await expect(target.locator('summary')).toBeFocused();
  // Reading the recommendation must not persist progress.
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{"studyGuideProgress":{}}').studyGuideProgress, STORAGE_KEY)).toEqual({});
});

// --- Today mock-exam CTA by state (§7.1, §12.10) ---

test('Today mock-exam CTA reflects the exam state', async ({ page }) => {
  // No session, no attempt → start.
  await expect(page.locator('.mock-exam-launch-button')).toHaveText(/模試を開始/);

  // Active session → resume.
  await seed(page, { activeMockExam: makeSession() });
  await expect(page.locator('.mock-exam-launch-button')).toHaveText(/模試を再開/);

  // Attempt but no active session → open results.
  await seed(page, { mockExamAttempts: [fullAttempt('a1', 1_690_000_000_000, 20)] });
  await expect(page.locator('.mock-exam-launch-button')).toHaveText(/模試と結果を開く/);
});

// --- Today opens learning analysis (§7.2, §12.11) ---

test('Today opens the mock-exam learning analysis', async ({ page }) => {
  await seed(page, { mockExamAttempts: [fullAttempt('a1', 1_690_000_000_000, 30)] });
  await page.locator('.mock-exam-launch-analysis').click();
  await expect(page.getByRole('heading', { name: '模試結果を分析する' })).toBeVisible();
});

test('Today weak-area label distinguishes card practice from mock-exam analysis', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'カード練習でつまずいた領域' })).toBeVisible();
});

// --- Progress service-wide overview (§8, §12.12–14) ---

test('Progress shows aggregates for every feature with correct seeded values', async ({ page }) => {
  const pastDue = new Date(Date.now() - 86_400_000).toISOString();
  const futureDue = new Date(Date.now() + 86_400_000).toISOString();
  await seed(page, {
    reviews: {
      [cards[0].id]: { cardId: cards[0].id, cardRevisionSeen: cards[0].revision, dueAt: futureDue, intervalDays: 4, streak: 2, lapses: 0, lastRating: 'good' },
      [cards[1].id]: { cardId: cards[1].id, cardRevisionSeen: cards[1].revision, dueAt: pastDue, intervalDays: 1, streak: 0, lapses: 0, lastRating: 'again' },
    },
    quizStats: { [questions[0].id]: { attempts: 3, correct: 2, lastAnsweredAt: pastDue, lastCorrect: true } },
    studyGuideProgress: { 'sg-agentic-loop': { revision: 2, status: 'completed', updatedAt: pastDue, completedAt: pastDue } },
    mockExamAttempts: [fullAttempt('a1', 1_690_000_000_000, 40)],
  });
  await page.getByRole('button', { name: '進捗' }).first().click();

  const overview = page.locator('.progress-overview');
  await expect(overview).toBeVisible();
  // Study Guide
  await expect(overview.getByText('完了セクション 1 /')).toBeVisible();
  // Hands-on (nothing seeded)
  await expect(overview.getByText('完了ガイド 0 /')).toBeVisible();
  // Practice: 2 reviewed, 1 weak (again). Due counts every not-yet-scheduled card
  // too (isDue is true for unseen), so only the one future-dated card is excluded.
  await expect(overview.getByText('評価済み 2 /')).toBeVisible();
  await expect(overview.getByText('つまずいたカード 1')).toBeVisible();
  await expect(overview.getByText(`復習予定 ${cards.length - 1}`)).toBeVisible();
  // Quiz
  await expect(overview.getByText('回答した問題 1')).toBeVisible();
  await expect(overview.getByText('回答回数 3')).toBeVisible();
  await expect(overview.getByText('正解回数 2')).toBeVisible();
  // Mock Exam: 40/60 = 67%
  await expect(overview.getByText('完了した模試 1')).toBeVisible();
  await expect(overview.getByText('最新結果 60問中40問正解')).toBeVisible();
  await expect(overview.getByText('単純正答率 67%')).toBeVisible();
});

test('Progress navigates to each feature', async ({ page }) => {
  await seed(page, { mockExamAttempts: [fullAttempt('a1', 1_690_000_000_000, 30)] });
  const gotoProgress = async () => { await page.getByRole('button', { name: '進捗' }).first().click(); await expect(page.locator('.progress-overview')).toBeVisible(); };

  await gotoProgress();
  await page.locator('.progress-overview').getByRole('button', { name: 'Study Guideを開く' }).click();
  await expect(page.locator('.guide-view')).toBeVisible();

  await gotoProgress();
  await page.locator('.progress-overview').getByRole('button', { name: 'Hands-onを開く' }).click();
  await expect(page.getByRole('heading', { name: 'ハンズオン', exact: true })).toBeVisible();

  await gotoProgress();
  await page.locator('.progress-overview').getByRole('button', { name: 'Practiceを開く' }).click();
  await expect(page.locator('.practice-view')).toBeVisible();

  await gotoProgress();
  await page.locator('.progress-overview').getByRole('button', { name: 'Quizを開く' }).click();
  await expect(page.locator('.quiz-view')).toBeVisible();

  await gotoProgress();
  await page.locator('.progress-overview').getByRole('button', { name: '学習分析を開く' }).click();
  await expect(page.getByRole('heading', { name: '模試結果を分析する' })).toBeVisible();
});

// --- Reload persistence (§12.20, §15) ---

test('reload preserves seeded progress', async ({ page }) => {
  await seed(page, {
    studyGuideProgress: { 'sg-agentic-loop': { revision: 2, status: 'completed', updatedAt: new Date(1_690_000_000_000).toISOString(), completedAt: new Date(1_690_000_000_000).toISOString() } },
    mockExamAttempts: [fullAttempt('a1', 1_690_000_000_000, 30)],
  });
  await page.getByRole('button', { name: '進捗' }).first().click();
  await expect(page.locator('.progress-overview').getByText('完了セクション 1 /')).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: '進捗' }).first().click();
  await expect(page.locator('.progress-overview').getByText('完了セクション 1 /')).toBeVisible();
  await expect(page.locator('.progress-overview').getByText('完了した模試 1')).toBeVisible();
});

// --- Responsive & desktop layout (§12.16–18) ---

for (const width of [375, 768]) {
  test(`Guide and Progress do not overflow at ${width}px`, { tag: '@slow' }, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await seed(page, { mockExamAttempts: [fullAttempt('a1', 1_690_000_000_000, 30)] });

    await openGuide(page);
    let d = await page.evaluate(() => ({ v: document.documentElement.clientWidth, doc: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
    expect(d.doc).toBe(d.v);
    expect(d.body).toBe(d.v);

    await page.getByRole('button', { name: '進捗' }).first().click();
    await expect(page.locator('.progress-overview')).toBeVisible();
    d = await page.evaluate(() => ({ v: document.documentElement.clientWidth, doc: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
    expect(d.doc).toBe(d.v);
    expect(d.body).toBe(d.v);
  });
}

test('desktop Guide orders usage → study cycle → sections', { tag: '@slow' }, async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openGuide(page);
  // The three top-level sections appear in the intended priority order.
  const order = await page.evaluate(() => {
    const y = (sel: string) => document.querySelector(sel)?.getBoundingClientRect().top ?? Infinity;
    return { service: y('.guide-context'), path: y('.guide-path'), sections: y('.guide-sections') };
  });
  expect(order.service).toBeLessThan(order.path);
  expect(order.path).toBeLessThan(order.sections);
});

// --- Accessibility (§12.19) ---

test('Guide and Progress have no axe violations', { tag: '@slow' }, async ({ page }) => {
  await seed(page, { mockExamAttempts: [fullAttempt('a1', 1_690_000_000_000, 30)] });
  await openGuide(page);
  await expectNoViolations(page);
  await page.getByRole('button', { name: '進捗' }).first().click();
  await expect(page.locator('.progress-overview')).toBeVisible();
  await expectNoViolations(page);
});
