import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MANIFEST_FILENAME, MANIFEST_VERSION, normalizeHtml, hashManifestEntry } from './deployment-manifest.mjs';
import {
  compareManifests,
  extractAppAsset,
  isValidManifest,
  manifestKeyForPath,
  NOT_YET_SERVED_MESSAGE,
  parseBaseUrl,
  runVerification,
} from './verify-production-deployment.mjs';

const sha = (s) => createHash('sha256').update(s).digest('hex');
const APP_PATH = '/_astro/App.T5-Yk7yt.js';
const APP_KEY = '_astro/App.T5-Yk7yt.js';
const APP_BYTES = Buffer.from('APP ISLAND BYTES');
const APP_SHA = sha(APP_BYTES);
const INDEX_HTML = `<html><body><astro-island uid="abc123" component-url="${APP_PATH}"></astro-island></body></html>`;

// A manifest whose App entry matches the served App bytes, so the cross-check passes.
function manifest(overrides = {}) {
  return {
    version: MANIFEST_VERSION,
    commit: 'commit' in overrides ? overrides.commit : 'commit-main-1',
    files: {
      [APP_KEY]: APP_SHA,
      '_astro/client.abc.js': sha('client'),
      '_astro/style.css': sha('css'),
      'index.html': sha('html-ja'),
      'en/index.html': sha('html-en'),
      'favicon.svg': sha('favicon'),
      ...overrides.files,
    },
  };
}

class FakeResponse {
  constructor({ status = 200, body = '', url = '' }) {
    this.status = status;
    this._body = body;
    this.url = url;
  }
  async text() { return typeof this._body === 'string' ? this._body : Buffer.from(this._body).toString('utf8'); }
  async arrayBuffer() { const b = Buffer.isBuffer(this._body) ? this._body : Buffer.from(String(this._body)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); }
}

// Build a fake fetch serving a production manifest, index HTML, and App asset.
function makeFetch({ prodManifest = manifest(), indexHtml = INDEX_HTML, appBytes = APP_BYTES, manifestStatus = 200, indexStatus = 200, appStatus = 200, redirectHostFor = null } = {}) {
  return async (urlStr) => {
    const u = new URL(urlStr);
    const finalUrl = redirectHostFor && redirectHostFor(u.pathname) ? `https://evil.example.com${u.pathname}` : urlStr;
    if (u.pathname === `/${MANIFEST_FILENAME}`) {
      return new FakeResponse({ status: manifestStatus, body: manifestStatus === 200 ? JSON.stringify(prodManifest) : '', url: finalUrl });
    }
    if (u.pathname === '/') return new FakeResponse({ status: indexStatus, body: indexHtml, url: finalUrl });
    if (u.pathname === APP_PATH) return new FakeResponse({ status: appStatus, body: appBytes, url: finalUrl });
    return new FakeResponse({ status: 404, body: '', url: finalUrl });
  };
}

const localReader = (localManifest = manifest()) => async (relPath) => {
  if (relPath === MANIFEST_FILENAME) return JSON.stringify(localManifest);
  throw new Error(`unexpected read: ${relPath}`);
};

const baseArgs = (over = {}) => ({
  distDir: 'dist',
  baseUrl: 'https://cca.toshi0607.com',
  fetchImpl: makeFetch(),
  readLocalFile: localReader(),
  now: () => new Date('2026-07-24T00:00:00.000Z'),
  ...over,
});

describe('pure helpers', () => {
  it('normalizeHtml strips GA id and astro-island uid', () => {
    const a = normalizeHtml('<astro-island uid="Z1YEmOI" x><script src="gtag/js?id=G-MR40SCH5M6">');
    const b = normalizeHtml('<astro-island uid="1hCO0n" x><script src="gtag/js?id=G-TEST123456">');
    expect(a).toBe(b);
  });

  it('hashManifestEntry normalizes html but hashes other files raw', () => {
    const h1 = hashManifestEntry('index.html', Buffer.from('<astro-island uid="A" x>'));
    const h2 = hashManifestEntry('index.html', Buffer.from('<astro-island uid="B" x>'));
    expect(h1).toBe(h2);
    const c1 = hashManifestEntry('a.js', Buffer.from('uid="A"'));
    const c2 = hashManifestEntry('a.js', Buffer.from('uid="B"'));
    expect(c1).not.toBe(c2);
  });

  it('extractAppAsset finds the App island, throws when absent', () => {
    expect(extractAppAsset(INDEX_HTML)).toBe(APP_PATH);
    expect(() => extractAppAsset('<html></html>')).toThrow();
  });

  it('manifestKeyForPath strips the leading slash', () => {
    expect(manifestKeyForPath(APP_PATH)).toBe(APP_KEY);
  });

  it('parseBaseUrl requires https and an allowlisted host', () => {
    expect(parseBaseUrl('https://cca.toshi0607.com').host).toBe('cca.toshi0607.com');
    expect(() => parseBaseUrl('http://cca.toshi0607.com')).toThrow(/https/);
    expect(() => parseBaseUrl('https://evil.example.com')).toThrow(/not allowed/);
  });

  it('isValidManifest guards shape and version', () => {
    expect(isValidManifest(manifest())).toBe(true);
    expect(isValidManifest({ version: 999, commit: null, files: {} })).toBe(false);
    expect(isValidManifest({ version: MANIFEST_VERSION, commit: null, files: { a: 1 } })).toBe(false);
    expect(isValidManifest(null)).toBe(false);
  });

  it('compareManifests: identical → ok', () => {
    const v = compareManifests({ local: manifest(), production: manifest() });
    expect(v.ok).toBe(true);
    expect(v.mismatches).toEqual([]);
  });

  it('compareManifests: a single file hash difference fails', () => {
    const v = compareManifests({ local: manifest(), production: manifest({ files: { '_astro/style.css': sha('css-v2') } }) });
    expect(v.ok).toBe(false);
    expect(v.mismatches.some((m) => m.includes('style.css'))).toBe(true);
  });

  it('compareManifests: extra / missing files fail', () => {
    const withExtra = manifest(); withExtra.files['extra.txt'] = sha('x');
    expect(compareManifests({ local: manifest(), production: withExtra }).ok).toBe(false);
    const missing = manifest(); delete missing.files['favicon.svg'];
    expect(compareManifests({ local: manifest(), production: missing }).ok).toBe(false);
  });

  it('compareManifests: commit difference fails, auditedCommit overrides tested', () => {
    const v = compareManifests({ local: manifest(), production: manifest({ commit: 'other' }) });
    expect(v.ok).toBe(false);
    expect(v.mismatches.some((m) => m.includes('commit differs'))).toBe(true);
    const v2 = compareManifests({ local: manifest(), production: manifest(), auditedCommit: 'audited-sha' });
    expect(v2.testedCommit).toBe('audited-sha');
  });
});

describe('runVerification (offline, injected I/O)', () => {
  it('MATCH: identical manifests + served asset cross-check → ok, exit 0', async () => {
    const r = await runVerification(baseArgs());
    expect(r.ok).toBe(true);
    expect(r.exitCode).toBe(0);
    expect(r.report.ok).toBe(true);
    expect(r.report.stage).toBe('complete');
    expect(r.summaryLines.some((l) => l.includes('MATCH'))).toBe(true);
  });

  it('CSS-only change → fail with the not-yet-served message + report', async () => {
    const r = await runVerification(baseArgs({ fetchImpl: makeFetch({ prodManifest: manifest({ files: { '_astro/style.css': sha('css-v2') } }) }) }));
    expect(r.ok).toBe(false);
    expect(r.error).toBe(NOT_YET_SERVED_MESSAGE);
    expect(r.report.mismatches.some((m) => m.includes('style.css'))).toBe(true);
  });

  it('HTML-metadata-only change → fail (html entry differs)', async () => {
    const r = await runVerification(baseArgs({ fetchImpl: makeFetch({ prodManifest: manifest({ files: { 'index.html': sha('html-ja-v2') } }) }) }));
    expect(r.ok).toBe(false);
    expect(r.report.mismatches.some((m) => m.includes('index.html'))).toBe(true);
  });

  it('static-asset-only change → fail (favicon differs)', async () => {
    const r = await runVerification(baseArgs({ fetchImpl: makeFetch({ prodManifest: manifest({ files: { 'favicon.svg': sha('favicon-v2') } }) }) }));
    expect(r.ok).toBe(false);
    expect(r.report.mismatches.some((m) => m.includes('favicon.svg'))).toBe(true);
  });

  it('commit differs (same files) → fail', async () => {
    const r = await runVerification(baseArgs({ fetchImpl: makeFetch({ prodManifest: manifest({ commit: 'old-commit' }) }), auditedCommit: 'new-commit' }));
    expect(r.ok).toBe(false);
    expect(r.report.mismatches.some((m) => m.includes('commit differs'))).toBe(true);
  });

  it('production manifest missing (404) → NOT_YET_SERVED, failure report still produced', async () => {
    const r = await runVerification(baseArgs({ fetchImpl: makeFetch({ manifestStatus: 404 }) }));
    expect(r.ok).toBe(false);
    expect(r.error).toBe(NOT_YET_SERVED_MESSAGE);
    expect(r.report.stage).toBe('fetch-production-manifest');
    expect(r.report.testedCommit).toBe('commit-main-1');
  });

  it('production manifest HTTP 500 → fail with stage + report', async () => {
    const r = await runVerification(baseArgs({ fetchImpl: makeFetch({ manifestStatus: 500 }) }));
    expect(r.ok).toBe(false);
    expect(r.report.stage).toBe('fetch-production-manifest');
    expect(r.report.ok).toBe(false);
  });

  it('served App asset stale vs production manifest → fail', async () => {
    // Manifest claims the correct App hash, but the server serves different bytes.
    const r = await runVerification(baseArgs({ fetchImpl: makeFetch({ appBytes: Buffer.from('TAMPERED APP') }) }));
    expect(r.ok).toBe(false);
    expect(r.report.stage).toBe('verify-served-asset');
  });

  it('redirect off the allowed host → fail', async () => {
    const r = await runVerification(baseArgs({ fetchImpl: makeFetch({ redirectHostFor: (p) => p === `/${MANIFEST_FILENAME}` }) }));
    expect(r.ok).toBe(false);
    expect(r.report.stage).toBe('fetch-production-manifest');
  });

  it('disallowed base host → fail at parse-base-url', async () => {
    const r = await runVerification(baseArgs({ baseUrl: 'https://evil.example.com', allowedHosts: ['cca.toshi0607.com'] }));
    expect(r.ok).toBe(false);
    expect(r.report.stage).toBe('parse-base-url');
  });

  it('missing local manifest → fail (run pnpm build first)', async () => {
    const r = await runVerification(baseArgs({ readLocalFile: async () => { throw new Error('ENOENT'); } }));
    expect(r.ok).toBe(false);
    expect(r.report.stage).toBe('read-local-manifest');
    expect(r.error).toMatch(/pnpm build/);
  });

  it('every failure path returns a non-null report with a stage and checkedAt', async () => {
    const cases = [
      baseArgs({ baseUrl: 'http://cca.toshi0607.com' }),
      baseArgs({ readLocalFile: async () => { throw new Error('x'); } }),
      baseArgs({ fetchImpl: makeFetch({ manifestStatus: 404 }) }),
      baseArgs({ fetchImpl: makeFetch({ prodManifest: manifest({ commit: 'z' }) }), auditedCommit: 'y' }),
    ];
    for (const args of cases) {
      const r = await runVerification(args);
      expect(r.report).toBeTruthy();
      expect(typeof r.report.stage).toBe('string');
      expect(r.report.checkedAt).toBe('2026-07-24T00:00:00.000Z');
    }
  });
});
