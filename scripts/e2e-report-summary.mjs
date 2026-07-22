#!/usr/bin/env node
// Summarizes one or more Playwright JSON reports into the metrics the E2E
// performance task tracks: per-test durations, slowest tests, axe-scan cost,
// retries and flaky counts. Reads report paths from argv.
import { readFileSync } from 'node:fs';

function collect(node, out) {
  if (!node) return;
  for (const suite of node.suites ?? []) collect(suite, out);
  for (const spec of node.specs ?? []) {
    for (const t of spec.tests ?? []) {
      const results = t.results ?? [];
      const last = results[results.length - 1] ?? {};
      const duration = results.reduce((a, r) => a + (r.duration ?? 0), 0);
      out.push({
        title: spec.title,
        file: spec.file,
        line: spec.line,
        status: last.status,
        retries: Math.max(0, results.length - 1),
        duration,
      });
    }
  }
}

const paths = process.argv.slice(2);
if (paths.length === 0) {
  console.error('usage: e2e-report-summary.mjs <report.json> [more.json ...]');
  process.exit(1);
}

for (const p of paths) {
  const report = JSON.parse(readFileSync(p, 'utf8'));
  const tests = [];
  for (const s of report.suites ?? []) collect(s, tests);
  const stats = report.stats ?? {};
  const sum = tests.reduce((a, t) => a + t.duration, 0);
  const axe = tests.filter((t) => /axe|accessibility|violation/i.test(t.title));
  const axeSum = axe.reduce((a, t) => a + t.duration, 0);
  const slowest = [...tests].sort((a, b) => b.duration - a.duration).slice(0, 12);
  const retried = tests.filter((t) => t.retries > 0);

  console.log(`\n===== ${p} =====`);
  console.log(`tests: ${tests.length}  expected:${stats.expected} unexpected:${stats.unexpected} flaky:${stats.flaky} skipped:${stats.skipped}`);
  console.log(`stats.duration (test phase wall-clock): ${(stats.duration / 1000).toFixed(1)}s`);
  console.log(`sum(per-test durations): ${(sum / 1000).toFixed(1)}s`);
  console.log(`axe/a11y tests: ${axe.length}  sum: ${(axeSum / 1000).toFixed(1)}s  (${((axeSum / sum) * 100).toFixed(0)}% of test time)`);
  console.log(`retried tests: ${retried.length}  flaky(stats): ${stats.flaky}`);
  console.log('slowest 12:');
  for (const t of slowest) {
    console.log(`  ${(t.duration / 1000).toFixed(1).padStart(6)}s  ${t.status.padEnd(8)} ${t.title}`);
  }
}
