import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

await mkdir('public', { recursive: true });

const ogpSvg = await readFile('assets/ogp.svg');
const faviconSvg = await readFile('assets/favicon.svg');

await writeFile('public/favicon.svg', faviconSvg);

// The og:image URL must change whenever the artwork changes: Slack, X, and
// Facebook cache the image by URL with no reliable purge, so the canonical
// URL carries a content hash (same scheme as public/fonts). Plain ogp.png is
// kept at a stable path for previously shared pages that still reference it.
const ogpPng = await sharp(ogpSvg).flatten({ background: '#f4f7f9' }).png({ compressionLevel: 9 }).toBuffer();
const ogpFile = `ogp.${createHash('sha256').update(ogpPng).digest('hex').slice(0, 8)}.png`;
for (const stale of await readdir('public')) {
  if (/^ogp\.[0-9a-f]{8}\.png$/.test(stale) && stale !== ogpFile) await rm(join('public', stale));
}
await writeFile(join('public', ogpFile), ogpPng);
await writeFile('public/ogp.png', ogpPng);
const manifest = { generatedBy: 'scripts/generate-assets.mjs', ogp: { file: ogpFile, bytes: ogpPng.length } };
await writeFile('public/assets-manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`${ogpFile}: ${ogpPng.length} bytes`);

await sharp(faviconSvg).resize(180, 180).flatten({ background: '#f4f7f9' }).png({ compressionLevel: 9 }).toFile('public/apple-touch-icon.png');

const icon16 = await sharp(faviconSvg).resize(16, 16).png().toBuffer();
const icon32 = await sharp(faviconSvg).resize(32, 32).png().toBuffer();
const icon48 = await sharp(faviconSvg).resize(48, 48).png().toBuffer();
await writeFile('public/favicon.ico', await pngToIco([icon16, icon32, icon48]));
