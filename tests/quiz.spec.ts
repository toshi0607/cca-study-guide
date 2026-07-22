import { questions } from '../src/content/questions';
import { scenarios } from '../src/content/scenarios';
import { expectNoViolations } from './fixtures/accessibility';
import { expect, test } from './fixtures/app';
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
