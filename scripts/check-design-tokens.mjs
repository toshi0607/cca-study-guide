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

const ALLOW = /\/\*\s*ds-allow\b/;
const HEX = /#[0-9a-fA-F]{3,8}\b/;
const IMPORTANT = /!important/;

function stripColorMix(code) {
  // Drop var(...) first — it holds a ) that would truncate a naive color-mix
  // match, and never contains a hex literal — then remove color-mix() blends so
  // a hex operand inside a blend is not flagged as a raw palette colour.
  return code.replace(/var\([^)]*\)/g, '').replace(/color-mix\([^)]*\)/g, '');
}

// A raw rem/px used as a font SIZE (not a line-height, which lives after `/`).
function hasRawFontSize(code) {
  const fontSize = code.match(/font-size:\s*([^;{}]+)/);
  if (fontSize && /[\d.]+(?:rem|px)\b/.test(fontSize[1])) return true;
  const shorthand = code.match(/(?:^|[;{\s])font:\s*([^;{}]+)/);
  if (shorthand) {
    const sizeSlot = shorthand[1].split('/')[0]; // size is before any /line-height
    if (/[\d.]+(?:rem|px)\b/.test(sizeSlot)) return true;
  }
  return false;
}

// Returns the code on `line` with comments removed, threading multi-line block
// comments through `state.inBlock`. The ds-allow marker is read from the raw
// line separately, so stripping the comment here does not hide the opt-out.
function codeOutsideComments(line, state) {
  let code = '';
  let rest = line;
  while (rest.length) {
    if (state.inBlock) {
      const end = rest.indexOf('*/');
      if (end === -1) { rest = ''; } else { rest = rest.slice(end + 2); state.inBlock = false; }
    } else {
      const start = rest.indexOf('/*');
      if (start === -1) { code += rest; rest = ''; } else { code += rest.slice(0, start); rest = rest.slice(start + 2); state.inBlock = true; }
    }
  }
  return code;
}

export function scanCss(name, text) {
  const findings = [];
  const state = { inBlock: false };
  text.split('\n').forEach((raw, index) => {
    const code = codeOutsideComments(raw, state);
    if (ALLOW.test(raw)) return; // explicit, documented opt-out
    const at = { file: name, line: index + 1, text: raw.trim() };
    if (HEX.test(stripColorMix(code))) findings.push({ ...at, rule: 'raw-hex' });
    else if (hasRawFontSize(code)) findings.push({ ...at, rule: 'raw-font-size' });
    if (IMPORTANT.test(code)) findings.push({ ...at, rule: 'important' });
  });
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
