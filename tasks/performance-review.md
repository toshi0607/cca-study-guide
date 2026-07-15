# Lighthouse Performance Review

## Outcome

The application now server-renders meaningful Japanese and English landing content and hydrates it immediately with Preact. The change removes the empty initial app shell, keeps server and first-client markup deterministic, and improves the matched Lighthouse median Performance score from 96 to 98 and TBT from 151 ms to 79 ms. CLS remains 0.

## Bottlenecks

- The original application used `client:only`, so the hero/LCP heading did not exist until Astro, Preact, the app, and content data had loaded and executed.
- The remaining production bottleneck is the immediate Google tag: 145,360 B transferred, with Lighthouse reporting about 67,305 B / 320 ms of unused-JavaScript opportunity.
- Shared CSS is small (about 5.3 KB transferred); forced inlining regressed the diagnostic run and was rejected.
- Server response, cache headers, images, fonts, DOM size, and layout stability were not material bottlenecks.

## Implemented Design

- Changed both locale application routes from `client:only` to `client:load`.
- Kept SSR and first hydration deterministic with `now = null`, empty local progress, and truthful `—` placeholders.
- Loaded localStorage and current time only in `useEffect`.
- Refreshed the current time every minute and when the document becomes visible or the window regains focus.
- Disabled stateful buttons until hydration so JavaScript-disabled users are not offered inert enabled controls.
- Added Japanese/English no-JS SSR coverage and a due-card rollover test.

## Matched Lighthouse A/B

| Mobile median, 3 runs | `client:load` | `client:only` | Delta |
|---|---:|---:|---:|
| Performance | 98 | 96 | +2 |
| FCP | 984.08 ms | 983.63 ms | +0.45 ms |
| LCP | 2,292.85 ms | 2,284.35 ms | +8.51 ms |
| TBT | 79 ms | 151 ms | -72 ms |
| CLS | 0 | 0 | 0 |
| Transfer | 203,831 B | 202,298 B | +1,533 B |

SSR did not materially improve the simulated LCP, but it reduced median TBT by 47.7%, raised the score by two points, and emitted usable initial content. The added HTML transfer is the accepted cost.

## Rejected Alternatives

- Delaying gtag by two seconds improved a diagnostic LCP to about 1.35 seconds, but can miss short visits and contradicts the current immediate-pageview product policy.
- `fetchpriority="low"` produced only a weak single-run change.
- Forced CSS inlining regressed the measured LCP.
- A full Astro multi-page rewrite or content/view code splitting is disproportionate at the current first-party bundle size.

## Evidence

- Matched raw Lighthouse reports are retained locally in the gitignored directories `tmp/lighthouse-final/client-load/` and `tmp/lighthouse-final/client-only/`; the reproducible commands and summarized metrics are tracked in this repository.
- Detailed commands, environment, audit trace, and intermediate controls: `tasks/performance-notes.md`.
- Final verification: `git diff --check`; unit 18/18; Astro build with 0 errors/warnings/hints and 4 routes; no-analytics build check; Playwright E2E 39/39; named browser smoke on both locales with zero console/page errors.
- Environment caveat: the repository declares Node 22.x, while local verification ran on Node 26.5.0 / pnpm 10.30.3 and emitted an engine warning.
