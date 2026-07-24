import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Guardrail for the Content-Security-Policy in vercel.json.
//
// This static site ships a header-based CSP whose `script-src` intentionally
// omits 'unsafe-inline'. Astro emits a small number of inline <script> elements
// that cannot be externalised: the island hydration bootstrap (on pages with a
// `client:*` component) and the Google Analytics init module. Each such inline
// script is allowed by a sha256 hash listed in `script-src`.
//
// Those hashes are byte-derived, so an Astro upgrade or an edit to the GA init
// script changes them. This check recomputes the hashes from the built `dist/`
// and fails when any inline script is not covered by vercel.json — turning a
// silent production CSP breakage into a loud, actionable build failure.
//
// Usage: build first (GA-enabled build covers the most inline scripts), then run
//   PUBLIC_GA_MEASUREMENT_ID=G-TEST123456 astro build && node scripts/check-csp-hashes.mjs

const SCRIPT_TAG = /<script([^>]*)>([\s\S]*?)<\/script>/gi;

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? htmlFiles(path) : path.endsWith('.html') ? [path] : [];
    }),
  );
  return nested.flat();
}

function sha256(content) {
  return `sha256-${createHash('sha256').update(content, 'utf8').digest('base64')}`;
}

function inlineScriptHashes(html) {
  const hashes = new Set();
  for (const [, attributes, body] of html.matchAll(SCRIPT_TAG)) {
    if (/\bsrc\s*=/i.test(attributes)) continue; // external script, governed by host allow-list
    if (body.trim() === '') continue;
    hashes.add(sha256(body));
  }
  return hashes;
}

function cspScriptHashes(vercelJson) {
  const header = vercelJson.headers
    ?.flatMap((entry) => entry.headers ?? [])
    .find((h) => h.key.toLowerCase() === 'content-security-policy');
  if (!header) throw new Error('vercel.json is missing a Content-Security-Policy header.');
  const scriptSrc = header.value
    .split(';')
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith('script-src'));
  if (!scriptSrc) throw new Error('The Content-Security-Policy header is missing a script-src directive.');
  return new Set([...scriptSrc.matchAll(/'(sha256-[^']+)'/g)].map((match) => match[1]));
}

const dist = 'dist';
const files = await htmlFiles(dist);
if (files.length === 0) throw new Error(`No HTML found under ${dist}/. Run \`astro build\` first.`);

const foundInDist = new Map(); // hash -> example file
for (const file of files) {
  const html = await readFile(file, 'utf8');
  for (const hash of inlineScriptHashes(html)) {
    if (!foundInDist.has(hash)) foundInDist.set(hash, file);
  }
}

const vercelJson = JSON.parse(await readFile('vercel.json', 'utf8'));
const allowed = cspScriptHashes(vercelJson);

const missing = [...foundInDist].filter(([hash]) => !allowed.has(hash));
if (missing.length) {
  const lines = missing.map(([hash, file]) => `  ${hash}  (first seen in ${file})`);
  throw new Error(
    `Inline <script> elements in dist/ are not allow-listed by script-src in vercel.json.\n` +
      `Add these hashes to the script-src directive (they change when Astro or the GA init script changes):\n` +
      lines.join('\n'),
  );
}

console.log(`All ${foundInDist.size} distinct inline script hash(es) in dist/ are covered by vercel.json script-src.`);
