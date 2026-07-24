import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import subsetFont from 'subset-font';

// The display font stack (--display in global.css) is used by `.wordmark b`,
// `.today-hero h2`, `.page-header h2`, `.section-heading h2` and
// `.status-strip h2`. Client-side views
// render some of those headings after hydration, so the subset must cover
// every UI string, not just the server-rendered HTML: this script takes all
// string literals from src/i18n/ui.ts plus the display-font text found in the
// built HTML (`pnpm build` must run first). The vitest guard
// (src/lib/fonts.test.ts) independently recomputes the required characters
// from the i18n modules and fails when the committed manifest no longer
// covers them.

// Fonts are fetched from a pinned google/fonts commit (never the mutable
// `main` ref) and every download's sha256 is checked against the value below
// before it is written to disk or subset. To update fonts/licenses
// intentionally:
//   1. Pick the new upstream commit SHA (e.g. `git ls-remote
//      https://github.com/google/fonts.git HEAD`).
//   2. Update PINNED_COMMIT below.
//   3. Remove the stale cache: `rm -rf node_modules/.cache/font-src`.
//   4. Run `pnpm build && pnpm fonts:subset` — it will fail with a sha256
//      mismatch error that prints the actual hash of each file.
//   5. Copy those printed hashes into the matching `sha256`/`licenseSha256`
//      fields in SOURCES below and re-run to confirm it passes.
const PINNED_COMMIT = '6f2d0cd65e61cb237409c0802757a1e55481422d'; // google/fonts main HEAD, pinned 2026-07-25

const rawUrl = (path) => `https://raw.githubusercontent.com/google/fonts/${PINNED_COMMIT}/${path}`;

const SOURCES = [
  {
    family: 'Barlow Condensed',
    weight: 700,
    url: rawUrl('ofl/barlowcondensed/BarlowCondensed-Bold.ttf'),
    sha256: 'e476562ec9c1e16cf16475895b511f08c804f438cc9a9f80a44ea50a0eeb5b65',
    license: rawUrl('ofl/barlowcondensed/OFL.txt'),
    licenseSha256: '186d750eb496a4c17a76385f82be6aea2ac1cf2de074a811d63786cf374ea73f',
    outputBase: 'barlow-condensed-700',
    licenseOutput: 'OFL-barlow-condensed.txt',
  },
  {
    family: 'Zen Kaku Gothic New',
    weight: 900,
    url: rawUrl('ofl/zenkakugothicnew/ZenKakuGothicNew-Black.ttf'),
    sha256: '795819a979184981842994d8f4eb9e14ce443d687bd5e731d6ca67ded8f92261',
    license: rawUrl('ofl/zenkakugothicnew/OFL.txt'),
    licenseSha256: '0fac78a235c98d640cb06332eb5362c211d86fa03c011df438c35005d22ad2c7',
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
  /<h2 id="(?:today|guide|practice|progress|coverage|status)-title"(?:\s[^>]*)?>(.*?)<\/h2>/gs,
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

const verifySha256 = (buffer, expectedSha256, label) => {
  const actual = createHash('sha256').update(buffer).digest('hex');
  if (actual !== expectedSha256) {
    throw new Error(
      `sha256 mismatch for ${label}: expected ${expectedSha256}, got ${actual}. ` +
        `google/fonts のコミット ${PINNED_COMMIT} 以降で内容が変わった、または破損している可能性があります。 ` +
        `意図的にフォント/ライセンスを更新する場合は scripts/subset-fonts.mjs の PINNED_COMMIT を新しい ` +
        `google/fonts の main HEAD コミット SHA に更新し、\`rm -rf node_modules/.cache/font-src\` してから ` +
        `再実行し、表示された sha256 で SOURCES の sha256/licenseSha256 を更新してください。`
    );
  }
};

// Cache key includes a hash of the full URL (not just the URL's basename) so
// that files sharing a basename across families (e.g. every font family's
// license is named `OFL.txt`) never collide in the shared cache directory.
const fetchBinary = async (url, expectedSha256, label) => {
  const cacheDir = 'node_modules/.cache/font-src';
  await mkdir(cacheDir, { recursive: true });
  const cacheKey = createHash('sha256').update(url).digest('hex').slice(0, 16);
  const cachePath = join(cacheDir, `${cacheKey}-${url.split('/').pop()}`);
  let buffer;
  try {
    buffer = await readFile(cachePath);
  } catch {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status}`);
    buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(cachePath, buffer);
  }
  verifySha256(buffer, expectedSha256, label);
  return buffer;
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
  const [ttf, license] = await Promise.all([
    fetchBinary(source.url, source.sha256, `${source.family} font (${source.url})`),
    fetchBinary(source.license, source.licenseSha256, `${source.family} license (${source.license})`),
  ]);
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
