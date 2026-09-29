import type {
  ChoiceQuestion,
  LocalizedText,
  PracticeScenarioId,
  QuestionDifficulty,
  SkillId,
  StandaloneQuestion,
} from './types';
import { SCENARIO_VERIFIED_AT } from './scenarios';
import { VERIFIED_AT } from './sources';

type QuestionCopy = {
  stem: string;
  choices: string[];
  explanation: string;
};

// What the question demands of the learner and which capability it measures.
type Assessment = {
  difficulty: QuestionDifficulty;
  skills: SkillId[];
};

const localized = <T>(ja: T, en: T): LocalizedText<T> => ({ ja, en });

const choiceIds = ['a', 'b', 'c', 'd'];

const question = (
  id: string,
  domainId: string,
  objectiveIds: string[],
  format: ChoiceQuestion['format'],
  correctChoiceIds: string[],
  assessment: Assessment,
  ja: QuestionCopy,
  en: QuestionCopy,
  sourceIds: string[],
  extra?: { scenarioId?: PracticeScenarioId; verifiedAt?: string; revision?: number },
): ChoiceQuestion => ({
  id,
  revision: extra?.revision ?? 1,
  domainId,
  objectiveIds,
  format,
  difficulty: assessment.difficulty,
  skills: assessment.skills,
  stem: localized(ja.stem, en.stem),
  choices: ja.choices.map((text, index) => ({ id: choiceIds[index], text: localized(text, en.choices[index]) })),
  correctChoiceIds,
  explanation: localized(ja.explanation, en.explanation),
  sourceIds,
  verifiedAt: extra?.verifiedAt ?? VERIFIED_AT,
  ...(extra?.scenarioId ? { scenarioId: extra.scenarioId } : {}),
});

// The 22 questions added in Task 8A.1 (bank expansion 38→60). Their claims were
// re-verified against the official docs on this date; questions still resting on
// pages last checked at VERIFIED_AT keep that earlier date rather than a blanket
// bump. See tasks/task-8a1-question-bank-expansion.md.
const EXPANSION_VERIFIED_AT = '2026-07-23';

// All stems, choices, and explanations below were independently authored for
// this app from public official documentation. Wrong choices encode common
// misconceptions; nothing is copied, recalled, or reconstructed from the exam.
export const questions: ChoiceQuestion[] = [
  question(
    'q-d1-loop-continue', 'd1', ['1.1'], 'single', ['b'],
    { difficulty: 'foundation', skills: ['agent-loop'] },
    {
      stem: 'エージェントループの実装で、ツールを実行してループを継続するかどうかの判断に最も適した情報はどれですか？',
      choices: [
        '応答テキストに「完了しました」という文言が含まれるかどうか',
        'API応答の stop_reason が tool_use かどうか',
        '会話履歴のトークン数が上限の半分を超えたかどうか',
        '直前のツール結果が空文字列かどうか',
      ],
      explanation: 'stop_reason はAPIが返す構造化された停止理由で、ループの制御フローに使う一次情報です。自然文からの推測やトークン数・結果の空判定は、完了状態と直接対応しない間接的な指標です。',
    },
    {
      stem: 'In an agentic loop implementation, which signal is most appropriate for deciding whether to run a tool and continue the loop?',
      choices: [
        'Whether the response text contains the phrase “task complete”',
        'Whether the API response’s stop_reason is tool_use',
        'Whether the conversation history has passed half of the token limit',
        'Whether the previous tool result was an empty string',
      ],
      explanation: 'stop_reason is the structured stop signal returned by the API and is the primary input for loop control flow. Inferring from prose, token counts, or empty results relies on indirect signals that do not directly correspond to completion state.',
    },
    ['stop-reasons', 'tool-use'],
  ),
  question(
    'q-d1-fanout', 'd1', ['1.2', '1.6'], 'single', ['c'],
    { difficulty: 'application', skills: ['orchestration'] },
    {
      stem: '複数のサブタスクを並列fan-outで実行する判断として最も適切なのはどれですか？',
      choices: [
        'サブタスクの数が多く、逐次実行では時間がかかりそうなとき',
        '前段の出力が次段の入力になるパイプライン処理のとき',
        'サブタスクが互いの結果に依存せず独立しているとき',
        'すべてのサブタスクが同じ共有状態を順番に更新するとき',
      ],
      explanation: '並列化の判断軸はサブタスク間の依存関係です。数が多いだけで依存があれば並列化は破綻し、前段の結果が次段の入力になる処理や順序が重要な共有状態の更新は逐次実行が必要です。',
    },
    {
      stem: 'Which situation most appropriately calls for running multiple subtasks as a parallel fan-out?',
      choices: [
        'There are many subtasks and sequential execution looks slow',
        'The pipeline feeds each stage’s output into the next stage',
        'The subtasks are independent and do not need one another’s results',
        'Every subtask updates the same shared state in order',
      ],
      explanation: 'The deciding factor is the dependency between subtasks. A large count alone does not justify parallelism when dependencies exist, and pipelines or ordered shared-state updates require sequential execution.',
    },
    ['subagents', 'sdk-features'],
  ),
  question(
    'q-d1-subagent-input', 'd1', ['1.3'], 'single', ['a'],
    { difficulty: 'application', skills: ['orchestration', 'context-management'] },
    {
      stem: 'サブエージェントへ調査タスクを委譲します。起動時の設計として最も適切なのはどれですか？',
      choices: [
        '必要な入力、期待する出力形式、終了条件を明示して渡す',
        '親エージェントの会話履歴全体を常にそのまま共有する',
        '親のコンテキストは自動で参照できるので、指示は最小限にする',
        '出力形式は指定せず、サブエージェントの判断に任せる',
      ],
      explanation: 'サブエージェントが親の文脈を暗黙に参照できる前提は誤りで、必要十分な入力と出力契約、終了条件を明示的に渡します。全履歴の共有はコンテキストを浪費し、出力形式が無いと統合できません。',
    },
    {
      stem: 'You delegate a research task to a subagent. Which invocation design is most appropriate?',
      choices: [
        'Pass the required input, the expected output format, and clear stopping conditions explicitly',
        'Always share the parent agent’s entire conversation history as-is',
        'Keep instructions minimal because the parent context is automatically visible',
        'Leave the output format unspecified and let the subagent decide',
      ],
      explanation: 'Assuming the parent context is implicitly visible to a subagent is a mistake; pass sufficient input, an output contract, and stopping conditions explicitly. Sharing the full history wastes context, and results without an output format cannot be integrated.',
    },
    ['subagents'],
  ),
  question(
    'q-d1-enforcement', 'd1', ['1.4', '1.5'], 'multiple', ['a', 'c'],
    { difficulty: 'analysis', skills: ['workflow-enforcement', 'human-oversight'] },
    {
      stem: '「返金処理の前に本人確認を必ず行う」という業務ルールを確実に守らせたいです。適切な手段を2つ選んでください。',
      choices: [
        'ツール実行前のフックで、本人確認が未完了の返金呼び出しを遮断する',
        'システムプロンプトに「必ず本人確認してください」と強い言葉で強調する',
        'アプリケーション側の認可チェックで、条件を満たさない返金APIの呼び出しを拒否する',
        'モデルに「本人確認は完了しましたか？」と自問させるステップを追加する',
      ],
      explanation: '文章による指示や自問はモデルの判断を導きますが、必須ポリシーの強制境界にはなりません。ツール実行前の決定的なフックとアプリケーション側の認可チェックは、条件を満たさない呼び出しを確実に遮断できます。',
    },
    {
      stem: 'You must guarantee the rule “identity verification always happens before a refund.” Select the TWO appropriate mechanisms.',
      choices: [
        'Block refund calls without completed identity verification in a pre-tool-execution hook',
        'Emphasize “always verify identity” in strong words in the system prompt',
        'Reject refund API calls that fail the condition with an application-side authorization check',
        'Add a step where the model asks itself “has identity verification been completed?”',
      ],
      explanation: 'Written instructions and self-questioning guide model behavior but are not an enforcement boundary for mandatory policy. A deterministic pre-tool hook and an application-side authorization check reliably block noncompliant calls.',
    },
    ['hooks', 'sdk-features'],
  ),
  question(
    'q-d1-hook-timing', 'd1', ['1.5'], 'single', ['d'],
    { difficulty: 'foundation', skills: ['workflow-enforcement'] },
    {
      stem: '破壊的なコマンドを検査し、条件を満たさない場合は実行させたくありません。処理を差し込むライフサイクルポイントとして最も適切なのはどれですか？',
      choices: [
        'ツール実行後、結果を会話履歴へ返す前',
        'セッション終了時のクリーンアップ処理',
        'ユーザーが次のメッセージを送信したとき',
        'ツール実行前の検証フック',
      ],
      explanation: '事後の検査では破壊的な操作はすでに実行されています。実行前のフックであれば、呼び出し内容を検査・記録し、条件を満たさない実行を開始前に遮断できます。',
    },
    {
      stem: 'You want to inspect destructive commands and prevent execution when conditions are not met. Which lifecycle point is most appropriate for the check?',
      choices: [
        'After tool execution, before the result returns to the conversation history',
        'The cleanup step when the session ends',
        'When the user sends their next message',
        'A validation hook before tool execution',
      ],
      explanation: 'A check after the fact runs when the destructive operation has already executed. A pre-execution hook can inspect and log the call and block a noncompliant execution before it starts.',
    },
    ['hooks'],
  ),
  question(
    'q-d1-session-state', 'd1', ['1.7'], 'multiple', ['b', 'd'],
    { difficulty: 'application', skills: ['context-management', 'orchestration'] },
    {
      stem: '長期タスクのセッション設計について、適切なものを2つ選んでください。',
      choices: [
        'セッションを再開すれば以前のツール実行がすべて自動で再実行されるため、状態管理は不要である',
        '再開に必要な決定事項や識別子は、会話文だけに埋めず構造化した状態として保持する',
        '分岐（fork）すると元のセッション履歴は破棄されるため、分岐前のエクスポートが必須である',
        '別案を独立に試したいときは、履歴を引き継いで分岐させ、元のセッションを保ったままにする',
      ],
      explanation: '再開は履歴を引き継ぎますが、過去の処理を再実行するものではありません。分岐は元のセッションを保ったまま別案を試す手段で、破棄はされません。重要な状態は会話文の外に構造化して保持します。',
    },
    {
      stem: 'Select the TWO appropriate statements about session design for long-running tasks.',
      choices: [
        'Resuming a session automatically re-executes all previous tool runs, so state management is unnecessary',
        'Keep the decisions and identifiers needed for resumption as structured state, not buried only in conversation prose',
        'Forking discards the original session history, so exporting before the fork is mandatory',
        'To try an alternative independently, fork with the inherited history while keeping the original session intact',
      ],
      explanation: 'Resuming carries the history forward but does not re-execute past work. Forking preserves the original session while exploring an alternative; nothing is discarded. Critical state should be kept structured outside conversation prose.',
    },
    ['sessions'],
  ),

  question(
    'q-d2-tool-contract', 'd2', ['2.1'], 'single', ['c'],
    { difficulty: 'application', skills: ['tool-design'] },
    {
      stem: 'モデルがツールを誤選択したり不正な引数を作ったりします。ツール定義の改善として最も適切なのはどれですか？',
      choices: [
        'すべての操作を1つの汎用ツールに統合し、選択の余地をなくす',
        '説明を短くし、詳細は人間向けの外部ドキュメントへ移す',
        '目的が特定できる名前と説明、入力のJSON Schema、利用条件・境界を明記する',
        '引数をすべて自由記述の文字列にして、柔軟に解釈できるようにする',
      ],
      explanation: 'ツール定義は人向けの補足ではなく、モデルが選択と入力生成に使う契約です。汎用ツールへの統合や自由記述の引数は曖昧さを増やし、外部ドキュメントはモデルの選択時に参照されません。',
    },
    {
      stem: 'The model keeps choosing the wrong tool and constructing invalid arguments. Which tool-definition improvement is most appropriate?',
      choices: [
        'Merge every operation into one general-purpose tool so there is nothing to choose',
        'Shorten the description and move the details to external human-facing documentation',
        'State a purpose-specific name and description, an input JSON Schema, and the conditions and boundaries for use',
        'Make every argument a free-form string so it can be interpreted flexibly',
      ],
      explanation: 'A tool definition is a contract the model uses for selection and input generation, not supplementary documentation. Merging into a general tool or free-form arguments increases ambiguity, and external docs are not consulted at selection time.',
    },
    ['tool-use', 'mcp-tools'],
  ),
  question(
    'q-d2-transient-error', 'd2', ['2.2'], 'single', ['b'],
    { difficulty: 'application', skills: ['failure-handling', 'tool-design'] },
    {
      stem: 'ツールが呼び出す外部APIが一時的なレート制限で失敗しました。エージェントが適切に回復できる返し方はどれですか？',
      choices: [
        '例外を握りつぶして空の成功レスポンスを返し、処理を止めない',
        'エラーであることに加え、失敗の分類・再試行可能性・安全な説明を構造化して返す',
        'デバッグしやすいよう、スタックトレースと認証ヘッダーを含む生のレスポンスを返す',
        '「failed」という文字列だけを返し、解釈はモデルに任せる',
      ],
      explanation: '一時障害か恒久障害かの分類と再試行可能性が、エージェントの次の行動を決めます。失敗の成功偽装は問題を隠し、生のレスポンスは秘密や内部詳細を漏らし、文字列だけでは回復方針を選べません。',
    },
    {
      stem: 'An external API called by your tool fails due to a temporary rate limit. Which response lets the agent recover appropriately?',
      choices: [
        'Swallow the exception and return an empty success response so work continues',
        'Return a structured result that marks it as an error with the failure category, retryability, and a safe explanation',
        'Return the raw response including the stack trace and auth headers to ease debugging',
        'Return only the string “failed” and let the model interpret it',
      ],
      explanation: 'Classifying transient versus permanent failure and stating retryability drive the agent’s next action. Faking success hides the problem, raw responses leak secrets and internals, and a bare string gives no basis for choosing a recovery strategy.',
    },
    ['mcp-tools', 'tool-use'],
  ),
  question(
    'q-d2-mcp-secrets', 'd2', ['2.4'], 'multiple', ['a', 'd'],
    { difficulty: 'application', skills: ['mcp-integration', 'workflow-enforcement'] },
    {
      stem: 'チームでMCPサーバーの設定を共有します。適切な運用を2つ選んでください。',
      choices: [
        'APIトークンは環境変数や秘密管理へ置き、共有する設定ファイルには含めない',
        'トークンを含む設定ファイルでも、プライベートリポジトリに置けば安全に共有できる',
        '管理を簡単にするため、すべてのMCPサーバーを常に全プロジェクト共通のスコープで公開する',
        '接続定義は、プロジェクトやユーザーなど必要な範囲に合ったスコープを選んで公開する',
      ],
      explanation: '共有できる接続定義と秘密情報は分離し、秘密は環境変数や秘密管理に置きます。非公開リポジトリは秘密管理の代替にならず、スコープは一律共通ではなく必要な範囲に絞って選びます。',
    },
    {
      stem: 'Your team shares MCP server configuration. Select the TWO appropriate practices.',
      choices: [
        'Keep API tokens in environment variables or a secrets manager and out of the shared configuration file',
        'A configuration file containing tokens can be shared safely as long as it lives in a private repository',
        'To simplify management, always expose every MCP server at a scope shared by all projects',
        'Expose connection definitions at a scope that matches the needed range, such as project or user',
      ],
      explanation: 'Separate shareable connection definitions from secrets, and store secrets in environment variables or a secrets manager. A private repository is not a substitute for secrets management, and scope should be narrowed to what is needed rather than made global.',
    },
    ['code-mcp', 'mcp-tools'],
  ),
  question(
    'q-d2-tool-overload', 'd2', ['2.3'], 'single', ['d'],
    { difficulty: 'application', skills: ['tool-design', 'orchestration'] },
    {
      stem: '数十個のツールを1つのエージェントへ同時に公開したところ、選択ミスが増えました。まず検討すべき対策はどれですか？',
      choices: [
        'ツール名をすべて短い略語にして、読み込む定義量を減らす',
        'すべてのツールを統合した単一の万能ツールを作る',
        'モデルの温度を下げて、選択のランダム性を減らす',
        '責任や利用場面でツールをまとめ、必要な組だけを専門エージェントへ配分する',
      ],
      explanation: '同時に見せる選択肢の数と紛らわしさを減らすことが本質的な対策です。略語化は説明の質を下げ、万能ツール化は境界を曖昧にします。ただし分割し過ぎによる往復コストの増加も合わせて評価します。',
    },
    {
      stem: 'After exposing dozens of tools to a single agent at once, selection mistakes increased. Which countermeasure should you consider first?',
      choices: [
        'Abbreviate every tool name to reduce the volume of loaded definitions',
        'Build a single all-purpose tool that merges every capability',
        'Lower the model temperature to reduce randomness in selection',
        'Group tools by responsibility and use case, and assign only the needed sets to specialized agents',
      ],
      explanation: 'The essential fix is reducing the number and confusability of simultaneously presented choices. Abbreviations degrade the descriptions and an all-purpose tool blurs boundaries. Also account for the extra round trips caused by over-fragmentation.',
    },
    ['sdk-features', 'tool-use'],
  ),

  question(
    'q-d3-claudemd', 'd3', ['3.1'], 'single', ['b'],
    { difficulty: 'foundation', skills: ['claude-code-configuration'] },
    {
      stem: 'チーム全員とCIの両方に適用したいコーディング規約があります。どこに置くのが最も適切ですか？',
      choices: [
        '各開発者の個人用グローバル設定に置き、各自で同期してもらう',
        'リポジトリのプロジェクトCLAUDE.mdに置き、バージョン管理する',
        '依頼のたびにプロンプトへ規約の全文を貼り付ける',
        'READMEに書いておけば常に自動で読み込まれるため、追加の設定は不要である',
      ],
      explanation: 'チーム必須のルールはプロジェクト層のCLAUDE.mdへ置いてバージョン管理すると、他の開発者やCIでも再現できます。個人設定は共有されず、毎回の貼り付けは漏れやすく、READMEは指示として常時読み込まれる場所ではありません。',
    },
    {
      stem: 'You have coding conventions that must apply to every teammate and to CI. Where is the most appropriate place for them?',
      choices: [
        'Each developer’s personal global settings, synchronized individually',
        'The repository’s project CLAUDE.md, under version control',
        'Pasting the full conventions into the prompt with every request',
        'The README, because it is always loaded automatically and needs no further setup',
      ],
      explanation: 'Mandatory team rules belong in the project-level CLAUDE.md under version control so other developers and CI reproduce them. Personal settings are not shared, per-request pasting is error-prone, and the README is not an always-loaded instruction source.',
    },
    ['code-memory'],
  ),
  question(
    'q-d3-skill', 'd3', ['3.2'], 'multiple', ['a', 'c'],
    { difficulty: 'foundation', skills: ['claude-code-configuration'] },
    {
      stem: 'Skillの性質として正しいものを2つ選んでください。',
      choices: [
        '手順書と参照ファイルやスクリプトをまとめ、再利用可能な単位として提供できる',
        'CLAUDE.mdと同様に、内容はすべてのセッションで常に読み込まれる',
        '説明文は、どんなときに使うべきかを判断できるように書く',
        '定義したSkillは、ユーザーが名前を明示的に入力しない限り決して使われない',
      ],
      explanation: 'Skillは手順と参照資源をパッケージ化した再利用可能な能力で、必要なときに読み込まれます。常時読み込みはCLAUDE.mdとの混同です。説明文が利用判断の手掛かりになるため、明示的な起動だけに限定されるわけではありません。',
    },
    {
      stem: 'Select the TWO correct statements about Skills.',
      choices: [
        'A Skill can bundle a procedure with reference files or scripts as a reusable unit',
        'Like CLAUDE.md, its content is always loaded in every session',
        'Write the description so it is clear when the Skill should be used',
        'A defined Skill is never used unless the user explicitly types its name',
      ],
      explanation: 'A Skill packages a procedure and reference resources as a reusable capability loaded when needed. Always-on loading confuses it with CLAUDE.md. Its description informs when to use it, so usage is not limited to explicit invocation only.',
    },
    ['skills', 'code-memory'],
  ),
  question(
    'q-d3-glob', 'd3', ['3.3'], 'single', ['c'],
    { difficulty: 'application', skills: ['claude-code-configuration'] },
    {
      stem: 'E2Eテストファイルにだけ適用したい記述規約があります。置き場所として最も適切なのはどれですか？',
      choices: [
        'プロジェクトCLAUDE.mdの先頭に、他の全体規約と並べて書く',
        '各テストファイルの冒頭にコメントとして書き込む',
        '対象パスにマッチするglobを指定した、パス固有のルールに書く',
        'チームのチャットツールへ規約を投稿して周知する',
      ],
      explanation: '適用範囲を対象ファイルに限定すると、無関係な作業への指示の干渉を減らせます。全体規約に混ぜると常に読み込まれ、ファイル内コメントやチャット周知は指示として参照されません。globが意図したファイルに一致するかの検証も必要です。',
    },
    {
      stem: 'You have writing conventions that should apply only to E2E test files. Which placement is most appropriate?',
      choices: [
        'At the top of the project CLAUDE.md, alongside the general conventions',
        'As a comment at the top of each test file',
        'In a path-specific rule with a glob that matches the target paths',
        'Posted to the team chat tool for awareness',
      ],
      explanation: 'Limiting scope to the target files reduces interference with unrelated work. Mixing them into global conventions loads them everywhere, and in-file comments or chat posts are not consulted as instructions. Also verify the glob matches the intended files.',
    },
    ['code-memory'],
  ),
  question(
    'q-d3-ci-design', 'd3', ['3.6'], 'multiple', ['b', 'd'],
    { difficulty: 'analysis', skills: ['workflow-enforcement', 'claude-code-workflow'] },
    {
      stem: 'Claude CodeをCIパイプラインで実行する設計として適切なものを2つ選んでください。',
      choices: [
        '権限不足による失敗を防ぐため、開発者の手元と同じ広い権限を与える',
        '成否をCIが機械判定できるよう、出力形式と終了状態を固定する',
        '確認プロンプトはそのまま残し、必要になったらCIランナー上で人が応答する',
        '非対話実行にし、必要最小限の権限だけを与える',
      ],
      explanation: 'CIでは人の確認待ちがパイプラインを停止させるため、非対話実行と最小権限が前提です。失敗は機械判定できる出力形式と終了状態で返します。開発者端末と同じ広い権限をCIへ渡してはいけません。',
    },
    {
      stem: 'Select the TWO appropriate design choices for running Claude Code in a CI pipeline.',
      choices: [
        'Grant the same broad permissions as a developer workstation to avoid failures from missing permissions',
        'Fix the output format and exit behavior so CI can evaluate success mechanically',
        'Keep confirmation prompts in place and have a person respond on the CI runner when needed',
        'Use non-interactive execution and grant only the minimum required permissions',
      ],
      explanation: 'In CI, waiting for human confirmation stalls the pipeline, so non-interactive execution with least privilege is the baseline. Report failures through a fixed output format and exit behavior that CI can evaluate. Never give CI a workstation’s broad permissions.',
    },
    ['headless'],
  ),

  question(
    'q-d4-rubric', 'd4', ['4.1', '4.2'], 'single', ['a'],
    { difficulty: 'application', skills: ['prompt-design', 'evaluation'] },
    {
      stem: '「良いコードレビューをして」という指示では結果がばらつきます。再現性を上げる方法として最も適切なのはどれですか？',
      choices: [
        '観察可能な評価基準と合否条件、代表例・境界例をプロンプトへ追加する',
        '同じ指示を複数回実行し、最も良さそうな結果を人が選ぶ',
        '「もっと厳密に」「もっと丁寧に」という形容詞を追加して強調する',
        'より大きなモデルへ切り替えれば、基準を書かなくても安定する',
      ],
      explanation: '明示したrubricが評価観点を揃え、few-shot例が抽象的な規則の適用方法を示します。形容詞の追加やモデルの変更は「良い」の定義が曖昧なままなので、ばらつきの原因を解消しません。',
    },
    {
      stem: 'The instruction “do a good code review” produces inconsistent results. Which approach most appropriately improves reproducibility?',
      choices: [
        'Add observable evaluation criteria, pass/fail conditions, and representative and edge-case examples to the prompt',
        'Run the same instruction several times and have a person pick the best-looking result',
        'Add adjectives such as “more rigorous” and “more careful” for emphasis',
        'Switch to a larger model so results stabilize without written criteria',
      ],
      explanation: 'An explicit rubric aligns the evaluation dimensions and few-shot examples show how to apply abstract rules. Extra adjectives or a model change leave the definition of “good” ambiguous, so the source of variance remains.',
    },
    ['evals', 'prompting-best'],
  ),
  question(
    'q-d4-structured-guarantee', 'd4', ['4.3'], 'single', ['d'],
    { difficulty: 'foundation', skills: ['structured-output'] },
    {
      stem: 'structured outputsでJSON Schemaを指定しました。出力について保証されるのはどれですか？',
      choices: [
        '値が業務ルール上も正しいこと（例：開始日が終了日より前）',
        '出力に含まれる事実が正確であること',
        'スキーマに沿ったうえで、内容も現実と整合していること',
        '型・必須項目・列挙値など、スキーマへ準拠した構造であること',
      ],
      explanation: 'structured outputsが保証するのは形、つまりスキーマへの準拠です。日付の前後関係のような業務ルールや事実の正確さといった中身の検証は、引き続きアプリケーション側の責任です。',
    },
    {
      stem: 'You specified a JSON Schema with structured outputs. What is guaranteed about the output?',
      choices: [
        'The values are also correct under business rules (for example, the start date precedes the end date)',
        'The facts contained in the output are accurate',
        'It follows the schema and its content is also consistent with reality',
        'A structure that complies with the schema: types, required fields, and enum values',
      ],
      explanation: 'Structured outputs guarantee the shape — compliance with the schema. Validating the content, such as business rules like date ordering or factual accuracy, remains the application’s responsibility.',
    },
    ['structured'],
  ),
  question(
    'q-d4-retry-feedback', 'd4', ['4.4'], 'single', ['b'],
    { difficulty: 'application', skills: ['failure-handling', 'structured-output'] },
    {
      stem: '構造化出力の検証で1つのフィールドだけが失敗しました。再試行の設計として最も適切なのはどれですか？',
      choices: [
        '同じプロンプトを、成功するまで無制限に再実行する',
        '失敗したフィールド・期待条件・実際の値を伝えて修正範囲を限定し、再試行の上限とフォールバックを設ける',
        '検証ルール自体を緩めて、失敗が起きないようにする',
        '出力全体を破棄し、毎回ゼロから完全に再生成させる',
      ],
      explanation: '具体的な検証結果を返すとモデルは修正点へ集中できます。同じ指示の無制限リトライは同じ失敗を再現しやすく、検証の緩和は問題を隠し、全体の再生成は正しかった部分まで危険にさらします。',
    },
    {
      stem: 'Exactly one field failed validation in a structured output. Which retry design is most appropriate?',
      choices: [
        'Re-run the identical prompt without limit until it succeeds',
        'Report the failed field, expected condition, and actual value to limit the correction scope, with a retry cap and a fallback',
        'Loosen the validation rule itself so the failure no longer occurs',
        'Discard the entire output and regenerate everything from scratch each time',
      ],
      explanation: 'Specific validation feedback lets the model focus on the fix. Unlimited retries of the same instruction tend to reproduce the same failure, loosening validation hides the problem, and full regeneration puts the already-correct parts at risk.',
    },
    ['structured', 'evals'],
  ),
  question(
    'q-d4-batch', 'd4', ['4.5'], 'multiple', ['a', 'c'],
    { difficulty: 'foundation', skills: ['throughput-and-cost', 'failure-handling'] },
    {
      stem: 'バッチ処理APIの利用について正しいものを2つ選んでください。',
      choices: [
        '即時応答が不要な大量処理を、非同期にまとめて処理する用途に向く',
        '対話型チャットの応答レイテンシを下げる手段として有効である',
        'リクエストと結果を対応付けて、個別の失敗を追跡できるように設計する',
        'バッチへまとめると、個々のリクエストが失敗することはなくなる',
      ],
      explanation: 'バッチ処理は待ち時間を許容できる大量処理に向き、即時応答が必要な対話用途には不向きです。バッチ内でも個別リクエストは失敗し得るため、リクエストIDと結果を対応付けて失敗を追跡します。',
    },
    {
      stem: 'Select the TWO correct statements about using a batch processing API.',
      choices: [
        'It suits high-volume work that does not need immediate responses, processed asynchronously in bulk',
        'It is an effective way to reduce response latency in interactive chat',
        'Design the system to associate each request with its result so individual failures can be tracked',
        'Grouping requests into a batch means individual requests can no longer fail',
      ],
      explanation: 'Batch processing fits high-volume work that tolerates latency and is unsuitable for interactive use that needs immediate responses. Individual requests can still fail inside a batch, so associate request IDs with results and track failures.',
    },
    ['batch'],
  ),

  question(
    'q-d5-summarize', 'd5', ['5.1'], 'single', ['c'],
    { difficulty: 'application', skills: ['context-management', 'structured-output'] },
    {
      stem: '長いセッションの履歴を圧縮します。重要な決定事項や識別子の扱いとして最も適切なのはどれですか？',
      choices: [
        '要約文へ自然に含まれるはずなので、特別な扱いは不要である',
        '情報損失を避けるため、履歴は圧縮せず全文を保持し続ける',
        '要約とは別に、構造化した状態として分離して保持する',
        '古い履歴は関連性が低いので、決定事項ごと無条件に削除する',
      ],
      explanation: '要約は履歴を圧縮できますが細部を落とす性質があるため、ID・金額・決定事項などの重要事実は構造化して分離保持します。全文の無制限保持は関連性低下とコスト増を招き、無条件削除は継続に必要な事実を失います。',
    },
    {
      stem: 'You are compressing a long session history. What is the most appropriate treatment of critical decisions and identifiers?',
      choices: [
        'No special handling is needed because they will naturally appear in the summary prose',
        'Keep the full history uncompressed to avoid any information loss',
        'Preserve them separately from the summary as structured state',
        'Old history has low relevance, so delete it unconditionally, decisions included',
      ],
      explanation: 'Summaries compress history but naturally lose detail, so keep critical facts such as IDs, amounts, and decisions separated as structured state. Retaining everything degrades relevance and raises cost, and unconditional deletion loses facts needed for continuation.',
    },
    ['context-windows', 'context-editing'],
  ),
  question(
    'q-d5-escalation', 'd5', ['5.2', '5.5'], 'single', ['d'],
    { difficulty: 'application', skills: ['human-oversight', 'workflow-enforcement'] },
    {
      stem: '高額な返金の承認を人へエスカレーションする条件の設計として最も適切なのはどれですか？',
      choices: [
        'モデルが自己申告する確信度が、閾値を下回ったときだけ人へ渡す',
        '全件を人がレビューし、エージェントは下書きの作成だけを担当する',
        '処理が失敗した後にのみ、リカバリとして人へ渡す',
        '金額・権限・例外種別・曖昧さなど、外部から検証できる条件でルーティングする',
      ],
      explanation: '人による確認は失敗後の逃げ道ではなく、最初から設計する制御点です。自己申告の確信度だけでは信頼できず、全件レビューはリスクに関係なく人手を消費します。外部から検証できる条件がルーティングの基準になります。',
    },
    {
      stem: 'Which design is most appropriate for the conditions that escalate approval of a high-value refund to a person?',
      choices: [
        'Hand off to a person only when the model’s self-reported confidence drops below a threshold',
        'Have people review every case, with the agent only drafting responses',
        'Hand off to a person only after the processing has failed, as recovery',
        'Route using externally verifiable conditions such as amount, permissions, exception type, and ambiguity',
      ],
      explanation: 'Human review is a control point designed from the outset, not an escape route after failure. Self-reported confidence alone is unreliable, and reviewing every case spends human effort regardless of risk. Externally verifiable conditions are the routing criteria.',
    },
    ['user-input', 'evals'],
  ),
  question(
    'q-d5-provenance', 'd5', ['5.3', '5.6'], 'multiple', ['b', 'c'],
    { difficulty: 'analysis', skills: ['structured-output', 'orchestration'] },
    {
      stem: '複数の調査エージェントの結果を統合するとき、出典の扱いとして適切なものを2つ選んでください。',
      choices: [
        'レポート末尾へ参照URLを一覧で載せれば、主張との対応付けは不要である',
        '各主張とsource IDの対応を構造化出力で受け取り、統合後もその対応を保持する',
        '出典が付いていても、内容が主張を支えているかと情報の新しさを確認する',
        '出典が明記された主張は、事実として検証済みとみなしてよい',
      ],
      explanation: '末尾のURL一覧では、どの根拠がどの主張を支えるか分かりません。claim-sourceの対応を構造化して統合後まで運びます。出典の存在自体は正しさを保証しないため、内容の一致と情報の新しさを別途確認します。',
    },
    {
      stem: 'When integrating results from multiple research agents, select the TWO appropriate ways to handle sources.',
      choices: [
        'Listing reference URLs at the end of the report makes claim-level mapping unnecessary',
        'Receive claim-to-source-ID mappings as structured output and preserve them after integration',
        'Even when a source is attached, check that it supports the claim and that the information is current',
        'A claim with an explicit source can be treated as a verified fact',
      ],
      explanation: 'A URL list at the end does not show which evidence supports which claim; carry claim-to-source mappings in structured form through integration. The presence of a source does not guarantee correctness, so verify support and freshness separately.',
    },
    ['structured'],
  ),

  // --- Scenario-practice questions ---
  // Answered with the fictional case in scenarios.ts in view; excluded from the
  // standalone random quiz pool. Independently authored like everything above.
  question(
    'q-sc-mcp-surface', 'd2', ['2.3'], 'single', ['b'],
    { difficulty: 'analysis', skills: ['tool-design', 'orchestration'] },
    {
      stem: '北斗ロジスティクスのプラットフォームチームは、40個のツールを利用場面ごとにいくつかのグループへ再設計しました。ある開発者が「取り違えをさらに防ぐため、各グループを1操作だけを担う専門エージェントへ何十個も分割し、操作のたびにハンドオフする」構成を追加提案しました。この提案を評価する着眼点として最も適切なのはどれですか？',
      choices: [
        '専門エージェントの数を増やすほど1つ1つの責任が明確になるため、分割数に上限を設ける必要はない',
        '典型的な作業に必要なツール呼び出しの回数と、分割で増えるエージェント間の往復・ハンドオフの回数を見比べ、往復が典型的な作業を遅くしない粒度を選ぶ',
        '専門エージェントへ分割すればツール取り違えの問題自体がなくなるため、提案どおり進めてよい',
        'モデルの温度を下げれば分割数によらず選択ミスは抑えられるため、分割数は気にしなくてよい',
      ],
      explanation: '分割は取り違えを減らす一方で、操作のたびに発生するハンドオフや往復コストを増やします。典型的な作業がいくつのツール呼び出しで完結するかを基準に、往復コストが作業を遅くしない粒度を選ぶのが本質的な判断です。上限なしの細分化や温度調整は、この往復コストというトレードオフに触れていません。',
    },
    {
      stem: 'Hokuto Logistics’ platform team has regrouped the forty tools into a handful of groups by use case. A developer now proposes going further: splitting each group into dozens of specialized single-operation agents, handing off between them for every operation, to cut down mix-ups even more. Which consideration best evaluates this proposal?',
      choices: [
        'More specialized agents always make responsibilities clearer, so there is no need to cap how far the split goes',
        'Compare how many tool calls a typical task needs against the extra inter-agent round trips and handoffs the split introduces, and pick a granularity where those round trips do not slow the typical task down',
        'Splitting into specialized agents removes the tool mix-up problem entirely, so the proposal can proceed as described',
        'Lowering the model’s temperature suppresses selection mistakes regardless of how far the split goes, so the degree of splitting does not matter',
      ],
      explanation: 'Splitting reduces mix-ups but adds a handoff and round trip for every operation. The right basis for the decision is how many tool calls a typical task needs versus the extra round trips the split adds, choosing a granularity where those round trips do not slow the typical task down. Splitting without a cap, or adjusting temperature, never engages with that round-trip trade-off.',
    },
    ['sdk-features', 'tool-use'],
    { scenarioId: 'sc-mcp-tool-design', verifiedAt: '2026-09-29', revision: 2 },
  ),
  question(
    'q-sc-mcp-args', 'd2', ['2.1'], 'single', ['b'],
    { difficulty: 'application', skills: ['tool-design', 'mcp-integration'] },
    {
      stem: '日付やIDの引数形式の誤りが続いています。ツール定義側の対策として最も適切なのはどれですか？',
      choices: [
        '引数を自由記述の文字列に統一し、サーバー側で柔軟に解釈する',
        '入力のJSON Schemaで型・形式・制約を宣言し、説明文に利用条件と境界を明記する',
        '正しい引数例を社内Wikiにまとめ、開発者がプロンプトへ貼るよう周知する',
        '引数検証を廃止し、失敗したらエージェントに再試行させる',
      ],
      explanation: 'ツール定義はモデルが入力生成に使う契約なので、スキーマで構造を宣言し、説明文で利用条件を伝えるのが正攻法です。自由記述は曖昧さを増やし、Wikiはモデルの選択時に参照されず、検証の廃止は誤りを下流へ流します。',
    },
    {
      stem: 'Malformed date and ID arguments keep appearing. Which tool-definition measure is most appropriate?',
      choices: [
        'Unify the arguments as free-form strings and interpret them flexibly on the server',
        'Declare types, formats, and constraints in the input JSON Schema, and state usage conditions and boundaries in the description',
        'Collect correct argument examples in an internal wiki and ask developers to paste them into prompts',
        'Drop argument validation and let the agent retry when calls fail',
      ],
      explanation: 'A tool definition is the contract the model uses to generate inputs, so declare the structure in the schema and communicate usage conditions in the description. Free-form strings add ambiguity, a wiki is not consulted at selection time, and dropping validation pushes errors downstream.',
    },
    ['define-tools', 'mcp-tools'],
    { scenarioId: 'sc-mcp-tool-design', verifiedAt: SCENARIO_VERIFIED_AT },
  ),
  question(
    'q-sc-mcp-carrier-error', 'd2', ['2.2'], 'multiple', ['b', 'd'],
    { difficulty: 'analysis', skills: ['failure-handling', 'tool-design'] },
    {
      stem: '一括登録ツール「registerShipmentsBulk」で10件中数件だけが配送業者APIのレート制限で拒否されました。エージェントが失敗した項目だけを適切に再試行できるツール応答を2つ選んでください。',
      choices: [
        '1件でも拒否があれば呼び出し全体を「失敗」として返すことにし、成功していた項目も区別せず全件を最初からまとめて再送させる',
        '項目ごとに成功・失敗と再試行可能性を構造化して返し、エージェントが失敗した項目だけを再試行できるようにする',
        '一部が拒否されても呼び出し全体を「成功」として返し、失敗した項目は次回の定期同期に任せる',
        '失敗した項目には再送時の対応付けに使う識別子（配送番号など）を添えて返し、取り違えずに再送できるようにする',
      ],
      explanation: '部分失敗を項目単位の構造化データとして返せば、エージェントは成功済みの項目を再送せず、失敗した項目だけを再試行できます。全体を1つの失敗として畳み込むと不要な再送が生じ、全体を成功として畳み込むと失敗が握りつぶされて後続処理に誤りが伝播します。',
    },
    {
      stem: 'The bulk registration tool “registerShipmentsBulk” had a few records out of ten rejected by the carrier API’s rate limit. Select the TWO tool responses that let the agent correctly retry only the failed records.',
      choices: [
        'Return the entire call as a single "failure" whenever even one record is rejected, and resubmit all ten records including the ones that succeeded',
        'Return each record’s success or failure and its retryability as structured data, so the agent can retry only the records that failed',
        'Return the entire call as a single "success" even when some records were rejected, leaving the failed ones for the next scheduled sync',
        'For each failed record, return the per-record identifier (such as a shipment number) used to match it on resubmission, so the agent can resend exactly that record without mixing it up with another',
      ],
      explanation: 'Returning partial failure as per-record structured data lets the agent skip records that already succeeded and retry only the ones that failed. Collapsing the whole call into one failure causes needless resubmission, and collapsing it into one success buries the failure and lets it propagate downstream unnoticed.',
    },
    ['mcp-tools', 'tool-use'],
    { scenarioId: 'sc-mcp-tool-design', verifiedAt: '2026-09-29', revision: 2 },
  ),
  question(
    'q-sc-mcp-token', 'd2', ['2.4'], 'single', ['c'],
    { difficulty: 'application', skills: ['mcp-integration', 'claude-code-configuration'] },
    {
      stem: '配送業者の本番APIに接続するMCPサーバーと、ある開発者が個人のサンドボックスアカウントだけで動作確認に使うMCPサーバーがあります。それぞれの導入スコープの選び方として最も適切なのはどれですか？',
      choices: [
        '両方とも接続定義と認証情報を `.mcp.json` に書き、プロジェクトスコープでバージョン管理する',
        '両方とも local scope で登録し、誰とも共有しない設定のままにする',
        '本番用は接続定義を `.mcp.json` で共有して認証情報を各自の環境変数から読ませ、サンドボックス用は local か user scope に留める',
        '個人のサンドボックス用サーバーの認証情報を、チームメンバーが試せるようプロジェクトスコープの `.mcp.json` に書いてコミットする',
      ],
      explanation: 'チーム全員が使うべき接続定義はプロジェクトスコープで共有し、認証情報自体は各自の環境から解決させます。個人しか意味を持たない認証情報を使うサーバーは、共有スコープに置かず local か user scope に留めます。',
    },
    {
      stem: 'One MCP server connects to the carrier’s production API; another is one a developer uses only to test against their own personal sandbox account. What is the most appropriate way to choose the installation scope for each?',
      choices: [
        'Write both the connection definition and the credential into `.mcp.json` and version-control both at project scope',
        'Register both at local scope and leave them unshared with anyone',
        'Share the production server’s definition via project-scoped `.mcp.json` with the credential read from each person’s environment, and keep the sandbox server at local or user scope',
        'Commit the personal sandbox server’s credential into the project-scoped `.mcp.json` so teammates can try it',
      ],
      explanation: 'A connection definition the whole team should use belongs at project scope, with the credential itself resolved from each person’s own environment. A server whose credential means something only to one person should stay at local or user scope, not in a shared scope.',
    },
    ['code-mcp', 'mcp-tools'],
    { scenarioId: 'sc-mcp-tool-design', verifiedAt: '2026-09-29', revision: 2 },
  ),

  question(
    'q-sc-support-parallel', 'd1', ['1.2', '1.6'], 'single', ['b'],
    { difficulty: 'application', skills: ['orchestration'] },
    {
      stem: 'さくらマーケットの返金対応では、本人確認から返金実行までの手順は社内規定で固定されている一方、返金理由を調べる過程で次に何を確認すべきかは問い合わせごとに変わります。タスク分解の設計として最も適切なのはどれですか？',
      choices: [
        '本人確認や返金実行のような規定で決まった手順も、実行時にエージェントがそのつど分解の要否を判断する動的な構成にする',
        '本人確認・返金実行のように規定で決まった既知の手順は固定のワークフローにし、調査結果に応じて次の確認内容が変わる部分は実行時に動的に分解する',
        '調査で何を確認すべきかも含め、規定文書に書かれた内容をすべて事前に固定のフローチャートへ落とし込んでおく',
        '分解の方式は各工程の性質にかかわらず常に一種類へ統一するべきであり、同一の対応フロー内で固定的な手順と動的な分解を混在させることは避けるべきである',
      ],
      explanation: '本人確認から返金実行までは規定で決まった既知の手順なので、固定のワークフローにして毎回同じ順序で確実に実行するのが適切です。一方、返金理由の調査で次に何を確認すべきかは問い合わせごとに変わるため、その部分は実行時の発見に応じて動的に分解します。既知の手順まで動的にする、逆に調査結果次第の部分まで事前に固定化する、分解方式を一種類に統一するという判断は、いずれも予測可能な工程と実行時に発見される工程を区別できていません。',
    },
    {
      stem: 'At Sakura Market’s refund handling, the steps from identity verification through executing the refund are fixed by internal policy, while what to check next while investigating the refund reason varies from inquiry to inquiry. Which task-decomposition design is most appropriate?',
      choices: [
        'Make even the policy-fixed steps, such as identity verification and refund execution, a dynamic structure where the agent decides at runtime whether to decompose them each time',
        'Make the known, policy-fixed steps — identity verification and refund execution — a fixed workflow, and decompose dynamically at runtime the part where the next thing to check depends on what the investigation finds',
        'Pre-encode everything into a fixed flowchart in advance, including what to check during the investigation',
        'Decomposition should always be unified into a single style regardless of what a given step is like, and fixed and dynamic decomposition should never be mixed within the same handling flow',
      ],
      explanation: 'Identity verification through refund execution is a known procedure fixed by policy, so encoding it as a fixed workflow executed the same way every time is appropriate. What to check next while investigating the refund reason varies by inquiry, so that part should be decomposed dynamically based on what is discovered at runtime. Making the known steps dynamic, pre-fixing the investigation-dependent part, or insisting on one uniform decomposition style all fail to distinguish predictable steps from steps discovered at runtime.',
    },
    ['subagents', 'sdk-features'],
    { scenarioId: 'sc-support-agents', verifiedAt: '2026-09-29', revision: 2 },
  ),
  question(
    'q-sc-support-worker-contract', 'd1', ['1.3'], 'single', ['b'],
    { difficulty: 'application', skills: ['orchestration', 'context-management'] },
    {
      stem: 'オーケストレーターから分類別のワーカーエージェントへ問い合わせ対応を委譲します。起動時の設計として最も適切なのはどれですか？',
      choices: [
        'ワーカーは親の会話を自動で参照できるため、問い合わせIDだけを渡す',
        '対応に必要な顧客情報・期待する出力形式・完了と失敗の条件を明示して渡す',
        '毎回、会話履歴全体をそのままワーカーへコピーして判断を任せる',
        '出力形式は固定せず、ワーカーごとの自由な形式で返させて柔軟性を保つ',
      ],
      explanation: 'サブエージェントが親の文脈を暗黙に見られる前提は誤りで、必要十分な入力と出力契約、終了条件を明示して渡します。全履歴のコピーはコンテキストを浪費し、自由形式の返答はオーケストレーター側で統合できません。',
    },
    {
      stem: 'The orchestrator delegates inquiries to per-category worker agents. Which invocation design is most appropriate?',
      choices: [
        'Pass only the inquiry ID because workers can automatically see the parent conversation',
        'Pass the customer information the work needs, the expected output format, and the completion and failure conditions explicitly',
        'Copy the entire conversation history to the worker every time and let it decide',
        'Leave the output format open so each worker replies in its own style for flexibility',
      ],
      explanation: 'Assuming a subagent implicitly sees the parent context is a mistake; pass sufficient input, an output contract, and stopping conditions explicitly. Copying the full history wastes context, and free-form replies cannot be integrated by the orchestrator.',
    },
    ['subagents'],
    { scenarioId: 'sc-support-agents', verifiedAt: SCENARIO_VERIFIED_AT },
  ),
  question(
    'q-sc-support-escalation', 'd5', ['5.2', '5.5'], 'single', ['b'],
    { difficulty: 'analysis', skills: ['human-oversight', 'evaluation'] },
    {
      stem: '返金対応の運用開始後、人間の承認者へ回された案件について、判断の質を継続的に確認する体制を設計します。最も適切な運用はどれですか？',
      choices: [
        '承認フローに回った案件全体の承認率など、全体平均の指標だけを継続的に追跡すれば十分である',
        '金額帯や返金理由の種類などカテゴリ別に判断の質を評価し、悪化しているカテゴリが見つかったらルーティング条件やエージェントのプロンプトへ反映する',
        'レビュアーが見つけた指摘はその案件だけの個別の是正にとどめておき、ルーティング条件や返金対応エージェントのプロンプトへの恒常的な反映は一切行わない',
        '過去に一度でも誤って処理された顧客の案件だけをレビュー対象にする',
      ],
      explanation: '全体平均だけでは、特定のカテゴリで悪化していても隠れてしまいます。カテゴリ別に質を測り、その結果をルーティング条件やプロンプトの改善へ戻すことで、レビューが一過性の是正で終わらず運用全体の精度を上げます。全体平均のみの追跡、指摘を個別対応で終わらせる運用、対象を過去の誤り案件だけに絞るサンプリングは、いずれもこの改善ループを成立させません。',
    },
    {
      stem: 'After the refund workflow launches, you are designing how to continuously check the quality of decisions on cases routed to a human approver. Which approach is most appropriate?',
      choices: [
        'Track only an overall-average metric, such as the approval rate across all routed cases',
        'Evaluate decision quality by category — such as amount range or refund reason — and feed findings from any category that is degrading back into the routing conditions or the agent’s prompt',
        'Keep reviewer findings limited to correcting that individual case, without feeding them back into lasting changes to routing conditions or the prompt',
        'Limit the review pool to only customers who have had a mishandled case at least once before',
      ],
      explanation: 'An overall average can hide degradation in a specific category. Measuring quality by category and feeding the results back into routing conditions or the prompt turns review into an improvement loop rather than a one-off fix, raising accuracy across the whole operation. Tracking only the overall average, treating findings as case-by-case fixes only, or restricting review to a biased sample of past-mistake customers all fail to close that loop.',
    },
    ['user-input', 'evals'],
    { scenarioId: 'sc-support-agents', verifiedAt: '2026-09-29', revision: 2 },
  ),
  question(
    'q-sc-support-context', 'd5', ['5.1'], 'multiple', ['a', 'c'],
    { difficulty: 'analysis', skills: ['context-management', 'human-oversight'] },
    {
      stem: 'さくらマーケットのある問い合わせは、当日中に解決せず翌日へ持ち越しになりました。翌日は別の担当者が引き継いで対応を再開します。引き継ぎの記録に含めるべき情報として適切なものを2つ選んでください。',
      choices: [
        '顧客にすでに約束した未完了の対応（返金予定日や折り返しの予定など）と、次に取るべき具体的な行動',
        '前日の会話ログ全文を1つのテキストとしてそのまま添付し、必要な情報は担当者に読み取らせる',
        '本人確認など既に確認済みの事項と、まだ確認できていない事項を区別して記録する',
        '前日のやり取りを1段落に要約した文章だけを残し、個別の項目には分けない',
      ],
      explanation: '翌日の担当者が対応を再開するには、顧客への未完了の約束と次にすべき行動、そして何が確認済みで何が未確認かを、会話文に埋もれない形で明示しておく必要があります。前日のログを丸ごと渡す、あるいは1段落の要約だけを残すという扱いは、どちらもこれらの項目を担当者が改めて会話から探し出す手間を残し、見落としの元になります。',
    },
    {
      stem: 'An inquiry at Sakura Market was not resolved the same day, and a different agent picks it up the next day to resume the case. Select the TWO items that belong in the handoff record.',
      choices: [
        'Commitments already made to the customer that are still open (a promised refund date, a promised callback, etc.) and the concrete next action to take',
        'The entire previous day’s chat log attached as a single block of text, leaving the agent to read out what it needs',
        'Which facts are already verified (such as identity verification) and which are still unverified, recorded as a distinction',
        'Only a one-paragraph summary of the previous day’s exchange, with nothing broken out into individual items',
      ],
      explanation: 'For the next day’s agent to resume the case, the commitments already made to the customer, the concrete next step, and which facts are already verified versus still open need to be made explicit rather than buried in prose. Handing over the entire raw log, or leaving only a one-paragraph summary, both leave the agent to dig these items back out of the conversation, inviting something to be missed.',
    },
    ['context-editing'],
    { scenarioId: 'sc-support-agents', verifiedAt: '2026-09-29', revision: 2 },
  ),

  question(
    'q-sc-code-conventions', 'd3', ['3.1'], 'single', ['c'],
    { difficulty: 'application', skills: ['claude-code-configuration'] },
    {
      stem: 'あおぞらペイでは規約をCLAUDE.mdへ集約しましたが、追加の要望が出ました。決済サービスの実装ディレクトリ（services/payments/）だけに適用したい規約があり、また各自のエディタ設定のような個人の好みはリポジトリへコミットしたくありません。この2つを、全員とCIに適用する既存の共通規約と両立させる配置として最も適切なのはどれですか？',
      choices: [
        '個人の好みも決済サービス固有の規約も、リポジトリ直下のCLAUDE.local.mdへまとめて書き、.gitignoreへ加える',
        '決済サービス固有の規約は各自の ~/.claude/CLAUDE.md に書き、個人の好みはプロジェクトのCLAUDE.mdに書く',
        '個人の好みは各自の ~/.claude/CLAUDE.md、共通規約はプロジェクトのCLAUDE.md、決済固有の規約は services/payments/ 配下のCLAUDE.mdに書く',
        'すべての規約を1つのプロジェクトCLAUDE.mdへ書き、個人の好みもそこへ追記してバージョン管理する',
      ],
      explanation: '個人の好みは共有されない~/.claude/CLAUDE.mdへ、チーム共通規約はバージョン管理されるプロジェクトCLAUDE.mdへ、特定ディレクトリだけの規約はそのディレクトリ配下のCLAUDE.mdへ置くと、範囲と共有先が要望に一致します。これらは上書きし合わず連結して読み込まれます。CLAUDE.local.mdは.gitignoreへ自分で加える必要がある個人用ファイルでチームやCIには共有されず、逆に置く配置は共有範囲を取り違え、1つのファイルへ集約すると個人の好みまで全員へ配られます。',
    },
    {
      stem: 'At Aozora Pay, conventions were consolidated into CLAUDE.md, but two new requests came in: rules that should apply only to the payment service’s implementation directory (services/payments/), and a wish to keep personal preferences, such as individual editor settings, out of the committed repository. Which placement best satisfies both alongside the existing shared rules for the whole team and CI?',
      choices: [
        'Put both the personal preferences and the payments-specific rules into a CLAUDE.local.md at the repository root and add it to .gitignore',
        'Put the payments-specific rules in each developer’s ~/.claude/CLAUDE.md, and put personal preferences in the project CLAUDE.md',
        'Put personal preferences in each developer’s ~/.claude/CLAUDE.md, shared rules in the project CLAUDE.md, and payments rules in a CLAUDE.md under services/payments/',
        'Write every convention into one project CLAUDE.md, including personal preferences, and version-control all of it',
      ],
      explanation: 'Personal preferences belong in the unshared ~/.claude/CLAUDE.md, team-wide rules in the version-controlled project CLAUDE.md, and rules for one directory in a CLAUDE.md under that directory — each scope then matches who it should reach, and the layers concatenate rather than overriding each other. CLAUDE.local.md is a personal file you must add to .gitignore yourself, so it never reaches teammates or CI, the swapped placement mismatches scope and audience, and merging everything into one file distributes personal preferences to the whole team.',
    },
    ['code-memory'],
    { scenarioId: 'sc-code-rollout', verifiedAt: '2026-09-29', revision: 2 },
  ),
  question(
    'q-sc-code-e2e-rules', 'd3', ['3.3'], 'single', ['b'],
    { difficulty: 'analysis', skills: ['claude-code-configuration'] },
    {
      stem: 'あおぞらペイは .claude/rules/e2e.md に paths: ["tests/**/*.spec.ts"] を指定してE2Eの記述規約を書きました。しかし実際のE2Eテストは e2e/ ディレクトリ配下に置かれており、tests/ には単体テストしかありません。さらにこの規約の一部は、プロジェクトCLAUDE.mdの全体規約とも内容が重複していました。最も適切な対処はどれですか？',
      choices: [
        '全体規約との重複はそのままにしておき、paths だけを実際のE2Eテストの場所である "e2e/**/*.spec.ts" に修正するだけにとどめておく',
        'paths を実際のE2Eテストの場所である "e2e/**/*.spec.ts" に修正し、全体規約と重複する記述はこのファイルから削除する',
        'globの記述はそのままにして、全体規約との重複部分だけをこのファイルから削除する',
        'globでの絞り込みをやめ、この規約の全文をプロジェクトCLAUDE.mdへ統合する',
      ],
      explanation: 'パス固有ルールは、指定したglobに一致するファイルを扱うときだけ適用されます。globが実際のE2Eテストの場所と一致していなければ、このルールは一度も読み込まれません。加えて全体規約との重複は、内容が食い違った際にどちらに従うか不明確になる原因なので合わせて取り除きます。globの放置や統合はどちらも根本原因の一方しか、あるいはいずれも解決しません。',
    },
    {
      stem: 'At Aozora Pay, .claude/rules/e2e.md sets paths: ["tests/**/*.spec.ts"] for E2E writing conventions. But the E2E specs actually live under e2e/, and tests/ holds only unit tests. Part of this rule also duplicates content already in the project CLAUDE.md’s general conventions. What is the most appropriate fix?',
      choices: [
        'Leave the duplication with the general conventions as is, and only fix paths to the E2E specs’ real location, "e2e/**/*.spec.ts"',
        'Fix paths to the E2E specs’ real location, "e2e/**/*.spec.ts", and also remove the content from this file that duplicates the general conventions',
        'Leave the glob as is, and only remove the part that duplicates the general conventions',
        'Drop the glob scoping and merge this rule’s full text into the project CLAUDE.md',
      ],
      explanation: 'A path-specific rule applies only when Claude works with files matching its glob. If the glob doesn’t match where the E2E specs actually live, the rule never loads at all. Leftover duplication with the general conventions is a separate risk: if the two drift apart, which one to follow becomes unclear. Fixing only one of the two problems, or merging into CLAUDE.md instead, leaves at least one cause unaddressed.',
    },
    ['code-memory'],
    { scenarioId: 'sc-code-rollout', verifiedAt: '2026-09-29', revision: 2 },
  ),
  question(
    'q-sc-code-skill', 'd3', ['3.2'], 'multiple', ['a', 'c'],
    { difficulty: 'application', skills: ['claude-code-configuration', 'context-management'] },
    {
      stem: 'リリースノート下書きのSkillを運用し始めたところ、手順書に加えてテンプレート例や過去の全リリースノートの抜粋まで本体（SKILL.md）へ書き込んでしまい、起動のたびに長い内容が読み込まれるようになりました。設計を見直す方針として適切なものを2つ選んでください。',
      choices: [
        '本体は実行に必要な手順の要点にとどめ、詳しいテンプレート例や過去ログのような参照情報は減らし、Skillが実際に呼び出されたときだけ読み込まれる内容に絞る',
        'あらゆる利用場面を取りこぼさないよう、説明文(description)には思いつく限りの背景情報を書き足しておく',
        'テンプレート例や過去ログのような参照情報は本体に書き込まず、必要になったときだけ読み込まれる別ファイルに分け、本体からはそのファイルへの参照だけを残す',
        '一度読み込んでおけば以降のやり取りで二度と参照し直さずに済むように、テンプレートや過去ログの詳細な情報も含めてすべてを本体へあらかじめ漏れなくまとめて書き込んでおく',
      ],
      explanation: 'Skillは、起動判断に使う説明文などのメタデータと、実際に呼び出されたときだけ読み込まれる本体を分けて設計できます。本体は要点に絞り、テンプレートや過去ログのような参照資料は別ファイルへ分けて必要なときだけ読み込ませると、無関係な作業のコンテキストを圧迫しません。説明文を情報で埋め尽くす発想や、詳細をすべて本体へ事前集約する発想は、いずれもこの分離を無視しています。',
    },
    {
      stem: 'After putting the release-notes Skill into use, the template examples and excerpts from past release notes ended up written directly into the SKILL.md body alongside the procedure, so a long block of content loads every time the Skill runs. Select the TWO appropriate ways to revise the design.',
      choices: [
        'Keep the body to the essential steps needed to execute, trim reference material such as detailed templates and past logs, and keep the content to what actually needs to load when the Skill is invoked',
        'To avoid missing any use case, keep adding background information to the description for as long as you can think of more',
        'Move reference material such as template examples and past logs out of the body into separate files that load only when needed, and leave only a reference to those files in the body',
        'Pre-consolidate everything, details included, into the body so nothing needs to be looked up again in later turns',
      ],
      explanation: 'A Skill can separate the metadata Claude consults when deciding whether to invoke it from the body, which loads only when the Skill is actually invoked. Keeping the body to essentials and splitting reference material such as templates and past logs into separate files that load only when needed avoids crowding the context of unrelated work. Piling background into the description, or pre-consolidating every detail into the body regardless, both ignore that separation.',
    },
    ['skills'],
    { scenarioId: 'sc-code-rollout', verifiedAt: '2026-09-29', revision: 2 },
  ),
  question(
    'q-sc-code-ci', 'd3', ['3.6'], 'multiple', ['a', 'b'],
    { difficulty: 'analysis', skills: ['workflow-enforcement', 'evaluation'] },
    {
      stem: 'CIのPRレビュージョブは、誤検知の調整を終えた後も、指摘を人がプルリクエストを開くたびに本文から読んで判断しており、重大度による自動ブロックができていません。CI側で指摘を機械的に扱えるようにする設計として適切なものを2つ選んでください。',
      choices: [
        '`--json-schema` で指摘を file・line・severity を持つ配列として受け取り、severityがhighなら失敗させる',
        'レビュー対象は `git diff` で得られるPRの差分だけをClaudeへ渡し、変更していない既存ファイル全体は読み込ませない',
        '出力は自然文の要約のままにし、重大度の判断は人がプルリクエストを開くたびに本文を読んで行う',
        '指摘の一覧はプルリクエストごとにテキストファイルへ保存するだけにとどめておき、その内容をCIジョブの成否判定には一切使わないまま運用を続ける',
      ],
      explanation: '`--json-schema` を指定した構造化出力を使うと、指摘をfile・line・severityなどのフィールドを持つ配列として受け取れるため、severityを基準にCIが機械的に合否を判定できます。加えて、レビュー対象をPRの差分に絞ってClaudeへ渡すと、変更していない既存コードまで読み込ませずに済みます。出力を自然文の要約のままにする、あるいは指摘を保存するだけでCIの合否に使わない設計は、いずれも3.6が求める機械判定可能なCI連携になっていません。',
    },
    {
      stem: 'Even after tuning down false positives, the CI pull-request review job still requires a person to open each pull request and read the findings from its body, with no automatic blocking by severity. Select the TWO appropriate ways to let CI handle the findings mechanically.',
      choices: [
        'Use structured output with `--json-schema` to receive findings as an array of fields such as file, line, and severity, and fail the job whenever any finding has severity high',
        'Pass Claude only the PR diff obtained from `git diff` as the review target, without loading the full contents of unchanged existing files',
        'Leave the output as a prose summary and have a person judge severity by reading the body every time a pull request is opened',
        'Only save the list of findings to a text file, without using it to decide the CI job’s pass/fail result',
      ],
      explanation: 'Structured output with `--json-schema` returns findings as an array with fields such as file, line, and severity, so CI can judge pass/fail mechanically based on severity. Scoping the review input to the PR diff also means Claude doesn’t have to read through unchanged existing code. Leaving the output as prose, or saving findings without ever consulting them for the CI verdict, both fall short of the machine-judgeable CI integration 3.6 requires.',
    },
    ['headless'],
    { scenarioId: 'sc-code-rollout', verifiedAt: '2026-09-29', revision: 2 },
  ),
  question(
    'q-sc-code-mcp-config', 'd2', ['2.4'], 'single', ['c'],
    { difficulty: 'application', skills: ['mcp-integration', 'claude-code-configuration'] },
    {
      stem: 'あおぞらペイはチケット管理MCPサーバーの接続設定を .mcp.json としてリポジトリにコミットし、プロジェクトスコープで共有しました。認証トークンは設定に直書きせず ${TICKET_API_TOKEN} という環境変数参照にしました。チームメンバーが初めてこのリポジトリを開いて対話セッションを使う場合と、来期予定のCI（claude -p によるレビュー要約ジョブ）でこの設定が使われる場合について、正しい記述はどれですか？',
      choices: [
        'リポジトリにコミットした時点で承認済み扱いになり、対話セッションでも claude -p のような非対話実行でも常に確認なしで使われる',
        '対話セッションでも claude -p のような非対話実行でも、プロジェクトスコープのMCPサーバーは常に承認プロンプトを表示し続け、承認されるまではCIのジョブであっても一切使われないまま延々と待たされ続けることになる',
        '対話セッションでは初回、プロジェクトスコープのMCPサーバーを使う前に承認を求めるプロンプトが表示されるが、claude -p のような非対話実行ではそのプロンプトを出せず、承認なしにそのまま読み込まれる',
        '${TICKET_API_TOKEN} のような環境変数参照はClaude Codeでは展開されないため、実際のトークン文字列を設定に直接書く必要がある',
      ],
      explanation: '対話セッションでは、プロジェクトスコープのMCPサーバーを使う前にセキュリティ上の理由で承認プロンプトが表示されますが、claude -p やAgent SDKセッション、クラウドセッションのような非対話実行ではそのプロンプトを出せず、承認なしにそのまま読み込まれます。また ${VAR} 形式の環境変数参照はenvやheadersなどで展開されるため、直書きは不要です。',
    },
    {
      stem: 'Aozora Pay committed the ticket-system MCP server connection settings as .mcp.json to the repository and shared it at project scope. Instead of writing the auth token directly into the config, they used an environment-variable reference, ${TICKET_API_TOKEN}. Which statement is correct about what happens when a teammate opens this repository for the first time in an interactive session, versus when it is used by next quarter’s CI (a review-summarization job run via claude -p)?',
      choices: [
        'Once committed to the repository, it counts as already approved, and it is used without any confirmation in both interactive sessions and non-interactive runs like claude -p',
        'In both interactive sessions and non-interactive runs like claude -p, a project-scoped MCP server always shows an approval prompt and is never used until approved',
        'In an interactive session, the first use shows an approval prompt before a project-scoped MCP server is used, but a non-interactive run like claude -p cannot show that prompt and loads the server without asking',
        'Environment-variable references like ${TICKET_API_TOKEN} are not expanded by Claude Code, so the actual token string must be written directly into the configuration',
      ],
      explanation: 'For security reasons, an interactive session shows an approval prompt before using a project-scoped MCP server, but non-interactive execution — claude -p runs, Agent SDK sessions, and cloud sessions — cannot show that prompt and loads project-scoped servers without asking. ${VAR}-style environment-variable references are expanded in fields such as env and headers, so writing the token directly is unnecessary.',
    },
    ['code-mcp'],
    { scenarioId: 'sc-code-rollout', verifiedAt: '2026-09-29', revision: 2 },
  ),
  question(
    'q-sc-pipe-validation', 'd4', ['4.6'], 'single', ['a'],
    { difficulty: 'application', skills: ['structured-output', 'evaluation'] },
    {
      stem: '全10回にわたる連載記事から人物・出来事を抽出します。各回を独立したパスで抽出したうえで、その出力を統合パスへ渡す入力の設計として、最も適切なのはどれですか？',
      choices: [
        '各回の抽出結果を、値ごとにどの回・どの記述から得たかを示すフィールドを添えた構造化データとして統合パスへ渡す',
        '各回の抽出結果を要約した自然文の説明だけを統合パスへ渡し、値の位置情報は含めない',
        '各回の抽出結果はいったん使わず、元の記事本文10回分をすべてそのまま統合パスへまとめて渡し、そこであらためて最初から抽出させる',
        '最終回のパスの抽出結果だけを統合パスへ渡し、それ以前の回の結果は破棄する',
      ],
      explanation: '統合パスが回をまたぐ矛盾（表記揺れや日付の食い違いなど）を検出するには、どの値がどの回のどの記述に由来するかを追跡できる必要があります。各回の抽出結果を出典位置つきの構造化データとして渡せば、統合パスはその対応を保ったまま突き合わせられます。自然文の要約だけでは位置情報が失われ、元の本文を渡し直す設計は各回のパスで抽出した意味をなくし、最終回だけの採用では途中の回の誤りを検出する機会がありません。',
    },
    {
      stem: 'You are extracting people and events from a serialized article running across 10 installments, with each installment extracted in its own independent pass. What is the most appropriate design for the input handed to the integration pass?',
      choices: [
        'Pass each installment’s extraction result as structured data carrying, per value, which installment and passage it came from',
        'Pass only a prose summary of each installment’s extraction result to the integration pass, with no location information for the values',
        'Discard the per-installment extraction results and pass all 10 installments’ raw text to the integration pass to extract from scratch',
        'Pass only the final installment’s extraction result to the integration pass and discard the results of every earlier installment',
      ],
      explanation: 'For the integration pass to catch cross-installment contradictions such as inconsistent spellings or clashing dates, it needs to trace which installment and which passage a value came from. Passing each installment’s extraction as structured data carrying that provenance lets the integration pass cross-check while keeping that mapping intact. A prose summary alone loses the location information, handing back the raw text defeats the point of extracting per installment, and adopting only the final installment’s result gives no chance to catch a mistake made earlier.',
    },
    ['structured', 'evals'],
    { scenarioId: 'sc-extraction-pipeline', verifiedAt: '2026-09-29', revision: 2 },
  ),
  question(
    'q-sc-pipe-retry', 'd4', ['4.4'], 'single', ['c'],
    { difficulty: 'application', skills: ['failure-handling', 'human-oversight'] },
    {
      stem: 'フィールド単位の再試行を繰り返しても、ある記事だけは上限に達してもなお検証を通りません。上限に達した後の扱いとして最も適切なのはどれですか？',
      choices: [
        '上限を無視してリトライを継続し、検証を通るまで自動処理を止めない',
        '検証に失敗したフィールドへ無難なデフォルト値を埋め、そのままインデクサーへ投入する',
        '検証エラーの詳細（失敗したフィールド・期待条件・実際の値）を添えて当該記事を人のレビュー待ちキューへ回し、自動処理の対象からは外す',
        '検証エラーを記録せずに当該記事を飛ばし、後続の処理には触れさせない',
      ],
      explanation: '再試行の上限は暴走を止めるために設けるので、上限到達後は自動処理から外し、失敗の詳細を添えて人のレビューへ引き継ぐのが上限とフォールバックという設計の目的に沿います。上限の無視は暴走を招き、デフォルト値での投入は誤った値をそのまま通し、記録なしのスキップは欠落に気づけなくします。',
    },
    {
      stem: 'Field-level retries keep running, but one article still fails validation even after the retry cap is reached. What is the most appropriate handling once the cap is hit?',
      choices: [
        'Ignore the cap and keep retrying, never stopping the automated process until validation passes',
        'Fill the failed field with a reasonable-looking default value and let the record proceed to the indexer as is',
        'Route the article to a human-review queue with the validation failure details attached (the failed field, expected condition, and actual value), and exclude it from further automated processing',
        'Skip the article without recording the error, letting downstream processing continue untouched',
      ],
      explanation: 'The retry cap exists to stop runaway loops, so once it is reached the record should leave automated processing and hand off to human review carrying the failure detail — that is what a cap paired with a fallback is for. Ignoring the cap invites a runaway loop, filling in a default lets a wrong value through unnoticed, and skipping without a record hides the gap entirely.',
    },
    ['structured', 'evals'],
    { scenarioId: 'sc-extraction-pipeline', verifiedAt: '2026-09-29', revision: 2 },
  ),
  question(
    'q-sc-pipe-batch', 'd4', ['4.5'], 'single', ['a'],
    { difficulty: 'application', skills: ['throughput-and-cost', 'failure-handling'] },
    {
      stem: '夜間バッチの結果を取得すると、succeeded・errored・canceled・expiredが混在し、並び順もリクエスト投入時とは一致していませんでした。最も適切な対応はどれですか？',
      choices: [
        '各結果をリクエストへ対応付けるにはcustom_idを使い、succeeded以外（errored・canceled・expired）の記事だけを次のバッチへ再投入する',
        '結果はリクエストを投入した順に返ってくるはずなので、結果配列のインデックス位置でリクエストと対応付ける',
        'canceledやexpiredが1件でも混ざっているバッチは全体が無効なので、成功分も含めて全件を最初から再投入する',
        'errored・canceled・expiredの記事は次回の夜間バッチで自動的に再試行されるため、こちらで対応付けや再投入を行う必要はない',
      ],
      explanation: 'バッチの結果は投入順と一致するとは限らないため、custom_idで対応付けます。個々のリクエストの失敗は他のリクエストの処理に影響しないため、再投入はsucceeded以外に限定すれば十分で、成功済みの分まで含めた全件再投入は無駄です。公式ドキュメントも、失敗したリクエストには呼び出し側で再試行の処理を実装するよう勧めています。',
    },
    {
      stem: 'You retrieve the results of an overnight batch and find a mix of succeeded, errored, canceled, and expired results, in an order that does not match the order requests were submitted in. What is the most appropriate response?',
      choices: [
        'Match each result to its request using custom_id, and resubmit only the articles whose result is not succeeded (errored, canceled, or expired) in the next batch',
        'Match results to requests by their position in the results array, since results should come back in the same order the requests were submitted',
        'Treat the whole batch as invalid the moment even one canceled or expired result appears, and resubmit every article, including the ones that already succeeded',
        'Assume errored, canceled, and expired articles will be automatically retried in the next overnight batch, so no matching or resubmission is needed on your side',
      ],
      explanation: 'Batch results are not guaranteed to come back in submission order, so matching must go through custom_id. One request failing does not affect the others, so resubmitting only the non-succeeded results is sufficient — resubmitting everything, including already-succeeded articles, wastes the batch. The official guidance likewise recommends implementing retry logic for failed requests on the caller’s side.',
    },
    ['batch'],
    { scenarioId: 'sc-extraction-pipeline', verifiedAt: '2026-09-29', revision: 2 },
  ),
  question(
    'q-sc-pipe-provenance', 'd5', ['5.1', '5.3'], 'multiple', ['a', 'c'],
    { difficulty: 'analysis', skills: ['context-management', 'structured-output'] },
    {
      stem: '「圧縮で確定済みの記事IDが失われる」「どの事実がどの記事に基づくか下流で判別できない」の2つの課題への対策を2つ選んでください。',
      choices: [
        '記事IDや同定結果など確定済みの重要事実は、要約とは別の構造化した状態として保全する',
        '課題の原因である履歴の圧縮をやめ、全セッションで履歴全文を保持する',
        '各事実とsource IDの対応を構造化出力で受け取り、統合後もその対応を保持して下流へ渡す',
        'レポート末尾の参照一覧を充実させれば、事実単位の対応付けは不要になる',
      ],
      explanation: '圧縮は必要ですが、細部を落とす性質があるため、確定済みの重要事実は構造化して分離保全します。出典はclaim単位の対応を構造化して統合後まで運ばないと、下流で根拠を辿れません。全文保持はコスト・関連性の面で持続せず、末尾一覧は対応付けの代わりになりません。',
    },
    {
      stem: 'Select the TWO countermeasures for the two problems: compaction losing settled article IDs, and downstream consumers unable to tell which fact rests on which article.',
      choices: [
        'Preserve settled critical facts such as article IDs and identification results as structured state separate from the summary',
        'Stop the history compaction that causes the problem and keep the full history in every session',
        'Receive fact-to-source-ID mappings as structured output and preserve the mapping through integration for downstream use',
        'Expand the reference list at the end of the report so fact-level mapping becomes unnecessary',
      ],
      explanation: 'Compaction is needed but drops detail, so preserve settled critical facts as separated structured state. Provenance must travel as claim-level structured mappings through integration or downstream consumers cannot trace evidence. Full retention does not scale in cost or relevance, and an end-of-report list is no substitute for the mapping.',
    },
    ['context-editing', 'structured'],
    { scenarioId: 'sc-extraction-pipeline', verifiedAt: SCENARIO_VERIFIED_AT },
  ),

  // --- Task 8A.1: bank expansion (+22) to reach the 60-question blueprint. ---
  question(
    'q-d1-loop-toolresult', 'd1', ['1.1'], 'single', ['b'],
    { difficulty: 'application', skills: ['agent-loop'] },
    {
      stem: 'モデルが1回の応答で3つのツール呼び出し（tool_useブロック）を並列に要求しました。エージェントループを継続する際の結果の返し方として最も適切なのはどれですか？',
      choices: [
        'ツールを1つ実行するたびにtool_resultを個別のuserメッセージで返し、3往復に分ける',
        '3つのツールを実行し、すべてのtool_resultブロックを1つのuserメッセージにまとめて返す',
        '最初のツールだけ実行して結果を返し、残りは次のstop_reasonを待つ',
        '3つの結果を結合した自然文の要約を1つのtextブロックとして返す',
      ],
      explanation: '並列に要求された各tool_useには対応するtool_resultが必要で、それらは次の1つのuserメッセージにまとめて返します。個別送信や一部のみの実行はブロックの対応が崩れ、自然文要約は構造化された結果にならずモデルが扱えません。',
    },
    {
      stem: 'In a single response the model requested three tool calls (tool_use blocks) in parallel. What is the most appropriate way to return the results to continue the agentic loop?',
      choices: [
        'Return each tool_result in its own user message, splitting the turn into three round trips',
        'Run all three tools and return every tool_result block together in one user message',
        'Run only the first tool, return its result, and wait for the next stop_reason',
        'Return one text block that summarizes the three results in prose',
      ],
      explanation: 'Each parallel tool_use needs a matching tool_result, and they are returned together in the next single user message. Splitting them or running only some breaks the block pairing, and a prose summary is not the structured result the model expects.',
    },
    ['tool-use'],
    { verifiedAt: EXPANSION_VERIFIED_AT },
  ),
  question(
    'q-d1-stop-max-tokens', 'd1', ['1.1'], 'single', ['b'],
    { difficulty: 'foundation', skills: ['agent-loop'] },
    {
      stem: 'API応答の stop_reason が max_tokens で返りました。この応答の扱いとして最も適切なのはどれですか？',
      choices: [
        '応答は完結しているので、そのまま最終結果として採用する',
        '応答は途中で打ち切られているため、max_tokensを上げるか続きを生成させる',
        'モデルが停止を要求したので、ツールを実行してループを継続する',
        '安全性による拒否なので、フォールバックモデルで再試行する',
      ],
      explanation: 'max_tokensは出力が上限に達して途中で打ち切られた状態を示します。完了扱いにすると欠けたまま使ってしまうため、上限を上げるか応答を継続します。ツール実行はtool_use、拒否はrefusalが示す別の停止理由です。',
    },
    {
      stem: 'The API response returned with stop_reason max_tokens. What is the most appropriate way to handle this response?',
      choices: [
        'The response is complete, so use it as the final result as-is',
        'The response was truncated at the limit, so raise max_tokens or continue generating',
        'The model asked to stop, so run a tool and continue the loop',
        'It is a safety refusal, so retry on a fallback model',
      ],
      explanation: 'max_tokens means the output hit the limit and was cut off. Treating it as complete uses a truncated result, so raise the limit or continue the response. Tool execution is signaled by tool_use and a refusal by refusal — different stop reasons.',
    },
    ['stop-reasons'],
    { verifiedAt: EXPANSION_VERIFIED_AT },
  ),
  question(
    'q-d1-single-vs-multi', 'd1', ['1.2', '1.6'], 'single', ['c'],
    { difficulty: 'analysis', skills: ['orchestration'] },
    {
      stem: 'あるタスクは、密に依存し合う短い工程が数個連なるだけで、共有する文脈が多いです。構成の判断として最も適切なのはどれですか？',
      choices: [
        '工程ごとにサブエージェントへ分割し、それぞれ独立した文脈で並列実行する',
        '工程数と同じ数のサブエージェントを常に用意し、将来の拡張に備える',
        '単一のエージェントループで順に処理し、サブエージェントには分割しない',
        '各工程を別々のサブエージェントにし、共有文脈は毎回全文を渡して同期する',
      ],
      explanation: 'サブエージェントは文脈が分離される代わりに、入力の受け渡しと結果統合のオーバーヘッドが生じます。依存が密で共有文脈が多く工程も小さい場合、そのオーバーヘッドが利得を上回るため単一ループが適切です。将来のためだけの分割や全文同期は無駄なコストを生みます。',
    },
    {
      stem: 'A task is just a few short, tightly interdependent steps that share a lot of context. Which structuring decision is most appropriate?',
      choices: [
        'Split each step into a subagent and run them in parallel, each with its own isolated context',
        'Always create as many subagents as there are steps to prepare for future growth',
        'Handle them in order within a single agent loop and do not split into subagents',
        'Make each step a separate subagent and sync the shared context by passing it in full every time',
      ],
      explanation: 'Subagents isolate context but add the overhead of passing input and integrating results. When steps are tightly coupled, share much context, and are small, that overhead outweighs the benefit, so a single loop fits. Splitting only for the future or syncing full context wastes cost.',
    },
    ['subagents'],
    { verifiedAt: EXPANSION_VERIFIED_AT },
  ),
  question(
    'q-d1-coordination', 'd1', ['1.2'], 'multiple', ['a', 'c'],
    { difficulty: 'analysis', skills: ['orchestration'] },
    {
      stem: '中央のオーケストレーターを置くべき状況として適切なものを2つ選んでください。',
      choices: [
        '複数のサブタスクの結果を1つの成果物へ統合する明確な責任者が必要なとき',
        '各サブタスクが独立して完結し、互いの結果を参照しないとき',
        '全体の進行を1か所で監視し、失敗時の再割り当てを一元的に判断したいとき',
        '処理が一方向のパイプラインで、各段が次段へそのまま引き継げるとき',
      ],
      explanation: '中央調整は、結果統合の所有者を明示したい場合と、進行監視・再割り当てを一元化したい場合に向きます。独立して完結するタスクや一方向パイプラインは、調整役を挟まず並列またはハンドオフで足ります。',
    },
    {
      stem: 'Select the TWO situations that call for a central orchestrator rather than peer handoffs.',
      choices: [
        "A clear owner is needed to integrate several subtasks' results into one deliverable",
        "Each subtask completes independently and never references another's result",
        'You want to monitor overall progress in one place and decide reassignment on failure centrally',
        'The work is a one-way pipeline where each stage hands straight off to the next',
      ],
      explanation: 'Central coordination fits when you need a named owner for integration and when progress monitoring and reassignment should be centralized. Independently completing tasks or a one-way pipeline need no coordinator — parallel or handoff suffices.',
    },
    ['subagents', 'sdk-features'],
    { verifiedAt: EXPANSION_VERIFIED_AT },
  ),
  question(
    'q-d1-subagent-scope', 'd1', ['1.3', '1.7'], 'single', ['d'],
    { difficulty: 'application', skills: ['orchestration', 'context-management'] },
    {
      stem: '大量のファイルを読む調査をサブエージェントに委譲します。親エージェントへの返し方として最も適切なのはどれですか？',
      choices: [
        '読んだファイルと全ツール結果をそのまま親の会話履歴へ連結する',
        '中間の思考と全文引用を省かず返し、親側で取捨選択させる',
        '結論は返さず、参照したファイルのパス一覧だけを返す',
        '判断に必要な結論と根拠だけを要約して返し、読んだ中間過程は親へ持ち込まない',
      ],
      explanation: 'サブエージェントの利点は中間過程を分離し、親には要約だけを返してコンテキストを節約することです。全文や全ツール結果の持ち込みはその利点を打ち消し、パスだけでは親が判断できません。',
    },
    {
      stem: 'You delegate a research task that reads many files to a subagent. What is the most appropriate way to return to the parent agent?',
      choices: [
        "Concatenate every file read and all tool results straight into the parent's conversation history",
        'Return the full intermediate reasoning and verbatim quotes and let the parent decide what to keep',
        'Return no conclusion, just the list of file paths that were referenced',
        'Return only the conclusion and the evidence needed to act, keeping the intermediate reading out of the parent',
      ],
      explanation: 'The point of a subagent is to isolate the intermediate work and return only a summary, saving the parent context. Carrying the full text or all tool results defeats that, and paths alone leave the parent unable to act.',
    },
    ['subagents'],
    { verifiedAt: EXPANSION_VERIFIED_AT },
  ),
  question(
    'q-d1-handoff-data', 'd1', ['1.4'], 'multiple', ['b', 'd'],
    { difficulty: 'application', skills: ['workflow-enforcement', 'structured-output'] },
    {
      stem: 'あるエージェントが案件を次段へ引き継ぎます。会話任せにせず構造化した引き継ぎデータに含めるべきものを2つ選んでください。',
      choices: [
        'これまでの会話全文を添付し、必要な情報は次段が読み取ると仮定する',
        '次段が判断に使う識別子や確定した決定事項を構造化フィールドとして明示する',
        '口調を整えた自然文の依頼メッセージだけを渡し、項目は本文から推測させる',
        '引き継ぎ理由と、次段が満たすべき前提条件・完了条件を構造化して渡す',
      ],
      explanation: '引き継ぎは、次段が確実に使う識別子・決定事項と、前提／完了条件を構造化して渡すのが要です。会話全文や自然文依頼は、必要項目が埋もれて取りこぼしや解釈ズレを生みます。',
    },
    {
      stem: 'An agent hands a case to the next stage. Select the TWO items that belong in the structured handoff payload rather than being left to the conversation.',
      choices: [
        'The entire prior conversation, assuming the next stage will read out what it needs',
        'The identifiers and settled decisions the next stage will use, as explicit structured fields',
        'Only a polished prose request message, letting the next stage infer the fields from the text',
        'The reason for the handoff plus the preconditions and completion conditions the next stage must meet, structured',
      ],
      explanation: 'A handoff should carry the identifiers and decisions the next stage relies on, plus preconditions and completion conditions, in structured form. A full transcript or prose request buries the required fields and invites dropped or misread data.',
    },
    ['sdk-features', 'hooks'],
  ),
  question(
    'q-d1-hook-exitcode', 'd1', ['1.5'], 'single', ['a'],
    { difficulty: 'foundation', skills: ['workflow-enforcement'] },
    {
      stem: '保護対象ファイルへの書き込みを、実行前フックで確実に止めたいです。フックがそのツール呼び出しを遮断する仕組みとして正しいのはどれですか？',
      choices: [
        'PreToolUseフックが終了コード2で終了すると、その呼び出しは遮断される',
        'PostToolUseフックが警告を出力すると、直前の書き込みが巻き戻される',
        'フックが終了コード0で正常終了すると、呼び出しは常に遮断される',
        'フックが標準出力に文言を出すだけで、呼び出しは自動的に中止される',
      ],
      explanation: '実行前のPreToolUseフックは終了コード2（またはblock決定の返却）で呼び出しを遮断できます。事後フックでは書き込みは既に完了しており巻き戻せず、コード0は正常継続、単なる出力は遮断になりません。',
    },
    {
      stem: 'You want a pre-execution hook to reliably stop writes to a protected file. Which mechanism correctly blocks the tool call?',
      choices: [
        'A PreToolUse hook that exits with code 2 blocks the call',
        'A PostToolUse hook that prints a warning rolls back the write that just happened',
        'A hook that exits with code 0 (success) always blocks the call',
        'A hook that merely prints text to stdout automatically aborts the call',
      ],
      explanation: 'A PreToolUse hook blocks the call by exiting with code 2 (or returning a block decision). A post hook runs after the write already completed and cannot roll it back, exit code 0 means continue, and plain output does not block.',
    },
    ['hooks'],
    { verifiedAt: EXPANSION_VERIFIED_AT },
  ),
  question(
    'q-d1-fork-resume', 'd1', ['1.7'], 'single', ['c'],
    { difficulty: 'application', skills: ['context-management', 'orchestration'] },
    {
      stem: '既存のセッションの続きから別案を試したいが、元のセッションの履歴は後で続けられるよう保ちたいです。適切な操作はどれですか？',
      choices: [
        '同じセッションをresumeし、その中で別案に切り替えて上書きしていく',
        '新規セッションを空の状態で開始し、必要な文脈は手で貼り直す',
        'セッションをforkし、元の履歴のコピーから分岐した新しいセッションで別案を進める',
        '元のセッションを削除し、別案だけを新しいセッションで進める',
      ],
      explanation: 'forkは元履歴のコピーから分岐した別セッションを作り、元のセッションは変更されません。同一セッションのresumeは元スレッドを書き換え、空の新規開始は文脈を失い、削除は元案へ戻れなくします。',
    },
    {
      stem: "You want to try an alternative from where an existing session left off, but keep the original session's history so you can continue it later. Which action fits?",
      choices: [
        'Resume the same session and overwrite it as you switch to the alternative',
        'Start a fresh empty session and paste the needed context back in by hand',
        'Fork the session and pursue the alternative in a new session branched from a copy of the original history',
        'Delete the original session and pursue only the alternative in a new one',
      ],
      explanation: 'Fork creates a separate session branched from a copy of the original history, leaving the original unchanged. Resuming the same session overwrites the original thread, a blank start loses context, and deleting removes the way back to the original.',
    },
    ['sessions'],
    { verifiedAt: EXPANSION_VERIFIED_AT },
  ),
  question(
    'q-d2-builtin-tools', 'd2', ['2.5'], 'multiple', ['a', 'c'],
    { difficulty: 'application', skills: ['claude-code-workflow'] },
    {
      stem: '組み込みの読取・検索・編集・コマンド実行ツールを安全に使う運用として、適切なものを2つ選んでください。',
      choices: [
        '探索は広範なファイル読取より先に、狭く絞った検索から始める',
        '変更対象を読まずに編集を適用し、失敗したら後から差分で確認する',
        '変更対象を編集前に読み、変更後に検証を実行して結果を確かめる',
        '破壊的なコマンドは内容を検査せず、実行後のログだけで妥当性を判断する',
      ],
      explanation: '探索は狭い検索から広げるとコンテキストを浪費せず、編集は対象を読んでから行い変更後に検証するのが安全です。未読のまま編集する、実行後ログだけで破壊的操作を判断する運用は誤りを取り返しにくくします。',
    },
    {
      stem: 'Select the TWO safe practices for using the built-in read, search, edit, and command-execution tools.',
      choices: [
        'Begin exploration with a narrow, targeted search before broad file reads',
        'Apply an edit without reading the target, and check the diff only if it fails',
        'Read the target before editing it, then run a verification after the change',
        'For destructive commands, skip inspecting the command and judge validity from the post-run log alone',
      ],
      explanation: 'Exploration should widen from a narrow search to avoid wasting context, and edits are safest when you read the target first and verify afterward. Editing unread targets or judging destructive commands only from after-the-fact logs makes mistakes hard to undo.',
    },
    ['code-how', 'code-best-practices'],
    { verifiedAt: EXPANSION_VERIFIED_AT },
  ),
  question(
    'q-d2-tool-disambiguation', 'd2', ['2.1'], 'single', ['b'],
    { difficulty: 'application', skills: ['tool-design'] },
    {
      stem: '説明文が似通った2つのツールがあり、モデルがしばしば意図と違う方を選びます。最も効果的な対処はどれですか？',
      choices: [
        '2つのツールを常に両方呼ばせ、結果を後で人が選別する',
        '各ツールの説明に用途・非用途・入力の意味を具体的に書き分け、境界を明確にする',
        'tool_choiceで常に一方を強制し、もう一方は事実上使わせない',
        '2つのツール名を似た短い語に統一し、違いは実行時に判断させる',
      ],
      explanation: '誤選択の主因は説明の曖昧さなので、用途・非用途・入力の意味を具体化して境界を明確にするのが本質的な対処です。両方呼び出しは無駄で、常時強制は一方を殺し、名前を似せるのは区別をさらに困難にします。',
    },
    {
      stem: 'Two tools have similar descriptions and the model often picks the wrong one for the intent. What is the most effective fix?',
      choices: [
        'Always call both tools and have a person sort out the results afterward',
        'Rewrite each description to state its use, non-use, and input meaning concretely, making the boundary clear',
        'Force one tool with tool_choice every time so the other is effectively never used',
        'Rename both tools to similar short words and let the model decide the difference at run time',
      ],
      explanation: 'The root cause of misselection is ambiguous descriptions, so sharpening use, non-use, and input meaning to clarify the boundary is the real fix. Calling both is wasteful, always forcing one kills the other, and similar names make the distinction harder.',
    },
    ['tool-use', 'define-tools'],
    { verifiedAt: EXPANSION_VERIFIED_AT },
  ),
  question(
    'q-d3-plan-mode', 'd3', ['3.4'], 'single', ['a'],
    { difficulty: 'application', skills: ['claude-code-workflow'] },
    {
      stem: '複数ファイルにまたがり、対象コードに不慣れな変更に着手します。進め方として最も適切なのはどれですか？',
      choices: [
        'plan modeで先に読取と設計を済ませ、範囲と検証方法を固めてから実装に移る',
        'すぐに全ファイルを編集し、動かなければ都度修正して収束させる',
        '変更の大小に関わらず、常にplan modeで詳細設計を書いてから着手する',
        '設計は省き、テストも実装後にまとめて後回しにする',
      ],
      explanation: '範囲が広く不慣れな変更は、plan modeで探索と設計を実装から分離すると誤った問題を解く事故を防げます。ただしplan modeはオーバーヘッドがあるため些末な変更には過剰で、常時適用は非効率です。',
    },
    {
      stem: 'You are starting a change that spans several files in code you are unfamiliar with. What is the most appropriate approach?',
      choices: [
        'Use plan mode to read and design first, settling scope and verification before implementing',
        'Edit all the files immediately and converge by fixing whatever breaks',
        'Always write a detailed design in plan mode before starting, regardless of change size',
        'Skip design and defer all tests until after implementation',
      ],
      explanation: 'For a broad, unfamiliar change, plan mode separates exploration and design from implementation and avoids solving the wrong problem. But plan mode adds overhead, so applying it to trivial changes is excessive and inefficient.',
    },
    ['code-best-practices'],
    { verifiedAt: EXPANSION_VERIFIED_AT },
  ),
  question(
    'q-d3-iterative-eval', 'd3', ['3.5'], 'multiple', ['b', 'c'],
    { difficulty: 'analysis', skills: ['claude-code-workflow', 'evaluation'] },
    {
      stem: '生成結果を反復的に改善するループを設計します。品質を安定して上げるために適切なものを2つ選んでください。',
      choices: [
        '基準は決めず、出力が「良くなった感触」になるまで修正を続ける',
        '良し悪しの評価基準を反復を始める前に定義しておく',
        '各修正ごとに、以前通っていた項目が壊れていないか回帰を確認する',
        '一度に大量の変更をまとめて入れ、最後に一括で評価する',
      ],
      explanation: '反復改善は、評価基準を先に定めて進捗を客観的に測ることと、修正ごとに回帰を確認して後退を防ぐことが要です。感触頼みや一括変更は、何が効いたか切り分けられず品質が安定しません。',
    },
    {
      stem: 'You are designing a loop that iteratively improves generated output. Select the TWO practices that reliably raise quality.',
      choices: [
        'Set no criteria and keep revising until the output "feels" better',
        'Define the criteria for good vs bad before starting the iterations',
        'After each revision, check for regressions in items that previously passed',
        'Bundle many changes at once and evaluate them all only at the end',
      ],
      explanation: 'Iterative refinement relies on defining criteria first to measure progress objectively and checking regressions each revision to prevent backsliding. Relying on feel or batching changes makes it impossible to tell what helped and destabilizes quality.',
    },
    ['code-best-practices', 'evals'],
    { verifiedAt: EXPANSION_VERIFIED_AT },
  ),
  question(
    'q-d3-headless-perms', 'd3', ['3.6'], 'single', ['c'],
    { difficulty: 'application', skills: ['claude-code-workflow', 'structured-output'] },
    {
      stem: 'CIの非対話実行にコーディングエージェントを組み込みます。安全で機械可読な構成として最も適切なのはどれですか？',
      choices: [
        'すべてのツールを許可し、人が後でログを目視して問題を拾う',
        '出力は自然文のまま受け、正規表現で結果を抽出して合否を判断する',
        'allowedToolsを必要最小限に絞り、出力をJSON形式にして終了コードで成否を判定する',
        '権限確認の対話をCIでも有効にし、必要時に人の承認を待たせる',
      ],
      explanation: '非対話実行では、allowedToolsで最小権限にし、JSON出力と終了コードでCIが機械的に成否を判定できる形が適切です。全許可は危険、自然文の正規表現抽出は脆く、対話承認は人がいないCIで停止します。',
    },
    {
      stem: 'You are embedding a coding agent into a non-interactive CI run. Which configuration is most appropriate for safety and machine-readability?',
      choices: [
        'Allow all tools and have a person eyeball the log afterward to catch problems',
        'Take the output as prose and extract the result with a regex to decide pass/fail',
        'Scope allowedTools to the minimum needed, emit JSON output, and judge success by exit code',
        'Keep interactive permission prompts enabled in CI and wait for human approval when needed',
      ],
      explanation: 'A non-interactive run should use least-privilege allowedTools and let CI judge success mechanically from JSON output and the exit code. Allowing everything is unsafe, regex over prose is brittle, and interactive approval stalls a CI run with no human present.',
    },
    ['headless'],
    { verifiedAt: EXPANSION_VERIFIED_AT },
  ),
  question(
    'q-d3-command-vs-skill', 'd3', ['3.2'], 'single', ['d'],
    { difficulty: 'foundation', skills: ['claude-code-configuration'] },
    {
      stem: '現在のClaude Codeで、チームが再利用する手順を用意します。副作用があり利用者が明示実行するworkflowと、Claudeが必要時に自動参照する背景知識の作り分けとして最も適切なのはどれですか？',
      choices: [
        'workflowは .claude/commands/ に、背景知識はSkillにし、両者をまったく別の仕組みとして設計する',
        '両方をSkillにし、どちらもClaudeの自動判断だけに任せて明示起動はさせない',
        '両方をCLAUDE.mdへ書き、起動を制御したい場合はその都度チャットで指示する',
        '両方をSkillとして実装し、副作用のあるworkflowには disable-model-invocation: true、背景知識には user-invocable: false を設定する',
      ],
      explanation: '現在のClaude Codeではcustom commandはSkillへ統合され、.claude/commands/ のファイルとSkillは同じ /名前 を作ります。作り分けは別の仕組みではなくSkillのfrontmatterで行い、明示実行のみにしたいworkflowは disable-model-invocation: true、Claudeだけが参照する背景知識は user-invocable: false を設定します。既存の .claude/commands/ も互換で動きますが、新規設計で必須の別概念ではありません。',
    },
    {
      stem: 'In current Claude Code, you are preparing reusable procedures for a team. What is the most appropriate way to distinguish a side-effect workflow the user invokes explicitly from background knowledge Claude references automatically when relevant?',
      choices: [
        'Put the workflow in .claude/commands/ and the knowledge in a Skill, designing them as entirely separate mechanisms',
        "Make both Skills and leave both to Claude's automatic decision only, with no explicit invocation",
        'Put both in CLAUDE.md and give any invocation control ad hoc in chat each time',
        'Implement both as Skills, setting disable-model-invocation: true on the side-effect workflow and user-invocable: false on the background knowledge',
      ],
      explanation: 'In current Claude Code, custom commands are merged into Skills, and a .claude/commands/ file and a Skill both create the same /name. You distinguish them not as separate mechanisms but via Skill frontmatter: disable-model-invocation: true for an explicit-only workflow, and user-invocable: false for knowledge only Claude should reference. Existing .claude/commands/ files still work for compatibility but are not a required separate concept for new designs.',
    },
    ['skills', 'code-features', 'code-best-practices'],
    { verifiedAt: EXPANSION_VERIFIED_AT },
  ),
  question(
    'q-d4-fewshot', 'd4', ['4.2'], 'single', ['b'],
    { difficulty: 'application', skills: ['prompt-design'] },
    {
      stem: '分類プロンプトが境界的な入力で判断を誤ります。few-shot例の使い方として最も効果的なのはどれですか？',
      choices: [
        '教科書的な典型例だけを大量に並べ、境界例は載せない',
        '誤りやすい境界例を、望む入出力の対応として例に加え、指示と矛盾しないようにする',
        '例と本文の指示がずれても、例の数を増やせば精度は上がると考える',
        '正解ラベルを伏せた入力例だけを列挙し、規則はモデルに推測させる',
      ],
      explanation: 'few-shotは、曖昧さの残る境界例を入出力対応として示すと規則が具体化します。典型例だけでは境界が埋まらず、例と指示の矛盾は判断を乱し、ラベルの無い例は基準を伝えられません。',
    },
    {
      stem: 'A classification prompt misjudges borderline inputs. What is the most effective use of few-shot examples?',
      choices: [
        'Pile up many textbook typical examples only and include no borderline cases',
        'Add the error-prone borderline cases as input-output examples, keeping them consistent with the instructions',
        'Assume that adding more examples raises accuracy even if the examples contradict the instructions',
        'List input examples with the correct labels hidden and let the model infer the rule',
      ],
      explanation: 'Few-shot works by showing the ambiguous borderline cases as input-output pairs to make the rule concrete. Typical examples alone leave the boundary unfilled, examples that contradict the instructions confuse the decision, and unlabeled examples convey no criterion.',
    },
    ['prompting-best'],
  ),
  question(
    'q-d4-multipass', 'd4', ['4.6'], 'multiple', ['a', 'd'],
    { difficulty: 'analysis', skills: ['evaluation', 'prompt-design'] },
    {
      stem: '生成・評価・統合を1つの巨大プロンプトに詰め込まず、複数パスに分けます。分離する理由として適切なものを2つ選んでください。',
      choices: [
        '生成する役と評価する役を分けると、自分の出力を甘く採点する偏りを避けられる',
        'パスを分けるほど1回のトークン数が必ず減り、コストが常に下がる',
        'パスを分ければ、最終統合での全体整合の再確認は不要になる',
        '各パスの役割が明確になり、局所評価と全体統合を独立して検証できる',
      ],
      explanation: '分離の利点は、生成と評価を別にして自己採点の偏りを避けられること、各パスの役割が明確になり独立に検証できることです。トークンが必ず減るわけではなく、統合時の全体整合の再確認はむしろ必要です。',
    },
    {
      stem: 'Instead of packing generation, evaluation, and integration into one huge prompt, you split them into multiple passes. Select the TWO valid reasons to separate them.',
      choices: [
        "Separating the generator from the evaluator avoids the bias of grading one's own output leniently",
        'Splitting passes always reduces per-call tokens and therefore always lowers cost',
        'Splitting passes removes the need to recheck global consistency during final integration',
        'Each pass has a clear role, so focused evaluation and final integration can be verified independently',
      ],
      explanation: 'The benefits are avoiding self-grading bias by separating generation from evaluation, and giving each pass a clear, independently verifiable role. Tokens do not necessarily drop, and rechecking global consistency at integration is still needed.',
    },
    ['evals', 'subagents'],
    { verifiedAt: EXPANSION_VERIFIED_AT },
  ),
  question(
    'q-d4-review-criteria', 'd4', ['4.1'], 'single', ['c'],
    { difficulty: 'application', skills: ['evaluation', 'prompt-design'] },
    {
      stem: '出力の「高品質さ」を評価したいですが、判定がレビュアーごとにぶれます。最も効果的な対処はどれですか？',
      choices: [
        '経験豊富なレビュアー1人の主観に任せ、基準は明文化しない',
        '出力が長く詳細であれば高品質とみなす単純な規則にする',
        '「高品質」を観察可能な合否条件や尺度に分解し、評価前に定義しておく',
        '評価は生成後に毎回その場で基準を決め、案件ごとに変える',
      ],
      explanation: '評価のぶれは基準の曖昧さが原因なので、「高品質」を観察可能な合否条件や尺度へ分解し評価前に定義するのが要です。個人の主観や長さ依存、都度決めの基準は再現性が無く比較できません。',
    },
    {
      stem: 'You want to evaluate the "high quality" of outputs, but judgments vary between reviewers. What is the most effective fix?',
      choices: [
        "Rely on one experienced reviewer's judgment and leave the criteria unwritten",
        'Adopt a simple rule that treats longer, more detailed output as higher quality',
        'Break "high quality" into observable pass/fail conditions or a scale, defined before evaluating',
        'Decide the criteria on the spot after each generation, varying them case by case',
      ],
      explanation: 'Variance comes from ambiguous criteria, so decomposing "high quality" into observable pass/fail conditions or a scale, defined up front, is the fix. Personal judgment, length-based rules, or ad hoc criteria are not reproducible and cannot be compared.',
    },
    ['evals'],
    { verifiedAt: EXPANSION_VERIFIED_AT },
  ),
  question(
    'q-d4-schema-design', 'd4', ['4.3'], 'multiple', ['a', 'b'],
    { difficulty: 'analysis', skills: ['structured-output'] },
    {
      stem: '後段システムが使う抽出結果のJSON Schemaを設計します。適切な方針を2つ選んでください。',
      choices: [
        '後段が実際に使う項目に絞り、過度に複雑で深いネストのスキーマを避ける',
        '追加プロパティを禁止する設定（additionalProperties: false）で、スキーマにない想定外のフィールドの混入を防ぐ',
        '想定し得る全項目を最初から網羅し、深くネストするほど厳密で良いスキーマになる',
        '業務ルールをすべてenumやパターンで表現すれば、アプリ側の値検証は不要になる',
      ],
      explanation: 'スキーマは後段が必要とする項目に絞って過度な複雑さを避け、additionalProperties: false で想定外フィールドの混入を防ぐのが保守的な設計です。全項目の網羅や過度なネスト、業務ルールの全表現は、脆さやアプリ側検証の欠落を招きます。',
    },
    {
      stem: 'You are designing the JSON Schema for extraction results a downstream system consumes. Select the TWO appropriate practices.',
      choices: [
        'Limit the schema to the fields the downstream actually uses and avoid an overly complex, deeply nested schema',
        'Set additionalProperties: false so unexpected fields not defined in the schema cannot slip in',
        'Cover every conceivable field from the start; the deeper and more nested, the stricter and better the schema',
        'Expressing all business rules as enums or patterns removes the need for application-side value validation',
      ],
      explanation: 'Keep the schema to the fields the downstream needs and avoid excess complexity, and set additionalProperties: false to block unexpected fields not in the schema. Covering every field, over-nesting, or encoding all business rules invites brittleness or a gap in application-side validation.',
    },
    ['structured'],
    { verifiedAt: EXPANSION_VERIFIED_AT },
  ),
  question(
    'q-d4-batch-tradeoff', 'd4', ['4.5'], 'single', ['a'],
    { difficulty: 'application', skills: ['throughput-and-cost'] },
    {
      stem: '1つのサービスに、ユーザーが応答を待つ対話パスと、締切のない夜間の大量分類ジョブがあります。実行方式の振り分けとして最も適切なのはどれですか？',
      choices: [
        '対話パスは同期APIで即時応答し、夜間の大量分類は非同期のバッチにまとめる',
        '両方を同期APIで処理し、夜間ジョブも1件ずつ即時応答を待つ',
        '両方をバッチにまとめ、対話パスの応答もバッチ完了まで待たせる',
        '対話パスをバッチ、夜間ジョブを同期にして、レイテンシ要件と逆に割り当てる',
      ],
      explanation: '即時応答が要る対話パスは同期、待ち時間を許容できる夜間の大量処理は低コストな非同期バッチが適します。両方を同じ方式に寄せる、あるいは要件と逆に割り当てるのは、レイテンシかコストのどちらかを損ないます。',
    },
    {
      stem: 'A single service has an interactive path where users wait for a response and a nightly bulk classification job with no deadline. What is the most appropriate way to assign execution modes?',
      choices: [
        'Serve the interactive path synchronously for immediate responses, and batch the nightly bulk classification asynchronously',
        'Handle both synchronously, waiting one at a time for an immediate response even for the nightly job',
        'Batch both, making the interactive path wait until the batch completes',
        'Batch the interactive path and run the nightly job synchronously, assigning modes opposite to the latency needs',
      ],
      explanation: 'The interactive path needs immediate responses (synchronous), while the nightly bulk work tolerates latency and fits a low-cost asynchronous batch. Forcing both into one mode, or assigning modes opposite to the requirements, sacrifices either latency or cost.',
    },
    ['batch'],
    { verifiedAt: EXPANSION_VERIFIED_AT },
  ),
  question(
    'q-d5-exploration', 'd5', ['5.4'], 'single', ['d'],
    { difficulty: 'application', skills: ['context-management'] },
    {
      stem: '大規模で不慣れなコードベースを変更します。構造把握の進め方として最も適切なのはどれですか？',
      choices: [
        '関係しそうなディレクトリを端から全ファイル読み、全体を頭に入れてから始める',
        'ファイル名検索も内容検索もせず、記憶にある一般的構造を前提に変更する',
        'まず広範囲を書き換え、壊れた箇所から逆に構造を推定する',
        '狭い仮説に基づく検索から始めて対象を絞り、変更前に実ファイルで前提を検証する',
      ],
      explanation: '探索は狭い検索から広げて対象を絞り、変更前に推測を実ファイルで検証するのがコンテキストを浪費せず安全です。全読みはコンテキストを消費し、記憶前提や先に書き換える手順は誤った構造理解のまま進みます。',
    },
    {
      stem: 'You are changing a large, unfamiliar codebase. What is the most appropriate way to understand its structure?',
      choices: [
        'Read every file in each plausibly related directory to hold the whole thing in mind before starting',
        'Do no filename or content search and change code assuming the general structure you remember',
        'Rewrite a broad area first and infer the structure backward from what breaks',
        'Start from a narrow hypothesis-driven search to focus, and verify assumptions against real files before changing',
      ],
      explanation: 'Exploration should widen from a narrow search to focus the target and verify assumptions against real files before changing — this avoids wasting context. Reading everything burns context, and assuming from memory or rewriting first proceeds on a wrong understanding of the structure.',
    },
    ['large-codebases'],
    { verifiedAt: EXPANSION_VERIFIED_AT },
  ),
  question(
    'q-d5-provenance-carry', 'd5', ['5.6'], 'single', ['a'],
    { difficulty: 'analysis', skills: ['structured-output'] },
    {
      stem: '複数ソースから回答を生成中、信頼できる2つの出典が同じ論点で食い違う主張をしています。来歴を保つ扱いとして最も適切なのはどれですか？',
      choices: [
        '各主張にそれぞれの出典IDを紐づけたまま、対立を明示して両方の根拠を残す',
        '読みやすさのため片方の主張だけを採用し、出典対応は1つにまとめる',
        '両主張を1文に融合し、出典IDは代表として片方だけを付ける',
        '対立部分は出典対応を外して中立的に要約し、必要なら後で人が付け直す',
      ],
      explanation: '来歴保持では、対立する主張もどちらかに丸めず、各主張に対応する出典IDを保ったまま提示し、後から検証できるようにします。片方採用や1文への融合、出典対応を外す扱いは、どの主張がどの根拠に基づくかを失わせます。',
    },
    {
      stem: 'While generating an answer from multiple sources, two trustworthy sources make conflicting claims on the same point. What is the most appropriate way to preserve provenance?',
      choices: [
        'Keep each claim tied to its own source ID and present the conflict, retaining both pieces of evidence',
        'Adopt only one claim for readability and collapse the source mapping into one',
        'Merge both claims into one sentence and attach just one representative source ID',
        'Drop the source mapping for the conflicting part, summarize it neutrally, and let a person re-attach it later if needed',
      ],
      explanation: 'Preserving provenance means not collapsing conflicting claims into one but keeping each claim tied to its source ID and presenting the conflict so it can be checked later. Adopting one side, merging into one sentence, or dropping the mapping loses which claim rests on which evidence.',
    },
    ['structured'],
    { verifiedAt: EXPANSION_VERIFIED_AT },
  ),
  question(
    'q-d5-error-propagation', 'd5', ['5.3'], 'multiple', ['a', 'd'],
    { difficulty: 'analysis', skills: ['failure-handling', 'structured-output'] },
    {
      stem: '下流ツールが失敗しました。上流が次の行動を判断できるようにする返し方として適切なものを2つ選んでください。',
      choices: [
        '元の失敗原因を握りつぶさず、分類とともに構造化して上流へ返す',
        '失敗は握りつぶして空の成功として返し、上流には気づかせない',
        '内部のスタックトレースや秘密情報をそのまま全文添付して返す',
        '再試行可能かどうかと、得られた部分結果があれば併せて返す',
      ],
      explanation: '上流が判断するには、元の原因を分類とともに保全し、再試行可否や部分結果を渡すことが要です。空の成功として隠すと復旧できず、秘密や内部詳細の全文添付は情報漏えいと文脈浪費を招きます。',
    },
    {
      stem: 'A downstream tool failed. Select the TWO ways to return it so the caller can decide the next action.',
      choices: [
        'Preserve the original cause rather than swallowing it, returning it structured with a classification',
        'Swallow the failure and return an empty success so the caller never notices',
        'Attach the full internal stack trace and secrets verbatim in the response',
        'Indicate whether it is retryable, and include any partial results obtained',
      ],
      explanation: 'For the caller to decide, preserve the original cause with a classification and pass retryability and any partial results. Hiding it as an empty success prevents recovery, and attaching secrets or internal detail verbatim leaks information and wastes context.',
    },
    ['tool-use', 'mcp-tools'],
    { verifiedAt: EXPANSION_VERIFIED_AT },
  ),
];

// The random-quiz pool. Scenario questions only make sense with their case
// description in view, so they are drawn exclusively through scenario practice.
export const standaloneQuestions: StandaloneQuestion[] = questions.filter(
  (question): question is StandaloneQuestion => !question.scenarioId,
);
