import { questions } from '../src/content/questions';
import { scenarios } from '../src/content/scenarios';
import { expectNoViolations } from './fixtures/accessibility';
import { expect, openScenarioQuestion, test } from './fixtures/app';
import { STORAGE_KEY } from './fixtures/storage';

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

  const stats = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').quizStats ?? {}, STORAGE_KEY);
  expect(Object.keys(stats).length).toBe(total);
  for (const stat of Object.values(stats) as { attempts: number }[]) expect(stat.attempts).toBe(1);

  await expectNoViolations(page);
});

test('records a single-select answer once even when its choice is fired twice before re-render', async ({ page }) => {
  // #given — a domain-scoped quiz round
  await page.getByRole('button', { name: '演習' }).first().click();
  await page.getByRole('button', { name: '10問' }).click();
  await page.getByRole('button', { name: 'D2', exact: true }).click();
  await page.getByRole('button', { name: '演習を始める' }).click();

  const total = Number(await page.locator('.quiz-question > header code').innerText().then((text) => /全(\d+)問/.exec(text)?.[1]));
  let doubleFired = false;

  for (let answered = 1; answered <= total; answered += 1) {
    await expect(page.locator('.quiz-question > header code')).toHaveText(`第${answered}問 / 全${total}問`);
    const isSingle = await page.getByText('正しい選択肢を1つ選んでください。選ぶと同時に回答になります。').isVisible();

    if (isSingle && !doubleFired) {
      // #when — the same choice is clicked twice synchronously, before Preact re-renders it disabled;
      // the answeredIdRef guard must drop the second call so the question is recorded only once.
      await page.evaluate(() => {
        const choice = document.querySelector('.choice-button') as HTMLElement;
        choice.click();
        choice.click();
      });
      doubleFired = true;
    } else if (isSingle) {
      await page.locator('.choice-button').first().click();
    } else {
      await page.locator('.choice-button').nth(0).click();
      await page.locator('.choice-button').nth(1).click();
      await page.getByRole('button', { name: '回答する' }).click();
    }

    await expect(page.locator('.quiz-feedback')).toBeVisible();
    await page.getByRole('button', { name: answered === total ? '結果を見る' : '次の問題へ' }).click();
  }

  // #then — the double-fired answer produced a single result: the summary still counts exactly `total`
  // answers (a duplicated result would read `${total + 1}問中`), and every question stat has one attempt.
  expect(doubleFired).toBe(true);
  await expect(page.getByRole('heading', { name: '演習結果' })).toBeVisible();
  await expect(page.locator('.quiz-score-figure')).toContainText(`${total}問中`);
  const stats = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').quizStats ?? {}, STORAGE_KEY);
  expect(Object.keys(stats).length).toBe(total);
  for (const stat of Object.values(stats) as { attempts: number }[]) expect(stat.attempts).toBe(1);
});

test('runs a scenario practice round with a reviewable case background and persisted stats', { tag: '@slow' }, async ({ page }) => {
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
  const stats = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').quizStats ?? {}, STORAGE_KEY);
  expect(Object.keys(stats).sort()).toEqual(scenarioQuestions.map((question) => question.id).sort());

  await expectNoViolations(page);

  // #then — the scenario list reflects the recorded answers
  await page.getByRole('button', { name: 'もう一度演習する' }).click();
  await expect(page.locator('.scenario-item').first()).toContainText(`解答済み ${scenarioQuestions.length}/${scenarioQuestions.length}`);
});

// --- Task 7 (#34): question metadata and per-choice rationale review ---

test('shows human-readable difficulty and skills.ts skill titles in both locales, never raw ids', async ({ page }) => {
  // #given — q-d1-fanout is difficulty "application" with skill "orchestration"
  await openScenarioQuestion(page, 'ja', 'カスタマーサポート解決エージェント', 'q-d1-fanout');

  // #then — Japanese labels, not raw enum/skill ids
  const metaJa = page.locator('.quiz-question .question-meta');
  await expect(metaJa).toContainText('認知レベル');
  await expect(metaJa).toContainText('応用');
  await expect(metaJa).toContainText('測定スキル');
  await expect(metaJa).toContainText('分解と委譲の設計');
  await expect(metaJa).not.toContainText('application');
  await expect(metaJa).not.toContainText('orchestration');

  // #when — the same question in English
  await page.goto('/en/');
  await openScenarioQuestion(page, 'en', 'Customer Support Resolution Agent', 'q-d1-fanout');

  // #then — English labels from skills.ts
  const metaEn = page.locator('.quiz-question .question-meta');
  await expect(metaEn).toContainText('Application');
  await expect(metaEn).toContainText('Decomposition and delegation');
  await expect(metaEn).not.toContainText('orchestration');
});

test('defers the rationale chunk until the first answer, then reviews each choice', async ({ page }) => {
  const rationaleRequests: string[] = [];
  page.on('request', (request) => { if (/\/rationales\.[^/]+\.js/.test(request.url())) rationaleRequests.push(request.url()); });

  await openScenarioQuestion(page, 'ja', 'カスタマーサポート解決エージェント', 'q-d1-fanout');

  // #then — no rationale chunk and no per-choice text before answering
  expect(rationaleRequests).toHaveLength(0);
  await expect(page.locator('.choice-rationale')).toHaveCount(0);

  // #when — answering (choice c is correct)
  await page.locator('.choice-button').nth(2).click();
  const feedback = page.locator('.quiz-feedback');
  await expect(feedback).toBeVisible();
  await expect(feedback).toBeFocused();

  // #then — the chunk is requested exactly once, after the answer
  await expect.poll(() => rationaleRequests.length).toBe(1);

  // #then — whole-question judgment and per-choice reasoning are separate, labeled sections
  await expect(feedback).toContainText('判断のポイント');
  await expect(feedback).toContainText('選択肢別の解説');
  await expect(feedback.locator('.choice-review-list > li')).toHaveCount(4);
  await expect(feedback.locator('.choice-rationale')).toHaveCount(4);

  // #then — the picked choice is the learner's correct pick; an unpicked one is labeled a wrong option
  const picked = feedback.locator('.choice-review-list > li', { hasText: 'あなたの選択' });
  await expect(picked).toHaveCount(1);
  await expect(picked).toContainText('正解選択肢');
  await expect(feedback.locator('.choice-review-list > li').first()).toContainText('誤答選択肢');

  await page.getByRole('button', { name: '結果を見る' }).click();
  await expect(page.getByRole('heading', { name: '演習結果' })).toBeVisible();
});

test('reviews a multiple-select answer choice by choice and counts one attempt on a double submit', async ({ page }) => {
  // #given — q-d3-skill is multiple-select with correct choices a and c
  await openScenarioQuestion(page, 'ja', 'Claude Codeによるコード生成', 'q-d3-skill');
  await expect(page.getByText('複数選択：', { exact: false })).toBeVisible();

  // #when — selecting a (correct) and b (incorrect), then double-firing submit before re-render
  await page.locator('.choice-button').nth(0).click();
  await page.locator('.choice-button').nth(1).click();
  await page.evaluate(() => {
    const submit = document.querySelector('.quiz-submit') as HTMLButtonElement;
    submit.click(); submit.click();
  });

  const feedback = page.locator('.quiz-feedback');
  await expect(feedback).toBeVisible();
  const items = feedback.locator('.choice-review-list > li');
  await expect(items).toHaveCount(4);
  await expect(feedback.locator('.choice-rationale')).toHaveCount(4);

  // #then — all four states are distinguishable by text alone
  await expect(items.nth(0)).toContainText('正解選択肢');
  await expect(items.nth(0)).toContainText('あなたの選択');
  await expect(items.nth(1)).toContainText('誤答選択肢');
  await expect(items.nth(1)).toContainText('あなたの選択');
  await expect(items.nth(2)).toContainText('正解選択肢');
  await expect(items.nth(2)).not.toContainText('あなたの選択');
  await expect(items.nth(3)).toContainText('誤答選択肢');
  await expect(items.nth(3)).not.toContainText('あなたの選択');

  // #then — the double submit recorded exactly one attempt
  const stats = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').quizStats ?? {}, STORAGE_KEY);
  expect(Object.keys(stats)).toEqual(['q-d3-skill']);
  expect(stats['q-d3-skill'].attempts).toBe(1);
});

test('reviews a missed question in the summary and adds no new storage keys', async ({ page }) => {
  // #given — q-d1-fanout answered wrong (choice a; correct is c) as a one-question round
  await openScenarioQuestion(page, 'ja', 'カスタマーサポート解決エージェント', 'q-d1-fanout');
  await page.locator('.choice-button').nth(0).click();
  await expect(page.locator('.quiz-verdict.is-incorrect')).toBeVisible();
  await page.getByRole('button', { name: '結果を見る' }).click();
  await expect(page.getByRole('heading', { name: '演習結果' })).toBeVisible();

  // #when — expanding the missed-question review
  const review = page.locator('.quiz-missed .quiz-review-item');
  await expect(review).toHaveCount(1);
  await review.locator('summary').click();

  // #then — difficulty, skills, the learner's wrong pick, the correct answer, and both explanations
  await expect(review.locator('.question-meta')).toContainText('応用');
  await expect(review.locator('.question-meta')).toContainText('分解と委譲の設計');
  await expect(review).toContainText('正解：');
  await expect(review.locator('.choice-review-list > li', { hasText: 'あなたの選択' })).toContainText('誤答選択肢');
  await expect(review).toContainText('判断のポイント');
  await expect(review).toContainText('選択肢別の解説');
  await expect(review.locator('.choice-rationale')).toHaveCount(4);

  // #then — only quizStats gained a key; no new top-level storage keys, no persisted rationale state
  const data = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), STORAGE_KEY);
  expect(Object.keys(data).sort()).toEqual(['handsOnProgress', 'quizStats', 'reviews', 'studyGuideProgress', 'version']);
  expect(Object.keys(data.quizStats)).toEqual(['q-d1-fanout']);
  expect(data.version).toBe(2);
});
