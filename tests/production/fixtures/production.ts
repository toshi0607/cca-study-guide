import { test as base, expect, type Request } from '@playwright/test';

export { expect };

// Health signals collected across a navigation. A production smoke test fails on
// any of these being non-empty.
export type SmokeCollectors = {
  consoleErrors: string[];
  pageErrors: string[];
  failedAssetRequests: string[];
};

// JS/CSS/font failures matter for a smoke run. The app is static and does not
// allow third-party analytics or other external assets.
function isAssetFailure(request: Request): boolean {
  const type = request.resourceType();
  const isAsset = type === 'script' || type === 'stylesheet' || type === 'font';
  return isAsset;
}

// Production smoke fixture. Two responsibilities, both opt-in per test:
//  - `page`: clears localStorage once per browser context before any page script
//    runs (guarded by a sessionStorage sentinel, mirroring tests/fixtures/app.ts)
//    so a later reload keeps whatever the test seeded and reload-persistence
//    tests still exercise the real persist path. It does NOT auto-navigate:
//    smoke tests choose their locale route explicitly.
//  - `collectors`: attaches console/pageerror/requestfailed listeners before the
//    test navigates, so hydration-time errors are captured. Tests that do not
//    destructure `collectors` pay no listener cost.
export const test = base.extend<{ collectors: SmokeCollectors }>({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('__e2eCleared')) {
        localStorage.clear();
        sessionStorage.setItem('__e2eCleared', '1');
      }
    });
    await use(page);
  },
  collectors: async ({ page }, use) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const failedAssetRequests: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('requestfailed', (request) => {
      if (isAssetFailure(request)) {
        failedAssetRequests.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText ?? 'failed'}`);
      }
    });

    await use({ consoleErrors, pageErrors, failedAssetRequests });
  },
});
