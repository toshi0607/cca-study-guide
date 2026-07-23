import { test as base, expect, type ConsoleMessage, type Request } from '@playwright/test';

export { expect };

// Health signals collected across a navigation. A production smoke test fails on
// any of these being non-empty; external (analytics) failures are deliberately
// excluded from `failedAssetRequests` — see isSameOriginAssetFailure.
export type SmokeCollectors = {
  consoleErrors: string[];
  pageErrors: string[];
  failedAssetRequests: string[];
};

// Only same-origin JS/CSS/font failures matter for a smoke run. An analytics
// beacon (googletagmanager/google-analytics) that fails or is blocked must never
// fail the suite, so we filter to the production origin (or a hashed /_astro/
// asset) and to loadable asset resource types.
function isSameOriginAssetFailure(request: Request, origin: string): boolean {
  const url = request.url();
  const sameOrigin = url.startsWith(origin) || url.includes('/_astro/');
  const type = request.resourceType();
  const isAsset = type === 'script' || type === 'stylesheet' || type === 'font';
  return sameOrigin && isAsset;
}

// A console error that originates from an EXTERNAL script/resource (e.g. a
// blocked or slow gtag.js / GTM subresource emits "Failed to load resource:
// net::ERR_…") must not fail a smoke run — transient analytics failures are
// tolerated by design (same policy as isSameOriginAssetFailure). App-thrown
// console.error calls carry a same-origin (/_astro/) source location and are
// kept; a message with no source location is kept, conservatively. Same-origin
// resource failures are still caught here (and redundantly on the request
// channel).
function isExternalConsoleError(message: ConsoleMessage, origin: string): boolean {
  const url = message.location()?.url ?? '';
  if (!url) return false;
  if (url.startsWith(origin) || url.includes('/_astro/')) return false;
  return true;
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
  collectors: async ({ page, baseURL }, use) => {
    const origin = new URL(baseURL ?? 'https://cca.toshi0607.com').origin;
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const failedAssetRequests: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error' && !isExternalConsoleError(message, origin)) consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('requestfailed', (request) => {
      if (isSameOriginAssetFailure(request, origin)) {
        failedAssetRequests.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText ?? 'failed'}`);
      }
    });

    await use({ consoleErrors, pageErrors, failedAssetRequests });
  },
});
