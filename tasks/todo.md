# Weak-Area Visualization (弱点可視化)

Previous plan (quiz view, PR #12) completed and merged; this branch was rebased on
top of it, combining the quiz view with the weak-area visualization below.

## Goal

Surface existing ReviewState signals (lapses / lastRating) as a "weak card" concept:
a practice-view filter chip, a today-view weak-areas section with navigation, and a
small per-domain weak count in the progress view. Visualization only — no scheduler
or storage changes.

## Constraints

| Constraint | Source | Verify by |
|------------|--------|-----------|
| No changes to scheduler.ts / storage.ts | user msg | `git diff --stat` excludes both |
| No pass-probability / score-prediction UI | user msg + DESIGN.md scope | review diff copy |
| isWeak is a pure function in src/lib/ with unit tests | user msg | weakness.test.ts passes |
| ja/en copy for every new string | user msg | UiCopy `satisfies` check via astro check |
| Same chip UX + aria-pressed for the new filter | user msg | e2e + code match existing chips |
| Empty state distinguishes "not started" from "all clear" | user msg | e2e/manual |
| Font subset covers new display-font text (苦手エリア etc.) | README / fonts.test.ts | regen subsets, commit public/fonts |
| e2e: rate card → weak filter shows it → today weak-areas navigates | user msg | new test in tests/app.spec.ts |
| Branch off latest origin/main, PR with trailers | user msg + pr.md | done: feat/weak-areas @ 44cf2b5 |

## Assumptions

| Assumption | Status | Evidence |
|------------|--------|----------|
| isWeak: review exists AND (lapses >= 2 OR lastRating in {'again','hard'}) | VERIFIED | user spec text |
| .section-heading h2 uses display font → new today heading needs subset regen | VERIFIED | global.css:310; 苦 absent from public/fonts/manifest.json |
| Subset glyphs extracted from src/content/*.ts + src/i18n/*.ts → regen picks up new copy | VERIFIED | prior plan notes (subset-fonts.mjs design) |
| Parallel session may touch App.tsx / ui.ts — rebase carefully at merge | NOTED | user msg |

## Plan

- [x] Read App.tsx / ui.ts / scheduler.ts / storage.ts / global.css / tests
- [x] src/lib/weakness.ts: isWeak() + weakness.test.ts — evidence: vitest 5/5 in weakness.test.ts
- [x] ui.ts: ReviewFilter += 'weak'; practice.filters.weak; weakAreas.*; progress.weakCount (ja/en) — evidence: astro check clean in pnpm build
- [x] App.tsx: stateFilters += 'weak'; filter logic; today weak-areas section (sorted desc, clickable rows, dual empty state); progress row weak count — evidence: e2e weak-flow test passes
- [x] pnpm test (vitest) passes — evidence: 27/27 (7 files)
- [x] pnpm build passes; fonts:subset regenerated (subset characters: 616, 苦 covered); public/fonts committed — evidence: exit 0, manifest diff
- [x] e2e: new weak-flow test; pnpm test:e2e passes — evidence: 40 passed (15.9s)
- [x] DESIGN.md today-view line check — line 38 already lists "weak areas"; implementation now matches, no edit needed
- [x] Commit + push + PR (trailers per rules) — evidence: PR #11; rebased on quiz PR #12,
      conflicts resolved (App.tsx nav/filter consts, ui.ts types, tests, fonts regenerated
      from merged sources: 639 subset chars), vitest 42/42 + e2e 41/41 post-rebase

## Notes

- fonts.test.ts enforces only wordmark/hero/page-header strings, but `.section-heading h2`
  also renders in --display; manifest regen keeps the new 苦手エリア heading visually consistent.
- Barlow subset hash unchanged (ASCII already covered); only zen-kaku-gothic-new-900 re-hashed.
- Today-view empty state renders the "before start" variant during SSR/pre-hydration (`!ready`),
  which keeps the no-JS e2e invariant (no enabled buttons) intact.
- Browser-pane visual spot check: today view renders with existing tone; populated-state
  screenshots blocked by a pane rendering glitch — functional coverage relies on Playwright.
- Second rebase (PR #13, 35 new cards): only tasks/todo.md conflicted; tests auto-merged
  (both sides import cards from src/content). #13's section preserved below.

---

# 想起カード拡充（コンテンツ追加のみ）— 2026-07-17〜18

Branch: `claude/mystifying-heyrovsky-a4464f`（origin/main = 44cf2b5 から分岐、PR #13）

## Constraints

| Constraint | Source | Verify by |
|------------|--------|-----------|
| 各objectiveが合計2枚以上でカバー | user msg | 集計で全30 objective >= 2 |
| 約30枚追加、D1最優先→重み順 | user msg | 追加枚数とドメイン別内訳 |
| kind 3種のバランス、contrast重視 | user msg | kind別集計 |
| ja/en 4フィールド全記述 | user msg | pnpm test (zod) |
| sourceIds実在、新規ソースはWebFetch確認 | user msg | pnpm test + validate.ts |
| 新規ソースは platform.claude.com / code.claude.com / modelcontextprotocol.io 配下のみ | user msg | sources.ts diff |
| 全主張を公式Docsで裏取り（記憶で書かない） | user msg | Notesのfetch記録 |
| 試験問題の複製・再構成禁止 | user msg / cards.ts冒頭 | 独自作成のみ |
| 既存カード改変禁止 | user msg | git diff がカード追加+sources追加のみ |
| UI・型・スケジューラ変更禁止 | user msg | git diff 対象ファイル |
| pnpm test / test:e2e / build 全パス | user msg | exit 0 |

## 結果

- [x] cards.ts へ35枚追加（D1:8, D2:7, D3:7, D4:7, D5:6、16→51枚。kind: recall16/contrast15/scenario20）
- [x] 全30 objective >= 2 カバレッジを一時vitestで機械確認
- [x] sources.ts へ define-tools を追加（verifiedAt=2026-07-18、WebFetchで実在・内容確認）
- [x] pnpm test 22/22 / pnpm test:e2e 39/39 / pnpm build 0 errors（マージ前時点）
- [x] PR #13 作成、Vercelチェック全pass

## Notes

- WebFetchで裏取りしたページ（2026-07-17〜18）: stop-reasons / how-tool-use-works / subagents / sessions / hooks-guide / agent-sdk claude-code-features / mcp / memory / agent-sdk skills / how-claude-code-works / best-practices / headless / develop-tests(evals) / claude-prompting-best-practices / structured-outputs / batch-processing / context-windows / context-editing / user-input / large-codebases / features-overview / MCP spec tools / define-tools。
- 逸脱1: 新規カードのverifiedAtを実際の検証日(2026-07-18)にするため、card()ヘルパーへ省略可能なverifiedAt引数を追加（既定値VERIFIED_ATで既存カードのデータは無変更）。
- 逸脱2: tests/app.spec.ts の2件がカード総数(16枚時代)をハードコードしており失敗（practice一覧15→16枚、進捗「1/4」）。期待値をsrc/content/cards.tsから導出する形に更新。アプリ側は非変更。
- フォントサブセット再生成は不要: .card-prompt h3 は--display非対象（subset-fonts.mjsの抽出対象はh2/wordmarkのみ）。
- 既存カードの誤りは発見なし。
- マージ時: main側のPR #12（quiz view）とコンフリクトは tasks/todo.md のみ。main版を採用し本セクションを追記。tests/app.spec.ts は自動マージ（quizテストと共存）。
