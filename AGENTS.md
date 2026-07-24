# AGENTS.md — CCA Field Notes の地図

このファイルは**地図**であり、マニュアルではない。詳細ルールはここに書かず、
各領域の「唯一の正」となるドキュメントへ案内する。ここに長文を足したくなったら、
正しい置き場（下の表）に書いてからポインタだけを足すこと。目安は全体で100行。

## これは何か

Claude Certified Architect – Foundations（CCAR-F）の公開出題範囲を学ぶ非公式Web
アプリ。Astro + Preact の静的サイトで、サーバー・ログイン・DBなし。進捗は
ブラウザの localStorage のみに保存。pnpm / Node 22 / TypeScript / vitest / Playwright。

## 絶対的な制約（違反はレビュー以前に不可）

- Anthropic 非公式・非提携の表記を消さない・弱めない
- 実試験問題・記憶からの再構成問題・非公開教材を掲載しない（詳細: `DESIGN.md` §Legal and editorial guardrails）
- 公式点数・合否・準備完了度（pass probability 等）を算出・示唆しない
- 学習内容・進捗を外部送信しない（GA はページ閲覧のみ。詳細: `ASSETS_AND_ANALYTICS.md`）
- 永続化された content ID とストレージスキーマは互換性契約。破壊的変更をしない
- 依存追加は「既存スタックで満たせない」ことを示せる場合のみ

## 唯一の正（Sources of truth）

| 知りたいこと | 読む場所 |
| --- | --- |
| プロダクト設計・スコープ・受け入れ基準 | `DESIGN.md` |
| UI 実装規約（拘束力あり） | `src/AGENTS.md` → `tasks/design-system.md` |
| デザイントークン・共有コンポーネント仕様 | `tasks/design-system.md` |
| リリース手順・検証の4層 | `docs/RELEASE_CHECKLIST.md` |
| 本番スモークの実行と誤検知の切り分け | `docs/PRODUCTION_SMOKE.md` |
| OGP・アイコン・フォント・GA 設定 | `ASSETS_AND_ANALYTICS.md` |
| 過去の失敗から学んだ教訓 | `tasks/lessons.md` |
| 機能開発の経緯・監査記録 | `tasks/task-*.md`（歴史的記録。現状の仕様は `DESIGN.md` が優先） |

`task_plan.md` / `notes.md` / `tasks/todo.md` は特定タスクの作業ファイルであり、正ではない。

## ディレクトリ地図

- `src/content/` — 学習コンテンツ（カード・設問・シナリオ）。`validate.ts` がビルド時検証
- `src/lib/` — ドメインロジック（quiz / mock-exam / scheduler / storage）。テスト同居
- `src/components/` — Preact UI。`app/` に型付きプリミティブ（Button/Panel/Note）
- `src/styles/` — トークンと共有クラス。生の hex・font-size の px/rem・`!important` は lint で落ちる
- `src/i18n/` — ja/en 文字列。JSX に直書きしない
- `tests/` — Playwright E2E（axe アクセシビリティ含む）
- `scripts/` — 検証機構（下記）とアセット生成
- `video/`（Remotion）・`video-hf/`（HyperFrames、独自の `AGENTS.md` あり） — 告知動画。アプリ本体のビルドに影響させない

## フィードバックループ（変更したら回す）

```sh
pnpm test               # unit（コンテンツ検証含む）
pnpm build              # astro check（型）+ 静的ビルド
pnpm test:e2e:fast      # E2E 高速版（@slow 除外・サーバー再利用）
pnpm test:e2e           # E2E 全部（マージ前）
pnpm test:styles        # デザイントークン lint
pnpm test:bundle        # 初期バンドル予算
pnpm test:no-analytics  # GA 未設定ビルドに計測が混入しないこと
```

CI: `.github/workflows/` の e2e / perf（バンドル・Lighthouse・トークン）/
production-smoke。リリース検証は `/release-audit smoke|full` スキルが担う。

## 品質はプロンプトでなく機構で守る

守らせたいことは文章で指示せず、lint・型・テストに落とす。既存の機構:

- `scripts/check-design-tokens.mjs` — 生の色/font-size/`!important` を検出。
  正当な例外のみ行末 `/* ds-allow: <理由> */`
- 型付きプリミティブ（`src/components/app/`）— 誤ったバリアントはコンパイルエラー
- `src/content/validate.ts` — 5領域30タスクの網羅・参照整合をビルドで強制
- バンドル/Lighthouse 予算（`scripts/check-*.mjs`）— 性能回帰を CI で拒否
- `scripts/check-no-analytics.mjs` — プライバシー方針の機械的検証

**エージェント（人間含む）が同じ間違いを二度したら、指示文を増やすのではなく、
この一覧に機構を一つ足すこと。** エラーメッセージには「次に何をすべきか」を書く。

## ハーネスの手入れ

- 教訓は `tasks/lessons.md` に1項目で追記する（次のセッションの初期文脈になる）
- 仕様を変えたら該当する「唯一の正」を同じ PR で更新する（コードと一緒にバージョン管理）
- 各ドキュメントの検証日（Last reviewed 等）を更新した日に書き換える
- このファイルは地図のまま保つ。膨らんだら、詳細を正典側へ移してポインタに戻す
- ここには**このリポジトリ固有の事実だけ**を書く。全リポジトリ共通の個人的な運用原則は
  ユーザーグローバル設定（`~/.claude/CLAUDE.md` / `~/.codex/AGENTS.md`）側に置く
