import { openHandsOnList, openOfficialScenarios } from '../fixtures/app';
import { seedStorage, STORAGE_KEY } from '../fixtures/storage';
import { expect, test } from './fixtures/production';

const CANONICAL_JA = 'https://cca.toshi0607.com/';
const CANONICAL_EN = 'https://cca.toshi0607.com/en/';

// #given — the two localized landing routes and their reciprocal metadata
const shellRoutes = [
  { path: '/', lang: 'ja', title: 'CCA Field Notes — 非公式学習ガイド', heading: /思い出してから/, canonical: CANONICAL_JA },
  { path: '/en/', lang: 'en', title: 'CCA Field Notes — Unofficial Study Guide', heading: /Recall first/, canonical: CANONICAL_EN },
];

for (const route of shellRoutes) {
  test(`${route.path} shell renders with healthy console and canonical metadata`, async ({ page, collectors }) => {
    // #when — loading the live route
    await page.goto(route.path);

    // #then — meaningful content and locale-correct document head
    await expect(page.getByRole('heading', { name: route.heading })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', route.lang);
    await expect(page).toHaveTitle(route.title);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', route.canonical);

    // #then — reciprocal hreflang trio and an absolute-host OG image + favicon
    await expect(page.locator('link[rel="alternate"][hreflang="ja"]')).toHaveAttribute('href', CANONICAL_JA);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute('href', CANONICAL_EN);
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute('href', CANONICAL_JA);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /^https:\/\/cca\.toshi0607\.com\//);
    await expect(page.locator('link[rel="icon"]').first()).toHaveAttribute('href', '/favicon.svg');

    // #then — the App island has hydrated (nav becomes interactive once ready),
    // so any late console error or failed hydration chunk is captured before we
    // assert on the health collectors.
    await expect(page.getByRole('button', { name: route.lang === 'ja' ? 'ガイド' : 'Guide' }).first()).toBeEnabled();
    expect(collectors.pageErrors, 'page errors').toEqual([]);
    expect(collectors.consoleErrors, 'console errors').toEqual([]);
    expect(collectors.failedAssetRequests, 'failed same-origin asset requests').toEqual([]);
  });
}

// A small schema-valid v3 document: one learned review (so views have content)
// and one completed mock-exam attempt (so Today surfaces the learning-analysis
// link). Arbitrary ids are fine — storage validates structure, not existence.
function learnedSeed() {
  return {
    version: 3,
    reviews: { 'd1-loop-stop': { cardId: 'd1-loop-stop', cardRevisionSeen: 1, dueAt: '2027-01-01T00:00:00.000Z', intervalDays: 3, streak: 1, lapses: 0, lastRating: 'good' } },
    quizStats: {},
    studyGuideProgress: {},
    handsOnProgress: {},
    activeMockExam: null,
    mockExamAttempts: [{
      id: 'attempt-smoke', blueprintVersion: 1, outcome: 'submitted',
      questionRefs: [{ questionId: 'q-a', revision: 1 }],
      answers: [{ questionId: 'q-a', questionRevision: 1, selectedChoiceIds: ['a'], correct: true, answeredAt: '2026-07-19T00:05:00.000Z' }],
      flaggedQuestionIds: [], startedAt: '2026-07-19T00:00:00.000Z', expiresAt: '2026-07-19T02:00:00.000Z', completedAt: '2026-07-19T01:00:00.000Z',
    }],
  };
}

test('opens every primary lazy view without console or chunk errors', async ({ page, collectors }) => {
  await page.goto('/');
  await seedStorage(page, STORAGE_KEY, learnedSeed());
  await page.reload();

  // #then — each lazily-loaded chunk resolves and its view root/heading appears.
  // Guide
  await page.getByRole('button', { name: 'ガイド' }).first().click();
  await expect(page.locator('.guide-view')).toBeVisible();
  await expect(page.getByRole('heading', { name: '学習ガイド', exact: true })).toBeVisible();

  // Hands-on and Official scenarios are Guide sub-views (their fixtures assert
  // the focused heading, which only appears once the chunk mounts).
  await openHandsOnList(page);
  await openOfficialScenarios(page);

  // Practice
  await page.getByRole('button', { name: '練習' }).first().click();
  await expect(page.locator('.practice-view')).toBeVisible();

  // Quiz (JA nav label is 演習)
  await page.getByRole('button', { name: '演習' }).first().click();
  await expect(page.locator('.quiz-view')).toBeVisible();

  // Mock Exam landing — launched from Today, not the bottom nav
  await page.getByRole('button', { name: '今日' }).first().click();
  await page.locator('.mock-exam-launch-button').click();
  await expect(page.getByRole('heading', { name: '60問の模試に挑戦する' })).toBeVisible();

  // Learning analysis — reachable from Today because the seed carries an attempt
  await page.getByRole('button', { name: '今日' }).first().click();
  await page.locator('.mock-exam-launch-analysis').click();
  await expect(page.getByRole('heading', { name: '模試結果を分析する' })).toBeVisible();

  // Progress
  await page.getByRole('button', { name: '進捗' }).first().click();
  await expect(page.locator('.progress-view')).toBeVisible();

  expect(collectors.pageErrors, 'page errors').toEqual([]);
  expect(collectors.consoleErrors, 'console errors').toEqual([]);
  expect(collectors.failedAssetRequests, 'failed same-origin asset requests').toEqual([]);
});
