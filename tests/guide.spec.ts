import { cards } from '../src/content/cards';
import { studyGuideSections } from '../src/content/study-guide';
import { expect, test } from './fixtures/app';
import { STORAGE_KEY } from './fixtures/storage';

// The first rendered section is the first authored one; its title is what the
// back link in Practice/Quiz must name.
const backToSection = `セクション「${studyGuideSections[0].title.ja}」に戻る`;

test('uses the keyboard diagnosis, saves only explicit guide progress, and opens exact related material', async ({ page }) => {
  await page.getByRole('button', { name: 'ガイド' }).first().click();
  await expect(page.getByRole('heading', { name: '学習ガイド', exact: true })).toBeVisible();

  for (const option of ['エージェントループと委譲の基礎から始めたい', 'ツール契約とMCPの境界を整理したい', 'エスカレーション・人のレビュー・出典追跡を整理したい']) {
    await page.getByLabel(option).press('Space');
    await page.getByRole('button', { name: '開始セクションを提案する' }).press('Enter');
    await expect(page.locator('.guide-recommendation')).toBeFocused();
  }
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{"studyGuideProgress":{}}').studyGuideProgress, STORAGE_KEY)).toEqual({});

  const first = page.locator('.guide-section').first();
  await first.locator('summary').press('Enter');
  await expect(first.locator('.domain-labels')).toContainText('D1');
  await expect(first.locator('.statement-ids')).toContainText('1.1');
  await expect(first.locator('.statement-ids')).toContainText('1.6');
  await expect(first.locator('.source-links a').first()).toHaveAttribute('href', /anthropic|everpath/);
  await first.getByRole('button', { name: 'このセクションを開始' }).press('Enter');
  await first.getByRole('button', { name: '完了として記録' }).press('Enter');
  await page.reload();
  await page.getByRole('button', { name: 'ガイド' }).first().click();
  await expect(page.locator('.guide-section').first().getByText('完了', { exact: true })).toBeVisible();

  await page.locator('.guide-section').first().locator('summary').press('Enter');
  const relatedCard = page.locator('.guide-section').first().locator('.target-list button').first();
  await relatedCard.click();
  await expect(page.locator('.practice-target p')).toBeFocused();
  // The way back names the section it came from, and survives dropping the
  // single-card filter: the excursion is over only when the learner leaves.
  const backToFirstSection = page.getByRole('button', { name: backToSection });
  await expect(backToFirstSection).toBeVisible();
  await page.getByRole('button', { name: 'カード一覧に戻る' }).click();
  await expect(page.getByRole('searchbox', { name: 'カードを検索' })).toBeFocused();
  await expect(page.locator('.practice-card')).toHaveCount(cards.length);
  await backToFirstSection.click();
  await expect(page.locator('.guide-section').first().locator('summary')).toBeFocused();
  await expect(page.locator('.guide-section').first()).toHaveAttribute('open', '');
  // A plain navigation carries no origin, so the way back does not linger.
  await page.getByRole('button', { name: '練習' }).first().click();
  await expect(page.locator('.practice-origin')).toHaveCount(0);

  await page.getByRole('button', { name: 'ガイド' }).first().click();
  await page.locator('.guide-section').first().locator('summary').press('Enter');
  const relatedQuestion = page.locator('.guide-section').first().locator('.target-list').nth(1).getByRole('button').first();
  await relatedQuestion.click();
  await expect(page.locator('.quiz-target')).toBeFocused();
  await expect(page.locator('.quiz-question')).toHaveCount(1);
  // Returning reopens the section, so the next jump starts from it directly.
  await page.getByRole('button', { name: backToSection }).click();
  await expect(page.locator('.guide-section').first().locator('summary')).toBeFocused();

  // Related scenario -> that practice case's background, heading focused.
  const relatedScenario = page.locator('.guide-section').first().locator('.target-list').nth(2).getByRole('button', { name: /sc-support-agents/ });
  await relatedScenario.click();
  await expect(page.getByRole('heading', { name: 'ECカスタマーサポートのエージェント構成選定' })).toBeFocused();
  await page.getByRole('button', { name: backToSection }).click();
  await expect(page.locator('.guide-section').first().locator('summary')).toBeFocused();
});

test('opens every related card of a cross-domain section at once, in guide order', async ({ page }) => {
  // #given a section whose related cards span more than one domain, so a
  // domain-filter-based shortcut could never show them all together
  const section = studyGuideSections.find((candidate) => {
    const domainIds = new Set(candidate.relatedCardIds.map((id) => cards.find((card) => card.id === id)?.domainId));
    return domainIds.size > 1;
  });
  if (!section) throw new Error('content no longer has a section with cross-domain related cards; pick another section for this test');
  await page.getByRole('button', { name: 'ガイド' }).first().click();
  const details = page.locator(`#guide-section-${section.id}`);
  await details.locator('summary').click();

  // #when the bulk open-all button is pressed
  await details.locator('.guide-related-open-all').click();

  // #then Practice shows exactly the section's cards, in the section's order,
  // including cards from different domains
  await expect(page.locator('.practice-target p')).toBeFocused();
  await expect(page.locator('.practice-card')).toHaveCount(section.relatedCardIds.length);
  const prompts = page.locator('.practice-card .card-prompt h3');
  for (const [index, cardId] of section.relatedCardIds.entries()) {
    const card = cards.find((candidate) => candidate.id === cardId)!;
    await expect(prompts.nth(index)).toHaveText(card.prompt.ja);
  }
  const badgeTexts = await page.locator('.practice-card .badge').allInnerTexts();
  expect(new Set(badgeTexts).size).toBeGreaterThan(1);

  // #then the way back names the originating section
  const backToOrigin = page.getByRole('button', { name: `セクション「${section.title.ja}」に戻る` });
  await expect(backToOrigin).toBeVisible();

  // #then the escape hatch drops only the card narrowing — the origin survives
  await page.getByRole('button', { name: 'カード一覧に戻る' }).click();
  await expect(page.locator('.practice-card')).toHaveCount(cards.length);
  await expect(backToOrigin).toBeVisible();

  // #then returning reopens the section and focuses its summary
  await backToOrigin.click();
  const returned = page.locator(`#guide-section-${section.id}`);
  await expect(returned.locator('summary')).toBeFocused();
  await expect(returned).toHaveAttribute('open', '');
});

test('drops a synchronous duplicate guide action before it can write twice', async ({ page }) => {
  await page.addInitScript((studyKey) => {
    const original = Storage.prototype.setItem;
    const state = window as Window & { guideWrites?: number };
    state.guideWrites = 0;
    Storage.prototype.setItem = function (key, value) {
      if (key === studyKey) state.guideWrites = (state.guideWrites ?? 0) + 1;
      return original.call(this, key, value);
    };
  }, STORAGE_KEY);
  await page.goto('/');
  await page.getByRole('button', { name: 'ガイド' }).first().click();
  const first = page.locator('.guide-section').first();
  await first.locator('summary').press('Enter');
  await page.evaluate(() => {
    const action = document.querySelector('.guide-section .guide-actions button') as HTMLButtonElement;
    action.click(); action.click();
  });
  await expect(first).toContainText('進行中');
  expect(await page.evaluate(() => (window as Window & { guideWrites?: number }).guideWrites)).toBe(1);
});

// @slow — it spends the real dismissal window twice (once waiting for a
// confirmation to go, once proving a failure stays), which is the only honest
// way to test a wall-clock timeout.
test('dismisses a confirmation notice by itself and on navigation, and keeps a failure notice', { tag: '@slow' }, async ({ page }) => {
  const notice = page.locator('.notice');
  await page.getByRole('button', { name: 'ガイド' }).first().click();
  const first = page.locator('.guide-section').first();
  await first.locator('summary').press('Enter');

  await first.getByRole('button', { name: 'このセクションを開始' }).click();
  await expect(notice).toHaveText('セクションを開始として記録しました。');
  await expect(notice).toHaveText('', { timeout: 15_000 });

  // A notice describes the view it was raised on, so leaving that view clears it
  // without waiting for the timer.
  await first.getByRole('button', { name: '完了として記録' }).click();
  await expect(notice).toHaveText('セクションを完了として記録しました。');
  await page.getByRole('button', { name: '練習' }).first().click();
  await expect(notice).toHaveText('');

  // A failure the learner has to act on must not vanish while they read it.
  await page.addInitScript((studyKey) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === studyKey) throw new DOMException('blocked', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  }, STORAGE_KEY);
  await page.reload();
  await page.getByRole('button', { name: 'ガイド' }).first().click();
  const second = page.locator('.guide-section').nth(1);
  await second.locator('summary').press('Enter');
  await second.getByRole('button', { name: 'このセクションを開始' }).click();
  const failure = '進捗を保存できませんでした。ブラウザのサイトデータ設定または空き容量を確認してください。';
  await expect(notice).toHaveText(failure);
  await page.waitForTimeout(12_000);
  await expect(notice).toHaveText(failure);
});
