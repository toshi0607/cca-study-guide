import { STORAGE_KEY } from '../fixtures/storage';
import { expect, test } from './fixtures/production';

// Static no-analytics / no-ad-signal guarantees (consent defaults, blocked ad
// storage, the single gtag load) are covered by tests/analytics.spec.ts and the
// build-time `test:no-analytics` check. This RUNTIME test guards a narrower,
// live-only property: taking a learning action must not exfiltrate study data —
// no custom learning gtag event, no study-data payload on any request, and no
// contact with a non-allowlisted host.

// Hosts the production app is allowed to talk to: itself, plus Google Analytics
// / Tag Manager (page-view analytics only, ad signals disabled by config).
function isAllowedHost(host: string): boolean {
  return host === 'cca.toshi0607.com'
    || host === 'www.googletagmanager.com'
    || host.endsWith('.google-analytics.com')
    || host === 'google-analytics.com';
}

// Internal study-data field names / structures that only appear on the wire if a
// document (or an imported JSON) were serialized into a request.
const STUDY_DATA_TOKENS = ['reviews', 'quizStats', 'intervalDays', 'lastRating', 'selectedChoiceIds', 'mockExamAttempts', 'studyGuideProgress', 'handsOnProgress'];

// A GA `en` (event name) param matching any of these would be a custom learning
// event — the app must never send one. GA's own automatic events (page_view,
// user_engagement, ...) are unaffected.
const LEARNING_EVENT = /rate|rating|answer|score|review|quiz|mock|practice|card/i;

test('a learning action leaks no study data and contacts no non-allowlisted host', async ({ page }) => {
  const requests: { url: string; body: string; host: string; gaEvents: string[] }[] = [];
  page.on('request', (request) => {
    const url = request.url();
    const body = request.postData() ?? '';
    let host = '';
    const gaEvents: string[] = [];
    try {
      const parsed = new URL(url);
      host = parsed.host;
      if (host.endsWith('google-analytics.com') && parsed.pathname.includes('/collect')) {
        // GA4 sends event names as `en=` — in the query string, and for
        // beacon/POST batches, one per line in the body. Collect both so a
        // body-batched custom event can't slip past.
        const fromQuery = parsed.searchParams.get('en');
        if (fromQuery) gaEvents.push(fromQuery);
        for (const match of body.matchAll(/(?:^|&|\n)en=([^&\n]+)/g)) {
          gaEvents.push(decodeURIComponent(match[1]));
        }
      }
    } catch { /* non-URL request target; host stays empty and is ignored below */ }
    requests.push({ url, body, host, gaEvents });
  });

  await page.goto('/');

  // #when — one learning action: reveal and rate a practice card
  await page.getByRole('button', { name: '練習' }).first().click();
  await expect(page.locator('.practice-view')).toBeVisible();
  await page.locator('.reveal-button').first().click();
  await page.getByRole('button', { name: /できた/ }).first().click();

  // #then — the rating really persisted (the action happened before we assert)
  await expect
    .poll(() => page.evaluate((key) => Object.keys(JSON.parse(localStorage.getItem(key) ?? '{}').reviews ?? {}).length, STORAGE_KEY))
    .toBe(1);

  // #then — nothing was sent to a non-allowlisted external host
  const foreignHosts = requests.filter((r) => r.host && !isAllowedHost(r.host)).map((r) => r.host);
  expect(foreignHosts, 'requests to non-allowlisted hosts').toEqual([]);

  // #then — no request URL or body carries study-data content
  for (const request of requests) {
    for (const token of STUDY_DATA_TOKENS) {
      expect(request.url.includes(token) || request.body.includes(token), `study-data token "${token}" leaked to ${request.host}`).toBe(false);
    }
  }

  // #then — no custom learning gtag event reached Google Analytics (query or body)
  for (const request of requests) {
    for (const event of request.gaEvents) {
      expect(LEARNING_EVENT.test(event), `custom learning GA event "${event}"`).toBe(false);
    }
  }
});
