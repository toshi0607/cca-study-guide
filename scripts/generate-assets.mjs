import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

await mkdir('public', { recursive: true });

const ogpSvg = await readFile('assets/ogp.svg');
const faviconSvg = await readFile('assets/favicon.svg');

await writeFile('public/favicon.svg', faviconSvg);
await sharp(ogpSvg).flatten({ background: '#f4f7f9' }).png({ compressionLevel: 9 }).toFile('public/ogp.png');
await sharp(faviconSvg).resize(180, 180).flatten({ background: '#f4f7f9' }).png({ compressionLevel: 9 }).toFile('public/apple-touch-icon.png');

const icon16 = await sharp(faviconSvg).resize(16, 16).png().toBuffer();
const icon32 = await sharp(faviconSvg).resize(32, 32).png().toBuffer();
const icon48 = await sharp(faviconSvg).resize(48, 48).png().toBuffer();
await writeFile('public/favicon.ico', await pngToIco([icon16, icon32, icon48]));
