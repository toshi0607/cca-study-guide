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
  extra?: { scenarioId: PracticeScenarioId; verifiedAt: string },
): ChoiceQuestion => ({
  id,
  revision: 1,
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
  ...(extra ? { scenarioId: extra.scenarioId } : {}),
});

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
    'q-sc-mcp-surface', 'd2', ['2.3'], 'single', ['c'],
    { difficulty: 'analysis', skills: ['tool-design', 'mcp-integration'] },
    {
      stem: '北斗ロジスティクスの「40エンドポイントを1対1でツール化した」構成を見直します。ツール取り違えを減らす最初の一手として最も適切なのはどれですか？',
      choices: [
        'ツール名をすべて短い略語に変えて、定義の読み込み量を減らす',
        '全操作を1つの汎用ツール「callApi」に統合し、選択の余地をなくす',
        '利用場面と責任のまとまりでツールを再設計し、同時に見せる数と紛らわしさを減らす',
        'モデルの温度を下げて、ツール選択のランダム性を抑える',
      ],
      explanation: 'APIの内部構造をそのまま写すのではなく、エージェントの仕事の単位でツール面を設計し直すことが本質的な対策です。略語化は説明の質を下げ、汎用ツール化は境界を曖昧にし、温度調整は紛らわしさという原因に触れません。',
    },
    {
      stem: 'You are reworking Hokuto Logistics’ “forty endpoints exposed one-to-one” design. Which first step most appropriately reduces tool mix-ups?',
      choices: [
        'Rename every tool to a short abbreviation to shrink the loaded definitions',
        'Merge every operation into one general-purpose “callApi” tool so there is nothing to choose',
        'Redesign the tool surface around use cases and responsibilities, reducing the number and confusability of simultaneously exposed tools',
        'Lower the model temperature to suppress randomness in tool selection',
      ],
      explanation: 'The essential fix is designing the tool surface around the agent’s units of work instead of mirroring the internal API structure. Abbreviations degrade descriptions, an all-purpose tool blurs boundaries, and temperature does not address confusability.',
    },
    ['mcp-tools', 'define-tools'],
    { scenarioId: 'sc-mcp-tool-design', verifiedAt: SCENARIO_VERIFIED_AT },
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
    'q-sc-mcp-carrier-error', 'd2', ['2.2'], 'multiple', ['a', 'c'],
    { difficulty: 'analysis', skills: ['failure-handling', 'tool-design'] },
    {
      stem: '配送業者APIのレート制限で失敗したとき、エージェントが適切に回復できるツール応答を2つ選んでください。',
      choices: [
        'エラーであることと、失敗の分類（一時的か恒久的か）・再試行可能性を構造化して返す',
        'デバッグ用にスタックトレースと認証ヘッダーを含む生のレスポンスをそのまま返す',
        '内部実装の詳細を含まない安全な説明で、次に取り得る行動を判断できる内容を返す',
        '空の成功レスポンスを返し、エージェントに処理を継続させる',
      ],
      explanation: '一時障害の分類と再試行可能性が、待って再試行するか別手段へ切り替えるかの判断材料になります。生のレスポンスは認証情報や内部詳細を漏らし、失敗の成功偽装は同じ呼び出しの無限反復や誤った続行を招きます。',
    },
    {
      stem: 'When the carrier API fails with a rate limit, select the TWO tool responses that let the agent recover appropriately.',
      choices: [
        'Return a structured result marking the error with its category (transient or permanent) and retryability',
        'Return the raw response as-is, including the stack trace and auth headers, for debugging',
        'Return a safe explanation without internal implementation details that lets the agent decide its next action',
        'Return an empty success response so the agent continues processing',
      ],
      explanation: 'The failure category and retryability inform whether to wait and retry or switch approaches. Raw responses leak credentials and internals, and faking success invites endless repeats of the same call or an incorrect continuation.',
    },
    ['mcp-tools', 'tool-use'],
    { scenarioId: 'sc-mcp-tool-design', verifiedAt: SCENARIO_VERIFIED_AT },
  ),
  question(
    'q-sc-mcp-token', 'd2', ['2.4'], 'single', ['a'],
    { difficulty: 'application', skills: ['mcp-integration'] },
    {
      stem: 'コミットされてしまった配送業者APIトークンへの対処として最も適切なのはどれですか？',
      choices: [
        'トークンを無効化して再発行し、設定は環境変数や秘密管理から参照する形へ改め、共有ファイルから秘密を除く',
        'リポジトリはプライベートなので、現状の設定ファイルのまま運用を続ける',
        'トークンをbase64でエンコードしてから設定ファイルへ書き直す',
        '全プロジェクト共通のグローバル設定へトークンを移して一元管理する',
      ],
      explanation: '漏えいした秘密は失効させたうえで、共有できる接続定義と秘密情報を分離するのが原則です。プライベートリポジトリは秘密管理の代替にならず、base64は暗号化ではなく、スコープを広げる一元管理は露出をむしろ増やします。',
    },
    {
      stem: 'What is the most appropriate way to deal with the carrier API token that was committed to the repository?',
      choices: [
        'Revoke and reissue the token, switch the configuration to read it from environment variables or a secrets manager, and remove secrets from the shared file',
        'Keep operating with the current configuration file because the repository is private',
        'Re-encode the token in base64 before writing it back into the configuration file',
        'Move the token into a global configuration shared by every project for central management',
      ],
      explanation: 'Revoke the leaked secret, then separate shareable connection definitions from secret values. A private repository is not a substitute for secrets management, base64 is not encryption, and widening the scope increases exposure rather than containing it.',
    },
    ['code-mcp', 'mcp-tools'],
    { scenarioId: 'sc-mcp-tool-design', verifiedAt: SCENARIO_VERIFIED_AT },
  ),

  question(
    'q-sc-support-parallel', 'd1', ['1.2', '1.6'], 'single', ['d'],
    { difficulty: 'application', skills: ['orchestration', 'throughput-and-cost'] },
    {
      stem: 'さくらマーケットの試作は、独立した照会も1つずつ順番に実行しています。オーケストレーター型へ移行する際の実行設計として最も適切なのはどれですか？',
      choices: [
        '返金の本人確認と返金実行も含め、すべての手順を並列化して待ち時間を最小化する',
        '並列化はデバッグを難しくするため、移行後もすべて逐次実行を維持する',
        'サブタスクの数が多い問い合わせだけを、依存関係を見ずに一律で並列化する',
        '注文照会と配送照会のような互いに独立した作業は並列にfan-outし、順序が必要な手順は逐次にする',
      ],
      explanation: '並列化の判断軸はサブタスク間の依存関係です。独立した照会は並列で速くでき、本人確認→返金実行のような順序が必須の手順は逐次に保ちます。全並列も全逐次も、依存関係という基準を無視しています。',
    },
    {
      stem: 'Sakura Market’s prototype runs even independent lookups one at a time. Which execution design is most appropriate when moving to an orchestrator?',
      choices: [
        'Parallelize every step, including identity verification and refund execution, to minimize waiting time',
        'Keep everything sequential after the migration because parallelism makes debugging harder',
        'Parallelize only inquiries with many subtasks, uniformly, without checking dependencies',
        'Fan out mutually independent work such as order and delivery lookups in parallel, and keep order-dependent steps sequential',
      ],
      explanation: 'The deciding factor is the dependency between subtasks. Independent lookups can run in parallel for speed, while steps with a required order — verify identity, then execute the refund — stay sequential. All-parallel and all-sequential both ignore that criterion.',
    },
    ['subagents', 'sdk-features'],
    { scenarioId: 'sc-support-agents', verifiedAt: SCENARIO_VERIFIED_AT },
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
    'q-sc-support-escalation', 'd5', ['5.2', '5.5'], 'single', ['c'],
    { difficulty: 'analysis', skills: ['human-oversight', 'workflow-enforcement'] },
    {
      stem: '返金規定（一定額超・本人確認未完了は人間の承認者へ）をエージェント運用に組み込む方法として最も適切なのはどれですか？',
      choices: [
        'エージェントが自己申告する確信度が低いときだけ、人間の承認者へ回す',
        '処理が失敗した場合のリカバリとしてのみ、人間へ引き継ぐ',
        '金額と本人確認状態という外部から検証できる条件でルーティングを設計し、該当ケースを承認フローへ渡す',
        'システムプロンプトで規定を強調し、エスカレーションの判断はエージェントに委ねる',
      ],
      explanation: '人による承認は最初から設計する制御点で、金額や本人確認状態のような外部から検証できる条件が基準になります。自己申告の確信度は信頼できず、失敗後のみの引き継ぎでは規定違反を防げず、プロンプトの強調は強制になりません。',
    },
    {
      stem: 'Which approach most appropriately builds the refund policy — above a set amount or without identity verification, escalate to a human approver — into the agent operation?',
      choices: [
        'Route to a human approver only when the agent’s self-reported confidence is low',
        'Hand off to a human only as recovery after processing has failed',
        'Design the routing on externally verifiable conditions — amount and identity-verification status — and send matching cases into the approval flow',
        'Emphasize the policy in the system prompt and leave the escalation decision to the agent',
      ],
      explanation: 'Human approval is a control point designed from the outset, keyed on externally verifiable conditions such as amount and verification status. Self-reported confidence is unreliable, failure-only handoffs cannot prevent violations, and prompt emphasis is not enforcement.',
    },
    ['user-input', 'evals'],
    { scenarioId: 'sc-support-agents', verifiedAt: SCENARIO_VERIFIED_AT },
  ),
  question(
    'q-sc-support-context', 'd5', ['5.1'], 'multiple', ['b', 'd'],
    { difficulty: 'analysis', skills: ['context-management'] },
    {
      stem: '長引いた問い合わせで、初期に確認した注文番号や顧客の希望をエージェントが取り違えます。適切な対策を2つ選んでください。',
      choices: [
        '取り違えを防ぐため、会話履歴は一切圧縮せず全文を保持し続ける',
        '確認済みの注文番号・顧客の希望・決定事項を、会話文とは別の構造化した状態として保持する',
        '古いターンは関連性が低いので、確認済み事項ごと無条件に削除する',
        '履歴の圧縮を導入しつつ、継続に必要な重要事実は要約と別に保全する',
      ],
      explanation: '要約・圧縮は履歴を短くできますが細部を落とすため、ID や決定事項は構造化して分離保持し、圧縮時にも保全します。全文の無制限保持は関連情報の希薄化とコスト増を招き、無条件削除は対応の継続に必要な事実を失います。',
    },
    {
      stem: 'In long-running inquiries the agent mixes up order numbers and preferences confirmed early on. Select the TWO appropriate countermeasures.',
      choices: [
        'Never compress the conversation history and keep the full text to prevent mix-ups',
        'Keep confirmed order numbers, customer preferences, and decisions as structured state separate from the conversation prose',
        'Old turns have low relevance, so delete them unconditionally, confirmed items included',
        'Introduce history compaction while preserving the facts needed for continuation separately from the summary',
      ],
      explanation: 'Summaries and compaction shorten history but drop detail, so keep IDs and decisions as separated structured state that survives compaction. Unlimited retention dilutes relevance and raises cost, and unconditional deletion loses facts the case still needs.',
    },
    ['context-windows', 'context-editing'],
    { scenarioId: 'sc-support-agents', verifiedAt: SCENARIO_VERIFIED_AT },
  ),

  question(
    'q-sc-code-conventions', 'd3', ['3.1'], 'single', ['b'],
    { difficulty: 'foundation', skills: ['claude-code-configuration'] },
    {
      stem: 'あおぞらペイでは、規約を毎回プロンプトへ貼る運用で適用がばらついています。チーム全員とCIに同じ規約を適用する置き場所として最も適切なのはどれですか？',
      choices: [
        '各開発者の個人用グローバル設定に置き、各自で同期してもらう',
        'リポジトリのプロジェクトCLAUDE.mdに置き、バージョン管理する',
        '規約の全文を共有ドキュメントにまとめ、毎回そこからコピーして貼る',
        'READMEに書いておけば自動で常時読み込まれるため、それで足りる',
      ],
      explanation: 'チーム必須のルールは、プロジェクト層のCLAUDE.mdへ置いてバージョン管理すると全員とCIで同一に再現されます。個人設定は共有されず、コピー運用は貼り忘れが残り、READMEは指示として常時読み込まれる場所ではありません。',
    },
    {
      stem: 'At Aozora Pay, pasting the conventions into prompts has made their application inconsistent. Where is the most appropriate place so the same conventions apply to every teammate and to CI?',
      choices: [
        'Each developer’s personal global settings, synchronized individually',
        'The repository’s project CLAUDE.md, under version control',
        'A shared document holding the full conventions, copied and pasted each time',
        'The README, which is automatically loaded at all times and therefore sufficient',
      ],
      explanation: 'Mandatory team rules reproduce identically for everyone and for CI when kept in the project-level CLAUDE.md under version control. Personal settings are not shared, copy-paste still misses, and the README is not an always-loaded instruction source.',
    },
    ['code-memory', 'code-best-practices'],
    { scenarioId: 'sc-code-rollout', verifiedAt: SCENARIO_VERIFIED_AT },
  ),
  question(
    'q-sc-code-e2e-rules', 'd3', ['3.3'], 'single', ['c'],
    { difficulty: 'application', skills: ['claude-code-configuration'] },
    {
      stem: 'E2Eテストファイルにだけ適用したい記述規約の置き場所として最も適切なのはどれですか？',
      choices: [
        'プロジェクトCLAUDE.mdの全体規約に追記し、常にすべての作業で読み込ませる',
        'E2Eテストを別リポジトリへ分離し、そちらの全体規約として書く',
        '対象パスにマッチするglobを指定した、パス固有のルールとして書く',
        '各開発者の個人設定へ追加してもらい、運用でカバーする',
      ],
      explanation: '適用範囲を対象ファイルへ限定すると、無関係な作業への干渉を避けられます。全体規約への追記は常時読み込まれ、リポジトリ分離は規約のためだけには過剰で、個人設定は共有されません。globが意図したファイルに一致するかの確認も必要です。',
    },
    {
      stem: 'Where is the most appropriate place for writing conventions that should apply only to E2E test files?',
      choices: [
        'Append them to the general conventions in the project CLAUDE.md, loaded for every task',
        'Split the E2E tests into a separate repository and write them as its general conventions',
        'A path-specific rule with a glob that matches the target paths',
        'Ask each developer to add them to their personal settings and rely on process',
      ],
      explanation: 'Scoping the rules to the target files avoids interfering with unrelated work. Adding them to the general conventions loads them everywhere, a repository split is excessive for conventions alone, and personal settings are not shared. Also verify the glob matches the intended files.',
    },
    ['code-memory'],
    { scenarioId: 'sc-code-rollout', verifiedAt: SCENARIO_VERIFIED_AT },
  ),
  question(
    'q-sc-code-skill', 'd3', ['3.2'], 'multiple', ['a', 'd'],
    { difficulty: 'application', skills: ['claude-code-configuration', 'context-management'] },
    {
      stem: 'リリースノート下書きの定型作業（手順＋テンプレート＋整形スクリプト）を再利用可能にします。適切な設計を2つ選んでください。',
      choices: [
        '手順書とテンプレート・スクリプトをSkillとしてまとめ、再利用可能な単位にする',
        '手順の全文をプロジェクトCLAUDE.mdへ載せ、全セッションで常時読み込ませる',
        'Skillはユーザーが名前を明示的に入力したときだけ使われるため、起動方法を全員に周知する',
        'どんなときに使うべきか判断できるよう、Skillの説明文に利用場面を書く',
      ],
      explanation: 'Skillは手順と参照資源をパッケージ化し、必要なときに読み込まれる再利用単位です。常時読み込みのCLAUDE.mdへ長い手順を置くと無関係な作業のコンテキストを圧迫します。説明文が利用判断の手掛かりになるため、明示的な起動だけに限定されません。',
    },
    {
      stem: 'You are making the routine release-notes task (procedure + template + formatting script) reusable. Select the TWO appropriate design choices.',
      choices: [
        'Bundle the procedure with the template and script as a Skill, forming a reusable unit',
        'Put the full procedure into the project CLAUDE.md so it is always loaded in every session',
        'Skills run only when a user explicitly types their name, so document the invocation for everyone',
        'Write the Skill’s description so it is clear in which situations it should be used',
      ],
      explanation: 'A Skill packages a procedure and its reference resources as a reusable unit loaded when needed. Putting long procedures in the always-loaded CLAUDE.md crowds the context of unrelated work. The description informs when to use it, so usage is not limited to explicit invocation.',
    },
    ['skills', 'code-memory'],
    { scenarioId: 'sc-code-rollout', verifiedAt: SCENARIO_VERIFIED_AT },
  ),
  question(
    'q-sc-code-ci', 'd3', ['3.6'], 'multiple', ['b', 'd'],
    { difficulty: 'analysis', skills: ['workflow-enforcement', 'evaluation'] },
    {
      stem: 'プルリクエストごとに静的チェック結果を要約するCIジョブを設計します。セキュリティレビューを通る構成を2つ選んでください。',
      choices: [
        '権限不足での失敗を避けるため、開発者の手元と同じ広い権限をCIへ与える',
        '非対話モードで実行し、ジョブに必要な最小限の権限だけを与える',
        '確認プロンプトは残し、必要になったら担当者がCIランナーへ入って応答する',
        '出力形式と終了状態を固定し、ジョブの成否をCIが機械判定できるようにする',
      ],
      explanation: 'CIでは人の確認待ちがパイプラインを止めるため、非対話実行と最小権限が前提です。成否は固定した出力形式と終了状態で機械判定させます。開発者端末と同じ広い権限の付与は、セキュリティレビューで求められる最小権限に反します。',
    },
    {
      stem: 'You are designing a CI job that summarizes static-check results on every pull request. Select the TWO configurations that pass the security review.',
      choices: [
        'Grant CI the same broad permissions as a developer workstation to avoid failures from missing permissions',
        'Run in non-interactive mode and grant only the minimum permissions the job needs',
        'Keep confirmation prompts and have an engineer log into the CI runner to respond when needed',
        'Fix the output format and exit behavior so CI can evaluate the job’s success mechanically',
      ],
      explanation: 'In CI, waiting on human confirmation stalls the pipeline, so non-interactive execution with least privilege is the baseline, and success is judged mechanically from a fixed output format and exit behavior. Workstation-level permissions contradict the least-privilege requirement.',
    },
    ['headless', 'code-best-practices'],
    { scenarioId: 'sc-code-rollout', verifiedAt: SCENARIO_VERIFIED_AT },
  ),
  question(
    'q-sc-code-mcp-config', 'd2', ['2.4'], 'single', ['a'],
    { difficulty: 'application', skills: ['mcp-integration', 'claude-code-configuration'] },
    {
      stem: 'チケット管理MCPサーバーの接続設定をチーム全員へ配布する方法として最も適切なのはどれですか？',
      choices: [
        '接続定義はプロジェクトスコープの共有設定としてバージョン管理し、認証トークンは各自の環境変数や秘密管理に置く',
        'トークンを含む設定ファイルごと、プライベートリポジトリで共有する',
        '全プロジェクト共通のグローバルスコープで公開し、トークンも同じ設定に置いて一元管理する',
        '設定の共有はせず、各自がチャットの手順書どおりに手動で設定する',
      ],
      explanation: '共有できる接続定義と秘密情報の分離が原則です。プロジェクトスコープの共有設定はチーム全員へ同一に再現され、トークンは環境変数や秘密管理へ置きます。プライベートリポジトリは秘密管理の代替にならず、スコープの一律拡大は露出を増やし、手動設定は再現性がありません。',
    },
    {
      stem: 'What is the most appropriate way to distribute the ticket-system MCP server connection settings to the whole team?',
      choices: [
        'Version-control the connection definition as a project-scoped shared setting, and keep the auth token in each member’s environment variables or secrets manager',
        'Share the configuration file through a private repository, token included',
        'Expose it at a global scope shared by every project, keeping the token in the same configuration for central management',
        'Skip shared configuration and have each member set it up by hand from a chat message',
      ],
      explanation: 'Separate shareable connection definitions from secret values. A project-scoped shared setting reproduces identically for the whole team, while tokens live in environment variables or a secrets manager. A private repository is not secrets management, widening the scope increases exposure, and manual setup is not reproducible.',
    },
    ['code-mcp', 'mcp-tools'],
    { scenarioId: 'sc-code-rollout', verifiedAt: SCENARIO_VERIFIED_AT },
  ),
  question(
    'q-sc-pipe-validation', 'd4', ['4.3'], 'single', ['d'],
    { difficulty: 'application', skills: ['structured-output', 'failure-handling'] },
    {
      stem: 'スキーマには適合するのに「創刊より前の発行日」のような成り立たない値が混ざります。しののめニュースが取るべき対策として最も適切なのはどれですか？',
      choices: [
        'structured outputsは内容の正しさも保証するはずなので、モデル側の不具合として報告する',
        '値の制約をなくす方向へスキーマを緩め、検証エラー自体を発生させない',
        'プロンプトに「正確な値だけを出力してください」と強調する一文を足す',
        'スキーマ準拠は形の保証と割り切り、業務ルールの検証をアプリケーション側の層として追加する',
      ],
      explanation: 'structured outputsが保証するのは型・必須項目・列挙値といった構造で、日付の前後関係のような業務ルールや事実の正確さは対象外です。中身の検証はアプリケーションの責任として設計します。スキーマの緩和やプロンプトの強調は検証の代わりになりません。',
    },
    {
      stem: 'Outputs comply with the schema yet contain impossible values, such as publication dates earlier than the paper’s founding. Which countermeasure should Shinonome News take?',
      choices: [
        'Report it as a model defect, since structured outputs should also guarantee content correctness',
        'Loosen the schema until value constraints disappear so validation errors cannot occur',
        'Add an emphatic line to the prompt: “output only accurate values”',
        'Treat schema compliance as a shape guarantee and add business-rule validation as an application-side layer',
      ],
      explanation: 'Structured outputs guarantee structure — types, required fields, enum values — not business rules like date ordering or factual accuracy. Content validation is the application’s responsibility by design. Loosening the schema or emphasizing the prompt is no substitute for validation.',
    },
    ['structured'],
    { scenarioId: 'sc-extraction-pipeline', verifiedAt: SCENARIO_VERIFIED_AT },
  ),
  question(
    'q-sc-pipe-retry', 'd4', ['4.4'], 'single', ['a'],
    { difficulty: 'application', skills: ['failure-handling', 'structured-output'] },
    {
      stem: '検証で1フィールドだけ失敗したときの再試行設計として最も適切なのはどれですか？',
      choices: [
        '失敗したフィールド・期待条件・実際の値を伝えて修正範囲を限定し、再試行の上限と超過時のフォールバックを設ける',
        '同じプロンプトを成功するまで無制限に再実行する',
        '出力全体を破棄し、毎回ゼロから完全に再生成させる',
        '該当フィールドの検証ルールを削除して、失敗を発生させなくする',
      ],
      explanation: '具体的な検証結果を返すとモデルは修正点に集中でき、上限とフォールバックが暴走を防ぎます。同じ指示の無制限リトライは同じ失敗を再現しやすく、全体再生成は正しかった部分まで危険にさらし、ルール削除は問題を隠すだけです。',
    },
    {
      stem: 'Exactly one field fails validation. Which retry design is most appropriate?',
      choices: [
        'Report the failed field, expected condition, and actual value to limit the correction scope, with a retry cap and a fallback when it is exceeded',
        'Re-run the identical prompt without limit until it succeeds',
        'Discard the entire output and regenerate everything from scratch each time',
        'Delete the validation rule for that field so the failure can no longer occur',
      ],
      explanation: 'Specific validation feedback focuses the model on the fix, and the cap plus fallback prevents runaway loops. Unlimited identical retries tend to reproduce the same failure, full regeneration endangers the already-correct parts, and deleting the rule merely hides the problem.',
    },
    ['structured', 'evals'],
    { scenarioId: 'sc-extraction-pipeline', verifiedAt: SCENARIO_VERIFIED_AT },
  ),
  question(
    'q-sc-pipe-batch', 'd4', ['4.5'], 'single', ['b'],
    { difficulty: 'foundation', skills: ['throughput-and-cost', 'failure-handling'] },
    {
      stem: '夜間に数万件を処理する抽出ジョブの実行方式として最も適切なのはどれですか？',
      choices: [
        '対話型のリアルタイム呼び出しを逐次実行し、1件ごとの応答レイテンシを最適化する',
        'バッチ処理APIで非同期にまとめて処理し、リクエストと結果を対応付けて個別の失敗を追跡する',
        'バッチ処理APIへまとめれば個別リクエストは失敗しなくなるため、失敗追跡は省略する',
        '全件を1つの巨大なプロンプトに連結し、1回の呼び出しで処理する',
      ],
      explanation: '即時応答が不要な大量処理はバッチ処理APIの典型的な用途です。バッチ内でも個別リクエストは失敗し得るため、IDと結果の対応付けと失敗追跡は必須です。逐次のリアルタイム呼び出しは大量処理に不向きで、全件連結はコンテキストと信頼性の両面で破綻します。',
    },
    {
      stem: 'Which execution approach is most appropriate for the overnight extraction job processing tens of thousands of items?',
      choices: [
        'Run interactive real-time calls sequentially, optimizing per-item response latency',
        'Process asynchronously in bulk with the batch API, associating each request with its result to track individual failures',
        'Skip failure tracking because grouping requests into the batch API means individual requests can no longer fail',
        'Concatenate every item into one giant prompt and process it in a single call',
      ],
      explanation: 'High-volume work that does not need immediate responses is the classic batch-API use case. Individual requests can still fail inside a batch, so request-to-result association and failure tracking are essential. Sequential real-time calls do not fit the volume, and one giant prompt breaks down on both context and reliability.',
    },
    ['batch'],
    { scenarioId: 'sc-extraction-pipeline', verifiedAt: SCENARIO_VERIFIED_AT },
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
];

// The random-quiz pool. Scenario questions only make sense with their case
// description in view, so they are drawn exclusively through scenario practice.
export const standaloneQuestions: StandaloneQuestion[] = questions.filter(
  (question): question is StandaloneQuestion => !question.scenarioId,
);
