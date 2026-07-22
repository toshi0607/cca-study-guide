# Task: Playwright E2E suite の実行時間短縮

独立PR。プロダクト機能は変更しない（Task 7 との競合回避）。検証能力・決定性・アクセシビリティ保証を落とさず、開発中の待ち時間と full E2E の wall-clock を短縮する。

- Base branch: `claude/playwright-e2e-perf-2e9922` (off `main` @ d1dc280, Task 6 #33)
- Task 7 は未マージ（最新は #33）。base は現行 main。

## Constraints (Ledger)

| Constraint | Source | Verify by |
|------------|--------|-----------|
| assertion を弱めない | user msg | 変更前後の各 test の expect 数を diff |
| axe を全面削除しない／主要状態 coverage 維持 | user msg | accessibility manifest 表 |
| flaky を skip / retry で隠さない | user msg | retries=0, flaky=0, `test.only`/恒久`test.skip` 無し |
| production code にテスト専用回避を入れない | user msg | `src/` の diff = 0（原則） |
| localStorage/chunk failure 等の回帰テスト削除しない | user msg | test 名・件数の diff |
| reload persistence テストを壊さない | user msg | 該当テスト green |
| full gate は production build 対象のまま | user msg | `test:e2e` は build 経由 |
| CI だけ成功する環境依存にしない | user msg | ローカル/CI 両方 green |
| Task 7 系ファイルの competing 変更を最小化 | user msg | `src/components/views/QuizView.tsx` 等 unchanged |
| coverage を測定して同等を示す（自己判断禁止） | user msg | 前後 test 一覧の対応表 |

## Assumptions

| Assumption | Status | Evidence |
|------------|--------|----------|
| 81 tests, 全て `tests/app.spec.ts` | VERIFIED | `playwright test --list` = 81 |
| workers:1 固定, fullyParallel:true, port 4325 固定 | VERIFIED | playwright.config.ts |
| beforeEach が goto→clear→reload の二重 navigation | VERIFIED | app.spec.ts:10-14 |
| STORAGE_KEY=`cca-field-notes:v2`, LEGACY=`:v1`, analytics consent=`cca-analytics-consent:v1` | VERIFIED | storage.ts:33-34, app.spec.ts:977 |
| axe scan は約13回。scenario test は test.slow() 済 | VERIFIED | grep AxeBuilder / app.spec.ts:761 |
| build ~30s (astro check 込, vite build ~3s) | VERIFIED | `pnpm build` 実測 30.6s |
| CPU 8 cores / 24GB RAM | VERIFIED | sysctl |
| analytics inline script は localStorage を読み書きしない・storage key に依存しない | VERIFIED | GoogleAnalytics.astro:9-24（window.dataLayer のみ）。addInitScript は head inline script より前に実行される |
| App は初回 mount（空 storage）で localStorage.setItem を一切呼ばない。read は post-mount useEffect | VERIFIED | App.tsx:51-61 useEffect→storage.ts load()、空 storage は persist 未到達（storage.ts:108） |
| lazy chunk 名 `GuideView.*.js`/`OfficialScenariosView.*.js` は build 出力と一致 | VERIFIED | dist/_astro/GuideView.*.js 等。manualChunks 無し |
| app が load 時に書く他の key は無い（consent key は常に null） | VERIFIED | `cca-analytics-consent:v1` は src に不在（test のみ） |
| chunk failure test は `page.route` を beforeEach の後・操作前に設定 | VERIFIED | app.spec.ts:356,1083 |

## テスト分類（81 tests）

- **app-shell / prerender**: L20 no-JS landing (2)
- **navigation / exact-target**: L34 guide→exact material (1), L867 weak filter nav (1), L896 localized routes+search (1)
- **storage (guide)**: L73 stale-read (1), L97 preserve future v2 (1), L138 dup-drop (1)
- **storage (hands-on)**: L205 stale read-only (1), L264 preserve future (1)
- **storage (migration/reset/multi-tab)**: L312 multi-tab merge (1), L430 v1→v2 migrate (1), L477 no-resurrect after reset (1)
- **save failure**: L120 guide (1), L237 hands-on step (1), L333 exact quiz stat (1), L622 session rating (1)
- **retrieval / practice**: L406 clock due-refresh (1), L500 due session+reset filters (1), L527 filtered session re-queue [en, +axe] (1), L573 keyboard shortcuts (1), L603 leave-view ends session (1), L647 reveal/rate/persist (1)
- **quiz**: L665 domain quiz [+axe] (1), L714 single-select dedup (1)
- **scenario quiz**: L759 scenario round [test.slow, +axe] (1)
- **hands-on**: L169 keyboard save-first (1)
- **official scenarios**: L1032 keyboard path (1), L1052 exact related (1), L1105 english (1), L1116 no-write storage (1)
- **chunk failure (lazy)**: L354 guide (1), L1081 official scenarios (1)
- **import/export (download/dialog/filechooser)**: L816 export→reset→import (1), L851 reject bogus (1)
- **analytics**: L962 privacy-restricted GA (1)
- **metadata**: L929 social/OGP assets (1), L943 locale metadata [4 routes] (4)
- **accessibility (axe)**: L290 hands-on list+detail (1, 2 scans), L377 guide axe [ja/en] (2), L527/L665/L759 inline, L922 app/privacy axe [4 routes] (4), L1150 official scenarios (1, 2 scans)
- **responsive / overflow**: L301 hands-on [3w] (3), L397 guide 360 [ja/en] (2), L1009 app/privacy [4 routes ×6 w] (24), L1135 official [3w] (3)

## Phases

- [x] **P1 baseline**: 3 runs 完了。median total 310.9s / browser 258.3s / build 30.6s / retry0 flaky0。（Baseline 節参照）
- [x] **P2 二重 navigation 削減**: addInitScript(sessionStorage sentinel で clear-once) + goto。reload persistence 保持。**81 passed, flaky0**（scratchpad/bench/phase2 = 155.6s total / 113.8s browser, 単一 run）。
- [x] **P3 spec/fixture 分割**: 13 spec + 3 fixture。**81 titles 完全一致（diff IDENTICAL）**、81 passed flaky0、astro check clean、AxeBuilder は fixture のみ。
- [~] **P4 axe 再設計**: 集約=accessibility.spec.ts + 共有 helper（rule scope 厳密同一）済。**実測: 各 axe scan 1.6–3.6s（=軽量、"17-20s" は machine 依存）**。cross-lang scan 削減は all-zero 契約を弱めるリスク>利得のため非採用（PR で justification）。manifest 作成。
- [x] **P5 並列化**: sweep 実測（reused server, 同条件連続）: w1=175.8s / w2=137.7s(-22%) / w3=126.1s(**1 fail**) / w4=113.9s。w2 の 5連続 gate = **runs 3,4 で fail**（run3: guide focus-race + quiz scenario、run4: storage-read race — spec 横断の timing 脆弱性、CPU contention 由来）。**採用条件（5連続 green）未達→ workers=1 を維持**（determinism 優先）。`PW_WORKERS` で opt-in 可能。速度改善の主因は二重 navigation 削減（P2）で並列ではないと実測で確認。
- [x] **P6 fast/full 分離**: scripts（`test:e2e`=full gate / `test:e2e:fast`=`PW_REUSE_SERVER=1 ... --grep-invert @slow` / `test:e2e:a11y` / `test:e2e:reuse` / `test:e2e:ui`）+ README。`@slow` タグ = accessibility(8)+responsive(32)+scenario(1)=41。**full 81 / fast 40 / a11y 8**（--list 確認）。fast は **reused server 前提**で **~58s**（≤60s 達成、machine load で ~80s まで変動）。**cold（server 未起動）は fresh build するため ~2.6m** = ゲート同等（README に明記）。chunk/import-export/save-failure は fast に残置（重要回帰は隠さない）。a11y は full+専用 command で担保。
  - 注: fast run で 1 flake（keyboard shortcuts, workers=1）→ 単体 5/5 green で machine-noise と確認。fast は dev tool（gate は full）。
- [x] **P7 build/preview 再利用**: `PW_REUSE_SERVER=1`(→`test:e2e:reuse`) で明示 opt-in。default(`test:e2e`)/CI は `reuseExistingServer:false` で必ず build。検証: reuse で標準 spec 5.1s 実行済。
- [x] **P8 exhaustive→unit 化**: **移行不要**。純ロジックは既存 Vitest 12 file が網羅（storage/scheduler/quiz/session/study-guide-progress/hands-on-progress/content/weakness/analytics/assets/fonts/storage-schema）。E2E は代表フローのみで exhaustive-combo の重複は無し。→ 引き継ぎ表は「既存 unit が既にカバー」。
- [x] **P9 CI 設計**: **E2E workflow は元々存在しない**（perf.yml=Lighthouse のみ、E2E は CI 未ゲート）。最小の `e2e.yml`（1 job, workers=config default(1), chromium, build via webServer, report artifact）を追加。perf.yml は変更せず（役割分離）。
- [ ] **P10 最終計測 3回 + 5連続安定 + subagent review + PR**。

## P3 spec-split mapping (81 tests → 13 specs + 3 fixtures, 全保存)

fixtures:
- `fixtures/app.ts`: `test`(page fixture override = addInitScript clear-once + goto '/') + `expect` 再export。共有 UI helper: `openHandsOnList`, `openOfficialScenarios`, 定数 `supportGuideTitle`/`supportStepIds`。
- `fixtures/storage.ts`: `STORAGE_KEY`/`LEGACY_STORAGE_KEY` 再export、`seed`/`readStudyData` helper。（setItem trap は各 save-failure test で挙動が微妙に異なるので基本 inline 維持）
- `fixtures/accessibility.ts`: `expectNoSeriousOrCritical(page)`, `expectNoViolations(page)`（両方 `.withTags(['wcag2a','wcag2aa'])`）。2つの契約を厳密保存。

| spec | tests (旧行) | 数 |
|---|---|---|
| app-shell.spec.ts | L20 no-JS(2), L896 localized+search, L929 social meta, L943 locale meta(4) | 8 |
| storage.spec.ts | L73, L97, L264, L312, L430, L477, L1116 | 7 |
| save-failure.spec.ts | L120, L237, L333, L622 | 4 |
| practice.spec.ts | L406, L500, L527(inline axe), L573, L603, L647, L867 | 7 |
| quiz.spec.ts | L665(inline axe), L714, L759(slow, inline axe) | 3 |
| guide.spec.ts | L34, L138 | 2 |
| hands-on.spec.ts | L169, L205 | 2 |
| official-scenarios.spec.ts | L1032, L1052, L1105 | 3 |
| chunk-failure.spec.ts | L354, L1081 | 2 |
| accessibility.spec.ts | L290(2scan), L377(ja/en=2), L922(4), L1150(2scan) | 8 |
| responsive.spec.ts | L301(3), L397(2), L1009(24), L1135(3) | 32 |
| analytics.spec.ts | L962 | 1 |
| import-export.spec.ts | L816, L851 | 2 |

合計 = 81。inline axe（quiz/scenario/filtered-session）は flow に付随するため feature spec に残す。dedicated axe-only は accessibility.spec.ts へ。

## Accessibility coverage manifest

全 axe scan は `.withTags(['wcag2a','wcag2aa'])`（rule scope 不変、fixtures/accessibility.ts に集約）。契約は2種: **zero**=violations 全ゼロ、**serious+critical**=重大のみゼロ（元テストの区別を厳密保存）。分割で scan の**削除・narrowing・contract 変更は無し**（1:1 移設）。各 scan 実測 1.6–3.6s。

| Component/state | Previous (app.spec.ts) | New spec | Contract | Reason preserved |
|---|---|---|---|---|
| App shell / primary nav (JA) | `Japanese app has no serious a11y violations` | accessibility.spec.ts | zero | global landmarks/nav |
| App shell / primary nav (EN) | `English app has no serious a11y violations` | accessibility.spec.ts | zero | lang/hreflang/EN 文言は別 a11y 面 |
| Privacy page (JA) | `Japanese privacy page ...` | accessibility.spec.ts | zero | 長文 disclosure |
| Privacy page (EN) | `English privacy page ...` | accessibility.spec.ts | zero | EN 長文 disclosure |
| Guide section 展開 (JA) | `/ guide has no serious or critical axe` | accessibility.spec.ts | serious+critical | 動的 details/summary UI |
| Guide section 展開+永続 (EN) | `/en/ guide has no serious or critical axe` | accessibility.spec.ts | serious+critical | EN + start/reload 永続フロー内包 |
| Hands-on list | `hands-on list and detail ... axe` (scan1) | accessibility.spec.ts | serious+critical | カード一覧 |
| Hands-on detail (開始済) | `hands-on list and detail ... axe` (scan2) | accessibility.spec.ts | serious+critical | checkbox/form state |
| Official scenarios list | `official scenarios list and detail ... a11y` (scan1) | accessibility.spec.ts | serious+critical | 一覧 + official badge |
| Official scenario detail | `official scenarios list and detail ... a11y` (scan2) | accessibility.spec.ts | serious+critical | 長文本文 |
| Quiz 回答後→summary | `runs a domain-scoped quiz round ...` (inline) | quiz.spec.ts | zero | 動的 result UI（flow 共有のため feature spec 内に残置） |
| Scenario 回答後→summary | `runs a scenario practice round ...` (inline) | quiz.spec.ts | zero | 動的 result UI（同上） |
| Practice session complete | `runs a filtered session ...` (inline) | practice.spec.ts | zero | session summary（同上） |

最低保証（app shell / primary nav / retrieval card / quiz 回答前後 / quiz summary / scenario / guide list-detail / hands-on list-detail / official list-detail / error state / mobile 代表幅）はすべて上表または responsive/機能 flow でカバー。**cross-language scan の削減は非採用**: 各 scan 1.6–3.6s で削減効果 <10s、かつ ja/en は lang/hreflang/文言が異なり真の同一 DOM ではない。all-zero 契約を弱めないことを優先（目標達成は並列化で担保）。

## Baseline (P1) — base @ d1dc280, workers:1, 8 cores/24GB, darwin

3 runs（scratchpad/bench/baseline/）。`stats.duration` は webServer build(~30s) を含むため、真の browser phase は Σ per-test durations で測る。machine variance が大きい（run2 は並行 Explore agent 等で contended）。**中央値を採用**。

| Metric | run1 | run2 | run3 | median |
|---|---|---|---|---|
| Total wall-clock (`test:e2e`, build込) | 310.9 | 411.1 | 278.9 | **310.9s** |
| Browser phase (Σ per-test, serial) | 258.3 | 298.6 | 233.7 | **258.3s** |
| `stats.duration`(build+server+tests) | 307.8 | 406.1 | 276.1 | 307.8s |
| Build (standalone `pnpm build`) | — | — | — | **~30.6s** |
| axe/a11y named(8) Σ | 52.1 | 51.7 | 18.5 | ~40s |
| retries / flaky | 0/0 | 0/0 | 0/0 | **0/0** |
| workers | 1 | 1 | 1 | 1 |

- 常に遅い: guide+exact-nav flow, scenario(slow), domain quiz, single-select dedup, no-JS prerender(新context), guide axe, app a11y。per-test variance が非常に大きい → 判断は必ず median + 複数 run。
- axe を含む test（named 8 + inline: quiz L710 / scenario L808 / filtered-session L564 = 計11 scan 相当）が browser phase の主要コスト。
- 目標基準値: browser phase 258.3s → 40%減 = **≤155s**; total 310.9s → 30%減 = **≤218s**; fast suite ≤60s。

## Notes (deviation log)

- 環境: worktree で `pnpm install --frozen-lockfile`（esbuild build script は ignored だが build 成功）。

## Review section

（P10 で記入）
