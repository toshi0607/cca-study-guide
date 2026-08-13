import { STORAGE_KEY } from '../fixtures/storage';
import { expect, test } from './fixtures/production';

// Internal study-data field names / structures that only appear on the wire if a
// document (or an imported JSON) were serialized into a request.
const STUDY_DATA_TOKENS = ['reviews', 'quizStats', 'intervalDays', 'lastRating', 'selectedChoiceIds', 'mockExamAttempts', 'studyGuideProgress', 'handsOnProgress'];

test('a learning action stays local and contacts no external host', async ({ page, baseURL }) => {
  const origin = new URL(baseURL ?? 'https://cca.toshi0607.com').host;
  const requests: { url: string; body: string; host: string }[] = [];
  page.on('request', (request) => {
    const url = request.url();
    const body = request.postData() ?? '';
    let host = '';
    try {
      host = new URL(url).host;
    } catch { /* non-URL request target; host stays empty and is ignored below */ }
    requests.push({ url, body, host });
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

  // #then — this static app makes no third-party network requests.
  const foreignHosts = requests.filter((r) => r.host && r.host !== origin).map((r) => r.host);
  expect(foreignHosts, 'requests to external hosts').toEqual([]);

  // #then — no request URL or body carries study-data content
  for (const request of requests) {
    for (const token of STUDY_DATA_TOKENS) {
      expect(request.url.includes(token) || request.body.includes(token), `study-data token "${token}" leaked to ${request.host}`).toBe(false);
    }
  }

});
