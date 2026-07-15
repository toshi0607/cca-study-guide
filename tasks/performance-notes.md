# Lighthouse Performance Notes

## Baseline

- Protected localization work currently makes the shared tree temporarily unbuildable because localized content types have landed before `App.tsx` consumers. Baseline work therefore uses committed HEAD `812fbdc59916995bd1529b71a8f969c2b8d4fac3` in an isolated temporary worktree.
- Lighthouse 13.4.0, production build/preview, mobile, no analytics, 3-run median on `/`: Performance 100; FCP 981 ms; LCP 1,396 ms; Speed Index 981 ms; TBT 33 ms; CLS 0; TTI 1,437 ms.
- A separate Lighthouse 12.8.2 production-origin diagnostic run on `/`: Performance 93; FCP 0.94 s; LCP 3.24 s; TBT 62 ms; CLS 0. The LCP element was `#today-title`, with about 2.63 s / 81% attributed to render delay.
- Production `/privacy/` control run: Performance 100; FCP/LCP 0.79 s; TBT 12 ms; CLS 0. The static page uses the same shared CSS/analytics shell but does not wait for Preact rendering.
- Lighthouse 13.4.0, the same isolated HEAD and mobile conditions, GA enabled with `G-TEST123456`, 3-run median on `/`: Performance 98; FCP 979 ms; LCP 2,340 ms; Speed Index 979 ms; TBT 59 ms; CLS 0; TTI 2,396 ms; transfer 192,847 B; main-thread work 427 ms; JS execution 126.8 ms.
- The matched GA/no-GA delta was +944 ms LCP, +26 ms TBT, +146,164 B transfer, and about +100 ms JavaScript execution. Raw reports are retained in `tmp/lighthouse-baseline/`.
- Environment: Lighthouse 13.4.0, Chrome 150.0.7871.124, Astro 5.18.2, macOS arm64. The runner had Node 26.5.0 while the repository declares Node 22.x; before/after comparisons must use the same runtime, and final project verification should also run under the repository runtime when available.

## Bottleneck Trace

- `client:only="preact"` on the app route produces an empty `<astro-island>` in `dist/index.html`; the LCP heading does not exist until Astro's island runtime, Preact, App code, and content data have loaded and executed.
- The existing app delivery path is about 64.3 KB raw / 24.9 KB gzip JavaScript. The App chunk itself is about 40,962 bytes raw / 16,323 bytes transferred and synchronously imports all card, domain, and source content, including non-initial views.
- Production GA/GTM represented about 164 KiB of 195 KiB total transfer in the diagnostic run and reported about 64 KiB unused JS, 139 ms main-thread time, and 24 ms blocking time. It is a secondary transfer/TBT bottleneck, not the direct source of the missing initial LCP element.
- Shared CSS is about 19.3 KB raw / 5.6 KB transferred and render-blocking, but there are no external web fonts or LCP image requests. Lighthouse's local estimate was about 130 ms, so CSS is lower priority than the client-render gate.
- Server response, hashed-asset caching, image delivery, DOM size, and layout stability are not current bottlenecks.

## Architecture Decision

- First change: render the existing locale-specific Preact app on the server and hydrate immediately with `client:load`.
- Do not perform a directive-only change. Initialize server and first-client state deterministically (`ready=false`, locale-neutral empty reviews, no build-time current date). Load the actual current time and localStorage data together in `useEffect`, and reserve stable dimensions for dynamic date/due/progress values.
- Preserve locale as a build-time route prop on `/` and `/en/`; do not infer locale during hydration.
- Reject `client:idle` because above-the-fold controls would remain temporarily inert. Reject `client:visible` because the application is immediately visible. Defer a full Astro multi-page rewrite and view/data code splitting unless post-SSR measurement still identifies unused first-load JavaScript or main-thread work as the leading problem.
- Do not delay GA in the first change. Recent product behavior intentionally records the immediate pageview, and deferral can lose short visits. Reconsider only if the GA-enabled post-change Lighthouse evidence still identifies third-party execution as the dominant unresolved issue and the product trade-off is explicitly accepted.
- Final matched A/B retains SSR because, with the current localized application held constant, it improved median Performance from 96 to 98 and TBT from 151 ms to 79 ms while preserving CLS 0. It did not materially change LCP and adds about 1.5 KB gzip HTML, an accepted trade-off for meaningful initial HTML and reduced blocking time.
- Official Google installation guidance still places the async loader immediately after the opening `head`: https://developers.google.com/tag-platform/gtagjs. Google also documents that `dataLayer` queues messages until the tag processes them: https://developers.google.com/tag-platform/tag-manager/datalayer. Deferring the loader remains possible but would intentionally depart from the current immediate-load measurement policy.

## Verification Evidence

- Isolated SSR proof-of-concept: unit 17/17, E2E 18/18, Astro build with 0 diagnostics, and no hydration console/page errors.
- The SSR output grew to 11,017 B and contained the hero, two navigation regions, and blueprint copy before JavaScript. JavaScript-disabled Playwright coverage passed in the proof-of-concept.
- Matched GA-enabled Lighthouse 13.4.0 mobile `/`, 3-run post-change median: Performance 98; FCP 979.87 ms; LCP 2,289.15 ms; TBT 50 ms; CLS 0; transfer 194,365 B. Against the committed baseline this is -51.15 ms LCP (-2.2%), -9 ms TBT, unchanged CLS, and +1,518 B transfer.
- The observed trace's LCP element remained `h2#today-title`, with observed FCP/LCP at 214 ms and no late hydration candidate. Lighthouse's simulated metric remained dominated by the immediate third-party script.
- Rejected experiments: inlining all CSS regressed the diagnostic run to 2,382 ms LCP; `fetchpriority="low"` on gtag produced only a weak single-run 2,271.59 ms result; delaying the gtag loader by two seconds improved LCP to 1,354.56 ms but changes pageview semantics and can miss short visits, so it was not included.
- The localized shared-tree integration applies the same deterministic SSR state to both `/` and `/en/`; final coherent-tree verification is in progress.
- Final current-tree matched A/B, differing only in the two locale route directives:
  - `client:load` median: Performance 98; FCP 984.08 ms; LCP 2,292.85 ms; TBT 79 ms; CLS 0; transfer 203,831 B.
  - `client:only` median: Performance 96; FCP 983.63 ms; LCP 2,284.35 ms; TBT 151 ms; CLS 0; transfer 202,298 B.
  - Delta: Performance +2; TBT -72 ms (-47.7%); CLS unchanged; LCP +8.51 ms (no material change); transfer +1,533 B gzip.
- Both variants used `h2#today-title` as the LCP element. Median Lighthouse element render subphase improved from 254.71 ms to 229.28 ms under SSR, although overall simulated LCP remained dominated by the same third-party load.
- App JavaScript was identical in both variants (24,413 B transferred / 66,791 B decoded). GTM remained 145,360 B with about 67,305 B / 320 ms reported as unused JavaScript opportunity.
- Current final behavior checks: Japanese and English no-JS SSR plus 60-second due rollover 3/3 passed; hydration enabled 9 stateful controls on each route with zero console/page errors.
- Exact build/preview/audit commands:

  ```sh
  PUBLIC_GA_MEASUREMENT_ID=G-TEST123456 pnpm build
  pnpm preview --host 127.0.0.1 --port 4321
  npx --no-install lighthouse http://127.0.0.1:4321/ --quiet --output=json --output-path=tmp/lighthouse-final/<variant>/mobile-root-runN.json --chrome-flags='--headless --no-sandbox'
  ```

- Raw matched reports are retained locally in the gitignored directories `tmp/lighthouse-final/client-load/` and `tmp/lighthouse-final/client-only/`; rerun the commands above to reproduce them.
- Reviewer fixes applied: refresh current time every 60 seconds and on focus/visibility return; keep SSR stateful buttons disabled until hydration; add automated due-rollover and no-JS disabled-control coverage.
- Final coherent-tree verification: `git diff --check` passed; unit 18/18; Astro build checked 32 files with 0 errors/warnings/hints and generated 4 routes; no-analytics build check passed; Playwright E2E 39/39 passed in 49.0 seconds.
- Final named `agent-browser` preview smoke: Japanese and English locale/title/hero/nav/blueprint correct; 9 enabled buttons after hydration on each locale; console errors 0; page errors 0; session and preview server closed.

## Errors Encountered

- The `agent-browser` skill references `references/profiling.md`, but the installed skill directory contains only `SKILL.md`; direct reading failed with “No such file or directory.” Continued with the complete core profiling commands documented in `SKILL.md` and Lighthouse trace/audit evidence.
