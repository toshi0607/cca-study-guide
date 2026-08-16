# MCP サーバー構築 (mcp/) — 作業計画

目的は二層: (1) MCP 仕様 2026-07-28 の理解 — FDE 論点 B3/B4・CCA Domain 2、
(2) タチコマ study session の効率化。経緯はこのファイルと `mcp/PRD.md` が正。

## Constraints

| Constraint | Source | Verify by |
|------------|--------|-----------|
| Anthropic 非公式表記を消さない・弱めない | AGENTS.md | 変更ファイルに該当表記なしを確認 |
| 実試験問題・公式スコア・合否示唆を出さない | AGENTS.md | ツール契約レビュー（正答数報告のみ） |
| 学習内容・進捗を外部送信しない（stdio ローカルのみ） | AGENTS.md | ネットワーク呼び出しゼロを grep で確認 |
| content ID・storage schema (StudyDataV3) は互換性契約 | AGENTS.md | mcp/ は読み取り + 既存スキーマ準拠の import JSON 生成のみ |
| 依存追加は既存スタックで満たせない場合のみ → MCP SDK は mcp/ に隔離 | AGENTS.md | ルート package.json 無変更、`pnpm test:bundle` green |
| アプリのビルド・CI に影響させない（video/ と同型） | user 方針 | `pnpm build` / 既存 CI 無変更で green |
| 進捗の正は localStorage。サーバーは export JSON 経由でのみ読み書き | user 回答 (2026-08-16) | サーバーに独自進捗ストアがないこと |
| SDK は v2 系 (@modelcontextprotocol/server 2.0.0, spec 2026-07-28) | user 回答 (2026-08-16) | package.json + 接続検証 |
| 各フェーズで CCA Domain 2 / FDE 論点との対応を学習ノートに残す | user 依頼 | 学習ノートのマッピング表 |

## Assumptions

| Assumption | Status | Evidence |
|------------|--------|----------|
| Claude Code は spec 2026-07-28 (v2 SDK) サーバーに接続できる | UNVERIFIED | Phase 3 で最小サーバー + `claude mcp add` により検証。棄却時は v1 SDK フォールバック（差分を学習ノートへ） |
| src/content・src/lib は DOM 非依存で Node から import 可能 | UNVERIFIED | Phase 2 で import グラフ確認（storage.ts は StorageLike 注入式の見込み） |
| mcp/ を video/ 方式（独立 package.json + 自前 lockfile、workspace 不使用）にしても ../src の TS を import してビルドできる | UNVERIFIED | Phase 3 scaffold で tsc/実行確認（src 側の npm 依存を mcp/ 側にも持つ必要の有無を含む） |
| export JSON は StudyDataV3 スキーマ | VERIFIED | src/lib/storage.ts（buildStudyDataExport）、src/lib/storage-schema.ts |
| import merge では新しいセッション結果が既存進捗に勝つ（UC1 の書き戻しが no-op にならない） | VERIFIED | src/lib/study-data-merge.ts:33-43（reviewedAtMs が新しい側を採用）、同:50-65（quizStats は max + 新しい側の last*） |
| MCP の 3 プリミティブ tools/resources/prompts、client 側は deprecated | VERIFIED | modelcontextprotocol.io spec 2026-07-28 changelog（調査エージェント報告） |

## Phases

- [x] Phase 0: 調査（repo コンテンツ / MCP spec / FDE 論点リスト）— 3 エージェント報告受領 (2026-08-16)
- [x] Phase 1a: PRD ドラフト作成 — `mcp/PRD.md` (2026-08-16)
- [ ] Phase 1b: PRD 本人レビュー → 反映して確定
- [ ] Phase 2: 設計 doc — プリミティブ割当・ツール契約（名前/引数/エラー設計）・URI 設計。
      検証: 本人レビュー + Domain 2 objectives 2.1–2.5 との対応表が埋まる
- [ ] Phase 3: scaffold + 最小サーバー — mcp/ パッケージ、greet 級ツール1つ。
      検証: MCP Inspector で呼べる + `claude mcp add` で Claude Code から呼べる（Assumption A1 判定）
- [ ] Phase 4: 本実装 — tools / resources / prompts + vitest。
      検証: `pnpm --dir mcp test` green + UC1–UC4 を Claude Code から実走
- [ ] Phase 5: 学習ノート + AGENTS.md 地図更新 + PR。
      検証: 既存 CI green、PR 作成

## Notes

- 2026-08-16: スマホ（練習カード）と PC（study session）で localStorage が分断している
  ペインを本人が報告。v1 は PC の export JSON を正とし、スマホ橋渡しは PRD の Roadmap 扱い。
- 2026-08-16: HTTP + OAuth 2.1 は実装せず学習ノートの論点に（FDE E 領域素材）。
- 2026-08-16: 設計制約 — サーバーが生成する import JSON の ReviewState は必ず
  src/lib/scheduler.ts の scheduleReview 実ロジックで作る。merge の勝敗判定
  （study-data-merge.ts の reviewedAtMs）が scheduleReview の遅延を逆算する前提のため、
  手組みの dueAt では衝突解決が壊れる。
- 2026-08-16: `claude mcp add --scope project` はリポジトリ直下に `.mcp.json` を書く。
  「アプリ本体への変更なし」制約の例外として明示的に許容（Domain 2.4 スコープ選定の
  学習素材でもある）。
- 2026-08-16: video/ の隔離方式を確認 — pnpm workspace ではなく独立 package.json +
  自前 pnpm-lock.yaml。mcp/ も同型を採用。

## Review

（フェーズゲートの指摘と対応をここに記録）
