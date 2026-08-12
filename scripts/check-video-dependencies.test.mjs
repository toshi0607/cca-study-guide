import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const videoRoot = path.join(repoRoot, 'video-hf');
const gsapUrl = 'https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js';
const gsapSri =
  'sha384-sG0Hv1tP1lZCk9KQmrIbY/XNwi+OY84GQqhMscbnsoBFqAz8KNCil1kvfL3Hbbk2';

async function readVideoFile(filename) {
  return readFile(path.join(videoRoot, filename), 'utf8');
}

describe('video-hf dependency boundary', () => {
  it('uses HyperFrames as an exact local development dependency', async () => {
    const packageJson = JSON.parse(await readVideoFile('package.json'));

    expect(packageJson.devDependencies?.hyperframes).toBe('0.7.68');
    for (const [name, command] of Object.entries(packageJson.scripts ?? {})) {
      expect(command, `${name} must not download an executable at runtime`).not.toMatch(/\bnpx\b/);
      expect(command, `${name} must use pnpm's local HyperFrames binary`).toMatch(/^hyperframes(?:\s|$)/);
    }
  });

  it('documents only the frozen local HyperFrames workflow', async () => {
    for (const filename of ['README.md', 'README.ja.md']) {
      const readme = await readFile(path.join(repoRoot, filename), 'utf8');
      expect(readme, `${filename} must not bypass the video lockfile with npx`).not.toMatch(/\bnpx\s+(?:--yes\s+)?hyperframes\b/);
      expect(readme).toContain('pnpm --dir video-hf install --frozen-lockfile');
      expect(readme).toContain('pnpm --dir video-hf render --quality high --output out/promo.mp4');
      expect(readme).not.toContain('pnpm --dir video-hf render -- --quality');
    }
  });

  it('pins HyperFrames with an integrity digest in the video lockfile', async () => {
    const lockfile = await readVideoFile('pnpm-lock.yaml');

    expect(lockfile, 'video-hf/pnpm-lock.yaml must pin the declared HyperFrames version').toMatch(
      /hyperframes:\n\s+specifier: 0\.7\.68\n\s+version: 0\.7\.68/,
    );
    expect(lockfile, 'video-hf/pnpm-lock.yaml must record HyperFrames package integrity').toMatch(
      /hyperframes@0\.7\.68:\n\s+resolution: \{integrity: sha(?:256|384|512)-[^}]+\}/,
    );
  });

  it('uses the verified SHA-384 SRI digest for the exact GSAP CDN response', async () => {
    const html = await readVideoFile('index.html');
    const gsapScript = html.match(new RegExp(`<script\\b[^>]*\\bsrc=["']${gsapUrl}["'][^>]*>`, 'i'))?.[0];

    expect(gsapScript, 'index.html must load the exact GSAP CDN URL').toBeTruthy();
    expect(gsapScript).toContain(`integrity="${gsapSri}"`);
    expect(gsapScript).toMatch(/\bcrossorigin=["']anonymous["']/i);
  });

  it('requires SRI and anonymous CORS for every remote executable script', async () => {
    const html = await readVideoFile('index.html');
    const remoteScripts = html.match(/<script\b(?=[^>]*\bsrc=["']https?:\/\/)[^>]*>/gi) ?? [];

    expect(remoteScripts, 'expected at least one remote executable script to guard').not.toHaveLength(0);
    for (const script of remoteScripts) {
      expect(script).toMatch(/\bintegrity=["']sha(?:256|384|512)-[^"']+["']/i);
      expect(script).toMatch(/\bcrossorigin=["']anonymous["']/i);
    }
  });
});
