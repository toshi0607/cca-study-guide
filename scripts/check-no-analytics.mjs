import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(path) : path.endsWith('.html') ? [path] : [];
  }));
  return nested.flat();
}

const forbidden = [
  'googletagmanager.com/gtag/js',
  'G-TEST123456',
  'id="analytics-consent"',
  'cca-analytics-consent:v1',
  'アクセス解析の設定',
];
const routeForbidden = {
  'dist/index.html': [
    'Google Analyticsで基本的なページ閲覧情報を収集します。',
    'アクセス解析について',
  ],
  'dist/en/index.html': [
    'Google Analytics collects basic page-view information.',
    'Analytics information',
  ],
  'dist/privacy/index.html': [
    'id="analytics-title"',
    'id="cookies-title"',
    'サイト改善のためGoogle Analytics 4を使用し',
  ],
  'dist/en/privacy/index.html': [
    'id="analytics-title"',
    'id="cookies-title"',
    'To improve the site, Google Analytics 4 collects basic usage information',
  ],
};
const found = [];

for (const file of await htmlFiles('dist')) {
  const html = await readFile(file, 'utf8');
  for (const value of forbidden) if (html.includes(value)) found.push(`${file}: ${value}`);
}

for (const [file, values] of Object.entries(routeForbidden)) {
  const html = await readFile(file, 'utf8');
  for (const value of values) if (html.includes(value)) found.push(`${file}: ${value}`);
}

if (found.length) {
  throw new Error(`Analytics must be omitted when PUBLIC_GA_MEASUREMENT_ID is empty. Found: ${found.join(', ')}`);
}

console.log('No-ID build omits analytics loading, consent remnants, and analytics disclosure.');
