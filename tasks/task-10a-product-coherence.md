# Task 10A — プロダクト整合性・学習導線の再設計

> 目的: 新機能を増やさず、既存機能（Study Guide / Hands-on / 公式シナリオ / Practice / Quiz /
> Mock Exam / 履歴 / 復習 / 学習分析）を、初見の一般利用者が迷わず使える一つの学習サービスとして統合する。

## 開始条件（記録）

| 項目 | 値 |
|------|-----|
| baseline main SHA | `1817863da639549f4dba9fe99c090ece234f12e2` (PR #39 / Task 9) |
| branch | `feature/task-10a-product-coherence`（origin/main から作成） |
| PR #36–#39 マージ済み | ✅ 確認（origin/main HEAD = #39） |
| Task 9 Learning analysis | ✅ 存在（`src/lib/mock-exam-analysis.ts`, `MockExamAnalysis*`） |
| unit test baseline | ✅ 407 passed / 18 files |
| production build baseline | 計測中（bg） |
| full E2E baseline | 70 tests / 15 spec files（`@slow` タグ 15 箇所） |

## 現在の画面構成（実測）

- エントリ: `src/pages/index.astro` → `src/components/App.tsx`（モジュラー構成、361行）
- View: `today` / `guide` / `practice` / `quiz` / `progress` / `hands-on` / `official-scenarios` / `mock-exam`
  （`src/components/app/types.ts`）。bottom/rail nav は `today/guide/practice/quiz/progress` の5つ
  （`AppNavigation.tsx`）。hands-on / official-scenarios / mock-exam は Guide/Today 内から遷移。
- StudyData(v3): `reviews` / `quizStats` / `studyGuideProgress` / `handsOnProgress` /
  `activeMockExam` / `mockExamAttempts`（`storage-schema.ts`）。
- MockExamView は内部で phase 管理（landing/running/result/history/analysis）。App は `readData/writeData`
  ブリッジと `session`/`attempts` を渡す（engine を初期バンドルに含めない設計）。

## 確認済み問題（監査）

| # | 問題 | 位置 |
|---|------|------|
| P1 | 学習パスが `available:false`（模試・誤答修正・本番直前）を「今後利用可能」表示 | `ui.ts:639/1154`, `GuideView.tsx:76` |
| P2 | 二重番号 `1. 1.`: `<ol>` native marker + `<strong>{index+1}.</strong>` | `GuideView.tsx:70`, `global.css:461`（list-style 未指定） |
| P3 | 日付依存 copy「8月末までの進め方 / How to use the time through the end of August / 残り期間 / remaining time」 | `ui.ts:641/1156`（`calendarTitle`/`calendarBody`） |
| P4 | 学習パス構造が i18n(ja/en) に重複（label/target/available）→ locale 間 drift | `ui.ts:108/639/1154` |
| P5 | 診断結果がセクション名を表示するだけで対象セクションを開かない | `GuideView.tsx:52–64` |
| P6 | Guide 上部に説明/診断/パス/Hands-on入口/公式シナリオ入口/カレンダー/詳細 が並列で優先順位不明 | `GuideView.tsx:47–128` |
| P7 | Today の Mock Exam CTA が状態非依存で常に「模試を開始」 | `TodayView.tsx:50` |
| P8 | Today「苦手エリア」がカード評価由来なのに模試分析と区別されない／分析導線なし | `TodayView.tsx:52–68` |
| P9 | Progress が Practice カード進捗中心。Guide/Hands-on/Quiz/Mock Exam 集計なし | `ProgressView.tsx` |
| P10 | 日本語 UI に専門用語（compatible回答/stale回答/raw正答率/反復exposure） | `ui.ts:883/935/1002-1004/1017/1032/1037/1045/1047` |
| P11 | README が現行機能に未追従（Mock Exam/分析/履歴/復習等の記載なし） | `README.md` |

## 変更方針

### A. capability の single source（P1/P4）
- 新規 `src/content/learning-path.ts`: locale 非依存の typed data。
  - `LearningPathStage { id; order; target: View | 'guide-diagnosis'; sectionAnchor?; capability }`
  - 全 stage は現在利用可能な機能のみ（`available` フラグは廃止＝全て実装済み前提）。
- i18n(`copy.guide.path`) は `title`/`description`/`cta`（ラベル）のみ locale 別に保持。
  - `path` の件数・順序・target は typed data が single source。i18n は `Record<stageId, {title,description,cta}>`。
- 8段階（推奨）: `start(Guide診断)` → `guide` → `hands-on` → `practice` → `quiz` → `mock-exam` →
  `analysis(mock-exam history/analysis)` → `repeat(analysis/practice)`。全 stage に具体 CTA。

### B. 二重番号（P2）
- `GuideView.tsx` の `<strong>{index+1}.</strong>` を削除。native `ol > li` marker を唯一の番号源に。
- `global.css` の `.guide-path ol` は `list-style` を隠さない（現状 padding-left のみ＝native marker 表示のまま）。
- E2E で番号が一度だけ表示されることを検証（`li` テキストが `/^\d+\.\s*\d+\./` に一致しないこと）。

### C. 診断 → actionable（P5）
- 名称変更「初回診断」→「学習開始地点を選ぶ / Choose where to start」。
- 結果表示後、「このセクションを開く」CTA を追加。押下で:
  対象 `<details id="guide-section-{id}">` を `open=true` → `scrollIntoView` → `summary` に focus。
  対象なしでも例外を起こさない。進捗は保存しない（既存の明示「開始」保存仕様は維持）。
- 既存 3択→開始セクション mapping（`diagnosisStarts`）は維持。

### D. Guide 上部の情報設計（P6）
- 3セクションへ整理: 1) このサービスの使い方 2) 推奨学習サイクル(=学習パス+診断) 3) Study Guide セクション。
- 重複する大きな Hands-on / 公式シナリオ入口ブロック（`guide-handson-entry` ×2）は学習パスへ統合し削除。
  補助導線が要る場合は学習パス stage の CTA が担う。
- `guide-calendar`（日付依存）ブロックは削除、または「推奨学習サイクル」の非日付 copy に置換。

### E. Today（P7/P8）
- Mock Exam CTA 状態分岐: session/attempt なし=「模試を開始」/ active session=「模試を再開」/
  attempt あり active なし=「模試と結果を開く」。ja/en 同分岐。TodayView に `session`/`attempts` を渡す。
- 苦手ラベル変更「カード練習でつまずいた領域 / Areas that need review in card practice」。
- attempt ≥1 のとき Today に補助導線「模試の学習分析を開く / Open mock-exam learning analysis」。
  → `onOpenMockExamAnalysis`（App が mock-exam view を analysis phase で開く）。

### F. Progress をサービス全体に（P9）
- App から ProgressView へ既存 StudyData を渡し、以下を derive（新 schema なし）:
  - Study Guide: `deriveStudyGuideProgress`（completed/total, inProgress, stale）+ Guideを開く CTA
  - Hands-on: `deriveHandsOnProgress` + steps 集計（`getHandsOnStepProgress` 合算）+ Hands-onを開く CTA
  - Practice: 既存（reviewed/total, weak, due）維持
  - Quiz: `quizStats` から unique answered / total attempts / correct attempts（合否・readiness 算出しない）
  - Mock Exam: completed attempts, active session 有無, 最新 correct/total, 最新単純正答率,
    Mock Examを開く CTA, attempt ありで Learning analysis CTA
  - データ管理/source/disclaimer 既存維持
- ProgressView への nav は App の `navigate('guide'|'hands-on'|'practice'|'quiz'|'mock-exam')` を再利用。

### G. 日本語専門用語（P10）
- `raw正答率`→`単純正答率` / `compatible回答`→`現在の問題と対応する回答` /
  `staleのため…除外した回答`→`内容更新のため分析から除外した回答` / `反復exposure`→`同じ問題への繰り返し接触` /
  `stale回答`→`内容更新のため除外した回答`。意味・計算式・型名・英語(説明付き)は不変。

### H. README（P11）+ capability drift 防止（section 11）
- README に現行機能・推奨学習順序（非日付）を追記。公式情報最終確認日と content 側 `VERIFIED_AT` の
  不整合検出 unit test を追加。
- content validation / unit test: learning-path 全 target 有効・ja/en 構造一致・order 1..n 連続・重複なし・
  CTA 欠落なし・存在しない guide section 参照なし・利用者向け copy と README に「8月末/end of August」なし。

## 非変更範囲（section 14 準拠）
問題bank内容・正解・rationale・Study Guide/Hands-on/公式シナリオの技術的主張・Mock Exam selection/scoring・
Learning analysis thresholds・storage schema/migration・公式 scaled score/合否/readiness・backend/login/cloud/
課金/telemetry/GA event・chart library・新 router。過剰な全面リファクタも避ける。

## 検証方法
- `pnpm test`（unit 全件、新 validation 含む）
- `pnpm build`（astro check + build, exit 0）
- `pnpm test:no-analytics`
- `pnpm test:e2e:fast` / full / `test:e2e:a11y`（axe 新規違反 0）
- 新 `tests/product-coherence.spec.ts`（section 12 の 1–20）
- visual QA: ja/en × {375×812, 768×1024, 1440×1000} で Today/Guide上部/learning path/Progress
- bundle 比較（main vs branch, gzip）+ Lighthouse 3-run median（perf≥0.90 / FCP≤2000 / LCP≤3000 / CLS≤0.02）
- fresh-context subagent review（section 17）

## Constraints（Constraint Ledger）

| Constraint | Source | Verify by |
|------------|--------|-----------|
| storage schema / migration を変えない | user §14 | `git diff src/lib/storage-schema.ts` が空 |
| 新 dependency 追加なし | user §14/§16 | `git diff package.json` が空 |
| 正解/rationale/問題bank 不変 | user §14 | `git diff src/content/{questions,rationales,cards}.ts` が空 |
| Learning analysis の計算式/threshold 不変 | user §9/§14 | `mock-exam-analysis.ts` の数値ロジック diff なし |
| ja/en で learning path 構造一致 | user §2.3/§11 | unit test |
| 実装済み機能を unavailable 表示しない | user §2.2 | unit test + E2E |
| 利用者向け copy に「8月末/end of August」なし | user §2.1/§11 | 禁止語 unit test（copy+README 限定） |
| 二重番号なし | user §4 | E2E 正規表現 |
| 既存回帰維持（§15 の全項目） | user §15 | 既存 E2E 全 green |
| 初期 bundle を大幅増加させない | user §16 | main/branch bundle 比較 |

## Assumptions（Assumption Ledger）

| Assumption | Status | Evidence |
|------------|--------|----------|
| MockExamView は初期 phase を prop で受けられるよう最小変更可能 | VERIFIED | `MockExamView.tsx:66` `useState<Phase>('landing')` を初期値化するだけ |
| 分析を直接開くには mock-exam view に analysis intent を渡せばよい | VERIFIED | phase='analysis' が `MockExamAnalysisEntry` を描画（`MockExamView.tsx:300`） |
| `deriveStudyGuideProgress`/`deriveHandsOnProgress` が Progress 集計に十分 | VERIFIED | summary 型に completed/inProgress/stale/total 有り（progress libs） |
| Hands-on steps 合算は `getHandsOnStepProgress` を全 guide で回せば得られる | INFERRED | `hands-on-progress.ts:55` 単一 guide 版が存在 |
| `quizStats` に unique/attempts/correct を出す派生関数が無い→ Progress でインライン集計 | VERIFIED | `QuizStat={attempts,correct,...}`（storage-schema.ts:19） |
| 学習パス typed data 化で i18n の path 型を変えても既存テストは copy 参照が中心 | UNVERIFIED | guide.spec.ts 精読で確認予定 |
| bottom nav 5項目は不変（mock-exam/hands-on/official は sub-view のまま） | VERIFIED | `AppNavigation.tsx:6–11` の設計コメント |

## Notes（実装中の逸脱ログ）

### Bundle baseline (main, gzip)
- App(entry): 12625 / GuideView: 7737 / MockExamView: 7866 / MockExamAnalysis: 3556
- questions: 65493 / rationales: 37682 / cards: 26940 / OfficialScenarios: 19666 / hands-on: 18183
- total JS gzip: **218036**

### Bundle result (branch, gzip)
- App(entry): **12968** (baseline 12625, +343 ≈ +0.3KB) — study-guide/hands-on content stayed OUT of the
  initial static graph (only dynamic `import()` refs). New lazy `ProgressOverview` chunk = 1345.
- total JS gzip: 223469 (baseline 218036, +5433 spread across GuideView/ProgressOverview/ui copy; not initial).
- 初期bundle増加は entry +0.3KB のみ → §16「大幅に増やさない」を満たす。

### 実装済み（Notes）
- 学習パスを typed data 化（`src/content/learning-path.ts`）。i18n は `copy.guide.stages` に title/description/cta のみ。
- 二重番号: `<strong>{index+1}.</strong>` 削除、native `ol` marker が唯一の番号源（CSS `list-style` 非none維持）。
- 診断→actionable: 結果に「このセクションを開く」CTA。details open + scroll + summary focus。進捗は保存しない。
- Guide 情報設計を3セクションへ（使い方/推奨学習サイクル(+診断)/Study Guide）。重複 Hands-on/公式入口ブロック・
  カレンダー(8月末)ブロックを削除。公式シナリオは簡潔な補助リンクで dead end 回避。
- Today: Mock Exam CTA 状態分岐（開始/再開/結果を開く）、苦手ラベル変更、attempt時に分析リンク追加。
- MockExamView に `initialPhase`（'analysis' で直接分析を開く。attempt 0 なら landing フォールバック）。
- Progress: lazy `ProgressOverview`（Guide/Hands-on/Practice/Quiz/Mock Exam 集計 + byDomain）。全て既存 StudyData から
  derive。Mock Exam の正答数は `answer.correct`（content-free、engine 非import）で算出。
- 日本語専門用語を一般向けへ（raw正答率→単純正答率 等）。英語は説明付きのため維持。
- README に機能一覧 + 推奨学習順序（非日付）追加。VERIFIED_AT 一致 test 追加。
- 新 unit test `learning-path.test.ts`（12件: drift/parity/order/CTA/forbidden words/README date）。
- 新 E2E `product-coherence.spec.ts`（17件、うち @slow 4）。

### テスト breakage 修正（既存 spec を新 UI に追従）
- fixtures/app.ts: hands-on 入口を 'Hands-onを開く' に。
- practice.spec: '苦手エリア'→'カード練習でつまずいた領域'。
- mock-exam.spec: 'raw正答率'→'単純正答率'。
- mock-exam-analysis.spec: compatible/stale 用語を新 copy に。
- official-scenarios.spec: 'シナリオ判断'(旧path label)→'公式シナリオ一覧へ'(aux link)。

### Lighthouse (desktop preset, 3-run median, same host)
| metric | main | branch | budget | 判定 |
|--------|------|--------|--------|------|
| performance | 1.0 | 1.0 | ≥0.90 | ✅ |
| FCP | 302ms | 365ms | ≤2000 | ✅ |
| LCP | 628ms | 703ms | ≤3000 | ✅ |
| CLS | 0 | 0 | ≤0.02 | ✅ |
- 差分は run 間ノイズ域（+63/+75ms）で、いずれも budget を大きく下回る。初期 entry chunk +343 gz と整合。

### 検証サマリ
- unit: 419 passed（+12）/ build: exit 0 / no-analytics: passed
- E2E full: 122/123（1件は accessibility.spec:57 の既知フレーク＝単体・グループ再実行で green、変更対象外の quiz review 経路）
- product-coherence.spec: 17/17 / axe 新規違反 0
- visual QA: ja/en × {375,768,1440} で二重番号なし・横スクロールなし・英語ラベル overflow なし・階層自然

### 逸脱ログ
- 診断 recommendation を `<p>` から `<div>`（p + open CTA）へ変更。guide.spec の `.guide-recommendation` focus 前提は
  div も focusable なので維持。
- Progress overview を lazy 分割（GuideView 等と同パターン）。理由: §16 の初期bundle制約と §8 の集計追加の両立。
  非変更範囲の「全面リファクタ回避」に反しない最小の分割。
