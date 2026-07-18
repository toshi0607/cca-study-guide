import { readFile, stat } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { ui } from '../i18n/ui';
import { locales } from '../i18n/locales';

// The display font stack (--display in global.css) renders only `.wordmark b`
// and `.today-hero h2, .page-header h2`. These strings must stay covered by
// the committed subset fonts; regenerate with `pnpm build && pnpm fonts:subset`.
const displayFontText = (): string =>
  locales
    .map((locale) => {
      const copy = ui[locale];
      return [
        copy.brand.mark,
        copy.today.titleLead,
        copy.today.titleEmphasis,
        copy.guide.title,
        copy.practice.title,
        copy.quiz.title,
        copy.progress.title,
      ].join('');
    })
    .join('');

describe('self-hosted display font subsets', () => {
  it('covers every display-font character in the committed manifest', async () => {
    // #given
    const manifest = JSON.parse(await readFile('public/fonts/manifest.json', 'utf8')) as { characters: string };
    const covered = new Set(manifest.characters);

    // #when
    const missing = [...new Set(displayFontText())].filter((char) => !covered.has(char));

    // #then
    expect(missing, 'run `pnpm build && pnpm fonts:subset` to regenerate the font subsets').toEqual([]);
  });

  it('ships content-hashed woff2 files referenced by the manifest with their licenses', async () => {
    // #given
    const manifest = JSON.parse(await readFile('public/fonts/manifest.json', 'utf8')) as {
      fonts: { family: string; file: string; bytes: number }[];
    };

    // #when / #then
    expect(manifest.fonts.map((font) => font.family).sort()).toEqual(['Barlow Condensed', 'Zen Kaku Gothic New']);
    for (const font of manifest.fonts) {
      // Immutable cache headers (vercel.json) require content-hashed names.
      expect(font.file).toMatch(/\.[0-9a-f]{8}\.woff2$/);
      expect((await stat(`public/fonts/${font.file}`)).size).toBe(font.bytes);
    }
    await expect(readFile('public/fonts/OFL-barlow-condensed.txt', 'utf8')).resolves.toContain('SIL OPEN FONT LICENSE');
    await expect(readFile('public/fonts/OFL-zen-kaku-gothic-new.txt', 'utf8')).resolves.toContain('SIL OPEN FONT LICENSE');
  });

  it('keeps the layout free of third-party font requests and driven by the manifest', async () => {
    // #given
    const layout = await readFile('src/layouts/LocalizedLayout.astro', 'utf8');

    // #when / #then
    expect(layout).not.toContain('fonts.googleapis.com');
    expect(layout).not.toContain('fonts.gstatic.com');
    expect(layout).toContain('public/fonts/manifest.json');
  });
});
