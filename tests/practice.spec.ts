import { cards } from '../src/content/cards';
import { domains } from '../src/content/domains';
import { expectNoViolations } from './fixtures/accessibility';
import { expect, test } from './fixtures/app';
import { LEGACY_STORAGE_KEY, STORAGE_KEY } from './fixtures/storage';

test('refreshes due cards while a tab remains open', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-07-15T00:00:00.000Z') });
  await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({
    version: 1,
    reviews: {
      'd1-loop-stop': {
        cardId: 'd1-loop-stop',
        cardRevisionSeen: 1,
        dueAt: '2026-07-15T00:00:30.000Z',
        intervalDays: 0,
        streak: 0,
        lapses: 1,
        lastRating: 'again',
      },
    },
  })), LEGACY_STORAGE_KEY);
  await page.reload();
  await page.getByRole('button', { name: '練習' }).first().click();
  await expect(page.locator('.practice-card')).toHaveCount(cards.length - 1);

  await page.clock.runFor(60_000);
  await expect(page.locator('.practice-card')).toHaveCount(cards.length);
});

test('starts a due-card session with reset filters from the today view', async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept());

  // #given — practice view narrowed to one domain and a search query
  await page.getByRole('button', { name: '練習' }).first().click();
  await expect(page.locator('.practice-card')).toHaveCount(cards.length);
  await page.getByRole('searchbox', { name: 'カードを検索' }).fill('エージェント');
  const domainChip = page.getByRole('button', { name: 'D1', exact: true });
  await domainChip.click();
  await expect(domainChip).toHaveAttribute('aria-pressed', 'true');

  // #when — going back to today and starting review via the due CTA
  await page.getByRole('button', { name: '今日' }).first().click();
  await page.getByRole('button', { name: '復習を始める' }).click();

  // #then — a session starts directly over every due card
  await expect(page.locator('.session-card')).toBeVisible();
  await expect(page.locator('.session-progress code')).toHaveText(`1 / ${cards.length}`);

  // #then — stopping the session confirms saved progress and shows the reset filters
  await page.getByRole('button', { name: 'セッションを中断' }).click();
  await expect(page.getByText('セッションを中断しました。ここまでの評価は保存済みです。')).toBeFocused();
  await expect(page.locator('.practice-card')).toHaveCount(cards.length);
  await expect(domainChip).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('searchbox', { name: 'カードを検索' })).toHaveValue('');
});

test('runs a filtered session that re-queues an again-rated card before the summary', async ({ page }) => {
  // #given — the practice view filtered down to a single due card
  await page.goto('/en/');
  await page.getByRole('button', { name: 'Practice' }).first().click();
  await page.getByRole('searchbox', { name: 'Search cards' }).fill('iteration count');
  await expect(page.getByText('Showing 1 card')).toBeVisible();

  // #when — starting a session over the filtered set
  await page.getByRole('button', { name: 'Start a session' }).click();

  // #then — one card is shown with its progress and the answer stays hidden
  await expect(page.locator('.session-progress code')).toHaveText('1 / 1');
  await expect(page.getByText('0 cards left')).toBeVisible();
  await expect(page.locator('.session-card .answer')).toHaveCount(0);

  // #when — revealing and rating Again re-queues the card at the end of the session
  await page.getByRole('button', { name: 'Reveal answer' }).click();
  await expect(page.locator('.session-card .answer')).toBeVisible();
  await page.getByRole('button', { name: /Again/ }).click();
  await expect(page.locator('.session-progress code')).toHaveText('2 / 2');

  // #when — the re-queued card is rated Got it
  await page.getByRole('button', { name: 'Reveal answer' }).click();
  await page.getByRole('button', { name: /Got it/ }).click();

  // #then — the summary reports the breakdown and both ratings were persisted
  await expect(page.getByRole('heading', { name: 'Session complete' })).toBeVisible();
  const breakdown = page.locator('.session-breakdown div');
  await expect(breakdown.nth(0)).toContainText('Again');
  await expect(breakdown.nth(0)).toContainText('1');
  await expect(breakdown.nth(2)).toContainText('Got it');
  await expect(breakdown.nth(2)).toContainText('1');
  await expect(page.getByText('2 cards rated')).toBeVisible();
  const review = await page.evaluate((key) => Object.values(JSON.parse(localStorage.getItem(key) ?? '{}').reviews ?? {})[0], STORAGE_KEY) as { lastRating: string; lapses: number };
  expect(review.lastRating).toBe('good');
  expect(review.lapses).toBe(1);

  await expectNoViolations(page);

  // #then — the rated card left the due filter, so a new session cannot start
  await page.getByRole('button', { name: 'Back to the list' }).click();
  await expect(page.getByRole('button', { name: 'Start a session' })).toBeDisabled();
  await expect(page.getByText('No cards are shown, so a session cannot start.')).toBeVisible();
});

test('drives a session with keyboard shortcuts and confirms before stopping', async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept());

  // #given — a session over the D1 due cards
  const d1Total = cards.filter((card) => card.domainId === 'd1').length;
  await page.getByRole('button', { name: '練習' }).first().click();
  await page.getByRole('button', { name: 'D1', exact: true }).click();
  await page.getByRole('button', { name: 'セッションを開始' }).click();
  await expect(page.locator('.session-progress code')).toHaveText(`1 / ${d1Total}`);
  await expect(page.getByText('Space / Enter：答えを見る')).toBeVisible();

  // #when / #then — Space reveals, 3 rates Got it and advances with focus on the next reveal button.
  // Wait for the session to auto-focus the reveal button before the keyboard
  // press: Space acts on the focused control, and pressing it before that focus
  // lands is a pre-existing race that intermittently drops the reveal.
  await expect(page.getByRole('button', { name: '答えを見る' })).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.locator('.session-card .answer')).toBeVisible();
  await page.keyboard.press('3');
  await expect(page.locator('.session-progress code')).toHaveText(`2 / ${d1Total}`);
  await expect(page.getByRole('button', { name: '答えを見る' })).toBeFocused();

  // #when / #then — Enter reveals and 1 re-queues the card, growing the session total
  await page.keyboard.press('Enter');
  await expect(page.locator('.session-card .answer')).toBeVisible();
  await page.keyboard.press('1');
  await expect(page.locator('.session-progress code')).toHaveText(`3 / ${d1Total + 1}`);

  // #when / #then — Escape stops the session after the confirm and progress stays saved
  await page.keyboard.press('Escape');
  await expect(page.getByText('セッションを中断しました。ここまでの評価は保存済みです。')).toBeFocused();
  await expect.poll(() => page.evaluate((key) => Object.keys(JSON.parse(localStorage.getItem(key) ?? '{}').reviews ?? {}).length, STORAGE_KEY)).toBe(2);
});

test('leaving the practice view during a running session ends it without losing earlier ratings', async ({ page }) => {
  // #given — a session started over the due cards, with the first card already rated
  await page.getByRole('button', { name: '練習' }).first().click();
  await page.getByRole('button', { name: 'セッションを開始' }).click();
  await expect(page.locator('.session-card')).toBeVisible();
  await page.locator('.reveal-button').click();
  await page.getByRole('button', { name: /できた/ }).click();
  await expect.poll(() => page.evaluate((key) => Object.keys(JSON.parse(localStorage.getItem(key) ?? '{}').reviews ?? {}).length, STORAGE_KEY)).toBe(1);

  // #when — navigating to another view and back, instead of stopping the session explicitly
  await page.getByRole('button', { name: 'ガイド' }).first().click();
  await page.getByRole('button', { name: '練習' }).first().click();

  // #then — the session ended: the card list shows again and the earlier rating is still saved
  await expect(page.locator('.session-card')).toHaveCount(0);
  await expect(page.locator('.practice-card').first()).toBeVisible();
  expect(await page.evaluate((key) => Object.keys(JSON.parse(localStorage.getItem(key) ?? '{}').reviews ?? {}).length, STORAGE_KEY)).toBe(1);
});

test('reveals an answer, records a rating, and persists progress', async ({ page }) => {
  await page.getByRole('button', { name: '練習' }).first().click();
  const reveal = page.locator('.reveal-button').first();
  await expect(reveal).toHaveAttribute('aria-expanded', 'false');
  await reveal.press('Enter');
  await expect(reveal).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('ANSWER').first()).toBeVisible();

  await page.getByRole('button', { name: /できた/ }).first().press('Enter');
  await expect(page.getByText('できた：次の復習日を更新しました。')).toBeFocused();
  await expect.poll(() => page.evaluate((key) => Object.keys(JSON.parse(localStorage.getItem(key) ?? '{}').reviews ?? {}).length, STORAGE_KEY)).toBe(1);

  await page.goto('/en/');
  await page.getByRole('button', { name: 'Progress' }).first().click();
  const d1Total = cards.filter((card) => card.domainId === 'd1').length;
  await expect(page.getByText(`1/${d1Total}`).first()).toBeVisible();
});

test('surfaces a struggling card in the weak filter and navigates from the today weak areas', async ({ page }) => {
  // The flow rates the first card of the default due list, so the expected
  // domain chip is derived from content order instead of hardcoding D1.
  const firstDomain = domains.find((domain) => domain.id === cards[0].domainId)!;
  await expect(page.getByText('記録はまだありません。')).toBeVisible();

  await page.getByRole('button', { name: '練習' }).first().click();
  await page.locator('.reveal-button').first().click();
  await page.getByRole('button', { name: /もう一度/ }).first().click();

  const weakChip = page.getByRole('button', { name: '苦手', exact: true });
  await weakChip.click();
  await expect(weakChip).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.practice-card')).toHaveCount(1);

  await page.getByRole('button', { name: '今日' }).first().click();
  await expect(page.getByRole('heading', { name: '苦手エリア' })).toBeVisible();
  await expect(page.getByText('記録はまだありません。')).toHaveCount(0);
  const weakRow = page.locator('.weak-row');
  await expect(weakRow).toHaveCount(1);
  await expect(weakRow).toContainText('1枚');

  await weakRow.press('Enter');
  await expect(page.getByRole('heading', { name: '練習カード' })).toBeVisible();
  await expect(page.getByRole('button', { name: '苦手', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: `D${firstDomain.number}`, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.practice-card')).toHaveCount(1);
});
