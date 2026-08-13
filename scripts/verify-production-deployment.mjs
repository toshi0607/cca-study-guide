// Verifies that the live Production deployment serves the SAME build as a local
// `dist/` build. The trusted local deployment manifest is the root of trust:
// every path in its inventory is fetched from Production and its served bytes
// are hashed locally.
// This is intentionally broader than diffing App.*.js / client.*.js alone: a
// CSS-only, HTML-metadata-only, locale-page-only, or static-asset-only change
// is still detected. See scripts/deployment-manifest.mjs for how the manifest
// is generated (at build time, and served by Vercel at /deployment-manifest.json).
//
// Production's deployment manifest is compared as supplementary deployment
// metadata only. It is never used as evidence for the bytes Production serves.
//
// This is a fast smoke check: a single bounded request chain per resource, NO polling.
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
import { MANIFEST_FILENAME, MANIFEST_VERSION, hashManifestEntry, sha256Hex } from './deployment-manifest.mjs';

/** Default production host and the host allowlist for `--base` overrides. */
export const DEFAULT_BASE_URL = 'https://cca.toshi0607.com';
export const DEFAULT_ALLOWED_HOSTS = ['cca.toshi0607.com'];

/** Bounded per-resource fetch timeout. No retries — a single fetch each. */
export const FETCH_TIMEOUT_MS = 20000;

/** Maximum number of explicitly validated redirects per production request. */
export const MAX_REDIRECT_HOPS = 5;

/** Exact phrase required when Production is valid but serves an older build. */
export const NOT_YET_SERVED_MESSAGE = 'Production does not yet serve this main build';

/** True only for one canonical relative build-output path. */
export function isSafeManifestKey(key) {
  return typeof key === 'string'
    && key.length > 0
    && !key.startsWith('/')
    && !key.includes('\\')
    && !key.includes('?')
    && !key.includes('#')
    && !key.includes('%')
    && !/[\u0000-\u001F\u007F]/.test(key)
    && !/^[A-Za-z][A-Za-z0-9+.-]*:/.test(key)
    && !key.split('/').some((part) => part === '' || part === '.' || part === '..');
}

/**
 * Convert one local-manifest key into a safe same-origin production URL.
 * Manifest keys are paths, never URL references: reject ambiguous encodings and
 * traversal rather than letting URL parsing silently reinterpret them.
 * @param {URL} base
 * @param {string} key
 * @param {string[]} allowedHosts
 * @returns {URL}
 */
export function productionUrlForManifestKey(base, key, allowedHosts) {
  if (!isSafeManifestKey(key)) throw new Error(`unsafe manifest path: ${String(key)}`);
  const url = new URL(`/${key}`, base);
  assertAllowedRequestUrl(url, allowedHosts, 'manifest path');
  return url;
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
  if (url.username || url.password) {
    throw new Error(`parseBaseUrl: base URL must not include credentials — ${rawBase}`);
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
  if (m.files === null || typeof m.files !== 'object' || Array.isArray(m.files)) return false;
  const entries = Object.entries(/** @type {Record<string, unknown>} */ (m.files));
  return entries.length > 0
    && entries.every(([key, hash]) => isSafeManifestKey(key) && typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash));
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
  if (testedCommit && testedCommit !== productionCommit) {
    commitMismatch = true;
    mismatches.push(`commit differs (tested ${testedCommit} vs production ${productionCommit ?? '(unknown)'})`);
  }

  return { ok: filesMatch && !commitMismatch, notYetServed: !filesMatch || commitMismatch, mismatches, testedCommit, productionCommit };
}

/** Reject a URL before it is passed to fetch. */
function assertAllowedRequestUrl(url, allowedHosts, label) {
  if (url.protocol !== 'https:') throw new Error(`${label} must use https: (got ${url.protocol})`);
  if (url.username || url.password) throw new Error(`${label} must not include credentials`);
  if (!allowedHosts.includes(url.host)) throw new Error(`${label} host "${url.host}" is not allowed. Allowed hosts: ${allowedHosts.join(', ')}`);
}

/** Fetch a URL with a bounded timeout. One shot, no retry. */
async function fetchWithTimeout(fetchImpl, url, signal, timeoutMs) {
  try {
    return await fetchImpl(url, { redirect: 'manual', credentials: 'omit', signal });
  } catch (err) {
    const reason = err && err.name === 'TimeoutError' ? `timed out after ${timeoutMs}ms` : String(err?.message ?? err);
    throw new Error(`fetch failed for ${url}: ${reason}`);
  }
}

/** GET a production resource, validating the initial URL and every redirect before fetch. */
async function fetchProduction(fetchImpl, url, allowedHosts) {
  let current = url;
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  for (let hops = 0; ; hops++) {
    assertAllowedRequestUrl(current, allowedHosts, 'production request');
    const res = await fetchWithTimeout(fetchImpl, current.toString(), signal, FETCH_TIMEOUT_MS);
    if (![301, 302, 303, 307, 308].includes(res.status)) return res;
    if (hops >= MAX_REDIRECT_HOPS) throw new Error(`too many redirects (maximum ${MAX_REDIRECT_HOPS}) for ${url}`);
    const location = res.headers?.get?.('location');
    if (!location) throw new Error(`redirect from ${current} is missing a Location header`);
    try {
      current = new URL(location, current);
    } catch {
      throw new Error(`redirect from ${current} has an invalid Location header`);
    }
    // Checked here, before the next loop can give this URL to fetchImpl.
    assertAllowedRequestUrl(current, allowedHosts, 'redirect target');
  }
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
  let localManifestBytes;
  try {
    localManifestBytes = Buffer.from(await readLocalFile(MANIFEST_FILENAME));
    localManifest = JSON.parse(decode(localManifestBytes));
  } catch {
    return fail('read-local-manifest', `local build manifest not found or invalid: ${join(distDir, MANIFEST_FILENAME)}. Run \`pnpm build\` first.`);
  }
  if (!isValidManifest(localManifest)) {
    return fail('read-local-manifest', `local manifest has an unexpected shape (expected version ${MANIFEST_VERSION}).`);
  }
  const testedCommit = auditedCommit ?? localManifest.commit ?? null;
  lines.push(`Tested commit: ${testedCommit ?? '(unknown)'} — ${Object.keys(localManifest.files).length} files`);

  // 2. Fetch every file named by the trusted local manifest. Production cannot
  //    make this pass by serving an unchanged/self-consistent manifest: the
  //    bytes are compared directly to local expected hashes.
  const servedMismatches = [];
  for (const key of Object.keys(localManifest.files).sort()) {
    let url;
    try {
      url = productionUrlForManifestKey(base, key, allowedHosts);
    } catch (err) {
      return fail('validate-local-inventory', String(err.message ?? err), { testedCommit });
    }
    try {
      const res = await fetchProduction(fetchImpl, url, allowedHosts);
      if (res.status !== 200) {
        servedMismatches.push(`production ${key} returned HTTP ${res.status}`);
        continue;
      }
      const servedHash = hashManifestEntry(key, Buffer.from(await res.arrayBuffer()));
      const expectedHash = localManifest.files[key];
      if (servedHash !== expectedHash) {
        servedMismatches.push(`served content differs: ${key} (local ${expectedHash.slice(0, 12)}… vs production ${servedHash.slice(0, 12)}…)`);
      }
    } catch (err) {
      return fail('verify-served-files', String(err.message ?? err), { testedCommit });
    }
  }
  if (servedMismatches.length) {
    lines.push(`Served-file mismatches (${servedMismatches.length}):`);
    for (const mismatch of servedMismatches.slice(0, 20)) lines.push(`  - ${mismatch}`);
    if (servedMismatches.length > 20) lines.push(`  … and ${servedMismatches.length - 20} more`);
    lines.push(NOT_YET_SERVED_MESSAGE);
    return fail('verify-served-files', NOT_YET_SERVED_MESSAGE, { testedCommit, mismatches: servedMismatches });
  }
  lines.push(`Served-file verification: ${Object.keys(localManifest.files).length} local-manifest files match`);

  // 3. Production's self-reported manifest is useful supplementary deployment
  //    metadata (commit and inventory), but never substitutes for the direct
  //    served-file comparison above.
  let productionManifest;
  let productionManifestBytes;
  try {
    const res = await fetchProduction(fetchImpl, new URL(`/${MANIFEST_FILENAME}`, base), allowedHosts);
    if (res.status === 404) {
      lines.push(NOT_YET_SERVED_MESSAGE, `(production does not serve /${MANIFEST_FILENAME})`);
      return fail('fetch-production-manifest', NOT_YET_SERVED_MESSAGE, { testedCommit });
    }
    if (res.status !== 200) {
      return fail('fetch-production-manifest', `production /${MANIFEST_FILENAME} returned HTTP ${res.status}`, { testedCommit });
    }
    productionManifestBytes = Buffer.from(await res.arrayBuffer());
    productionManifest = JSON.parse(decode(productionManifestBytes));
  } catch (err) {
    return fail('fetch-production-manifest', String(err.message ?? err), { testedCommit });
  }
  if (!isValidManifest(productionManifest)) {
    return fail('fetch-production-manifest', `production manifest has an unexpected shape (expected version ${MANIFEST_VERSION}).`, { testedCommit });
  }
  const productionCommit = productionManifest.commit ?? null;
  lines.push(`Production commit: ${productionCommit ?? '(unknown)'} — ${Object.keys(productionManifest.files).length} files`);

  const localManifestHash = sha256Hex(localManifestBytes);
  const productionManifestHash = sha256Hex(productionManifestBytes);
  const receiptMismatch = localManifestHash !== productionManifestHash
    ? `production manifest receipt differs (local ${localManifestHash.slice(0, 12)}… vs production ${productionManifestHash.slice(0, 12)}…)`
    : null;
  if (!receiptMismatch) lines.push('Production-manifest receipt: raw bytes match local manifest');

  // 4. Supplementary production-manifest comparison (files + commit).
  const verdict = compareManifests({ local: localManifest, production: productionManifest, auditedCommit });
  const manifestMismatches = receiptMismatch ? [...verdict.mismatches, receiptMismatch] : verdict.mismatches;
  if (manifestMismatches.length) {
    lines.push(`Production-manifest evidence mismatches (${manifestMismatches.length}):`);
    for (const m of manifestMismatches.slice(0, 20)) lines.push(`  - ${m}`);
    if (manifestMismatches.length > 20) lines.push(`  … and ${manifestMismatches.length - 20} more`);
    if (verdict.notYetServed || receiptMismatch) lines.push(NOT_YET_SERVED_MESSAGE);
    const report = buildReport({
      ok: false, stage: 'compare-production-manifest', host,
      testedCommit: verdict.testedCommit, productionCommit: verdict.productionCommit,
      mismatches: manifestMismatches, error: manifestMismatches.join('; '), checkedAt,
    });
    return { ok: false, exitCode: 1, summaryLines: lines, report, error: NOT_YET_SERVED_MESSAGE };
  }

  lines.push(`Overall: MATCH — every local-manifest file served by production matches (${Object.keys(localManifest.files).length} files, commit ${verdict.testedCommit ?? '(unknown)'}). This cannot enumerate unknown extra production files.`);
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
