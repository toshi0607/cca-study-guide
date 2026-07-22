import type { LocalizedText, StudyGuideSection } from './types';

const localized = <T>(ja: T, en: T): LocalizedText<T> => ({ ja, en });

// Sections and their cited public documentation were reviewed on this date.
export const STUDY_GUIDE_VERIFIED_AT = '2026-07-21';

// This is an original recommended order. The source links identify official
// material supporting the technical claims; they do not imply that Anthropic
// prescribes this particular reading sequence.
export const studyGuideSections: StudyGuideSection[] = [
  {
    id: 'sg-agentic-loop',
    revision: 2,
    recommendedOrder: 1,
    title: localized('エージェントループから始める', 'Start with the agentic loop'),
    summary: localized(
      '最も配点の大きいドメイン1の土台として、停止理由に基づく制御、分解、委譲の判断軸を先に固めます。',
      'Build the foundation of the heaviest domain first: stop-reason-driven control, decomposition, and delegation decisions.',
    ),
    domainIds: ['d1'],
    taskStatementIds: ['1.1', '1.2', '1.3', '1.6'],
    learningObjectives: localized(
      [
        'stop_reason を分岐条件にしたループを説明できる',
        '依存関係と統合責任に応じて並列化または逐次処理を選べる',
        'サブエージェントへ必要な入力、出力形式、終了条件を渡せる',
      ],
      [
        'Explain a loop whose branching condition is stop_reason',
        'Choose parallel or sequential work based on dependencies and integration ownership',
        'Give a subagent the necessary input, output format, and stopping condition',
      ],
    ),
    keyPoints: localized(
      [
        'ツール実行の要否は自然文ではなく構造化された停止理由から判断する',
        'tool_result は対応する tool_use と同じ順序で履歴へ戻す',
        '親エージェントの文脈は子へ暗黙には引き継がれない',
      ],
      [
        'Decide whether a tool run is needed from the structured stop reason, not from prose',
        'Return each tool_result to the history in the same order as its tool_use',
        'A parent agent’s context does not carry over to a child implicitly',
      ],
    ),
    estimatedMinutes: 45,
    relatedCardIds: ['d1-loop-stop', 'd1-orchestration', 'd1-task-agent'],
    relatedQuestionIds: ['q-d1-loop-continue', 'q-d1-fanout', 'q-d1-subagent-input'],
    sourceIds: ['exam-guide', 'stop-reasons', 'tool-use', 'subagents'],
    verifiedAt: STUDY_GUIDE_VERIFIED_AT,
  },
  {
    id: 'sg-enforcement-and-state',
    revision: 1,
    recommendedOrder: 2,
    title: localized('強制境界とセッション状態', 'Enforcement boundaries and session state'),
    summary: localized(
      '必須ルールをどこで機械的に守らせるかを決め、継続・再開・分岐で失ってはいけない状態を扱います。',
      'Decide where mandatory rules are mechanically enforced, then handle the state that must survive continuation, resume, and fork.',
    ),
    domainIds: ['d1'],
    taskStatementIds: ['1.4', '1.5', '1.7'],
    learningObjectives: localized(
      [
        '助言と必須ポリシーの強制を区別できる',
        'フックのイベント、返却形式、失敗時の挙動を確認できる',
        'resume と fork の目的に合わせて履歴と識別子を扱える',
      ],
      [
        'Distinguish advice from enforcement of mandatory policy',
        'Check a hook’s event, return format, and failure behavior',
        'Handle history and identifiers according to the purpose of resume versus fork',
      ],
    ),
    keyPoints: localized(
      [
        'プロンプトは判断を導くが、決定的な認可境界にはならない',
        '実行前に遮断できる場所と、観測だけできる場所を分けて考える',
        'fork は会話履歴を分けても、ファイル変更を巻き戻さない',
      ],
      [
        'A prompt guides judgment, but is not a deterministic authorization boundary',
        'Separate locations that can block before execution from those that can only observe',
        'A fork separates conversation history; it does not roll back file edits',
      ],
    ),
    estimatedMinutes: 40,
    relatedCardIds: ['d1-hooks', 'd1-resume-vs-fork'],
    relatedQuestionIds: ['q-d1-enforcement', 'q-d1-hook-timing', 'q-d1-session-state'],
    sourceIds: ['exam-guide', 'hooks', 'sessions'],
    verifiedAt: STUDY_GUIDE_VERIFIED_AT,
  },
  {
    id: 'sg-tool-and-mcp',
    revision: 2,
    recommendedOrder: 3,
    title: localized('ツール契約とMCPの境界', 'Tool contracts and MCP boundaries'),
    summary: localized(
      'モデルが選びやすく、失敗から回復しやすいツール境界と、MCP設定・組み込みツールの責任を学びます。',
      'Learn tool boundaries that are easy to select and recover from, plus MCP configuration and built-in tool responsibilities.',
    ),
    domainIds: ['d2'],
    taskStatementIds: ['2.1', '2.2', '2.3', '2.4', '2.5'],
    learningObjectives: localized(
      [
        'ツールの名前、説明、入力スキーマを選択のための契約として書ける',
        '失敗分類と再試行可否を含む安全な構造化エラーを返せる',
        '設定の共有範囲と資格情報の保管場所を分離できる',
      ],
      [
        'Write tool names, descriptions, and input schemas as a contract for selection',
        'Return safe structured errors with a failure category and retryability',
        'Separate a configuration’s sharing scope from where credentials are stored',
      ],
    ),
    keyPoints: localized(
      [
        '関連操作は責任単位でまとめ、不要な選択肢を同時に見せない',
        'エラーに秘密や内部詳細を含めず、次の行動に必要な情報を返す',
        '読取、検索、編集、実行はリスクと確認方法を変えて扱う',
      ],
      [
        'Group related operations by responsibility and do not present needless choices together',
        'Keep secrets and internals out of errors while returning information needed for the next action',
        'Treat reading, searching, editing, and execution differently according to risk and verification needs',
      ],
    ),
    estimatedMinutes: 55,
    relatedCardIds: ['d2-interface', 'd2-errors', 'd2-consolidation', 'd2-scope', 'd2-builtin-map'],
    relatedQuestionIds: ['q-d2-tool-contract', 'q-d2-transient-error', 'q-d2-tool-overload', 'q-d2-mcp-secrets'],
    sourceIds: ['exam-guide', 'define-tools', 'tool-use', 'mcp-tools', 'code-mcp', 'code-how'],
    verifiedAt: STUDY_GUIDE_VERIFIED_AT,
  },
  {
    id: 'sg-claude-code-foundations',
    revision: 1,
    recommendedOrder: 4,
    title: localized('Claude Codeの設定基盤', 'Claude Code configuration foundations'),
    summary: localized(
      '共有指示、個人指示、パス固有ルール、再利用手順を混同せず、保守できる配置にします。',
      'Place shared instructions, personal instructions, path-specific rules, and reusable procedures without conflating them.',
    ),
    domainIds: ['d3'],
    taskStatementIds: ['3.1', '3.2', '3.3'],
    learningObjectives: localized(
      [
        '指示を共有範囲と優先順位に合う層へ置ける',
        '明示起動する操作と、必要時に読む再利用知識を使い分けられる',
        'glob を使ってルールの適用範囲を検証できる',
      ],
      [
        'Place instructions in the layer that matches their sharing scope and precedence',
        'Distinguish explicitly invoked operations from reusable knowledge loaded when needed',
        'Use a glob and verify the rule’s intended scope',
      ],
    ),
    keyPoints: localized(
      [
        'チーム必須の指示はバージョン管理されたプロジェクト層に置く',
        'パス固有ルールは全体指示の代わりではなく、限定的な補足にする',
        'Skill の説明は、いつ使うかを判断できる情報にする',
      ],
      [
        'Put team-required instructions in a version-controlled project layer',
        'Use path-specific rules as focused additions, not replacements for global instructions',
        'Make a Skill description informative enough to decide when to use it',
      ],
    ),
    estimatedMinutes: 35,
    relatedCardIds: ['d3-memory', 'd3-skills'],
    relatedQuestionIds: ['q-d3-claudemd', 'q-d3-skill', 'q-d3-glob'],
    sourceIds: ['exam-guide', 'code-memory', 'skills'],
    verifiedAt: STUDY_GUIDE_VERIFIED_AT,
  },
  {
    id: 'sg-implementation-and-exploration',
    revision: 1,
    recommendedOrder: 5,
    title: localized('実装・探索・CIの運用', 'Implementation, exploration, and CI operations'),
    summary: localized(
      '大きな変更を計画して検証する習慣、反復改善、非対話CI、狭い仮説からのコード探索を実装作業へ結び付けます。',
      'Connect planning and verification for substantial changes, iterative improvement, non-interactive CI, and codebase exploration from narrow hypotheses.',
    ),
    domainIds: ['d3', 'd5'],
    taskStatementIds: ['3.4', '3.5', '3.6', '5.4'],
    learningObjectives: localized(
      [
        '実装前に依存関係、変更範囲、検証方法を整理できる',
        '評価基準と例を使い、修正ごとに回帰を確かめられる',
        'CIで権限、入出力、終了状態を機械判定可能に固定できる',
      ],
      [
        'Map dependencies, scope, and verification before implementation',
        'Use criteria and examples, checking regressions after each revision',
        'Make CI permissions, inputs, outputs, and exit behavior machine-evaluable',
      ],
    ),
    keyPoints: localized(
      [
        '探索は狭い検索から始め、実ファイルで仮説を確認する',
        '人の承認待ちと広すぎる権限をCIに持ち込まない',
        '計画は大きな変更の不確実性を減らすためのもので、目的ではない',
      ],
      [
        'Start exploration with a narrow search and verify hypotheses against actual files',
        'Do not bring human approval waits or overly broad permissions into CI',
        'Planning reduces uncertainty in substantial changes; it is not an end in itself',
      ],
    ),
    estimatedMinutes: 50,
    relatedCardIds: ['d3-plan-when', 'd3-verifiable-goal', 'd3-ci', 'd5-scoped-reads'],
    relatedQuestionIds: ['q-d3-ci-design'],
    sourceIds: ['exam-guide', 'code-best-practices', 'prompting-best', 'headless', 'large-codebases'],
    verifiedAt: STUDY_GUIDE_VERIFIED_AT,
  },
  {
    id: 'sg-prompt-and-structured-output',
    revision: 1,
    recommendedOrder: 6,
    title: localized('プロンプト設計と構造化出力', 'Prompt engineering and structured output'),
    summary: localized(
      '評価基準、例、スキーマ、検証、再試行、バッチ処理を組み合わせ、後段が扱える出力を設計します。',
      'Combine criteria, examples, schemas, validation, retries, and batch work to design output downstream systems can use.',
    ),
    domainIds: ['d4'],
    taskStatementIds: ['4.1', '4.2', '4.3', '4.4', '4.5'],
    learningObjectives: localized(
      [
        '観察可能な評価基準と境界例をプロンプトへ入れられる',
        '構文保証と意味上の妥当性を区別できる',
        '検証結果を具体的に返し、上限付きの再試行とフォールバックを設計できる',
      ],
      [
        'Add observable criteria and edge cases to a prompt',
        'Distinguish structural guarantees from semantic validity',
        'Return specific validation feedback and design bounded retries with a fallback',
      ],
    ),
    keyPoints: localized(
      [
        '例と評価基準は同じ判断を示すよう整合させる',
        'スキーマが正しくても、内容の正しさは別途確認する',
        '待ち時間を許容できる大量処理は、個別結果を追跡できる形で非同期化する',
      ],
      [
        'Keep examples and evaluation criteria aligned on the same judgment',
        'A valid schema does not by itself establish that content is correct',
        'For high-volume work that can wait, use asynchronous processing that tracks each result',
      ],
    ),
    estimatedMinutes: 55,
    relatedCardIds: ['d4-criteria', 'd4-schema', 'd4-retry', 'd4-batch-shape'],
    relatedQuestionIds: ['q-d4-rubric', 'q-d4-structured-guarantee', 'q-d4-retry-feedback', 'q-d4-batch'],
    sourceIds: ['exam-guide', 'evals', 'prompting-best', 'structured', 'batch'],
    verifiedAt: STUDY_GUIDE_VERIFIED_AT,
  },
  {
    id: 'sg-multipass-context',
    revision: 1,
    recommendedOrder: 7,
    title: localized('複数パスのレビューと文脈保持', 'Multi-pass review and context preservation'),
    summary: localized(
      '生成・局所評価・統合を分け、長い処理でも要約で失えない事実を明示的に残します。',
      'Separate generation, focused evaluation, and integration while explicitly preserving facts that summaries cannot lose.',
    ),
    domainIds: ['d4', 'd5'],
    taskStatementIds: ['4.6', '5.1'],
    learningObjectives: localized(
      [
        '複数パスの各担当と統合責任を明確にできる',
        '要約しても残す識別子、決定、根拠を構造化できる',
      ],
      [
        'Make each multi-pass role and the integration owner explicit',
        'Structure the identifiers, decisions, and evidence that must survive summarization',
      ],
    ),
    keyPoints: localized(
      [
        '一度の巨大な依頼に役割を詰め込まず、局所評価と全体整合を分ける',
        '会話の要約と、再開に必要なアプリケーション状態を混同しない',
      ],
      [
        'Do not pack every role into one giant request; separate focused evaluation from global consistency',
        'Do not conflate a conversation summary with application state needed for resumption',
      ],
    ),
    estimatedMinutes: 35,
    relatedCardIds: ['d4-fresh-reviewer', 'd5-context'],
    relatedQuestionIds: ['q-d5-summarize'],
    sourceIds: ['exam-guide', 'evals', 'context-windows', 'context-editing'],
    verifiedAt: STUDY_GUIDE_VERIFIED_AT,
  },
  {
    id: 'sg-context-and-handoff',
    revision: 2,
    recommendedOrder: 8,
    title: localized('人への引き継ぎと信頼性', 'Human handoff and reliability'),
    summary: localized(
      '曖昧さや高リスクを人へ渡す基準、失敗の伝え方、レビューの測定、主張と根拠の対応をまとめます。',
      'Bring together criteria for human handoff under ambiguity or risk, failure reporting, review measurement, and claim-to-evidence mapping.',
    ),
    domainIds: ['d5'],
    taskStatementIds: ['5.2', '5.3', '5.5', '5.6'],
    learningObjectives: localized(
      [
        '高リスク、権限不足、解消不能な曖昧さを引き継ぎ条件として定義できる',
        '原因、部分結果、再試行可否を失わないエラーを返せる',
        '人のレビュー結果と出典対応を改善に利用できる',
      ],
      [
        'Define high risk, insufficient authority, and unresolved ambiguity as handoff conditions',
        'Return errors that retain the cause, partial result, and retryability',
        'Use human-review results and source mappings to improve the system',
      ],
    ),
    keyPoints: localized(
      [
        'エスカレーションはモデルの自信ではなく、観測できる規則で決める',
        'レビューは平均だけでなく、重大度やカテゴリごとに評価する',
        '主張と出典IDの対応を構造化し、統合後も追跡可能にする',
      ],
      [
        'Base escalation on observable rules, not model confidence alone',
        'Evaluate review by severity and category, not only by an overall average',
        'Structure claim-to-source-ID mappings so they remain traceable after integration',
      ],
    ),
    estimatedMinutes: 45,
    relatedCardIds: ['d5-escalate', 'd5-actionable-errors', 'd5-claim-shape'],
    relatedQuestionIds: ['q-d5-escalation', 'q-d5-provenance'],
    sourceIds: ['exam-guide', 'user-input', 'tool-use', 'evals', 'structured'],
    verifiedAt: STUDY_GUIDE_VERIFIED_AT,
  },
];
