# UI 実装の規約（拘束力あり）

このディレクトリ配下で UI（コンポーネントの見た目・スタイル）を追加/変更するときは、
`tasks/design-system.md` を**唯一の正**として従うこと。過去に画面ごとにボタン・見出し・
パネル・注記の実装が分岐したため、それを再発させないための決まり。

## 守ること

- **色・余白・文字サイズ・角丸は必ずトークンを使う。** 生の hex / rem / px を
  `src/styles/*.css`（`tokens.css` を除く）に書かない。必要な値が無ければ、まず
  `tasks/design-system.md` §2 に追記してから `tokens.css` に足す。
- **ボタン・パネル・注記・見出し・バッジは共有クラスから組む。** 新しい `.mock-exam-primary`
  のような一点物クラスを作らない。共有物は `src/styles/system.css`（`.btn` / `.chip` /
  `.panel` / `.note` / `.page-title`・`.section-title`・`.card-title`・`.sub-title` /
  `.badge` / `.domain-label` / `.status`）。
- **見出しには必ず見出しクラスを付ける**（`font-family` 未指定の見出しは本文書体に落ちる）。
- **影を持つのは `.panel--hero` だけ。** それ以外のパネルに `box-shadow` を足さない。
- **アイブロウは ja/en とも英語大文字**。文字列は `src/i18n/ui.ts` に置き、JSX に直書きしない。
- **テストが掴む要素にはエリアフッククラスを残す**（例 `btn quiz-start`、`note note--info
  mock-exam-notice`）。「共有クラス＋エリアフック」が既定パターン。

## 使うもの

新しい UI は、可能なら型付きプリミティブを使う（誤ったバリアントがコンパイルエラーになる）。
`src/components/App.tsx` と大文字小文字で衝突するため、バレルではなく各ファイルから直接 import する:

```tsx
import { Button } from './app/Button';   // 位置に応じた相対パス（'../app/Button' など）
import { Panel } from './app/Panel';
import { Note } from './app/Note';

<Button variant="secondary" onClick={…}>{label}</Button>
<Panel hero compact aria-labelledby="…">…</Panel>       {/* as="header" などで要素を変更可 */}
<Note kind="warn" class="mock-exam-notice">…</Note>
```

クラス文字列だけ必要なとき（ポリモーフィックな要素など）は `buttonClass()` / `panelClass()` /
`noteClass()`（`src/components/app/ui.ts`）。エリアフックは `class` プロップ/引数で足す。

## 自動チェック

`node scripts/check-design-tokens.mjs`（CI: `pnpm test:styles` 相当が Performance budget
ワークフローで走る）が、上記の「生の色/文字サイズ/`!important`」を検出して落とす。
正当な例外だけ、その行末に `/* ds-allow: <理由> */` を付けてオプトアウトする
（display 数字やヒーロー見出しなど、`tasks/design-system.md` §2 参照）。乱用しないこと。
