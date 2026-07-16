import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import assetsManifest from '../../public/assets-manifest.json';

describe('social and icon assets', () => {
  it('ships a 1200x630 OGP PNG', async () => {
    const metadata = await sharp('public/ogp.png').metadata();
    expect(metadata).toMatchObject({ format: 'png', width: 1200, height: 630, hasAlpha: false });
    expect((await stat('public/ogp.png')).size).toBeGreaterThan(10_000);
  });

  it('ships a hashed OGP copy that matches the manifest and the stable file', async () => {
    const plain = await readFile('public/ogp.png');
    const hashed = await readFile(`public/${assetsManifest.ogp.file}`);
    expect(assetsManifest.ogp.file).toBe(`ogp.${createHash('sha256').update(plain).digest('hex').slice(0, 8)}.png`);
    expect(hashed.equals(plain)).toBe(true);
  });

  it('ships SVG, ICO, and opaque 180px Apple icons', async () => {
    const apple = await sharp('public/apple-touch-icon.png').metadata();
    expect(apple).toMatchObject({ format: 'png', width: 180, height: 180, hasAlpha: false });
    expect((await readFile('public/favicon.svg', 'utf8'))).toContain('viewBox="0 0 64 64"');
    expect((await stat('public/favicon.ico')).size).toBeGreaterThan(1_000);
  });
});
