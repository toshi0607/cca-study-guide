// Verifies that the live Production deployment serves the SAME built app-island
// assets as a local `dist/` build. This is a fast smoke check for the deploy
// pipeline: it does NOT poll or wait for a deploy to finish — a single bounded
// fetch per resource. Failing fast on a deploy race (production still on an
// older build) is intentional and preferred over hiding it behind retries.
//
// What it checks:
//   1. Local `dist/index.html` (ja) references an App island + astro client
//      runtime under `/_astro/` (content-hashed filenames).
//   2. Local `dist/en/index.html` references the SAME two assets.
//   3. Production `/` (200, no redirect off the allowed host) references some
//      App + client assets, and Production `/en/` references the same App asset
//      (same-deploy consistency across locales).
//   4. Production asset FILENAMES match local (hash-in-name), AND the fetched
//      Production asset BYTES match the local `dist/_astro/...` bytes by sha256
//      and length. Filename match is necessary; byte/hash match is authoritative.
//
// CLI / env convention (all optional):
//   --dist <dir>   | env DEPLOY_DIST      local build dir      (default: dist)
//   --base <url>   | env DEPLOY_BASE_URL  production base URL   (default: https://cca.toshi0607.com)
//                                         must be https: and host on the allowlist
//   --json <path>  | env DEPLOY_JSON      write a machine-readable JSON report
//
// Exit codes: 0 only when everything matches. Non-zero on: missing local build,
// HTTP failure / redirect off the allowed host, 404 on an asset, HTML parse
// failure (no App/client asset), any filename/byte/hash mismatch, disallowed
// host, or ja/en (local or production) divergence.
//
// Node 22+ (global fetch, node:crypto, node:fs/promises, AbortSignal.timeout).

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Default production host and the host allowlist for `--base` overrides. */
export const DEFAULT_BASE_URL = 'https://cca.toshi0607.com';
export const DEFAULT_ALLOWED_HOSTS = ['cca.toshi0607.com'];

/** Bounded per-resource fetch timeout. No retries — a single fetch each. */
export const FETCH_TIMEOUT_MS = 20000;

/** Exact phrase required when production is valid but serves an older build. */
export const NOT_YET_SERVED_MESSAGE = 'Production does not yet serve this main build';

/**
 * @typedef {{ file: string, path: string }} AssetRef
 * @typedef {{ app: AssetRef, client: AssetRef }} AssetRefs
 * @typedef {{ file: string, sha256: string, bytes: number }} AssetDigest
 * @typedef {{ app: AssetDigest, client: AssetDigest }} DeploymentDigest
 */

/**
 * Extract the App island and astro client runtime asset paths from page HTML.
 * The App island is referenced as `component-url="/_astro/App.<hash>.js"`; the
 * client runtime appears as a bare `/_astro/client.<hash>.js` reference.
 * @param {string} html
 * @returns {AssetRefs}
 * @throws if either asset cannot be found.
 */
export function extractAppAssets(html) {
  if (typeof html !== 'string' || html.length === 0) {
    throw new Error('extractAppAssets: HTML input is empty');
  }
  const appMatch = html.match(/\/_astro\/App\.[A-Za-z0-9_-]+\.js/);
  const clientMatch = html.match(/\/_astro\/client\.[A-Za-z0-9_-]+\.js/);
  if (!appMatch) {
    throw new Error('extractAppAssets: no App island asset (/_astro/App.<hash>.js) found in HTML');
  }
  if (!clientMatch) {
    throw new Error('extractAppAssets: no astro client asset (/_astro/client.<hash>.js) found in HTML');
  }
  return {
    app: { file: assetFilename(appMatch[0]), path: appMatch[0] },
    client: { file: assetFilename(clientMatch[0]), path: clientMatch[0] },
  };
}

/**
 * Basename of an `/_astro/...` asset path.
 * @param {string} assetPath
 * @returns {string}
 */
export function assetFilename(assetPath) {
  const clean = assetPath.split('?')[0].split('#')[0];
  const idx = clean.lastIndexOf('/');
  return idx === -1 ? clean : clean.slice(idx + 1);
}

/**
 * Validate and parse a production base URL: must be https: and its host must be
 * on the allowlist. Rejects arbitrary hosts rather than accepting silently.
 * @param {string} rawBase
 * @param {string[]} [allowedHosts]
 * @returns {URL}
 * @throws if the scheme is not https: or the host is not allowlisted.
 */
export function parseBaseUrl(rawBase, allowedHosts = DEFAULT_ALLOWED_HOSTS) {
  let url;
  try {
    url = new URL(rawBase);
  } catch {
    throw new Error(`parseBaseUrl: not a valid URL: ${rawBase}`);
  }
  if (url.protocol !== 'https:') {
    throw new Error(`parseBaseUrl: base URL must use https: (got ${url.protocol}) — ${rawBase}`);
  }
  if (!allowedHosts.includes(url.host)) {
    throw new Error(
      `parseBaseUrl: host "${url.host}" is not allowed. Allowed hosts: ${allowedHosts.join(', ')}`,
    );
  }
  return url;
}

/**
 * sha256 hex digest of a buffer/Uint8Array.
 * @param {Uint8Array | Buffer} data
 * @returns {string}
 */
export function sha256Hex(data) {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Digest a raw asset buffer into { file, sha256, bytes }.
 * @param {string} file
 * @param {Uint8Array | Buffer} data
 * @returns {AssetDigest}
 */
export function digestAsset(file, data) {
  return { file, sha256: sha256Hex(data), bytes: data.byteLength ?? data.length };
}

/**
 * Compare local vs production deployment digests. Pure — no I/O.
 * `production` app/client may carry sha256/bytes = null when only the filename
 * is known (older-deploy fast path, byte fetch skipped).
 * @param {{ local: DeploymentDigest, production: { app: AssetDigest, client: {file:string, sha256?: string|null, bytes?: number|null} } }} args
 * @returns {{ ok: boolean, notYetServed: boolean, mismatches: string[] }}
 */
export function compareDeployment({ local, production }) {
  const mismatches = [];
  let filenameMismatch = false;

  for (const key of /** @type {const} */ (['app', 'client'])) {
    const l = local[key];
    const p = production[key];
    if (l.file !== p.file) {
      filenameMismatch = true;
      mismatches.push(`${key}: filename mismatch (local ${l.file} vs production ${p.file})`);
      continue;
    }
    // Filenames match — the authoritative check is bytes/hash, when available.
    if (p.sha256 != null && l.sha256 !== p.sha256) {
      mismatches.push(`${key}: sha256 mismatch for ${l.file} (local ${l.sha256} vs production ${p.sha256})`);
    }
    if (p.bytes != null && l.bytes !== p.bytes) {
      mismatches.push(`${key}: byte-length mismatch for ${l.file} (local ${l.bytes} vs production ${p.bytes})`);
    }
  }

  return { ok: mismatches.length === 0, notYetServed: filenameMismatch, mismatches };
}

/**
 * Fetch a URL with a bounded timeout. One shot, no retry.
 * @param {typeof fetch} fetchImpl
 * @param {string} url
 * @param {number} timeoutMs
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(fetchImpl, url, timeoutMs) {
  try {
    return await fetchImpl(url, { redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    const reason = err && err.name === 'TimeoutError' ? `timed out after ${timeoutMs}ms` : String(err?.message ?? err);
    throw new Error(`fetch failed for ${url}: ${reason}`);
  }
}

/**
 * Fetch page HTML from production, asserting 200 and that the final URL host
 * stays on the allowlist (a redirect off-host is a failure).
 * @param {typeof fetch} fetchImpl
 * @param {URL} pageUrl
 * @param {string[]} allowedHosts
 * @returns {Promise<string>}
 */
async function fetchProductionHtml(fetchImpl, pageUrl, allowedHosts) {
  const res = await fetchWithTimeout(fetchImpl, pageUrl.toString(), FETCH_TIMEOUT_MS);
  const finalHost = safeHost(res.url) ?? pageUrl.host;
  if (!allowedHosts.includes(finalHost)) {
    throw new Error(`production HTML ${pageUrl} redirected off allowed host to ${finalHost}`);
  }
  if (res.status !== 200) {
    throw new Error(`production HTML ${pageUrl} returned HTTP ${res.status}`);
  }
  return await res.text();
}

/** Host of a URL string, or null if unparseable/empty. */
function safeHost(urlStr) {
  if (!urlStr) return null;
  try {
    return new URL(urlStr).host;
  } catch {
    return null;
  }
}

/**
 * Fetch a production asset's bytes, asserting 200 (404 → error).
 * @param {typeof fetch} fetchImpl
 * @param {URL} base
 * @param {string} assetPath e.g. "/_astro/App.<hash>.js"
 * @param {string[]} allowedHosts
 * @returns {Promise<Buffer>}
 */
async function fetchProductionAsset(fetchImpl, base, assetPath, allowedHosts) {
  const url = new URL(assetPath, base);
  const res = await fetchWithTimeout(fetchImpl, url.toString(), FETCH_TIMEOUT_MS);
  // Defense-in-depth: an asset that redirects off the allowed host is rejected
  // even though the byte/sha256 check below would already catch mismatched
  // content — we never trust bytes fetched from an unexpected origin.
  const finalHost = safeHost(res.url) ?? url.host;
  if (!allowedHosts.includes(finalHost)) {
    throw new Error(`production asset ${url} redirected off allowed host to ${finalHost}`);
  }
  if (res.status !== 200) {
    throw new Error(`production asset ${url} returned HTTP ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}

/**
 * Core verification. All I/O is injected so this is unit-testable offline.
 * @param {Object} args
 * @param {string} args.distDir
 * @param {string} args.baseUrl raw base URL string (validated here)
 * @param {string[]} [args.allowedHosts]
 * @param {typeof fetch} args.fetchImpl
 * @param {(relPath: string) => Promise<Buffer|Uint8Array>} args.readLocalFile reads a path relative to distDir
 * @param {() => Date} [args.now]
 * @returns {Promise<{ ok: boolean, exitCode: number, summaryLines: string[], report: object|null, error: string|null }>}
 */
export async function runVerification({
  distDir,
  baseUrl,
  allowedHosts = DEFAULT_ALLOWED_HOSTS,
  fetchImpl,
  readLocalFile,
  now = () => new Date(),
}) {
  const lines = [];
  /** @param {string} msg @param {object|null} [report] */
  const fail = (msg, report = null) => ({ ok: false, exitCode: 1, summaryLines: lines, report, error: msg });

  let base;
  try {
    base = parseBaseUrl(baseUrl, allowedHosts);
  } catch (err) {
    return fail(String(err.message ?? err));
  }
  lines.push(`Tested host: ${base.origin}`);

  // 1. Local ja HTML must exist.
  let jaHtml;
  try {
    jaHtml = decode(await readLocalFile('index.html'));
  } catch {
    return fail(`local build not found: could not read ${join(distDir, 'index.html')}. Run \`pnpm build\` first.`);
  }

  // 2. Extract local ja assets; assert local en references the same two.
  let localRefs;
  try {
    localRefs = extractAppAssets(jaHtml);
  } catch (err) {
    return fail(`local ja HTML: ${err.message}`);
  }
  try {
    const enHtml = decode(await readLocalFile('en/index.html'));
    const localEnRefs = extractAppAssets(enHtml);
    if (localEnRefs.app.file !== localRefs.app.file || localEnRefs.client.file !== localRefs.client.file) {
      return fail(
        `local /en/ references different assets than / (en app ${localEnRefs.app.file} / client ${localEnRefs.client.file} vs ${localRefs.app.file} / ${localRefs.client.file})`,
      );
    }
  } catch (err) {
    return fail(`local en HTML: ${err.message}`);
  }

  // Local asset digests (authoritative baseline).
  /** @type {DeploymentDigest} */
  let localDigest;
  try {
    const appBuf = await readLocalFile(join('_astro', localRefs.app.file));
    const clientBuf = await readLocalFile(join('_astro', localRefs.client.file));
    localDigest = {
      app: digestAsset(localRefs.app.file, appBuf),
      client: digestAsset(localRefs.client.file, clientBuf),
    };
  } catch (err) {
    return fail(`local asset bytes: ${err.message}`);
  }
  lines.push(
    `Local    App: ${localDigest.app.file} sha256=${localDigest.app.sha256} bytes=${localDigest.app.bytes}`,
    `Local client: ${localDigest.client.file} sha256=${localDigest.client.sha256} bytes=${localDigest.client.bytes}`,
  );

  // 3. Production `/` HTML.
  let prodRefs;
  try {
    const prodHtml = await fetchProductionHtml(fetchImpl, new URL('/', base), allowedHosts);
    prodRefs = extractAppAssets(prodHtml);
  } catch (err) {
    return fail(String(err.message ?? err));
  }

  // 5. Production `/en/` must reference the same App asset as `/` (same deploy).
  try {
    const prodEnHtml = await fetchProductionHtml(fetchImpl, new URL('/en/', base), allowedHosts);
    const prodEnRefs = extractAppAssets(prodEnHtml);
    if (prodEnRefs.app.file !== prodRefs.app.file) {
      return fail(
        `production /en/ references a different App asset than / (en ${prodEnRefs.app.file} vs ${prodRefs.app.file}) — inconsistent deploy`,
      );
    }
  } catch (err) {
    return fail(String(err.message ?? err));
  }

  const checkedAt = now().toISOString();

  // 4a. Filename comparison. A mismatch means production is on an older build.
  const filenameVerdict = compareDeployment({
    local: localDigest,
    production: {
      app: { file: prodRefs.app.file, sha256: null, bytes: null },
      client: { file: prodRefs.client.file, sha256: null, bytes: null },
    },
  });
  if (filenameVerdict.notYetServed) {
    lines.push(
      `Prod     App: ${prodRefs.app.file} (filename mismatch)`,
      `Prod  client: ${prodRefs.client.file} (filename mismatch)`,
      `Verdict App:    MISMATCH`,
      `Verdict client: ${prodRefs.client.file === localDigest.client.file ? 'match (filename)' : 'MISMATCH'}`,
      NOT_YET_SERVED_MESSAGE,
    );
    const report = buildReport({
      host: base.origin,
      ok: false,
      local: localDigest,
      production: {
        app: { file: prodRefs.app.file, sha256: null, bytes: null },
        client: { file: prodRefs.client.file, sha256: null, bytes: null },
      },
      mismatches: filenameVerdict.mismatches,
      checkedAt,
    });
    return { ok: false, exitCode: 1, summaryLines: lines, report, error: NOT_YET_SERVED_MESSAGE };
  }

  // 4b. Filenames match — authoritative byte/hash check.
  /** @type {DeploymentDigest} */
  let prodDigest;
  try {
    const appBuf = await fetchProductionAsset(fetchImpl, base, prodRefs.app.path, allowedHosts);
    const clientBuf = await fetchProductionAsset(fetchImpl, base, prodRefs.client.path, allowedHosts);
    prodDigest = {
      app: digestAsset(prodRefs.app.file, appBuf),
      client: digestAsset(prodRefs.client.file, clientBuf),
    };
  } catch (err) {
    return fail(String(err.message ?? err));
  }
  lines.push(
    `Prod     App: ${prodDigest.app.file} sha256=${prodDigest.app.sha256} bytes=${prodDigest.app.bytes}`,
    `Prod  client: ${prodDigest.client.file} sha256=${prodDigest.client.sha256} bytes=${prodDigest.client.bytes}`,
  );

  const verdict = compareDeployment({ local: localDigest, production: prodDigest });
  const appOk = !verdict.mismatches.some((m) => m.startsWith('app:'));
  const clientOk = !verdict.mismatches.some((m) => m.startsWith('client:'));
  lines.push(
    `Verdict App:    ${appOk ? 'match' : 'MISMATCH'}`,
    `Verdict client: ${clientOk ? 'match' : 'MISMATCH'}`,
    `Overall: ${verdict.ok ? 'MATCH — production serves this build' : 'MISMATCH'}`,
  );

  const report = buildReport({
    host: base.origin,
    ok: verdict.ok,
    local: localDigest,
    production: prodDigest,
    mismatches: verdict.mismatches,
    checkedAt,
  });

  if (!verdict.ok) {
    return { ok: false, exitCode: 1, summaryLines: lines, report, error: verdict.mismatches.join('; ') };
  }
  return { ok: true, exitCode: 0, summaryLines: lines, report, error: null };
}

/**
 * Assemble the JSON report object.
 * @param {{ host: string, ok: boolean, local: DeploymentDigest, production: object, mismatches: string[], checkedAt: string }} args
 */
export function buildReport({ host, ok, local, production, mismatches, checkedAt }) {
  return { host, ok, local, production, mismatches, checkedAt };
}

/** Decode a Buffer/Uint8Array/string to string (utf8). */
function decode(data) {
  if (typeof data === 'string') return data;
  return Buffer.from(data).toString('utf8');
}

/**
 * Parse argv (flags) with env fallbacks.
 * @param {string[]} argv
 * @returns {{ distDir: string, baseUrl: string, jsonPath: string|null }}
 */
export function parseCliArgs(argv) {
  const out = {
    distDir: process.env.DEPLOY_DIST || 'dist',
    baseUrl: process.env.DEPLOY_BASE_URL || DEFAULT_BASE_URL,
    jsonPath: process.env.DEPLOY_JSON || null,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const v = argv[i + 1];
      if (v === undefined) throw new Error(`missing value for ${arg}`);
      i++;
      return v;
    };
    // A bare `--` is the args separator that `pnpm run <script> -- <args>`
    // forwards verbatim; skip it so the workflow's `pnpm verify:production --
    // --json <path>` reaches this parser cleanly.
    if (arg === '--') continue;
    else if (arg === '--dist') out.distDir = next();
    else if (arg === '--base') out.baseUrl = next();
    else if (arg === '--json') out.jsonPath = next();
    else if (arg.startsWith('--dist=')) out.distDir = arg.slice('--dist='.length);
    else if (arg.startsWith('--base=')) out.baseUrl = arg.slice('--base='.length);
    else if (arg.startsWith('--json=')) out.jsonPath = arg.slice('--json='.length);
    else throw new Error(`unknown argument: ${arg}`);
  }
  return out;
}

/** Wire real fetch/fs and run. Only invoked when run as a script. */
async function main() {
  let cli;
  try {
    cli = parseCliArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`verify-production-deployment: ${err.message}`);
    process.exit(2);
  }

  const readLocalFile = (relPath) => readFile(join(cli.distDir, relPath));

  const result = await runVerification({
    distDir: cli.distDir,
    baseUrl: cli.baseUrl,
    fetchImpl: fetch,
    readLocalFile,
  });

  for (const line of result.summaryLines) console.log(line);

  if (cli.jsonPath && result.report) {
    try {
      const { writeFile, mkdir } = await import('node:fs/promises');
      const { dirname } = await import('node:path');
      await mkdir(dirname(cli.jsonPath), { recursive: true });
      await writeFile(cli.jsonPath, JSON.stringify(result.report, null, 2) + '\n', 'utf8');
      console.log(`JSON report written: ${cli.jsonPath}`);
    } catch (err) {
      console.error(`verify-production-deployment: failed to write JSON report: ${err.message}`);
      process.exit(1);
    }
  }

  if (!result.ok && result.error) console.error(`verify-production-deployment: ${result.error}`);
  process.exit(result.exitCode);
}

// Run main() only when executed directly as a script (not when imported by tests).
const invokedUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedUrl) {
  main().catch((err) => {
    console.error(`verify-production-deployment: unexpected error: ${err?.stack ?? err}`);
    process.exit(1);
  });
}
