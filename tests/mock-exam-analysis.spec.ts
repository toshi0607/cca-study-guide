import type { Page } from '@playwright/test';
import { questions } from '../src/content/questions';
import { expectNoViolations } from './fixtures/accessibility';
import { expect, test } from './fixtures/app';
import { readStudyData, seedStorage, STORAGE_KEY } from './fixtures/storage';

// Task 9 learning-analysis E2E. Everything is driven from seeded storage (no
// 120-minute exam is ever run), and the heavy axe pass is tagged @slow so the
// fast suite stays fast — matching the existing mock-exam.spec split.

const BASE = 1_690_000_000_000; // fixed past epoch, independent of the machine clock
const DAY = 86_400_000;

function emptyV3() {
  return { version: 3, reviews: {}, quizStats: {}, studyGuideProgress: {}, handsOnProgress: {}, activeMockExam: null, mockExamAttempts: [] as unknown[] };
}

// A full 60-question attempt over the real production bank, so its domain,
// difficulty, and skill mix is realistic. `correct` and `answered` are decided
// per question by the caller; `staleIds` marks questions whose stored revision is
// bumped to 999 (a mismatch against the current bank, i.e. stale).
function fullAttempt(id: string, startMs: number, opts: {
  correct: (question: (typeof questions)[number], index: number) => boolean;
  answered?: (question: (typeof questions)[number], index: number) => boolean;
  staleIds?: ReadonlySet<string>;
}) {
  const stale = opts.staleIds ?? new Set<string>();
  const answeredFn = opts.answered ?? (() => true);
  const questionRefs = questions.map((question) => ({ questionId: question.id, revision: stale.has(question.id) ? 999 : question.revision }));
  const answers = questions.map((question, index) => {
    const isAnswered = answeredFn(question, index);
    const revision = stale.has(question.id) ? 999 : question.revision;
    const base = {
      questionId: question.id,
      questionRevision: revision,
      selectedChoiceIds: isAnswered ? [question.choices[0].id] : [],
      correct: isAnswered ? opts.correct(question, index) : false,
    };
    return isAnswered ? { ...base, answeredAt: new Date(startMs + 5 * 60_000).toISOString() } : base;
  });
  return {
    id,
    blueprintVersion: 1,
    outcome: 'submitted' as const,
    questionRefs,
    answers,
    flaggedQuestionIds: [] as string[],
    startedAt: new Date(startMs).toISOString(),
    expiresAt: new Date(startMs + 7_200_000).toISOString(),
    completedAt: new Date(startMs + 30 * 60_000).toISOString(),
  };
}

async function seedAttempts(page: Page, attempts: unknown[]): Promise<void> {
  await seedStorage(page, STORAGE_KEY, { ...emptyV3(), mockExamAttempts: attempts });
  await page.reload();
}

async function openAnalysis(page: Page, openLabel = '学習分析'): Promise<void> {
  await page.locator('.mock-exam-launch-actions .btn:not(.btn--secondary)').click();
  await page.getByRole('button', { name: openLabel }).click();
}

test('shows an empty state when there are no attempts', async ({ page }) => {
  await openAnalysis(page);
  await expect(page.getByRole('heading', { name: '模試結果を分析する' })).toBeFocused();
  await expect(page.getByText('まだ分析できる模試結果がありません')).toBeVisible();
});

test('reports insufficient data for a single attempt', async ({ page }) => {
  await seedAttempts(page, [fullAttempt('a1', BASE, { correct: (_q, i) => i % 2 === 0 })]);
  await openAnalysis(page);
  await expect(page.locator('.mock-exam-stability').getByText('データ不足')).toBeVisible();
});

test('renders the axis breakdowns and stability for three attempts', async ({ page }) => {
  const attempts = [0, 1, 2].map((n) => fullAttempt(`a${n}`, BASE + n * DAY, { correct: (_q, i) => i % 3 !== 0 }));
  await seedAttempts(page, attempts);
  await openAnalysis(page);

  await expect(page.getByRole('heading', { name: 'ドメイン別' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '難易度別' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'スキル別' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '学習結果の安定状況' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '模試の推移' })).toBeVisible();
  // Trend shows every completed attempt.
  await expect(page.locator('.mock-exam-trend-table tbody tr')).toHaveCount(3);
});

test('toggles between all-time and recent-3', async ({ page }) => {
  const attempts = [0, 1, 2, 3].map((n) => fullAttempt(`a${n}`, BASE + n * DAY, { correct: (_q, i) => i % 2 === 0 }));
  await seedAttempts(page, attempts);
  await openAnalysis(page);

  const allTime = page.getByRole('button', { name: '全期間' });
  const recent = page.getByRole('button', { name: '直近3回' });
  await expect(allTime).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('対象 4 / 全 4')).toBeVisible();

  await recent.click();
  await expect(recent).toHaveAttribute('aria-pressed', 'true');
  await expect(allTime).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('対象 3 / 全 4')).toBeVisible();
});

test('excludes stale answers from the axis analysis but keeps them in the count', async ({ page }) => {
  // One attempt: 10 questions marked stale (revision 999) — excluded from axes.
  const staleIds = new Set(questions.slice(0, 10).map((question) => question.id));
  await seedAttempts(page, [fullAttempt('a1', BASE, { correct: () => true, staleIds })]);
  await openAnalysis(page);

  await expect(page.getByText('内容更新のため分析から除外した回答：10')).toBeVisible();
  await expect(page.getByText('現在の問題と対応する回答：50')).toBeVisible();
  // The stale-content disclaimer is present (no re-grading against current questions).
  await expect(page.getByText('現在の問題で再採点せず')).toBeVisible();
});

test('offers next actions and navigates to practice for a domain review', async ({ page }) => {
  // Three attempts, d1 always wrong and every other domain right: d1 becomes the
  // clear, sufficient-evidence domain review candidate.
  const attempts = [0, 1, 2].map((n) => fullAttempt(`a${n}`, BASE + n * DAY, { correct: (question) => question.domainId !== 'd1' }));
  await seedAttempts(page, attempts);
  await openAnalysis(page);

  await expect(page.getByRole('heading', { name: '次の学習アクション' })).toBeVisible();
  await page.locator('.mock-exam-next-action').first().getByRole('button', { name: '練習を開く' }).click();
  await expect(page.locator('.practice-view')).toBeVisible();
});

test('derives the same analysis from storage after a reload', async ({ page }) => {
  const staleIds = new Set(questions.slice(0, 4).map((question) => question.id));
  await seedAttempts(page, [fullAttempt('a1', BASE, { correct: () => true, staleIds })]);
  await openAnalysis(page);
  await expect(page.getByText('現在の問題と対応する回答：56')).toBeVisible();

  await page.reload();
  await openAnalysis(page);
  await expect(page.getByText('現在の問題と対応する回答：56')).toBeVisible();
});

test('renders in English', async ({ page }) => {
  await page.goto('/en/');
  const attempts = [0, 1, 2].map((n) => fullAttempt(`a${n}`, BASE + n * DAY, { correct: (_q, i) => i % 3 !== 0 }));
  await seedStorage(page, STORAGE_KEY, { ...emptyV3(), mockExamAttempts: attempts });
  await page.reload();
  await page.locator('.mock-exam-launch-actions .btn:not(.btn--secondary)').click();
  await page.getByRole('button', { name: 'Learning analysis' }).click();

  await expect(page.getByRole('heading', { name: 'Analyze your mock exam results' })).toBeFocused();
  await expect(page.getByRole('heading', { name: 'By domain' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Last 3' })).toBeVisible();
});

test('works on a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const attempts = [0, 1, 2].map((n) => fullAttempt(`a${n}`, BASE + n * DAY, { correct: (_q, i) => i % 3 !== 0 }));
  await seedAttempts(page, attempts);
  await openAnalysis(page);
  await expect(page.getByRole('heading', { name: 'ドメイン別' })).toBeVisible();
  // The table lives in a horizontally scrollable container, so columns are kept.
  await expect(page.locator('.mock-exam-table-scroll').first()).toBeVisible();
});

test('has no accessibility violations on the analysis view', { tag: '@slow' }, async ({ page }) => {
  const attempts = [0, 1, 2].map((n) => fullAttempt(`a${n}`, BASE + n * DAY, { correct: (question, i) => question.domainId !== 'd1' && i % 3 !== 0 }));
  await seedAttempts(page, attempts);
  await openAnalysis(page);
  await expect(page.getByRole('heading', { name: '模試結果を分析する' })).toBeVisible();
  await expectNoViolations(page);
});
