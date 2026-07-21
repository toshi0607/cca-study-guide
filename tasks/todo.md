# PR 3: localStorage v2 と安全な migration 基盤

Branch: claude/localstorage-v2-migration-628fde（origin/main = 3f7d298 から作成）

前回の tasks/todo.md (PR #28) は完了・無関係のため本内容に置き換え。

## Constraints

| Constraint | Source | Verify by |
|------------|--------|-----------|
| v1 の reviews / quizStats を 1 件も失わない | user msg | migration unit test + E2E |
| migration は純粋・決定的・冪等 | user msg | `migrateStudyDataV1ToV2` の unit test |
| migration 成功前に v1 を削除しない | user msg | load 系 unit test / E2E |
| 保存失敗を成功扱いしない | user msg | `save()` の戻り値テスト・既存 E2E |
| 未知 version を v1 として扱わない | user msg | `parseStudyData` の unit test |
| UI・文言・CSS・コンテンツを変更しない | user msg | diff（変更は storage / App の 4 行 / テスト） |
| 新規依存を追加しない | user msg | package.json 差分なし |
| content validator・rationales を client bundle へ入れない | user msg | dist 内 grep + bundle size |

## 現状整理（実装前）

1. v1 schema: `{ version: 1; reviews: Record<string, ReviewState>; quizStats?: Record<string, QuizStat> }`（`src/lib/storage.ts`）
2. 生成・保存・読み込み経路: `App.tsx` の `studyStorage()` → `createStudyStorage(window.localStorage)`。load は初回 effect、save は rating / quiz / import
3. import/export: `buildStudyDataExport` が `{ exportedAt, app, ...data }`、`parseStudyDataImport` が wrapper と bare の両方を受理
4. read failure: `window.localStorage` の getter throw は `studyStorage()` の try/catch、JSON parse error は `load()` の try/catch。いずれも空データを返す
5. write failure: `save()` が false を返し、App が `notices.saveFailed` を表示。session カードは進まない
6. reset: `cca-field-notes:v1` を `removeItem`
7. E2E: `tests/app.spec.ts` が key 文字列を直書き（seed・検証・quota 失敗の再現）
8. 更新が必要なファイル: `src/lib/storage.ts`、`src/components/App.tsx`、両テスト
9. migration 失敗時のデータ保護: v1 key を別 key として残し、v2 write 成功まで正本を移さない
10. storage key: dual key（`:v1` を legacy、`:v2` を現行）を採用。理由は PR 本文の Storage key strategy 参照

## Assumptions

| Assumption | Status | Evidence |
|------------|--------|----------|
| `Object.fromEntries` / 明示 skip で prototype pollution を防げる | VERIFIED | `storage-schema.test.ts` の pollution テスト |
| `Date.parse` は不可能な日付を弾く | FALSIFIED | `2026-02-30T00:00:00.000Z` は 3/2 に繰り上がる → UTC round trip 検証を追加 |
| QuizView / QuizSetup は `quizStats` を optional prop で受ける | VERIFIED | `src/components/views/QuizView.tsx:23` |

## 作業

- [x] 最新 main から作業（`3f7d298` 基点）
- [x] baseline: `pnpm test` 120 passed / `pnpm build` 成功 / App bundle 220,965B (gzip 77,475B)
- [x] `src/lib/storage-schema.ts`: v1/v2 型、空データ生成、runtime validation、純粋 migration
- [x] `src/lib/storage.ts`: dual key、load/save/reset、import/export
- [x] `src/components/App.tsx`: 初期値と reset を `createEmptyStudyData()` に統一
- [x] unit test 追加（`storage-schema.test.ts` 32 件 / `storage.test.ts` 26 件）
- [x] E2E: migration 1 件・reset 後の再 migration 防止 1 件を追加、key をプロダクション定数から取得
- [x] `pnpm test` 165 passed
- [x] `pnpm build`（astro check 込み）成功
- [x] `npx playwright test` 52 passed
- [x] `pnpm test:no-analytics` 成功
- [x] bundle 比較: 222,691B (gzip 78,278B) / +1,726B (+803B gzip)

## Notes

- key 変更を選んだ理由: 同一 key で version を上げると、deploy rollback 時に旧コードが `version: 2` を
  拒否して空データを表示し、その後の評価で v1 形式を **上書き保存** して既存データを破壊する。
  dual key なら rollback しても legacy key の中身が無傷で残る。
- `load()` の署名は `StudyData` のまま維持した。`LoadResult` 型へ変えると App と既存テストの
  呼び出し側が広く変わり、このPRのリスクを不必要に増やすため。migration の永続化は load 内で
  best effort で行い、失敗しても in-memory の v2 を返す（legacy key は残るので次回再試行される）。
- ISO datetime の検証は正規表現 + UTC round trip。`Date.parse` だけでは 2026-02-30 が通ってしまう
  ことをテストで確認した（上記 Assumption 参照）。
- `save()` は validation を通した結果そのものを書き込む。version が不正な文書は書かずに false を返し、
  個々の不正 entry は落として保存する（次回 load でどのみち落ちる entry なので、観測できる損失はない）。
  「保存できたと言ったのに再読込で消える」状態を作らないための選択。
- **レビュー指摘（fresh-context reviewer、Request Changes）への対応**:
  - High1 読めない v2 文書の破壊: 未知 version や壊れた JSON が v2 key にある場合、load は空を返すが
    その直後の save が上書きしてしまっていた。`isCurrentKeyWritable()` を追加し、
    「このビルドが読めない値が入っている間は書き込まない」ようにした（保存失敗として通知される）。
    回帰テストを 2 件追加。
  - High2 rollback 中の書き込みが roll-forward で無視される件: v2 key があれば常に v2 を優先するため、
    rollback 期間に旧コードが v1 key へ書いた分は roll-forward 後に読まれない（削除はされず v1 key に残る）。
    完全な解決には migration 元を記録する marker が必要で、本 PR で決めた v2 schema（5 フィールド）を
    超える。既知のトレードオフとして PR 本文へ明記し、コメントの表現も実態に合わせた。
  - Medium4 v2 key の JSON parse 失敗が legacy 分岐を飛ばす件: `parseJson()` で分離した。
    ただし読めない v2 値がある場合に legacy を migration すると上書きになるため、意図的に空を返す。
  - Low6 危険な record key: `constructor` / `prototype` は普通の own key で、`result[key] = value` でも
    Object.prototype に到達しない。将来 id が衝突したときに黙ってデータを落とすほうが害なので、
    除外を `__proto__` だけに絞った。
  - Medium5 `ImportedStudyData.migrated` は UI では使わないが、v1/v2 のどちらを取り込んだかを
    呼び出し側が判別できる情報として残す（新しい UI 文言は本 PR のスコープ外）。
