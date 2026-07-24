#!/usr/bin/env node
// Guards the design-token system. Fails when an area stylesheet reintroduces a
// raw value that the token layer (src/styles/tokens.css) is meant to own — the
// exact drift the design-consistency refactor removed (see tasks/design-system.md).
// Mirrors the custom-guard pattern of scripts/check-initial-bundle.mjs.
//
// Scanned: src/styles/*.css, except tokens.css (which DEFINES the values).
//   1. raw-hex        a #rgb / #rrggbb literal            -> use a --token
//                     (operands inside color-mix() are allowed: a blend maths
//                      value, not a palette choice)
//   2. raw-font-size  a rem/px literal in `font-size:` or
//                     the size slot of a `font:` shorthand -> use --fs-*
//   3. important      an !important declaration            -> raise specificity
//
// A single line opts out with a trailing `/* ds-allow: <reason> */` marker — the
// same escape hatch as eslint-disable. Every marker is a reviewed, documented
// exception; keep the reason honest (display figures & the grid/print overrides
// per tasks/design-system.md §2).

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// A valid opt-out is `/* ds-allow: <reason> */` at the END of a line (an optional
// closing brace may follow). Requiring the colon+reason and the end-of-line
// anchor stops a marker at the start of a line from silently exempting a whole
// rule, and stops empty, meaningless exemptions.
const ALLOW = /\/\*\s*ds-allow:\s*\S.*?\*\/\s*}?\s*$/;
const HEX = /#[0-9a-fA-F]{3,8}\b/;
const IMPORTANT = /!important/;

function stripFns(code) {
  // Drop var(...) first — it holds a ) that would truncate a naive color-mix
  // match, and never contains a hex literal — then remove color-mix() blends so
  // a hex operand inside a blend is not flagged as a raw palette colour.
  return code.replace(/var\([^)]*\)/g, '').replace(/color-mix\([^)]*\)/g, '');
}

// A raw rem/px used as a font SIZE (not a line-height, which lives after `/`).
// `decl` is a single declaration with its whitespace already collapsed, so a
// property split across several source lines is inspected as one string.
function hasRawFontSize(decl) {
  const fontSize = decl.match(/font-size:\s*([^;{}]+)/);
  if (fontSize && /[\d.]+(?:rem|px)\b/.test(fontSize[1])) return true;
  const shorthand = decl.match(/(?:^|[;{\s])font:\s*([^;{}]+)/);
  if (shorthand) {
    const sizeSlot = shorthand[1].split('/')[0]; // size is before any /line-height
    if (/[\d.]+(?:rem|px)\b/.test(sizeSlot)) return true;
  }
  return false;
}

// Replace every comment's body with spaces, preserving newlines and length so
// character offsets still map to the original line numbers.
function blankComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

// Scans by DECLARATION, not by line: the comment-free source is split on
// ; { } and each chunk's whitespace is collapsed before the checks, so
// `font-size:\n  2rem;` is caught exactly like `font-size: 2rem;`.
export function scanCss(name, text) {
  const findings = [];
  const rawLines = text.split('\n');
  const allowLines = new Set(rawLines.map((l, i) => (ALLOW.test(l) ? i : -1)).filter((i) => i >= 0));

  const code = blankComments(text);
  const chunkRe = /[^;{}]+/g;
  let m;
  while ((m = chunkRe.exec(code)) !== null) {
    const chunk = m[0];
    if (!chunk.trim()) continue;
    const startLine = code.slice(0, m.index).split('\n').length - 1;
    const endLine = startLine + (chunk.match(/\n/g)?.length ?? 0);
    let allowed = false;
    for (let l = startLine; l <= endLine && !allowed; l++) if (allowLines.has(l)) allowed = true;
    if (allowed) continue;

    const decl = chunk.replace(/\s+/g, ' ').trim();
    const at = { file: name, line: startLine + 1, text: decl };
    if (HEX.test(stripFns(decl))) findings.push({ ...at, rule: 'raw-hex' });
    else if (hasRawFontSize(decl)) findings.push({ ...at, rule: 'raw-font-size' });
    if (IMPORTANT.test(decl)) findings.push({ ...at, rule: 'important' });
  }
  return findings;
}

const HINT = {
  'raw-hex': 'use a --token from tokens.css (or wrap the blend in color-mix())',
  'raw-font-size': 'use a --fs-* size token',
  'important': 'raise the selector specificity instead',
};

function main() {
  const dir = fileURLToPath(new URL('../src/styles/', import.meta.url));
  const files = readdirSync(dir).filter((f) => f.endsWith('.css') && f !== 'tokens.css');
  const findings = files.flatMap((f) => scanCss(f, readFileSync(dir + f, 'utf8')));

  if (findings.length === 0) {
    console.log(`check-design-tokens: OK — ${files.length} stylesheets, no raw design values outside tokens.css.`);
    return;
  }
  console.error(`check-design-tokens: ${findings.length} raw design value(s) that the token layer should own:\n`);
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line}  [${f.rule}] ${HINT[f.rule]}`);
    console.error(`    ${f.text}`);
  }
  console.error('\nFix by using a token, or opt out on that line with a trailing');
  console.error('`/* ds-allow: <reason> */` marker (see tasks/design-system.md §2).');
  process.exit(1);
}

// Run only as a CLI; stays importable for scripts/check-design-tokens.test.mjs.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
