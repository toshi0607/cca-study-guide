import { expect, test } from './fixtures/production';

// One short English journey at a 360x800 phone viewport. Every screen must stay
// within the viewport horizontally and keep its primary CTA and the bottom nav
// operable; the mock-exam palette must open and reach question 60.
test('English mobile journey stays within the viewport with operable navigation', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/en/');

  // Scoped to the bottom nav: a role query by name is a case-insensitive
  // substring match, and the exam draws its 60 questions in a shuffled order,
  // so an unscoped `Progress` can land on a choice such as "monitor overall
  // progress in one place" whenever that question is the one on screen.
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  const openView = (name: string) => nav.getByRole('button', { name, exact: true }).click();

  const assertNoOverflow = async (label: string) => {
    const dims = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
    }));
    expect(dims.documentWidth, `${label}: document horizontal overflow`).toBeLessThanOrEqual(dims.viewport);
    expect(dims.bodyWidth, `${label}: body horizontal overflow`).toBeLessThanOrEqual(dims.viewport);
  };

  // Today
  await expect(page.getByRole('heading', { name: /Recall first/ })).toBeVisible();
  await expect(page.locator('.mock-exam-launch-button')).toBeVisible();
  await assertNoOverflow('today');

  // Practice
  await openView('Practice');
  await expect(page.locator('.practice-view')).toBeVisible();
  await assertNoOverflow('practice');

  // Quiz setup
  await openView('Quiz');
  await expect(page.locator('.quiz-view')).toBeVisible();
  await assertNoOverflow('quiz');

  // Mock exam landing (launched from Today)
  await openView('Today');
  await page.locator('.mock-exam-launch-button').click();
  await expect(page.getByRole('heading', { name: 'Take the 60-question mock exam' })).toBeVisible();
  await assertNoOverflow('mock-exam-landing');

  // Mock exam question 1
  await page.getByRole('button', { name: 'Start the mock exam' }).click();
  await expect(page.locator('.mock-exam-progress')).toHaveText('1 / 60');
  await assertNoOverflow('mock-exam-question');

  // Palette opens, the 60-cell grid is reachable, and question 60 navigates
  await page.getByRole('button', { name: 'Open question list' }).click();
  await expect(page.getByRole('heading', { name: 'Questions' })).toBeVisible();
  await assertNoOverflow('mock-exam-palette');
  await page.getByRole('button', { name: /^Question 60 / }).click();
  await expect(page.locator('.mock-exam-progress')).toHaveText('60 / 60');
  await assertNoOverflow('mock-exam-question-60');

  // Progress (bottom nav still operable after the exam flow)
  await openView('Progress');
  await expect(page.locator('.progress-view')).toBeVisible();
  await assertNoOverflow('progress');
});
