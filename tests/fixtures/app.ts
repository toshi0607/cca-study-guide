import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export { expect };

// Shared test fixture: every test starts on a clean, single navigation to the
// JA app. Storage is cleared once per tab, before any page script runs, via an
// init script guarded by a sessionStorage sentinel — so a later page.reload()
// keeps whatever the test seeded and reload-persistence tests still exercise the
// real persist path. The app never reads storage during synchronous render
// (App.tsx load() runs in a post-mount effect) and the analytics inline script
// never touches localStorage, so no extra reload is needed for a deterministic
// clean state. Overriding the `page` fixture (rather than an auto fixture) means
// a test that never destructures `page` — the no-JS prerender test, which uses
// only `browser` — is left untouched. (The analytics test does take `page` and
// then closes it, so it still pays the one setup navigation, exactly as the
// original beforeEach did.)
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('__e2eCleared')) {
        localStorage.clear();
        sessionStorage.setItem('__e2eCleared', '1');
      }
    });
    await page.goto('/');
    await use(page);
  },
});

// Content constants shared by the hands-on save-first flow and the tests that
// reuse that guide as a fixture (save-failure, cross-record preservation, axe,
// responsive).
export const supportGuideTitle = '複数ツールと人へのエスカレーションを持つエージェント';
export const supportStepIds = ['step-tool-contracts', 'step-loop', 'step-failure-classes', 'step-escalation', 'step-least-privilege-observability'];

// Opens the hands-on list from the guide entry and asserts focus landed on its
// heading. Shared by hands-on, accessibility, and responsive specs.
export async function openHandsOnList(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'ガイド' }).first().click();
  await page.getByRole('button', { name: 'ハンズオン一覧へ' }).click();
  await expect(page.getByRole('heading', { name: 'ハンズオン', exact: true })).toBeFocused();
}

// Opens the official scenarios sub-area from the guide entry. Shared by the
// official-scenarios, storage, accessibility, and responsive specs.
export async function openOfficialScenarios(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'ガイド' }).first().click();
  await page.getByRole('button', { name: '公式シナリオ一覧へ' }).click();
  await expect(page.getByRole('heading', { name: '公式シナリオで設計判断を学ぶ' })).toBeFocused();
}

export const officialScenarioNav = {
  ja: { guide: 'ガイド', list: '公式シナリオ一覧へ' },
  en: { guide: 'Guide', list: 'Go to the official scenarios' },
} as const;

// Opens a specific question as a one-question round via its related-question
// button under an official scenario, so the rationale-review tests target a
// known question deterministically. Shared by quiz, chunk-failure, and
// accessibility specs.
export async function openScenarioQuestion(
  page: Page,
  locale: 'ja' | 'en',
  scenarioTitle: string,
  questionId: string,
): Promise<void> {
  await page.getByRole('button', { name: officialScenarioNav[locale].guide }).first().click();
  await page.getByRole('button', { name: officialScenarioNav[locale].list }).click();
  await page.getByRole('button', { name: scenarioTitle }).click();
  await page.locator('.official-view').getByRole('button', { name: new RegExp(questionId) }).click();
  await expect(page.locator('.quiz-question')).toHaveCount(1);
}
