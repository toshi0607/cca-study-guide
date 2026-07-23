// Guards the initial (eager) JS payload of the app island. The landing view must
// not statically pull in heavy content or lazily-routed views: the question bank,
// per-choice rationales, the Mock Exam engine/analysis, and the Study Guide /
// Hands-on / Official-scenarios view+content chunks are all code-split and must
// stay OUT of App.js's static import graph. A regression here (e.g. converting a
// lazy Entry wrapper back to a direct import) silently re-inflates first load,
// which is exactly the class of regression Lighthouse caught late before.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ASTRO_DIR = 'dist/_astro';

// Forbidden chunk basenames (hash suffix stripped). If any is reachable through
// App.js's *static* import graph, first load ships it eagerly — fail the build.
const FORBIDDEN = [
  'questions',
  'rationales',
  'mock-exam-analysis',
  'MockExamView',
  'MockExamAnalysis',
  'study-guide',
  'hands-on',
  'official-scenarios',
  'OfficialScenariosView',
  'GuideView',
  'HandsOnView',
  'QuestionMetadata',
];

const baseName = (file) => file.replace(/\.[A-Za-z0-9_-]+\.js$/, '');

function staticImports(code) {
  // Static ESM imports only. `from"./x.js"` never appears in a dynamic
  // `import("./x.js")` call, so matching `from"./..."` plus bare side-effect
  // imports captures the eager graph while ignoring code-split dynamic imports.
  const specs = new Set();
  for (const m of code.matchAll(/from"(\.\/[^"]+\.js)"/g)) specs.add(m[1].slice(2));
  for (const m of code.matchAll(/(^|[;\n])import"(\.\/[^"]+\.js)"/g)) specs.add(m[2].slice(2));
  return [...specs];
}

const files = readdirSync(ASTRO_DIR);
const entry = files.find((f) => /^App\.[A-Za-z0-9_-]+\.js$/.test(f));
if (!entry) {
  console.error(`check-initial-bundle: no App.*.js entry found in ${ASTRO_DIR}`);
  process.exit(1);
}

// Transitive closure of static imports starting from the App island entry.
const eager = new Set();
const queue = [entry];
while (queue.length) {
  const file = queue.pop();
  if (eager.has(file)) continue;
  eager.add(file);
  let code;
  try {
    code = readFileSync(join(ASTRO_DIR, file), 'utf8');
  } catch {
    continue;
  }
  for (const dep of staticImports(code)) if (!eager.has(dep)) queue.push(dep);
}

const offenders = [...eager].filter((file) => FORBIDDEN.includes(baseName(file)));
if (offenders.length) {
  console.error(`check-initial-bundle: forbidden chunk(s) in App.js static import graph:\n  ${offenders.join('\n  ')}`);
  console.error('These must be lazily imported (via an Entry wrapper) so they stay out of the initial bundle.');
  process.exit(1);
}

console.log(`check-initial-bundle: OK — ${eager.size} eagerly-loaded chunks, none forbidden.`);
