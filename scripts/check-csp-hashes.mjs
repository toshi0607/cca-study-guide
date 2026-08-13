import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Guardrail for the Content-Security-Policy in vercel.json.
//
// This static site ships a header-based CSP whose `script-src` intentionally
// omits 'unsafe-inline'. Astro emits a small number of inline <script> elements
// that cannot be externalised: the island hydration bootstrap (on pages with a
// `client:*` component). Each such inline script is allowed by a sha256 hash
// listed in `script-src`.
//
// Those hashes are byte-derived, so an Astro upgrade changes them. This check
// recomputes the hashes from the built `dist/`
// and fails when any inline script is not covered by vercel.json — turning a
// silent production CSP breakage into a loud, actionable build failure.
//
// Usage: build first, then run
//   astro build && node scripts/check-csp-hashes.mjs

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
    if (/\bsrc\s*=/i.test(attributes)) continue; // external scripts are forbidden by this app's script-src
    if (body.trim() === '') continue;
    hashes.add(sha256(body));
  }
  return hashes;
}

export function cspScriptHashes(vercelJson) {
  const header = vercelJson.headers
    ?.flatMap((entry) => entry.headers ?? [])
    .find((h) => h.key.toLowerCase() === 'content-security-policy');
  if (!header) throw new Error('vercel.json is missing a Content-Security-Policy header.');
  const overrides = ['script-src-elem', 'script-src-attr'].filter((name) => findCspDirective(header.value, name));
  if (overrides.length) {
    throw new Error(
      `${overrides.join(' and ')} must not be defined. ` +
        `Remove these directives so script-src remains the single mechanically verified script capability boundary.`,
    );
  }
  const scriptSrc = findCspDirective(header.value, 'script-src');
  if (!scriptSrc) throw new Error('The Content-Security-Policy header is missing a script-src directive.');
  const tokens = scriptSrc.split(/\s+/).slice(1);
  const hashes = new Set();
  for (const token of tokens) {
    if (token === "'self'") continue;
    const hash = token.match(/^'(sha(?:256|384|512)-[^']+)'$/)?.[1];
    if (hash) {
      hashes.add(hash);
      continue;
    }
    throw new Error(
      `script-src contains unsupported capability ${token}. ` +
        `This app permits only 'self' and exact sha256/sha384/sha512 hashes; remove hosts, nonces, unsafe-inline, and other sources.`,
    );
  }
  return hashes;
}

/** Find one CSP directive by its exact, case-insensitive directive name. */
export function findCspDirective(policy, name) {
  const expected = name.toLowerCase();
  return policy
    .split(';')
    .map((directive) => directive.trim())
    .find((directive) => directive.split(/\s+/, 1)[0]?.toLowerCase() === expected);
}

export async function checkCspHashes({ dist = 'dist', vercelPath = 'vercel.json' } = {}) {
  const files = await htmlFiles(dist);
  if (files.length === 0) throw new Error(`No HTML found under ${dist}/. Run \`astro build\` first.`);

  const foundInDist = new Map(); // hash -> example file
  for (const file of files) {
    const html = await readFile(file, 'utf8');
    for (const hash of inlineScriptHashes(html)) {
      if (!foundInDist.has(hash)) foundInDist.set(hash, file);
    }
  }

  const vercelJson = JSON.parse(await readFile(vercelPath, 'utf8'));
  const allowed = cspScriptHashes(vercelJson);

  const missing = [...foundInDist].filter(([hash]) => !allowed.has(hash));
  if (missing.length) {
    const lines = missing.map(([hash, file]) => `  ${hash}  (first seen in ${file})`);
    throw new Error(
      `Inline <script> elements in dist/ are not allow-listed by script-src in vercel.json.\n` +
        `Add these hashes to the script-src directive (they change when Astro changes):\n` +
        lines.join('\n'),
    );
  }

  const stale = [...allowed].filter((hash) => !foundInDist.has(hash));
  if (stale.length) {
    throw new Error(
      `script-src in vercel.json contains inline-script hashes that are not present in dist/.\n` +
        `Remove these stale capabilities from the CSP:\n` +
        stale.map((hash) => `  ${hash}`).join('\n'),
    );
  }

  return foundInDist.size;
}

const invokedUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedUrl) {
  const count = await checkCspHashes();
  console.log(`CSP exactly matches all ${count} distinct inline script hash(es) in dist/.`);
}
