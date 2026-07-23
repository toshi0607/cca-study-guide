import { describe, expect, it } from 'vitest';
import {
  compareDeployment,
  digestAsset,
  extractAppAssets,
  parseBaseUrl,
  runVerification,
  sha256Hex,
  NOT_YET_SERVED_MESSAGE,
} from './verify-production-deployment.mjs';

// ---- Fixtures -------------------------------------------------------------

const APP_FILE = 'App.T5-Yk7yt.js';
const CLIENT_FILE = 'client.BQ2fQsCE.js';
const APP_PATH = `/_astro/${APP_FILE}`;
const CLIENT_PATH = `/_astro/${CLIENT_FILE}`;

const APP_BYTES = 'export const App = () => null; // app island';
const CLIENT_BYTES = 'export const hydrate = () => {}; // astro client';

const htmlWith = (appPath, clientPath) =>
  `<!DOCTYPE html><html><head></head><body>` +
  `<astro-island data-preact-island-id="1" component-url="${appPath}" component-export="App"></astro-island>` +
  `<script type="module" src="${clientPath}"></script>` +
  `</body></html>`;

const JA_HTML = htmlWith(APP_PATH, CLIENT_PATH);
const EN_HTML = htmlWith(APP_PATH, CLIENT_PATH);

/** Build an injected fetch over a { url: {status, body} } map. body may be string or Uint8Array. */
function fakeFetch(routes) {
  return async (url) => {
    const entry = routes[url];
    if (!entry) throw new Error(`fakeFetch: no route for ${url}`);
    const { status = 200, body = '', finalUrl } = entry;
    return {
      status,
      url: finalUrl ?? url,
      async text() {
        return typeof body === 'string' ? body : Buffer.from(body).toString('utf8');
      },
      async arrayBuffer() {
        const buf = typeof body === 'string' ? Buffer.from(body, 'utf8') : Buffer.from(body);
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      },
    };
  };
}

/** Build an injected local-file reader over a { relPath: contents } map. */
function fakeReader(files) {
  return async (relPath) => {
    if (!(relPath in files)) throw new Error(`ENOENT: ${relPath}`);
    const v = files[relPath];
    return typeof v === 'string' ? Buffer.from(v, 'utf8') : Buffer.from(v);
  };
}

const localFiles = () => ({
  'index.html': JA_HTML,
  'en/index.html': EN_HTML,
  [`_astro/${APP_FILE}`]: APP_BYTES,
  [`_astro/${CLIENT_FILE}`]: CLIENT_BYTES,
});

const prodRoutes = (overrides = {}) => ({
  'https://cca.toshi0607.com/': { status: 200, body: JA_HTML },
  'https://cca.toshi0607.com/en/': { status: 200, body: EN_HTML },
  [`https://cca.toshi0607.com${APP_PATH}`]: { status: 200, body: APP_BYTES },
  [`https://cca.toshi0607.com${CLIENT_PATH}`]: { status: 200, body: CLIENT_BYTES },
  ...overrides,
});

const baseArgs = (over = {}) => ({
  distDir: 'dist',
  baseUrl: 'https://cca.toshi0607.com',
  fetchImpl: fakeFetch(prodRoutes()),
  readLocalFile: fakeReader(localFiles()),
  now: () => new Date('2020-01-01T00:00:00.000Z'),
  ...over,
});

// ---- Pure helpers ---------------------------------------------------------

describe('extractAppAssets', () => {
  it('extracts App + client filenames and paths', () => {
    const refs = extractAppAssets(JA_HTML);
    expect(refs.app).toEqual({ file: APP_FILE, path: APP_PATH });
    expect(refs.client).toEqual({ file: CLIENT_FILE, path: CLIENT_PATH });
  });

  it('throws when there is no App island', () => {
    const noApp = `<html><body><script src="${CLIENT_PATH}"></script></body></html>`;
    expect(() => extractAppAssets(noApp)).toThrow(/no App island/);
  });

  it('throws when there is no client runtime', () => {
    const noClient = `<html><body><astro-island component-url="${APP_PATH}"></astro-island></body></html>`;
    expect(() => extractAppAssets(noClient)).toThrow(/no astro client/);
  });
});

describe('parseBaseUrl', () => {
  it('accepts the default allowlisted https host', () => {
    expect(parseBaseUrl('https://cca.toshi0607.com').host).toBe('cca.toshi0607.com');
  });

  it('rejects a disallowed host', () => {
    expect(() => parseBaseUrl('https://evil.example.com')).toThrow(/not allowed/);
  });

  it('rejects a non-https scheme', () => {
    expect(() => parseBaseUrl('http://cca.toshi0607.com')).toThrow(/https:/);
  });
});

describe('compareDeployment', () => {
  const local = {
    app: digestAsset(APP_FILE, Buffer.from(APP_BYTES)),
    client: digestAsset(CLIENT_FILE, Buffer.from(CLIENT_BYTES)),
  };

  it('ok when digests match', () => {
    const v = compareDeployment({ local, production: local });
    expect(v).toEqual({ ok: true, notYetServed: false, mismatches: [] });
  });

  it('flags notYetServed on filename mismatch', () => {
    const production = {
      app: { file: 'App.OLD00000.js', sha256: null, bytes: null },
      client: { file: CLIENT_FILE, sha256: null, bytes: null },
    };
    const v = compareDeployment({ local, production });
    expect(v.ok).toBe(false);
    expect(v.notYetServed).toBe(true);
    expect(v.mismatches[0]).toMatch(/app: filename mismatch/);
  });

  it('flags a byte/hash mismatch when filenames match', () => {
    const production = {
      app: digestAsset(APP_FILE, Buffer.from('different bytes, same name')),
      client: local.client,
    };
    const v = compareDeployment({ local, production });
    expect(v.ok).toBe(false);
    expect(v.notYetServed).toBe(false);
    expect(v.mismatches.some((m) => /sha256 mismatch/.test(m))).toBe(true);
  });
});

// ---- Full runVerification (offline, injected deps) ------------------------

describe('runVerification', () => {
  it('ok:true / exit 0 when local & production match', async () => {
    const result = await runVerification(baseArgs());
    expect(result.ok).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.error).toBeNull();
    expect(result.report.ok).toBe(true);
    expect(result.report.host).toBe('https://cca.toshi0607.com');
    expect(result.report.local.app.sha256).toBe(sha256Hex(Buffer.from(APP_BYTES)));
    expect(result.report.production.app.sha256).toBe(sha256Hex(Buffer.from(APP_BYTES)));
    expect(result.report.mismatches).toEqual([]);
  });

  it('fails when local build is missing', async () => {
    const result = await runVerification(baseArgs({ readLocalFile: fakeReader({}) }));
    expect(result.ok).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toMatch(/local build not found/);
    expect(result.error).toMatch(/pnpm build/);
  });

  it('fails on missing App island (parse error)', async () => {
    const files = localFiles();
    files['index.html'] = '<html><body>no island here</body></html>';
    const result = await runVerification(baseArgs({ readLocalFile: fakeReader(files) }));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/local ja HTML/);
  });

  it('prints the exact NOT_YET_SERVED phrase on filename mismatch', async () => {
    const oldAppPath = '/_astro/App.OLD00000.js';
    const oldClientPath = '/_astro/client.OLD00000.js';
    const prodHtml = htmlWith(oldAppPath, oldClientPath);
    const routes = prodRoutes({
      'https://cca.toshi0607.com/': { status: 200, body: prodHtml },
      'https://cca.toshi0607.com/en/': { status: 200, body: prodHtml },
    });
    const result = await runVerification(baseArgs({ fetchImpl: fakeFetch(routes) }));
    expect(result.ok).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBe(NOT_YET_SERVED_MESSAGE);
    expect(result.summaryLines).toContain(NOT_YET_SERVED_MESSAGE);
    expect(result.report.ok).toBe(false);
  });

  it('fails on byte/hash mismatch even when filenames match (defensive)', async () => {
    const routes = prodRoutes({
      [`https://cca.toshi0607.com${APP_PATH}`]: { status: 200, body: 'tampered bytes, same filename' },
    });
    const result = await runVerification(baseArgs({ fetchImpl: fakeFetch(routes) }));
    expect(result.ok).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toMatch(/sha256 mismatch/);
  });

  it('fails on production HTTP non-200', async () => {
    const routes = prodRoutes({ 'https://cca.toshi0607.com/': { status: 503, body: '' } });
    const result = await runVerification(baseArgs({ fetchImpl: fakeFetch(routes) }));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/HTTP 503/);
  });

  it('fails on a 404 for a production asset', async () => {
    const routes = prodRoutes({
      [`https://cca.toshi0607.com${APP_PATH}`]: { status: 404, body: '' },
    });
    const result = await runVerification(baseArgs({ fetchImpl: fakeFetch(routes) }));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/HTTP 404/);
  });

  it('fails when production redirects off the allowed host', async () => {
    const routes = prodRoutes({
      'https://cca.toshi0607.com/': { status: 200, body: JA_HTML, finalUrl: 'https://phishing.example.com/' },
    });
    const result = await runVerification(baseArgs({ fetchImpl: fakeFetch(routes) }));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/redirected off allowed host/);
  });

  it('rejects an overridden disallowed base host', async () => {
    const result = await runVerification(baseArgs({ baseUrl: 'https://evil.example.com' }));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not allowed/);
  });

  it('fails when production /en/ diverges from /', async () => {
    const enHtml = htmlWith('/_astro/App.DIFFERENT0.js', CLIENT_PATH);
    const routes = prodRoutes({ 'https://cca.toshi0607.com/en/': { status: 200, body: enHtml } });
    const result = await runVerification(baseArgs({ fetchImpl: fakeFetch(routes) }));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/production \/en\/ references a different App asset/);
  });

  it('fails when local /en/ diverges from local /', async () => {
    const files = localFiles();
    files['en/index.html'] = htmlWith('/_astro/App.DIFFERENT0.js', CLIENT_PATH);
    const result = await runVerification(baseArgs({ readLocalFile: fakeReader(files) }));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/local \/en\/ references different assets/);
  });
});
