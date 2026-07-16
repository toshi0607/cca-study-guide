import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import subsetFont from 'subset-font';

// The display font stack (--display in global.css) is used only by
// `.wordmark b` and `.today-hero h2, .page-header h2`. Client-side views
// render some of those headings after hydration, so the subset must cover
// every UI string, not just the server-rendered HTML: this script takes all
// string literals from src/i18n/ui.ts plus the display-font text found in the
// built HTML (`pnpm build` must run first). The vitest guard
// (src/lib/fonts.test.ts) independently recomputes the required characters
// from the i18n modules and fails when the committed manifest no longer
// covers them.

const SOURCES = [
  {
    family: 'Barlow Condensed',
    weight: 700,
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/barlowcondensed/BarlowCondensed-Bold.ttf',
    license: 'https://raw.githubusercontent.com/google/fonts/main/ofl/barlowcondensed/OFL.txt',
    outputBase: 'barlow-condensed-700',
    licenseOutput: 'OFL-barlow-condensed.txt',
  },
  {
    family: 'Zen Kaku Gothic New',
    weight: 900,
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/zenkakugothicnew/ZenKakuGothicNew-Black.ttf',
    license: 'https://raw.githubusercontent.com/google/fonts/main/ofl/zenkakugothicnew/OFL.txt',
    outputBase: 'zen-kaku-gothic-new-900',
    licenseOutput: 'OFL-zen-kaku-gothic-new.txt',
  },
];

const BUILT_PAGES = ['dist/index.html', 'dist/en/index.html', 'dist/privacy/index.html', 'dist/en/privacy/index.html'];

// Always-included characters so copy tweaks in ASCII or kana never need a
// regeneration: printable ASCII, CJK punctuation, hiragana, katakana,
// full-width forms.
const BASE_RANGES = [
  [0x20, 0x7e],
  [0x3000, 0x303f],
  [0x3040, 0x309f],
  [0x30a0, 0x30ff],
  [0xff01, 0xff60],
];

const DISPLAY_TEXT_PATTERNS = [
  /class="wordmark"[^>]*><b(?:\s[^>]*)?>(.*?)<\/b>/gs,
  /<h2 id="(?:today|guide|practice|progress)-title"(?:\s[^>]*)?>(.*?)<\/h2>/gs,
];

const stripMarkup = (html) => html
  .replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'");

const collectDisplayText = async () => {
  let text = '';
  for (const page of BUILT_PAGES) {
    await access(page).catch(() => {
      throw new Error(`Missing ${page}. Run \`pnpm build\` before \`pnpm fonts:subset\`.`);
    });
    const html = await readFile(page, 'utf8');
    for (const pattern of DISPLAY_TEXT_PATTERNS) {
      for (const match of html.matchAll(pattern)) text += stripMarkup(match[1]);
    }
  }
  if (!text.trim()) throw new Error('No display-font text found in dist HTML; extraction patterns may be stale.');
  return text;
};

const fetchBinary = async (url) => {
  const cacheDir = 'node_modules/.cache/font-src';
  await mkdir(cacheDir, { recursive: true });
  const cachePath = join(cacheDir, url.split('/').pop());
  try {
    return await readFile(cachePath);
  } catch {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(cachePath, buffer);
    return buffer;
  }
};

const baseChars = BASE_RANGES.flatMap(([start, end]) => {
  const chars = [];
  for (let code = start; code <= end; code += 1) chars.push(String.fromCodePoint(code));
  return chars;
}).join('');

const collectUiStrings = async () => {
  const source = await readFile('src/i18n/ui.ts', 'utf8');
  let text = '';
  for (const match of source.matchAll(/'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`/gs)) {
    text += (match[1] ?? match[2]).replace(/\\(.)/g, '$1');
  }
  return text;
};

const displayText = await collectDisplayText();
const uiText = await collectUiStrings();
const subsetText = [...new Set(baseChars + displayText + uiText)].sort().join('');

await mkdir('public/fonts', { recursive: true });
// Filenames carry a content hash so the files can be served with immutable
// cache headers (vercel.json); regeneration produces new URLs, never a stale
// cache. Remove previous outputs so old hashes do not accumulate.
for (const stale of await readdir('public/fonts')) {
  if (stale.endsWith('.woff2')) await rm(join('public/fonts', stale));
}
const manifest = { generatedBy: 'scripts/subset-fonts.mjs', characters: subsetText, fonts: [] };

for (const source of SOURCES) {
  const [ttf, license] = await Promise.all([fetchBinary(source.url), fetchBinary(source.license)]);
  const woff2 = await subsetFont(ttf, subsetText, { targetFormat: 'woff2' });
  const hash = createHash('sha256').update(woff2).digest('hex').slice(0, 8);
  const output = `${source.outputBase}.${hash}.woff2`;
  await writeFile(join('public/fonts', output), woff2);
  await writeFile(join('public/fonts', source.licenseOutput), license);
  manifest.fonts.push({ family: source.family, weight: source.weight, file: output, bytes: woff2.length });
  console.log(`${output}: ${woff2.length} bytes (${source.family} ${source.weight})`);
}

await writeFile('public/fonts/manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`subset characters: ${subsetText.length}`);
