# Task 8B — 60問Mock Exam受験・結果・復習UI

## 背景

Task 8A（PR #36）はUIを持たないpure engine・採点・タイマー・v3永続化を完成させ、
Task 8A.1（PR #37）はproduction question bankを60問へ拡充して`createMockExamSession`が
`ok:true`を返せるようにした。本PR（Task 8B）は、そのpure engineとv3 storageの上に、
学習者が「開始→受験→提出/時間切れ→結果→復習」を行える受験UIを実装する。

engineロジックはUI側へ再実装しない。engineのpure functionsを呼び出し、UIは表示・入力・
storage接続・lazy loadingに徹する。

## 前提条件ゲート（実装開始前の必須チェック — VERIFIED）

| # | 前提 | 結果 | 証拠 |
| --- | --- | --- | --- |
| 1 | PR #36 (Task 8A) merged | ✅ | `a8d5045` on origin/main |
| 2 | PR #37 (Task 8A.1) merged | ✅ | `a807e9b`, mergedAt 2026-07-23T00:06:50Z |
| 3a | Structured Outputs enum誤説明が残っていない | ✅ | main記述は「保証されるのは型・必須項目・列挙値（スキーマ準拠）」と正。誤説明不在。questions.ts:950/960 |
| 3b | command/Skill古い二分法が残っていない | ✅ | 「custom commandはSkillへ統合、frontmatterで作り分け」と明示。questions.ts:1393 / rationales.ts:932 |
| 4 | production bank = 60問 | ✅ | production-bankテストが`ok:true`要求で pass（60問未満なら`insufficient-question-bank`） |
| 5 | Domain配分 d1:16/d2:11/d3:12/d4:12/d5:9 | ✅ | mock-exam-blueprint.ts:17 定数一致 |
| 6 | `createMockExamSession`がproduction bankで`ok:true` | ✅ | mock-exam.test.ts:123-132 `expect(result.ok).toBe(true)` pass |
| 7 | 最新mainのunit/build成功 | ✅ | unit 360/360 pass、build exit 0 |

**baseline main SHA**: `a807e9b9de13f317169355e459a9d582f04eb8fc`
**branch**: `claude/task-8b-mock-exam-ui`（origin/mainから作成）

ゲートは全項目GREEN。blocking conditionなし。

## Constraints（制約台帳 — 全行を完了時に検証）

| Constraint | Source | Verify by |
| --- | --- | --- |
| engineロジックをUIへ再実装しない | 仕様 | 主要engine関数のUI側重複がないことをgrep + reviewer |
| 試験定数（60/120分/配分）をUIで再ハードコードしない | 仕様 | UI内に数値リテラルの配分/60/7200がないことをgrep |
| 残り時間は必ず`expiresAt - now`から導出 | 仕様 | tick回数の永続化・reload時120分リセットがないことをreview + test |
| attemptはexactly onceで保存（二重submit/expiry/連打耐性） | 仕様 | idempotency unit/E2E test pass |
| completed sessionは回答/flag/cursor変更不可 | 仕様 | negative test pass |
| compatibility mismatchをsilent gradingしない | 仕様 | validateMockExamCompatibility不一致時のエラー表示test |
| 合否/passed/scaledScore/readiness/720換算を表示・命名しない | 仕様 | grep禁止語 + reviewer + result UI確認 |
| rationaleをinitial bundleへ静的import しない | 仕様 | bundle audit（rationale chunk分離） |
| reviews/quizStats/studyGuideProgress/handsOnProgressを回帰させない | 仕様 | storage回帰test |
| 既存no-analytics方針維持（外部送信・telemetry追加なし） | 仕様/rules | `pnpm test:no-analytics` pass |
| 巨大app.spec.tsを復活させない / fast・full・a11yの役割維持 | 仕様/PR#35 | Mock Exam専用spec分離、既存E2E高速化維持 |
| Lighthouse budget: perf≥0.90 / FCP≤2000 / LCP≤3000 / CLS≤0.02 | 仕様 | matched main/branch比較 |
| single=radio / multiple=checkbox semantics、色のみで状態表現しない | 仕様/a11y | axe + 手動 |
| ja/en parity | 既存規約 | i18n両言語 + a11y E2E両言語 |
| 公式4-of-6 scenario構成を推測再現しない | 仕様/Task8A | scope外、実装しない |
| Task 9のwrong-answer analysis等を先行実装しない | 仕様 | scope外確認 |

## Assumptions（前提台帳）

| Assumption | Status | Evidence |
| --- | --- | --- |
| engineは新state返却型でmutateしない | UNVERIFIED | ← engine API監査で確定 |
| `now`/random/idはinjection可能で実時間非依存testが書ける | VERIFIED | mock-exam.test.ts が seededRandom/createId/START を注入 |
| storage v3に activeMockExam / mockExamAttempts が存在 | UNVERIFIED | ← storage監査で確定 |
| 既存はPreact islands（Astro）でlazy dynamic importパターンあり | UNVERIFIED | ← UI規約監査で確定（Task7 rationale loaderが先例） |
| Playwrightはfast/full/a11yに分割済み、localStorage fixtureで状態注入 | UNVERIFIED | ← E2E監査で確定 |
| gradingは既存isAnswerCorrectを再利用 | UNVERIFIED | ← engine監査で確定 |

（UNVERIFIED行のうちアーキテクチャを変える可能性があるものは、監査結果でVERIFY後に実装着手する。）

## Scope（本PRでやること）

1. Mock Exam開始画面（説明・免責・開始/再開分離・破棄確認）
2. 受験画面（問題番号・残り時間・single/multiple入力・前後移動・flag・回答/未回答数・提出）
3. 問題パレット（60問一覧・状態識別・未回答/flagged/全フィルタ・keyboard/focus）
4. 明示提出（確認dialog・未回答許容・submitMockExamで完了）
5. 時間切れ（expiresAt基準・自動採点・completed保存・結果遷移・提出/時間切れ区別）
6. Resume（順序/expiresAt不変・回答/flag/cursor復元・compatibility確認）
7. Storage/exactly-once完了処理（idempotent attempt保存・既存進捗非回帰）
8. 結果画面（raw内訳のみ・禁止表示なし）
9. 問題復習画面（選択/正解/rationale/source・フィルタ・rationale lazy load）
10. Attempt履歴（最小・直近attempt必須・保存済み非喪失）
11. 状態遷移/React設計（責任分離・単一巨大component回避）
12. Accessibility / Responsive
13. エラー状態UI
14. Unit / component / E2E(fast・時間切れ・互換性) / build / no-analytics / bundle / Lighthouse
15. 独立subagentレビュー → finding修正
16. commit / push / PR作成（マージしない）

## Non-goals（本PRでやらないこと / Task 9へ残す）

scaled score、合否判定、readiness score、720換算、公式試験結果予測、
wrong-answer trend analysis、少数attemptからの弱点断定、個別学習推薦、
spaced repetition自動連携、課金、login、cloud sync、backend、
公式4-of-6 scenario構成の推測再現、新問題の大量追加、既存問題の内容改訂、
**Task 9 / Task 10の先行実装**。

## API contract（engine/storage — VERIFIED 監査済み）

すべてpure。UIが `now: Date` / `random?` / `createId: ()=>string` / `questions` を注入。
mutatorはno-op時に**同一参照**を返す（`next === session`でsave省略判定可）。unionで返しthrowしない。

engine（`src/lib/mock-exam.ts` から全部import可）:
- `createMockExamSession({questions, blueprint, now, random?, createId}) → CreateMockExamResult`
  = `{ok:true, session}` | `{ok:false, reason:'invalid-blueprint', errors}` | `{ok:false, reason:'insufficient-question-bank', shortages}`。
- `setMockExamAnswer({session, questionId, selectedChoiceIds, now, validChoiceIds?}) → MockExamSession`（空でanswer削除・dedup・writableでなければno-op）
- `toggleMockExamFlag(session, questionId, now)` / `moveMockExamCursor(session, index, now)`
- `submitMockExam(session, now)`（now>expiresAtなら`expired`へ委譲、`submitted`にしない）
- `expireMockExamIfNeeded(session, now)`（idempotent、毎render/resume安全）
- `deriveMockExamRemainingSeconds(session, now)`（`ceil((expiresAt-now)/1000)` clamp0、in_progress以外は0）
- `deriveMockExamProgress(session)`（content不要。answered=answers存在かつselected非空）
- `validateMockExamCompatibility(session, questions) → {compatible:true}|{compatible:false, issues}`
  issues: `missing-question`|`revision-mismatch`|`missing-choice`
- `gradeMockExamAttempt(session, questions) → GradeMockExamResult`
  = `{ok:true, attempt, result}` | `{ok:false, reason:'incompatible-content', issues}` | `{ok:false, reason:'not-completed'}`。
  正誤は `isAnswerCorrect`（quiz.ts:43、exact-set）を再利用。
- `deriveMockExamResult(attempt, questions) → MockExamResult`（rawAccuracy=correct/**60**、byDomain/byDifficulty/bySkill tally。skill合計は60超え得る）

型: `MockExamSession{id,status,questionRefs[],currentIndex,answers:Record<qid,{selectedChoiceIds,answeredAt}>,flaggedQuestionIds,startedAt,expiresAt,updatedAt,submittedAt?}`。
`MockExamAttempt.id === session.id`（exactly-onceのキー）。status: `in_progress|submitted|expired`。
**pass/fail/scaledScore/readinessの型フィールドは存在しない**（設計不変条件）。

storage:
- `StudyDataV3 = v2 + { activeMockExam: MockExamSession|null, mockExamAttempts: MockExamAttempt[] }`（additive、v3配線済み storage-schema.ts:63-64,193-199）
- 専用のexam save APIは**ない**。App.tsx `commitData`（re-read→engine→save全文書）パターンに乗る。
- `save()`は`parseStudyDataV3`でstrict再検証＋`isCurrentKeyWritable`ガード、失敗でfalse。

## UI規約統合方針（VERIFIED 監査済み）

- **Preact**（`preact/hooks`、JSXは`class`、`MutableRef`）。単一Astro island（`App` client:load）。hookは`src/lib/*.ts`に置く（先例`useChoiceRationales`）。
- **View登録**: `View` union を `src/components/app/types.ts:1` と `src/i18n/ui.ts:4` の**両方**に`'mock-exam'`追加。`views:Record<View,string>`もja/en両方（ui.ts:373,698）。
  → **nav slot方針**: 5項目bottom nav（360px uncrowded不変）を崩さないため、hands-on/official-scenarios先例に倣い `NavKey`/`viewKeys`から除外し、**TodayViewの専用エントリ**から起動。`View`キーはApp switch用に持つ。
- **Lazy load**: `MockExamEntry.tsx`（`GuideEntry`同型のdynamic import wrapper、loading/errorステート）で view chunkを遅延ロード。**復習のrationaleは既存`useChoiceRationales(active)`を再利用**し、grading後にactive=true（受験中はロードしない）。
- **save-first**: App.tsxに`commitData`型wrapper（例`saveMockExam`）追加。`studyStorage().load()`で毎回canonical再読込→engine→`save()`。失敗時`setNotice(copy.notices.saveFailed)`+`focusNotice()`、**UIを進めない**（特に時間切れ間際のanswer喪失回避が最重要）。
- **i18n**: `UiCopy`型に`mockExam:{...}`ブロック追加（`quiz`構造をmirror）、ja/en両方をフル記述（fallbackなし）。カウント文字列は関数（例`(count)=>string`）。
- **styling**: `:root`トークン（`--cyan/--amber/--danger/--focus`等）。choiceは`.choice-button`（`.selected/.correct/.incorrect/:disabled`、色のみ非依存）を再利用。新規は`.mock-exam-*` kebab prefix。
- **a11y**: 選択は`QuizQuestion`のfieldset+`<legend class="sr-only">`+button、multipleは`aria-pressed`。**既存カスタムdialogは無い** → submit確認は新規に**native `<dialog>`+`showModal()`**（focus trap内蔵）で実装し新パターンとして記録。timerは`role="status" aria-live="polite"`（routine）、低残時間警告は`role="alert"`。移動後は問題領域/headingへfocus。
- **Playwright**: `testDir:./tests`、port4325、workers=1（save-race決定性）。suite: `test:e2e`(full)/`test:e2e:fast`(`@slow`除外・server再利用)/`test:e2e:a11y`。重いケースは`{tag:'@slow'}`。**`tests/mock-exam.spec.ts`を新規追加**（monolith復活させない）。fixture: `tests/fixtures/app.ts`(localStorage自動クリア)、`tests/fixtures/storage.ts`(`seedStorage`/`readStudyData`)、`tests/fixtures/accessibility.ts`(`expectNoViolations`)。seedは`mock-exam.fixture.ts`のshapeで`activeMockExam`/`mockExamAttempts`注入。

## UI state diagram（確定）

```
[idle/landing] --start--> [running(in_progress)]
[running] --answer/flag/move--> [running]（writableのみ、setIntervalは表示tickのみ）
[running] --user submit--> [confirm dialog] --confirm--> submitMockExam→grade→persist(once)→ [result]
[running] --now>=expiresAt(tick or resume)--> expireMockExamIfNeeded→grade→persist(once)→ [result(expired)]
[reload] --activeMockExam有--> validateCompatibility
        ├ compatible & in_progress → resume [running]（順序/expiresAt不変、残時間=expiresAt-now、期限切れなら即expire→result）
        └ incompatible → [incompatible]（silent gradeしない・自動削除しない・破棄は確認）
[result] --review--> [review]（rationale lazy load）
[result/landing] --history--> [history] --open--> [result/review of past attempt]（stale revisionはcompat error表示、attempt保持）
```

## Component分割（確定）

`src/components/mock-exam/` に配置:
MockExamEntry（lazy wrapper）/ MockExamView（オーケストレータ）/ MockExamLanding /
MockExamRunner / MockExamHeader / MockExamTimer / MockExamQuestion / MockExamPalette /
MockExamSubmitDialog（native `<dialog>`）/ MockExamResult / MockExamReview / MockExamHistory。
hook: `src/lib/use-mock-exam.ts`（`useMockExamSession`＝engine×storage接続、timer tick）。
copy/engine/storageはprops/引数で受け、単一巨大componentにしない。

## exactly-once persistence設計（確定）

- `attempt.id === session.id`をキーにidempotent。
- grading確定時、**単一の`commitData`**で「該当id未存在なら`mockExamAttempts`へappend ＋ `activeMockExam=null`」をアトミックに実行。既存idがあればappendしない（no-op成功扱い）。
- 競合対策: (a) submit/expiryの入口で「既にattempt存在 or activeがnull」なら早期return。(b) `expireMockExamIfNeeded`/`submitMockExam`はno-op時同一参照 → 再gradeを避ける。(c) submitボタンは処理中disable。(d) timer tickのexpiry処理はcommit成功後にintervalクリア。(e) `commitData`は毎回`load()`し直すのでStrict Mode二重effectでも二重appendしない（id存在チェックで吸収）。
- test: 二重submit/多重expiry/submit×expiry境界でattemptが1件のみ、completed後は回答/flag/cursor変更不可、active clear時にattempt非喪失。

## Timer設計

`setInterval`は表示更新契機のみ。真の残り時間は毎tick `deriveMockExamRemainingSeconds`等で
`expiresAt - now`から導出。`now>=expiresAt`で `expireMockExamIfNeeded`→grading→completed保存→
active終了→結果遷移。live announcementは過剰にしない。

## Storage設計

StudyData v3 の `activeMockExam` / `mockExamAttempts` を使用。mutation前にcanonical再読込。
既存 reviews/quizStats/studyGuideProgress/handsOnProgress を保持。壊れたstorageを黙って上書きしない。

## Compatibility mismatch設計

`validateMockExamCompatibility`不一致時: silent grading/自動削除しない。
「問題内容が更新されたため安全に再開できません」旨を表示。破棄が必要なら確認を取る。

## Test matrix（監査後に具体化）

- Unit: 回答保存/削除、flag、cursor、resume、expiry on resume、explicit submit、
  automatic expiry、attempt exactly-once、active clear、compatibility mismatch、
  malformed/unavailable storage、result derivation、filter derivation、raw以外を生成しない。
- Component: single/multiple入力、移動、palette、submit確認、countdown、result、
  review filter、rationale lazy-load、compatibility error。
- E2E fast: 開始→回答→flag→移動→reload→resume→提出確認→提出→result→復習→rationale。
- E2E 時間切れ: fake clock、expiry直前/exactly/後reload、attempt 1件のみ、変更不可。
- E2E 互換性: revision mismatch active / missing question / stale attempt review。

## Performance plan

Mock Exam runner / grading・review UI / choice rationales / 重いcomponentをlazy load。
計測: total client JS、initial App island、Mock Exam chunk、rationales chunk、
initial loadにrationale非混入、main/branch gzip差分、Lighthouse median（matched比較）。

## 実装手順（durable todo）

- [x] 1. PR #36/#37マージと2件の正確性修正を確認（ゲート表参照）
- [x] 2. 最新origin/main取得・branch作成
- [x] 3. unit(360/360)/build(exit0) baseline
- [ ] 4. Task 8A engine/storage監査（Explore aeed7637）→ API contract節を埋める
- [ ] 5. 既存App/navigation/component/i18n/Playwright規約監査（Explore a88a8de）→ 統合方針節を埋める
- [ ] 6. 本plan（task-8b-mock-exam-ui.md）を監査結果で確定
- [ ] 7. UI state diagram確定
- [x] 8. 純粋コントローラ `mock-exam-controller.ts`（create/change/finalize(exactly-once)/discard）実装 — unit 16/16 pass
- [x] 9. start/resume実装（MockExamView orchestrator + Landing）
- [x] 10. runner/timer/answer/flag/cursor実装（Runner/Timer/Question + useSecondTick）
- [x] 11. palette実装（MockExamPalette、native dialog）
- [x] 12. submit/expire + exactly-once persistence実装（App finalize + controller）
- [x] 13. result実装（MockExamResult、raw内訳のみ・禁止表示なし）
- [x] 14. review + rationale lazy-loading実装（MockExamReview、useChoiceRationales(true)は復習時のみ）
- [x] 15. attempt履歴の最小UI実装（MockExamHistory）
- [x] 16. accessibility / responsive対応（fieldset/aria-pressed/native dialog/live region/focus移動/@media）
- [x] 17. unit tests（`pnpm test` 376/376 pass、controller 16件追加）
- [x] 18. E2E（fast / 時間切れ / 互換性 / a11y）追加（`tests/mock-exam.spec.ts` 6件、full suite 94/94 pass）
- [x] 19. `pnpm build`（exit0）/ `pnpm test:no-analytics`（pass）
- [x] 20. bundle / Lighthouse比較（matched main/branch、下記実測）
- [x] 21. 独立subagentレビュー（reviewer / 観点14項目）→ **Approve、Critical/High なし、Low 2件**
- [x] 22. finding修正・再検証（Low 2件修正、tsc/unit376/build/E2E6再グリーン）
- [ ] 23. commit / push / PR作成（マージしない）

各項目は単一コマンドで検証できる粒度に分割し、evidenceを本ファイルへ記録する。

## 実測結果

**baseline main SHA**: `a807e9b`  **branch**: `claude/task-8b-mock-exam-ui`

- unit: **376/376 pass**（controller 16件追加）
- build: exit 0 / no-analytics: pass
- E2E: **full 94/94 pass**（`tests/mock-exam.spec.ts` 6件 = fast full flow / seeded resume / expiry on reload / incompatible / auto-expire@slow / a11y@slow）
- bundle（gzip, matched G-TEST123456）: 初期HTML参照JS main 13,959 → branch **13,394**（-565、engine非同梱）／App entry main 13,133 → branch 12,568／総first-party JS main 198,696 → branch 211,024（+12,328、大半はdeferred: MockExamView 5,009・engine・rationale）。MockExamView / rationales は初期ロード非参照。
- Lighthouse（ローカル3run median, matched同環境）: main perf96/FCP1081/LCP2763/CLS0 → branch **perf95/FCP1216/LCP2921/CLS0、全budget clear**（perf≥0.90/FCP≤2000/LCP≤3000/CLS≤0.02）。※権威はGitHub perf CI。

## Notes（逸脱ログ）

- 2026-07-23: セッションはTask 9起動として開始したが、ユーザー確認で次タスクはTask 8Bと判明。
  Task 8Bの完全な仕様が提供され、前提条件ゲートを検証（全GREEN）。本planを起こして着手。
- 2026-07-23: **性能回帰と修正（重要）**。初回実装ではApp.tsxがMock Exam engine/controllerを静的import
  していたため、landing route（`/`）の初期グラフにexam logicが載り、ローカルLighthouseで
  LCP 3240-3379ms（budget3000超）/ perf91-92へ回帰（main同環境はLCP2763/perf96）。再計測で
  ノイズでなく実回帰と確認。原因はengineの初期同梱。修正: App→lazy MockExamViewへ「storage bridge
  （readData/writeData）」のみ渡し、engine/controllerの呼び出しとimportをMockExamView（lazy chunk）内へ
  全面移設。結果: 初期JS -565、LCP2921/perf95で全budget clear、E2E 6/6維持、unit376/376維持。
  教訓: 「lazy viewのwrapperをlazyにしても、親が engine を static import すれば初期ロードに載る」。
  App側はドメインロジックをimportせず汎用storage bridgeのみ渡す。

## Review

独立 reviewer agent（fresh context, opus）で14観点＋追加バグ探索を実施。**Verdict: Approve、Critical/High なし。**
reviewerが独立実行: unit 376/376、build 0 errors（astro checkが`copy.mockExam.*`のja/en parityを型強制）、no-analytics pass、
bundle分離（`insufficient-question-bank`はMockExamViewチャンクのみ、App非同梱）、禁止語grep clean を確認。

Low 2件を修正:
1. 単一選択肢の選択状態がSRに色のみ（`aria-pressed`がsingleでundefined）→ 全選択肢に`aria-pressed={isSelected}`付与
   （[MockExamQuestion.tsx](../src/components/mock-exam/MockExamQuestion.tsx)）。制約台帳「色のみで状態表現しない」に合致。
   ※既存QuizQuestion（Task7）にも同種の継承パターンがあるが、本PRスコープ外のため未変更。
2. 難易度tallyが空でも0/0/0行を描画（byDomainと不整合）→ `total>0`でフィルタ
   （[MockExamResult.tsx](../src/components/mock-exam/MockExamResult.tsx)）。60問blueprintでは全難易度充足のため現状は非表示影響なし。

修正後 tsc clean / unit 376/376 / build exit0 / Mock Exam E2E 6/6（a11y axe 0違反）再グリーン。
reviewerはPlaywright E2Eを独立実行していない（環境制約）— E2Eはこちらでfull 94/94を確認済み。

## 完了条件チェック（全達成）

60問120分開始・production bank使用・順序固定・回答/flag/cursor保存・reload resume・expiresAt維持・
時間切れ自動処理・明示提出・attempt exactly-once・raw結果・domain/difficulty/skill内訳・全問復習・
rationale lazy-load・compatibility mismatch安全表示・過去attempt参照・a11y・responsive・
unit/build/no-analytics・fast/full/a11y E2E・Lighthouse budget・rationale初期非混入・
scaled/合否/readiness非実装・Task9非先行 — すべて満たす。PR作成（マージしない）。
