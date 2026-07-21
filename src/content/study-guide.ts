import type { LocalizedText, StudyGuideSection } from './types';

const localized = <T>(ja: T, en: T): LocalizedText<T> => ({ ja, en });

// Study-guide sections were verified against the cited official pages and the
// task statement list in Exam Guide v1.0 on this date.
export const STUDY_GUIDE_VERIFIED_AT = '2026-07-21';

// A reading path over the exam blueprint: which task statements to study in
// which order, with the existing cards and questions to practice afterwards.
// Sections are added incrementally; the model and validation are complete, and
// a later PR renders them. Copy is independently authored from public docs.
export const studyGuideSections: StudyGuideSection[] = [
  {
    id: 'sg-agentic-loop',
    recommendedOrder: 1,
    title: localized('エージェントループから始める', 'Start with the agentic loop'),
    summary: localized(
      '最も配点の大きいドメイン1の土台として、停止理由に基づくループ制御と、分解・委譲の判断軸を先に固めます。',
      'Build the foundation of the heaviest domain first: loop control driven by stop reasons, plus the criteria for decomposing and delegating work.',
    ),
    domainIds: ['d1'],
    taskStatementIds: ['1.1', '1.2', '1.3', '1.6'],
    learningObjectives: localized(
      [
        'stop_reason を分岐条件にしたループを説明できる',
        '独立したタスクだけを並列化し、統合の担当を決められる',
        'サブエージェントへ渡す入力・出力形式・終了条件を設計できる',
      ],
      [
        'Explain a loop whose branching condition is stop_reason',
        'Parallelize only independent tasks and assign ownership of integration',
        'Design the input, output format, and stopping condition given to a subagent',
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
    relatedCardIds: ['d1-loop-stop', 'd1-orchestration', 'd1-task-agent', 'd1-subagent-input'],
    relatedQuestionIds: ['q-d1-loop-continue', 'q-d1-fanout', 'q-d1-subagent-input'],
    sourceIds: ['exam-guide', 'stop-reasons', 'tool-use', 'subagents'],
    verifiedAt: STUDY_GUIDE_VERIFIED_AT,
  },
  {
    id: 'sg-tool-and-mcp',
    recommendedOrder: 2,
    title: localized('ツール契約とMCPの境界', 'Tool contracts and MCP boundaries'),
    summary: localized(
      'ループが動くようになったら、モデルが選び間違えないツール定義と、失敗と資格情報の扱いへ進みます。',
      'Once the loop runs, move on to tool definitions the model cannot misselect, and to how failures and credentials are handled.',
    ),
    domainIds: ['d2'],
    taskStatementIds: ['2.1', '2.2', '2.3', '2.4'],
    learningObjectives: localized(
      [
        'ツールの名前・説明・入力スキーマを選択のための契約として書ける',
        '一時障害と恒久障害を区別した構造化エラーを返せる',
        '設定スコープと資格情報の置き場所を環境ごとに選べる',
      ],
      [
        'Write tool names, descriptions, and input schemas as a contract for selection',
        'Return structured errors that separate transient from permanent failures',
        'Choose the configuration scope and credential location for each environment',
      ],
    ),
    keyPoints: localized(
      [
        '内部APIをそのまま1対1でツール化すると選択の曖昧さが増える',
        'エラーには分類と再試行可能性を含め、秘密や内部詳細は含めない',
        '資格情報は共有される設定ファイルへ直接書かない',
      ],
      [
        'Exposing internal APIs one-to-one as tools increases selection ambiguity',
        'Include the failure category and retryability in errors, never secrets or internals',
        'Do not write credentials directly into configuration files that get shared',
      ],
    ),
    estimatedMinutes: 40,
    relatedCardIds: ['d2-interface', 'd2-errors', 'd2-scope', 'd2-consolidation'],
    relatedQuestionIds: ['q-d2-tool-contract', 'q-d2-transient-error', 'q-d2-mcp-secrets'],
    sourceIds: ['exam-guide', 'tool-use', 'mcp-tools', 'code-mcp'],
    verifiedAt: STUDY_GUIDE_VERIFIED_AT,
  },
  {
    id: 'sg-context-and-handoff',
    recommendedOrder: 3,
    title: localized('長い処理の文脈と引き継ぎ', 'Context and handoff in long-running work'),
    summary: localized(
      'セッションをまたぐ状態管理と、人へ渡す条件をまとめて扱います。ドメイン1の状態管理とドメイン5が重なる領域です。',
      'Cover state that spans sessions together with the conditions for handing control to a person — the overlap between domain 1 state management and domain 5.',
    ),
    domainIds: ['d1', 'd5'],
    taskStatementIds: ['1.7', '5.1', '5.2', '5.3'],
    learningObjectives: localized(
      [
        '再開と分岐で何が引き継がれるかを説明できる',
        '圧縮しても失ってはいけない事実を分離して保持できる',
        'エスカレーション条件を自信の自己申告ではなく規則として定義できる',
      ],
      [
        'Explain what carries over when a session is resumed versus forked',
        'Separate and preserve the facts that compaction must not lose',
        'Define escalation conditions as rules rather than self-reported confidence',
      ],
    ),
    keyPoints: localized(
      [
        '再開は履歴を引き継ぐが、過去のツール実行をやり直すものではない',
        '識別子や確定した決定は会話文の外に構造化して置く',
        '下流の失敗は元の原因と再試行可能性を保ったまま上流へ返す',
      ],
      [
        'Resuming carries the history forward but does not replay past tool runs',
        'Keep identifiers and settled decisions as structured state outside conversation prose',
        'Propagate downstream failures upward with the original cause and retryability intact',
      ],
    ),
    estimatedMinutes: 40,
    relatedCardIds: ['d1-resume-vs-fork', 'd5-context', 'd5-escalate', 'd5-actionable-errors'],
    relatedQuestionIds: ['q-d1-session-state', 'q-d5-summarize', 'q-d5-escalation'],
    sourceIds: ['exam-guide', 'sessions', 'context-editing', 'user-input'],
    verifiedAt: STUDY_GUIDE_VERIFIED_AT,
  },
];
