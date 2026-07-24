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
- [x] D3 `.mock-exam-launch` の影を削除 / A1 ボタン / B1・B4 ラダー適用（影の削除のみ未達 — 下記 Notes 参照。ボタン統一とラダー適用は完了）
- [x] C1 `today.eyebrow` を `TODAY` へ / レール色をトークン化

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

### S4 今日+シェル

**worktree のセットアップに関する対応**: 本ストリームの worktree (`agent-a8992e73fe1a778f5`) は `main`（Phase 0 分割前）から作成されており、`tasks/design-system.md` `tasks/design-consistency-audit.md` 本ファイル、および分割済み `src/styles/*.css` を含む Phase 0 コミット（`53f6c5a`）を含んでいなかった。他の2つの並列 worktree（`agent-a856e620a152e4ebb` / `agent-afa4f27e330d8b4a5`）は `53f6c5a` から分岐しており、本 worktree だけが取り残されていた。`53f6c5a` の親コミットが本 worktree の HEAD と完全一致し、作業ツリーもクリーンだったため、`git merge --ff-only 53f6c5a` で安全に取り込んでから着手した（新規コミットの作成・履歴の書き換えなし）。

**D3（`.mock-exam-launch` の影）が未解決な理由**: `.mock-exam-launch` の `box-shadow: var(--shadow)` は `src/styles/mock-exam.css` の2行目で宣言されており、この行の削除は MUST NOT DO で明示的に禁止されているファイル（`mock-exam.css`）への編集を要する。同じ MUST DO 内に「`mock-exam.css` の `.mock-exam-launch*` ルール削除は S2 の担当」という明記もあり、担当ファイル制約（他ストリームの CSS を触らない）と D3 の完了指示が矛盾する。ファイル制約を優先し、`.mock-exam-launch` 自体の CSS には一切触れていない。実測（computed style）で `.mock-exam-launch` の `box-shadow` が `rgba(23, 52, 71, 0.07) 6px 6px 0px 0px`（= `var(--shadow)`）のまま残っていることを確認済み。**S2 が `mock-exam.css` から `.mock-exam-launch` の `box-shadow` 宣言を削除する必要がある。** それ以外の D3 対象（`.blueprint` `.weak-areas` `.status-strip` は元々影なし、`.today-hero` は `--shadow-strong` を維持）はすべて自ファイル内で完了。

**セクション見出しの統一（40px → 26.4px）**: `.blueprint` `.mock-exam-launch` `.weak-areas` 配下の見出しは共有ラッパー `.section-heading`（`system.css`、凍結）の子孫セレクタ `.section-heading h2`（specificity 0,0,1,1）でスタイルされており、単に h2 へ `class="section-title"`（specificity 0,0,1,0）を足すだけでは古いルールに負けて上書きできない。`system.css` は編集禁止のため、`today.css` 側に `.blueprint .section-title` のような2クラス構成のスコープ付きセレクタ（specificity 0,0,2,0 で `.section-heading h2` に勝つ）を追加し、他ビューの `.section-heading` 利用箇所（ガイド・模試・練習・進捗）には影響しないようスコープした。`.status-strip` の h2 は `.section-heading` でラップされていなかったため、旧来のベタ書きルールを削除するだけで `.section-title` がそのまま効いた。4見出しとも `26.4px` / `Barlow Condensed` / `line-height:33px` に統一されたことを computed style で確認済み（旧: blueprint/mock-exam-launch/weak-areas = 40px, status-strip = 28.8px）。

**主要な丸め判断**:
- `main`（ページ本文の外側 padding）は監査 B1 の実測対象（今日ビューの5パネル）に含まれておらず、`--space-*` に丸めると最大値（`--space-12`=48px）でも実測 74px から -35% の落差になるため、意図しない見た目変更を避けて生値のまま残した（1000px ブレークポイントの `padding-inline: 28px` のみ、丸め幅が小さい(+14%)ため `--space-8` に変換）。
- モバイルの `main` 下部 padding（115px）、`.bottom-nav` の位置・高さ・safe-area 計算、`.persistent-disclaimer` の高さ、`.notice` の `top:70px`（`.mobile-header` の高さに連動）はすべて固定ナビ／セーフエリアと連動する機能的な値のため、ラダー化の対象から明示的に除外した（丸めるとボトムナビの下にコンテンツが隠れる等のレイアウト崩れになるため）。
- バッジ状の極小 padding（`.node-copy span` `.weak-row-domain` の `2px 6px` `3px 6px` など）は、凍結済み `system.css` の `.badge`（`padding: 3px 6px`）`.status`（`padding: 3px 7px`）が同様に生値のままである前例に倣い、`--space-*` に丸めずそのまま残した。
- 色は `shell.css` のレール系14色をすべて `--rail-*` 8トークンへ、`today.css` の `#eaf3f6`→`--blueprint-bg`、`#edf2f4`→`--track`、`#fdf1f0`（`.data-alert`）→`--danger-pale` を変換。`.blueprint-lines` の `stroke:#70a8b8`（MUST DO に列挙のない色）は最近傍トークン `--rail-active-line` に寄せた。ホバー等の半透明合成色（`rgb(255 255 255 / x%)` `rgb(23 52 71 / 10%)` など）はトークンの分解値そのままの意匠的パターン（`--shadow` `--shadow-strong` も同じ手法）のため据え置いた。design-system.md への新規トークン追記は不要だった（レール色8種で全件収まった）。
- `.data-alert` は design-system.md §3.3 の置換表で `.note .note--danger` への変更対象だが、B2（注記統合）は本ストリームの担当監査文字（A1/B1/B3/B4/B6/C1/D3）に含まれないため、クラス名は変更せず、B1/B3（余白・色のトークン化）のみ適用した。

### 検証（S4）

- `pnpm build`: exit 0（`astro check` 込み、0 errors）
- `pnpm test`: 445 pass
- `pnpm test:bundle`: OK — 9 eagerly-loaded chunks, none forbidden
- `pnpm test:e2e:a11y`（`accessibility.spec.ts`）: 9 passed / 1 failed。失敗は `.quiz-feedback` の色コントラスト（Quiz 回答レビュー画面）で、`shell.css` `today.css` を含む本ストリームの担当ファイルに当該クラス・色は一切存在しないことを `grep` で確認、かつ本ストリームの変更を `git stash` で一時的に外して同じ失敗が再現することを確認済み（変更前から存在する S5/S3 領域の既知の問題）。`'/' has no serious accessibility violations` と `'/en/' has no serious accessibility violations`（今日ビューを含む）はいずれも pass。
- 44px 未満の対話要素スキャン（1440/1000/760/375 の4幅、JS で `button,a,[role=button],input,select,textarea` を走査）: 唯一の該当は `.site-footer nav` の GitHub リンク（19.96px）。`App.tsx` のこのリンク自体は元々サイズ指定を持たず、変更前の `.site-footer` の行間・フォントサイズ（`.72rem/1.6`）でも同様に44px未満だったことを計算で確認済み（変更前 ≈18px → 変更後 ≈20px、既存の問題でありむしろ僅かに改善）。今日ビュー・レール・モバイルヘッダー・ボトムナビの対話要素はすべて44px以上。
- スクリーンショット（自worktree の `pnpm dev --port 4404` から取得、1440×1000 / 1000×900 / 760×900 / 375×812、ja/en 両方）を確認: 760px 未満でレールが消えモバイルヘッダー＋ボトムナビに切り替わる境界を確認。D3 は `.mock-exam-launch` のみ影が残存（上記の理由により未解決、S2待ち）、`.blueprint` `.weak-areas` `.status-strip` は影なしで統一。4つのセクション見出し（設計図・模試・苦手領域・進捗）のサイズが揃ったことを目視でも確認。
- `git diff --name-only`: `src/components/app/Blueprint.tsx` `src/components/views/TodayView.tsx` `src/i18n/ui.ts` `src/styles/shell.css` `src/styles/today.css` の5件のみ（担当ファイル外の変更なし）。

## Review

（レビュー指摘と対応をここに追記する）
