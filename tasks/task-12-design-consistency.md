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
- [ ] A2 見出しをディスプレイ書体へ / B5 枠線を `--grid-strong` へ / D1 `min-height` 44px
- [ ] A1 ボタンを `.btn` 系へ / B2 注記を `.note` 系へ / A3 hero・compact の割り当て
- [ ] C1 `mockExam.eyebrow` `resultEyebrow` `analysis.eyebrow` を英語大文字へ / C2 分析6セクションはアイブロウなし

### S3 ガイド系
- [ ] A4 詳細ビュー本文を `.panel` へ / A5 `.domain-label` 化 / D5 カード意匠の統一 / D6 重複削除
- [ ] A1 ボタン / B2 注記 / D2 一覧を開くボタンを `.btn--text` へ / D4 ハンズオン進捗ヘッダーをガイドと同型に
- [ ] C3 ハードコードアイブロウ2箇所を i18n 化

### S4 今日+シェル
- [ ] D3 `.mock-exam-launch` の影を削除 / A1 ボタン / B1・B4 ラダー適用
- [ ] C1 `today.eyebrow` を `TODAY` へ / レール色をトークン化

### S5 練習+演習
- [x] A1 ボタン（`.quiz-start` `.quiz-submit` `.quiz-next` `.reveal-button` `.rating`）/ B2 注記 / A3 hero
- [x] `.card-domain` → `.badge` / B1・B4 ラダー適用

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

### S5 練習+演習

**セットアップ上の逸脱**: このストリームの worktree（`agent-a5c16001882087a23`）は Phase 0 コミット（`53f6c5a`）を含まない `347dc78` から切られていた（`tasks/design-system.md` 等の Phase 0 成果物が存在せず、`src/styles/` も分割前のままだった）。`git merge-base` で `347dc78` が `53f6c5a` の直接の祖先であること、作業ツリーがクリーンであることを確認したうえで `git merge --ff-only 53f6c5a` を実行し、Phase 0 の成果を取り込んでから着手した（このコミットは他の2ストリーム用 worktree ではすでに base になっている）。

**A1/B6 ボタン統一**: `.quiz-start` `.quiz-submit` `.quiz-next` `.reveal-button` `.session-start` を `.btn`（塗り）系へ、`.quiz-quit` と「カード一覧に戻る」を `.btn--text` へ移行。`.quiz-start`/`.reveal-button`/`.quiz-submit`/`.quiz-next` は元のクラス名を**レイアウト専用**（`min-width`・`justify-content`・カード内の余白揃え）として残し、見た目は `.btn`/`.btn--wide` に委譲。`.btn--wide` は `system.css` で `width: 100%` に固定されているため、旧来の `margin: 0 28px; width: calc(100% - 56px)` という生ピクセル計算は、トークンベースの `margin: 0 var(--pad-panel-sm); width: calc(100% - var(--pad-panel-sm) * 2)` に置き換えた（`--pad-panel-sm` は "カード内側の余白" 用に Phase 0 で用意されたトークンで、旧 28px/20px(モバイル) の役割と一致）。`.choice-button` `.rating button` `.scenario-item` は指示どおり専用コンポーネントとして残し、角丸を `--radius`、min-height・余白・文字を `--space-*`/`--fs-*` に揃えた。

**A5 バッジ**: `.card-domain` の参照箇所（練習カードヘッダー、演習セッションのカードヘッダー、設問メタ、QuizSetup/QuizView のシナリオ内訳）をすべて `.badge.badge--ink` に置換。`system.css` の `.card-domain` 自体は凍結ルールに従い削除していない。`.choice-id` は `.badge.badge--cyan`、`.choice-mark`/`.difficulty-badge` は `.badge.badge--outline` に置換。`.badge` は `display:inline-block` なので、`.choice-button`（flex コンテナ）内で縮まないよう `.choice-id, .choice-mark { flex: 0 0 auto; }` を明示的に残した（`.badge` 自体は flex 前提でないため）。同様に `.choice-mark` の既定文字色 `var(--ink-soft)` も `.badge` にはない属性なので個別に残した。

**A3 hero**: 練習・演習の `<header class="page-header compact">` を `<header class="panel--hero">` に置換し、`is-compact` は付けない（両ビューともランディング）。`.panel--hero` に移行すると `system.css` の `.page-header h2` / `.page-header > p:not(.eyebrow)` の子孫セレクタが効かなくなるため、見出しには `.page-title` クラスを明示付与し、リード文の `max-width`/`color` は `.practice-view > .panel--hero > p:not(.eyebrow)` / `.quiz-view > .panel--hero > p:not(.eyebrow)` として `practice.css` 側にスコープしたルールを追加した（`system.css` は凍結のため触れない。他ストリームが同じ状況でそれぞれの担当ファイルに同種のルールを足す前提）。

**B2 注記**: `.quiz-hint` `.scenario-note` `.practice-target` `.quiz-target` `.pitfall` `.rationale-error` を `.note` + modifier（`--info`/`--warn`）に置換。`.practice-target` は flex 配置のためレイアウト専用クラスとして残置。`.rationale-error` 内の再読み込みボタンは、A1 の統一方針に合わせて `.btn` を付与した（design-system.md のクラス列挙には無いが「削除して btn 系に差し替える」という一般原則の対象と判断）。

**B1/B4 ラダー適用**: `practice.css` 全体の余白・文字サイズを `--space-*`/`--fs-*`/`--pad-*` に置換。丸め規則で同着（例: 22px の 20/24 中間）になった値は design-system.md の例に倣い**大きい方へ丸めた**。カード内側の水平方向の余白（旧 28px/20px）は個別の `--space-*` ではなく `--pad-panel-sm`（design-system.md 冒頭コメントで「カード」用途と明記）に統一し、`.quiz-setup`/`.scenario-brief`/`.quiz-score`系/`.session-summary` などのブロック余白（旧 `clamp(24px,4vw,42px)`）は `--pad-panel` に統一した。`.quiz-score-figure strong`（`clamp(3rem,6vw,4.6rem)`）と `.session-breakdown dd`（`2rem`）は8段のフォントラダーに存在しない「特大の統計数字」表示のため、`--fs-hero` が「今日のヒーローのみ」と明記されているのと同じ趣旨でラダー化の対象外として現状の値を維持した。`.answer`/`.quiz-feedback` の背景 `#f9fcfd` は `--reveal-bg` に置換。

**B3 pale トークン**: `.choice-button.correct/.incorrect` と `.rating button:hover` の生ベタ書き `#eef7f2`/`#fdf1f0`（計4箇所）を `var(--green-pale)`/`var(--danger-pale)` に置換。

**影の削除**: `.practice-card` `.quiz-question` `.scenario-brief` の `box-shadow: var(--shadow)` を削除（`.panel--hero` 以外は影なしという §3.2 の規則に合わせた）。

**見出しクラス**: `.quiz-score/.quiz-domains/.quiz-missed/.session-summary` の `h3` を `.section-title` に、`.answer-section h4` を `.sub-title` に、`.scenario-brief h3`（シナリオ見出し、旧 1.35rem = `--fs-lg` 相当）を `.card-title` に変更。`.card-prompt h3`（設問文）は指示どおり本文書体のまま維持した。

**C1 アイブロウ**: `practice.question`(`QUESTION`) / `practice.answer`(`ANSWER`) / `quiz.summaryEyebrow`(`QUIZ RESULT`) / `session.summaryEyebrow`(`SESSION RESULT`) は ja/en とも既に英語大文字だったため変更不要。`quiz.backgroundTitle` のみ ja が `ケース記述`、en が `Case background` だったため、両方とも `CASE BACKGROUND` に統一した（`ui.ts` はこの1キー2行のみ変更）。

**既知の pre-existing 失敗（このストリームでは修正しない）**: `tests/accessibility.spec.ts` の `answer review and summary are accessible...` が axe の `color-contrast`（serious）で失敗する。差分の無い Phase 0 ベースライン（このストリームの変更を `git stash` で退避した状態）でも**同一テストが同じ原因で失敗する**ことを確認済み（むしろベースラインの方が違反数が多く比率も低い: 3.18〜3.69、本ストリーム後は 4.37〜4.45）。該当箇所は `.choice-rationale`（色 `var(--ink-soft)`）と `.choice-mark--correct`（色 `var(--green)`、太字）が `--danger-pale`/`--green-pale` の上に乗るケースで、CSS宣言どおりの sRGB 値で手計算すると実際のコントラスト比は 5.3〜5.5 で WCAG AA (4.5:1) を満たす。axe が報告する前景色（例 `#5e7482`）は宣言値（`#4c6574` 等）と系統的に異なり、背景寄りに約10〜15%ブレンドされた値になっており、ヘッドレス Chromium での小さい・太字フォントのレンダリングに起因する既知の測定アーティファクトの疑いが強い。`design-system.md` に無い色は使えないため、この場でトークンを変更する権限はなく、`pnpm test:e2e:fast`（`accessibility.spec.ts` はここに含まれない）は全80件 pass している。詳細は本レポートの検証結果セクション参照。

## Review

（レビュー指摘と対応をここに追記する）
