import type { HandsOnGuide, LocalizedText } from './types';

const localized = <T>(ja: T, en: T): LocalizedText<T> => ({ ja, en });

// Hands-on steps were verified against the cited official pages on this date.
export const HANDS_ON_VERIFIED_AT = '2026-07-22';

// Exercises the learner runs in their own environment. The guide never carries
// credentials: it says where a secret belongs, never what it is. Official
// grounding lives in each guide's linked sources; the recommended order of work
// lives in its steps — a structural separation of documented facts from this
// app's own recommendations, not an inline per-claim annotation.
export const handsOnGuides: HandsOnGuide[] = [
  {
    id: 'ho-support-agent-escalation',
    revision: 1,
    title: localized(
      '複数ツールと人へのエスカレーションを持つエージェント',
      'An agent with multiple tools and human escalation',
    ),
    summary: localized(
      '役割を分けた複数のツールと明確な入力スキーマを持つエージェントを自分の環境で組み、検証エラーと一時的失敗を分類し、条件を満たしたら人へ引き継ぐ経路まで実装します。',
      'Build an agent in your own environment with several role-separated tools and explicit input schemas, classify validation errors and transient failures, and implement a path that hands off to a human when defined conditions are met.',
    ),
    domainIds: ['d1', 'd2', 'd5'],
    taskStatementIds: ['1.1', '2.1', '2.2', '5.2', '5.5'],
    skillIds: ['tool-design', 'agent-loop', 'failure-handling', 'human-oversight'],
    officialScenarioIds: ['customer-support-resolution'],
    learningObjectives: localized(
      [
        'stop_reason を見てループを継続・終了する制御を、ツール結果を履歴へ戻しながら実装できる',
        '複数ツールを役割で分け、モデルが選択と入力生成に使える説明と入力スキーマを設計できる',
        '検証エラー（入力の作り直しで回復可能）と一時的失敗（再試行で回復可能）と回復不能を分類できる',
        '人へのエスカレーション条件を明文化し、必要な文脈を渡して引き継げる',
      ],
      [
        'Implement loop control driven by stop_reason, returning tool results to the history as you go',
        'Separate several tools by role and design descriptions and input schemas the model can use for selection and input generation',
        'Classify validation errors (recoverable by regenerating input), transient failures (recoverable by retry), and unrecoverable failures',
        'State human-escalation conditions explicitly and hand off with the context a person needs',
      ],
    ),
    prerequisites: localized(
      [
        'Claude API を呼び出せる言語環境（公式SDKのある言語が扱いやすい）',
        'tool use（関数呼び出し）と stop_reason の基本を一度読んでいること',
        'JSON を扱えること',
      ],
      [
        'A language environment that can call the Claude API (a language with an official SDK is easiest)',
        'Having read the basics of tool use (function calling) and stop_reason once',
        'Comfort working with JSON',
      ],
    ),
    environment: localized(
      [
        'Claude API キー（環境変数として渡す。コードやリポジトリに書かない）',
        '2〜3個の「偽の業務ツール」を関数として用意できる開発環境（実際の外部システムに接続する必要はない）',
        'ログを確認できる標準出力またはロガー',
      ],
      [
        'A Claude API key (passed as an environment variable; never written into code or the repository)',
        'A dev environment where you can implement 2–3 "fake business tools" as functions (no real external system needed)',
        'Standard output or a logger where you can inspect the run',
      ],
    ),
    estimatedMinutes: 120,
    setup: localized(
      [
        '題材を1つ決める（例: 注文状況の照会・配送状況の照会・返金申請の3ツールを持つサポートエージェント）。',
        '各ツールをローカル関数として実装する。外部接続はモックでよい。返金だけは「一定額を超える／本人確認未完了なら実行せず保留を返す」ルールを内蔵する。',
        'API キーは環境変数から読む。コードにもリポジトリにも書かないことを最初に決めておく。',
      ],
      [
        'Pick one subject (for example, a support agent with three tools: order-status lookup, delivery-status lookup, and refund request).',
        'Implement each tool as a local function; external calls may be mocked. Build one rule into the refund tool only: if the amount exceeds a threshold or identity is unverified, do not execute — return a "hold" result.',
        'Read the API key from an environment variable. Decide up front that it goes in neither the code nor the repository.',
      ],
    ),
    steps: [
      {
        id: 'step-tool-contracts',
        title: localized('ツールを役割で分け、入力スキーマを書く', 'Separate tools by role and write input schemas'),
        instructions: localized(
          [
            '各ツールに、モデルが「いつ使うか」を判断できる説明文を付ける。似た名前で役割が曖昧なツールを避ける。',
            '各ツールの入力を JSON Schema で定義し、必須項目・型・列挙値を明示する。',
            'ツールの粒度を見直す。1つのツールに多機能を詰め込みすぎず、逆に細かすぎて選択を難しくもしない。',
          ],
          [
            'Give each tool a description that lets the model decide when to use it. Avoid similarly named tools with vague roles.',
            'Define each tool’s input with a JSON Schema, making required fields, types, and enums explicit.',
            'Review tool granularity: neither cram many functions into one tool nor split so finely that selection gets hard.',
          ],
        ),
        expectedResult: localized(
          ['各ツールに説明文と入力スキーマがあり、名前だけで役割が区別できる。'],
          ['Every tool has a description and input schema, and roles are distinguishable by name alone.'],
        ),
      },
      {
        id: 'step-loop',
        title: localized('stop_reason 駆動のループを実装する', 'Implement a stop_reason-driven loop'),
        instructions: localized(
          [
            'API 応答の stop_reason を確認し、tool_use なら要求されたツールを実行する。',
            'ツールの実行結果を tool_result として会話履歴へ戻し、次のリクエストを送る。',
            '自然文からの完了推測に頼らず、安全のための反復上限も別に設ける。',
          ],
          [
            'Inspect the response’s stop_reason; when it is tool_use, run the requested tool.',
            'Return the tool’s result as a tool_result in the conversation history, then send the next request.',
            'Do not rely on inferring completion from prose, and add a separate safety cap on iterations.',
          ],
        ),
        expectedResult: localized(
          ['ツールを要求する応答と最終回答を、モデルの自然文ではなく stop_reason で区別できている。'],
          ['You distinguish tool-requesting responses from final answers via stop_reason, not the model’s prose.'],
        ),
      },
      {
        id: 'step-failure-classes',
        title: localized('失敗を分類して機械可読に返す', 'Classify failures and return them machine-readably'),
        instructions: localized(
          [
            'ツールが失敗したとき、例外のスタックトレースをそのまま返さず、種類（検証エラー・一時的失敗・回復不能）を含む構造化した結果を返す。',
            '検証エラーはモデルが入力を作り直せるように、どの項目がなぜ不正かを返す。',
            '一時的失敗（レート制限など）は上限付きの再試行にし、同じ呼び出しを無制限に繰り返さないようにする。',
          ],
          [
            'When a tool fails, do not return a raw exception stack trace; return a structured result that includes the class (validation error, transient failure, unrecoverable).',
            'For validation errors, return which field is invalid and why, so the model can regenerate the input.',
            'For transient failures (such as rate limits), retry with a cap so the same call is not repeated without bound.',
          ],
        ),
        expectedResult: localized(
          ['不正な入力を1つ与えると、モデルが返された理由を読んで入力を修正し、成功まで進む。'],
          ['Given one invalid input, the model reads the returned reason, corrects the input, and proceeds to success.'],
        ),
      },
      {
        id: 'step-escalation',
        title: localized('人へのエスカレーション経路を実装する', 'Implement the human-escalation path'),
        instructions: localized(
          [
            '返金額が閾値を超える、または本人確認が未完了の場合は、ツールが実行せず「人の承認待ち」を返すことを確認する。',
            'エスカレーション時に人が判断するのに必要な文脈（顧客ID・要求内容・保留理由）を1つの構造にまとめて渡す。',
            'エージェントが承認待ちを「失敗」ではなく正常な分岐として扱うようにする。',
          ],
          [
            'Confirm that when the refund amount exceeds the threshold or identity is unverified, the tool does not execute and returns "awaiting human approval".',
            'On escalation, hand off the context a person needs to decide (customer ID, the request, the reason for holding) as one structure.',
            'Make the agent treat "awaiting approval" as a normal branch, not a failure.',
          ],
        ),
        expectedResult: localized(
          ['閾値超えの返金要求を与えると、実行されず承認待ちとして必要文脈付きで止まる。'],
          ['An over-threshold refund request stops as "awaiting approval" with the needed context, without executing.'],
        ),
      },
      {
        id: 'step-least-privilege-observability',
        title: localized('最小権限と観測性を確認する', 'Check least privilege and observability'),
        instructions: localized(
          [
            '各ツールが必要な操作だけを行い、読み取りで足りる箇所に書き込み権限を与えていないか見直す。',
            '1回の実行で、どのツールがどの入力で呼ばれ何を返したかをログから追えるようにする。',
            '故意に1つのツールを失敗させ（failure injection）、分類・再試行・エスカレーションが期待通り動くか観察する。',
          ],
          [
            'Review that each tool performs only the operations it needs, and that you did not grant write access where a read suffices.',
            'Make one run traceable from logs: which tool was called with which input and what it returned.',
            'Deliberately fail one tool (failure injection) and observe that classification, retry, and escalation behave as intended.',
          ],
        ),
        expectedResult: localized(
          ['注入した失敗が、無限リトライではなく分類→再試行上限→必要ならエスカレーションの順で処理される。'],
          ['The injected failure flows through classification → capped retry → escalation if needed, not an infinite retry.'],
        ),
      },
    ],
    deliverables: localized(
      [
        '役割で分かれた2〜3個のツール（入力スキーマ付き）を持つエージェントのコード',
        '失敗分類とエスカレーションを含む1回分の実行ログ',
        'エスカレーション条件を書いた短いメモ',
      ],
      [
        'Agent code with 2–3 role-separated tools that each carry an input schema',
        'One run log that includes failure classification and an escalation',
        'A short note stating the escalation conditions',
      ],
    ),
    verification: localized(
      [
        'stop_reason に基づいてループが継続・終了する',
        '不正入力が構造化エラーとして返り、モデルが入力を作り直して回復する',
        '一時的失敗が上限付き再試行になり、同じ呼び出しを無限に繰り返さない',
        '閾値超えの操作が自動実行されず、必要文脈付きで人へ渡る',
        'ログから1回の実行のツール呼び出しを追える',
      ],
      [
        'The loop continues and stops based on stop_reason',
        'An invalid input returns as a structured error and the model recovers by regenerating input',
        'A transient failure becomes a capped retry and does not repeat the same call forever',
        'An over-threshold operation is not auto-executed and goes to a human with the needed context',
        'You can trace a single run’s tool calls from the logs',
      ],
    ),
    troubleshooting: [
      {
        id: 'tp-similar-tools',
        symptom: localized(
          'モデルが似た名前のツールを取り違える、または引数を誤った形式で渡す。',
          'The model confuses similarly named tools or passes arguments in the wrong format.',
        ),
        isolation: localized(
          'ツールの説明文と入力スキーマを見直す。名前より説明で役割を区別し、列挙値や例をスキーマに加える。',
          'Review the tool descriptions and input schemas: distinguish roles in the description more than the name, and add enums and examples to the schema.',
        ),
      },
      {
        id: 'tp-retry-loop',
        symptom: localized(
          'レート制限などで同じツール呼び出しが延々と繰り返される。',
          'The same tool call repeats endlessly on rate limits or similar errors.',
        ),
        isolation: localized(
          '失敗を分類しているか確認する。一時的失敗に上限付き再試行、回復不能に即終了を割り当てる。',
          'Check that failures are classified: assign capped retry to transient failures and immediate stop to unrecoverable ones.',
        ),
      },
      {
        id: 'tp-escalation-as-error',
        symptom: localized(
          'エスカレーション（承認待ち）がエラー扱いになり、エージェントが再試行してしまう。',
          'Escalation (awaiting approval) is treated as an error and the agent retries it.',
        ),
        isolation: localized(
          '承認待ちを失敗クラスから外し、正常な分岐として扱う。ツール結果の種類にエスカレーションを明示的に加える。',
          'Remove "awaiting approval" from the failure classes and treat it as a normal branch; add escalation explicitly as a tool-result class.',
        ),
      },
    ],
    securityNotes: localized(
      [
        'API キーは環境変数から読み、コード・リポジトリ・ログに出さない。',
        'ツールに与える権限は目的に対して最小にする。読み取りで足りる操作に書き込みや削除の権限を渡さない。',
        '実在の顧客データや本物の資格情報をサンプルに使わない。すべて架空の値にする。',
      ],
      [
        'Read the API key from an environment variable; keep it out of code, the repository, and logs.',
        'Grant each tool the least privilege for its purpose. Do not give write or delete access where a read suffices.',
        'Do not use real customer data or real credentials in the exercise; keep every value fictional.',
      ],
    ),
    costNotes: localized(
      [
        'ループが暴走すると API 呼び出しが積み上がる。反復上限を最初から入れる。',
        '検証は小さな入力と少ない反復で行う。動作確認に大きな会話履歴を何度も回さない。',
      ],
      [
        'A runaway loop stacks up API calls; add an iteration cap from the start.',
        'Verify with small inputs and few iterations; do not repeatedly run large conversation histories just to smoke-test.',
      ],
    ),
    cleanup: localized(
      [
        '検証用に発行した API キーを失効させる。',
        'ログに機微な値が残っていないか確認して削除する。',
      ],
      [
        'Revoke any API key issued only for this exercise.',
        'Check the logs for sensitive values and delete them.',
      ],
    ),
    reflection: localized(
      [
        'このエージェントで、モデルの判断に委ねてよい部分と、決定的な制御（権限・閾値）で守るべき部分の境界はどこか。',
        'エスカレーション条件を1つ増やすとしたら何を選び、必要な文脈は何が増えるか。',
      ],
      [
        'In this agent, where is the boundary between what you can leave to the model’s judgment and what must be guarded by deterministic control (permissions, thresholds)?',
        'If you added one more escalation condition, which would you choose and what extra context would it require?',
      ],
    ),
    relatedCardIds: ['d1-loop-stop', 'd2-interface', 'd2-errors', 'd5-escalate', 'd5-approval-gaps'],
    relatedQuestionIds: ['q-d1-loop-continue', 'q-d2-tool-contract', 'q-d2-transient-error', 'q-d5-escalation', 'q-sc-support-escalation'],
    sourceIds: ['exam-guide', 'tool-use', 'define-tools', 'stop-reasons', 'user-input'],
    verifiedAt: HANDS_ON_VERIFIED_AT,
  },
  {
    id: 'ho-ci-review',
    revision: 2,
    title: localized(
      'Claude Codeのチーム設定とCI差分レビュー',
      'Claude Code team configuration and CI diff review',
    ),
    summary: localized(
      '共有するプロジェクト設定（CLAUDE.md と許可ツール）を整えたうえで、自分のリポジトリで差分レビューを非対話実行し、機械可読な出力・最小権限・シークレット漏洩防止をCIから扱える形にします。',
      'Set up shared project configuration (CLAUDE.md and allowed tools), then run a diff review non-interactively against your own repository and make its output machine-readable, its permissions minimal, and its secret handling safe for CI.',
    ),
    domainIds: ['d3'],
    taskStatementIds: ['3.1', '3.6'],
    skillIds: ['claude-code-configuration', 'claude-code-workflow', 'workflow-enforcement', 'throughput-and-cost'],
    officialScenarioIds: ['claude-code-ci'],
    learningObjectives: localized(
      [
        'チームで共有するプロジェクト指示（CLAUDE.md）と許可ツールの置き場所を説明できる',
        '対話セッションと非対話実行の違いを、権限と出力の観点で説明できる',
        '許可するツールを明示し、必要以上の権限を与えずに実行できる',
        '実行結果をCIが判定できる形式で取り出し、シークレット漏洩を防げる',
      ],
      [
        'Explain where shared project instructions (CLAUDE.md) and allowed tools belong for a team',
        'Explain how non-interactive execution differs from an interactive session in permissions and output',
        'Run with an explicit allowlist of tools instead of broad permissions',
        'Extract the result in a form a CI job can evaluate, and prevent secret leakage',
      ],
    ),
    prerequisites: localized(
      [
        'Claude Codeが実行できる端末と、自分が変更してよいGitリポジトリ',
        'APIキーを環境変数またはCIのシークレットとして渡せること',
        'JSONを扱うコマンド（jqなど）が使えること',
      ],
      [
        'A machine that can run Claude Code and a Git repository you are allowed to modify',
        'A way to pass the API key as an environment variable or CI secret',
        'A command-line JSON tool such as jq',
      ],
    ),
    environment: localized(
      [
        'Claude Code CLI がインストールされた端末',
        'プルリクエストを作れるGitホスティング（GitHub Actions などのCI）',
        'CIのシークレットを設定できる権限',
      ],
      [
        'A machine with the Claude Code CLI installed',
        'Git hosting where you can open pull requests and a CI runner (such as GitHub Actions)',
        'Permission to configure CI secrets',
      ],
    ),
    estimatedMinutes: 90,
    setup: localized(
      [
        '練習用に、自分が自由に変更してよいリポジトリ（またはフォーク）を用意する。',
        'APIキーは環境変数／CIシークレットとして渡すと最初に決める。設定ファイルやリポジトリには書かない。',
      ],
      [
        'Prepare a repository (or a fork) you are free to modify for practice.',
        'Decide up front that the API key is passed as an environment variable / CI secret, never written into a config file or the repository.',
      ],
    ),
    steps: [
      {
        id: 'step-scope',
        title: localized('レビュー対象と観点を決める', 'Decide the review target and criteria'),
        instructions: localized(
          [
            'レビューしたい差分の範囲（例: main との差分）を決める。',
            '「何を指摘してほしいか」を観察可能な基準として1〜3項目書き出す。曖昧な「品質を上げて」は避ける。',
            '各基準は、誤検知が少なく実際に手を動かせる指摘になるよう、具体的な条件で書く。',
          ],
          [
            'Decide which diff to review, for example the difference against main.',
            'Write one to three observable criteria for what should be reported. Avoid vague requests such as “improve quality”.',
            'Write each criterion as a specific condition so findings are actionable and carry few false positives.',
          ],
        ),
        expectedResult: localized(
          ['レビューの合否をあとで人が確認できる、観察可能な基準が文章で書き出せている。'],
          ['You have written observable criteria against which a person can later check the review’s outcome.'],
        ),
      },
      {
        id: 'step-project-config',
        title: localized('共有プロジェクト設定を用意する', 'Prepare shared project configuration'),
        instructions: localized(
          [
            'リポジトリにコミットする CLAUDE.md へ、レビュー観点やコーディング規約などチームで共有したい指示を書く。個人ごとにプロンプトへ貼り直さずに済むようにする。',
            '許可するツールの範囲を、個人の記憶ではなく設定として共有できる形（プロジェクトの設定ファイル）にまとめる。',
            'CLAUDE.md や設定ファイルにシークレットを書かないことを確認する。',
          ],
          [
            'Put instructions you want the team to share — review criteria, coding conventions — into a CLAUDE.md committed to the repository, so nobody re-pastes them into prompts by hand.',
            'Capture the intended allowed-tools scope as shared configuration (a project settings file), not as something each person remembers.',
            'Confirm that neither CLAUDE.md nor the settings file contains any secret.',
          ],
        ),
        expectedResult: localized(
          ['CLAUDE.md と設定がリポジトリにあり、チームの誰が実行しても同じ指示と許可範囲が適用される。'],
          ['CLAUDE.md and settings live in the repository, so anyone on the team runs with the same instructions and allowed scope.'],
        ),
      },
      {
        id: 'step-local-run',
        title: localized('ローカルで非対話実行する', 'Run non-interactively on your machine'),
        instructions: localized(
          [
            'print モード（対話セッションを開かない実行）で差分レビューを実行する。',
            '差分を標準入力から渡すと、ファイル読み取りの権限を与えずに済むことを確認する。',
            '許可するツールを明示し、指定しなかった操作が自動では実行されないことを確認する。',
          ],
          [
            'Run the diff review in print mode (execution that opens no interactive session).',
            'Pipe the diff through standard input and confirm that no file-read permission is needed.',
            'Name the permitted tools explicitly, then confirm that operations you did not list are not run automatically.',
          ],
        ),
        expectedResult: localized(
          ['実行が対話プロンプトを待たずに終了し、許可していない操作が実行されない。'],
          ['The run finishes without waiting for an interactive prompt, and operations you did not allow are not run.'],
        ),
      },
      {
        id: 'step-structured-output',
        title: localized('出力を機械可読にする', 'Make the output machine-readable'),
        instructions: localized(
          [
            'JSON 形式の出力を指定して実行し、結果がメタデータ付きの構造で返ることを確認する。',
            'jqなどで必要なフィールドだけを取り出し、後段のジョブが解釈できる形にする。',
          ],
          [
            'Request JSON output and confirm the result comes back as a structure with metadata.',
            'Extract only the fields you need with jq so the next job can consume them.',
          ],
        ),
        expectedResult: localized(
          ['実行結果からレビュー内容のフィールドをスクリプトで取り出せる。'],
          ['A script can pull the review fields out of the run result.'],
        ),
      },
      {
        id: 'step-ci-job',
        title: localized('CIジョブへ組み込む', 'Wire it into a CI job'),
        instructions: localized(
          [
            'プルリクエストに対して実行されるジョブとして登録する。',
            'APIキーはCIのシークレットとして渡し、設定ファイルやリポジトリへ書かない。',
            '指摘が見つかった場合にジョブの成否をどう扱うか（失敗させるか、コメントのみか）を決めて実装する。',
          ],
          [
            'Register the command as a job that runs on pull requests.',
            'Pass the API key as a CI secret; never write it into a config file or the repository.',
            'Decide and implement what a finding means for the job outcome: failing the job, or reporting only.',
          ],
        ),
        expectedResult: localized(
          ['プルリクエストを開くとジョブが走り、決めた失敗方針どおりに成否が決まる。'],
          ['Opening a pull request triggers the job, and the outcome follows the failure policy you chose.'],
        ),
      },
      {
        id: 'step-review-permissions',
        title: localized('権限とシークレットを見直す', 'Review permissions and secrets'),
        instructions: localized(
          [
            '与えたツール権限が、レビューという目的に対して過剰でないか確認する。',
            'ログや出力にシークレットが混ざっていないか確認する。',
          ],
          [
            'Check that the tool permissions you granted are not broader than the review task requires.',
            'Check that no secret appears in the logs or output.',
          ],
        ),
        expectedResult: localized(
          ['権限がレビュー目的に対して最小で、ログ・出力のどこにもシークレットが出ていない。'],
          ['Permissions are minimal for the review task, and no secret appears anywhere in logs or output.'],
        ),
      },
    ],
    deliverables: localized(
      [
        'リポジトリにコミットされた CLAUDE.md と許可ツール設定',
        '非対話実行のコマンドを含むスクリプトまたはCIジョブ定義',
        '1回分の実行結果（JSON）',
      ],
      [
        'A CLAUDE.md and allowed-tools settings committed to the repository',
        'A script or CI job definition containing the non-interactive command',
        'One captured run result in JSON',
      ],
    ),
    verification: localized(
      [
        '端末で実行し、対話プロンプトを待たずに終了する',
        '許可していないツールの操作が自動実行されない',
        'CIのログからレビュー結果のフィールドを取り出せる',
        'シークレットがリポジトリにもログにも含まれていない',
      ],
      [
        'The command finishes without waiting for an interactive prompt',
        'Operations using tools you did not allow are not run automatically',
        'The review fields can be extracted from the CI log',
        'No secret appears in the repository or the logs',
      ],
    ),
    troubleshooting: [
      {
        id: 'tp-interactive-hang',
        symptom: localized(
          'CIジョブが応答待ちで止まる、またはタイムアウトする。',
          'The CI job hangs waiting for input or times out.',
        ),
        isolation: localized(
          '対話セッションを開いていないか確認する。print モードで実行し、権限確認のプロンプトが出ない構成にする。',
          'Check that no interactive session is opened: run in print mode and configure it so no permission prompt appears.',
        ),
      },
      {
        id: 'tp-secret-in-log',
        symptom: localized(
          'ログや出力にトークンらしき文字列が出ている。',
          'A token-like string appears in the logs or output.',
        ),
        isolation: localized(
          'キーを環境変数／CIシークレットとして渡しているか、設定ファイルに書いていないかを確認する。露出したキーは失効させる。',
          'Confirm the key is passed as an environment variable / CI secret and not written into a config file; revoke any exposed key.',
        ),
      },
      {
        id: 'tp-over-permission',
        symptom: localized(
          'レビューのはずが、意図しない書き込みやコマンド実行が起きる。',
          'A review run performs unintended writes or command execution.',
        ),
        isolation: localized(
          '許可ツールが広すぎる。許可リストをレビューに必要な最小へ絞り、指定外の操作が走らないことを確認する。',
          'The allowed tools are too broad: narrow the allowlist to the minimum the review needs and confirm out-of-list operations do not run.',
        ),
      },
    ],
    securityNotes: localized(
      [
        'APIキーはCIのシークレットとして渡し、設定ファイルやリポジトリに書かない。',
        '許可ツールはレビュー目的に必要な最小にする。書き込みやシェル実行を無条件に許可しない。',
        'プルリクエスト起点のCIでは、外部からのコードがシークレットに触れないよう実行条件を確認する。',
      ],
      [
        'Pass the API key as a CI secret; do not write it into a config file or the repository.',
        'Keep allowed tools minimal for the review purpose; do not allow writes or shell execution unconditionally.',
        'For pull-request-triggered CI, check the run conditions so untrusted external code cannot reach the secret.',
      ],
    ),
    costNotes: localized(
      [
        '差分が大きいほど1回のレビューのトークン量が増える。まず小さな差分で構成を固める。',
        'すべてのプッシュではなくプルリクエスト時などに限定し、実行回数を絞る。',
      ],
      [
        'A larger diff means more tokens per review; settle the setup on a small diff first.',
        'Limit runs to events like pull requests rather than every push to bound how often it fires.',
      ],
    ),
    cleanup: localized(
      [
        '検証用に作ったジョブやブランチを削除する',
        '検証のために発行したAPIキーを失効させる',
      ],
      [
        'Delete the job and branch created for the exercise',
        'Revoke any API key issued only for the exercise',
      ],
    ),
    reflection: localized(
      [
        'ローカル検証とCI検証で、それぞれ何を確認するのが適切か。両方でやると重複する確認は何か。',
        '指摘が出たときにジョブを失敗させる方針とコメントのみの方針は、チームにどんな影響の違いを生むか。',
      ],
      [
        'What is appropriate to check locally versus in CI, and which checks would be redundant if done in both?',
        'How do "fail the job on findings" and "comment only" differ in their effect on the team?',
      ],
    ),
    relatedCardIds: ['d3-file-locations', 'd3-print-mode', 'd3-ci'],
    relatedQuestionIds: ['q-sc-code-conventions', 'q-d3-ci-design', 'q-sc-code-ci'],
    sourceIds: ['exam-guide', 'code-memory', 'headless', 'code-best-practices'],
    verifiedAt: HANDS_ON_VERIFIED_AT,
  },
  {
    id: 'ho-structured-extraction',
    revision: 1,
    title: localized(
      '構造化データ抽出パイプライン',
      'A structured data extraction pipeline',
    ),
    summary: localized(
      '非構造の文書から情報を抽出し、スキーマで出力の型を保証したうえで、スキーマは通るが内容が成り立たない値を意味的検証で弾き、1フィールド失敗の再試行・冪等な再処理・人手レビュー条件・評価データセットまで自分の環境で設計します。',
      'Extract information from unstructured documents, guarantee output shape with a schema, then reject values that pass the schema but cannot be true via semantic validation, and design single-field retry, idempotent reprocessing, human-review conditions, and an evaluation dataset in your own environment.',
    ),
    domainIds: ['d4'],
    taskStatementIds: ['4.1', '4.3', '4.4', '4.5', '4.6'],
    skillIds: ['structured-output', 'evaluation', 'failure-handling', 'throughput-and-cost', 'human-oversight'],
    officialScenarioIds: ['structured-data-extraction'],
    learningObjectives: localized(
      [
        'JSON Schema を指定した構造化出力で、後段がそのまま取り込める型を保証できる',
        'スキーマ適合と意味的な妥当性を分けて検証できる',
        '1フィールドだけ失敗したときの再試行方針と、再実行しても壊れない冪等性を設計できる',
        '観察可能な成功基準と小さな評価データセットで抽出品質を測れる',
      ],
      [
        'Guarantee, via structured output against a JSON Schema, a shape the downstream can ingest directly',
        'Validate schema conformance and semantic validity as separate checks',
        'Design a retry policy for when exactly one field fails, and idempotency so re-runs do not corrupt data',
        'Measure extraction quality with observable success criteria and a small evaluation dataset',
      ],
    ),
    prerequisites: localized(
      [
        'Claude API を呼び出せる言語環境',
        'JSON Schema を書いた経験',
        '抽出対象にできる非構造テキスト（架空の記事・請求書などを自作してよい）',
      ],
      [
        'A language environment that can call the Claude API',
        'Experience writing a JSON Schema',
        'Some unstructured text to extract from (you may author fictional articles or invoices yourself)',
      ],
    ),
    environment: localized(
      [
        'Claude API キー（環境変数として渡す）',
        '10〜20件程度の架空の入力文書（正常系と、日付が矛盾するなどの異常系を混ぜる）',
        '抽出結果を保存できるファイルまたはローカルDB',
      ],
      [
        'A Claude API key (passed as an environment variable)',
        'About 10–20 fictional input documents (mix normal cases with edge cases such as contradictory dates)',
        'A file or local database where extraction results can be stored',
      ],
    ),
    estimatedMinutes: 120,
    setup: localized(
      [
        '抽出したい項目を決め、JSON Schema を1つ書く（例: 人物・組織・出来事・発行日）。',
        '10〜20件の架空文書を用意し、そのうち数件に「スキーマは通るが内容が成り立たない」値を仕込む（例: 発行日が創刊より前）。',
        '各文書に安定した ID を振り、抽出結果をその ID で保存できるようにする（冪等性の土台）。',
      ],
      [
        'Decide the fields to extract and write one JSON Schema (for example person, organization, event, publication date).',
        'Prepare 10–20 fictional documents, seeding a few with values that pass the schema but cannot be true (for example a publication date earlier than the founding date).',
        'Give each document a stable ID and store its extraction result under that ID (the basis for idempotency).',
      ],
    ),
    steps: [
      {
        id: 'step-schema',
        title: localized('出力スキーマで型を保証する', 'Guarantee shape with an output schema'),
        instructions: localized(
          [
            'JSON Schema を指定した構造化出力で抽出を実行し、返る JSON が常にスキーマの型に従うことを確認する。',
            '必須項目・型・列挙値をスキーマで明示し、後段のインデクサーが解釈を推測しなくてよい形にする。',
          ],
          [
            'Run extraction with structured output against the JSON Schema and confirm the returned JSON always follows the schema’s shape.',
            'Make required fields, types, and enums explicit in the schema so the downstream indexer does not have to guess.',
          ],
        ),
        expectedResult: localized(
          ['全文書で、返る出力がスキーマ検証を通る（必須フィールドの欠落や余剰キーがない）。'],
          ['For every document, the returned output passes schema validation (no missing required fields or extra keys).'],
        ),
      },
      {
        id: 'step-semantic-validation',
        title: localized('意味的な妥当性を別に検証する', 'Validate semantic validity separately'),
        instructions: localized(
          [
            'スキーマ検証とは別に、内容として成り立つかを確認する規則を書く（例: 発行日は創刊日以降）。',
            '仕込んだ矛盾データが、スキーマ検証は通るが意味的検証で弾かれることを確認する。',
          ],
          [
            'Write rules — separate from schema validation — that check whether the content can be true (for example, publication date is on or after the founding date).',
            'Confirm that the seeded contradictory data passes schema validation but is caught by semantic validation.',
          ],
        ),
        expectedResult: localized(
          ['矛盾を仕込んだ文書が意味的検証で不合格になり、正常な文書は合格する。'],
          ['Documents seeded with contradictions fail semantic validation while normal documents pass.'],
        ),
      },
      {
        id: 'step-partial-retry',
        title: localized('1フィールド失敗の再試行を設計する', 'Design single-field retry'),
        instructions: localized(
          [
            '1フィールドだけ検証に失敗したとき、全体を捨てず、そのフィールドだけを対象に理由付きで再抽出する方針を実装する。',
            '再試行の回数に上限を設け、超えたら人手レビューへ回す条件を決める。',
          ],
          [
            'Implement a policy where, when exactly one field fails validation, you do not discard the whole result but re-extract just that field with the reason.',
            'Cap the number of retries and define the condition under which it goes to human review.',
          ],
        ),
        expectedResult: localized(
          ['1フィールド失敗が、全体破棄ではなく対象フィールドの再抽出として処理される。'],
          ['A single-field failure is handled as a targeted re-extraction, not a discard of the whole result.'],
        ),
      },
      {
        id: 'step-idempotency',
        title: localized('冪等な再処理にする', 'Make reprocessing idempotent'),
        instructions: localized(
          [
            '同じ文書 ID を2回処理しても、重複行が増えず結果が1つに収束することを確認する。',
            '夜間バッチが途中で失敗して再実行されても、二重取り込みが起きないようにする。',
          ],
          [
            'Confirm that processing the same document ID twice does not add duplicate rows and converges to a single result.',
            'Ensure that if an overnight batch fails partway and is re-run, no double ingestion occurs.',
          ],
        ),
        expectedResult: localized(
          ['同一文書を2回投入しても保存結果は1件で、内容が上書き・収束する。'],
          ['Submitting the same document twice leaves one stored result that is overwritten/converged, not duplicated.'],
        ),
      },
      {
        id: 'step-eval-throughput',
        title: localized('評価データセットと処理量・コストを検討する', 'Build an evaluation set and weigh throughput and cost'),
        instructions: localized(
          [
            '正解を付けた小さな評価データセットを作り、抽出結果を分類別（合格・スキーマ失敗・意味失敗・要レビュー）に集計する。',
            '即時応答が不要な大量処理では、同期呼び出しと非同期バッチのどちらが適切かをコストと所要時間の観点で検討する。',
          ],
          [
            'Build a small labeled evaluation dataset and tally extraction results by class (pass, schema failure, semantic failure, needs review).',
            'For high-volume processing that does not need immediate responses, weigh synchronous calls against asynchronous batch by cost and time.',
          ],
        ),
        expectedResult: localized(
          ['評価データセットに対する分類別の集計が出て、改善対象の分類が特定できる。'],
          ['You get a by-class tally against the evaluation set and can identify which class to improve.'],
        ),
      },
    ],
    deliverables: localized(
      [
        'JSON Schema と、スキーマ検証・意味的検証の2段構えのコード',
        '正解付きの小さな評価データセットと分類別の集計結果',
        '1フィールド再試行と冪等な保存を含むパイプライン',
      ],
      [
        'A JSON Schema and code with the two-stage schema/semantic validation',
        'A small labeled evaluation dataset and a by-class tally',
        'A pipeline that includes single-field retry and idempotent storage',
      ],
    ),
    verification: localized(
      [
        '全出力がスキーマ検証を通る',
        '仕込んだ矛盾データが意味的検証で弾かれる',
        '1フィールド失敗が全体破棄ではなく対象フィールドの再試行になる',
        '同じ文書を2回処理しても重複しない',
        '評価データセットで分類別の結果が出る',
      ],
      [
        'All outputs pass schema validation',
        'Seeded contradictory data is caught by semantic validation',
        'A single-field failure becomes a targeted retry, not a whole-result discard',
        'Processing the same document twice does not duplicate it',
        'The evaluation dataset produces by-class results',
      ],
    ),
    troubleshooting: [
      {
        id: 'tp-schema-pass-wrong',
        symptom: localized(
          'スキーマ検証は通るのに、明らかに成り立たない値が下流へ流れる。',
          'Values that cannot be true reach the downstream even though schema validation passes.',
        ),
        isolation: localized(
          'スキーマ検証と意味的検証を分けているか確認する。型の正しさと内容の妥当性は別の関門で確認する。',
          'Check that schema and semantic validation are separate: type correctness and content validity belong to different gates.',
        ),
      },
      {
        id: 'tp-discard-whole',
        symptom: localized(
          '1項目の失敗で文書全体の抽出結果を捨てており、再処理が高くつく。',
          'One failed field discards the whole document’s extraction, making reprocessing expensive.',
        ),
        isolation: localized(
          '失敗の粒度を見直す。フィールド単位で再抽出できるよう、どの項目がなぜ失敗したかを保持する。',
          'Reconsider failure granularity: retain which field failed and why so you can re-extract per field.',
        ),
      },
      {
        id: 'tp-double-ingest',
        symptom: localized(
          'バッチ再実行後に同じ文書の結果が重複して保存される。',
          'After a batch re-run, the same document’s result is stored twice.',
        ),
        isolation: localized(
          '安定した文書 ID を主キーにして upsert しているか確認する。挿入のみだと再実行で重複する。',
          'Confirm you upsert on a stable document ID as the key; insert-only will duplicate on re-runs.',
        ),
      },
    ],
    securityNotes: localized(
      [
        '個人情報を含む文書を扱う場合は、抽出結果とログの保存範囲とアクセスを絞る。練習では架空データを使う。',
        'APIキーは環境変数から読み、文書やログに機微情報を残さない。',
        '人手レビューに回す条件（低信頼・機微項目）を先に決め、機微な判断を自動確定させない。',
      ],
      [
        'When handling documents with personal data, limit where extraction results and logs are stored and who can access them; use fictional data in practice.',
        'Read the API key from an environment variable and keep sensitive information out of documents and logs.',
        'Decide up front what goes to human review (low confidence, sensitive fields) and do not let sensitive decisions auto-finalize.',
      ],
    ),
    costNotes: localized(
      [
        '即時応答が不要な大量処理は、非同期バッチの方が安く済む場合がある。まず少量で品質を固めてから量を増やす。',
        '再試行の上限がないと、失敗文書がコストを押し上げる。上限と要レビュー送りの条件を入れる。',
      ],
      [
        'For high-volume work that does not need immediate responses, asynchronous batch can be cheaper; settle quality on a small set before scaling up.',
        'Without a retry cap, failing documents inflate cost; add a cap and a condition to route them to review.',
      ],
    ),
    cleanup: localized(
      [
        '検証で作った抽出結果やローカルDBを削除する。',
        '検証用に発行したAPIキーを失効させる。',
      ],
      [
        'Delete extraction results and any local database created for the exercise.',
        'Revoke any API key issued only for the exercise.',
      ],
    ),
    reflection: localized(
      [
        'スキーマ検証で防げる誤りと、意味的検証でしか防げない誤りの境界はどこか。',
        'どの抽出結果を人手レビューへ回すべきか。自動確定してよい条件と、そうでない条件を分ける基準は何か。',
      ],
      [
        'Where is the boundary between errors schema validation can prevent and errors only semantic validation can catch?',
        'Which extraction results should go to human review? What criterion separates what may auto-finalize from what may not?',
      ],
    ),
    relatedCardIds: ['d4-criteria', 'd4-schema', 'd4-retry', 'd4-batch-shape', 'd4-fresh-reviewer'],
    relatedQuestionIds: ['q-d4-rubric', 'q-d4-structured-guarantee', 'q-d4-retry-feedback', 'q-d4-batch'],
    sourceIds: ['exam-guide', 'structured', 'evals', 'batch'],
    verifiedAt: HANDS_ON_VERIFIED_AT,
  },
  {
    id: 'ho-multi-agent-research',
    revision: 1,
    title: localized(
      'マルチエージェント調査パイプライン',
      'A multi-agent research pipeline',
    ),
    summary: localized(
      '調整役と作業役を分けた調査システムを自分の環境で組み、タスク分解・コンテキストの分離と引き継ぎ・出典追跡・重複作業の防止・並列数の制限・部分失敗の扱い・最終統合と人手レビューまでを設計します。',
      'Build a research system in your own environment that separates a coordinator from workers, and design task decomposition, context isolation and handoff, provenance tracking, duplicate-work prevention, concurrency limits, partial-failure handling, final synthesis, and human review.',
    ),
    domainIds: ['d1', 'd5'],
    taskStatementIds: ['1.2', '1.3', '5.1', '5.3', '5.4'],
    skillIds: ['orchestration', 'context-management', 'structured-output', 'human-oversight', 'throughput-and-cost'],
    officialScenarioIds: ['multi-agent-research'],
    learningObjectives: localized(
      [
        '調整役と作業役の責務を分け、独立な調べ物を並列化する設計ができる',
        '作業役へ渡す入力契約を明確にし、コンテキストを分離して引き継げる',
        '各事実に出典（provenance）を対応付け、下流でどの事実がどの出典に基づくか判別できる',
        '並列数の上限・重複作業の防止・部分失敗時の統合方針を設計できる',
      ],
      [
        'Separate coordinator and worker responsibilities and parallelize independent lookups',
        'Make the input contract to workers explicit, and isolate and hand off context',
        'Attach provenance to each fact so the downstream can tell which fact rests on which source',
        'Design concurrency limits, duplicate-work prevention, and a synthesis policy for partial failures',
      ],
    ),
    prerequisites: localized(
      [
        'Claude API または Agent SDK を扱える環境',
        'サブエージェントや委譲の考え方に一度触れていること',
        '並行処理（並列実行と上限）を書ける言語環境',
      ],
      [
        'An environment that can use the Claude API or the Agent SDK',
        'Having encountered the idea of subagents and delegation once',
        'A language environment where you can write concurrency (parallel execution with a cap)',
      ],
    ),
    environment: localized(
      [
        'Claude API キー（環境変数として渡す）',
        '検索の代わりに使える固定の資料集（架空でよい。ネットワークに出る必要はない）',
        '各作業役の入力・出力・出典を記録できるログ',
      ],
      [
        'A Claude API key (passed as an environment variable)',
        'A fixed document set to stand in for search (fictional is fine; no network access required)',
        'A log that records each worker’s input, output, and sources',
      ],
    ),
    estimatedMinutes: 150,
    setup: localized(
      [
        '調査テーマを1つ決め、調整役が3〜4個のサブ質問へ分解できる題材にする。',
        '各サブ質問に対応する固定資料を用意する（作業役はこの資料集だけを見る）。実データ検索は不要。',
        '作業役へ渡す入力契約（サブ質問・参照してよい資料範囲・返す形式）を先に決める。',
      ],
      [
        'Pick one research topic that the coordinator can decompose into 3–4 sub-questions.',
        'Prepare fixed documents for each sub-question (workers see only this set); no real data search is needed.',
        'Define the input contract to workers first (the sub-question, which documents may be referenced, and the return format).',
      ],
    ),
    steps: [
      {
        id: 'step-decompose',
        title: localized('調整役でタスクを分解する', 'Decompose the task in the coordinator'),
        instructions: localized(
          [
            '調整役が調査テーマを独立なサブ質問へ分解し、各作業役に1つずつ割り当てる。',
            '重複するサブ質問を作らないよう、担当範囲が重ならないことを確認する。',
          ],
          [
            'Have the coordinator decompose the topic into independent sub-questions and assign one to each worker.',
            'Confirm that assignments do not overlap so you avoid duplicate sub-questions.',
          ],
        ),
        expectedResult: localized(
          ['サブ質問が互いに独立で、担当範囲が重複していない。'],
          ['The sub-questions are mutually independent and their scopes do not overlap.'],
        ),
      },
      {
        id: 'step-worker-contract',
        title: localized('作業役の入力契約とコンテキスト分離', 'Worker input contract and context isolation'),
        instructions: localized(
          [
            '各作業役には、担当のサブ質問と参照してよい資料範囲だけを渡し、他の作業役の会話履歴を混ぜない。',
            '作業役の出力を、統合しやすい決まった形式（要点＋根拠）で返させる。',
          ],
          [
            'Give each worker only its sub-question and the documents it may reference; do not mix in other workers’ histories.',
            'Have each worker return output in a fixed shape that is easy to synthesize (findings plus evidence).',
          ],
        ),
        expectedResult: localized(
          ['各作業役が自分の文脈だけで動き、出力が同じ形式で揃う。'],
          ['Each worker runs on its own context alone, and outputs come back in the same shape.'],
        ),
      },
      {
        id: 'step-provenance',
        title: localized('事実に出典を対応付ける', 'Attach provenance to each fact'),
        instructions: localized(
          [
            '作業役が返す各事実に、根拠となった資料の参照を対応付ける。末尾に参照一覧を並べるだけにしない。',
            '統合後も、どの事実がどの資料に基づくか下流で判別できる形を保つ。',
          ],
          [
            'Attach, to each fact a worker returns, a reference to the document it rests on; do not merely append a reference list at the end.',
            'Keep a shape where, even after synthesis, the downstream can tell which fact rests on which source.',
          ],
        ),
        expectedResult: localized(
          ['統合レポートの各事実から、根拠資料を1対1でたどれる。'],
          ['From each fact in the synthesized report, you can trace to its source document one-to-one.'],
        ),
      },
      {
        id: 'step-concurrency-failure',
        title: localized('並列数の上限と部分失敗を扱う', 'Cap concurrency and handle partial failure'),
        instructions: localized(
          [
            '同時に走る作業役の数に上限を設け、超える分は順番待ちにする。',
            '一部の作業役が失敗しても全体を止めず、失敗したサブ質問を明示して統合する方針を実装する。',
          ],
          [
            'Cap the number of workers running at once and queue the excess.',
            'Implement a policy where a failure in some workers does not stop the whole run: synthesize while explicitly marking which sub-questions failed.',
          ],
        ),
        expectedResult: localized(
          ['1つの作業役を失敗させても、残りの結果が失敗を明示したうえで統合される。'],
          ['Failing one worker still yields a synthesis of the rest with the failure explicitly noted.'],
        ),
      },
      {
        id: 'step-synthesis-review',
        title: localized('統合と人手レビュー', 'Synthesis and human review'),
        instructions: localized(
          [
            '調整役が作業役の出力を統合し、出典付きの最終レポートを作る。',
            '結論が出典と矛盾する、または重要な判断を含む場合に人手レビューへ回す条件を決める。',
            'コストと所要時間を記録し、並列数を変えたときの違いを観察する。',
          ],
          [
            'Have the coordinator synthesize worker outputs into a final report with provenance.',
            'Define when to route to human review (conclusions that conflict with sources, or that carry important judgments).',
            'Record cost and elapsed time, and observe the difference when you change the concurrency limit.',
          ],
        ),
        expectedResult: localized(
          ['出典付きの統合レポートが出て、レビュー送りの条件が明文化されている。'],
          ['You get a synthesized report with provenance, and the human-review conditions are written down.'],
        ),
      },
    ],
    deliverables: localized(
      [
        '調整役と作業役を分けた調査パイプラインのコード',
        '各事実に出典が対応付いた統合レポート1件',
        '並列数の上限・部分失敗方針・レビュー条件を書いたメモ',
      ],
      [
        'Pipeline code that separates coordinator and workers',
        'One synthesized report where each fact carries its provenance',
        'A note stating the concurrency cap, partial-failure policy, and review conditions',
      ],
    ),
    verification: localized(
      [
        'サブ質問が独立で重複していない',
        '各作業役が自分の文脈だけで動く',
        '統合レポートの各事実から根拠資料をたどれる',
        '並列数が上限を超えず、超過分が順番待ちになる',
        '1つの作業役を失敗させても残りが失敗明示付きで統合される',
      ],
      [
        'Sub-questions are independent and non-overlapping',
        'Each worker runs on its own context alone',
        'Each fact in the synthesized report can be traced to its source',
        'Concurrency does not exceed the cap and the excess queues',
        'Failing one worker still synthesizes the rest with the failure noted',
      ],
    ),
    troubleshooting: [
      {
        id: 'tp-duplicate-work',
        symptom: localized(
          '複数の作業役が同じことを調べ、結果が重複する。',
          'Multiple workers investigate the same thing and results duplicate.',
        ),
        isolation: localized(
          '調整役の分解を見直す。担当範囲が重ならないようサブ質問を分け、割り当てを明示する。',
          'Review the coordinator’s decomposition: split sub-questions so scopes do not overlap and make assignments explicit.',
        ),
      },
      {
        id: 'tp-context-bleed',
        symptom: localized(
          '作業役が担当外の情報に引きずられ、質問と無関係な結論を返す。',
          'A worker is pulled by out-of-scope information and returns conclusions unrelated to its question.',
        ),
        isolation: localized(
          'コンテキストの分離を確認する。他の作業役の履歴や無関係な資料を渡していないか見直す。',
          'Check context isolation: review whether other workers’ histories or irrelevant documents were passed in.',
        ),
      },
      {
        id: 'tp-lost-provenance',
        symptom: localized(
          '統合後にどの事実がどの資料に基づくか分からなくなる。',
          'After synthesis you can no longer tell which fact rests on which source.',
        ),
        isolation: localized(
          '出典を事実ごとに対応付けているか確認する。末尾の参照一覧だけでは統合で対応が失われる。',
          'Confirm provenance is attached per fact; a reference list at the end alone loses the mapping during synthesis.',
        ),
      },
    ],
    securityNotes: localized(
      [
        'APIキーは環境変数から読み、各作業役のログに残さない。',
        '作業役には必要な資料だけを渡し、無関係な機微情報を広く見せない（コンテキストの最小化）。',
        '重要な判断や外部公開を伴う結論は、人手レビューを経てから確定させる。',
      ],
      [
        'Read the API key from an environment variable and keep it out of each worker’s log.',
        'Give each worker only the documents it needs; do not broadly expose unrelated sensitive information (minimize context).',
        'Finalize conclusions that carry important judgments or external publication only after human review.',
      ],
    ),
    costNotes: localized(
      [
        '作業役を増やすほど並列でトークンとコストが積み上がる。並列数の上限で総量を制御する。',
        'まず少数の作業役と小さな資料で構成を固め、それからテーマや資料を広げる。',
      ],
      [
        'More workers stack up tokens and cost in parallel; control the total with a concurrency cap.',
        'Settle the setup with a few workers and small documents first, then widen the topic and documents.',
      ],
    ),
    cleanup: localized(
      [
        '検証で作ったログや中間成果物を削除する。',
        '検証用に発行したAPIキーを失効させる。',
      ],
      [
        'Delete logs and intermediate artifacts created for the exercise.',
        'Revoke any API key issued only for the exercise.',
      ],
    ),
    reflection: localized(
      [
        '単一エージェントに全部やらせる構成と、調整役と作業役を分ける構成は、どんな調査でどちらが有利か。',
        '出典の対応付けを事実単位で保つと、下流のレビューやり直しはどう楽になるか。',
      ],
      [
        'For what kinds of research does a single all-in-one agent win, and for what does separating coordinator and workers win?',
        'How does keeping provenance per fact make downstream review and rework easier?',
      ],
    ),
    relatedCardIds: ['d1-orchestration', 'd1-subagent-input', 'd5-window-accounting', 'd5-provenance', 'd5-research-isolation'],
    relatedQuestionIds: ['q-d1-fanout', 'q-d1-subagent-input', 'q-d5-summarize', 'q-d5-provenance'],
    sourceIds: ['exam-guide', 'subagents', 'structured', 'context-windows'],
    verifiedAt: HANDS_ON_VERIFIED_AT,
  },
];
