import type { LocalizedText, Skill, SkillId } from './types';

const localized = <T>(ja: T, en: T): LocalizedText<T> => ({ ja, en });

// Skills describe the capability a question measures, so later analysis can
// report "which ability is weak" independently of the domain weighting. The
// taxonomy is deliberately coarser than the 30 task statements: each skill
// gathers task statements that fail together in practice, and several skills
// span more than one domain. `SkillId` in `types.ts` is the single definition
// of the allowed IDs; this record must cover every one of them.
export const skillById: Record<SkillId, Skill> = {
  'agent-loop': {
    id: 'agent-loop',
    title: localized('エージェントループ制御', 'Agentic loop control'),
    summary: localized(
      '停止理由に基づくループ継続の判断と、ツール結果を会話履歴へ戻す手順を扱う能力。',
      'Deciding whether to continue the loop from the stop reason, and returning tool results to the conversation history correctly.',
    ),
  },
  orchestration: {
    id: 'orchestration',
    title: localized('分解と委譲の設計', 'Decomposition and delegation'),
    summary: localized(
      'タスク分解、サブエージェントへの委譲、並列化、最終統合の担当を設計する能力。',
      'Decomposing work, delegating to subagents, parallelizing safely, and assigning ownership of final integration.',
    ),
  },
  'workflow-enforcement': {
    id: 'workflow-enforcement',
    title: localized('決定的なワークフロー強制', 'Deterministic workflow enforcement'),
    summary: localized(
      '必須ルールを文章の依頼ではなくフックや権限などの決定的な制御点で守らせる能力。',
      'Enforcing mandatory rules at deterministic control points such as hooks and permissions rather than through prose requests.',
    ),
  },
  'context-management': {
    id: 'context-management',
    title: localized('コンテキストと状態の管理', 'Context and state management'),
    summary: localized(
      '長い履歴の圧縮、再開・分岐、失ってはいけない事実の保持を設計する能力。',
      'Compacting long histories, resuming or forking sessions, and preserving facts that must not be lost.',
    ),
  },
  'tool-design': {
    id: 'tool-design',
    title: localized('ツール境界の設計', 'Tool interface design'),
    summary: localized(
      'モデルが選択と入力生成に使える契約として、ツールの名前、説明、粒度、配分を決める能力。',
      'Choosing tool names, descriptions, granularity, and distribution as a contract the model uses for selection and input generation.',
    ),
  },
  'mcp-integration': {
    id: 'mcp-integration',
    title: localized('MCP統合と設定スコープ', 'MCP integration and configuration scope'),
    summary: localized(
      'MCPサーバーの接続設定、公開範囲、資格情報の置き場所を環境ごとに決める能力。',
      'Deciding MCP connection settings, exposure scope, and where credentials live for each environment.',
    ),
  },
  'failure-handling': {
    id: 'failure-handling',
    title: localized('失敗の分類と回復', 'Failure classification and recovery'),
    summary: localized(
      '失敗を分類して機械可読に返し、再試行、フォールバック、上流への伝播を設計する能力。',
      'Classifying failures into machine-readable results and designing retries, fallbacks, and propagation to the caller.',
    ),
  },
  'claude-code-configuration': {
    id: 'claude-code-configuration',
    title: localized('Claude Codeの設定配置', 'Claude Code configuration layout'),
    summary: localized(
      'CLAUDE.mdの階層、コマンドとSkills、パス固有ルールを適切な層へ配置する能力。',
      'Placing the CLAUDE.md hierarchy, commands and skills, and path-specific rules at the right level.',
    ),
  },
  'claude-code-workflow': {
    id: 'claude-code-workflow',
    title: localized('Claude Codeの作業手順', 'Claude Code working practice'),
    summary: localized(
      '探索、計画、反復改善、組み込みツールの選択といった日常の進め方を選ぶ能力。',
      'Choosing day-to-day practice: exploration, planning, iterative refinement, and selecting built-in tools.',
    ),
  },
  'prompt-design': {
    id: 'prompt-design',
    title: localized('プロンプト設計', 'Prompt design'),
    summary: localized(
      '評価基準の明示、例示の選び方、指示と例の整合により出力を安定させる能力。',
      'Stabilizing output through explicit criteria, well-chosen examples, and consistency between instructions and examples.',
    ),
  },
  'structured-output': {
    id: 'structured-output',
    title: localized('構造化出力と来歴', 'Structured output and provenance'),
    summary: localized(
      'スキーマで出力の型を保証し、意味的な検証と出典対応を後段まで保つ能力。',
      'Guaranteeing output shape with schemas while keeping semantic validation and source attribution intact downstream.',
    ),
  },
  evaluation: {
    id: 'evaluation',
    title: localized('評価と成功基準', 'Evaluation and success criteria'),
    summary: localized(
      '観察可能な成功基準を定義し、分類別に結果を測って改善ループへ戻す能力。',
      'Defining observable success criteria, measuring results by category, and feeding them back into an improvement loop.',
    ),
  },
  'human-oversight': {
    id: 'human-oversight',
    title: localized('人による監督と引き継ぎ', 'Human oversight and handoff'),
    summary: localized(
      'エスカレーション条件、承認の置き場所、引き継ぎに必要な文脈を決める能力。',
      'Deciding escalation conditions, where approvals belong, and what context a handoff must carry.',
    ),
  },
  'throughput-and-cost': {
    id: 'throughput-and-cost',
    title: localized('処理量とコストの選択', 'Throughput and cost trade-offs'),
    summary: localized(
      '即時応答の要否や処理量に応じて、同期・非同期などの実行方式を選ぶ能力。',
      'Choosing an execution mode such as synchronous or asynchronous based on latency needs and volume.',
    ),
  },
};

export const skills: Skill[] = Object.values(skillById);
