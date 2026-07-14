import type { Domain, Objective } from './types';
import { VERIFIED_AT } from './sources';

const objective = (id: string, title: string, titleJa: string, summary: string, mustKnow: string[], sourceIds: string[]): Objective => ({
  id, title, titleJa, summary, mustKnow, sourceIds: ['exam-guide', ...sourceIds], verifiedAt: VERIFIED_AT,
});

export const domains: Domain[] = [
  {
    id: 'd1', number: 1, title: 'Agentic Architecture & Orchestration', titleJa: 'エージェント設計とオーケストレーション', weight: 27,
    summary: 'ツール実行ループ、委譲、状態管理を組み合わせ、止まり方まで説明できる設計を目指します。',
    objectives: [
      objective('1.1', 'Agentic loops', 'エージェントループ', '応答の停止理由に従って、ツール実行と次のモデル呼び出しを安全につなぐ。', ['stop_reason を分岐条件にする', 'tool_result を会話履歴へ正しい順序で返す'], ['stop-reasons', 'tool-use']),
      objective('1.2', 'Multi-agent orchestration', 'マルチエージェント連携', '中央調整、引き継ぎ、並列化を依存関係と統合責任に合わせて選ぶ。', ['独立タスクだけを並列化する', '最終統合の所有者を明示する'], ['sdk-features', 'subagents']),
      objective('1.3', 'Subagent invocation and context', 'サブエージェントの起動と文脈', '子エージェントに必要十分な入力、出力形式、終了条件を渡す。', ['親の文脈を暗黙に期待しない', 'Exam GuideのTask表記と現行DocsのAgent表記を区別する'], ['subagents']),
      objective('1.4', 'Workflow enforcement and handoffs', 'ワークフロー強制と引き継ぎ', '必須の業務ルールは文章によるお願いではなく、決定的な制御点で守る。', ['推奨と強制を区別する', '引き継ぎ時の必須データを構造化する'], ['hooks', 'sdk-features']),
      objective('1.5', 'SDK hooks and lifecycle triggers', 'SDKフックとライフサイクル', '処理の前後に観測・検証・遮断を差し込むフックの責任範囲を理解する。', ['適切なイベントを選ぶ', '終了コードと返却形式を確認する'], ['hooks']),
      objective('1.6', 'Fixed vs dynamic task decomposition', '固定・動的なタスク分解', '予測可能な工程と、実行時に発見される工程を使い分けて分解する。', ['既知の手順は固定フローにする', '探索結果に依存する分岐は動的にする'], ['subagents', 'sdk-features']),
      objective('1.7', 'Session state, resume and fork', 'セッション状態・再開・分岐', '継続、再開、別案の分岐で、どの履歴と識別子を引き継ぐかを設計する。', ['重要な状態を会話だけに埋めない', '再開と分岐の目的を区別する'], ['sessions']),
    ],
  },
  {
    id: 'd2', number: 2, title: 'Tool Design & MCP Integration', titleJa: 'ツール設計とMCP統合', weight: 18,
    summary: 'モデルが選びやすく、呼び間違えにくく、失敗から回復できるツール境界を設計します。',
    objectives: [
      objective('2.1', 'Effective tool interfaces and boundaries', '有効なツール境界', '名前、説明、入力スキーマを、モデルが選択判断に使える契約として設計する。', ['曖昧な万能ツールを避ける', '入力制約と利用境界を明記する'], ['tool-use', 'mcp-tools']),
      objective('2.2', 'Structured tool and MCP errors', '構造化されたツールエラー', '失敗の種類、再試行可否、次の行動に必要な情報を機械可読で返す。', ['一時障害と恒久障害を分ける', '秘密や内部詳細を漏らさない'], ['mcp-tools', 'tool-use']),
      objective('2.3', 'Tool distribution, count and choice', 'ツールの配分・数・選択', '責任と利用場面でツールをまとめ、不要な選択肢を同時に見せない。', ['専門エージェントへの配分を検討する', '分割し過ぎによる往復も評価する'], ['sdk-features', 'tool-use']),
      objective('2.4', 'MCP server integration and scope', 'MCPサーバー統合とスコープ', 'MCPの接続設定、公開範囲、資格情報の境界を環境ごとに管理する。', ['秘密情報を設定ファイルへ直書きしない', 'ユーザー・プロジェクト等のスコープを選ぶ'], ['mcp-tools', 'code-mcp']),
      objective('2.5', 'Built-in tool responsibilities', '組み込みツールの責任', '読取、検索、編集、コマンド実行の役割とリスクに応じて道具を選ぶ。', ['探索は狭い検索から始める', '変更前に対象を読み、変更後に検証する'], ['code-how']),
    ],
  },
  {
    id: 'd3', number: 3, title: 'Claude Code Configuration & Workflows', titleJa: 'Claude Code設定とワークフロー', weight: 20,
    summary: '指示の配置、再利用可能な手順、非対話実行をチームで保守できる形にします。',
    objectives: [
      objective('3.1', 'CLAUDE.md hierarchy', 'CLAUDE.mdの階層', '共有指示、個人指示、ディレクトリ固有の指示を適切な層へ置く。', ['適用範囲と優先関係を確認する', '共有すべき指示はバージョン管理する'], ['code-memory']),
      objective('3.2', 'Commands vs Skills', 'コマンドとSkills', '明示的に呼ぶ定型操作と、必要に応じて利用される再利用知識を使い分ける。', ['利用者が起動する操作を見分ける', '説明文と参照資源を小さく保つ'], ['skills', 'code-features']),
      objective('3.3', 'Path-specific rules and globs', 'パス固有ルールとglob', 'ファイル種別や場所にだけ必要な指示をglobで限定する。', ['globが意図したファイルに一致するか検証する', '全体指示との重複を避ける'], ['code-memory']),
      objective('3.4', 'Plan mode and exploration', 'Plan modeと探索', '大きな変更では実装前に依存関係、変更範囲、検証方法を整理する。', ['読取と設計の段階を分ける', '単純作業には過剰適用しない'], ['code-best-practices']),
      objective('3.5', 'Iterative refinement and examples', '反復改善と例示', '初稿、評価、修正の短いループで、具体例を基準に品質を上げる。', ['評価基準を先に決める', '修正ごとに回帰を確認する'], ['code-best-practices', 'prompting-best']),
      objective('3.6', 'CI/CD and non-interactive integration', 'CI/CD・非対話統合', '人の入力を待たない実行方式で、権限、終了状態、出力形式を固定する。', ['最小権限で動かす', '失敗をCIが判定できる形で返す'], ['headless']),
    ],
  },
  {
    id: 'd4', number: 4, title: 'Prompt Engineering & Structured Output', titleJa: 'プロンプト設計と構造化出力', weight: 20,
    summary: '評価基準とスキーマを明示し、検証可能な出力へ段階的に導きます。',
    objectives: [
      objective('4.1', 'Explicit review criteria', '明示的なレビュー基準', '良い結果の条件を観察可能な項目に分解し、評価のぶれを減らす。', ['曖昧な「高品質」を具体化する', '合否または尺度を定義する'], ['evals']),
      objective('4.2', 'Few-shot examples', 'Few-shotと例示', '望む入出力の対応例で、曖昧な規則や境界例を具体化する。', ['代表例と境界例を選ぶ', '例と指示が矛盾しないようにする'], ['prompting-best']),
      objective('4.3', 'Structured outputs and schemas', '構造化出力とスキーマ', 'JSON Schemaにより型と必須項目を定義し、後段が扱える形を保証する。', ['構文保証と意味妥当性を区別する', '過度に複雑なスキーマを避ける'], ['structured']),
      objective('4.4', 'Validation and retry', '検証と再試行', '出力を検証し、具体的な不一致をフィードバックして限定的に再試行する。', ['失敗箇所を明示して返す', '上限とフォールバックを設ける'], ['structured', 'evals']),
      objective('4.5', 'Batch processing', 'バッチ処理', '即時応答が不要な大量処理を非同期化し、個別結果と失敗を追跡する。', ['待ち時間の許容可否で選ぶ', 'リクエストIDと結果を対応付ける'], ['batch']),
      objective('4.6', 'Multi-pass review', '複数パスのレビュー', '生成、局所評価、全体統合を分け、各パスの役割を明確にする。', ['一度の巨大プロンプトに詰め込まない', '統合時に全体整合を再確認する'], ['evals', 'subagents']),
    ],
  },
  {
    id: 'd5', number: 5, title: 'Context Management & Reliability', titleJa: 'コンテキスト管理と信頼性', weight: 15,
    summary: '長い処理でも重要事実、失敗理由、根拠を失わず、人に渡す境界を決めます。',
    objectives: [
      objective('5.1', 'Preserve context', 'コンテキストの保持', '長い履歴を圧縮しつつ、識別子や決定事項などの重要事実を別に保持する。', ['要約で失ってはいけない事実を分離する', '再開に必要な状態を明示する'], ['context-windows', 'context-editing']),
      objective('5.2', 'Escalation and ambiguity', 'エスカレーションと曖昧さ', '権限不足、高リスク、解消不能な曖昧さを、人へ渡す明確な条件にする。', ['自己申告の自信だけに頼らない', '必要な文脈を添えて引き継ぐ'], ['user-input']),
      objective('5.3', 'Error propagation and recovery', 'エラー伝播と回復', '下流の失敗を分類し、試行内容と部分結果を上流が判断できる形で返す。', ['元の原因を失わない', '再試行可能性と代替案を示す'], ['tool-use', 'mcp-tools']),
      objective('5.4', 'Codebase exploration', 'コードベース探索', '検索、読取、依存関係の追跡を狭い仮説から広げ、変更前に構造を把握する。', ['ファイル名検索と内容検索を使い分ける', '推測を実ファイルで検証する'], ['large-codebases']),
      objective('5.5', 'Human review', '人によるレビュー', '重大度、カテゴリ、例外条件に応じて人の確認を組み込み、結果を測る。', ['全体平均だけでなく分類別に見る', 'レビュー結果を改善ループへ戻す'], ['evals', 'user-input']),
      objective('5.6', 'Provenance and source attribution', '来歴と出典対応', '主張と根拠の対応を生成から統合まで保持し、後から追跡できるようにする。', ['出典IDを構造化して運ぶ', '統合時に出典対応を落とさない'], ['structured']),
    ],
  },
];
