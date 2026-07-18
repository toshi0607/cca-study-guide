# 進捗JSONインポートの実装

Previous plan (focused review session, PR #23) completed and merged; replaced by
the progress-import plan below.

Branch: feat/import-progress-json（origin/main 6687f6b から作成、86c224b に rebase 済み）

## Constraints

| Constraint | Source | Verify by |
|------------|--------|-----------|
| progressビューのデータ管理パネルにインポートボタン追加（既存ボタンとデザイン統一） | user msg | App.tsx data-actions 内、既存クラス流用 |
| ラッパー形式と素のStudyData両対応 | user msg | storage.test.ts |
| 検証ロジックはstorage.tsの既存バリデーション共通化（App.tsxに重複実装しない） | user msg | load と import が同一関数を使用 |
| 不正エントリは既存load同様に捨てる／未知のカードIDは保持 | user msg | storage.test.ts（load挙動と同一） |
| 適用前に確認ダイアログ（復習済み枚数・エクスポート日時・上書き警告、キャンセル可） | user msg | e2e dialog.message 検証 |
| 適用後 localStorage保存 + state更新（リロード不要）、notice(aria-live)で通知 | user msg | e2e |
| 失敗ケース（壊れたJSON・形式違い・保存失敗）すべてnoticeで通知 | user msg | 実装 + notice文言 |
| localStorage保存形式・キー変更禁止 | user msg | storage.ts save/キー不変 |
| スケジューラ・他ビュー挙動変更禁止 | user msg | diff範囲 |
| ja/en両ロケール文言追加 | user msg | ui.ts satisfies UiCopy |
| storage.test.ts にユニットテスト（正常系・ラッパー・壊れたJSON・不正エントリ混在） | user msg | pnpm test |
| e2e に「エクスポート→リセット→インポート→復元」フロー追加 | user msg | pnpm test:e2e |
| README 1行更新 + DESIGN.md 同期 | user msg | diff |
| main最新から新ブランチ / 全テスト・build パス後PR作成 | user msg + pr.md | exit 0 / gh pr |
| コンフリクト時は相手の変更を理解した上でrebaseで解消 | user msg | PR #23 マージ後の rebase |
| コミット末尾 Co-Authored-By / PR末尾 Generated with | user msg | git log / PR body |

## Assumptions

| Assumption | Status | Evidence |
|------------|--------|----------|
| エクスポートJSONはStudyDataのトップレベルスプレッド（version/reviewsが最上位）なのでラッパー・素形式は同一バリデータで検証可能 | VERIFIED | App.tsx exportData |
| 既存loadは未知のカードIDを削除しない（cardIdキー一致のみ検証）→ インポートも保持でよい | VERIFIED | storage.ts isReviewState は cards コンテンツを参照しない |
| 新規文言（ボタン・notice・confirm）はdisplayフォント対象外 → サブセット再生成不要 | VERIFIED | fonts.test.ts のdisplay対象は見出しのみ |
| 保存失敗noticeは既存 notices.saveFailed を再利用 | DECISION | 同一の失敗原因・対処のため重複文言を作らない |
| ファイル選択は hidden input + ボタンclick、e2eはfilechooserイベントで注入 | DECISION | Playwright標準パターン |

## Plan

- [x] storage.ts: parseStudyData / parseStudyDataImport を抽出し load をリファクタ（挙動不変） — pnpm test パス
- [x] storage.test.ts: インポート検証ユニットテスト追加（正常系・ラッパー・ビルダーround-trip・壊れたJSON・不正エントリ混在・未知ID保持） — pnpm test 50 passed
- [x] ui.ts: ja/en 文言追加（importJson / importConfirm / importInvalid / importDone） — tsc --noEmit exit 0
- [x] App.tsx: progressビューにインポートUI＋ハンドラ追加 — pnpm build exit 0
- [x] tests/app.spec.ts: export→reset→import e2e + 形式違いファイル拒否 e2e 追加 — pnpm test:e2e パス
- [x] README.md 1行更新 + DESIGN.md 同期（features / views / acceptance criteria）
- [x] フェーズゲートレビュー（/code-review high: 8ファインダー＋4検証）実施・指摘反映
- [x] コミット・push・PR作成（https://github.com/toshi0607/cca-study-guide/pull/24）
- [x] PR #23 マージ後の rebase・コンフリクト解消・全テスト再実行（tsc 0 / vitest 55 passed / e2e 47 passed / build 成功）・force push

## Notes

- 確認ダイアログは既存 resetData と同じ window.confirm を採用（新規モーダル実装より既存パターン優先）
- インポートの保存失敗noticeは既存 notices.saveFailed を再利用（原因・対処が同一のため）
- file input は hidden + ボタンからの programmatic click。input.value を先頭でクリアし同一ファイルの再選択でも change を発火させる
- exportedAt の表示は formatDate(new Date(iso)) を使用（formatDate の文字列オーバーロードは日付のみ形式想定のため Date で渡す）
- 形式違いファイル拒否の e2e も追加（仕様の「失敗ケースをnoticeで通知」の検証）
- PR #23（集中レビューセッション）マージによるコンフリクトは README（両行併記）、App.tsx import文（両方保持）、tasks/todo.md（本プランで置換）で解消
- rebase後のe2eで既存「シナリオ演習」テストのaxe解析が30秒タイムアウトする事象が断続発生 → レビュー用サブエージェント並列実行中のCPU負荷が原因（単独実行3回パス、負荷解消後フルスイート2回連続47件パス）。コード欠陥ではない

## Review

/code-review high（8ファインダー角度 → 検証）の結果と対応:

| Finding | Verdict | 対応 |
|---------|---------|------|
| export/import契約が型で結ばれずCI（vitestのみ、e2eはCI外）で守られない | CONFIRMED | buildStudyDataExport をstorage.tsに追加しexportDataから使用、round-tripユニットテストでCI保護 |
| async onChangeハンドラのfloating promise（typescript.md違反） | 指摘どおり | importDataを同期化し file.text() の promise を then/finally で処理 |
| App.tsx側try/catchがparseStudyDataImport内のcatchと二重 | 指摘どおり | 上記再構成で解消（読み込み失敗はrejectionハンドラで通知） |
| ISO日付妥当性チェックがstorage.ts内で3重に重複 | 指摘どおり | isParsableDate に抽出 |
| exportedAtのundefined回避三項演算子が不要 | 指摘どおり | 単純な条件分岐に簡約 |
| インポートの再入ガードなし（解決順で後勝ちの競合） | PLAUSIBLE | importBusyRef を追加（QuizView answeredIdRef と同パターン） |
| 読み込みI/O失敗と形式違いが同一notice | PLAUSIBLE | 仕様が失敗ケースの単一notice通知を許容、文言は両方に妥当なため据え置き |
| 確認ダイアログの件数がquizStats・未知IDを含む/含まない問題 | REFUTED | 仕様の「復習済みカード数」どおり。上書き警告は件数に関わらず常時表示 |

correctness系の未修正CONFIRMED/PLAUSIBLEなし。

---

## Maintenance: Dependabot

### Plan

- [x] Root pnpm project用のDependabot設定を追加する。
- [x] GitHub側の脆弱性アラートとセキュリティ更新を有効化する。
- [x] 設定をPRとして作成し、レビュー後にmainへマージする。（PR #17 merged: fcfc337）

### Configuration

- npm ecosystemでルートの`package.json`と`pnpm-lock.yaml`を対象に、毎週月曜09:00（Asia/Tokyo）にバージョン更新を確認する。
- production/developmentのminor・patch更新は別々にグループ化し、major更新は個別PRにする。version update PRは最大5件に制限する。
- セキュリティ更新はグループ化・上限制限の対象外とし、脆弱性検出時に個別・即時で作成する。自動マージは有効化しない。
