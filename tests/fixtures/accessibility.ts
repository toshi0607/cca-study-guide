import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Every accessibility assertion in the suite scans the WCAG 2.0 A/AA rule set
// over the whole page. Two contracts exist and both are preserved verbatim:
//   - the whole-app / dynamic-result states demand ZERO violations;
//   - the guide / hands-on / official-scenario states demand no serious or
//     critical violations (their long-form content is scanned but held to the
//     serious+critical bar the original tests set).
// Centralizing the AxeBuilder call keeps the rule scope identical across states
// so a scan can never be silently narrowed.
// Reveal animations (`.answer`, `.quiz-feedback`) fade in over 180ms. Playwright
// treats an opacity-0 element as visible, so a scan started right after the
// visibility assertion samples the composited mid-fade colours instead of the
// declared ones — axe then reports e.g. #be736b on #fef5f4 (3.34:1) for what is
// really --danger on --danger-pale (5.63:1). Settling animations first makes the
// scan measure the styles the user actually ends up looking at.
async function settleAnimations(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      document.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
    ).then(() => undefined),
  );
}

async function analyze(page: Page) {
  await settleAnimations(page);
  return new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
}

export async function expectNoViolations(page: Page): Promise<void> {
  const results = await analyze(page);
  expect(results.violations).toEqual([]);
}

export async function expectNoSeriousOrCritical(page: Page): Promise<void> {
  const results = await analyze(page);
  expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
}
