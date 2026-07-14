import { readFile } from 'node:fs/promises';

const html = await readFile('dist/index.html', 'utf8');
const forbidden = ['googletagmanager.com/gtag/js', 'id="analytics-consent"', 'cca-analytics-consent:v1', 'アクセス解析の設定'];
const found = forbidden.filter((value) => html.includes(value));

if (found.length) {
  throw new Error(`Analytics must be omitted when PUBLIC_GA_MEASUREMENT_ID is empty. Found: ${found.join(', ')}`);
}

console.log('No-ID build omits analytics markup and controls.');
