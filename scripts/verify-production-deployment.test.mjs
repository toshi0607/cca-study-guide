import { describe, expect, it } from 'vitest';
import { MANIFEST_FILENAME, MANIFEST_VERSION, hashManifestEntry, normalizeHtml } from './deployment-manifest.mjs';
import {
  MAX_REDIRECT_HOPS,
  isSafeManifestKey,
  isValidManifest,
  productionUrlForManifestKey,
  runVerification,
} from './verify-production-deployment.mjs';

const APP_KEY = '_astro/App.T5-Yk7yt.js';
const APP_PATH = `/${APP_KEY}`;
const INDEX_HTML = `<html><body><astro-island uid="abc123" component-url="${APP_PATH}"></astro-island></body></html>`;

function localFiles() {
  return {
    [APP_KEY]: Buffer.from('APP ISLAND BYTES'),
    '_astro/client.abc.js': Buffer.from('client'),
    '_astro/style.css': Buffer.from('css'),
    'index.html': Buffer.from(INDEX_HTML),
    'en/index.html': Buffer.from('<html lang="en">English</html>'),
    'favicon.svg': Buffer.from('<svg/>'),
  };
}

function manifest({ files = localFiles(), commit = 'commit-main-1' } = {}) {
  return {
    version: MANIFEST_VERSION,
    commit,
    files: Object.fromEntries(Object.entries(files).map(([key, value]) => [key, hashManifestEntry(key, Buffer.from(value))])),
  };
}

class FakeResponse {
  constructor({ status = 200, body = '', location = null }) {
    this.status = status;
    this._body = body;
    this.headers = { get: (name) => name.toLowerCase() === 'location' ? location : null };
  }
  async text() { return Buffer.from(this._body).toString('utf8'); }
  async arrayBuffer() {
    const bytes = Buffer.from(this._body);
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }
}

function makeFetch({ prodManifest = manifest(), servedFiles = localFiles(), redirect = null, manifestStatus = 200 } = {}) {
  return async (url, _options) => {
    const parsed = new URL(url);
    const redirectTarget = redirect?.(parsed.pathname);
    if (redirectTarget !== null && redirectTarget !== undefined) return new FakeResponse({ status: 302, location: redirectTarget });
    if (parsed.pathname === `/${MANIFEST_FILENAME}`) {
      return new FakeResponse({ status: manifestStatus, body: manifestStatus === 200 ? JSON.stringify(prodManifest) : '' });
    }
    const key = parsed.pathname.slice(1);
    return key in servedFiles
      ? new FakeResponse({ body: servedFiles[key] })
      : new FakeResponse({ status: 404 });
  };
}

const localReader = (localManifest = manifest()) => async (path) => {
  if (path === MANIFEST_FILENAME) return JSON.stringify(localManifest);
  throw new Error(`unexpected read: ${path}`);
};

const baseArgs = (overrides = {}) => ({
  distDir: 'dist',
  baseUrl: 'https://cca.toshi0607.com',
  fetchImpl: makeFetch(),
  readLocalFile: localReader(),
  now: () => new Date('2026-07-24T00:00:00.000Z'),
  ...overrides,
});

describe('manifest trust-boundary helpers', () => {
  it('normalizes only the Astro island uid; GA-looking content remains hashed', () => {
    expect(normalizeHtml('<astro-island uid="a">G-AAAAAA</astro-island>')).toBe('<astro-island uid="NORMALIZED">G-AAAAAA</astro-island>');
    expect(hashManifestEntry('index.html', Buffer.from('G-AAAAAA'))).not.toBe(hashManifestEntry('index.html', Buffer.from('G-BBBBBB')));
  });

  it('accepts only canonical relative manifest paths', () => {
    for (const key of ['/absolute.js', '//host/file', '../escape', 'dir/../escape', 'dir\\file', 'file?query', 'file#fragment', '%2e%2e/file', 'https:evil.example']) {
      expect(isSafeManifestKey(key)).toBe(false);
    }
    expect(isSafeManifestKey('_astro/app.js')).toBe(true);
    expect(() => productionUrlForManifestKey(new URL('https://cca.toshi0607.com'), '../escape', ['cca.toshi0607.com'])).toThrow(/unsafe manifest path/);
  });

  it('requires canonical SHA-256 hashes in manifest entries', () => {
    expect(isValidManifest(manifest())).toBe(true);
    expect(isValidManifest({ version: MANIFEST_VERSION, commit: null, files: {} })).toBe(false);
    expect(isValidManifest({ version: MANIFEST_VERSION, commit: null, files: { 'a.js': 'not-a-hash' } })).toBe(false);
  });
});

describe('runVerification (offline, injected I/O)', () => {
  it('MATCH directly fetches and hashes every local-manifest file', async () => {
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({ url, options });
      return makeFetch()(url, options);
    };
    const result = await runVerification(baseArgs({ fetchImpl }));
    expect(result.ok).toBe(true);
    expect(result.report.stage).toBe('complete');
    expect(calls.filter(({ url }) => !url.endsWith(MANIFEST_FILENAME))).toHaveLength(Object.keys(manifest().files).length);
    expect(calls.every(({ options }) => options.redirect === 'manual' && options.credentials === 'omit')).toBe(true);
  });

  it('detects tampered secondary CSS even when Production manifest is unchanged', async () => {
    const servedFiles = localFiles();
    servedFiles['_astro/style.css'] = Buffer.from('TAMPERED CSS');
    const result = await runVerification(baseArgs({ fetchImpl: makeFetch({ servedFiles }) }));
    expect(result.ok).toBe(false);
    expect(result.report.stage).toBe('verify-served-files');
    expect(result.report.mismatches).toContainEqual(expect.stringContaining('_astro/style.css'));
  });

  it('does not pass an off-host redirect target to fetchImpl', async () => {
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push(url);
      return makeFetch({ redirect: (path) => path === '/favicon.svg' ? 'https://evil.example/steal' : null })(url, options);
    };
    const result = await runVerification(baseArgs({ fetchImpl }));
    expect(result.ok).toBe(false);
    expect(result.report.stage).toBe('verify-served-files');
    expect(calls.some((url) => url.includes('evil.example'))).toBe(false);
  });

  it.each([
    ['an HTTP downgrade', 'http://cca.toshi0607.com/steal'],
    ['credentials', 'https://user:secret@cca.toshi0607.com/steal'],
  ])('does not fetch a redirect target containing %s', async (_label, target) => {
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push(url);
      return makeFetch({ redirect: (path) => path === '/favicon.svg' ? target : null })(url, options);
    };
    const result = await runVerification(baseArgs({ fetchImpl }));
    expect(result.ok).toBe(false);
    expect(calls).not.toContain(target);
  });

  it('follows a validated same-host redirect', async () => {
    const servedFiles = localFiles();
    servedFiles['assets/favicon.svg'] = servedFiles['favicon.svg'];
    const result = await runVerification(baseArgs({
      fetchImpl: makeFetch({ servedFiles, redirect: (path) => path === '/favicon.svg' ? '/assets/favicon.svg' : null }),
    }));
    expect(result.ok).toBe(true);
  });

  it('fails closed for missing Location and redirect hop exhaustion', async () => {
    const missingLocation = await runVerification(baseArgs({
      fetchImpl: makeFetch({ redirect: (path) => path === '/favicon.svg' ? '' : null }),
    }));
    expect(missingLocation.ok).toBe(false);
    expect(missingLocation.error).toMatch(/missing a Location/);

    const calls = [];
    const loop = await runVerification(baseArgs({
      fetchImpl: async (url) => {
        calls.push(url);
        return new FakeResponse({ status: 302, location: '/favicon.svg' });
      },
    }));
    expect(loop.ok).toBe(false);
    expect(loop.error).toMatch(/too many redirects/);
    expect(calls).toHaveLength(MAX_REDIRECT_HOPS + 1);
  });

  it('keeps the production manifest as supplementary evidence', async () => {
    const production = manifest({ commit: 'other-commit' });
    const result = await runVerification(baseArgs({ fetchImpl: makeFetch({ prodManifest: production }) }));
    expect(result.ok).toBe(false);
    expect(result.report.stage).toBe('compare-production-manifest');
  });

  it('fails when an audited commit is not bound by the production receipt', async () => {
    const production = manifest({ commit: null });
    const result = await runVerification(baseArgs({
      auditedCommit: 'commit-main-1',
      fetchImpl: makeFetch({ prodManifest: production }),
      readLocalFile: localReader(production),
    }));
    expect(result.ok).toBe(false);
    expect(result.report.mismatches).toContainEqual(expect.stringContaining('production (unknown)'));
  });
});
