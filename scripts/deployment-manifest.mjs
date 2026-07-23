// Deployment manifest: a deterministic fingerprint of the ENTIRE static build
// output, so a Production deploy can be proven to serve a specific commit's
// build — not just its two JS island assets. Generated at build time (both
// locally and on Vercel via the astro:build:done hook in astro.config.mjs) and
// written to `dist/deployment-manifest.json`, which Vercel then serves at
// `/deployment-manifest.json`.
//
// The manifest carries:
//   - `commit`: the source commit (VERCEL_GIT_COMMIT_SHA on Vercel, else the
//     local git HEAD) — the authoritative "which build" identity.
//   - `files`: sha256 of every served file under dist (the manifest itself
//     excluded), so a CSS-only / HTML-metadata-only / static-asset-only change
//     is still detected even when App.*.js and client.*.js are unchanged.
//
// HTML files are normalized before hashing to strip the only two tokens that
// legitimately vary between two builds of the SAME source: the GA measurement
// id (env-dependent) and the per-build random `astro-island uid`. These are
// verified to be the ONLY non-deterministic HTML tokens for this app; any other
// change to HTML content still changes the hash. Non-HTML files are hashed raw.

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

/** The served filename of the manifest (excluded from its own `files` map). */
export const MANIFEST_FILENAME = 'deployment-manifest.json';

/** Schema version of the manifest shape, so the verifier can guard on it. */
export const MANIFEST_VERSION = 1;

/**
 * Normalize the two build/env-variable tokens in an HTML document so that two
 * builds of the same source hash identically:
 *   - the GA measurement id `G-XXXXXXXXXX` (differs per environment), and
 *   - the random `astro-island uid="..."` (differs per build).
 * Every other byte of the HTML is preserved, so a real content/metadata change
 * still changes the hash.
 * @param {string} html
 * @returns {string}
 */
export function normalizeHtml(html) {
  return html
    .replace(/G-[A-Z0-9]{6,}/g, 'G-NORMALIZED')
    .replace(/(<astro-island\b[^>]*?\buid=")[^"]*(")/g, '$1NORMALIZED$2');
}

/** sha256 hex of a Buffer/Uint8Array/string. */
export function sha256Hex(data) {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Hash one file for the manifest: HTML is normalized then hashed as utf8; every
 * other file is hashed raw.
 * @param {string} relPath POSIX-style path relative to dist root
 * @param {Buffer} buffer
 * @returns {string}
 */
export function hashManifestEntry(relPath, buffer) {
  if (relPath.endsWith('.html')) {
    return sha256Hex(normalizeHtml(buffer.toString('utf8')));
  }
  return sha256Hex(buffer);
}

/** Recursively list every file under `dir`, returned as POSIX paths relative to it. */
async function listFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await listFiles(full, base)));
    } else if (entry.isFile()) {
      out.push(relative(base, full).split(sep).join('/'));
    }
  }
  return out;
}

/**
 * Resolve the source commit for the manifest: Vercel's build env first, then a
 * local git HEAD, then null. Never throws.
 * @returns {string | null}
 */
export function resolveCommit() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return process.env.GITHUB_SHA || null;
  }
}

/**
 * Build the manifest object for a dist directory (pure except for reading the
 * files it is told about). Keys are sorted for a stable output.
 * @param {string} distDir
 * @param {(relPath: string) => Promise<Buffer>} readFileFor
 * @param {string | null} commit
 * @returns {Promise<{ version: number, commit: string | null, files: Record<string,string> }>}
 */
export async function buildManifest(distDir, readFileFor, commit) {
  const relPaths = (await listFiles(distDir)).filter((p) => p !== MANIFEST_FILENAME).sort();
  /** @type {Record<string,string>} */
  const files = {};
  for (const relPath of relPaths) {
    files[relPath] = hashManifestEntry(relPath, await readFileFor(relPath));
  }
  return { version: MANIFEST_VERSION, commit, files };
}

/**
 * Generate `dist/deployment-manifest.json`. Invoked from the astro:build:done
 * hook and from the `build` script, so both local and Vercel builds produce it.
 * @param {string} distDir absolute path to the build output directory
 * @returns {Promise<{ version: number, commit: string | null, files: Record<string,string> }>}
 */
export async function generateDeploymentManifest(distDir) {
  const manifest = await buildManifest(
    distDir,
    (relPath) => readFile(join(distDir, relPath)),
    resolveCommit(),
  );
  await writeFile(join(distDir, MANIFEST_FILENAME), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return manifest;
}
