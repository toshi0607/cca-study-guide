// Verifies that the live Production deployment serves the SAME build as a local
// `dist/` build — the WHOLE deployable output, identified two ways:
//   1. the source `commit` recorded in the build manifest, and
//   2. the sha256 of EVERY served file (JS, CSS, HTML, fonts, icons, …).
// This is intentionally broader than diffing App.*.js / client.*.js alone: a
// CSS-only, HTML-metadata-only, locale-page-only, or static-asset-only change
// is still detected. See scripts/deployment-manifest.mjs for how the manifest
// is generated (at build time, and served by Vercel at /deployment-manifest.json).
//
// It also cross-checks that Production's served App island asset actually hashes
// to what Production's own manifest claims — so a stale-but-present manifest
// cannot mask a mismatched deploy.
//
// This is a fast smoke check: a single bounded fetch per resource, NO polling.
// Failing fast on a deploy race (Production still on an older build, or the new
// manifest not yet served) is intentional and preferred over hiding it.
//
// CLI / env convention (all optional):
//   --dist <dir>   | env DEPLOY_DIST      local build dir      (default: dist)
//   --base <url>   | env DEPLOY_BASE_URL  production base URL   (default: https://cca.toshi0607.com)
//                                         must be https: and host on the allowlist
//   --commit <sha> | env DEPLOY_COMMIT    the audited commit (e.g. the workflow's
//                                         checked-out main HEAD); recorded as
//                                         `testedCommit` and compared to production
//   --json <path>  | env DEPLOY_JSON      write a machine-readable JSON report
//                                         (ALWAYS written on failure too)
//
// Exit codes: 0 only when Production serves this exact build (files + commit).
// Non-zero on: missing/invalid local manifest, HTTP failure / redirect off the
// allowed host, missing/invalid production manifest, served-asset mismatch, any
// file hash difference, a differing commit, or a disallowed host.
//
// Node 22+ (global fetch, node:crypto, node:fs/promises, AbortSignal.timeout).

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { MANIFEST_FILENAME, MANIFEST_VERSION, sha256Hex } from './deployment-manifest.mjs';

/** Default production host and the host allowlist for `--base` overrides. */
export const DEFAULT_BASE_URL = 'https://cca.toshi0607.com';
export const DEFAULT_ALLOWED_HOSTS = ['cca.toshi0607.com'];

/** Bounded per-resource fetch timeout. No retries — a single fetch each. */
export const FETCH_TIMEOUT_MS = 20000;

/** Exact phrase required when Production is valid but serves an older build. */
export const NOT_YET_SERVED_MESSAGE = 'Production does not yet serve this main build';

/**
 * Extract the App island asset path from page HTML. The App island is
 * referenced as `component-url="/_astro/App.<hash>.js"`.
 * @param {string} html
 * @returns {string} the `/_astro/App.<hash>.js` path
 * @throws if it cannot be found.
 */
export function extractAppAsset(html) {
  if (typeof html !== 'string' || html.length === 0) {
    throw new Error('extractAppAsset: HTML input is empty');
  }
  const match = html.match(/\/_astro\/App\.[A-Za-z0-9_-]+\.js/);
  if (!match) throw new Error('extractAppAsset: no App island asset (/_astro/App.<hash>.js) found in HTML');
  return match[0];
}

/** The manifest key (dist-relative POSIX path) for an `/_astro/...` served path. */
export function manifestKeyForPath(assetPath) {
  return assetPath.replace(/^\/+/, '');
}

/**
 * Validate and parse a production base URL: must be https: and its host must be
 * on the allowlist. Rejects arbitrary hosts rather than accepting silently.
 * @param {string} rawBase
 * @param {string[]} [allowedHosts]
 * @returns {URL}
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
    throw new Error(`parseBaseUrl: host "${url.host}" is not allowed. Allowed hosts: ${allowedHosts.join(', ')}`);
  }
  return url;
}

/**
 * Validate a parsed manifest object shape.
 * @param {unknown} value
 * @returns {value is { version: number, commit: string | null, files: Record<string,string> }}
 */
export function isValidManifest(value) {
  if (value === null || typeof value !== 'object') return false;
  const m = /** @type {Record<string, unknown>} */ (value);
  if (m.version !== MANIFEST_VERSION) return false;
  if (!(typeof m.commit === 'string' || m.commit === null)) return false;
  if (m.files === null || typeof m.files !== 'object') return false;
  return Object.values(/** @type {Record<string, unknown>} */ (m.files)).every((h) => typeof h === 'string');
}

/**
 * Compare two build manifests. Pure — no I/O. `auditedCommit`, when given (the
 * workflow's checked-out main HEAD), is the authoritative "tested" commit and is
 * compared to Production's; otherwise the local manifest's commit is used.
 * @param {{ local: { commit: string|null, files: Record<string,string> }, production: { commit: string|null, files: Record<string,string> }, auditedCommit?: string|null }} args
 * @returns {{ ok: boolean, notYetServed: boolean, mismatches: string[], testedCommit: string|null, productionCommit: string|null }}
 */
export function compareManifests({ local, production, auditedCommit = null }) {
  const mismatches = [];
  const lf = local.files;
  const pf = production.files;

  for (const key of Object.keys(lf).sort()) {
    if (!(key in pf)) mismatches.push(`missing on production: ${key}`);
    else if (lf[key] !== pf[key]) mismatches.push(`content differs: ${key} (local ${lf[key].slice(0, 12)}… vs production ${pf[key].slice(0, 12)}…)`);
  }
  for (const key of Object.keys(pf).sort()) {
    if (!(key in lf)) mismatches.push(`extra on production: ${key}`);
  }
  const filesMatch = mismatches.length === 0;

  const testedCommit = auditedCommit ?? local.commit ?? null;
  const productionCommit = production.commit ?? null;
  let commitMismatch = false;
  if (testedCommit && productionCommit && testedCommit !== productionCommit) {
    commitMismatch = true;
    mismatches.push(`commit differs (tested ${testedCommit} vs production ${productionCommit})`);
  }

  return { ok: filesMatch && !commitMismatch, notYetServed: !filesMatch || commitMismatch, mismatches, testedCommit, productionCommit };
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

/** Fetch a URL with a bounded timeout. One shot, no retry. */
async function fetchWithTimeout(fetchImpl, url, timeoutMs) {
  try {
    return await fetchImpl(url, { redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    const reason = err && err.name === 'TimeoutError' ? `timed out after ${timeoutMs}ms` : String(err?.message ?? err);
    throw new Error(`fetch failed for ${url}: ${reason}`);
  }
}

/** GET a production resource, asserting the final host stays on the allowlist. */
async function fetchProduction(fetchImpl, url, allowedHosts) {
  const res = await fetchWithTimeout(fetchImpl, url.toString(), FETCH_TIMEOUT_MS);
  const finalHost = safeHost(res.url) ?? url.host;
  if (!allowedHosts.includes(finalHost)) {
    throw new Error(`${url} redirected off allowed host to ${finalHost}`);
  }
  return res;
}

/**
 * Core verification. All I/O is injected so this is unit-testable offline.
 * @param {Object} args
 * @param {string} args.distDir
 * @param {string} args.baseUrl
 * @param {string[]} [args.allowedHosts]
 * @param {string | null} [args.auditedCommit]
 * @param {typeof fetch} args.fetchImpl
 * @param {(relPath: string) => Promise<Buffer|Uint8Array|string>} args.readLocalFile reads a path relative to distDir
 * @param {() => Date} [args.now]
 * @returns {Promise<{ ok: boolean, exitCode: number, summaryLines: string[], report: object, error: string|null }>}
 */
export async function runVerification({
  distDir,
  baseUrl,
  allowedHosts = DEFAULT_ALLOWED_HOSTS,
  auditedCommit = null,
  fetchImpl,
  readLocalFile,
  now = () => new Date(),
}) {
  const lines = [];
  const checkedAt = now().toISOString();
  let host = baseUrl;

  /**
   * @param {string} stage @param {string} msg
   * @param {{ testedCommit?: string|null, productionCommit?: string|null, mismatches?: string[] }} [extra]
   */
  const fail = (stage, msg, extra = {}) => {
    const report = buildReport({
      ok: false,
      stage,
      host,
      testedCommit: auditedCommit ?? extra.testedCommit ?? null,
      productionCommit: extra.productionCommit ?? null,
      mismatches: extra.mismatches ?? [],
      error: msg,
      checkedAt,
    });
    return { ok: false, exitCode: 1, summaryLines: lines, report, error: msg };
  };

  // 0. base URL
  let base;
  try {
    base = parseBaseUrl(baseUrl, allowedHosts);
    host = base.origin;
  } catch (err) {
    return fail('parse-base-url', String(err.message ?? err));
  }
  lines.push(`Tested host: ${host}`);

  // 1. local manifest (built by astro:build:done)
  let localManifest;
  try {
    const raw = decode(await readLocalFile(MANIFEST_FILENAME));
    localManifest = JSON.parse(raw);
  } catch {
    return fail('read-local-manifest', `local build manifest not found or invalid: ${join(distDir, MANIFEST_FILENAME)}. Run \`pnpm build\` first.`);
  }
  if (!isValidManifest(localManifest)) {
    return fail('read-local-manifest', `local manifest has an unexpected shape (expected version ${MANIFEST_VERSION}).`);
  }
  const testedCommit = auditedCommit ?? localManifest.commit ?? null;
  lines.push(`Tested commit: ${testedCommit ?? '(unknown)'} — ${Object.keys(localManifest.files).length} files`);

  // 2. production manifest
  let productionManifest;
  try {
    const res = await fetchProduction(fetchImpl, new URL(`/${MANIFEST_FILENAME}`, base), allowedHosts);
    if (res.status === 404) {
      lines.push(NOT_YET_SERVED_MESSAGE, `(production does not serve /${MANIFEST_FILENAME})`);
      return fail('fetch-production-manifest', NOT_YET_SERVED_MESSAGE, { testedCommit });
    }
    if (res.status !== 200) {
      return fail('fetch-production-manifest', `production /${MANIFEST_FILENAME} returned HTTP ${res.status}`, { testedCommit });
    }
    productionManifest = JSON.parse(await res.text());
  } catch (err) {
    return fail('fetch-production-manifest', String(err.message ?? err), { testedCommit });
  }
  if (!isValidManifest(productionManifest)) {
    return fail('fetch-production-manifest', `production manifest has an unexpected shape (expected version ${MANIFEST_VERSION}).`, { testedCommit });
  }
  const productionCommit = productionManifest.commit ?? null;
  lines.push(`Production commit: ${productionCommit ?? '(unknown)'} — ${Object.keys(productionManifest.files).length} files`);

  // 3. anti-staleness cross-check: the App island asset Production actually
  //    serves must hash to what Production's own manifest claims.
  try {
    const htmlRes = await fetchProduction(fetchImpl, new URL('/', base), allowedHosts);
    if (htmlRes.status !== 200) throw new Error(`production / returned HTTP ${htmlRes.status}`);
    const appPath = extractAppAsset(await htmlRes.text());
    const key = manifestKeyForPath(appPath);
    const claimed = productionManifest.files[key];
    if (!claimed) {
      return fail('verify-served-asset', `production serves ${appPath} but its manifest has no entry for ${key}`, { testedCommit, productionCommit });
    }
    const assetRes = await fetchProduction(fetchImpl, new URL(appPath, base), allowedHosts);
    if (assetRes.status !== 200) throw new Error(`production asset ${appPath} returned HTTP ${assetRes.status}`);
    const served = sha256Hex(Buffer.from(await assetRes.arrayBuffer()));
    if (served !== claimed) {
      return fail('verify-served-asset', `production manifest is stale: served ${appPath} sha256 ${served.slice(0, 12)}… != manifest ${claimed.slice(0, 12)}…`, { testedCommit, productionCommit });
    }
    lines.push(`Served-asset cross-check: ${appPath} matches production manifest`);
  } catch (err) {
    return fail('verify-served-asset', String(err.message ?? err), { testedCommit, productionCommit });
  }

  // 4. full manifest comparison (files + commit)
  const verdict = compareManifests({ local: localManifest, production: productionManifest, auditedCommit });
  if (!verdict.ok) {
    lines.push(`Mismatches (${verdict.mismatches.length}):`);
    for (const m of verdict.mismatches.slice(0, 20)) lines.push(`  - ${m}`);
    if (verdict.mismatches.length > 20) lines.push(`  … and ${verdict.mismatches.length - 20} more`);
    if (verdict.notYetServed) lines.push(NOT_YET_SERVED_MESSAGE);
    const report = buildReport({
      ok: false, stage: 'compare-manifests', host,
      testedCommit: verdict.testedCommit, productionCommit: verdict.productionCommit,
      mismatches: verdict.mismatches, error: verdict.mismatches.join('; '), checkedAt,
    });
    return { ok: false, exitCode: 1, summaryLines: lines, report, error: NOT_YET_SERVED_MESSAGE };
  }

  lines.push(`Overall: MATCH — production serves this build (${Object.keys(localManifest.files).length} files, commit ${verdict.testedCommit ?? '(unknown)'})`);
  const report = buildReport({
    ok: true, stage: 'complete', host,
    testedCommit: verdict.testedCommit, productionCommit: verdict.productionCommit,
    mismatches: [], error: null, checkedAt,
  });
  return { ok: true, exitCode: 0, summaryLines: lines, report, error: null };
}

/**
 * Assemble the JSON report object. Always returned (never null), even on early
 * failures, so the workflow artifact always explains what happened.
 * @param {{ ok: boolean, stage: string, host: string, testedCommit: string|null, productionCommit: string|null, mismatches: string[], error: string|null, checkedAt: string }} args
 */
export function buildReport({ ok, stage, host, testedCommit, productionCommit, mismatches, error, checkedAt }) {
  return { ok, stage, host, testedCommit, productionCommit, mismatches, error, checkedAt };
}

/** Decode a Buffer/Uint8Array/string to string (utf8). */
function decode(data) {
  if (typeof data === 'string') return data;
  return Buffer.from(data).toString('utf8');
}

/**
 * Parse argv (flags) with env fallbacks.
 * @param {string[]} argv
 * @returns {{ distDir: string, baseUrl: string, jsonPath: string|null, commit: string|null }}
 */
export function parseCliArgs(argv) {
  const out = {
    distDir: process.env.DEPLOY_DIST || 'dist',
    baseUrl: process.env.DEPLOY_BASE_URL || DEFAULT_BASE_URL,
    jsonPath: process.env.DEPLOY_JSON || null,
    commit: process.env.DEPLOY_COMMIT || null,
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
    // forwards verbatim; skip it so `pnpm verify:production -- --json <path>`
    // reaches this parser cleanly.
    if (arg === '--') continue;
    else if (arg === '--dist') out.distDir = next();
    else if (arg === '--base') out.baseUrl = next();
    else if (arg === '--json') out.jsonPath = next();
    else if (arg === '--commit') out.commit = next();
    else if (arg.startsWith('--dist=')) out.distDir = arg.slice('--dist='.length);
    else if (arg.startsWith('--base=')) out.baseUrl = arg.slice('--base='.length);
    else if (arg.startsWith('--json=')) out.jsonPath = arg.slice('--json='.length);
    else if (arg.startsWith('--commit=')) out.commit = arg.slice('--commit='.length);
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

  const result = await runVerification({
    distDir: cli.distDir,
    baseUrl: cli.baseUrl,
    auditedCommit: cli.commit,
    fetchImpl: fetch,
    readLocalFile: (relPath) => readFile(join(cli.distDir, relPath)),
  });

  for (const line of result.summaryLines) console.log(line);

  // The report is ALWAYS written when a path is given — including on failure —
  // so the CI artifact alone explains what happened.
  if (cli.jsonPath) {
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

const invokedUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedUrl) {
  main().catch((err) => {
    console.error(`verify-production-deployment: unexpected error: ${err?.stack ?? err}`);
    process.exit(1);
  });
}
