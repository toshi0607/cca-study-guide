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
async function analyze(page: Page) {
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
