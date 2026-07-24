# CCA Field Notes デザインシステム仕様

`tasks/design-consistency-audit.md` の指摘 A/B/C/D を解消するための唯一の規約。
**すべてのストリームはこのファイルを正とし、独自判断で値を足さないこと。** 足りないものが出たらここに追記してから使う。

決定済みの方針（ユーザー確認済み）:
- プライマリボタン = `--ink` 塗り / 角丸 2px / min-height 48px
- 日本語版のアイブロウも英語大文字タグラインに統一
- スコープ = 監査の A + B + C + D 全部（余白・文字サイズのラダー化を含む）

---

## 1. ファイル構成

`src/styles/global.css` は `@import` だけを持つエントリになる。`LocalizedLayout.astro:7` の import パスは変更しない。
**カスケード順が仕様なので、この順序を変えないこと。**

```css
/* src/styles/global.css */
@import './tokens.css';
@import './base.css';
@import './system.css';
@import './shell.css';
@import './today.css';
@import './guide.css';
@import './practice.css';
@import './progress.css';
@import './mock-exam.css';
```

| ファイル | 中身 | 所有ストリーム |
|---|---|---|
| `tokens.css` | `:root` のみ | Phase 0（以降 変更禁止・追記は要相談） |
| `base.css` | `*`, `html`, `body`, `button/input/a`, `:focus-visible`, `.skip-link`, `.sr-only`, `prefers-reduced-motion`, `@media print` | Phase 0（以降 凍結） |
| `system.css` | 共有コンポーネント（§3） | Phase 0（以降 凍結） |
| `shell.css` | `.app-shell` `.rail` `.wordmark` `.language-switcher` `.mobile-header` `.mobile-tools` `.unofficial` `.bottom-nav` `.persistent-disclaimer` `main` `.notice` `.data-alert` `.site-footer` | S4 |
| `today.css` | `.today-hero` `.due-block` `.blueprint*` `.node-*` `.status-strip` `.weak-*` | S4 |
| `guide.css` | `.guide-*` `.handson-*` `.official-*` `.link-back` | S3 |
| `practice.css` | `.filter-panel` `.search-label` `.card-stack` `.practice-card` `.card-prompt` `.answer*` `.pitfall` `.card-sources` `.rating` `.quiz-*` `.choice-*` `.question-meta*` `.skill-tags` `.difficulty-badge` `.scenario-*` `.session-*` | S5 |
| `progress.css` | `.progress-*` `.data-*` `.sources-panel` `.source-register` `.disclaimer` `.analytics-disclosure` `.privacy-*` | S6 |
| `mock-exam.css` | `.mock-exam-*` | S2 |

**メディアクエリは共通ブロックを廃止し、各エリアファイルに併置する。** 現行 `global.css:904-1031` のルールを、対象クラスが属するファイルへ移す。ブレークポイントは `1120px` / `1000px` / `760px` / `640px` / `400px` を維持（新規追加しない）。

---

## 2. トークン（`tokens.css`）

```css
:root {
  color-scheme: light;

  /* --- 面 --- */
  --paper: #f4f7f9;
  --surface: #ffffff;
  --grid: #d7e4ea;
  --grid-strong: #b5cbd5;

  /* --- 文字 --- */
  --ink: #173447;
  --ink-soft: #4c6574;
  --on-ink: #ffffff;

  /* --- アクセント --- */
  --cyan: #087e9b;
  --cyan-dark: #05657d;
  --cyan-pale: #dff1f5;

  /* --- ステータス（4色すべて pale を持つ：B3） --- */
  --amber: #a85b18;
  --amber-pale: #fff0df;
  --green: #287158;
  --green-pale: #eef7f2;     /* 新規：旧 #eef7f2 ベタ書き4箇所を置換 */
  --danger: #a63f35;
  --danger-pale: #fdf1f0;    /* 新規：旧 #fdf1f0 ベタ書き5箇所を置換 */
  --focus: #f5a33b;

  /* --- レール（旧ベタ書き14色を集約） --- */
  --rail-bg: #173447;
  --rail-text: #c8dce4;
  --rail-strong: #eef8fb;
  --rail-muted: #91b1bd;
  --rail-line: #587f8f;
  --rail-edge: #0a2738;
  --rail-active: #0d6479;
  --rail-active-line: #5fa8bc;

  /* --- 補助面 --- */
  --reveal-bg: #f9fcfd;      /* .answer / .quiz-feedback */
  --blueprint-bg: #eaf3f6;
  --track: #edf2f4;          /* .node-progress の未達部分 */

  /* --- 余白スケール（B1）--- */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* パネル内側の余白は3種のみ */
  --pad-hero: clamp(26px, 4.5vw, 52px);   /* .panel--hero */
  --pad-panel: clamp(20px, 4vw, 40px);    /* .panel */
  --pad-panel-sm: clamp(16px, 3vw, 24px); /* .panel--sm（カード） */

  /* --- 文字サイズスケール（B4：8段に固定）--- */
  --fs-micro: .68rem;  /* モノスペースのラベル・アイブロウ・code・バッジ */
  --fs-xs:    .78rem;  /* メタ情報・補足・脚注 */
  --fs-sm:    .88rem;  /* 注記・カード本文の補足 */
  --fs-base:  1rem;    /* 本文 */
  --fs-lg:    1.25rem; /* カード見出し */
  --fs-xl:    1.65rem; /* セクション見出し */
  --fs-2xl:   clamp(2.2rem, 4.6vw, 3.8rem);  /* ページ見出し */
  --fs-hero:  clamp(1.7rem, 11cqi, 4.5rem);  /* 今日のヒーローのみ */

  --lh-tight: 1.2;
  --lh-heading: 1.25;
  --lh-body: 1.65;
  --lh-relaxed: 1.8;

  /* ディスプレイ数字（本文ラダーの対象外・例外）:
     大きな統計数字・装飾ウォーターマーク・ワードマークは `--display` 書体の
     図像的タイポで、テキストラダー（上限 --fs-hero 4.5rem）に押し込むと意匠が
     変わる。これらは生の rem / clamp を許容する。該当箇所は以下に限定:
       .today-hero::after（ウォーターマーク） / .due-block strong（本日の枚数）
       .quiz-score-figure strong・.session-breakdown dd（スコア） / .wordmark b
     新たなディスプレイ数字を足す場合はこのリストに追記すること。それ以外の
     文字は必ず --fs-* を使う。 */

  /* --- 形 --- */
  --radius: 2px;         /* 対話要素・カード すべて */
  --radius-dialog: 4px;  /* dialog のみ */
  --rail: 244px;
  --shadow: 6px 6px 0 rgb(23 52 71 / 7%);
  --shadow-strong: 10px 10px 0 rgb(8 126 155 / 12%);

  /* --- 書体 --- */
  --display: "Barlow Condensed", "Avenir Next Condensed", "Zen Kaku Gothic New", "BIZ UDPGothic", sans-serif;
  --body: "BIZ UDPGothic", "Hiragino Sans", "Yu Gothic UI", system-ui, sans-serif;
  --mono: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
}
```

**移行時のサイズ丸め規則**（迷ったらこの表に従う。独自に中間値を作らない）:

| 旧 | 新 |
|---|---|
| .55 / .58 / .62 / .65 / .66 / .68 / .7 | `--fs-micro` |
| .72 / .74 / .75 / .78 / .8 | `--fs-xs` |
| .82 / .84 / .85 / .86 / .88 / .9 | `--fs-sm` |
| .92 / .95 / 1 / 1.02 / 1.05 / 1.08 | `--fs-base` |
| 1.1 / 1.15 / 1.18 / 1.2 / 1.25 / 1.35 | `--fs-lg` |
| 1.4 / 1.5 / 1.55 / 1.6 / 1.65 / 1.8 | `--fs-xl` |

余白も同様に最も近い `--space-*` に丸める（22px→`--space-6`(24) ではなく `--space-5`(20) と `--space-6`(24) の近い方＝22は24へ）。

---

## 3. 共有コンポーネント（`system.css`）

Phase 0 でここに定義する。**各エリアファイルで同等のものを再定義しない。**

### 3.1 ボタン（A1 / B6 / D1 / D2）

```css
.btn { min-height: 48px; padding: 0 var(--space-5); display: inline-flex; align-items: center;
       justify-content: center; gap: var(--space-3); border: 1px solid var(--ink);
       border-radius: var(--radius); background: var(--ink); color: var(--on-ink);
       font-weight: 700; cursor: pointer; }
.btn:hover:not(:disabled) { background: var(--cyan-dark); border-color: var(--cyan-dark); }
.btn:disabled { opacity: .45; cursor: not-allowed; }

.btn--wide      { width: 100%; justify-content: space-between; }   /* 旧 .due-block button / .reveal-button */
.btn--secondary { background: var(--surface); border-color: var(--cyan-dark); color: var(--cyan-dark); }
.btn--secondary:hover:not(:disabled) { background: var(--cyan-pale); }
.btn--danger    { background: var(--surface); border-color: var(--danger); color: var(--danger); }
.btn--danger:hover:not(:disabled) { background: var(--danger-pale); }

/* テキストボタン：一覧→詳細を開く、戻る、補助リンク すべてこれ（D2） */
.btn--text { min-height: 44px; padding: 0 var(--space-1); border: 0; background: transparent;
             color: var(--cyan-dark); font: inherit; font-weight: 700; text-align: left;
             text-decoration: underline; text-underline-offset: .2em; cursor: pointer; }
.btn--text:hover { color: var(--ink); }

/* フィルタチップ */
.chip { min-height: 44px; padding: 0 var(--space-3); border: 1px solid var(--grid-strong);
        border-radius: var(--radius); background: var(--surface); color: var(--ink); cursor: pointer; }
.chip:hover { border-color: var(--cyan); }
.chip.is-selected { border-color: var(--cyan-dark); background: var(--cyan-pale);
                    color: var(--cyan-dark); font-weight: 700; }
```

規則:
- **`min-height` は 44px 未満にしない**（D1）。`.btn` 系以外の対話要素も同様。
- 塗りボタンは1画面に1〜2個まで。それ以外は `--secondary` か `--text`。
- 旧クラス（`.quiz-start` `.quiz-submit` `.quiz-next` `.mock-exam-primary` `.mock-exam-secondary` `.mock-exam-launch-button` `.mock-exam-launch-analysis` `.mock-exam-link` `.mock-exam-flag` `.mock-exam-range-option` `.reveal-button` `.guide-recommendation-open` `.handson-open` `.official-open` `.guide-path-link` `.link-back` `.data-actions button` `.progress-card button` `.chips button` ほか）は**削除して `.btn` 系に差し替える**。位置決めだけ必要な場合は `.quiz-submit` のようなレイアウト専用クラスを別に残してよいが、見た目のプロパティは持たせない。

### 3.2 パネル（A3 / A4 / B1 / B5）

```css
.panel { padding: var(--pad-panel); border: 1px solid var(--grid-strong);
         background: var(--surface); }
.panel--sm   { padding: var(--pad-panel-sm); }
.panel--flat { border-color: var(--grid); }        /* 入れ子の内側ブロック用 */
.panel--accent { border-left: 6px solid var(--ink); }

/* ページヘッダー */
.panel--hero { padding: var(--pad-hero); border: 2px solid var(--ink);
               background: var(--surface); box-shadow: var(--shadow-strong); }
.panel--hero.is-compact { padding-block: var(--space-8); }

.panel-stack > * + * { margin-top: var(--space-6); }  /* 縦の間隔は個別 margin-top を書かない */
```

規則:
- **枠線は `--grid-strong` を既定とする**（B5：模試だけ `--grid` を使っていたのを是正）。入れ子の内側だけ `.panel--flat`。
- **影を持つのは `.panel--hero` だけ**（D3：今日の `.mock-exam-launch` の影は削除。`.practice-card` `.quiz-question` `.mock-exam-runner` `.mock-exam-review-item` `.scenario-brief` `.privacy-article` の `--shadow` も削除）。
- **`.panel--hero` / `.is-compact` の割り当てルール**（A3）:
  - hero = ビューのランディング（今日 / ガイド / 練習 / 演習 / 進捗 / ハンズオン一覧 / 公式シナリオ一覧 / 模試ランディング）
  - `.is-compact` = ビュー内の二次画面（ハンズオン詳細 / 公式シナリオ詳細 / 模試の結果・履歴・復習・学習分析）
- **詳細ビューの本文セクションは必ず `.panel` に入れる**（A4：`.handson-view > section` `.official-view > section` の枠なし直置きを解消）。

### 3.3 注記（B2）

12クラスを1つに集約する。

```css
.note { padding: var(--space-3); border-left: 4px solid var(--grid-strong);
        background: var(--surface); font-size: var(--fs-sm); line-height: var(--lh-relaxed); }
.note--info    { border-left-color: var(--cyan);   background: var(--cyan-pale); }
.note--warn    { border-left-color: var(--amber);  background: var(--amber-pale); }
.note--success { border-left-color: var(--green);  background: var(--green-pale); }
.note--danger  { border-left-color: var(--danger); background: var(--danger-pale); color: var(--danger); font-weight: 700; }
```

置換表:

| 旧クラス | 新 |
|---|---|
| `.quiz-hint` `.scenario-note` `.practice-target` `.quiz-target` `.mock-exam-disclaimer` `.mock-exam-analysis-note` `.analytics-disclosure` | `.note .note--info` |
| `.guide-state-note` `.official-recommendation-note` `.official-practice-note` `.mock-exam-notice` `.mock-exam-submit-warn` `.rationale-error` `.pitfall` | `.note .note--warn` |
| `.guide-recommendation` `.guide-state-note--completed` | `.note .note--success` |
| `.mock-exam-error` `.data-alert` | `.note .note--danger` |
| `.official-source-note` | `.note`（modifier なし＝中立） |

レイアウト用途（`.practice-target` の flex 配置など）が必要な場合はレイアウト専用クラスを併記する。

### 3.4 見出し（A2）

```css
.page-title    { margin: 0; font-family: var(--display); font-weight: 900; font-size: var(--fs-2xl);
                 font-feature-settings: "palt"; letter-spacing: .01em; line-height: var(--lh-heading);
                 word-break: auto-phrase; }
.section-title { margin: 0 0 var(--space-3); font-family: var(--display); font-weight: 700;
                 font-size: var(--fs-xl); font-feature-settings: "palt"; line-height: var(--lh-heading); }
.card-title    { margin: 0; font-family: var(--display); font-weight: 700; font-size: var(--fs-lg);
                 line-height: var(--lh-heading); }
.sub-title     { margin: var(--space-5) 0 var(--space-2); font-family: var(--display);
                 font-weight: 700; font-size: var(--fs-base); }
```

規則:
- **見出しは必ずこの4つのいずれか。`font-family` を書かない見出しを作らない**（A2：模試エリアが本文書体に落ちていた原因）。
- 例外は `.today-hero h2`（`--fs-hero`、コンテナクエリ）と練習カードの設問 `.card-prompt h3`（設問文なので本文書体のままでよい）の2つだけ。

### 3.5 バッジ・タグ（A5）

`.card-domain` は「短いDナンバー」と「長いドメイン名」の2用途に割れていたので分離する。

```css
/* 短いチップ：D1 / 1.1 / ステータス / 選択肢ID など */
.badge { display: inline-block; padding: 3px 6px; font: 700 var(--fs-micro) var(--mono); }
.badge--ink    { background: var(--ink);  color: var(--on-ink); }
.badge--cyan   { background: var(--cyan-pale); color: var(--cyan-dark); }
.badge--amber  { background: var(--amber); color: var(--on-ink); }
.badge--outline{ border: 1px solid currentcolor; }

/* 長いラベル：D1 + ドメイン名 のように文が入るもの */
.domain-label { display: inline-block; padding: var(--space-1) var(--space-2);
                border: 1px solid var(--grid-strong); background: var(--cyan-pale);
                color: var(--cyan-dark); font-size: var(--fs-xs); font-weight: 700; }
```

`.guide-domain-badges` `.official-card-badges` `.handson-badges` 内の「D1 + ドメイン名」は `.domain-label` に変える（濃紺の帯をやめる）。カードヘッダーの `D1` だけのものは `.badge.badge--ink`。

### 3.6 ステータス表示

```css
.status { flex: 0 0 auto; padding: 3px 7px; border: 1px solid currentcolor;
          font: 700 var(--fs-micro) var(--mono); }
.status-not_started { color: var(--ink-soft); }
.status-in_progress, .status-stale { color: var(--amber); }
.status-completed { color: var(--green); }
.status-future { color: var(--danger); }
```

`.guide-status` は `.status` にリネーム（ガイド専用ではなくハンズオンでも使うため）。

### 3.7 その他の共有物

`.eyebrow` `.section-heading` `.guide-section-heading`（→ `.progress-heading` にリネーム）`.empty-state` `.skill-tags` `.source-links` は `system.css` に置く。
`.guide-targets` `.guide-statement-ids` `.guide-domain-badges` はガイド/ハンズオン/公式の3画面で共用しているので `system.css` へ移し、それぞれ `.target-list` `.statement-ids` `.domain-labels` にリネームする。

---

## 4. アイブロウの規約（C1 / C2 / C3）

### 4.1 語種

**ja / en とも英語大文字の短いタグライン。** 直下の見出しと意味が重複しない「上位カテゴリ」を書く。

| コピーのキー | 新しい値（ja / en 共通） | 備考 |
|---|---|---|
| `today.eyebrow` | `TODAY` | ja の `今日` を置換 |
| `blueprint.eyebrow` | `EXAM BLUEPRINT` | 変更なし |
| `weakAreas.eyebrow` | `CARD PRACTICE` | 変更なし |
| `status.eyebrow` | `CARD PRACTICE PROGRESS` | 変更なし |
| `guide.eyebrow` | `PUBLIC BLUEPRINT / 30 OBJECTIVES` | 変更なし |
| `guide.sectionsEyebrow` **(新設)** | `STUDY GUIDE` | GuideView.tsx:130 のハードコードを i18n 化（C3） |
| `handsOn.eyebrow` | `HANDS-ON / BUILD IN YOUR OWN ENVIRONMENT` | 変更なし |
| `handsOn.listEyebrow` **(新設)** | `HANDS-ON PROGRESS` | HandsOnView.tsx:163 のハードコードを i18n 化（C3） |
| `officialScenarios.eyebrow` | `OFFICIAL SCENARIO LEARNING` | 変更なし |
| `practice.eyebrow` | `INDEPENDENT RETRIEVAL PRACTICE` | 変更なし |
| `quiz.eyebrow` | `INDEPENDENT CHOICE PRACTICE` | 変更なし |
| `progress.eyebrow` | `STUDY DATA: LOCAL ONLY` | 変更なし |
| `mockExam.eyebrow` | `MOCK EXAM / 60 QUESTIONS` | ja `模擬試験` / en `Mock exam` を置換 |
| `mockExam.resultEyebrow` | `EXAM RESULT` | 現行値を確認して大文字化 |
| `mockExam.analysis.eyebrow` | `LEARNING ANALYSIS` | ja `学習分析` / en `Learning analysis` を置換 |

`practice.question` `practice.answer` `quiz.summaryEyebrow` `session.summaryEyebrow` `quiz.backgroundTitle` `progress.sourcesEyebrow` も同じ規則で英語大文字にそろえる（現行値を確認し、日本語なら英訳する）。

### 4.2 付ける場所

- 付ける: `.panel--hero`（ページヘッダー）と、`.section-heading` パターンを使うページ直下の主要セクション
- 付けない: カード内、パネル内の入れ子セクション、`.section-title` だけのブロック
- → **`progress.sourcesEyebrow` の使用箇所（ProgressView.tsx:50）はアイブロウを削除**して `.section-title` のみにする。進捗ページで1つだけ付いている状態を解消する（C2）。
- → 学習分析の6セクションにはアイブロウを付けない（`.section-title` のみ）。

---

## 5. 削除するもの

- **デッドCSS**: `.domain-list` `.domain-section` `.domain-number` `.objective` `.objective-grid` `.objective-title` `.objective code` とそれらのメディアクエリ（現行 `global.css:429-448`, `963-967`）。参照するコンポーネントは存在しない（`grep` で確認済み）。
- **重複ルール**（D6）: `.handson-badges` / `.official-badges`、`.handson-view > section > h3` / `.official-view > section > h3` は `system.css` の共有クラスに一本化。
- `!important`: `.progress-card-secondary`（現行 `global.css:824`）と `.blueprint-node` のグリッド上書き以外は残さない。前者は `.btn--secondary` に置換して `!important` を消す。

---

## 6. 受け入れ条件（全ストリーム共通）

1. `pnpm build`（`astro check` 込み）が exit 0
2. `pnpm test`（vitest）が pass
3. `pnpm test:e2e:fast` が pass（特に `accessibility.spec.ts`）
4. 担当エリアの全ビューを 1440px / 375px でスクリーンショットし、`tasks/design-consistency-audit.md` の該当指摘が解消されていること
5. `min-height` 44px 未満の対話要素をエリア内に残していないこと
6. 担当ファイル以外を編集していないこと（`git diff --name-only` で確認）
7. `tokens.css` に無い生の色・余白・文字サイズを担当ファイルに書いていないこと
