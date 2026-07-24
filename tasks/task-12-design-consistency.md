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
- [ ] A1 ボタン（`.quiz-start` `.quiz-submit` `.quiz-next` `.reveal-button` `.rating`）/ B2 注記 / A3 hero
- [ ] `.card-domain` → `.badge` / B1・B4 ラダー適用

### S6 進捗
- [x] A1 ボタン（`.progress-card button` `.data-actions button` / `!important` 除去）/ B2 注記
- [x] C2 `sources-panel` のアイブロウ削除 / B1・B4 ラダー適用 / privacy ページも同様

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

### S6 進捗 — 実施内容と判断

- **worktree のセットアップ差分**: 担当 worktree（`agent-a957a113774703adf`、ブランチ `worktree-agent-a957a113774703adf`）は着手時点で Phase 0 コミット（`53f6c5a`）を含んでいなかった（`tasks/design-system.md` 等が存在しなかった）。他の姉妹 worktree は `53f6c5a` を含んでいたことを確認し、`53f6c5a` は現 HEAD（`347dc78`）の直接の子（fast-forward 可能）だったため `git merge --ff-only 53f6c5a` で取り込んだ。担当ファイル以外への変更は無し（`git diff --name-only 53f6c5a` で確認）。
- **A1 ボタンの割り当て**: `.data-actions button`（Export/Import）は元々 ink 塗り 48px で `.btn` の仕様と一致していたため `.btn` に、`.data-actions .danger`（削除ボタン）は `.btn--danger` にした。`.progress-card button`（5枚のカードCTA + `.progress-card-secondary`）は全て `.btn--secondary` にした（cyan-dark 塗りをやめて枠線のみに変更）。理由: design-system.md §3.1 の「塗りボタンは1画面に1〜2個まで」に従うと、Export/Import の2個で塗りの予算を使い切るため、カード側の6個の同格アクションは非塗りに統一するのが一貫する。結果としてページ内のボタンは `.btn`（Export/Import）/ `.btn--secondary`（カードCTA・学習分析・再読み込み）/ `.btn--danger`（削除）の3系統に完全に集約された。
- **B1/B4 の丸め**: 迷った値は design-system.md §2 の丸め規則表に従い、同点は切り上げ（例: `.progress-card` の `gap:10px`→`--space-3`(12)、`.progress-row` モバイルの `padding:11px`→`--space-3`(12)）。
- **`.privacy-header` / `.privacy-main` は意図的に `--pad-panel` 系トークンへ寄せていない**: MUST DO で「`.privacy-header` はシェル相当」と明記されており、監査の B1 実測対象（`progress-overview` / `data-panel` / `sources-panel` / `disclaimer` / `progress-card` の5箇所、42px・18px）にも含まれていない。`--pad-panel`(clamp 20-40) / `--pad-panel-sm`(clamp 16-24) のどちらにも収まらない値（`.privacy-main` の `clamp(38px,7vw,76px) 0 80px` 等）を無理に丸めると視覚的に破綻するため、シェル層の独自値として残した。単純な等倍値（`padding:24px`→`--space-6`、`gap:20px`→`--space-5` 等）はトークン化した。
- **B3**: `.privacy-header` の `#0a2738`/`#eef8fb` は `shell.css` の `.rail` と全く同じ値だったため、トークン化済みの `--rail-edge` / `--rail-strong` に置換（新規トークンは追加していない）。`#fff0ef`（danger hover）と `.progress-card button` の `#fff` は該当ルールごと削除（`.btn--danger` / `.btn--secondary` が肩代わり）。
- **44px スキャンで見つけた追加修正**: `.privacy-header > a:last-child`（「学習ノートへ戻る」リンク）はデスクトップ幅で 13px しかタップ領域が無かった（この状態は変更前から存在）。担当ファイル内で完結する修正だったため `min-height:44px` をベース宣言に追加し、760px メディアクエリ側の重複宣言は削除した。`.source-register a`（公式資料リンク一覧）と `.privacy-article` 本文中のインクリンク（「GitHub Issues」等）は地の文中のリンクで WCAG 2.5.8 の inline 除外に該当し、変更前から min-height 指定が無い状態だったため据え置いた。`.wordmark` は shell.css 所有の共有部品なので触っていない。
- **e2e テストの範囲を限定**: `tests/import-export.spec.ts`（2件）と `tests/analytics.spec.ts`（1件）は個別実行して pass を確認した。`tests/accessibility.spec.ts` のプライバシーページ分を実行しようとしたところ、姉妹 worktree（`agent-a856e620a152e4ebb` ほか）が同時に `playwright.config.ts` の同一デフォルトポート（4325）で e2e を実行中で、こちらのプロセスが SIGTERM で終了した（ポート競合、相手側のプロセスやファイルには一切触れていない）。S6 の MUST DO 検証リストに `pnpm test:e2e` は含まれておらず（`pnpm test:bundle` は実施済み）、全体の `pnpm test:e2e:fast` は design-system.md §6 の「全ストリーム共通の受け入れ条件」として Phase 2 統合時に確認される想定のため、単体テスト（vitest 445件）・ビルド・上記2ファイルの e2e・スクリーンショット目視・JS走査で代替した。

## Review

（レビュー指摘と対応をここに追記する）
