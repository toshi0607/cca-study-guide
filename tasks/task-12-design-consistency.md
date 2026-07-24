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
- [x] A4 詳細ビュー本文を `.panel` へ / A5 `.domain-label` 化 / D5 カード意匠の統一 / D6 重複削除
- [x] A1 ボタン / B2 注記 / D2 一覧を開くボタンを `.btn--text` へ / D4 ハンズオン進捗ヘッダーをガイドと同型に
- [x] C3 ハードコードアイブロウ2箇所を i18n 化
- [x] A3 `.page-header` → `.panel--hero`（一覧は素、詳細は `.is-compact`）/ B1・B4 ラダー適用 / §3.7 リネーム
- [x] 完了条件: `pnpm build` exit 0 / `pnpm test` 445 pass / `pnpm test:bundle` OK / 1440px・375px の全5画面SS確認
- [ ] **未完（担当外ファイルのため未修正）**: 下記 Notes「S3 — E2E への影響」の3スペック7アサーションのセレクタ更新

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

### S3 ガイド系 — 判断と逸脱

#### §3.7 リネームの可否（`grep -rnE 'guide-status|guide-targets|guide-statement-ids|guide-domain-badges|guide-section-heading|card-domain' src --include='*.tsx'` の結果に基づく）

| 旧クラス | 参照元 | 判定 |
|---|---|---|
| `.guide-status` | GuideView / HandsOnView のみ | **リネーム実施** → `.status`（`system.css` に既存の `.status` と宣言が完全一致だったので旧ルールを削除） |
| `.guide-targets` | GuideView / HandsOnView / OfficialScenariosView のみ | **リネーム実施** → `.target-list` |
| `.guide-statement-ids` | 同上3ビューのみ | **リネーム実施** → `.statement-ids` |
| `.guide-domain-badges` | 同上3ビューのみ | **リネーム実施** → `.domain-labels` |
| `.guide-section-heading` | GuideView / HandsOnView のみ | **リネーム実施** → `.progress-heading` |
| `.card-domain` | QuestionMetadata / PracticeSession / PracticeView / QuizSetup / QuizView（**S5 担当**）＋ S3 の3ビュー | **リネームせず現行名のまま**。`system.css` の定義には一切触れていない。S3 側は使用をやめ、長いラベルは `.domain-label`、`D1` だけのチップは `.badge.badge--ink` に置換した（A5） |

`.guide-targets button`（`system.css`）は A1 で `.btn.btn--secondary` に置換されるため削除した。セレクタ specificity が `.btn` を上回り置換が効かなくなるためで、実質は §3.7 のリネームに付随する処理。参照元は上記のとおり S3 のみ。

#### D5 の判断 — `.official-card` 側（左帯 + auto-fit 2カラム）に寄せた

- `.handson-list` / `.official-list` を同一宣言（`repeat(auto-fit, minmax(320px, 1fr))` / `gap: var(--space-4)`）にし、カードは両方とも `.panel.panel--sm.panel--accent` にした。
- 左帯の色は `.official-card` の 6px シアンではなく **§3.2 の `.panel--accent`（6px ink）** を使った。デザインシステムに定義済みの共有部品で表現でき、`--cyan-dark` のベタ書きが1つ消えるため。`.guide-context` の 6px ink 帯とも一致する。
- ハンズオンの説明文が長い件は、`auto-fit` が 760px 以下で自動的に1カラムへ落ちるため実害なしと判断（375px SS で確認）。1440px では両リストとも3カラムで、意匠は完全に同一。
- カード内の縦間隔は子要素ごとの `margin: 8px 0 0` をやめ、`.handson-card, .official-card { display: grid; gap: var(--space-2) }` に統一した。

#### A4 の構成判断 — セクションごとに `.panel`（1枚の大パネルにはしない）

ハンズオン詳細は15セクションあるが、各セクションが独立した見出しを持つ手順単位なので、`.panel` を並べたほうが走査しやすい。ガイド（`.guide-context` / `.guide-path` / `.guide-sections` の3パネル）や他ビューとも同じ扱いになる。縦間隔は個別 `margin-top` を全廃し、ビュー直下に `.panel-stack` を付けて `--space-6` に統一した（`.handson-view > section { margin-top: 22px }` / `.official-view > section` は削除済み）。

#### 仕様からの逸脱（2件）

1. **`.hero-lede` を `guide.css` に新設した。**
   `.page-header > p:not(.eyebrow)`（`max-width: 780px; margin: 18px 0 0; color: var(--ink-soft)`）は `system.css` にあるが、A3 で `.panel--hero` に移ると効かなくなる。`.panel--hero` 側には本文段落の規約が無いため、ヒーロー本文用に `.hero-lede { max-width: 780px; margin: var(--space-5) 0 0; color: var(--ink-soft) }` を `guide.css` に置いた。値はすべてトークン（18px は §2 の丸め規則で `--space-5`）。**他ストリームも A3 で同じ穴に当たるので、Phase 2 で `system.css` §3.2 へ移すべき。**
2. **`.guide-availability` の `!important` を除去した。**
   design-system.md §5 は「`.progress-card-secondary` と `.blueprint-node` 以外の `!important` は残さない」としている。`.guide-context p` を `.guide-context > p` に、`.guide-availability` を `.guide-context > .guide-availability` にしてセレクタ強度で解決した。

#### S3 — E2E への影響（未修正・担当外ファイル）

§3.7 のリネームと B2 の `.note` 統合は、`tests/**` のクラスセレクタを不可避に壊す。`tests/**` は担当ファイル外のため**編集していない**。要修正は3スペック7アサーション：

| ファイル:行 | 現行セレクタ | 変更後 |
|---|---|---|
| `tests/guide.spec.ts:18` | `.guide-domain-badges` | `.domain-labels` |
| `tests/guide.spec.ts:19,20` | `.guide-statement-ids` | `.statement-ids` |
| `tests/guide.spec.ts:29,38` | `.guide-targets` | `.target-list` |
| `tests/hands-on.spec.ts:53` | `.guide-state-note` | `.note.note--warn` |
| `tests/hands-on.spec.ts:67` | `.guide-state-note--completed` | `.note.note--success` |
| `tests/save-failure.spec.ts:61` | `.guide-targets` | `.target-list` |

壊さずに済ませたものは意図的に残した: `.guide-recommendation`（`display: grid` のレイアウト専用クラスとして存続）、`.guide-recommendation-open`（`width: fit-content` のみ）、`.guide-actions`、`.handson-card` / `.official-card`、`.official-badge--official` / `--practice`（`.badge` 上に載る面ごとの modifier）。

#### S3 — 44px 未満で残っている対話要素（いずれも S3 の変更前から存在・共有部品）

- `.source-links li a`（`SourceLinks.tsx` / CSS は凍結中の `system.css:125`）: 実測 12px。練習・演習・模試（S2/S5）でも同じ部品を使っているため S3 単独では変更しない。Phase 2 で `system.css` に `min-height: 44px` + `display: inline-flex` を入れるのが筋。
- `.handson-step-check label`: 実測 26.39px。行の `.handson-step-check` には `min-height: 44px` があるが `align-items: flex-start` なのでラベル自身は本文高のまま。S3 の変更前と同一。
- ボタン・`summary` は 1440px / 375px の全5画面で **0件が44px未満**（`.btn` 48px / `.btn--text` 44px / `.guide-section summary` 58px）。

## Review

（レビュー指摘と対応をここに追記する）
