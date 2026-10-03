# 設問の重複解消 — シナリオ演習側の書き直し（2026-09-29）

## 背景

模擬試験（60問）で「ほぼ同じ問題が何問も出る」という報告（トシ、2026-09-28 受験分）。

- 問題バンクはちょうど60問で、ドメイン配分 16/11/12/12/9 が模擬試験の割当と一致する。模擬試験は毎回、全問を並べ替えて出している。
- シナリオ演習21問（`q-sc-*`）のうち多くが、同じ task statement の単独問題を設定だけ変えて言い直したものになっている。
- 方針（トシ決定）: 重複している側の設問を、同じ task statement の別の判断点か、1問しかない task statement 向けに書き直す。ID・ドメイン・シナリオ所属・形式（single/multiple）は維持し、`revision` を 2 に上げる。総数60とドメイン配分は変えない。

## Constraints

| Constraint | Source | Verify by |
|------------|--------|-----------|
| 総問題数60・ドメイン配分 16/11/12/12/9 を維持 | トシ決定 / blueprint | `pnpm test`（validate + mock-exam テスト） |
| ID・domainId・scenarioId・format を変えない | トシ決定 / storage 互換契約 | diff 目視 + validate |
| 書き直した設問は revision を 2 に上げる | lessons.md（主張の修正は revision を上げる） | diff |
| 事実は公式ページを取得・引用して書く。記憶で書かない。`verifiedAt` は実際に読んだ日 | lessons.md | 下書きに引用を添付、reviewer 照合 |
| 実試験問題・再構成問題を載せない。登場企業は架空 | AGENTS.md 絶対制約 | reviewer |
| hands-on / study-guide から参照される設問は、参照元の task statement を objectiveIds に残す | validate.ts | `pnpm test` |
| 各シナリオは3〜5問、single と multiple を両方含む | validateScenarioQuestionLinks | `pnpm test` |
| 全 choice に ja/en の rationale | validate.ts | `pnpm test` |
| 全 SkillId がどれかの設問で使われ続ける | validate.ts | `pnpm test` |
| 依存追加なし | AGENTS.md | package.json diff |

## Assumptions

| Assumption | Status | Evidence |
|------------|--------|----------|
| revision を上げても提出済み模試の結果は壊れない | VERIFIED | `src/lib/mock-exam-analysis.ts:163,205`（旧 revision は生の正答数のみに計上）、`MockExamReview.tsx:36,80`（stale 表示） |
| 進行中の模試は revision 変更で incompatible 表示になる（設計どおり） | VERIFIED | `MockExamView.tsx:172-173` |
| quizStats は revision を持たないので、書き直し後も過去の Quiz 回答数がそのまま引き継がれる | UNVERIFIED-ACCEPTED (2026-09-29) | storage-schema に revision なし。回答数の表示だけで採点根拠には使わないため許容。PR 本文に明記する |
| E2E・単体テストは書き直し対象の本文や ID に依存していない | VERIFIED | `grep -rn "q-sc-" tests src/content/content.test.ts` 該当なし |
| シナリオ背景（scenarios.ts）の revision は永続化されていない | VERIFIED | `grep -rn "scenarioRevision" src/lib` 該当なし |

## 書き直し対象と角度（14問）

各シナリオ内で format を維持する。背景に材料が足りない場合はシナリオ背景へ段落を追加し、シナリオの revision を上げる。

### sc-mcp-tool-design（d2）
- [x] `q-sc-mcp-carrier-error`（2.2）: 一括処理ツールの部分失敗。項目ごとの成否と再試行可否を返す（`q-d2-transient-error` は一時的か恒久的かの分類）
- [x] `q-sc-mcp-surface`（2.3）: 分割し過ぎによる往復コスト（`q-d2-tool-overload` は選択肢の削減）
- [x] `q-sc-mcp-token`（2.4）: 個人トークンを使うサーバーと共有サーバーのスコープ選択（local/project/user）
- 維持: `q-sc-mcp-args`（シナリオを最低3問に保つため。重複が残ることは PR に記載）

### sc-code-rollout（d3, d2）
- [x] `q-sc-code-conventions`（3.1 維持・hands-on 参照あり）: CLAUDE.md の階層と優先関係（個人・プロジェクト・サブディレクトリ）
- [x] `q-sc-code-skill`（3.2）: SKILL.md を小さく保つ（段階的な読み込み・参照資源への分離）
- [x] `q-sc-code-e2e-rules`（3.3）: glob が意図したファイルに一致するかの検証・全体指示との重複
- [x] `q-sc-code-ci`（3.6 維持・hands-on 参照あり、3.5 を追加）: レビュー用プロンプトの反復改善（評価基準を先に決め、変更ごとに回帰を確認）
- [x] `q-sc-code-mcp-config`（2.4）: プロジェクトスコープの `.mcp.json` を共有したときの承認・信頼境界

### sc-extraction-pipeline（d4, d5）
- [x] `q-sc-pipe-validation`（4.3→4.6）: 長い文書を複数パスで抽出し、統合時に全体の整合を検証する
- [x] `q-sc-pipe-retry`（4.4）: 再試行上限に達した後のフォールバック（人のレビュー待ちへ回す等）
- [x] `q-sc-pipe-batch`（4.5）: バッチ結果の部分失敗。custom_id で対応付け、失敗・期限切れ分だけ再投入する

### sc-support-agents（d1, d5）
- [x] `q-sc-support-context`（5.1）: 長い入力での情報配置と、再開に必要な状態の明示
- [x] `q-sc-support-escalation`（5.2/5.5 維持・hands-on 参照あり）: エスカレーション結果を分類別に見て改善ループへ戻す
- [x] `q-sc-support-parallel`（1.2/1.6）: 固定フローと動的分解の使い分け（既知の返金手順は固定、調査分岐は動的）
- 維持: `q-sc-support-worker-contract`

## 手順

- [x] P0: `question()` ヘルパーに revision を渡せるようにする（`extra.revision`）。検証: `pnpm test` exit 0 → 2026-09-29 exit 0（32 files / 676 tests）
- [x] P1: シナリオ4つ分の下書きを並列で作る（サブエージェントが公式ページを取得・引用、scratchpad に TS 断片を出力） → 4本完了
- [x] P2: 下書きをレビューして questions.ts / rationales.ts / scenarios.ts に適用。検証: `pnpm test` exit 0 → 2026-09-29 exit 0（676 tests）、build exit 0
- [x] P3: 重複の再チェック（書き直し後に新しい重複を作っていないか）と事実照合を reviewer で行う → 3回目で mergeable（BLOCKER/MAJOR なし）
- [x] P4: `pnpm build` / `pnpm test:e2e:fast` / `pnpm test:styles` exit 0 → build exit 0、styles exit 0、E2E（reuse, @slow 除外）106/107。失敗1件 save-failure.spec.ts:95 はガイド画面のボタン待ちタイムアウトで、単独再実行 3/3 pass（負荷起因の flaky、設問変更と無関係）
- [ ] P5: PR 作成、CI 通過確認

## Notes

- 模擬試験の抽選ロジックでは解決できない。バンク数と割当が同じなので、重複を避けると問題が足りなくなる。
- 「受け直しても同じ60問」という問題は今回の範囲外。バンク拡張は別タスクとして提案する。
- シナリオ背景は validate で最大4段落。sc-mcp-tool-design と sc-code-rollout は追加分を第4段落へ結合した。背景を変えた3シナリオは revision 2。
- 下書きの修正: pipe-validation の選択肢 d が a とほぼ同じだったため「前回までの結果を順に引き継ぐ」誤りへ差し替え。出典のない主張（長い入力で精度低下、バッチに自動再試行なし、質問の文脈が薄れる）を削除し、公式の表現へ寄せた。
- 設計判断の問題（公式ドキュメントに直接記述がなく試験ガイドの task statement 文言に依拠）: q-sc-pipe-validation, q-sc-pipe-retry, q-sc-support-escalation, q-sc-support-parallel, q-sc-support-context, q-sc-mcp-carrier-error の選択肢 d。q-sc-mcp-surface の往復コストは tool-use ページの記述で裏付け済み。
- hands-on 参照のため残した objectiveIds のうち、q-sc-support-escalation の 5.2 と q-sc-support-parallel の 1.2 は名目上のタグになった（設問は 5.5 / 1.6 を測る）。PR に明記する。
- レビュー1回目（ac114cf で対応）: mcp-token 誤答の事実誤り、code-ci と q-d3-iterative-eval の重複、pipe-validation と q-d4-multipass の重複、support-context の task statement 不一致、正答だけ長い選択肢。
- レビュー2回目: pipe-validation が出典系（q-d5-provenance, q-sc-pipe-provenance）と、support-context が q-d1-handoff-data と重複。英語版の長さの偏り。

## Review

- 1回目（56c578d 対象）: BLOCKER 1（mcp-token 誤答根拠の事実誤り）、MAJOR 6（code-ci / pipe-validation / support-context の重複・不一致、選択肢長の偏り、出典）→ ac114cf で対応
- 2回目: pipe-validation が出典系と、support-context が q-d1-handoff-data と重複。英語版の長さの偏り → facfb6f で対応
- 3回目: mergeable。残った MINOR（長さ調整のための強調語「一切」「決して」等、pipe-validation の誤答 c が q-d4-multipass の誤答の裏返し）は最終コミットで対応
- 最終検証: `pnpm test` 676/676 exit 0、`pnpm build` exit 0、`pnpm test:styles` exit 0、`pnpm test:e2e:reuse`（全件）159/159 exit 0
- 既知の残り: `q-sc-mcp-args` と `q-sc-support-worker-contract` は重複を残したまま（シナリオ最低3問の維持と範囲の都合）。「受け直しても同じ60問」はバンク拡張の別タスク
