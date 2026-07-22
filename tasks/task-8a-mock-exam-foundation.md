# Task 8A — 60問Mock Examの出題・永続化基盤

## 背景

Task 8は「60問／120分の模擬試験」を導入するが、UIと基盤を1つのPRに詰め込むと、
ドメイン配分・時間切れ・resume・storage互換性のいずれかを壊しても気付きにくい。
そこで2つに分割する。

- **Task 8A（本PR）**: 出題エンジン・採点・タイマー・セッション状態・v3永続化を、
  UIを持たない純粋で検証可能な基盤として完成させる。
- **Task 8B（次PR）**: 開始画面・60問受験UI・カウントダウン・問題パレット・提出確認・
  自動提出・resume UI・結果／復習画面・accessibility／responsive／E2E。

本PRはTask 8Bが利用する型と純粋APIをexportするが、通常画面から使う本番UIは実装しない。

## Scope（本PRでやること）

- 問題バンクの模試要件監査（機械的）
- Mock Exam v1 blueprint（定数＋validation）
- 60問の出題エンジン（pure・random注入）
- ドメイン配分16／11／12／12／9の保証
- 出題順の確定（resume後も不変）
- セッション状態遷移（回答／見直し／カーソル／提出／時間切れ）
- 120分の壁時計ベースのタイマー計算
- 採点と集計（domain／difficulty／skill）
- content revision互換性の検出
- v2 → v3 storage migration＋strict parser
- pure unit tests / content validation
- Task 8B向けAPI contract

## Non-goals（本PRでやらないこと）

Mock Examのbottom navigation、カウントダウン表示、60問回答画面、question palette、
submit modal、result screen、readiness score、pass/fail表示、analytics、backend、
authentication。**公式の「6応用シナリオから4つ」選択も本PRでは非対応**（後述）。

## 問題バンク監査

`src/content/questions.ts` を機械的に集計した結果（監査日 2026-07-22）。

| 項目 | 値 |
| --- | --- |
| 全問題数 | **38** |
| Domain別 | d1:8 / d2:9 / d3:8 / d4:7 / d5:6 |
| difficulty別 | foundation:8 / application:21 / analysis:9 |
| format別 | single:26 / multiple:12 |
| scenario / standalone | 17 / 21 |
| 重複ID | なし |
| source欠落 / verifiedAt欠落 / revision欠落 | 0 / 0 / 0 |
| revision値 | すべて1 |

skill別: agent-loop:1, orchestration:7, context-management:7, workflow-enforcement:7,
human-oversight:3, tool-design:6, failure-handling:7, mcp-integration:5,
claude-code-configuration:7, claude-code-workflow:1, prompt-design:1, evaluation:2,
structured-output:7, throughput-and-cost:3.

### 60問配分を満たせるか → **満たせない（大量不足）**

| Domain | 必要 | 現状 | 判定 |
| --- | --- | --- | --- |
| d1 | 16 | 8 | 8不足 |
| d2 | 11 | 9 | 2不足 |
| d3 | 12 | 8 | 4不足 |
| d4 | 12 | 7 | 5不足 |
| d5 | 9 | 6 | 3不足 |
| **計** | **60** | **38** | **22不足** |

22問（+58%）不足は「大量不足」に該当する。指示に従い、本PRでは
**低品質な問題を大量生成せず**、Mock Exam engineを **fail closed**（不足時は
`insufficient-question-bank` を返す）設計とする。問題バンク拡充は後続タスクへ切り出す。

### Task 8A.1（フォローアップ）— 問題バンク拡充

Mock Exam v1を実際に開始できるようにするには、既存の出典・Task Statement・
content policyに従って高品質な問題を **合計22問**（d1:+8, d2:+2, d3:+4, d4:+5, d5:+3）
追加する必要がある。これは独立したcontent PRとして実施する。engineは追加後、
コード変更なしに `insufficient-question-bank` を返さなくなる。

## Blueprint

`src/lib/mock-exam-blueprint.ts`。定数を1か所に集約し、UI・test・storageで再ハードコードしない。

```
MOCK_EXAM_QUESTION_COUNT     = 60
MOCK_EXAM_DURATION_SECONDS   = 7200  // 120 * 60
MOCK_EXAM_DOMAIN_DISTRIBUTION = { d1:16, d2:11, d3:12, d4:12, d5:9 }
MOCK_EXAM_BLUEPRINT_VERSION  = 1
```

`validateMockExamBlueprint(blueprint, knownDomainIds?)` は構造検証のみ（問題バンク非依存）で
エラー配列を返す。version／questionCount／durationSecondsが正の整数、各domain配分が正の整数、
未知domainを拒否、**配分合計 === questionCount** を検査。

### exact domain distribution（公式配点との対応）

公式配点 D1:27% / D2:18% / D3:20% / D4:20% / D5:15% を整数60問へ割り当てたもの。

| Domain | 公式% | 60問配分 |
| --- | --- | --- |
| D1 | 27% | 16 |
| D2 | 18% | 11 |
| D3 | 20% | 12 |
| D4 | 20% | 12 |
| D5 | 15% | 9 |

合計が60になることをvalidationとunit testの双方で保証。

## Selection algorithm

`createMockExamSession({ questions, blueprint, now, random?, createId })` — pure。

1. blueprint検証（失敗 → `{ ok:false, reason:'invalid-blueprint', errors }`）。
2. 問題をdomainでグループ化。各domainが必要数を満たすか検査。
   - 1つでも不足 → `{ ok:false, reason:'insufficient-question-bank', shortages }`（全不足を列挙、throwしない）。
3. 各domainプールを **id順にソートしてから** seeded shuffle → 必要数を抽出。
4. 抽出結果全体を再度shuffle（domainでまとまらないように）。
5. `questionRefs`（`{ questionId, revision }`）として順序を確定。resume時に再抽選しない。

**random注入**: `random: () => number`（既定Math.random、testはseeded LCG）。
**入力順非依存**: 各domainをid順ソートしてからshuffleするため、同一seedなら
バンクの配列順に関係なく同一の出題になる（unit testで検証）。
**revision保存**: 各refに作成時点のrevisionを保存し、後のcontent変更を検出可能にする。

## State machine

`MockExamStatus = 'in_progress' | 'submitted' | 'expired'`。

`MockExamSession`（active）と `MockExamAttempt`（完了・不変）を別型に分離。
セッションは `answers: Record<questionId, {selectedChoiceIds, answeredAt}>`、
`flaggedQuestionIds`、`currentIndex`、`startedAt/expiresAt/updatedAt/submittedAt?` を持つ。

pure transition（`src/lib/mock-exam.ts`、すべてinput非破壊・no-opは同一参照を返す）:

- `setMockExamAnswer` — 上書き可、重複選択をcanonicalize、空選択で回答削除、
  `validChoiceIds` 指定時は不正choiceを拒否。session外questionは無視。
- `toggleMockExamFlag` — 回答状態を変えずにflag切替。
- `moveMockExamCursor` — 範囲外・非整数を拒否。回答を変えない。
- `submitMockExam` — 明示提出（`now >= expiresAt` なら `expired` として扱い区別）。未回答可。
- `expireMockExamIfNeeded` — `now >= expiresAt` で `expired`。それ以外はno-op。
- `deriveMockExamProgress` — answered/unanswered/flaggedをcontent非依存で導出。

書き込み可能条件は `status === 'in_progress' && now < expiresAt`。
submitted／expired後の回答・flag・cursor・再提出はすべてno-op。

## Timer semantics

- 作成時: `startedAt = now`, `expiresAt = now + durationSeconds`。
- 表示: `deriveMockExamRemainingSeconds(session, now) = max(0, ceil((expiresAt - now)/1000))`。
- `setInterval` の回数を永続化せず、常に `expiresAt - now` から導出。
  → background tab・sleep・reload後も正しく減り、reload後も同じ `expiresAt`。
- submitted／expired後は残り0。負値は0にclamp。
- ISO datetimeで保存。storage parserがinvalid dateを拒否。
- 境界値（開始直後7200 / 1秒前1 / expiry exactly 0 / 1秒後0）をunit testで検証。
- 注入clockで120分待たずにテスト。**時計改変の完全防止はローカル静的アプリでは不可能**であり、
  本設計は不正防止を主張しない（残り時間の正確な導出のみを保証）。

## Grading semantics

`gradeMockExamAttempt(session, questions)` — 完了セッションを現行contentで採点。

- in_progress → `{ ok:false, reason:'not-completed' }`。
- 互換性NG → `{ ok:false, reason:'incompatible-content', issues }`（silent regradしない）。
- OK → `{ ok:true, attempt, result }`。正誤は既存 `isAnswerCorrect()` を再利用（重複実装なし）。

`MockExamResult`:
- `totalQuestions`（=60）, `answeredQuestions`, `correctAnswers`, `rawAccuracy`。
- **rawAccuracyの分母は総問題数（60）**。未回答は不正解として `correctAnswers` に含めない。
- `byDomain` / `byDifficulty` / `bySkill` は correct／answered／total のtally。
- **skillが複数ある問題は各skillにカウント**（skill合計は問題数を超え得る。明記済み）。
- 0除算安全（totalが0なら rawAccuracy=0）。
- 丸めはderive層では行わず生値を返す（表示丸めはTask 8Bのformat層に一元化）。

`MockExamAttempt` にはquestionId・revision・selectedChoiceIds・correct・answeredAtを残し、
Task 9の誤答分析に必要な最小限を保持する（問題オブジェクト全体は複製しない）。

## scaled scoreを推測しない方針

公式合格基準は720／1,000のscaled scoreだが、本アプリは公式scoring algorithmを知らない。
したがって本PR・将来のTask 8Bとも、raw正答率から合格／不合格／720点相当／scaled score／
「72%なら合格」等を **表示・判定・命名しない**。算出してよいのはcorrect count・total count・
raw accuracy・domain／difficulty／skill別集計のみ。型・関数名に `passed`・`scaledScore`・
`readiness` を含めない。

> Task 8B向け注意文: 「この結果は当アプリ独自問題の正答数です。公式試験のscaled scoreや
> 合否を再現するものではありません。」

## official 4-of-6 scenario対応状況 → **非対応（v1）**

公式試験は6応用文脈から4つを扱うとされるが、現在のquestion modelは公式6シナリオとの
完全な対応metadataを持たない。本PRでは `relatedQuestionIds` や問題文からシナリオを推測せず、
Practice ScenarioとOfficial Scenarioを混同しない。**Mock Exam v1は「Domain配分を再現した
60問模試」と定義し、4-of-6 scenario selectionは非対応**とする。将来対応する場合は、明示的な
typed metadataとvalidationを別PRで追加する。

## Storage v3 schema

現状はv2（reviews / quizStats / studyGuideProgress / handsOnProgress）。v3で2フィールド追加。

```
StudyDataV3 = StudyDataV2 shape + {
  version: 3;
  activeMockExam: MockExamSession | null;   // 進行中セッション（なければnull）
  mockExamAttempts: MockExamAttempt[];        // 完了attemptの履歴（なければ[]）
}
```

`parseStudyDataV3` はstrict: 4記録＋2 Mock Examフィールドがすべて必須。`activeMockExam` は
nullか妥当なsession、`mockExamAttempts` は妥当なattemptの配列。Mock Exam stateの1件でも
malformedなら文書全体を拒否（session／attemptを黙って捨てない）。

### migration table

| 入力 | 経路 | 出力 | 備考 |
| --- | --- | --- | --- |
| v1（legacy key） | v1→v2→v3 | v3 | load時のみ現行keyへ書き込み（legacy key保持） |
| v2（現行key） | v2→v3 | v3 | **load時はメモリ内migrationのみ**（読み取りで書き込まない）。次のsaveでv3化 |
| v3（現行key） | そのまま | v3 | migrated=false |
| 未知version | — | null | 上書きせず空として扱う（rollback安全） |

**履歴保持数の制限なし**: `mockExamAttempts` に人為的な件数上限を設けない。将来上限を
設ける場合は容量計算とプロダクト理由をここに追記する。

### key設計の判断

`STORAGE_KEY = 'cca-field-notes:v2'` は「storage generation」を表し、スキーマversionと同義ではない
（既存コメントの方針）。v2→v3はkey据え置きの **スキーマbump** とし、新keyは作らない。
これによりv2をseedする既存E2Eの `STORAGE_KEY` アサーションを壊さず、既存v2 localStorageも消さない。
load時にv2→v3のin-place書き込みを **行わない**（save-first / 読み取りで書き込まない方針を維持）ため、
「画面を見るだけでstorageが書き変わらない」不変条件を保つ。最初の実mutation（save）でv3へ昇格する。

## compatibility policy

`validateMockExamCompatibility(session, questions)` は次を検出し、typed resultを返す。

- questionが存在する / revisionが作成時と一致 / 選択choice IDが現行choicesに存在。

不一致時は current contentでsilent gradingせず、session全体も削除しない。過去attemptの記録は
保持する。Task 8Bは `{ compatible:false, issues }` を受けて「問題内容が更新されたため、この模試は
再開できません」を表示できる。

## Task 8B API contract

Task 8Bは以下のexportのみ利用すればUIを組める（`src/lib/mock-exam.ts` から再export）。

- 定数/型: `MOCK_EXAM_*`, `defaultMockExamBlueprint`, `MockExamBlueprint`, `MockExamSession`,
  `MockExamAttempt`, `MockExamResult`, `MockExamProgress`, `CreateMockExamResult`, `GradeMockExamResult`,
  `MockExamCompatibility` ほか（`src/lib/mock-exam-types.ts`）。
- 生成: `createMockExamSession(...)` → `CreateMockExamResult`。
- 遷移: `setMockExamAnswer`, `toggleMockExamFlag`, `moveMockExamCursor`, `submitMockExam`,
  `expireMockExamIfNeeded`。
- 導出: `deriveMockExamRemainingSeconds`, `deriveMockExamProgress`。
- 採点: `gradeMockExamAttempt`, `deriveMockExamResult`, `validateMockExamCompatibility`。
- 永続化: `activeMockExam` / `mockExamAttempts` は `StudyData` の一部として
  既存の `createStudyStorage` / export / import / reset が自動的に扱う（App側の追加改修は不要）。

すべてclockとrandomを注入する純粋関数なので、Task 8BはUIロジック（描画・入力・タイマー刻み）に集中できる。

## bundle impact

- Mock Exam **engine**（`mock-exam.ts`）はAppからstatic importせず、初期client bundleに入れない
  （engine固有リテラル `insufficient-question-bank` 等がdist/に存在しないことを確認）。
- storage boundaryに必要な最小schema（`mock-exam-storage.ts` validators＋`storage-primitives.ts`）のみ
  eager bundleへ追加。engineは問題バンクを引数で受け取るため、バンクの複製も作らない。
- 初期client JS gzip: **172,243 → 173,154 bytes（+911 bytes）**。増加はv3 storage validatorのみで妥当。

## unit test plan / 結果

新規: `mock-exam-blueprint.test.ts`, `mock-exam.test.ts`, `mock-exam-storage.test.ts`。
更新: `storage-schema.test.ts`, `storage.test.ts`。共有fixture: `mock-exam.fixture.ts`。

カバレッジ: blueprint（合計60／count60／duration7200／invalid domain／negative／count mismatch）、
selection（60問／重複なし／16-11-12-12-9／seeded再現／seed差／pool順非依存／不足明示／59問以下で開始しない／
実バンクはinsufficient）、session（answer保存・上書き・multiple・重複canonicalize・flag・cursor境界・
submitted/expired後変更不可・未回答提出・input immutable）、timer（開始直後／1秒前／expiry exactly／
expiry後／reload相当でexpiresAt不変／interval非依存）、grading（single／multiple／partial／unanswered／
correct count／分母60／domain・difficulty・skill集計／missing question／revision mismatch／missing choice／
pass-fail・scaled scoreなし）、storage（v1→latest／v2→v3／v3 parse／idempotent／既存4記録保持／
active session round-trip／completed attempt round-trip／malformed timestamp／unknown question ref／
duplicate question ref／invalid currentIndex／unknown answer key／invalid selected choice／submittedAt整合／
export・import・reset／future・unknown record preservation）。

結果: `pnpm test` → **16 files / 347 tests pass**（既存275 + 新規72）。

## E2E regression plan / 結果

UIは無いため新規Mock Exam UI E2Eは不要。既存のexport/import/reset UIがv3を扱うため、
`tests/storage.spec.ts` に1本追加（v3 Mock Exam stateをseed → 既存進捗が残る / exportに含まれる /
resetで消える / importで復元）。既存v1移行E2Eの期待値をv3へ更新。`tests/quiz.spec.ts` の
storage key/version アサーションをv3へ更新。高速化構成（`tests/storage.spec.ts`・`tests/fixtures/`・
fast/full・default workers:1）を維持。巨大 `tests/app.spec.ts` は復活させない。

## 実行コマンドと結果

- `pnpm test` → 16 files / **347 tests pass**（既存275 + 新規72）。
- `pnpm build`（astro check含む）→ **0 errors**。
- `pnpm test:no-analytics` → analytics無し確認 pass。
- `pnpm test:e2e:fast` → **46 tests pass**（約2.5分）。
- `pnpm test:e2e` → **88 tests pass**（約194秒）。
- bundle比較 → **+911 bytes gzip**（172,243 → 173,154。v3 storage validatorのみ、engineは非混入）。
- Lighthouse（median of 3, mobile）→ performance **99** / FCP 1099ms / LCP 1821ms / CLS 0.0013。
  全budget（score≥0.9, FCP≤2000, LCP≤3000, CLS≤0.02）を満たす。

## subagent review findings

独立レビューを1件実施。要件13項目のうち12はクリーン、指摘は以下。

- **LOW（修正済み）**: `moveMockExamCursor` が時計を見ておらず、`expiresAt` 通過後
  status未flipの窓でカーソル移動を許していた（`setMockExamAnswer`／`toggleMockExamFlag` は
  `isWritable` で拒否済み）。`isWritable(session, now)` に統一して修正し、pre-flip窓での
  answer／flag／cursorすべての拒否をunit testで固定。
- **情報（対応不要）**: `createMockExamSession` はバンクのquestion id一意性を前提とする。
  これはcontent validationが保証する不変条件のため、live defectではない。

数学的正確性・random再現性・immutability・expiry境界・resume・提出後変更禁止・採点・
scaled score非算出・migration・compatibility・bundle非混入・API・storage validator edgeは
いずれもクリーンと確認。

### 外部レビュー（Request changes）対応

PR #36の外部レビューで、strict parserの整合性の抜け2件（Medium）を指摘され修正した。

1. **完了attemptのexact coverage / revision一致**: `parseMockExamAttempt` に
   「answers.length === questionRefs.length」「各refにexactly one answer」
   「answer.questionRevision === ref.revision」を強制。missing/extra/duplicate answer・
   revision mismatchのnegative testを追加。
2. **時系列上限 / selection–answeredAt対応**: session／attemptのanswer・submission・expiryに
   上限invariantを追加（live: `startedAt <= answeredAt <= updatedAt < expiresAt`、
   submitted session: `submittedAt === updatedAt < expiresAt`、submitted attempt:
   `completedAt < expiresAt`、expired attempt: `completedAt === expiresAt`、
   completed answer: selectionあり⟺answeredAtあり）。対応するnegative testと、
   「engine出力がstrict parserを必ず通過する」contract testを追加。

これらはpure engineが生成する canonical shape と一致するため、engine出力の
round-tripを壊さない（contract testで担保）。unit test件数は 347 → **357**。

## 既知の制約

- 実問題バンクが22問不足のため、Mock Exam v1は現時点で開始不可（engineは
  `insufficient-question-bank` を返す）。Task 8A.1で問題を追加すれば開始可能になる。
- official 4-of-6 scenario selectionは非対応（上記）。
- 時計改変の完全防止はローカル静的アプリでは不可能。
- scaled score／pass-fail／readinessは意図的に非対応。

## PR

- branch: `claude/task-8a-mock-exam-engine-bsqy6w`
- base SHA: `0d9509ddf0103973cd53f1fefd700e1350b6675f`
- PR URL: https://github.com/toshi0607/cca-study-guide/pull/36 （draft）
