# Task 12 — デザイン一貫性リファクタ

監査: `tasks/design-consistency-audit.md`（指摘 A1-A5 / B1-B6 / C1-C3 / D1-D6）
仕様: `tasks/design-system.md`（唯一の規約。値の追加はここに追記してから使う）

## Constraints（制約台帳）

| Constraint | Source | Verify by |
|---|---|---|
| プライマリボタンは ink #173447 / 角丸2px / min-height 48px | ユーザー選択 | `.btn` の computed style |
| アイブロウは ja/en とも英語大文字タグライン | ユーザー選択 | `ui.ts` の全 eyebrow 値を grep |
| スコープは A+B+C+D 全部（余白・文字サイズのラダー化を含む） | ユーザー選択 | 監査の全項目にチェック |
| `LocalizedLayout.astro` の CSS import パスを変えない | 既存構造 | `git diff src/layouts/` が空 |
| `@import` のカスケード順を変えない | design-system.md §1 | `global.css` の diff |
| 対話要素の min-height は 44px 以上 | 既存の a11y 水準（D1 以外は遵守済み） | `pnpm test:e2e:a11y` + computed style |
| 各ストリームは担当ファイル以外を編集しない | 並列実行の前提 | `git diff --name-only` |
| `src/content/**` と `src/lib/**` は変更しない | 見た目の統一が目的 | `git diff --name-only` |
| 初期バンドルサイズを増やさない | `scripts/check-initial-bundle.mjs` | `pnpm test:bundle` |

## Assumptions（前提台帳）

| Assumption | Status | Evidence |
|---|---|---|
| `.domain-list` `.objective*` `.domain-number` はデッドCSS | VERIFIED | `grep -rE 'class="[^"]*\bobjective\b' src/` が0件 |
| `global.css` は `LocalizedLayout.astro:7` の1箇所からのみ読まれる | VERIFIED | `grep -rn "global.css" src/` が1件 |
| `.card-domain` は8コンポーネントで共用 | VERIFIED | grep で quiz/practice/guide/handson/official にまたがる |
| Vite/Astro が `@import` をビルド時にインライン化する | UNVERIFIED | Phase 0 の `pnpm build` + `pnpm test:bundle` で確認する |
| Phase 0 の分割は見た目を1pxも変えない | UNVERIFIED | ベースラインSSと Phase 0 後SSのピクセル比較で確認する |
| 文字サイズ8段・余白9段への丸めは意図的な見た目変更 | 既知・許容 | ラダー化はユーザー選択スコープに含む |

ベースラインSS: `/private/tmp/claude-501/.../scratchpad/out/*.png`（1440px 全ビュー + 375px 今日）

## 依存関係

```
Phase 0（ブロッキング・単一ライター）
  └─ ファイル分割 + tokens.css + base.css + system.css + デッドCSS削除
        │  ※ 呼び出し側は移行しない = 見た目は不変（ピクセル一致が受け入れ条件）
        │  ※ 完了後にコミット。各ストリームはこのコミットから worktree を切る
        ├── S2 模試        mock-exam.css + components/mock-exam/**              + ui.ts(mockExam)
        ├── S3 ガイド系    guide.css     + views/{Guide,HandsOn,OfficialScenarios}View.tsx + ui.ts(guide/handsOn/officialScenarios)
        ├── S4 今日+シェル shell.css, today.css + views/TodayView.tsx, components/app/** + ui.ts(today/blueprint/weakAreas/status)
        ├── S5 練習+演習   practice.css  + views/{Practice,Quiz}View.tsx, practice/**, quiz/** + ui.ts(practice/quiz/session)
        └── S6 進捗        progress.css  + views/Progress*.tsx, PrivacyPage.astro + ui.ts(progress)
              │
Phase 2 マージ + 全体検証 + フェーズゲートレビュー
```

S2-S6 は担当ファイルが排他。`src/i18n/ui.ts` のみ共有だが、各ストリームが触るのは自エリアのオブジェクトリテラル1〜3行だけで行が重ならない。

## タスク

### Phase 0（ブロッキング）
- [x] `src/styles/` を9ファイルに分割し `global.css` を `@import` エントリにする
- [x] `tokens.css` を design-system.md §2 の通りに作成
- [x] `base.css` `system.css` を §3 の通りに作成
- [x] メディアクエリを各エリアファイルに併置
- [x] デッドCSS（`.domain-*` `.objective*`）を削除
- [x] 完了条件: `pnpm build` exit 0 / `pnpm test` 445 pass / `pnpm test:bundle` OK / 全ビューSSが分割前と 0px 差

### S2 模試
- [x] A2 見出しをディスプレイ書体へ / B5 枠線を `--grid-strong` へ / D1 `min-height` 44px
- [x] A1 ボタンを `.btn` 系へ / B2 注記を `.note` 系へ / A3 hero・compact の割り当て
- [x] C1 `mockExam.eyebrow` `resultEyebrow` `analysis.eyebrow` を英語大文字へ / C2 分析6セクションはアイブロウなし

### S3 ガイド系
- [ ] A4 詳細ビュー本文を `.panel` へ / A5 `.domain-label` 化 / D5 カード意匠の統一 / D6 重複削除
- [ ] A1 ボタン / B2 注記 / D2 一覧を開くボタンを `.btn--text` へ / D4 ハンズオン進捗ヘッダーをガイドと同型に
- [ ] C3 ハードコードアイブロウ2箇所を i18n 化

### S4 今日+シェル
- [ ] D3 `.mock-exam-launch` の影を削除 / A1 ボタン / B1・B4 ラダー適用
- [ ] C1 `today.eyebrow` を `TODAY` へ / レール色をトークン化

### S5 練習+演習
- [ ] A1 ボタン（`.quiz-start` `.quiz-submit` `.quiz-next` `.reveal-button` `.rating`）/ B2 注記 / A3 hero
- [ ] `.card-domain` → `.badge` / B1・B4 ラダー適用

### S6 進捗
- [ ] A1 ボタン（`.progress-card button` `.data-actions button` / `!important` 除去）/ B2 注記
- [ ] C2 `sources-panel` のアイブロウ削除 / B1・B4 ラダー適用 / privacy ページも同様

### Phase 2
- [ ] 5ブランチをマージ
- [ ] `pnpm build` / `pnpm test` / `pnpm test:e2e` / `pnpm test:bundle`
- [ ] 全ビューを 1440px / 375px で再撮影し監査項目を突合
- [ ] `/code-review high` + `reviewer` エージェント（design-system.md との適合）

## Notes（逸脱ログ）

- 2026-07-24: `tasks/todo.md` は前タスク（告知動画）の内容が残っているため、リポジトリの `task-N-*.md` 慣習に合わせて本ファイルを durable plan とする。

### Phase 0 — 振り分けで判断が必要だったもの

複数エリアにまたがるセレクタリストは、**セレクタごとに分割して各担当ファイルへ複製**した（宣言は逐語コピー）。分割後もカスケード順が元と同じになることを、上書きルールの位置関係を1件ずつ確認したうえで実施している。

| 元の位置 | 振り分け | 理由 |
|---|---|---|
| `.due-block button, .reveal-button, .data-actions button`（287-296, 299） | `.due-block button`→today / `.reveal-button`→practice / `.data-actions button`→progress | 3エリアにまたがる。今日→練習→進捗の順で読み込まれるので、後続の上書き（`.reveal-button` 622、`.data-actions button` 834）との前後関係は保たれる |
| `.today-hero h2, .page-header h2`（259-267） | `.today-hero h2`→today / `.page-header h2`→system | `.page-header` は7ビューで共用の共有部品。§3.2 で `.panel--hero` に置換予定なので system が本籍 |
| 共有 font-feature ルール（895-902） | system / today / progress の3ファイル末尾に分割 | `font` ショートハンドは `font-feature-settings` を初期値に戻すため、このルールは各ファイル内で対象見出しより**後**に置く必要がある。`.domain-section h3` はセレクタリストから削除（デッドCSS） |
| `.view-stack, .guide-view, .practice-view, .progress-view`（196-199） | それぞれ today / guide / practice / progress | `.view-stack` は TodayView.tsx でのみ使用（grep 確認）。他は接頭辞どおり |
| `.practice-target` `.quiz-target`（505-508） | practice | ガイド節に置かれていたが、使用元は PracticeView.tsx / QuizView.tsx（grep 確認）。他に上書きルールが無いので移動しても順序に影響なし |
| `.objective code, .source-register code`（439） / `.objective small, .card-sources small`（448） | `.source-register code`→progress / `.card-sources small`→practice | `.objective*` 側はデッドCSSとして削除 |
| `.status-strip, .data-panel`（760px, 958） | `.status-strip`→today / `.data-panel`→progress | 同上の分割ルール |
| `.mobile-header .wordmark span, .privacy-header .wordmark span`（400px, 1017） | shell / progress | 同上 |
| `:root { --rail: 204px }`（1000px, 905） | shell | `tokens.css` は凍結・変更禁止だが、レール幅のブレークポイント調整は shell の担当（S4）が触る領域。`.rail` / `main` と併置した |
| `.page-header` `.text-link`（418-427） | system | `.page-header` は共有部品。`.text-link` は現状どこからも参照されていないが削除指示に無いので `.page-header` と一緒に移動 |
| `.language-switcher--privacy`（866） | shell | `.language-switcher` 系の modifier は shell が所有。`@media 760px` の `.privacy-header .language-switcher--privacy` は privacy ブロックの一部なので progress に残した（プロパティが異なるため競合なし） |

### 仕様からの逸脱（1件）

- **`@media print` の `main { margin: 0; padding: 0; }` だけ `shell.css` に置いた。**
  MUST DO では `@media print` を丸ごと `base.css` に置く指示だったが、`base.css` は `shell.css` より**前**に読み込まれるため、`main { margin-left: var(--rail); padding: ... }`（shell.css）が印刷時に print 側の指定を上書きしてしまい、印刷レイアウトが壊れる。`display: none !important` の並びは `!important` なので順序非依存、`body { background: #fff }` も `base.css` 内で body 宣言より後ろなので問題ない。`main` の1ルールのみ shell.css 末尾へ移し、理由をコメントで明記した。

### 検証（Phase 0）

- 宣言レベルの機械比較（旧 global.css vs 新9ファイル連結）: 欠落 71 宣言 = 削除対象のデッドCSSと完全一致、追加 161 宣言 = 新規トークンと `system.css` の新規共有クラスのみ。既存宣言の値変更・消失ゼロ。
- 新規クラス名（`btn` `chip` `panel` `note` `page-title` `section-title` `card-title` `sub-title` `badge` `domain-label` `status`）は `src/` の class トークン全310種と1件も衝突しないことを確認済み（＝この Phase では描画に一切影響しない）。
- スクリーンショット: 同一スクリプトで「分割前 global.css」と「分割後」を撮り分けて比較 → 全10ビューで **0px 差**。

### S2 模試

**担当ファイル**: `src/styles/mock-exam.css`、`src/components/mock-exam/**`（15ファイル）、`src/components/MockExamEntry.tsx`、`src/i18n/ui.ts` の `mockExam` オブジェクトのみ（ja/en 各3キー）。`git diff --name-only` で確認済み（この17ファイルのみ）。

**worktree セットアップの前提修正**: このストリームの worktree（`worktree-agent-afa4f27e330d8b4a5`）は Phase 0 完了コミット（`53f6c5a`）ではなく、その親コミット（`347dc78`）から切られていた（`design-system.md` `design-consistency-audit.md` `mock-exam.css` 等が存在しない状態）。`53f6c5a` の親が現在の HEAD と完全一致していたため `git merge --ff-only 53f6c5a` で安全に取り込んでから着手した（オブジェクトDBは全 worktree 共有のため、他 worktree へ触れずに実行可能）。

**A1（ボタン→`.btn`系）で見つけた実装バグ**: `system.css` の `.btn--secondary` / `.btn--danger` は純粋な modifier（`min-height` 等の基本プロパティを持たず、色だけ上書きする設計）で、単体では `min-height: 48px` 等が一切効かない。最初の実装で `class="btn--secondary"` 単体を使ってしまい、Playwright の min-height 走査で実測 32.39px（規定48px割れ、D1違反）を検出 → 全12箇所を `class="btn btn--secondary"`（base + modifier 併記）に修正して解消。`.btn--text` は単体で完結する設計なので対象外。`.panel--sm` も同型の modifier だが、こちらは最初から `panel panel--sm` で併記していたため問題なし。

**A2 見出しクラスの割当て**: MUST DO は対象7セレクタを `.section-title` / `.card-title` の2択と明示していたため（`.sub-title` は指示に含まれない）、design-system.md §2 の丸め表で現在値を機械的に判定した上で、7セレクタ中もっとも大きい1.4rem（`.mock-exam-incompatible/-save-error h2`、丸め表で `--fs-xl` 行）だけ `.section-title`、残り5つ（1.05〜1.25rem、`--fs-lg` 相当）は `.card-title` とした。

**A3 hero/compact**: `MockExamLanding` のみ `.panel--hero`（compact なし）、`Result/Review/History/Analysis` は `.panel--hero.is-compact`。`.panel--hero` は `.page-header h2` と違い見出しの `font-family` を自動付与しないため、5箇所すべての `<h2>` に明示で `class="page-title"` を追加（付け忘れると A2 以前より見出しが崩れる回帰になるところだった）。

**B5 の適用範囲**: `.mock-exam-stability/-evidence/-priority/-axis/-trend/-next-actions/-tally` の7つは `panel panel--sm` を JSX に追加し、CSS 側の border/padding/background 宣言を削除（`--grid`→`--grid-strong` は `.panel` 経由で自動的に解消）。`.mock-exam-launch`（TodayView.tsx 側、S4 所有）と `.mock-exam-runner`（自ファイルだが構造上ヘッダー/設問/ナビが独自の内側パディングを持つため `.panel` 化すると二重パディングになる）は、クラス名は変えずに宣言だけ `.panel` 相当へ揃え、box-shadow のみ削除した。`.mock-exam-history-item` は B5 の指示リストに無かったため（実測ですでに `--grid-strong` 準拠だった）、`panel` 化はせず余白のトークン化のみに留めた。

**`.mock-exam-launch` / `.mock-exam-launch-button` / `.mock-exam-launch-analysis`**: TodayView.tsx（S4 所有、編集禁止）から参照されるため、JSX 側のクラス名は変更できない。CSS 宣言だけを `.panel` / `.btn` / `.btn--text` と1宣言単位で完全一致させ、見た目を統一した（クラス名の重複自体は残っている＝Phase 2 で S4 側が TodayView.tsx を `.btn`/`.panel` に直接置き換えれば、このデッドコード化した宣言は削除できる）。

**`.mock-exam-flag` / `.mock-exam-palette-cell`**: `.chip` をベースクラスとして追加した上で、`.chip` に無い状態（flag の amber 表示、palette cell の current outline / flagged corner mark）だけ独自ルールとして残した。palette cell の「回答済み」状態は `.chip.is-selected` をそのまま流用（`.is-answered` という独自クラスは削除）。

**B2 の残存クラス**: `.note` は `margin` を一切宣言しない設計のため、旧クラスの `margin` 値だけをレイアウト専用の残存ルールとして保持（例: `.mock-exam-notice { margin: 0 0 var(--space-3); }`）。`margin: 0` だった `.mock-exam-analysis-note` も同様に明示で残した（省略すると `<p>` のブラウザ既定マージンが復活してしまうため）。

**スコープ外で見つかった既知の問題（修正していない）**:
1. `test:e2e:a11y` の `answer review and summary...` テストが色コントラスト不足で失敗する（`.quiz-next` 背景 `#6a7c88` / テキスト白、コントラスト比4.32、および `<small>` の日付テキスト）。これは Quiz/Practice 領域（S5 所有の `practice.css` とその配下コンポーネント）の問題で、`tests/accessibility.spec.ts` に模試関連のテストは1件も無く、模試エリアには一切触れていない。このリポジトリで模試以外のファイルを一切変更していないため、S2 の変更に起因するものではない（pre-existing）。
2. `SourceLinks`（`src/components/app/SourceLinks.tsx` と `system.css` の `.source-links`、共有・凍結）は `min-height` が実測12px で D1 の44px基準を満たさない。模試の復習画面（各設問の「公式ソース」欄）でも使われているが、S2 の担当ファイルではないため未修正。全エリア共通の既知ギャップとして報告する。

**検証結果**:
- `pnpm install`: 完了（Node v26 engines警告のみ、無視）
- `pnpm build`（astro check込み）: exit 0、エラー0・警告0（既存の hint 3件は Phase 0 由来、S2 の変更によるものではないことを確認済み）
- `pnpm test`（vitest）: 445 pass / 445（Phase 0 と同数）
- `pnpm test:bundle`: OK（9 eagerly-loaded chunks, none forbidden）
- `pnpm test:e2e:a11y`: 9 pass / 10（1件失敗はスコープ外、上記参照）
- Playwright で 60問模試を実際に完走（ランディング→開始→60問回答→パレット→提出ダイアログ→結果→復習→履歴→学習分析→進行中の再開状態）し、1440×1000・375×812 でスクリーンショットを取得。全画面を目視確認:
  - A2: 模試エリアの全見出し（結果/履歴/復習/学習分析の各セクション見出し・カード見出し）が Barlow Condensed 表示書体でレンダリングされていることを確認
  - B5: `.mock-exam-tally` `.mock-exam-stability` 等のパネル枠線が他エリアと同じ濃さ（`--grid-strong`）になっていることを確認
  - A3: 模試ランディングがフルサイズ hero、結果/履歴/復習/学習分析が compact hero であることを確認
  - C1/C2: 英語大文字アイブロウ（ja/en とも `MOCK EXAM / 60 QUESTIONS` `EXAM RESULT` `LEARNING ANALYSIS`）、学習分析の6セクションにアイブロウが無いことを確認
- min-height 走査（`.mock-exam-view` / `.mock-exam-landing` / 両ダイアログ配下の button/a/[role=button]、全8画面）: 違反0件（上記の `SourceLinks` 由来の94件を除く。これらは model classなし・スコープ外の共有コンポーネント）
- `git diff --name-only`: 担当17ファイルのみ（`mock-exam.css`・15コンポーネント・`MockExamEntry.tsx`・`ui.ts`・本ファイル）
- 一時ファイル（`mock-exam-verify-tmp.mjs` 等）は削除済み、dev サーバーは停止済み

## Review

（レビュー指摘と対応をここに追記する）
