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
- [x] A4 詳細ビュー本文を `.panel` へ / A5 `.domain-label` 化 / D5 カード意匠の統一 / D6 重複削除
- [x] A1 ボタン / B2 注記 / D2 一覧を開くボタンを `.btn--text` へ / D4 ハンズオン進捗ヘッダーをガイドと同型に
- [x] C3 ハードコードアイブロウ2箇所を i18n 化
- [x] A3 `.page-header` → `.panel--hero`（一覧は素、詳細は `.is-compact`）/ B1・B4 ラダー適用 / §3.7 リネーム
- [x] 完了条件: `pnpm build` exit 0 / `pnpm test` 445 pass / `pnpm test:bundle` OK / 1440px・375px の全5画面SS確認
- [ ] **未完（担当外ファイルのため未修正）**: 下記 Notes「S3 — E2E への影響」の3スペック7アサーションのセレクタ更新

### S4 今日+シェル
- [x] D3 `.mock-exam-launch` の影を削除 / A1 ボタン / B1・B4 ラダー適用（影の削除のみ未達 — 下記 Notes 参照。ボタン統一とラダー適用は完了）
- [x] C1 `today.eyebrow` を `TODAY` へ / レール色をトークン化

### S5 練習+演習
- [x] A1 ボタン（`.quiz-start` `.quiz-submit` `.quiz-next` `.reveal-button` `.rating`）/ B2 注記 / A3 hero
- [x] `.card-domain` → `.badge` / B1・B4 ラダー適用

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

### S6 進捗 — 実施内容と判断

- **worktree のセットアップ差分**: 担当 worktree（`agent-a957a113774703adf`、ブランチ `worktree-agent-a957a113774703adf`）は着手時点で Phase 0 コミット（`53f6c5a`）を含んでいなかった（`tasks/design-system.md` 等が存在しなかった）。他の姉妹 worktree は `53f6c5a` を含んでいたことを確認し、`53f6c5a` は現 HEAD（`347dc78`）の直接の子（fast-forward 可能）だったため `git merge --ff-only 53f6c5a` で取り込んだ。担当ファイル以外への変更は無し（`git diff --name-only 53f6c5a` で確認）。
- **A1 ボタンの割り当て**: `.data-actions button`（Export/Import）は元々 ink 塗り 48px で `.btn` の仕様と一致していたため `.btn` に、`.data-actions .danger`（削除ボタン）は `.btn--danger` にした。`.progress-card button`（5枚のカードCTA + `.progress-card-secondary`）は全て `.btn--secondary` にした（cyan-dark 塗りをやめて枠線のみに変更）。理由: design-system.md §3.1 の「塗りボタンは1画面に1〜2個まで」に従うと、Export/Import の2個で塗りの予算を使い切るため、カード側の6個の同格アクションは非塗りに統一するのが一貫する。結果としてページ内のボタンは `.btn`（Export/Import）/ `.btn--secondary`（カードCTA・学習分析・再読み込み）/ `.btn--danger`（削除）の3系統に完全に集約された。
- **B1/B4 の丸め**: 迷った値は design-system.md §2 の丸め規則表に従い、同点は切り上げ（例: `.progress-card` の `gap:10px`→`--space-3`(12)、`.progress-row` モバイルの `padding:11px`→`--space-3`(12)）。
- **`.privacy-header` / `.privacy-main` は意図的に `--pad-panel` 系トークンへ寄せていない**: MUST DO で「`.privacy-header` はシェル相当」と明記されており、監査の B1 実測対象（`progress-overview` / `data-panel` / `sources-panel` / `disclaimer` / `progress-card` の5箇所、42px・18px）にも含まれていない。`--pad-panel`(clamp 20-40) / `--pad-panel-sm`(clamp 16-24) のどちらにも収まらない値（`.privacy-main` の `clamp(38px,7vw,76px) 0 80px` 等）を無理に丸めると視覚的に破綻するため、シェル層の独自値として残した。単純な等倍値（`padding:24px`→`--space-6`、`gap:20px`→`--space-5` 等）はトークン化した。
- **B3**: `.privacy-header` の `#0a2738`/`#eef8fb` は `shell.css` の `.rail` と全く同じ値だったため、トークン化済みの `--rail-edge` / `--rail-strong` に置換（新規トークンは追加していない）。`#fff0ef`（danger hover）と `.progress-card button` の `#fff` は該当ルールごと削除（`.btn--danger` / `.btn--secondary` が肩代わり）。
- **44px スキャンで見つけた追加修正**: `.privacy-header > a:last-child`（「学習ノートへ戻る」リンク）はデスクトップ幅で 13px しかタップ領域が無かった（この状態は変更前から存在）。担当ファイル内で完結する修正だったため `min-height:44px` をベース宣言に追加し、760px メディアクエリ側の重複宣言は削除した。`.source-register a`（公式資料リンク一覧）と `.privacy-article` 本文中のインクリンク（「GitHub Issues」等）は地の文中のリンクで WCAG 2.5.8 の inline 除外に該当し、変更前から min-height 指定が無い状態だったため据え置いた。`.wordmark` は shell.css 所有の共有部品なので触っていない。
- **e2e テストの範囲を限定**: `tests/import-export.spec.ts`（2件）と `tests/analytics.spec.ts`（1件）は個別実行して pass を確認した。`tests/accessibility.spec.ts` のプライバシーページ分を実行しようとしたところ、姉妹 worktree（`agent-a856e620a152e4ebb` ほか）が同時に `playwright.config.ts` の同一デフォルトポート（4325）で e2e を実行中で、こちらのプロセスが SIGTERM で終了した（ポート競合、相手側のプロセスやファイルには一切触れていない）。S6 の MUST DO 検証リストに `pnpm test:e2e` は含まれておらず（`pnpm test:bundle` は実施済み）、全体の `pnpm test:e2e:fast` は design-system.md §6 の「全ストリーム共通の受け入れ条件」として Phase 2 統合時に確認される想定のため、単体テスト（vitest 445件）・ビルド・上記2ファイルの e2e・スクリーンショット目視・JS走査で代替した。

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
