import { readFile } from 'node:fs/promises';

// Usage: node scripts/check-lighthouse-budget.mjs <report.json> [...more reports]
// Takes the median across the given Lighthouse JSON reports and fails when a
// budget is exceeded. Budgets use simulated (lantern) metrics, which stay
// comparable across machines. This guard exists because a previous design
// change shipped a 3.7x FCP regression unnoticed.

const BUDGETS = {
  performanceScore: { min: 0.9 },
  'first-contentful-paint': { maxMs: 2000 },
  'largest-contentful-paint': { maxMs: 3000 },
  'cumulative-layout-shift': { max: 0.02 },
};

const paths = process.argv.slice(2);
if (paths.length === 0) {
  console.error('usage: node scripts/check-lighthouse-budget.mjs <report.json> [...more reports]');
  process.exit(2);
}

const median = (values) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];

const reports = await Promise.all(paths.map(async (path) => JSON.parse(await readFile(path, 'utf8'))));

const failures = [];
const score = median(reports.map((r) => r.categories.performance.score));
console.log(`performance score (median of ${reports.length}): ${Math.round(score * 100)}`);
if (score < BUDGETS.performanceScore.min) {
  failures.push(`performance score ${Math.round(score * 100)} < ${BUDGETS.performanceScore.min * 100}`);
}

for (const [audit, budget] of Object.entries(BUDGETS)) {
  if (audit === 'performanceScore') continue;
  const value = median(reports.map((r) => r.audits[audit].numericValue));
  const limit = budget.maxMs ?? budget.max;
  console.log(`${audit}: ${budget.maxMs ? `${Math.round(value)} ms` : value.toFixed(4)} (budget ${limit})`);
  if (value > limit) failures.push(`${audit} ${Math.round(value)} > ${limit}`);
}

const externalBlocking = reports.flatMap((r) => {
  const pageOrigin = new URL(r.finalDisplayedUrl ?? r.requestedUrl).origin;
  return r.audits['network-requests'].details.items
    .filter((item) => item.resourceType === 'Stylesheet' && new URL(item.url).origin !== pageOrigin);
});
if (externalBlocking.length > 0) {
  failures.push(`external stylesheets detected: ${[...new Set(externalBlocking.map((i) => i.url))].join(', ')}`);
}

if (failures.length > 0) {
  console.error(`\nBudget failures:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('\nAll Lighthouse budgets met.');
