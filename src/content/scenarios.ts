import type { LocalizedText, Scenario } from './types';

const localized = <T>(ja: T, en: T): LocalizedText<T> => ({ ja, en });

// Scenario cases were re-verified against the cited official pages on this date.
export const SCENARIO_VERIFIED_AT = '2026-07-18';

// All cases below are independently authored fiction: the companies, people,
// and situations are invented for this app, grounded only in public official
// documentation. Nothing copies, recalls, or reconstructs live exam scenarios.
export const scenarios: Scenario[] = [
  {
    id: 'sc-mcp-tool-design',
    revision: 1,
    title: localized(
      '物流SaaSのMCPサーバー設計相談',
      'Designing an MCP server for a logistics SaaS',
    ),
    background: localized(
      [
        '架空の物流SaaS企業「北斗ロジスティクス」は、配送管理プラットフォームの機能をAIエージェントから操作できるようにするため、MCPサーバーの開発を始めた。最初の実装では、既存のREST APIの約40エンドポイントを1対1でそのままツール化した。「createShipment」「updateShipmentStatusV2」「listShipmentsByWarehouseId」など、社内APIの命名がそのままツール名になっている。',
        '社内検証では問題が多発した。エージェントは似た名前のツールをしばしば取り違え、日付やIDの引数を誤った形式で渡す。外部の配送業者APIが混雑時間帯にレート制限を返すと、ツールは例外のスタックトレースをそのまま文字列で返し、エージェントは同じ呼び出しを何度も繰り返した。',
        'さらに、チーム展開の段階で設定共有の問題も見つかった。検証用に作った設定ファイルには配送業者APIのトークンが直接書かれており、そのファイルがそのまま社内リポジトリへコミットされていた。プラットフォームチームは、ツール設計と運用の両面を見直すことにした。',
      ],
      [
        'Hokuto Logistics, a fictional logistics SaaS company, has started building an MCP server so AI agents can operate its delivery-management platform. The first implementation exposed roughly forty REST API endpoints as tools one-to-one: internal API names such as “createShipment”, “updateShipmentStatusV2”, and “listShipmentsByWarehouseId” became the tool names unchanged.',
        'Internal testing surfaced many problems. The agent frequently confused similarly named tools and passed dates and IDs in the wrong format. When the external carrier API returned rate-limit errors during busy hours, the tools returned raw exception stack traces as strings, and the agent kept repeating the same call.',
        'Rolling the server out to the wider team exposed a configuration problem as well: a validation config file contained the carrier API token in plain text and had been committed to the internal repository as-is. The platform team decided to rework both the tool design and the operational setup.',
      ],
    ),
    domainIds: ['d2'],
    sourceIds: ['mcp-tools', 'tool-use', 'define-tools', 'code-mcp'],
    verifiedAt: SCENARIO_VERIFIED_AT,
  },
  {
    id: 'sc-support-agents',
    revision: 1,
    title: localized(
      'ECカスタマーサポートのエージェント構成選定',
      'Choosing an agent architecture for e-commerce support',
    ),
    background: localized(
      [
        '架空のEC企業「さくらマーケット」は、問い合わせ対応の一次処理をエージェントに任せる計画を進めている。問い合わせの多くは、注文状況・配送・返金・アカウントの4分類に収まる。返金には社内規定があり、一定額を超える場合や本人確認が済んでいない場合は、必ず人間の承認者に回さなければならない。',
        '現在の試作は、すべての業務ツールを1つのエージェントに与えた単一構成で、注文と配送の照会のような互いに独立した調べ物でも1つずつ順番に実行している。対応が長引いた問い合わせでは会話履歴が肥大化し、初期に確認した注文番号や顧客の希望をエージェントが取り違える事象も報告された。',
        '開発チームは、オーケストレーター型の構成への移行と、エスカレーション条件・長時間セッションの状態管理の再設計を検討している。',
      ],
      [
        'Sakura Market, a fictional e-commerce company, plans to let an agent handle the first pass of customer inquiries. Most inquiries fall into four categories: order status, delivery, refunds, and accounts. Refunds are governed by an internal policy: any case above a set amount, or without completed identity verification, must go to a human approver.',
        'The current prototype is a single agent holding every business tool, and it runs even mutually independent lookups — such as an order check and a delivery check — one at a time in sequence. In long-running cases the conversation history balloons, and the team has seen the agent mix up order numbers and customer preferences that were confirmed early in the conversation.',
        'The development team is now evaluating a move to an orchestrator-style architecture, together with a redesign of the escalation conditions and of state management for long sessions.',
      ],
    ),
    domainIds: ['d1', 'd5'],
    sourceIds: ['subagents', 'sdk-features', 'sessions', 'user-input'],
    verifiedAt: SCENARIO_VERIFIED_AT,
  },
  {
    id: 'sc-code-rollout',
    revision: 1,
    title: localized(
      'フィンテック開発チームへのClaude Code導入',
      'Rolling out Claude Code to a fintech team',
    ),
    background: localized(
      [
        '架空のフィンテック企業「あおぞらペイ」の開発チーム（20名）は、Claude Codeを全員の開発フローに導入することにした。パイロット期間中、各自が口頭やチャットでコーディング規約を毎回プロンプトに貼り付けており、規約の適用は人によってばらばらだった。E2Eテストにだけ適用したい記述規約もあるが、置き場所が決まっていない。',
        'また、リリースノートの下書き作成という定型作業を繰り返し依頼しており、毎回同じ長い手順をプロンプトへ貼っている。手順には参照すべきテンプレートファイルと整形スクリプトが付随する。',
        '社内のチケット管理システムをMCPサーバー経由で全員の環境から使えるようにする計画もあるが、接続設定の配布方法と認証トークンの置き場所が決まっていない。',
        '次の四半期にはCIパイプラインへの組み込みも予定している。CIでは、プルリクエストの静的チェック結果を要約するジョブを毎回自動で実行したい。セキュリティチームからは、CI実行環境に与える権限と実行形態について事前レビューを求められている。',
      ],
      [
        'The 20-person development team at Aozora Pay, a fictional fintech company, has decided to adopt Claude Code across everyone’s workflow. During the pilot, each developer pasted the coding conventions into prompts by hand, so how the conventions were applied varied from person to person. Some writing conventions should apply only to E2E test files, but the team has not decided where to put them.',
        'The team also repeatedly requests the same routine task — drafting release notes — pasting the same long procedure into the prompt every time. The procedure comes with a template file and a formatting script that should be used together.',
        'There is also a plan to make the internal ticket system available from everyone’s environment through an MCP server, but the team has not decided how to distribute the connection settings or where the auth token should live.',
        'Next quarter the team plans to integrate Claude Code into the CI pipeline, running a job on every pull request that summarizes static-check results. The security team has asked for an upfront review of the permissions and execution mode granted to the CI environment.',
      ],
    ),
    domainIds: ['d3', 'd2'],
    sourceIds: ['code-memory', 'skills', 'headless', 'code-best-practices', 'code-mcp'],
    verifiedAt: SCENARIO_VERIFIED_AT,
  },
  {
    id: 'sc-extraction-pipeline',
    revision: 1,
    title: localized(
      '記事アーカイブ抽出パイプラインの信頼性設計',
      'Reliability design for an article-extraction pipeline',
    ),
    background: localized(
      [
        '架空のメディア企業「しののめニュース」は、過去20年分の記事アーカイブから人物・組織・出来事のメタデータを抽出し、検索基盤へ投入するパイプラインを構築している。抽出結果はJSON Schemaを指定したstructured outputsで受け取り、下流のインデクサーがそのまま取り込む。夜間に数万件を処理する計画で、即時応答は不要である。',
        '試験運用では2つの課題が見つかった。第一に、スキーマには適合しているが、発行日が創刊より前になっているなど、内容として成り立たない値が混ざる。検証で1フィールドだけ失敗した際の再試行方法も定まっていない。第二に、長い連載記事の続き物を扱うセッションでは履歴が長くなり、圧縮を導入したところ、初期に確定した記事IDや人物の同定結果が失われる事象が起きた。',
        'また、抽出した各事実には元記事への出典参照を付ける方針だが、現在はレポート末尾に参照一覧を並べているだけで、どの事実がどの記事に基づくのか下流で判別できない。',
      ],
      [
        'Shinonome News, a fictional media company, is building a pipeline that extracts person, organization, and event metadata from a twenty-year article archive and feeds a search platform. Extraction results are received as structured outputs against a specified JSON Schema and ingested directly by the downstream indexer. The plan is to process tens of thousands of items overnight; immediate responses are not required.',
        'Trial runs surfaced two problems. First, some outputs comply with the schema yet contain values that cannot be true — such as publication dates earlier than the paper’s founding — and the team has no agreed retry approach when exactly one field fails validation. Second, sessions handling long serialized articles grow lengthy histories; after introducing compaction, article IDs and person-identification results settled early in the session were lost.',
        'The team also intends to attach source references to every extracted fact, but currently only appends a reference list at the end of each report, so downstream consumers cannot tell which fact rests on which article.',
      ],
    ),
    domainIds: ['d4', 'd5'],
    sourceIds: ['structured', 'batch', 'context-windows', 'context-editing'],
    verifiedAt: SCENARIO_VERIFIED_AT,
  },
];
