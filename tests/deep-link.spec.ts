import { handsOnGuides } from '../src/content/hands-on';
import { studyGuideSections } from '../src/content/study-guide';
import { expect, test } from './fixtures/app';

// Real content ids, never hardcoded: a hash-based deep link addresses a specific
// section, guide, or step, and those ids are repo vocabulary that can change.
const section = studyGuideSections[0];
const guideA = handsOnGuides.find((guide) => guide.id === 'ho-support-agent-escalation')!;
const guideB = handsOnGuides.find((guide) => guide.id === 'ho-ci-review')!;
const stepB = guideB.steps[2]; // step-local-run

test('opens a guide section from a direct hash link, expanded and focused, and keeps the hash', async ({ page }) => {
  // #when — the section's deep link is opened as the very first navigation
  await page.goto(`/#/guide/${section.id}`);

  // #then — its <details> is open and its summary has focus
  const details = page.locator(`#guide-section-${section.id}`);
  await expect(details).toHaveAttribute('open', '');
  await expect(details.locator('summary')).toBeFocused();

  // #then — the hash still names the section, not collapsed to the bare view route
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe(`#/guide/${section.id}`);

  // #when — navigating away to another view
  await page.getByRole('button', { name: '練習' }).first().click();

  // #then — the hash is rewritten to the new, target-less view
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe('#/practice');
});

// Both tests below hold the lazily-loaded GuideView chunk open (same
// interception pattern as tests/chunk-failure.spec.ts) so the target set by
// the exact-target hash is still unconsumed when the learner moves on.

test('drops a stale exact-target when the destination hash changes before the Guide chunk resolves', async ({ page }) => {
  // #given — the Guide view's chunk is held in flight
  let releaseChunk = () => {};
  const chunkHeld = new Promise<void>((resolve) => { releaseChunk = resolve; });
  await page.route('**/GuideView.*.js', async (route) => {
    await chunkHeld;
    await route.continue();
  });

  // #when — an exact-target hash is opened, then changed to the target-less guide hash before the chunk loads
  await page.goto(`/#/guide/${section.id}`);
  await page.evaluate(() => { window.location.hash = '#/guide'; });
  releaseChunk();

  // #then — once the guide view finally renders, no section was left expanded
  await expect(page.getByRole('heading', { name: '学習ガイド', exact: true })).toBeVisible();
  await expect(page.locator('.guide-section[open]')).toHaveCount(0);
});

test('drops a stale exact-target after leaving for another view before the Guide chunk resolves, then returning by in-app navigation', async ({ page }) => {
  // #given — the Guide view's chunk is held in flight
  let releaseChunk = () => {};
  const chunkHeld = new Promise<void>((resolve) => { releaseChunk = resolve; });
  await page.route('**/GuideView.*.js', async (route) => {
    await chunkHeld;
    await route.continue();
  });

  // #when — an exact-target hash is opened, then the learner moves to a different view before the chunk loads
  await page.goto(`/#/guide/${section.id}`);
  await page.evaluate(() => { window.location.hash = '#/progress'; });
  await expect(page.getByRole('heading', { name: '進捗と資料' })).toBeVisible();
  releaseChunk();

  // #when — returning to Guide through in-app navigation, not another deep link
  await page.getByRole('button', { name: 'ガイド' }).first().click();

  // #then — the earlier target was never replayed; no section is expanded
  await expect(page.getByRole('heading', { name: '学習ガイド', exact: true })).toBeVisible();
  await expect(page.locator('.guide-section[open]')).toHaveCount(0);
});

test('opens a hands-on step from a direct hash link, focused, without disturbing another guide', async ({ page }) => {
  // #given — guide A's detail is open via its own hash link first
  await page.goto(`/#/hands-on/${guideA.id}`);
  await expect(page.getByRole('heading', { name: guideA.title.ja })).toBeFocused();

  // #when — a hashchange targets a step on a different guide, B
  await page.evaluate((hash) => { window.location.hash = hash; }, `#/hands-on/${guideB.id}/${stepB.id}`);

  // #then — guide B's detail is the one shown (guide A's is unmounted, not just
  // hidden), and focus lands on B's step heading — not on any step of guide A
  await expect(page.getByRole('heading', { name: guideB.title.ja })).toBeVisible();
  await expect(page.getByRole('heading', { name: guideA.title.ja })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.activeElement?.id))
    .toBe(`handson-step-heading-${guideB.id}-${stepB.id}`);
});

test('ignores an unknown section id inside a known route without throwing', async ({ page }) => {
  // #when — the route is real but the id is not
  await page.goto('/#/guide/no-such-section');

  // #then — the guide view renders normally, nothing expands
  await expect(page.getByRole('heading', { name: '学習ガイド', exact: true })).toBeVisible();
  await expect(page.locator('.guide-section[open]')).toHaveCount(0);
});

test('ignores an unknown route and stays on the default Today view', async ({ page }) => {
  // #when — the hash names no route this build recognises
  await page.goto('/#/nope');

  // #then — the app renders its default view, unaffected
  await expect(page.getByRole('heading', { name: /思い出してから/ })).toBeVisible();
});

test('never writes a hash during an ordinary session that started without one', async ({ page }) => {
  // #given — the shared fixture already navigated to a plain, hash-less "/"

  // #when — navigating in-app to another view
  await page.getByRole('button', { name: 'ガイド' }).first().click();
  await expect(page.getByRole('heading', { name: '学習ガイド', exact: true })).toBeVisible();

  // #then — no hash was ever written for a session that never involved a deep link
  expect(await page.evaluate(() => window.location.hash)).toBe('');
});
