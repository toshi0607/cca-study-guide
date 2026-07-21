import { readFile, writeFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { cards } from '../src/content/cards';
import { domains } from '../src/content/domains';
import { questions } from '../src/content/questions';
import { scenarios } from '../src/content/scenarios';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

for (const route of [
  { path: '/', heading: /思い出してから/, navigation: 'メインナビゲーション', today: '今日', blueprint: '5領域の設計図' },
  { path: '/en/', heading: /Recall first/, navigation: 'Main navigation', today: 'Today', blueprint: 'Map of the five domains' },
]) {
  test(`${route.path} prerenders meaningful landing content without JavaScript`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(route.path);

    await expect(page.getByRole('heading', { name: route.heading })).toBeVisible();
    await expect(page.getByRole('navigation', { name: route.navigation }).first()).toContainText(route.today);
    await expect(page.getByText(route.blueprint)).toBeVisible();
    await expect(page.locator('button:not([disabled])')).toHaveCount(0);

    await context.close();
  });
}

test('refreshes due cards while a tab remains open', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-07-15T00:00:00.000Z') });
  await page.evaluate(() => localStorage.setItem('cca-field-notes:v1', JSON.stringify({
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
  })));
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
  const review = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('cca-field-notes:v1') ?? '{}').reviews ?? {})[0]) as { lastRating: string; lapses: number };
  expect(review.lastRating).toBe('good');
  expect(review.lapses).toBe(1);

  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(axe.violations).toEqual([]);

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

  // #when / #then — Space reveals, 3 rates Got it and advances with focus on the next reveal button
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
  await expect.poll(() => page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('cca-field-notes:v1') ?? '{}').reviews ?? {}).length)).toBe(2);
});

test('leaving the practice view during a running session ends it without losing earlier ratings', async ({ page }) => {
  // #given — a session started over the due cards, with the first card already rated
  await page.getByRole('button', { name: '練習' }).first().click();
  await page.getByRole('button', { name: 'セッションを開始' }).click();
  await expect(page.locator('.session-card')).toBeVisible();
  await page.locator('.reveal-button').click();
  await page.getByRole('button', { name: /できた/ }).click();
  await expect.poll(() => page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('cca-field-notes:v1') ?? '{}').reviews ?? {}).length)).toBe(1);

  // #when — navigating to another view and back, instead of stopping the session explicitly
  await page.getByRole('button', { name: 'ガイド' }).first().click();
  await page.getByRole('button', { name: '練習' }).first().click();

  // #then — the session ended: the card list shows again and the earlier rating is still saved
  await expect(page.locator('.session-card')).toHaveCount(0);
  await expect(page.locator('.practice-card').first()).toBeVisible();
  expect(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('cca-field-notes:v1') ?? '{}').reviews ?? {}).length)).toBe(1);
});

test('keeps a session card in place and announces the failure when saving its rating fails', async ({ page }) => {
  // #given — localStorage.setItem throws for the study-data key, simulating a full or blocked store
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'cca-field-notes:v1') throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.goto('/');

  // #when — starting a session and rating its first card
  await page.getByRole('button', { name: '練習' }).first().click();
  await page.getByRole('button', { name: 'セッションを開始' }).click();
  await expect(page.locator('.session-progress code')).toHaveText(/^1 \//);
  await page.locator('.reveal-button').click();
  await page.getByRole('button', { name: /できた/ }).click();

  // #then — the failure is announced and focused, and the card stays in place, still revealed
  await expect(page.getByText('進捗を保存できませんでした。ブラウザのサイトデータ設定または空き容量を確認してください。')).toBeFocused();
  await expect(page.locator('.session-progress code')).toHaveText(/^1 \//);
  await expect(page.locator('.session-card .answer')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('cca-field-notes:v1'))).toBeNull();
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
  await expect.poll(() => page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('cca-field-notes:v1') ?? '{}').reviews ?? {}).length)).toBe(1);

  await page.goto('/en/');
  await page.getByRole('button', { name: 'Progress' }).first().click();
  const d1Total = cards.filter((card) => card.domainId === 'd1').length;
  await expect(page.getByText(`1/${d1Total}`).first()).toBeVisible();
});

test('runs a domain-scoped quiz round with immediate feedback, a summary, and persisted stats', async ({ page }) => {
  await page.getByRole('button', { name: '演習' }).first().click();
  await expect(page.getByRole('heading', { name: '選択式演習' })).toBeVisible();

  await page.getByRole('button', { name: '10問' }).click();
  await page.getByRole('button', { name: 'D2', exact: true }).click();
  await page.getByRole('button', { name: '演習を始める' }).click();

  const total = Number(await page.locator('.quiz-question > header code').innerText().then((text) => /全(\d+)問/.exec(text)?.[1]));
  expect(total).toBeGreaterThanOrEqual(3);

  for (let answered = 1; answered <= total; answered += 1) {
    await expect(page.locator('.quiz-question > header code')).toHaveText(`第${answered}問 / 全${total}問`);

    const isMultiple = await page.getByText('複数選択：当てはまる選択肢をすべて選び、「回答する」を押してください。').isVisible();
    if (isMultiple) {
      const submit = page.getByRole('button', { name: '回答する' });
      await expect(submit).toBeDisabled();
      await page.locator('.choice-button').nth(0).click();
      await page.locator('.choice-button').nth(1).click();
      await submit.click();
    } else {
      await page.locator('.choice-button').first().press('Enter');
    }

    const feedback = page.locator('.quiz-feedback');
    await expect(feedback).toBeVisible();
    await expect(feedback).toBeFocused();
    await expect(feedback.locator('.quiz-verdict')).toHaveText(/^(正解！|不正解)$/);
    await expect(feedback.getByText('正解：')).toBeVisible();
    await expect(feedback.locator('.source-links a').first()).toBeVisible();
    await expect(page.locator('.choice-button.correct').first()).toBeVisible();

    await page.getByRole('button', { name: answered === total ? '結果を見る' : '次の問題へ' }).click();
  }

  await expect(page.getByRole('heading', { name: '演習結果' })).toBeVisible();
  await expect(page.getByText('正答率')).toBeVisible();
  await expect(page.locator('.quiz-domains .progress-row')).toHaveCount(1);
  await expect(page.locator('.quiz-domains')).toContainText('D2');

  const stats = await page.evaluate(() => JSON.parse(localStorage.getItem('cca-field-notes:v1') ?? '{}').quizStats ?? {});
  expect(Object.keys(stats).length).toBe(total);
  for (const stat of Object.values(stats) as { attempts: number }[]) expect(stat.attempts).toBe(1);

  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(axe.violations).toEqual([]);
});

test('runs a scenario practice round with a reviewable case background and persisted stats', async ({ page }) => {
  // The closing axe scan alone takes ~17-20s, close to the default 30s timeout under parallel workers.
  test.slow();

  const scenario = scenarios[0];
  const scenarioQuestions = questions.filter((question) => question.scenarioId === scenario.id);

  // #given — the scenario list shows the case with its question count and answered status
  await page.getByRole('button', { name: '演習' }).first().click();
  await page.getByRole('button', { name: 'シナリオ演習' }).click();
  const item = page.locator('.scenario-item').first();
  await expect(item).toContainText(scenario.title.ja);
  await expect(item).toContainText(`設問${scenarioQuestions.length}問`);
  await expect(item).toContainText(`解答済み 0/${scenarioQuestions.length}`);

  // #when — opening the scenario shows the full case background before the questions
  await item.click();
  await expect(page.getByRole('heading', { name: scenario.title.ja })).toBeVisible();
  for (const paragraph of scenario.background.ja) await expect(page.getByText(paragraph)).toBeVisible();
  await page.getByRole('button', { name: '設問へ進む' }).click();

  // #then — every question is answerable with the case description reachable throughout
  for (let answered = 1; answered <= scenarioQuestions.length; answered += 1) {
    await expect(page.locator('.quiz-question > header code')).toHaveText(`第${answered}問 / 全${scenarioQuestions.length}問`);

    const context = page.locator('.scenario-context');
    await expect(context.locator('summary')).toHaveText('ケース記述を開く');
    if (answered === 1) {
      await context.locator('summary').click();
      await expect(context.getByText(scenario.background.ja[0])).toBeVisible();
    }

    const isMultiple = await page.getByText('複数選択：当てはまる選択肢をすべて選び、「回答する」を押してください。').isVisible();
    if (isMultiple) {
      await page.locator('.choice-button').nth(0).click();
      await page.locator('.choice-button').nth(1).click();
      await page.getByRole('button', { name: '回答する' }).click();
    } else {
      await page.locator('.choice-button').first().press('Enter');
    }

    await expect(page.locator('.quiz-feedback')).toBeVisible();
    await page.getByRole('button', { name: answered === scenarioQuestions.length ? '結果を見る' : '次の問題へ' }).click();
  }

  await expect(page.getByRole('heading', { name: '演習結果' })).toBeVisible();
  const stats = await page.evaluate(() => JSON.parse(localStorage.getItem('cca-field-notes:v1') ?? '{}').quizStats ?? {});
  expect(Object.keys(stats).sort()).toEqual(scenarioQuestions.map((question) => question.id).sort());

  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(axe.violations).toEqual([]);

  // #then — the scenario list reflects the recorded answers
  await page.getByRole('button', { name: 'もう一度演習する' }).click();
  await expect(page.locator('.scenario-item').first()).toContainText(`解答済み ${scenarioQuestions.length}/${scenarioQuestions.length}`);
});

test('restores exported progress through the JSON import after a reset', async ({ page }, testInfo) => {
  // #given — one rated card, exported as JSON and then wiped by a reset
  await page.getByRole('button', { name: '練習' }).first().click();
  await page.locator('.reveal-button').first().click();
  await page.getByRole('button', { name: /できた/ }).first().click();
  await expect.poll(() => page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('cca-field-notes:v1') ?? '{}').reviews ?? {}).length)).toBe(1);

  await page.getByRole('button', { name: '進捗' }).first().click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '進捗をJSONで書き出す' }).click();
  const exportPath = testInfo.outputPath('progress-export.json');
  await (await downloadPromise).saveAs(exportPath);

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'この端末の進捗を削除' }).click();
  await expect(page.getByText('この端末の進捗を削除しました。')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('cca-field-notes:v1'))).toBeNull();

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
  await expect.poll(() => page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('cca-field-notes:v1') ?? '{}').reviews ?? {}).length)).toBe(1);
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
  expect(await page.evaluate(() => localStorage.getItem('cca-field-notes:v1'))).toBeNull();
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

test('switches between complete localized routes and searches active-locale content', async ({ page }) => {
  await page.goto('/en/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: 'Recall first. Then reveal.' })).toBeVisible();
  await expect(page.locator('.rail .language-switcher a[lang="en"]')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.rail .language-switcher a[lang="ja"]')).toHaveAttribute('href', '/');

  await page.getByRole('button', { name: 'Practice' }).first().click();
  await expect(page.getByRole('heading', { name: 'Practice cards' })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search cards' }).fill('iteration count');
  await expect(page.getByText('Showing 1 card')).toBeVisible();
  await expect(page.locator('.practice-card')).toHaveCount(1);
  await expect(page.locator('.practice-card')).toContainText('agentic loop');

  await page.locator('.rail .language-switcher a[lang="ja"]').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await expect(page.getByRole('heading', { name: '思い出してから、 答えを開く。' })).toBeVisible();
});

for (const route of [
  { name: 'Japanese app', path: '/' },
  { name: 'English app', path: '/en/' },
  { name: 'Japanese privacy page', path: '/privacy/' },
  { name: 'English privacy page', path: '/en/privacy/' },
]) {
  test(`${route.name} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(route.path);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
  });
}

test('publishes canonical social metadata and public icon assets', async ({ page }) => {
  const assetsManifest = JSON.parse(await readFile('public/assets-manifest.json', 'utf8')) as { ogp: { file: string } };
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://cca.toshi0607.com/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', `https://cca.toshi0607.com/${assetsManifest.ogp.file}`);
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200');
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', '630');
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');

  for (const asset of [`/${assetsManifest.ogp.file}`, '/ogp.png', '/favicon.svg', '/favicon.ico', '/apple-touch-icon.png']) {
    const response = await page.request.get(asset);
    expect(response.ok(), asset).toBe(true);
  }
});

for (const route of [
  { path: '/', lang: 'ja', canonical: 'https://cca.toshi0607.com/', japanese: 'https://cca.toshi0607.com/', english: 'https://cca.toshi0607.com/en/', title: 'CCA Field Notes — 非公式学習ガイド', ogLocale: 'ja_JP' },
  { path: '/en/', lang: 'en', canonical: 'https://cca.toshi0607.com/en/', japanese: 'https://cca.toshi0607.com/', english: 'https://cca.toshi0607.com/en/', title: 'CCA Field Notes — Unofficial Study Guide', ogLocale: 'en_US' },
  { path: '/privacy/', lang: 'ja', canonical: 'https://cca.toshi0607.com/privacy/', japanese: 'https://cca.toshi0607.com/privacy/', english: 'https://cca.toshi0607.com/en/privacy/', title: 'プライバシー — CCA Field Notes', ogLocale: 'ja_JP' },
  { path: '/en/privacy/', lang: 'en', canonical: 'https://cca.toshi0607.com/en/privacy/', japanese: 'https://cca.toshi0607.com/privacy/', english: 'https://cca.toshi0607.com/en/privacy/', title: 'Privacy — CCA Field Notes', ogLocale: 'en_US' },
]) {
  test(`${route.path} publishes locale-correct document metadata`, async ({ page }) => {
    await page.goto(route.path);
    await expect(page.locator('html')).toHaveAttribute('lang', route.lang);
    await expect(page).toHaveTitle(route.title);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', route.canonical);
    await expect(page.locator('link[rel="alternate"][hreflang="ja"]')).toHaveAttribute('href', route.japanese);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute('href', route.english);
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute('href', route.japanese);
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', route.ogLocale);
    await expect(page.locator('meta[property="og:locale:alternate"]')).toHaveCount(1);
  });
}

test('loads privacy-restricted analytics immediately and links to its disclosure', async ({ page, context }) => {
  await page.close();
  const analyticsPage = await context.newPage();
  const googleRequests: string[] = [];
  analyticsPage.on('request', (request) => {
    if (request.url().includes('googletagmanager.com') || request.url().includes('google-analytics.com')) googleRequests.push(request.url());
  });
  await analyticsPage.route('**://www.googletagmanager.com/**', (route) => route.abort());
  await analyticsPage.goto('/');
  await expect.poll(() => googleRequests.length).toBe(1);
  expect(googleRequests[0]).toContain('googletagmanager.com/gtag/js?id=G-TEST123456');
  await expect(analyticsPage.locator('#analytics-consent')).toHaveCount(0);
  await expect(analyticsPage.getByRole('button', { name: 'アクセス解析の設定' })).toHaveCount(0);

  const analyticsState = await analyticsPage.evaluate(() => ({
    consent: localStorage.getItem('cca-analytics-consent:v1'),
    dataLayer: ((window as unknown as { dataLayer?: IArguments[] }).dataLayer ?? []).map((entry) => Array.from(entry)),
  }));
  expect(analyticsState.consent).toBeNull();
  expect(analyticsState.dataLayer[0]).toEqual(['consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  }]);
  expect(analyticsState.dataLayer[1]?.[0]).toBe('js');
  expect(analyticsState.dataLayer[2]).toEqual(['config', 'G-TEST123456', {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_domain: 'none',
  }]);

  await analyticsPage.getByRole('button', { name: '進捗' }).first().click();
  await expect(analyticsPage.getByText('Google Analyticsで基本的なページ閲覧情報を収集します。')).toBeVisible();
  const disclosure = analyticsPage.getByRole('link', { name: 'アクセス解析について' });
  await expect(disclosure).toHaveAttribute('href', '/privacy/');
  await disclosure.click();
  await expect(analyticsPage).toHaveURL(/\/privacy\/$/);
  await expect(analyticsPage.getByRole('heading', { name: 'アクセス解析' })).toBeVisible();
});

for (const route of [
  { name: 'Japanese app', path: '/' },
  { name: 'English app', path: '/en/' },
  { name: 'Japanese privacy page', path: '/privacy/' },
  { name: 'English privacy page', path: '/en/privacy/' },
]) {
  for (const width of [375, 768, 1000, 1120, 1121, 1440]) {
    test(`${route.name} does not overflow horizontally at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route.path);
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }));
      expect(dimensions.document).toBe(dimensions.viewport);
      expect(dimensions.body).toBe(dimensions.viewport);
    });
  }
}
