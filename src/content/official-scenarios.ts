import type { LocalizedText, OfficialScenarioLearning } from './types';

const localized = <T>(ja: T, en: T): LocalizedText<T> => ({ ja, en });

// The design guidance below was reviewed against the cited official pages on
// this date. It is independent author material: the recommended approaches are
// this app's teaching, not an Anthropic prescription. Sources support the
// underlying technical facts, not the exact order of work this app suggests.
export const OFFICIAL_SCENARIO_LEARNING_VERIFIED_AT = '2026-07-21';

const V = OFFICIAL_SCENARIO_LEARNING_VERIFIED_AT;

// One learning entry per official scenario, exactly once. Identity (title and
// summary) is not repeated here — it lives on the classification axis in
// `scenarios.ts` (`officialScenarioById`), which the UI joins to by id. This
// module carries only the design-judgment layer, and it is imported solely by
// the lazily loaded scenarios view so its long prose never enters the initial
// route bundle.
export const officialScenarioLearnings: OfficialScenarioLearning[] = [
  {
    id: 'customer-support-resolution',
    revision: 1,
    domainIds: ['d1', 'd2', 'd5'],
    taskStatementIds: ['1.1', '1.2', '1.7', '2.1', '2.2', '5.1', '5.2', '5.3'],
    skillIds: ['agent-loop', 'orchestration', 'tool-design', 'failure-handling', 'human-oversight', 'context-management'],
    estimatedMinutes: 25,
    learningObjectives: localized(
      [
        '曖昧な問い合わせを分類し、必要なツール呼び出しと確認手順へ落とし込める',
        '本人確認・承認・エスカレーションを、文章の依頼ではなく判断できる境界として設計できる',
        '長時間セッションで失ってはいけない状態と、失敗・タイムアウト時の振る舞いを設計できる',
      ],
      [
        'Classify an ambiguous request and turn it into the required tool calls and confirmation steps',
        'Design identity checks, approvals, and escalation as decidable boundaries rather than prose requests',
        'Design what state must survive a long session and how the agent behaves on failure or timeout',
      ],
    ),
    requirements: localized(
      [
        '問い合わせは注文・配送・返金・アカウントなど複数分類にまたがり、入力は曖昧で不足しがちである',
        '返金や解約など不可逆・高額の操作には、本人確認と承認の条件が定められている',
        '会話は長時間に及び、初期に確定した注文番号や顧客の希望を後段で正しく参照する必要がある',
        '業務システムはレート制限や一時障害を返すことがあり、部分的にしか完了しない場合がある',
      ],
      [
        'Requests span several categories — order, delivery, refund, account — and the input is ambiguous and often incomplete',
        'Irreversible or high-value actions such as refunds and cancellations have defined identity and approval conditions',
        'Conversations run long, and order numbers and customer preferences fixed early must be referenced correctly later',
        'Backend systems can return rate limits and transient failures, and an action may complete only partially',
      ],
    ),
    decisionPoints: [
      {
        id: 'dp-arch',
        decision: localized(
          '単一エージェントに全ツールを持たせるか、オーケストレーターと専門エージェントに分けるか',
          'Give one agent every tool, or split into an orchestrator with specialized agents',
        ),
        considerations: localized(
          [
            '独立に調べられる照会（注文状況と配送状況など）が同時に多いか',
            'ツール数が多く、モデルが取り違えるリスクが高いか',
            '返金など強い権限を、限定した経路にだけ与えたいか',
          ],
          [
            'Whether many lookups (order status vs delivery status) can be investigated independently at once',
            'Whether the tool count is high enough that the model risks confusing them',
            'Whether strong permissions such as refunds should be granted only on a narrow path',
          ],
        ),
      },
      {
        id: 'dp-escalation',
        decision: localized(
          'どの条件で自動対応を止めて人へ引き継ぐかをどこで判断させるか',
          'Where to decide the conditions that stop automation and hand off to a person',
        ),
        considerations: localized(
          [
            '金額のしきい値や本人確認の未完了など、機械的に判定できる条件か',
            'モデルの自己申告の自信だけに依存していないか',
            '引き継ぎに必要な文脈（確認済み事実、試した操作）を構造化して渡せるか',
          ],
          [
            'Whether the condition — an amount threshold, incomplete identity check — is machine-decidable',
            'Whether it relies only on the model’s self-reported confidence',
            'Whether the handoff carries structured context: confirmed facts and attempted actions',
          ],
        ),
      },
      {
        id: 'dp-state',
        decision: localized(
          '長い会話で重要事実をどこに保持し、履歴の圧縮でどう守るか',
          'Where to keep critical facts across a long conversation and how to protect them from compaction',
        ),
        considerations: localized(
          [
            '注文番号や本人確認の結果を会話履歴だけに埋めていないか',
            '要約や圧縮で失ってはいけない状態を別に保持しているか',
            '再開時に必要な識別子が復元できるか',
          ],
          [
            'Whether order numbers and identity results are buried only in the conversation history',
            'Whether state that must not be lost to summarization is held separately',
            'Whether the identifiers needed to resume can be restored',
          ],
        ),
      },
    ],
    recommendedApproach: localized(
      [
        '照会系ツールと、返金など強い副作用を持つツールを分け、後者は承認と本人確認を通った経路にだけ露出する',
        'エスカレーション条件をしきい値と状態で定義し、自己申告の自信ではなく満たすべき事実で判断する',
        '注文番号・本人確認結果・顧客の希望などの重要事実を会話履歴とは別に保持し、圧縮の影響を受けないようにする',
        'ツール失敗は種類（一時／恒久）と再試行可否を機械可読で返し、部分結果を保ったまま次の行動を選ぶ',
        '返金など副作用のあるツールの再試行は冪等キーで安全にし、応答しないツールは上限付きで待って超過時は人へ引き継ぐ',
      ],
      [
        'Separate read-only lookups from strong side-effecting tools such as refunds, and expose the latter only on a path that has passed approval and identity checks',
        'Define escalation conditions as thresholds and state, deciding on facts that must hold rather than self-reported confidence',
        'Keep critical facts — order number, identity result, customer preference — apart from the conversation history so compaction cannot drop them',
        'Return tool failures with a machine-readable type (transient vs permanent) and retryability, choosing the next action while preserving partial results',
        'Make retries of side-effecting tools such as refunds safe with an idempotency key, and bound the wait on an unresponsive tool, escalating to a person once it is exceeded',
      ],
    ),
    rationale: localized(
      [
        '強い権限を限定経路に置くと、誤ったツール選択が不可逆な操作へ直結しにくくなる',
        '機械的なエスカレーション条件は、モデルが自信過剰なときでも高リスク操作を人の承認へ確実に回せる',
        '重要事実を履歴外に保持すると、長い会話や圧縮を経ても同定と参照が壊れない',
      ],
      [
        'Placing strong permissions on a narrow path keeps a wrong tool choice from leading straight to an irreversible action',
        'A machine-checked escalation condition still routes high-risk actions to human approval even when the model is overconfident',
        'Keeping critical facts outside the history means identity and references survive a long conversation and compaction',
      ],
    ),
    antiPatterns: [
      {
        id: 'ap-single-superagent',
        mistake: localized(
          '全業務ツールを1つのエージェントに持たせ、独立照会も逐次に実行する',
          'Give one agent every business tool and run even independent lookups sequentially',
        ),
        consequence: localized(
          '似たツールの取り違えと不要な往復が増え、強い権限が常時露出したまま応答が遅くなる',
          'Similar tools get confused, round trips pile up, and strong permissions stay exposed while responses slow down',
        ),
      },
      {
        id: 'ap-confidence-escalation',
        mistake: localized(
          'エスカレーションをモデルの「自信がない」という自己申告にだけ任せる',
          'Leave escalation entirely to the model reporting that it is “not confident”',
        ),
        consequence: localized(
          '自信過剰な誤りが人の確認を素通りし、高額返金などの高リスク操作が無承認で通る',
          'An overconfident mistake bypasses human review, and high-risk actions such as large refunds pass without approval',
        ),
      },
      {
        id: 'ap-history-state',
        mistake: localized(
          '注文番号や本人確認結果を会話履歴だけに置き、圧縮に任せる',
          'Store order numbers and identity results only in the conversation history and let compaction manage them',
        ),
        consequence: localized(
          '長い対応で初期の事実が要約に飲まれ、別人の注文を操作するなどの取り違えが起きる',
          'In long sessions the early facts get swallowed by the summary, causing mix-ups such as acting on another person’s order',
        ),
      },
      {
        id: 'ap-nonidempotent-retry',
        mistake: localized(
          '返金など副作用のあるツールを、冪等キーなしで一時失敗後にそのまま再試行する',
          'Retry a side-effecting tool such as a refund after a transient failure with no idempotency key',
        ),
        consequence: localized(
          '一部完了していた処理が重複し、二重返金のような不可逆な操作が起きる',
          'A partially completed action is duplicated, causing an irreversible operation such as a double refund',
        ),
      },
    ],
    tradeoffs: [
      {
        id: 'to-orchestration-cost',
        condition: localized(
          '問い合わせの多くが単純な単一照会で、同時並行の調べ物が少ない場合',
          'When most requests are simple single lookups with little concurrent investigation',
        ),
        shift: localized(
          'オーケストレーション分割の利点は薄れ、往復とコストが増えるため単一構成のほうが妥当になりうる',
          'The benefit of splitting into an orchestrator fades and adds round trips and cost, so a single agent can be the better choice',
        ),
      },
      {
        id: 'to-escalation-friction',
        condition: localized(
          'エスカレーションのしきい値を過度に低くした場合',
          'When the escalation threshold is set too low',
        ),
        shift: localized(
          '安全側には倒れるが、人的対応が飽和し一次解決率が下がるため、しきい値は運用データで調整する',
          'It errs safe but saturates human staff and lowers first-contact resolution, so the threshold should be tuned with operational data',
        ),
      },
    ],
    relatedPracticeScenarioIds: ['sc-support-agents'],
    relatedHandsOnGuideIds: ['ho-support-agent-escalation'],
    relatedCardIds: ['d1-loop-stop', 'd1-orchestration', 'd2-interface', 'd2-errors', 'd5-escalate', 'd5-context'],
    relatedQuestionIds: ['q-d1-fanout', 'q-d2-transient-error', 'q-d5-escalation', 'q-d1-loop-continue'],
    sourceIds: ['exam-guide', 'user-input', 'sdk-features', 'tool-use', 'stop-reasons'],
    verifiedAt: V,
  },
  {
    id: 'code-generation-claude-code',
    revision: 1,
    domainIds: ['d3', 'd5'],
    taskStatementIds: ['3.1', '3.2', '3.4', '3.6', '5.4', '5.5'],
    skillIds: ['claude-code-configuration', 'claude-code-workflow', 'prompt-design', 'human-oversight'],
    estimatedMinutes: 25,
    learningObjectives: localized(
      [
        'CLAUDE.mdの階層とパス固有ルールで、共有・個人・限定適用の指示を適切な層へ置ける',
        '定型操作をコマンドやSkillsへ切り出し、探索・生成・リファクタリング・デバッグの進め方を選べる',
        '対話実行と非対話実行、権限、人のレビューを残す変更を区別できる',
      ],
      [
        'Place shared, personal, and narrowly scoped instructions at the right level using the CLAUDE.md hierarchy and path-specific rules',
        'Extract routine operations into commands or skills and choose how to explore, generate, refactor, and debug',
        'Distinguish interactive from non-interactive execution, permissions, and the changes that must keep human review',
      ],
    ),
    requirements: localized(
      [
        'チームでコーディング規約を一貫適用したいが、口頭やチャットでの共有ではばらつく',
        '一部の規約はE2Eテストなど特定のファイル種別にだけ適用したい',
        'リリースノート下書きのような定型手順を繰り返し実行し、テンプレートと整形スクリプトを伴う',
        '不慣れなコードベースを安全に探索し、変更前に構造を把握したい',
      ],
      [
        'The team wants coding conventions applied consistently, but verbal or chat sharing produces variance',
        'Some conventions should apply only to specific file types such as E2E tests',
        'Routine procedures like drafting release notes recur and come with a template and a formatting script',
        'Unfamiliar codebases must be explored safely, understanding the structure before changing it',
      ],
    ),
    decisionPoints: [
      {
        id: 'dp-config-layer',
        decision: localized(
          '指示をCLAUDE.mdの共有層・個人層・パス固有ルールのどこに置くか',
          'Which layer to place an instruction on: shared CLAUDE.md, personal, or a path-specific rule',
        ),
        considerations: localized(
          [
            'その指示はチーム全員に必要か、個人の好みか',
            '特定のファイル種別や場所にだけ効かせたいか',
            '共有すべき指示をバージョン管理下に置いているか',
          ],
          [
            'Whether the instruction is needed by the whole team or is a personal preference',
            'Whether it should take effect only for a file type or location',
            'Whether instructions that should be shared are under version control',
          ],
        ),
      },
      {
        id: 'dp-command-vs-skill',
        decision: localized(
          '繰り返す手順をコマンドにするかSkillにするか',
          'Whether to make a recurring procedure a command or a skill',
        ),
        considerations: localized(
          [
            '利用者が明示的に起動する操作か、状況に応じて参照される知識か',
            '付随するテンプレートや参照資源をまとめて配布できるか',
            '説明文と参照資源を小さく保てているか',
          ],
          [
            'Whether the user explicitly invokes it or it is knowledge referenced as needed',
            'Whether the accompanying template and reference resources can be distributed together',
            'Whether descriptions and reference resources are kept focused',
          ],
        ),
      },
      {
        id: 'dp-review-boundary',
        decision: localized(
          '生成結果のどこまでを自動で進め、どこで人のレビューを必須にするか',
          'How far generated results proceed automatically and where human review becomes mandatory',
        ),
        considerations: localized(
          [
            '変更が不可逆か、影響範囲が広いか',
            '非対話実行に与える権限が最小になっているか',
            '重大度やカテゴリでレビュー要否を分けられるか',
          ],
          [
            'Whether the change is irreversible or wide in blast radius',
            'Whether the permissions granted to non-interactive runs are minimal',
            'Whether review can be gated by severity or category',
          ],
        ),
      },
    ],
    recommendedApproach: localized(
      [
        '全員に必要な規約は共有CLAUDE.mdに、種別限定の規約はパス固有ルールに、個人の好みは個人層に置く',
        '繰り返す定型手順はコマンドやSkillへ切り出し、テンプレートと整形スクリプトを一緒に配布する',
        '大きな変更ではまず読取と設計を分け、依存関係と検証方法を把握してから実装する',
        '不可逆・広範囲の変更は人のレビューを残し、非対話実行には最小権限だけを与える',
      ],
      [
        'Put team-wide conventions in shared CLAUDE.md, type-specific ones in path rules, and personal preferences in the personal layer',
        'Extract recurring procedures into commands or skills, distributing the template and formatting script together',
        'For large changes, separate reading and design first, understanding dependencies and verification before implementing',
        'Keep human review for irreversible or wide changes, and grant only least privilege to non-interactive runs',
      ],
    ),
    rationale: localized(
      [
        '指示を適切な層に置くと、適用範囲と優先関係が明確になり、規約のばらつきが減る',
        '手順をコマンドやSkillにすると、貼り付けの再現性とテンプレート整合が保たれる',
        '読取と設計を分けると、変更範囲を把握しないまま実装して回帰を招くことを避けられる',
      ],
      [
        'Placing instructions at the right layer clarifies scope and precedence and reduces convention drift',
        'Turning procedures into commands or skills preserves reproducibility and template consistency instead of ad-hoc pasting',
        'Separating reading from design avoids implementing without understanding the change surface and causing regressions',
      ],
    ),
    antiPatterns: [
      {
        id: 'ap-paste-conventions',
        mistake: localized(
          '規約や手順を毎回プロンプトへ手で貼り付ける',
          'Paste conventions and procedures into the prompt by hand every time',
        ),
        consequence: localized(
          '適用が人によってばらつき、テンプレートや整形手順との不整合が生まれる',
          'Application varies by person and drifts out of sync with the template and formatting steps',
        ),
      },
      {
        id: 'ap-global-everything',
        mistake: localized(
          '特定種別だけに必要な規約を全体指示に書く',
          'Write a convention needed only for one file type into the global instructions',
        ),
        consequence: localized(
          '無関係なファイルにも規約が効いて誤検知や過剰な変更を招き、全体指示が肥大化する',
          'The convention affects unrelated files, causing false positives and over-editing, and the global instructions bloat',
        ),
      },
      {
        id: 'ap-autopilot-merge',
        mistake: localized(
          '生成・リファクタリング結果を人のレビューなしにそのまま反映する',
          'Apply generated or refactored results with no human review',
        ),
        consequence: localized(
          '不可逆・広範囲の誤変更が検出されないまま取り込まれ、後段で高コストの手戻りになる',
          'Irreversible or wide mistakes are merged undetected and become costly rework downstream',
        ),
      },
    ],
    tradeoffs: [
      {
        id: 'to-plan-overhead',
        condition: localized(
          '変更が小さく、場所も影響範囲も明らかな場合',
          'When the change is small and its location and blast radius are obvious',
        ),
        shift: localized(
          '設計フェーズの分離はかえって過剰で、直接実装したほうが速く、過程を過剰適用しないほうがよい',
          'Separating a design phase is then overkill; implementing directly is faster, and the process should not be over-applied',
        ),
      },
      {
        id: 'to-headless-speed',
        condition: localized(
          '非対話実行に広い権限を与えて速度を優先した場合',
          'When broad permissions are granted to non-interactive runs to prioritize speed',
        ),
        shift: localized(
          '速くなるが監査性と安全性が下がるため、権限は最小にし、人のレビュー境界で補う',
          'It gets faster but loses auditability and safety, so keep permissions minimal and compensate with a human review boundary',
        ),
      },
    ],
    relatedPracticeScenarioIds: ['sc-code-rollout'],
    relatedHandsOnGuideIds: [],
    relatedCardIds: ['d3-memory', 'd3-skills', 'd3-plan-when', 'd5-scoped-reads', 'd5-escalate'],
    relatedQuestionIds: ['q-d3-claudemd', 'q-d3-skill', 'q-d3-ci-design', 'q-d5-escalation'],
    sourceIds: ['exam-guide', 'code-memory', 'skills', 'code-best-practices', 'headless'],
    verifiedAt: V,
  },
  {
    id: 'multi-agent-research',
    revision: 1,
    domainIds: ['d1', 'd2', 'd5'],
    taskStatementIds: ['1.2', '1.3', '1.6', '2.3', '5.1', '5.3', '5.5', '5.6'],
    skillIds: ['orchestration', 'context-management', 'failure-handling', 'structured-output', 'human-oversight'],
    estimatedMinutes: 30,
    learningObjectives: localized(
      [
        '調整役と作業役の責務を分け、サブ課題への分解と並列化の可否を判断できる',
        'サブエージェントへ渡す入力・出力形式・終了条件と、文脈の分離を設計できる',
        '各事実から根拠資料へ直接たどれる来歴を保ち、部分失敗と重複作業を扱える',
      ],
      [
        'Separate coordinator and worker responsibilities and judge decomposition into sub-questions and what can parallelize',
        'Design the input, output format, and stopping condition given to subagents, and the isolation of their context',
        'Keep provenance so every fact links directly to a source, and handle partial failure and duplicate work',
      ],
    ),
    requirements: localized(
      [
        '調整役が検索・分析・統合・レポート生成を専門の作業役へ委譲し、出典付きの成果物をまとめる',
        '一部のサブ課題は独立に並列化でき、一部は前段の結果に依存して逐次になる',
        '各事実は1件以上の根拠資料へ直接たどれる必要があり、統合時に対応を落としてはならない',
        '一部の作業役が失敗しても全体を止めず、並行コストには上限を設けたい',
      ],
      [
        'A coordinator delegates search, analysis, synthesis, and report generation to specialized workers and assembles cited deliverables',
        'Some sub-questions parallelize independently while others are sequential, depending on earlier results',
        'Every fact must link directly to at least one source, and the mapping must not be dropped during synthesis',
        'A failing worker must not stop the whole run, and concurrent cost needs a cap',
      ],
    ),
    decisionPoints: [
      {
        id: 'dp-parallelize',
        decision: localized(
          'どのサブ課題を並列化し、どれを逐次に保つか',
          'Which sub-questions to parallelize and which to keep sequential',
        ),
        considerations: localized(
          [
            'そのサブ課題は他の結果に依存せず独立に解けるか',
            '並列化で重複作業や矛盾する結論が生じないか',
            '同時実行数とコストの上限に収まるか',
          ],
          [
            'Whether the sub-question is independent and solvable without other results',
            'Whether parallelizing risks duplicate work or contradictory conclusions',
            'Whether it fits within the concurrency and cost cap',
          ],
        ),
      },
      {
        id: 'dp-worker-contract',
        decision: localized(
          '作業役に何を渡し、何を返させるか（入出力契約と文脈の分離）',
          'What to give a worker and what it must return: the I/O contract and context isolation',
        ),
        considerations: localized(
          [
            '親の文脈を暗黙に期待していないか、必要な入力を明示しているか',
            '出力形式と終了条件が定まっているか',
            '作業役ごとに文脈を分離し、無関係な履歴で汚さないか',
          ],
          [
            'Whether it assumes the parent context implicitly, or states the required input explicitly',
            'Whether the output format and stopping condition are defined',
            'Whether each worker’s context is isolated and not polluted with irrelevant history',
          ],
        ),
      },
      {
        id: 'dp-provenance',
        decision: localized(
          '来歴をどの単位で保持し、統合まで維持するか',
          'At what granularity provenance is kept and maintained through synthesis',
        ),
        considerations: localized(
          [
            '各事実に根拠資料IDを構造化して付けているか（末尾一覧だけにしていないか）',
            '統合時に事実と出典の対応を落としていないか',
            '1つの事実が複数根拠を持つ場合も表現できるか',
          ],
          [
            'Whether each fact carries a structured source ID (not just a list at the end)',
            'Whether synthesis preserves the fact-to-source mapping',
            'Whether a fact backed by multiple sources can be represented',
          ],
        ),
      },
    ],
    recommendedApproach: localized(
      [
        '調整役が分解と統合を所有し、作業役は明示した入力・出力形式・終了条件で独立に動かす',
        '独立なサブ課題だけを並列化し、依存があるものは逐次にして重複作業と矛盾を避ける',
        '各事実に根拠資料IDを構造化して付け、統合を経ても事実から出典へ直接たどれるようにする',
        '一部の作業役が失敗しても部分結果を返し、同時実行数とコストに上限を設ける',
      ],
      [
        'The coordinator owns decomposition and synthesis; workers run independently with explicit input, output format, and stopping conditions',
        'Parallelize only independent sub-questions and keep dependent ones sequential to avoid duplicate work and contradictions',
        'Attach a structured source ID to each fact so a fact still links directly to its source after synthesis',
        'Return partial results even when some workers fail, and cap concurrency and cost',
      ],
    ),
    rationale: localized(
      [
        '独立タスクだけを並列化すると、重複や矛盾を抑えつつ実時間を短縮できる',
        '事実ごとの構造化された来歴は、統合という最も情報が失われやすい段階でも根拠追跡を守る',
        '部分結果を返す設計は、一部の失敗が全体の成果を無に帰すことを防ぐ',
      ],
      [
        'Parallelizing only independent tasks shortens wall-clock time while limiting duplication and contradiction',
        'Per-fact structured provenance protects traceability even at synthesis, the stage most prone to losing information',
        'Returning partial results prevents one failure from nullifying the entire deliverable',
      ],
    ),
    antiPatterns: [
      {
        id: 'ap-provenance-append',
        mistake: localized(
          '来歴をレポート末尾の参照一覧としてまとめて付ける',
          'Attach provenance as a single reference list appended at the end of the report',
        ),
        consequence: localized(
          'どの事実がどの資料に基づくか下流で判別できず、来歴が実質的に失われる',
          'Downstream consumers cannot tell which fact rests on which source, so provenance is effectively lost',
        ),
      },
      {
        id: 'ap-parallel-dependent',
        mistake: localized(
          '前段の結果に依存するサブ課題まで一斉に並列化する',
          'Parallelize even sub-questions that depend on earlier results',
        ),
        consequence: localized(
          '重複作業や矛盾する結論が生じ、統合で辻褄合わせのやり直しが増える',
          'Duplicate work and contradictory conclusions appear, forcing reconciliation rework during synthesis',
        ),
      },
      {
        id: 'ap-implicit-context',
        mistake: localized(
          '作業役が親の文脈を暗黙に引き継いでいると仮定する',
          'Assume a worker implicitly inherits the parent’s context',
        ),
        consequence: localized(
          '必要な入力が欠けたまま作業役が進み、的外れな結果や再実行を招く',
          'The worker proceeds missing required input, producing off-target results and reruns',
        ),
      },
    ],
    tradeoffs: [
      {
        id: 'to-concurrency-cost',
        condition: localized(
          '同時実行数を上げて実時間を優先する場合',
          'When raising concurrency to prioritize wall-clock time',
        ),
        shift: localized(
          '速くなるがコストと重複のリスクが増えるため、上限とサブ課題の独立性で釣り合わせる',
          'It gets faster but raises cost and duplication risk, so balance it with a cap and sub-question independence',
        ),
      },
      {
        id: 'to-synthesis-review',
        condition: localized(
          '成果物が対外的な主張を含む場合',
          'When the deliverable contains outward-facing claims',
        ),
        shift: localized(
          '自動統合だけでなく、来歴を根拠に人のレビューを挟む価値が高まる',
          'The value of adding human review over the synthesis — grounded in provenance — rises beyond automatic synthesis alone',
        ),
      },
    ],
    relatedPracticeScenarioIds: ['sc-support-agents'],
    relatedHandsOnGuideIds: ['ho-multi-agent-research'],
    relatedCardIds: ['d1-orchestration', 'd1-subagent-input', 'd2-tool-context', 'd5-provenance', 'd5-context', 'd5-escalate'],
    relatedQuestionIds: ['q-d1-fanout', 'q-d1-subagent-input', 'q-d5-provenance', 'q-d2-tool-overload'],
    sourceIds: ['exam-guide', 'subagents', 'sdk-features', 'structured', 'context-windows'],
    verifiedAt: V,
  },
  {
    id: 'developer-productivity',
    revision: 1,
    domainIds: ['d1', 'd2', 'd3'],
    taskStatementIds: ['1.6', '2.4', '2.5', '3.1', '3.2', '3.3'],
    skillIds: ['claude-code-configuration', 'claude-code-workflow', 'mcp-integration', 'tool-design', 'orchestration'],
    estimatedMinutes: 25,
    learningObjectives: localized(
      [
        '不慣れなコードベースを組み込みツールで安全に探索できる',
        '組み込みツールとMCPを使い分け、接続設定と資格情報の配布を設計できる',
        '定型作業を固定ワークフローと動的な進め方に分けて自動化できる',
        'チーム共有すべき設定とローカルに留める作業の境界を引ける',
      ],
      [
        'Explore an unfamiliar codebase safely with built-in tools',
        'Choose between built-in tools and MCP, and design connection settings and credential distribution',
        'Automate routine work by splitting it into fixed workflows and dynamic steps',
        'Draw the boundary between team-shared configuration and work that stays local',
      ],
    ),
    requirements: localized(
      [
        'チーム全員が同じ組み込みツールと外部システム連携を使えるようにしたい',
        '社内システムをMCPサーバー経由で利用するが、接続設定の配布方法と認証トークンの置き場所が未定である',
        '繰り返す定型作業を自動化し、Skill化すべき手順を見極めたい',
        '速度を上げつつ、レビュー可能性と安全性を損ないたくない',
      ],
      [
        'The whole team should share the same built-in tools and external-system integrations',
        'Internal systems are used via an MCP server, but how to distribute connection settings and where to store auth tokens is undecided',
        'Recurring routine work should be automated, deciding which procedures deserve to become skills',
        'Speed should increase without sacrificing reviewability and safety',
      ],
    ),
    decisionPoints: [
      {
        id: 'dp-builtin-vs-mcp',
        decision: localized(
          '作業を組み込みツールで済ませるか、MCPサーバー連携を足すか',
          'Whether to accomplish work with built-in tools or add an MCP server integration',
        ),
        considerations: localized(
          [
            '読取・検索・編集・コマンド実行の組み込みツールで足りるか',
            '外部システムの操作が必要で、そのための契約（ツール境界）が要るか',
            '連携を足す運用・認証コストに見合うか',
          ],
          [
            'Whether built-in read, search, edit, and command tools suffice',
            'Whether external-system operations are needed and require a tool contract for them',
            'Whether the operational and auth cost of adding the integration is justified',
          ],
        ),
      },
      {
        id: 'dp-config-distribution',
        decision: localized(
          'MCPの接続設定と資格情報をどのスコープでどう配布するか',
          'At what scope and how to distribute MCP connection settings and credentials',
        ),
        considerations: localized(
          [
            'ユーザー・プロジェクトなどのスコープのどれが適切か',
            '秘密情報を設定ファイルへ直書きしていないか',
            '共有する設定と個人に閉じる設定を分けているか',
          ],
          [
            'Which scope — user, project — is appropriate',
            'Whether secrets are hard-coded into configuration files',
            'Whether shared settings are separated from personal ones',
          ],
        ),
      },
      {
        id: 'dp-automation-shape',
        decision: localized(
          '定型作業の自動化を、手順を固定したワークフローにするか、実行時に手順を発見する動的な進め方にするか',
          'Whether to automate routine work as a fixed-step workflow or as a dynamic approach that discovers steps at runtime',
        ),
        considerations: localized(
          [
            '手順が安定して予測可能か、探索結果に依存して分岐するか',
            '固定フローは再現性が上がるが、想定外の入力に弱くならないか',
            '動的な進め方はレビュー可能性を下げないか',
          ],
          [
            'Whether the steps are stable and predictable or branch depending on exploration results',
            'Whether a fixed workflow raises reproducibility but becomes brittle to unexpected input',
            'Whether a dynamic approach lowers reviewability',
          ],
        ),
      },
      {
        id: 'dp-skill-granularity',
        decision: localized(
          'どの手順をSkill化し、その粒度と命名をどうするか',
          'Which procedures become skills, and their granularity and naming',
        ),
        considerations: localized(
          [
            '繰り返し頻度が高く、手順が安定しているか',
            '粒度が粗すぎ／細かすぎず、名前から用途が分かるか',
            'パス固有ルールで適用範囲を限定できるか',
          ],
          [
            'Whether it recurs often and the procedure is stable',
            'Whether the granularity is neither too coarse nor too fine and the name conveys its purpose',
            'Whether path-specific rules can limit its scope',
          ],
        ),
      },
    ],
    recommendedApproach: localized(
      [
        '探索は狭い検索から広げ、変更前に構造を把握してから組み込みツールで作業する',
        '外部システム操作が必要なときだけMCP連携を足し、ツール境界を契約として設計する',
        '手順が安定した定型作業は固定ワークフローで自動化し、探索結果に依存する部分だけ動的な判断に任せる',
        '接続設定は適切なスコープで共有し、秘密情報は設定ファイルに直書きせず環境変数など外部に置く',
        '頻度が高く安定した手順だけをSkill化し、名前と粒度を用途が分かる形にする',
      ],
      [
        'Explore from a narrow search outward, understanding the structure before working with built-in tools',
        'Add an MCP integration only when external-system operations are needed, designing the tool boundary as a contract',
        'Automate stable routine work with a fixed workflow, leaving only the parts that depend on exploration results to dynamic judgment',
        'Share connection settings at an appropriate scope and keep secrets out of config files, placing them in environment variables or similar',
        'Turn only frequent, stable procedures into skills, with names and granularity that convey their purpose',
      ],
    ),
    rationale: localized(
      [
        '組み込みツールで足りる作業に連携を足さないと、運用と認証の複雑さを増やさずに済む',
        '設定をスコープで分けて秘密を外部化すると、共有と安全性を両立できる',
        '安定した手順だけをSkill化すると、粒度と命名が保守しやすく、探索コストが下がる',
      ],
      [
        'Not adding an integration where built-in tools suffice avoids extra operational and auth complexity',
        'Separating settings by scope and externalizing secrets reconciles sharing with safety',
        'Making only stable procedures into skills keeps granularity and naming maintainable and lowers discovery cost',
      ],
    ),
    antiPatterns: [
      {
        id: 'ap-token-in-config',
        mistake: localized(
          '認証トークンを設定ファイルへ直書きしてリポジトリへコミットする',
          'Hard-code an auth token into a config file and commit it to the repository',
        ),
        consequence: localized(
          '秘密情報が共有範囲に漏れ、失効・ローテーションの手当てが必要になる',
          'The secret leaks into the shared scope and forces revocation and rotation cleanup',
        ),
      },
      {
        id: 'ap-mcp-everything',
        mistake: localized(
          '組み込みツールで足りる作業にもMCP連携を増やす',
          'Add MCP integrations even for work that built-in tools already cover',
        ),
        consequence: localized(
          '選択肢が増えてモデルが迷い、運用・認証の複雑さと往復コストが上がる',
          'The extra choices confuse the model and raise operational, auth, and round-trip cost',
        ),
      },
      {
        id: 'ap-personal-as-shared',
        mistake: localized(
          '個人に閉じるべき設定や作業を共有設定に混ぜる',
          'Mix settings or work that should stay personal into the shared configuration',
        ),
        consequence: localized(
          '共有設定が肥大化し、無関係な指示が全員に効いて予期しない挙動を招く',
          'The shared configuration bloats and irrelevant instructions affect everyone, causing unexpected behavior',
        ),
      },
    ],
    tradeoffs: [
      {
        id: 'to-share-vs-local',
        condition: localized(
          '設定を積極的に共有してチームの一貫性を優先する場合',
          'When aggressively sharing settings to prioritize team consistency',
        ),
        shift: localized(
          '一貫性は上がるが個人の柔軟性が下がるため、共有はチーム必須のものに絞る',
          'Consistency rises but personal flexibility drops, so limit sharing to what the team truly needs',
        ),
      },
      {
        id: 'to-automation-review',
        condition: localized(
          '定型作業を広く自動化して速度を優先する場合',
          'When broadly automating routine work to prioritize speed',
        ),
        shift: localized(
          '速くなるがレビュー可能性が下がるため、変更の重大度に応じて人の確認を残す',
          'It gets faster but reduces reviewability, so keep human checks according to change severity',
        ),
      },
    ],
    relatedPracticeScenarioIds: ['sc-mcp-tool-design', 'sc-code-rollout'],
    relatedHandsOnGuideIds: [],
    relatedCardIds: ['d2-config-scopes', 'd2-builtin-map', 'd3-memory', 'd3-skills', 'd1-fixed-vs-loop'],
    relatedQuestionIds: ['q-d2-mcp-secrets', 'q-d3-skill', 'q-d3-glob', 'q-d1-fanout'],
    sourceIds: ['exam-guide', 'code-mcp', 'skills', 'large-codebases', 'code-memory'],
    verifiedAt: V,
  },
  {
    id: 'claude-code-ci',
    revision: 1,
    domainIds: ['d3', 'd4'],
    taskStatementIds: ['3.1', '3.5', '3.6', '4.1', '4.4', '4.6'],
    skillIds: ['claude-code-workflow', 'workflow-enforcement', 'evaluation', 'human-oversight', 'throughput-and-cost'],
    estimatedMinutes: 30,
    learningObjectives: localized(
      [
        '非対話実行の権限・秘密・ツール許可範囲を最小権限で設計できる',
        '信頼できないPR内容を前提に、誤検知を抑えた実行可能なフィードバックを返せる',
        'fail-open/fail-closed、タイムアウト・再試行・コスト上限、人のマージ判断を設計できる',
      ],
      [
        'Design non-interactive permissions, secrets, and tool allowlists with least privilege',
        'Assume untrusted PR content and return actionable feedback with few false positives',
        'Design fail-open vs fail-closed, timeout, retry, and cost caps, and the human merge decision',
      ],
    ),
    requirements: localized(
      [
        'CIパイプラインでレビューやテスト生成を人の入力を待たずに自動実行する',
        'PRの内容は信頼できない可能性があり、実行環境の権限と秘密を保護する必要がある',
        '誤検知が多いとフィードバックが無視されるため、指摘の基準を明確にしたい',
        '生成テストやレビュー結果の扱いと、最終的なマージ判断の所在を決めたい',
      ],
      [
        'The CI pipeline runs review and test generation automatically without waiting for human input',
        'PR content may be untrusted, so the runtime’s permissions and secrets must be protected',
        'Too many false positives get feedback ignored, so the criteria for a finding must be clear',
        'The handling of generated tests and review results, and where the final merge decision lives, must be decided',
      ],
    ),
    decisionPoints: [
      {
        id: 'dp-ci-permissions',
        decision: localized(
          'CI実行環境にどの権限・秘密・ツール許可を与えるか',
          'What permissions, secrets, and tool allowlist the CI runtime receives',
        ),
        considerations: localized(
          [
            '信頼できないPR内容が権限や秘密に触れられる経路がないか',
            '必要なツールだけを許可し、最小権限にできているか',
            '秘密をログや出力へ漏らさない設計か',
          ],
          [
            'Whether untrusted PR content has any path to permissions or secrets',
            'Whether only the needed tools are allowed, at least privilege',
            'Whether the design keeps secrets out of logs and output',
          ],
        ),
      },
      {
        id: 'dp-false-positives',
        decision: localized(
          '何を指摘とみなすか、誤検知をどの基準で抑えるか',
          'What counts as a finding and by what criteria false positives are suppressed',
        ),
        considerations: localized(
          [
            '良い指摘の条件を観察可能な基準に分解しているか',
            '指摘は実行可能（どこを直すか分かる）か',
            '重大度やカテゴリで扱いを分けているか',
          ],
          [
            'Whether the conditions for a good finding are broken into observable criteria',
            'Whether findings are actionable — they say what to fix',
            'Whether severity or category differentiates handling',
          ],
        ),
      },
      {
        id: 'dp-fail-mode',
        decision: localized(
          'ジョブが失敗・タイムアウトしたときfail-openかfail-closedか',
          'On job failure or timeout, whether to fail-open or fail-closed',
        ),
        considerations: localized(
          [
            'そのチェックはマージの安全性に必須か、参考情報か',
            'タイムアウト・再試行・コスト上限を定めているか',
            '失敗をCIが判定できる形（終了状態・出力形式）で返すか',
          ],
          [
            'Whether the check is essential to merge safety or advisory',
            'Whether timeout, retry, and cost caps are defined',
            'Whether failures are returned in a form CI can evaluate (exit status, output format)',
          ],
        ),
      },
    ],
    recommendedApproach: localized(
      [
        '非対話実行は最小権限で動かし、信頼できないPR内容が秘密や書き込み権限に触れられないようにする',
        '許可するツールを絞り、秘密は環境の安全な仕組みで注入してログや出力に出さない',
        '指摘の基準を観察可能な形に定義し、実行可能で誤検知の少ないフィードバックだけを返す',
        '安全性に必須のチェックはfail-closed、参考情報はfail-openとし、最終マージは人の判断に残す',
      ],
      [
        'Run non-interactive execution at least privilege so untrusted PR content cannot reach secrets or write access',
        'Restrict the allowed tools and inject secrets through the environment’s safe mechanism, keeping them out of logs and output',
        'Define finding criteria observably and return only actionable, low-false-positive feedback',
        'Fail-closed for checks essential to safety and fail-open for advisory ones, keeping the final merge as a human decision',
      ],
    ),
    rationale: localized(
      [
        '最小権限と許可範囲の限定は、信頼できない入力が権限昇格や秘密漏洩に至る経路を塞ぐ',
        '観察可能な指摘基準は誤検知を抑え、フィードバックが無視されるのを防ぐ',
        '人のマージ判断を残すと、自動チェックの誤りが不可逆な取り込みへ直結しない',
      ],
      [
        'Least privilege and a tight allowlist close the paths from untrusted input to privilege escalation or secret leakage',
        'Observable finding criteria suppress false positives and keep feedback from being ignored',
        'Keeping the human merge decision means an automated-check error does not lead straight to an irreversible merge',
      ],
    ),
    antiPatterns: [
      {
        id: 'ap-broad-ci-perms',
        mistake: localized(
          '信頼できないPRのCIジョブに広い権限と書き込み秘密を与える',
          'Grant broad permissions and writable secrets to CI jobs on untrusted PRs',
        ),
        consequence: localized(
          '悪意あるPRが秘密の抽出や権限昇格に悪用でき、供給網リスクになる',
          'A malicious PR can be abused to exfiltrate secrets or escalate privileges, becoming a supply-chain risk',
        ),
      },
      {
        id: 'ap-noisy-findings',
        mistake: localized(
          '基準を曖昧にしたまま大量の指摘を返す',
          'Return a flood of findings with vague criteria',
        ),
        consequence: localized(
          '誤検知が増えてレビューが信頼されず、フィードバック全体が無視される',
          'False positives rise, the review loses trust, and the feedback is ignored wholesale',
        ),
      },
      {
        id: 'ap-auto-merge',
        mistake: localized(
          '自動チェックの合格だけでマージまで自動化し人の判断を外す',
          'Automate all the way to merge on a passing check, removing the human decision',
        ),
        consequence: localized(
          '自動チェックの誤りや見落としが不可逆に取り込まれ、後段で高コストの是正になる',
          'Errors and blind spots in the automated check are merged irreversibly and require costly remediation later',
        ),
      },
    ],
    tradeoffs: [
      {
        id: 'to-fail-mode-tradeoff',
        condition: localized(
          'すべてのチェックをfail-closedにした場合',
          'When every check is made fail-closed',
        ),
        shift: localized(
          '安全側だが一時障害でも開発が止まるため、必須でないチェックはfail-openにして再試行・上限で守る',
          'It errs safe but halts development even on transient faults, so make non-essential checks fail-open and guard with retry and caps',
        ),
      },
      {
        id: 'to-sensitivity',
        condition: localized(
          '指摘の感度を上げて見落としを減らそうとした場合',
          'When raising sensitivity to reduce missed issues',
        ),
        shift: localized(
          '検出は増えるが誤検知も増えるため、重大度で分け、実行可能性の基準で釣り合わせる',
          'Detection rises but so do false positives, so split by severity and balance with an actionability bar',
        ),
      },
    ],
    relatedPracticeScenarioIds: ['sc-code-rollout'],
    relatedHandsOnGuideIds: ['ho-ci-review'],
    relatedCardIds: ['d3-ci', 'd4-criteria', 'd4-retry', 'd3-verifiable-goal', 'd3-memory'],
    relatedQuestionIds: ['q-d3-ci-design', 'q-d4-rubric', 'q-d4-retry-feedback', 'q-d3-claudemd'],
    sourceIds: ['exam-guide', 'headless', 'evals', 'prompting-best', 'hooks'],
    verifiedAt: V,
  },
  {
    id: 'structured-data-extraction',
    revision: 1,
    domainIds: ['d4', 'd5'],
    taskStatementIds: ['4.3', '4.4', '4.5', '5.1', '5.3', '5.5', '5.6'],
    skillIds: ['structured-output', 'evaluation', 'failure-handling', 'context-management', 'throughput-and-cost', 'human-oversight'],
    estimatedMinutes: 30,
    learningObjectives: localized(
      [
        'JSON Schemaによる構文保証と意味的な妥当性検証を区別して設計できる',
        'フィールド単位と文書単位の再試行、バッチ処理と冪等性を設計できる',
        '長い履歴の圧縮で失われる同定結果や来歴を守り、曖昧な入力を人へ回せる',
      ],
      [
        'Distinguish JSON-Schema structural guarantees from semantic validity in the design',
        'Design field-level and document-level retry, batch processing, and idempotency',
        'Protect identifications and provenance from loss during compaction, and route ambiguous input to a person',
      ],
    ),
    requirements: localized(
      [
        '非構造の文書からメタデータを抽出し、JSON Schemaで受けて下流のインデクサーへそのまま渡す',
        'スキーマには適合するが内容として成り立たない値（創刊前の発行日など）が混ざる',
        '夜間に数万件を処理し即時応答は不要だが、個別の失敗と結果を追跡したい',
        '長い連載記事のセッションで圧縮を入れると、初期に確定した記事IDや同定結果が失われる',
      ],
      [
        'Metadata is extracted from unstructured documents, received against a JSON Schema, and passed straight to a downstream indexer',
        'Some values comply with the schema yet cannot be true, such as a publication date before the paper’s founding',
        'Tens of thousands of items run overnight with no need for immediate responses, but each failure and result must be tracked',
        'With compaction in long serialized-article sessions, article IDs and identifications fixed early get lost',
      ],
    ),
    decisionPoints: [
      {
        id: 'dp-syntactic-semantic',
        decision: localized(
          'スキーマ適合の先に、どの意味的検証を足すか',
          'Beyond schema compliance, which semantic checks to add',
        ),
        considerations: localized(
          [
            '構文保証（型・必須）だけでは成り立たない値を弾けないことを理解しているか',
            '日付範囲や参照整合など、意味的に成り立つ条件を定義しているか',
            'スキーマを過度に複雑にしていないか',
          ],
          [
            'Whether it is understood that structural guarantees (types, required fields) cannot reject impossible values',
            'Whether semantically valid conditions such as date ranges and referential integrity are defined',
            'Whether the schema is kept from becoming overly complex',
          ],
        ),
      },
      {
        id: 'dp-retry-granularity',
        decision: localized(
          '検証失敗時にフィールド単位で再試行するか文書単位で再試行するか',
          'On validation failure, whether to retry at field level or document level',
        ),
        considerations: localized(
          [
            '失敗箇所を具体的に特定してフィードバックできるか',
            '再試行の上限とフォールバックを設けているか',
            '再処理が冪等で、二重取り込みを避けられるか',
          ],
          [
            'Whether the point of failure can be identified specifically and fed back',
            'Whether a retry limit and fallback are set',
            'Whether reprocessing is idempotent and avoids double ingestion',
          ],
        ),
      },
      {
        id: 'dp-context-provenance',
        decision: localized(
          '長いセッションで重要事実と来歴をどう保持するか',
          'How to preserve critical facts and provenance across a long session',
        ),
        considerations: localized(
          [
            '記事IDや同定結果を圧縮に飲まれない形で別に保持しているか',
            '各事実に根拠となる元記事への出典を構造化して付けているか',
            '下流契約が求める形と単位で結果を渡せているか',
          ],
          [
            'Whether article IDs and identifications are held separately, safe from compaction',
            'Whether each fact carries a structured source reference to its origin article',
            'Whether results are delivered in the shape and unit the downstream contract requires',
          ],
        ),
      },
    ],
    recommendedApproach: localized(
      [
        'JSON Schemaで構文を保証したうえで、日付範囲や参照整合などの意味的検証を別に足す',
        '検証失敗は具体的な不一致を返してフィールド単位で限定再試行し、上限とフォールバックを設ける',
        '即時応答が不要な大量処理はバッチ化し、リクエストIDと結果を対応付けて冪等に再処理する',
        '記事IDや同定結果を履歴外に保持し、各事実に元記事の出典を構造化して付けて下流へ渡す',
      ],
      [
        'Guarantee structure with JSON Schema, then add semantic checks such as date ranges and referential integrity separately',
        'On validation failure, return the specific mismatch, retry at field level within limits, and set a fallback',
        'Batch high-volume work that needs no immediate response, mapping request IDs to results and reprocessing idempotently',
        'Keep article IDs and identifications outside the history and attach a structured origin-article source to each fact for downstream',
      ],
    ),
    rationale: localized(
      [
        '構文保証は型を守るが値の妥当性は保証しないため、意味的検証を分けて初めて成り立たない値を弾ける',
        'フィールド単位の限定再試行は、文書全体の作り直しより無駄が少なく失敗箇所を直接扱える',
        '重要事実を履歴外に保持し来歴を事実単位で付けると、圧縮やバッチを経ても同定と出典追跡が壊れない',
      ],
      [
        'Structural guarantees keep types but not value validity, so only a separate semantic check can reject impossible values',
        'Field-level retry wastes less than rebuilding the whole document and addresses the exact failure',
        'Holding critical facts outside the history and attaching per-fact provenance keeps identity and traceability intact through compaction and batching',
      ],
    ),
    antiPatterns: [
      {
        id: 'ap-schema-only',
        mistake: localized(
          'JSON Schema適合だけを検証とみなし意味的妥当性を確認しない',
          'Treat JSON-Schema compliance as the whole validation and skip semantic validity',
        ),
        consequence: localized(
          '創刊前の発行日のような成り立たない値が下流へ通り、検索基盤が汚染される',
          'Impossible values such as a pre-founding publication date pass downstream and pollute the search platform',
        ),
      },
      {
        id: 'ap-document-retry',
        mistake: localized(
          '1フィールドの失敗でも常に文書全体を作り直す',
          'Always rebuild the entire document even when a single field failed',
        ),
        consequence: localized(
          '再処理コストが膨らみ、冪等性が無いと二重取り込みや不整合を招く',
          'Reprocessing cost balloons, and without idempotency it causes double ingestion and inconsistency',
        ),
      },
      {
        id: 'ap-provenance-tail',
        mistake: localized(
          '出典を各事実に付けずレポート末尾にまとめる',
          'Append sources at the end of the report instead of on each fact',
        ),
        consequence: localized(
          'どの事実がどの記事に基づくか下流で判別できず、来歴が失われる',
          'Downstream cannot tell which fact rests on which article, and provenance is lost',
        ),
      },
    ],
    tradeoffs: [
      {
        id: 'to-throughput-latency',
        condition: localized(
          '即時応答が不要で処理量が大きい場合',
          'When immediate responses are unnecessary and volume is large',
        ),
        shift: localized(
          '同期処理よりバッチ化が有利になり、遅延を許容する代わりにコストと処理量を最適化できる',
          'Batching beats synchronous processing, trading latency for optimized cost and throughput',
        ),
      },
      {
        id: 'to-ambiguous-review',
        condition: localized(
          '入力が曖昧または検証を繰り返し失敗する場合',
          'When input is ambiguous or repeatedly fails validation',
        ),
        shift: localized(
          '無理な自動確定より人のレビューへ回す価値が高まり、しきい値で自動と人手を分ける',
          'Routing to human review beats forcing an automatic decision, splitting automatic from manual by a threshold',
        ),
      },
    ],
    relatedPracticeScenarioIds: ['sc-extraction-pipeline'],
    relatedHandsOnGuideIds: ['ho-structured-extraction'],
    relatedCardIds: ['d4-schema', 'd4-schema-gaps', 'd4-batch-shape', 'd5-provenance', 'd5-context', 'd5-escalate'],
    relatedQuestionIds: ['q-d4-structured-guarantee', 'q-d4-retry-feedback', 'q-d4-batch', 'q-d5-provenance'],
    sourceIds: ['exam-guide', 'structured', 'batch', 'context-editing', 'user-input'],
    verifiedAt: V,
  },
];

export const officialScenarioLearningById: Record<string, OfficialScenarioLearning> = Object.fromEntries(
  officialScenarioLearnings.map((learning) => [learning.id, learning]),
);
