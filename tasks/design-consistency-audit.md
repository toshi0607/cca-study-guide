# デザイン一貫性監査 — 試験ガイドベース刷新後

対象: `src/styles/global.css`（1206行・単一スタイルシート）と `src/components/**`
検証方法: 全ビューを dev サーバーで描画し、Playwright で **computed style を実測**（ボタン／パネル／見出し）＋フルページスクリーンショット。以下の数値はすべて実測値（VERIFIED）で、CSS を読んだだけの推測ではない。

結論: **揃っていない。** ブループリント的な世界観（方眼紙背景・2px インク罫・Barlow Condensed・モノスペースのラベル）自体は全面に効いていて強い。崩れているのは、その世界観を構成する**部品の実装が機能追加のたびに分岐している**点。特に「元からある画面（今日／練習／演習）」「ガイド系で足した画面（ガイド／ハンズオン／公式シナリオ／進捗）」「模試系」の3層で、ボタン・見出し・パネルの規約が別々になっている。

---

## A. 構造レベル（見てすぐ分かる／優先度 高）

### A1. プライマリボタンが2系統に割れている

同じ「開始する／開く」という役割に、色・角丸・高さが違う2つの実装がある。実測10種類のボタンスタイルのうち中核の2つ:

| | 塗り | 角丸 | min-height | 使用箇所 |
|---|---|---|---|---|
| 系統1 | `--ink` `#173447` | 2px | 48px | 今日「復習を始める」/「模試を開始」、練習「セッションを開始」「答えを見る」、演習「演習を始める」、模試「模試を開始」 |
| 系統2 | `--cyan-dark` `#05657d` | **0px** | **44px** | ガイド「開始セクションを提案する」「このセクションを開始」、ハンズオン「このガイドを開始」、進捗「Study Guideを開く」ほかカードCTA全部 |

さらに3つめとして `--green` 塗りの `.guide-recommendation-open`（[global.css:476](src/styles/global.css:476)）がある。

- 系統1: [global.css:287](src/styles/global.css:287), [655](src/styles/global.css:655), [1035](src/styles/global.css:1035), [1058](src/styles/global.css:1058)
- 系統2: [global.css:472](src/styles/global.css:472), [555](src/styles/global.css:555), [766](src/styles/global.css:766), [822](src/styles/global.css:822)

**推奨**: 系統1（ink / 2px / 48px）に寄せる。レール・ヒーローの2px インク罫と同じ黒が全体の署名色なので、シアンより地の意匠と噛み合う。シアンはリンク／選択状態の色として残す。

### A2. 模試エリアだけディスプレイ書体を使っていない

セクション見出しの実測（ブラウザに同クラスのプローブ要素を挿入して計測）:

| 対象 | サイズ | 書体 |
|---|---|---|
| `.mock-exam-analysis section > h3` | 16.8px | **BIZ UDPGothic**（本文書体） |
| `.mock-exam-tally h3` | 16.8px | **BIZ UDPGothic** |
| `.mock-exam-resume h3` | 18.4px | **BIZ UDPGothic** |
| `.mock-exam-incompatible h2` | 22.4px | **BIZ UDPGothic** |
| `.handson-view > section > h3` | 21.6px | Barlow Condensed |
| `.official-view > section > h3` | 21.6px | Barlow Condensed |
| `.guide-context h3` | 24.8px | Barlow Condensed |
| `.progress-panel h3` / `.quiz-score h3` | 26.4px | Barlow Condensed |

模試・学習分析の見出しは `font-family` を指定していないため本文書体に落ちている（[global.css:1175](src/styles/global.css:1175), [1125](src/styles/global.css:1125), [1069](src/styles/global.css:1069), [1149](src/styles/global.css:1149)）。同時に、ディスプレイ書体側も 21.6 / 24.8 / 26.4px と3段に割れていて「セクション見出し」というスケールが1本に決まっていない。

**推奨**: セクション見出しを Barlow Condensed の2段（例: 主要パネル 1.65rem / カード内 1.25rem）に統一し、模試側にも適用する。

### A3. ページヘッダーの高さが2種類、割り当てに規則がない

`.page-header` と `.page-header.compact`（[global.css:424](src/styles/global.css:424)）の padding 実測:

- 52px（背の高い方）: ガイド、進捗、公式シナリオ、ハンズオン
- 34px 52px（compact）: 練習、演習、模試、学習分析、模試結果／履歴／復習

トップレベルのビュー7つのうち4つが高、3つが低。ガイド配下のハンズオン詳細が高で、同格の模試ランディングが低、という並び。

**推奨**: トップレベルのビューはすべて高、ビュー内で切り替わる二次画面（模試の結果・履歴・復習）だけ compact、というルールにする。

### A4. 詳細ビューだけ「白いパネル」の外に出ている

ハンズオン詳細・公式シナリオ詳細は、ページヘッダー以外の本文セクション（学習目的／前提知識／実装ステップ／…、10〜15セクション）がすべて枠なし・背景なしで方眼紙の上に直置きになる（[global.css:533](src/styles/global.css:533), [572](src/styles/global.css:572)）。他のすべての画面は `1px solid var(--grid-strong)` ＋ `--surface` のパネルに入っている。同じページの中で `handson-badges` / `official-badges` の1ブロックだけ枠付きなので、余計にちぐはぐに見える。

**推奨**: 詳細ビューの本文セクションもパネルに入れる（またはハンズオン詳細を「1枚の長いパネル」に収める）。

### A5. `.card-domain` バッジが文脈で15倍の大きさになる

同一クラスの実測サイズ:

| 文脈 | 中身 | 書体 | 描画サイズ |
|---|---|---|---|
| 練習カードのヘッダー | `D1` | 10.88px SFMono | 23×17px |
| ガイド／ハンズオン／公式シナリオ | `D1 エージェント設計とオーケストレーション` | 16px BIZ UDPGothic | **343×32px** |

`.card-domain`（[global.css:619](src/styles/global.css:619)）は `.practice-card > header` の `font: .68rem var(--mono)` を前提に作られていて、その外で使うとフォント指定が効かず、濃紺の帯がカードを支配する（公式シナリオ一覧・ガイドのセクション展開時に顕著）。

**推奨**: `.card-domain` に自前で `font: 700 .68rem var(--mono)` を持たせ、長いドメイン名を出す用途には別クラス（例 `.domain-label`）を用意する。

---

## B. トークン／システムの摩耗（優先度 中）

- **B1. パネルの余白が15通り。** 実測で 56 / 52 / 48 / 42 / 40 / 38 / 34+52 / 28+32 / 24 / 18 / 0px。`clamp()` の上限が箇所ごとに 38, 40, 42, 46, 48 とバラバラ。スペーシングスケールのトークンが存在しない。
- **B2. 同じ「左罫線＋淡色地」の注記が12クラス。** `.guide-state-note` `.practice-target` `.quiz-hint` `.scenario-note` `.mock-exam-disclaimer` `.mock-exam-analysis-note` `.mock-exam-notice` `.mock-exam-submit-warn` `.official-source-note` `.official-recommendation-note` `.rationale-error` `.pitfall` `.guide-recommendation` `.mock-exam-error`。罫線幅3種（3/4/6px）、padding 7通り、フォントサイズ5通り（.8 / .82 / .84 / .85 / .9rem / 継承）。→ `.note` + `--variant` に集約できる。
- **B3. `--green` と `--danger` にだけ pale トークンがない。** `--cyan-pale` `--amber-pale` はあるのに、成功色の `#eef7f2` が4回、危険色の `#fdf1f0` が5回ベタ書き。B2 の分岐が起きる根っこがここ。
- **B4. 文字サイズが約30段。** .55 / .58 / .62 / .65 / .66 / .68 / .7 / .72 / .74 / .75 / .78 / .8 / .82 / .84 / .85 / .86 / .88 / .9 / .92 / .95 / 1 / 1.02 / 1.05 / 1.08 / 1.1 / 1.15 / 1.18 / 1.2 / 1.25 / 1.35 / 1.4 rem …。ラダーになっていない。
- **B5. 枠線の色が模試だけ弱い。** 学習分析のセクション（[global.css:1174](src/styles/global.css:1174)）は `--grid`、他のパネルは `--grid-strong`。
- **B6. 角丸も2層に割れている。** 系統1のボタン群と模試 UI は 2px（ダイアログのみ 4px、レールのナビは 3px）、ガイド系のボタン・チップは 0px。A1 と同じ境界線。

---

## C. アイブロウ（`.eyebrow`）の運用（優先度 中／文言の一貫性）

このサービスの識別子になっているモノスペースの小見出しだが、規約が3つ混在している。

**C1. 日本語ロケールで英語大文字と日本語が混ざる。** `ui.ts` の ja ブロック実測: `EXAM BLUEPRINT` `CARD PRACTICE` `CARD PRACTICE PROGRESS` `PUBLIC BLUEPRINT / 30 OBJECTIVES` `HANDS-ON / BUILD IN YOUR OWN ENVIRONMENT` `OFFICIAL SCENARIO LEARNING` `INDEPENDENT RETRIEVAL PRACTICE` `INDEPENDENT CHOICE PRACTICE` `STUDY DATA: LOCAL ONLY` の9つが英語大文字タグライン。一方 `今日`（[ui.ts:637](src/i18n/ui.ts:637)）、`模擬試験`（[ui.ts:984](src/i18n/ui.ts:984)）、`学習分析`（[ui.ts:1105](src/i18n/ui.ts:1105)）の3つだけ日本語。しかも `.eyebrow` は `font: 700 .7rem var(--mono); letter-spacing: .14em`（[global.css:228](src/styles/global.css:228)）なので、日本語がラテン等幅フォントで間延びして表示される。モバイルの「今日」画面では `EXAM BLUEPRINT` / `CARD PRACTICE` の間に `模擬試験` が挟まって特に目立つ。

さらに `模擬試験` は直下の h2「60問の模試に挑戦する」と意味が重複していて、アイブロウが担うべき「上位カテゴリの提示」をしていない。

**C2. アイブロウを付ける／付けないの規則がない。** 今日 = 5セクション中5。ガイド = 3中1。進捗 = 5中1。学習分析 = 6中0。新しく作った画面ほど付いていない。

**C3. 2箇所がJSXにハードコードされていてi18nを通っていない。** [GuideView.tsx:130](src/components/views/GuideView.tsx:130) の `STUDY GUIDE`、[HandsOnView.tsx:163](src/components/views/HandsOnView.tsx:163) の `HANDS-ON`。英語版でも同じ文字列が出る。

**推奨**: 「英語大文字の短いタグライン、h2 とは別の情報を持つ」に統一。`模擬試験` → `MOCK EXAM / 60 QUESTIONS`、`学習分析` → `LEARNING ANALYSIS` など。付ける対象は「ページヘッダー」と「ページ直下の主要セクション」に限定し、カード内には付けない、と決める。

---

## D. 細かい破れ（優先度 低〜中）

- **D1. `.mock-exam-link` だけタッチターゲットが 44px を満たしていない。** 実測 `min-height: auto`（[global.css:1063](src/styles/global.css:1063)）。他のテキストボタンはすべて 34〜44px を明示している。模試ランディングの「学習分析」リンクが該当。
- **D2. 一覧から項目を開くボタンが3種類。** `.handson-open` = インク色＋下線＋34px、`.official-open` = シアン＋**下線なし**＋44px、`.guide-path-link` = シアン＋下線＋34px。同じ「一覧→詳細」の操作。
- **D3. 「今日」で模試セクションだけ影が付いている。** 実測: `today-hero` = shadow-strong、`mock-exam-launch` = shadow、`blueprint` / `weak-areas` / `status-strip` = なし。中段のパネルで1つだけ浮いていて、階層の意味が読めない。
- **D4. ハンズオン一覧の進捗ヘッダーがガイドと別物。** ガイドは `.guide-sections` パネル**内**の `<h3>`（Barlow 24.8px）。ハンズオンは同じ `.guide-section-heading` を使いながらパネルの**外**に置かれ、中身は `<p class="handson-list-progress">`（mono .95rem）。同じ部品スロットで要素も書体も配置も違う。
- **D5. ハンズオンと公式シナリオでカードの意匠が違う。** `.official-card` は左に 6px シアンの帯＋2カラムグリッド（`auto-fit minmax(320px)`）、`.handson-card` は帯なし＋1カラム。並列のコンテンツなので揃えたい。
- **D6. 重複ルール。** `.handson-badges`（[530](src/styles/global.css:530)）と `.official-badges`（[569](src/styles/global.css:569)）が完全一致。`.handson-view > section > h3`（[534](src/styles/global.css:534)）と `.official-view > section > h3`（[573](src/styles/global.css:573)）も一致。片方だけ直して片方が取り残される典型パターン。

---

## 揃っているもの（壊さないこと）

- レール／モバイルヘッダー／ボトムナビと `aria-current` の扱い
- 方眼紙背景、ワードマーク、`--focus` のフォーカスリング（3px `#f5a33b`）、`prefers-reduced-motion`、印刷スタイル
- チップの選択状態（`--cyan-pale` 地 ＋ `--cyan-dark` 罫）が練習・演習・模試で完全一致
- ステータス色（`--green` / `--amber` / `--danger` / `--ink-soft`）の意味づけ
- `.page-header` のヒーロー造形そのもの（2px インク罫＋シアンのオフセット影）— これがサービスの署名
- ほぼ全域で 44px 以上のタッチターゲットを維持（D1 を除く）

---

## 修正の推奨順序

1. **A1 ボタン統一** — 見た目の分裂として一番効く。トークン化（`.btn` / `.btn--secondary` / `.btn--text`）とセットで。
2. **A2 見出し書体** — 模試エリアにディスプレイ書体を戻し、セクション見出しのスケールを2段に固定。
3. **C1〜C3 アイブロウ** — 文言だけなので低リスク・高効果。ハードコード2箇所も同時に解消。
4. **B3 → B2** — pale トークンを2つ足してから注記を1クラスに集約。
5. **A3 / A4 / A5** — 構造の変更を含むので、上の3つが終わって規約が固まってから。
6. **D1〜D6** — 上記のリファクタに巻き取れるものが多い。
