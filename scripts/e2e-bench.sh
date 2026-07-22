#!/usr/bin/env bash
# Runs the full E2E suite N times, capturing total wall-clock (build + preview
# start + tests) and a JSON report per run. Browser phase = JSON stats.duration;
# build+serverstart = total - browser phase. Usage: e2e-bench.sh <label> <runs> [extra playwright args...]
set -uo pipefail
cd "$(dirname "$0")/.."

label="${1:?label}"; runs="${2:?runs}"; shift 2
outdir="scratchpad/bench/${label}"
mkdir -p "$outdir"
summary="${outdir}/summary.tsv"
echo -e "run\ttotal_s\tbrowser_s\tbuild_server_s\texit" > "$summary"

for i in $(seq 1 "$runs"); do
  json="${outdir}/run${i}.json"
  log="${outdir}/run${i}.log"
  start=$(date +%s.%N)
  PLAYWRIGHT_JSON_OUTPUT_NAME="$json" pnpm exec playwright test --reporter=json "$@" >"$log" 2>&1
  exit_code=$?
  end=$(date +%s.%N)
  total=$(echo "$end - $start" | bc)
  browser=$(node -e "try{const r=require('./$json');process.stdout.write(((r.stats.duration||0)/1000).toFixed(1))}catch(e){process.stdout.write('NA')}")
  buildserver=$(node -e "const t=$total;const b=parseFloat('$browser');process.stdout.write(isNaN(b)?'NA':(t-b).toFixed(1))")
  printf "%s\t%.1f\t%s\t%s\t%s\n" "$i" "$total" "$browser" "$buildserver" "$exit_code" | tee -a "$summary"
done

echo "--- per-test summary (last run) ---"
node scripts/e2e-report-summary.mjs "${outdir}/run${runs}.json" 2>/dev/null || true
