import type { Card, LocalizedText } from './types';
import { VERIFIED_AT } from './sources';

type CardCopy = {
  prompt: string;
  answer: string;
  explanation: string;
  pitfall: string;
};

const localized = <T>(ja: T, en: T): LocalizedText<T> => ({ ja, en });

// Cards added in the July 2026 coverage expansion were re-verified against the
// cited official pages on this date.
const EXPANSION_VERIFIED_AT = '2026-07-18';

const card = (
  id: string,
  domainId: string,
  objectiveIds: string[],
  kind: Card['kind'],
  ja: CardCopy,
  en: CardCopy,
  sourceIds: string[],
  verifiedAt: string = VERIFIED_AT,
): Card => ({
  id,
  revision: 1,
  domainId,
  objectiveIds,
  kind,
  prompt: localized(ja.prompt, en.prompt),
  answer: localized(ja.answer, en.answer),
  explanation: localized(ja.explanation, en.explanation),
  pitfall: localized(ja.pitfall, en.pitfall),
  sourceIds,
  verifiedAt,
});

// All prompts and explanations below were independently authored for this app.
// They are retrieval prompts, not copied, recalled, or reconstructed exam questions.
export const cards: Card[] = [
  card(
    'd1-loop-stop', 'd1', ['1.1'], 'recall',
    {
      prompt: 'エージェントループは、何を見て「ツールを実行して続ける」か「終了する」かを判断する？',
      answer: 'API応答の stop_reason を確認する。tool_use なら要求されたツールを実行し、tool_result を履歴へ追加して次のリクエストへ進む。',
      explanation: '自然文から完了を推測するより、APIが返す構造化された停止理由を制御フローに使う方が明確です。ツール結果は対応する呼び出しと正しい順序で会話へ戻します。',
      pitfall: '任意の反復回数だけを通常の完了判定にすると、未完了の処理を切ることがあります。安全上の上限は別途必要です。',
    },
    {
      prompt: 'What should an agentic loop inspect to decide whether to run a tool and continue or to finish?',
      answer: 'Check the API response’s stop_reason. If it is tool_use, run the requested tool, append the tool_result to the history, and make the next request.',
      explanation: 'Using the API’s structured stop reason for control flow is clearer than inferring completion from prose. Return each tool result to the conversation in the correct order and associate it with the corresponding call.',
      pitfall: 'Using only an arbitrary iteration count as the normal completion condition can stop unfinished work. A separate safety limit is still necessary.',
    },
    ['stop-reasons', 'tool-use'],
  ),
  card(
    'd1-orchestration', 'd1', ['1.2', '1.6'], 'contrast',
    {
      prompt: '並列fan-outと逐次handoffを分ける一番重要な判断軸は？',
      answer: 'サブタスク間の依存関係。互いの結果を必要としないなら並列化でき、前段の結果が次段の入力になるなら逐次実行する。',
      explanation: '並列化は待ち時間を短縮できますが、統合担当と出力契約が必要です。逐次handoffでは、次の担当に何を渡したかが追跡できる設計にします。',
      pitfall: '「エージェントが多いほど良い」わけではありません。調整コストと失敗面も増えます。',
    },
    {
      prompt: 'What is the most important factor when choosing between parallel fan-out and sequential handoffs?',
      answer: 'Dependencies between subtasks. Tasks that do not need one another’s results can run in parallel; if an earlier result becomes the next task’s input, run them sequentially.',
      explanation: 'Parallelism can reduce latency, but it needs an integration owner and an output contract. For sequential handoffs, design the workflow so the data passed to the next owner remains traceable.',
      pitfall: 'More agents are not automatically better. They also add coordination cost and more failure points.',
    },
    ['subagents', 'sdk-features'],
  ),
  card(
    'd1-task-agent', 'd1', ['1.3'], 'contrast',
    {
      prompt: 'Exam Guide v1.0の「Taskツール」と現行Agent SDK Docsの「Agentツール」は、学習時にどう扱う？',
      answer: '試験対策ではExam GuideのTask表記を押さえ、実装時は現行Docsと導入済みバージョンのAgent表記を確認する。',
      explanation: 'どちらもサブエージェントへ処理を委譲する文脈で現れます。資格試験の用語と、更新される製品ドキュメントの用語を混同せず、参照時点を明記します。',
      pitfall: '現行Docsの表記だけを覚えて、試験ガイドに書かれたTaskという語を誤りだと判断しないでください。',
    },
    {
      prompt: 'When studying, how should you treat the Exam Guide v1.0 term “Task tool” and the current Agent SDK Docs term “Agent tool”?',
      answer: 'For the exam, learn the Exam Guide’s “Task” terminology. For implementation, check the current Docs and the terminology used by the installed version.',
      explanation: 'Both terms appear in the context of delegating work to a subagent. Keep certification terminology separate from evolving product documentation, and record the date or version of the reference.',
      pitfall: 'Do not learn only the current Docs terminology and conclude that “Task” in the Exam Guide is an error.',
    },
    ['exam-guide', 'subagents'],
  ),
  card(
    'd1-hooks', 'd1', ['1.4', '1.5'], 'scenario',
    {
      prompt: '返金前の本人確認を必須にしたい。プロンプトに強く書く以外に、どこで保証する？',
      answer: 'ツール実行前の決定的なフックやアプリケーション側の認可で、条件を満たさない呼び出しを遮断する。',
      explanation: '文章による指示はモデルの判断を導きますが、必須ポリシーの強制境界にはなりません。フックは選択されたイベントでツール呼び出しを検査・記録・停止できます。',
      pitfall: 'フックの設定だけで満足せず、失敗時の戻り値と監査ログも検証します。',
    },
    {
      prompt: 'Identity verification must occur before a refund. Besides emphasizing it in the prompt, where should you guarantee it?',
      answer: 'Block noncompliant calls with a deterministic pre-tool hook or application-level authorization check.',
      explanation: 'Written instructions guide model behavior, but they are not an enforcement boundary for mandatory policy. A hook can inspect, log, and block tool calls at the selected lifecycle event.',
      pitfall: 'Do not stop after configuring the hook. Also verify failure return values and audit logs.',
    },
    ['hooks', 'sdk-features'],
  ),

  card(
    'd2-interface', 'd2', ['2.1'], 'recall',
    {
      prompt: 'モデルが適切なツールを選び、正しい引数を作るために、ツール定義へ最低限何を書く？',
      answer: '目的が明確な名前と説明、入力のJSON Schema、利用条件・境界を記述する。',
      explanation: 'ツール定義は人向け補足ではなく、モデルが選択と入力生成に使う契約です。似たツールとの差や、使ってはいけない状況も選択精度に影響します。',
      pitfall: '「何でも検索」のような広すぎる責任は、選択と権限の両方を曖昧にします。',
    },
    {
      prompt: 'At minimum, what should a tool definition include so the model can choose the right tool and construct valid arguments?',
      answer: 'Provide a purpose-specific name and description, an input JSON Schema, and the conditions and boundaries for use.',
      explanation: 'A tool definition is not merely documentation for people; it is a contract the model uses for selection and input generation. Differences from similar tools and situations where it must not be used also affect selection accuracy.',
      pitfall: 'An overly broad responsibility such as “search anything” makes both tool selection and authorization ambiguous.',
    },
    ['tool-use', 'mcp-tools'],
  ),
  card(
    'd2-errors', 'd2', ['2.2'], 'scenario',
    {
      prompt: '外部APIが一時的に失敗した。エージェントが再試行か中止かを判断できる返し方は？',
      answer: 'エラーであること、失敗分類、再試行可能性、安全な説明を構造化して返す。',
      explanation: '単なる文字列の「失敗」では次の行動を決めにくくなります。MCPのエラー表現やツール結果を使い、上位のオーケストレータが回復方針を選べる情報を残します。',
      pitfall: '資格情報、内部スタック、個人情報をエラー本文へそのまま含めないでください。',
    },
    {
      prompt: 'An external API fails temporarily. How should the tool respond so the agent can decide whether to retry or stop?',
      answer: 'Return a structured result that identifies it as an error and includes the failure category, retryability, and a safe explanation.',
      explanation: 'A plain “failed” string does not provide enough information to choose the next action. Use MCP error semantics or structured tool results so the higher-level orchestrator can select a recovery strategy.',
      pitfall: 'Do not include credentials, internal stack traces, or personal data verbatim in the error message.',
    },
    ['mcp-tools', 'tool-use'],
  ),
  card(
    'd2-scope', 'd2', ['2.4'], 'contrast',
    {
      prompt: 'MCP設定で、資格情報と接続先の設定を同じようにリポジトリへ保存してよい？',
      answer: 'いいえ。共有できる接続定義と秘密情報を分離し、秘密は環境変数や秘密管理へ置く。',
      explanation: 'MCPサーバーは利用者やプロジェクトなど適切なスコープで公開します。設定の配布範囲と、実際のアクセス権限は別々に確認します。',
      pitfall: '設定ファイルを非公開リポジトリに置くだけでは、秘密管理の代わりになりません。',
    },
    {
      prompt: 'In MCP configuration, should credentials and connection settings be stored in the repository in the same way?',
      answer: 'No. Separate shareable connection definitions from secrets, and store secrets in environment variables or a secrets manager.',
      explanation: 'Expose MCP servers at an appropriate scope, such as user or project. Review the distribution scope of configuration separately from the actual access permissions.',
      pitfall: 'Putting a configuration file in a private repository is not a substitute for secrets management.',
    },
    ['code-mcp', 'mcp-tools'],
  ),

  card(
    'd3-memory', 'd3', ['3.1', '3.3'], 'contrast',
    {
      prompt: 'チーム全体の規約と、特定のテストファイルだけの規約はどこに分ける？',
      answer: '共有の一般規約はプロジェクトのCLAUDE.mdへ、対象ファイルだけの規約はpath-specific rulesへ置く。',
      explanation: '適用範囲を狭めると、無関係な作業への指示干渉を減らせます。globが想定ファイルに一致することもレビュー対象です。',
      pitfall: '個人用設定へチーム必須ルールを置くと、他の開発者やCIで再現できません。',
    },
    {
      prompt: 'Where should you place team-wide conventions versus conventions that apply only to specific test files?',
      answer: 'Put shared general conventions in the project’s CLAUDE.md and rules for only the target files in path-specific rules.',
      explanation: 'Narrowing the scope reduces interference with unrelated work. Whether the glob matches the intended files is also something to review.',
      pitfall: 'If mandatory team rules live in personal settings, other developers and CI cannot reproduce them.',
    },
    ['code-memory'],
  ),
  card(
    'd3-skills', 'd3', ['3.2'], 'contrast',
    {
      prompt: '繰り返し使う専門手順を、必要なときに参照資源と一緒に読み込ませたい。何が向く？',
      answer: 'Skillが向く。説明、手順、必要な参照ファイルやスクリプトをまとまりとして提供できる。',
      explanation: '明示起動する操作との境界を意識しつつ、Skillは再利用可能な能力と文脈をパッケージ化します。説明はいつ使うべきかが分かるようにします。',
      pitfall: 'CLAUDE.mdは常時読み込む共有指示、Skillは特定の作業で使う再利用可能な手順です。用途の違いを意識してください。',
    },
    {
      prompt: 'What is suitable for packaging a repeatable specialist procedure with reference resources that load when needed?',
      answer: 'A Skill. It can bundle a description, procedure, and necessary reference files or scripts.',
      explanation: 'While maintaining a clear boundary from explicitly invoked operations, a Skill packages reusable capability and context. Its description should make clear when it should be used.',
      pitfall: 'CLAUDE.md contains shared instructions that are always loaded, while a Skill provides a reusable procedure for specific work. Keep their purposes distinct.',
    },
    ['skills', 'code-memory'],
  ),
  card(
    'd3-ci', 'd3', ['3.6'], 'scenario',
    {
      prompt: 'CIでClaude Codeを動かすとき、対話利用から変えるべき設計上の要点は？',
      answer: '非対話実行にし、権限、入力、出力形式、タイムアウト、終了状態をCIが判定できるよう固定する。',
      explanation: '人の確認待ちや曖昧な文章出力はパイプラインを停止させます。失敗を機械判定でき、ログから追跡できる境界を用意します。',
      pitfall: '開発者端末と同じ広い権限をCIへ与えないでください。',
    },
    {
      prompt: 'When running Claude Code in CI, what design points must change from interactive use?',
      answer: 'Use non-interactive execution and fix permissions, inputs, output format, timeout, and exit behavior so CI can evaluate the result.',
      explanation: 'Waiting for human confirmation or producing ambiguous prose can stall a pipeline. Provide boundaries that make failures machine-detectable and traceable through logs.',
      pitfall: 'Do not give CI the same broad permissions as a developer workstation.',
    },
    ['headless'],
  ),

  card(
    'd4-criteria', 'd4', ['4.1', '4.2'], 'recall',
    {
      prompt: '「良いレビューをして」より再現性を上げるため、プロンプトに何を足す？',
      answer: '観察可能な評価基準、尺度または合否条件、代表例と境界例を足す。',
      explanation: '明示したrubricは評価観点を揃え、few-shot例は抽象的な規則の適用方法を示します。基準と例が同じ判断を示すことを確認します。',
      pitfall: '例だけを大量に追加しても、どの特徴が重要か不明なままでは安定しません。',
    },
    {
      prompt: 'What should you add to a prompt to make results more reproducible than simply asking for “a good review”?',
      answer: 'Add observable evaluation criteria, a scale or pass/fail conditions, and representative examples and edge cases.',
      explanation: 'An explicit rubric aligns evaluation dimensions, while few-shot examples demonstrate how to apply abstract rules. Confirm that the criteria and examples lead to the same judgments.',
      pitfall: 'Adding many examples alone will not produce stable results if it remains unclear which characteristics matter.',
    },
    ['evals', 'prompting-best'],
  ),
  card(
    'd4-schema', 'd4', ['4.3'], 'contrast',
    {
      prompt: 'Structured outputsが保証する「形」と、別途検証すべき「中身」は何が違う？',
      answer: '形はスキーマへの準拠。中身は、値が業務ルールや現実の意味として正しいかどうか。',
      explanation: '型、必須項目、列挙値などはスキーマで制約できます。一方、日付の前後関係や根拠の正しさなどの意味検証はアプリケーション側に残ります。',
      pitfall: 'JSONとして読めることと、JSON Schemaへ準拠することも同じではありません。',
    },
    {
      prompt: 'How does the “shape” guaranteed by structured outputs differ from the “content” that still needs validation?',
      answer: 'Shape means schema compliance. Content means whether the values are correct under business rules and real-world semantics.',
      explanation: 'A schema can constrain types, required fields, and enum values. Semantic checks such as date ordering and whether evidence is correct remain the application’s responsibility.',
      pitfall: 'Being parseable as JSON is also not the same as complying with a JSON Schema.',
    },
    ['structured'],
  ),
  card(
    'd4-retry', 'd4', ['4.4', '4.6'], 'scenario',
    {
      prompt: '構造化出力の検証で1項目だけ失敗した。再試行プロンプトには何を返す？',
      answer: '失敗したフィールド、期待条件、実際の値を具体的に返し、修正範囲を限定する。',
      explanation: '具体的な検証結果はモデルが修正点へ集中する助けになります。再試行回数には上限を設け、解消しない場合のフォールバックも決めます。',
      pitfall: '毎回ゼロから同じ曖昧な指示を繰り返すと、同じ失敗を再現しやすくなります。',
    },
    {
      prompt: 'One field fails validation in a structured output. What should the retry prompt include?',
      answer: 'Identify the failed field, expected condition, and actual value, and limit the scope of the requested correction.',
      explanation: 'Specific validation results help the model focus on the correction. Limit the number of retries and define a fallback for failures that remain unresolved.',
      pitfall: 'Repeating the same vague instruction from scratch each time makes the same failure more likely to recur.',
    },
    ['structured', 'evals'],
  ),

  card(
    'd5-context', 'd5', ['5.1'], 'recall',
    {
      prompt: '長いセッションを要約するとき、要約文だけに閉じ込めてはいけない情報は？',
      answer: 'ID、金額、日付、明示的な決定、未完了の約束など、正確な継続に必要な重要事実。',
      explanation: '要約は履歴を圧縮できますが、細部を落とす性質があります。重要事実を構造化した状態として分離し、再開時に検証可能にします。',
      pitfall: '会話全文を無制限に残すことも、関連性の低下とコスト増につながります。',
    },
    {
      prompt: 'When summarizing a long session, what information must not be trapped only in the summary prose?',
      answer: 'Critical facts needed for accurate continuation, such as IDs, amounts, dates, explicit decisions, and outstanding commitments.',
      explanation: 'Summaries compress history but naturally lose detail. Preserve critical facts separately as structured state so they can be verified when the session resumes.',
      pitfall: 'Keeping the entire conversation indefinitely also reduces relevance and increases cost.',
    },
    ['context-windows', 'context-editing'],
  ),
  card(
    'd5-escalate', 'd5', ['5.2', '5.5'], 'scenario',
    {
      prompt: '高額処理の承認を、人へ渡すかどうか。モデルの自己申告confidenceだけで決めてよい？',
      answer: 'それだけでは不十分。金額、権限、例外種別、曖昧さなど外部から検証できる条件でルーティングする。',
      explanation: '人による確認は失敗後の逃げ道ではなく、最初から設計する制御点です。レビュー結果をカテゴリ別に追跡すると、隠れた弱点を見つけやすくなります。',
      pitfall: '全体の平均精度だけでは、高リスクな少数カテゴリの失敗が隠れることがあります。',
    },
    {
      prompt: 'Should a model’s self-reported confidence alone determine whether approval for a high-value action is handed to a person?',
      answer: 'No. Route it using externally verifiable conditions such as amount, permissions, exception type, and ambiguity.',
      explanation: 'Human review is a control point designed from the outset, not merely an escape route after failure. Tracking review outcomes by category makes hidden weaknesses easier to find.',
      pitfall: 'Overall average accuracy can hide failures in small, high-risk categories.',
    },
    ['evals', 'user-input'],
  ),
  card(
    'd5-provenance', 'd5', ['5.3', '5.6'], 'scenario',
    {
      prompt: '複数エージェントの調査結果を統合するとき、出典を失わない最小の契約は？',
      answer: '各主張にsource IDを対応させた構造化出力を受け取り、統合後もその対応を保持する。',
      explanation: 'URL一覧を末尾へ置くだけでは、どの根拠がどの主張を支えるか分かりません。下流の統合処理までclaim-source対応を運びます。',
      pitfall: '出典があること自体は主張の正しさを保証しません。内容の一致と情報の新しさも確認します。',
    },
    {
      prompt: 'When integrating research from multiple agents, what is the minimum contract needed to preserve sources?',
      answer: 'Receive structured output that maps each claim to source IDs, and preserve those mappings after integration.',
      explanation: 'A list of URLs at the end does not show which evidence supports which claim. Carry claim-to-source mappings through every downstream integration step.',
      pitfall: 'The presence of a source does not itself make a claim correct. Also check that the source supports the claim and is current.',
    },
    ['structured'],
  ),

  card(
    'd1-stop-truncation', 'd1', ['1.1'], 'recall',
    {
      prompt: '応答が stop_reason: max_tokens で途切れた。最後のブロックが不完全な tool_use だった場合を含め、どう対処する？',
      answer: '未完了として扱い、max_tokensを引き上げて再試行するか、途中までの応答を履歴へ追加して続きを生成させる。不完全なtool_useブロックはそのまま実行しない。',
      explanation: 'max_tokensは設定上限による打ち切りであり、正常終了のend_turnとは区別して扱います。利用者へ見せる場合は打ち切りである旨を明示します。',
      pitfall: 'pause_turnはサーバー側ツールの反復上限による一時停止で、失敗ではありません。応答をそのまま送り返せば続きから再開できます。',
    },
    {
      prompt: 'A response stopped with stop_reason: max_tokens. How should you handle it, including when the last block is an incomplete tool_use?',
      answer: 'Treat it as unfinished: retry with a higher max_tokens, or append the partial response to the history and ask for a continuation. Never execute an incomplete tool_use block as-is.',
      explanation: 'max_tokens means the configured limit cut off generation, which is distinct from a natural end_turn. If shown to users, mark the response as truncated.',
      pitfall: 'pause_turn is a pause at the server-side tool loop’s iteration limit, not a failure. Sending the response back continues the work where it left off.',
    },
    ['stop-reasons'],
    EXPANSION_VERIFIED_AT,
  ),
  card(
    'd1-parallel-review', 'd1', ['1.2'], 'scenario',
    {
      prompt: 'コードレビューをスタイル・セキュリティ・テスト網羅の3観点で行いたい。1つの会話で順番に調べる以外に何ができ、何が得られる？',
      answer: '観点ごとのサブエージェントを並列実行する。各自が独立したコンテキストで作業して最終メッセージだけが親へ返るため、所要時間は最も遅い1件分に近づく。',
      explanation: '中間のツール呼び出しや読んだファイルはサブエージェント内に留まり、親の会話を膨らませません。互いの結果に依存しない観点であることが並列化の前提です。',
      pitfall: '委譲すれば速くなるとは限りません。結果を待ち合わせて統合する工程は残るため、統合の責任者と出力形式を決めておく必要があります。',
    },
    {
      prompt: 'You want a code review across three dimensions: style, security, and test coverage. Besides checking them sequentially in one conversation, what can you do and what does it buy you?',
      answer: 'Run one subagent per dimension in parallel. Each works in its own isolated context and only its final message returns to the parent, so total time approaches that of the slowest one.',
      explanation: 'Intermediate tool calls and file reads stay inside each subagent instead of growing the parent conversation. Parallelization presumes the dimensions do not depend on one another’s results.',
      pitfall: 'Delegation is not automatically faster. Someone still has to collect and integrate the results, so decide the integration owner and output format up front.',
    },
    ['subagents'],
    EXPANSION_VERIFIED_AT,
  ),
  card(
    'd1-subagent-input', 'd1', ['1.3'], 'scenario',
    {
      prompt: 'サブエージェントに「さっきのエラーを調査して」と指示したら、見当違いの調査結果が返ってきた。原因と直し方は？',
      answer: 'サブエージェントのコンテキストは新規に始まり、親からは起動時のプロンプト文字列しか渡らない。ファイルパス、エラーメッセージ、これまでの決定事項をプロンプトに明示的に含める。',
      explanation: 'サブエージェントが受け取るのは自身のシステムプロンプト・起動プロンプト・ツール定義などで、親の会話履歴やツール結果は受け取りません。',
      pitfall: '「さっきの」「あのファイル」のような会話内参照は、親の履歴を持たないサブエージェントには解決できません。',
    },
    {
      prompt: 'You told a subagent to “investigate that error from earlier” and got an off-target result. What is the cause and the fix?',
      answer: 'A subagent’s context starts fresh; the only thing passed from the parent is the invocation prompt string. Include the file paths, error messages, and prior decisions explicitly in that prompt.',
      explanation: 'A subagent receives its own system prompt, the invocation prompt, and tool definitions. It does not receive the parent’s conversation history or tool results.',
      pitfall: 'Conversational references like “that error” or “the file from before” cannot be resolved by a subagent that has no parent history.',
    },
    ['subagents'],
    EXPANSION_VERIFIED_AT,
  ),
  card(
    'd1-advisory-enforced', 'd1', ['1.4'], 'contrast',
    {
      prompt: 'CLAUDE.mdに書いた「〜してはならない」と、PreToolUseフックによるブロックは何が違う？',
      answer: 'CLAUDE.mdはモデルが読む文脈であり、従う保証はない。フックは選んだイベントで必ず実行され、条件を満たさないツール呼び出しを決定的に遮断できる。',
      explanation: '毎回確実に守らせたいルールはフックや設定の強制層に置き、判断を導く指針は指示文に置く、と役割を分けます。',
      pitfall: '指示文にIMPORTANT等の強調をいくら重ねても、強制境界にはなりません。',
    },
    {
      prompt: 'How does a “never do X” line in CLAUDE.md differ from a block enforced by a PreToolUse hook?',
      answer: 'CLAUDE.md is context the model reads, with no guarantee of compliance. A hook always executes at its chosen event and can deterministically block tool calls that violate the condition.',
      explanation: 'Separate the roles: rules that must hold every time belong in hooks or other enforcement layers, while guidance that shapes judgment belongs in instructions.',
      pitfall: 'No amount of emphasis such as “IMPORTANT” turns an instruction into an enforcement boundary.',
    },
    ['hooks', 'code-memory'],
    EXPANSION_VERIFIED_AT,
  ),
  card(
    'd1-hook-exit-codes', 'd1', ['1.5'], 'recall',
    {
      prompt: 'コマンド型フックの終了コード0と2は、それぞれ何を意味する？',
      answer: '0は「異議なし」で処理は通常どおり進む（PreToolUseでは通常の権限フローが引き続き適用される）。2はブロックで、stderrへ書いた理由がClaudeへのフィードバックとして渡る。',
      explanation: 'その他の終了コードはフックのエラーとして扱われつつ処理は続行します。ブロックできないイベントでは終了コード2でもstderr表示のみです。より細かい制御は終了コード0とJSON出力で行います。',
      pitfall: '終了コード2とJSON出力は併用できません。2で終了するとJSONは無視されます。',
    },
    {
      prompt: 'In a command hook, what do exit codes 0 and 2 mean?',
      answer: 'Exit 0 means “no objection” and processing continues normally (for PreToolUse, the regular permission flow still applies). Exit 2 blocks the action, and the reason written to stderr is fed back to Claude.',
      explanation: 'Other exit codes are treated as hook errors while the action proceeds. Some events cannot be blocked; there, exit 2 only shows stderr to the user. For finer control, exit 0 and print structured JSON.',
      pitfall: 'Do not combine exit code 2 with JSON output. When you exit with 2, the JSON is ignored.',
    },
    ['hooks'],
    EXPANSION_VERIFIED_AT,
  ),
  card(
    'd1-fixed-vs-loop', 'd1', ['1.6'], 'contrast',
    {
      prompt: '「編集のたびに必ずlintを実行」と「失敗テストの原因調査」。固定の仕組みとモデル駆動のループ、それぞれどちらで実現する？',
      answer: '毎回同じ手順で判断の要らない前者はフックなどの決定的な仕組みに固定する。次の一手が直前の結果に依存する後者は、エージェントループに動的に決めさせる。',
      explanation: 'エージェントループは各ステップで得た情報から次の行動を選びます。事前に列挙できる工程まで毎回モデルの判断に委ねると、コストと不確実性だけが増えます。',
      pitfall: '逆の割り当て — 探索的なデバッグを固定手順に押し込む、常に実行すべき検査をモデル任せにする — が典型的な設計ミスです。',
    },
    {
      prompt: '“Run lint after every edit” versus “investigate why a test fails”: which belongs in a fixed mechanism and which in the model-driven loop?',
      answer: 'The former needs no judgment and must run identically every time, so fix it in a deterministic mechanism such as a hook. The latter’s next step depends on the previous result, so let the agentic loop decide dynamically.',
      explanation: 'The agentic loop chooses each action based on what the previous step revealed. Delegating pre-enumerable steps to the model on every run adds only cost and uncertainty.',
      pitfall: 'The classic design mistake is the reverse assignment: forcing exploratory debugging into a fixed procedure, or leaving an always-required check to the model’s discretion.',
    },
    ['code-how', 'code-features'],
    EXPANSION_VERIFIED_AT,
  ),
  card(
    'd1-resume-vs-fork', 'd1', ['1.7'], 'contrast',
    {
      prompt: 'セッションのresumeとforkは何が違い、それぞれいつ使う？',
      answer: 'resumeは同じセッションIDへ履歴を継ぎ足す。forkは履歴のコピーから新しいIDの別セッションを作り、元は無変更で残る。続きの作業はresume、元を保ったまま別案を試すならfork。',
      explanation: 'fork後は独立した2つの履歴ができ、それぞれを個別にresumeできます。',
      pitfall: 'forkが分岐させるのは会話履歴だけです。ファイル変更は実体に及び、同じディレクトリで作業する他のセッションからも見えます。',
    },
    {
      prompt: 'How do resuming and forking a session differ, and when do you use each?',
      answer: 'Resume appends to the same session ID. Fork creates a new session with a new ID from a copy of the history, leaving the original untouched. Resume to continue the work; fork to try an alternative while keeping the original.',
      explanation: 'After a fork you have two independent histories, and each can be resumed separately.',
      pitfall: 'Forking branches only the conversation history. File edits are real and visible to any session working in the same directory.',
    },
    ['sessions'],
    EXPANSION_VERIFIED_AT,
  ),
  card(
    'd1-session-lookup', 'd1', ['1.7'], 'scenario',
    {
      prompt: '保存しておいたセッションIDでresumeしたのに、履歴のない新規セッションが始まった。まず何を疑う？',
      answer: '作業ディレクトリの不一致。セッションは作業ディレクトリをエンコードしたパス配下に保存されるため、別のディレクトリから再開すると見つからない。',
      explanation: '別ホストでの再開は、セッションファイルを同じパスへ復元するか、必要な結果をアプリケーション状態として新しいセッションのプロンプトに渡します。後者の方が堅牢なことが多いです。',
      pitfall: 'セッションが保存するのは会話であって、ファイルシステムの状態ではありません。',
    },
    {
      prompt: 'You resumed with a saved session ID, but got a fresh session with no history. What should you suspect first?',
      answer: 'A working-directory mismatch. Sessions are stored under a path derived from the working directory, so resuming from a different directory looks in the wrong place.',
      explanation: 'To resume on another host, either restore the session file to the same path, or capture the needed results as application state and pass them into a fresh session’s prompt. The latter is often more robust.',
      pitfall: 'Sessions persist the conversation, not the state of the filesystem.',
    },
    ['sessions'],
    EXPANSION_VERIFIED_AT,
  ),

  card(
    'd2-description-depth', 'd2', ['2.1'], 'recall',
    {
      prompt: 'ツールの性能に最も効く定義要素は何で、そこには何を書く？',
      answer: '詳細な説明が最重要。何をするか、いつ使うべきか（使うべきでないか）、各パラメータの意味、返さない情報などの制約を、1ツールあたり3〜4文以上で書く。',
      explanation: '複雑な入力を持つツールでは、説明に加えてスキーマ検証済みの入力例を渡す方法も有効です。',
      pitfall: '「tickerの株価を取得」のような一行説明は、いつ使うか・何を返さないかが不明なままで、ツール選択と引数生成の両方を誤らせます。',
    },
    {
      prompt: 'Which part of a tool definition matters most for performance, and what belongs in it?',
      answer: 'The detailed description. Cover what the tool does, when it should and should not be used, what each parameter means, and caveats such as what it does not return — at least 3–4 sentences per tool.',
      explanation: 'For tools with complex inputs, schema-validated input examples are a useful supplement to the description.',
      pitfall: 'A one-liner like “gets the stock price for a ticker” leaves usage conditions and omissions unclear, hurting both tool selection and argument construction.',
    },
    ['define-tools'],
    EXPANSION_VERIFIED_AT,
  ),
  card(
    'd2-consolidation', 'd2', ['2.1', '2.3'], 'contrast',
    {
      prompt: 'create_pr / review_pr / merge_pr を別ツールにするのと、actionパラメータを持つ1ツールへまとめるのは、どちらが選択精度に有利？',
      answer: '関連操作は少数の高機能なツールへ統合する方が、選択の曖昧さを減らす。複数サービスにまたがる場合は github_ のようなサービス接頭辞で名前空間を分ける。',
      explanation: '応答側も高シグナルな情報だけを返すよう設計します。肥大した応答はコンテキストを浪費し、次の判断を難しくします。',
      pitfall: '統合の行き過ぎで「何でもできる」1ツールにすると、今度は説明と権限境界が曖昧になります。責任の単位でまとめます。',
    },
    {
      prompt: 'Separate create_pr / review_pr / merge_pr tools, or one tool with an action parameter — which helps selection accuracy?',
      answer: 'Consolidating related operations into fewer, more capable tools reduces selection ambiguity. When tools span multiple services, namespace the names with a service prefix such as github_.',
      explanation: 'Design responses to return only high-signal information. Bloated responses waste context and make the next decision harder.',
      pitfall: 'Over-consolidating into one do-everything tool blurs the description and the permission boundary instead. Group by responsibility.',
    },
    ['define-tools'],
    EXPANSION_VERIFIED_AT,
  ),
  card(
    'd2-error-channels', 'd2', ['2.2'], 'contrast',
    {
      prompt: 'MCPの「ツール実行エラー」と「プロトコルエラー」は、報告経路とモデルにとっての意味がどう違う？',
      answer: '実行エラー（API失敗、入力値の検証エラーなど）は結果の isError: true で返し、修正のヒントを含められる。未知のツール名やリクエスト構造の不備はJSON-RPCのプロトコルエラーになる。',
      explanation: 'クライアントは実行エラーをモデルへ渡すべきとされています。実行エラーの本文は、モデルがパラメータを直して再試行するための実行可能なフィードバックになります。',
      pitfall: '実行時の失敗をプロトコルエラーとして投げると、モデルの自己修正の機会を奪います。',
    },
    {
      prompt: 'In MCP, how do tool execution errors and protocol errors differ in reporting channel and in what they mean to the model?',
      answer: 'Execution errors (API failures, input validation problems) are returned in the result with isError: true and can carry correction hints. Unknown tool names or malformed requests become JSON-RPC protocol errors.',
      explanation: 'Clients should pass execution errors to the model: their content is actionable feedback the model can use to adjust parameters and retry.',
      pitfall: 'Raising a runtime failure as a protocol error robs the model of its chance to self-correct.',
    },
    ['mcp-tools'],
    EXPANSION_VERIFIED_AT,
  ),
  card(
    'd2-tool-context', 'd2', ['2.3'], 'scenario',
    {
      prompt: 'MCPサーバーを増やすと、ツール定義がコンテキストを圧迫しないか心配になった。Claude Codeは既定でどう扱う？',
      answer: 'ツール検索が既定で有効なため、起動時に読み込まれるのはツール名だけ。完全な定義は、実際にそのツールを使うときに読み込まれる。',
      explanation: 'サーバーごとの接続状態やトークンコストは/mcpで確認できます。ツール数はモデルの選択精度だけでなく、コンテキスト予算の問題でもあります。',
      pitfall: 'MCPツールの出力にも上限と警告があります。定義の遅延読み込みに頼る前に、返す情報自体を絞る設計が先です。',
    },
    {
      prompt: 'You worry that adding MCP servers will flood the context with tool definitions. How does Claude Code handle this by default?',
      answer: 'Tool search is on by default, so only tool names load at startup. Full definitions are loaded on demand when Claude actually uses a specific tool.',
      explanation: 'Check per-server connection status and token costs with /mcp. Tool count is a context-budget question as well as a selection-accuracy one.',
      pitfall: 'MCP tool output also has limits and warnings. Trimming what each tool returns comes before relying on deferred definitions.',
    },
    ['code-mcp'],
    EXPANSION_VERIFIED_AT,
  ),
  card(
    'd2-config-scopes', 'd2', ['2.4'], 'recall',
    {
      prompt: 'Claude CodeのMCP設定スコープ3種と、同名サーバーが複数スコープにあるときの扱いは？',
      answer: 'local（自分×現在のプロジェクト）、project（.mcp.jsonでチーム共有）、user（自分×全プロジェクト）。優先度は local > project > user で、最上位スコープの定義が丸ごと使われる。',
      explanation: '共有する.mcp.jsonでは ${VAR} や ${VAR:-default} の環境変数展開が使え、APIキーなどの秘密は設定ファイルへ直書きせず環境変数から注入します。',
      pitfall: 'スコープをまたいだフィールド単位のマージは行われません。上位の定義が全体を置き換えます。',
    },
    {
      prompt: 'What are Claude Code’s three MCP configuration scopes, and what happens when the same server name exists in more than one?',
      answer: 'local (you, current project), project (team-shared via .mcp.json), and user (you, all projects). Precedence is local > project > user, and the entire definition from the highest scope is used.',
      explanation: 'Shared .mcp.json files support ${VAR} and ${VAR:-default} environment variable expansion, so secrets like API keys are injected from the environment instead of hard-coded.',
      pitfall: 'Fields are not merged across scopes. The higher-scope definition replaces the whole entry.',
    },
    ['code-mcp'],
    EXPANSION_VERIFIED_AT,
  ),
  card(
    'd2-builtin-map', 'd2', ['2.5'], 'recall',
    {
      prompt: 'Claude Codeの組み込みツールはどんな役割に大別され、それぞれ何を担う？',
      answer: 'ファイル操作（読み書き・編集・作成）、検索（パターン・内容）、実行（シェルコマンド・テスト・git）、Web（検索・取得）、コードインテリジェンス（定義・参照・型エラー）の5系統。',
      explanation: '各ツールの結果が次の判断材料となり、文脈収集・行動・検証のループが回ります。',
      pitfall: '役割に対してリスクの大きい道具を選ばないでください。読取で足りる調査に実行系ツールは不要です。',
    },
    {
      prompt: 'Into what broad categories do Claude Code’s built-in tools fall, and what does each cover?',
      answer: 'Five groups: file operations (read, edit, create), search (patterns and content), execution (shell commands, tests, git), web (search and fetch), and code intelligence (definitions, references, type errors).',
      explanation: 'Each tool result feeds the next decision, driving the gather-context, take-action, verify loop.',
      pitfall: 'Do not pick a riskier tool than the job requires. An investigation that reads files does not need execution tools.',
    },
    ['code-how'],
    EXPANSION_VERIFIED_AT,
  ),
  card(
    'd2-act-verify', 'd2', ['2.5'], 'scenario',
    {
      prompt: '「失敗しているテストを直して」と頼まれたエージェントの、模範的なツール使用の流れは？',
      answer: 'テストを実行して失敗を確認→エラー出力を読む→関連ソースを検索して読む→修正を加える→再度テストを実行して検証する。各結果を次の行動の入力にする。',
      explanation: '文脈収集・行動・検証は混ざり合いながら進みます。修正後の再実行（検証）を省くと、「直ったように見える」だけの状態が残ります。',
      pitfall: '対象を読まずに編集を始めないでください。検証されていない修正は完了ではありません。',
    },
    {
      prompt: 'What is an exemplary tool-use sequence for an agent asked to “fix the failing tests”?',
      answer: 'Run the tests to see the failures → read the error output → search for and read the relevant sources → edit the fix → run the tests again to verify. Each result feeds the next action.',
      explanation: 'Context gathering, action, and verification blend together. Skipping the re-run leaves only the appearance of a fix.',
      pitfall: 'Do not start editing before reading the target. An unverified fix is not done.',
    },
    ['code-how'],
    EXPANSION_VERIFIED_AT,
  ),

  card(
    'd3-file-locations', 'd3', ['3.1'], 'recall',
    {
      prompt: 'CLAUDE.mdを置ける主な場所と、それぞれの共有範囲は？',
      answer: '管理ポリシー（組織全体）、~/.claude/CLAUDE.md（個人×全プロジェクト）、./CLAUDE.md または ./.claude/CLAUDE.md（バージョン管理でチーム共有）、CLAUDE.local.md（個人×プロジェクト、gitignore対象）。',
      explanation: 'すべて連結されて文脈へ入る加算方式で、広いスコープから順に読み込まれます。サブディレクトリのCLAUDE.mdは、そこにあるファイルを読むときにオンデマンドで読み込まれます。',
      pitfall: '上書きし合う階層ではありません。矛盾した指示はモデルの解釈に委ねられるため、矛盾自体を取り除きます。',
    },
    {
      prompt: 'Where can CLAUDE.md files live, and who does each location share with?',
      answer: 'Managed policy (whole organization), ~/.claude/CLAUDE.md (you, all projects), ./CLAUDE.md or ./.claude/CLAUDE.md (team, via version control), and CLAUDE.local.md (you, this project; gitignored).',
      explanation: 'All levels are additive: contents are concatenated into context, loaded from the broadest scope down. Subdirectory CLAUDE.md files load on demand when files there are read.',
      pitfall: 'This is not an override hierarchy. Conflicting instructions are left to the model’s interpretation, so remove the conflicts themselves.',
    },
    ['code-memory'],
    EXPANSION_VERIFIED_AT,
  ),
  card(
    'd3-trim-scope', 'd3', ['3.1', '3.3'], 'scenario',
    {
      prompt: 'CLAUDE.mdが肥大化し、指示の遵守も悪くなってきた。どう整理する？',
      answer: '200行以下を目安に刈り込み、特定のファイル種別にだけ必要な指示は .claude/rules/ の paths フロントマター付きルールへ移して、該当ファイルを扱うときだけ読み込ませる。',
      explanation: 'paths指定のないルールは常時読み込みで、CLAUDE.mdと同じコストがかかります。globが意図したファイルに一致するかも確認します。',
      pitfall: '@importsへの分割は整理には役立ちますが、インポート先も起動時に読み込まれるため、コンテキスト削減にはなりません。',
    },
    {
      prompt: 'Your CLAUDE.md has grown large and adherence is degrading. How do you reorganize it?',
      answer: 'Trim toward the ~200-line guideline, and move instructions needed only for specific file types into .claude/rules/ files with paths frontmatter, so they load only when matching files are touched.',
      explanation: 'Rules without a paths field load unconditionally and cost the same as CLAUDE.md. Also verify that the globs match the intended files.',
      pitfall: 'Splitting content into @imports helps organization but not context: imported files still load at launch.',
    },
    ['code-memory'],
    EXPANSION_VERIFIED_AT,
  ),
  card(
    'd3-manual-skill', 'd3', ['3.2'], 'contrast',
    {
      prompt: '副作用のあるデプロイ手順をSkillにする。モデルによる自動起動を避けて利用者の明示起動だけにするには？',
      answer: 'フロントマターに disable-model-invocation: true を設定する。/名前 での明示起動専用になり、説明もセッション文脈へ載らなくなる。',
      explanation: '既定のSkillは説明が起動時に読み込まれ、タスクに合致するとモデルが本文を読み込みます。参照知識は自動起動、副作用のある定型操作は明示起動という使い分けが基本です。',
      pitfall: '自動起動させたいSkillの説明が曖昧だと、起動判定を誤ります。いつ使うかを要求に出てくる語で書きます。',
    },
    {
      prompt: 'You are packaging a deployment procedure with side effects as a Skill. How do you restrict it to explicit user invocation, avoiding automatic model invocation?',
      answer: 'Set disable-model-invocation: true in the frontmatter. The skill becomes /name-only, and its description no longer loads into session context.',
      explanation: 'By default a skill’s description loads at startup and the model loads the body when the task matches. Reference knowledge suits automatic invocation; side-effectful routines suit explicit invocation.',
      pitfall: 'For skills you do want auto-invoked, a vague description causes wrong triggering. Describe when to use it in words a request would contain.',
    },
    ['code-features', 'code-best-practices'],
    EXPANSION_VERIFIED_AT,
  ),
  card(
    'd3-plan-when', 'd3', ['3.4'], 'contrast',
    {
      prompt: 'Plan modeを使うべきタスクと、直接実装させるべきタスクの見分け方は？',
      answer: '方針が不確か、変更が複数ファイルに及ぶ、不慣れなコードを触る場合は探索→計画→実装を分ける。差分を一文で説明できるなら計画は省いて直接実行させる。',
      explanation: 'Plan modeではソースを変更せずに読解と計画だけを行い、計画をレビューしてからモードを切り替えて実装します。',
      pitfall: '一律適用は逆効果です。typo修正やログ1行の追加に計画の往復は不要です。',
    },
    {
      prompt: 'How do you decide which tasks deserve plan mode and which should be implemented directly?',
      answer: 'Separate explore → plan → implement when the approach is uncertain, the change spans multiple files, or the code is unfamiliar. If you could describe the diff in one sentence, skip the plan and execute directly.',
      explanation: 'In plan mode, Claude reads and plans without modifying sources; you review the plan, then switch modes to implement.',
      pitfall: 'Blanket use backfires. A typo fix or a one-line log addition does not need a planning round trip.',
    },
    ['code-best-practices', 'code-how'],
    EXPANSION_VERIFIED_AT,
  ),
  card(
    'd3-reset-context', 'd3', ['3.4', '3.5'], 'scenario',
    {
      prompt: '同じ問題を2回訂正してもまだ迷走している。3回目の訂正を重ねるべきか？',
      answer: 'いいえ。文脈は失敗したアプローチで汚れているため、/clearで仕切り直し、学んだ内容を織り込んだより具体的なプロンプトで最初からやり直す方がよい。',
      explanation: 'きれいな文脈と改善した初期プロンプトの組み合わせは、訂正が堆積した長いセッションにほぼ常に勝ります。無関係なタスクの切り替え時にも/clearで文脈を戻します。',
      pitfall: '訂正の積み重ねそのものが文脈を悪化させる一因になります。粘るほど不利になる局面があります。',
    },
    {
      prompt: 'You have corrected the same issue twice and Claude is still off track. Should you pile on a third correction?',
      answer: 'No. The context is polluted with failed approaches. Run /clear and restart with a more specific prompt that incorporates what you learned.',
      explanation: 'A clean context plus a better initial prompt almost always beats a long session with accumulated corrections. Also /clear between unrelated tasks.',
      pitfall: 'The pile of corrections is itself part of what degrades the context. Persisting can make things worse.',
    },
    ['code-best-practices'],
    EXPANSION_VERIFIED_AT,
  ),
  card(
    'd3-verifiable-goal', 'd3', ['3.5'], 'scenario',
    {
      prompt: '目を離しても自走するセッションにしたい。プロンプトに何を足す？',
      answer: 'Claudeが自分で実行できる合否シグナル — 期待入出力つきのテストケース、ビルドの終了コード、比較用スクリーンショットなど — を渡し、パスするまで反復させる。',
      explanation: '検証手段がないと「できたように見える」ことが唯一の停止条件になり、人間が検証ループの役を負います。完了報告には、実行したコマンドと出力などの証拠を出させます。',
      pitfall: '「良くして」は検証不能です。観察可能な基準へ翻訳してから渡してください。',
    },
    {
      prompt: 'You want a session that keeps working correctly while you step away. What do you add to the prompt?',
      answer: 'A pass/fail signal Claude can run itself — test cases with expected input/output, a build exit code, a screenshot to compare — and instruct it to iterate until the check passes.',
      explanation: 'Without a runnable check, “looks done” becomes the only stop condition and you become the verification loop. Have Claude report evidence: the commands it ran and their output.',
      pitfall: '“Make it better” cannot be verified. Translate it into observable criteria first.',
    },
    ['code-best-practices'],
    EXPANSION_VERIFIED_AT,
  ),
  card(
    'd3-print-mode', 'd3', ['3.6'], 'recall',
    {
      prompt: 'スクリプトから機械処理しやすい形でClaude Codeを1回実行する基本形は？',
      answer: 'claude -p "プロンプト" に --output-format json を付け、必要なツールを --allowedTools や permission mode で事前に固定する。JSONの result / session_id をパースして使う。',
      explanation: '継続は --continue、特定セッションは --resume <id>。環境差をなくすには --bare で自動読み込みを止め、必要な設定だけフラグで渡します。',
      pitfall: '非対話実行に人の承認フローはありません。未許可のツールに当たると処理が進まないため、必要な権限を洗い出して明示します。',
    },
    {
      prompt: 'What is the basic form for one scripted, machine-readable Claude Code run?',
      answer: 'claude -p "prompt" with --output-format json, pre-authorizing the needed tools via --allowedTools or a permission mode. Parse result and session_id from the JSON.',
      explanation: 'Continue with --continue, or a specific session with --resume <id>. For reproducibility across machines, --bare skips auto-discovered config so only explicit flags apply.',
      pitfall: 'There is no human approval flow in non-interactive runs. Hitting an unauthorized tool stalls the run, so enumerate and grant the needed permissions explicitly.',
    },
    ['headless'],
    EXPANSION_VERIFIED_AT,
  ),

  card(
    'd4-grader-choice', 'd4', ['4.1'], 'contrast',
    {
      prompt: 'コードによる採点とLLMによる採点はどう使い分け、LLM採点を安定させるコツは？',
      answer: '完全一致や類似度など機械的に測れるものはコードで採点し、トーンや一貫性など主観的な性質はLLM採点にする。LLM採点は詳細なルーブリック、推論の明示、経験的な尺度（リッカート等）、生成側と別のモデルで安定させる。',
      explanation: '少数の高品質な手動評価より、自動採点できる大量の設問の方がシグナルは積み上がります。',
      pitfall: '採点者と被評価者を同じモデルにすると、自己の出力を好むバイアスが混入します。',
    },
    {
      prompt: 'When do you grade with code versus with an LLM, and how do you keep LLM grading stable?',
      answer: 'Grade mechanically measurable outputs (exact match, similarity) with code; grade subjective qualities like tone and coherence with an LLM. Stabilize LLM grading with detailed rubrics, explicit reasoning, empirical scales such as Likert, and a different model from the one being evaluated.',
      explanation: 'Many automatically graded questions accumulate more signal than a few hand-graded ones.',
      pitfall: 'Using the same model as grader and subject introduces a self-preference bias.',
    },
    ['evals'],
    EXPANSION_VERIFIED_AT,
  ),
  card(
    'd4-example-quality', 'd4', ['4.2'], 'recall',
    {
      prompt: 'few-shot例の効果を左右する3つの性質と、目安の個数は？',
      answer: '実際のユースケースを反映する（関連性）、エッジケースを含み偏ったパターンを拾わせない（多様性）、<example>タグで指示と区別する（構造化）。3〜5例が目安。',
      explanation: '例は出力の形式・トーン・構造を誘導する最も確実な手段の一つです。手持ちの例の評価や追加生成をClaude自身に頼むこともできます。',
      pitfall: '似た例ばかり並べると、長さや語順のような意図しない表面的パターンまで学習されます。',
    },
    {
      prompt: 'What three qualities determine how well few-shot examples work, and how many should you include?',
      answer: 'Relevant (mirror the actual use case), diverse (cover edge cases and vary enough to avoid unintended patterns), and structured (wrapped in <example> tags to separate them from instructions). Aim for 3–5 examples.',
      explanation: 'Examples are one of the most reliable ways to steer format, tone, and structure. You can also ask Claude to critique your examples or generate more.',
      pitfall: 'A set of near-identical examples teaches superficial patterns — length, word order — that you never intended.',
    },
    ['prompting-best'],
    EXPANSION_VERIFIED_AT,
  ),
  card(
    'd4-output-vs-strict', 'd4', ['4.3'], 'contrast',
    {
      prompt: 'structured outputsの「JSON出力」と「strictツール利用」は、それぞれ何のスキーマ準拠を保証する？',
      answer: 'JSON出力（output_format）はClaudeの応答本文がスキーマへ準拠することを、ツール定義の strict: true はツール呼び出しの引数がスキーマへ準拠することを保証する。併用もできる。',
      explanation: 'どちらも制約付きサンプリングにより構文・型・必須項目を保証しますが、値の意味的な正しさまでは保証しません。',
      pitfall: '安全性による拒否（refusal）時はスキーマ準拠の出力になりません。stop_reasonの確認は引き続き必要です。',
    },
    {
      prompt: 'In structured outputs, what does “JSON outputs” guarantee versus “strict tool use”?',
      answer: 'JSON outputs (output_format) guarantees that Claude’s response body conforms to your schema; strict: true on a tool definition guarantees that tool-call arguments conform to the tool’s schema. They can be combined.',
      explanation: 'Both use constrained sampling to guarantee syntax, types, and required fields — but not the semantic correctness of the values.',
      pitfall: 'A safety refusal does not produce schema-conforming output. You still need to check stop_reason.',
    },
    ['structured'],
    EXPANSION_VERIFIED_AT,
  ),
  card(
    'd4-schema-gaps', 'd4', ['4.3', '4.4'], 'scenario',
    {
      prompt: '「金額は0以上」をJSONスキーマのminimumで、structured outputsに強制させたい。可能？',
      answer: '不可。数値範囲（minimum/maximum）など未サポートの制約がある。形はスキーマで保証し、値の条件はアプリ側で検証して、失敗したフィールドと理由を返す限定的な再試行で直す。',
      explanation: '再帰スキーマや一部の文字列制約も未サポートです。SDKヘルパー（Pydantic/Zod連携）は未対応制約を自動的に除いた変換を行います。',
      pitfall: '「スキーマに書けた」ことと「強制されている」ことは別です。構文保証と意味検証の境界を設計に織り込みます。',
    },
    {
      prompt: 'You want structured outputs to enforce “amount must be at least 0” via JSON Schema minimum. Does that work?',
      answer: 'No. Numerical range constraints such as minimum/maximum are unsupported. Guarantee the shape with the schema, validate value conditions in your application, and retry narrowly by reporting the failed field and reason.',
      explanation: 'Recursive schemas and some string constraints are also unsupported. SDK helpers (Pydantic/Zod integration) transform schemas by stripping unsupported constraints automatically.',
      pitfall: 'Being expressible in your schema is not the same as being enforced. Design around the boundary between structural guarantees and semantic validation.',
    },
    ['structured'],
    EXPANSION_VERIFIED_AT,
  ),
  card(
    'd4-batch-shape', 'd4', ['4.5'], 'recall',
    {
      prompt: 'Message Batches APIの費用・規模・時間の基本数値は？',
      answer: '通常price比50%割引。1バッチは10万リクエストまたは256MBまで。多くは1時間以内に完了し、24時間で期限切れになる。結果は作成から29日間ダウンロードできる。',
      explanation: '大規模評価、コンテンツモデレーション、データ分析のような、即時応答が不要な大量処理に向いています。',
      pitfall: '24時間の期限で未処理のリクエストはexpiredになります（課金なし）。全件処理の保証ではない前提で、再投入を設計します。',
    },
    {
      prompt: 'What are the basic cost, size, and timing numbers for the Message Batches API?',
      answer: 'A 50% discount versus standard pricing. One batch holds up to 100,000 requests or 256 MB. Most batches finish within 1 hour, and processing expires at 24 hours. Results stay downloadable for 29 days after creation.',
      explanation: 'It suits high-volume work that does not need immediate responses: large-scale evals, content moderation, data analysis.',
      pitfall: 'Requests still unprocessed at the 24-hour expiry become expired (not billed). Design resubmission on the assumption that completion is not guaranteed.',
    },
    ['batch'],
    EXPANSION_VERIFIED_AT,
  ),
  card(
    'd4-batch-matching', 'd4', ['4.5'], 'scenario',
    {
      prompt: 'バッチの結果を取得したら、順序が投入時と違っていた。どう突き合わせ、結果種別ごとに何をする？',
      answer: '結果は任意の順で返るため、投入時に付けた一意のcustom_idで対応付ける。各結果は succeeded / errored / canceled / expired のいずれかで、成功は保存、失敗系は原因確認や再投入に回す。',
      explanation: 'errored・canceled・expiredのリクエストは課金されません。種別ごとの後処理を最初から書いておきます。',
      pitfall: '配列の添字による対応付けは誤りです。順序は保証されません。',
    },
    {
      prompt: 'Your batch results came back in a different order than submitted. How do you match them, and what do you do per result type?',
      answer: 'Results can arrive in any order, so match them by the unique custom_id you assigned at submission. Each result is succeeded, errored, canceled, or expired: store successes and route the failure types to diagnosis or resubmission.',
      explanation: 'Errored, canceled, and expired requests are not billed. Write the per-type handling from the start.',
      pitfall: 'Matching by array index is wrong. Ordering is not guaranteed.',
    },
    ['batch'],
    EXPANSION_VERIFIED_AT,
  ),
  card(
    'd4-fresh-reviewer', 'd4', ['4.6'], 'scenario',
    {
      prompt: '実装した本人のClaudeに自己レビューさせる場合と、新しいコンテキストにレビューさせる場合で、なぜ品質に差が出る？',
      answer: '新しいコンテキストのレビュアは差分と評価基準だけを見て判断し、その変更を生んだ推論に引きずられない。実装したセッションは自分の書いたコードを是とする側に偏る。',
      explanation: 'サブエージェントや別セッションのWriter/Reviewer分担で分離できます。指摘は実装側へ戻し、修正→再レビューのループを回します。',
      pitfall: '「不足を探せ」と指示されたレビュアは健全なコードにも指摘を出します。正しさや要件に関わる指摘だけを採用しないと過剰設計に向かいます。',
    },
    {
      prompt: 'Why does review quality differ between self-review by the implementing Claude and review in a fresh context?',
      answer: 'A fresh-context reviewer judges only the diff and the criteria, unbiased by the reasoning that produced the change. The implementing session tends to favor the code it just wrote.',
      explanation: 'Separate the roles with a subagent or a writer/reviewer session pair. Feed findings back to the implementer and loop fix → re-review.',
      pitfall: 'A reviewer told to find gaps will report some even in sound work. Accept only findings that affect correctness or stated requirements, or you drift into over-engineering.',
    },
    ['code-best-practices', 'subagents'],
    EXPANSION_VERIFIED_AT,
  ),

  card(
    'd5-window-accounting', 'd5', ['5.1'], 'recall',
    {
      prompt: 'コンテキストウィンドウには何が数え入り、超過すると何が起きる？',
      answer: 'システムプロンプト、全メッセージ（ツール結果を含む）、ツール定義、生成中の出力（thinkingを含む）がすべて数え入る。入力だけで超過すると400エラー、生成中に達すると打ち切りの停止理由で止まる。',
      explanation: 'トークンが増えるほど精度と想起は劣化します（context rot）。詰め込むことより、何を入れるかの選別が重要です。事前見積もりにはトークンカウントAPIが使えます。',
      pitfall: 'prompt cachingは支払い方を変えるだけです。キャッシュ済みのプレフィックスもウィンドウを占有し続けます。',
    },
    {
      prompt: 'What counts toward the context window, and what happens when you exceed it?',
      answer: 'Everything counts: the system prompt, every message including tool results, tool definitions, and the output being generated including thinking. If the input alone exceeds the window, the API returns a 400 error; if generation reaches the limit, it stops with a truncation stop reason.',
      explanation: 'Accuracy and recall degrade as tokens grow (context rot), so curating what goes in matters more than filling the space. Use the token counting API to estimate ahead of time.',
      pitfall: 'Prompt caching changes what you pay, not what fits: cached prefixes still occupy the window.',
    },
    ['context-windows'],
    EXPANSION_VERIFIED_AT,
  ),
  card(
    'd5-approval-gaps', 'd5', ['5.2', '5.5'], 'scenario',
    {
      prompt: '「危険な操作だけ人間の承認を挟む」をSDKで実装するときの基本部品と、見落としがちな穴は？',
      answer: 'canUseToolコールバックで承認UIへつなぎ、許可はallow（必要なら入力を修正して）、拒否は理由メッセージ付きのdenyで返す。穴は、事前許可済みのツールではこのコールバックが発火しないこと。',
      explanation: '拒否メッセージはClaudeに渡り、アプローチを変える材料になります。全ツール呼び出しへ必ず適用したい検査は、許可フローの前段で動くPreToolUseフックに置きます。',
      pitfall: 'allowedToolsに載せたツールは人間確認を素通りします。「確認したいツール」を許可リストへ入れないでください。',
    },
    {
      prompt: 'When implementing “human approval only for risky operations” with the SDK, what are the building blocks and the commonly missed gap?',
      answer: 'Wire the canUseTool callback to your approval UI; return allow (optionally with modified input) or deny with a reason message. The gap: the callback never fires for tools that are already auto-approved.',
      explanation: 'The deny message reaches Claude and informs a change of approach. Checks that must apply to every tool call belong in a PreToolUse hook, which runs before the rest of the permission flow.',
      pitfall: 'Tools listed in allowedTools bypass human confirmation entirely. Do not put a tool you want reviewed on the allow list.',
    },
    ['user-input'],
    EXPANSION_VERIFIED_AT,
  ),
  card(
    'd5-actionable-errors', 'd5', ['5.3'], 'scenario',
    {
      prompt: '下流ツールの失敗を上流へ返すとき、機械可読の分類に加えて本文へ何を書くと回復率が上がる？',
      answer: 'モデルが自己修正に使える実行可能なフィードバック。何が無効で、期待される条件は何か（例：出発日は未来である必要がある。現在の日付は〜）まで具体的に書く。',
      explanation: 'MCP仕様も、実行エラーには修正と再試行の材料になる情報を含め、クライアントはそれをモデルへ渡すべきとしています。元の原因を汎用メッセージへ潰さないことが回復の前提です。',
      pitfall: '「失敗しました」だけの本文では、再試行すべきか・何を変えるべきかを判断できません。',
    },
    {
      prompt: 'When propagating a downstream tool failure upstream, what belongs in the message body beyond a machine-readable category?',
      answer: 'Actionable feedback the model can use to self-correct: what was invalid and what condition is expected — e.g., “departure date must be in the future; the current date is …”.',
      explanation: 'The MCP specification likewise says execution errors should carry information that enables correction and retry, and that clients should pass them to the model. Preserving the original cause is a precondition for recovery.',
      pitfall: 'A bare “it failed” gives no basis for deciding whether to retry or what to change.',
    },
    ['mcp-tools'],
    EXPANSION_VERIFIED_AT,
  ),
  card(
    'd5-scoped-reads', 'd5', ['5.4'], 'recall',
    {
      prompt: '巨大リポジトリで、Claudeの読取を仕事に関係する範囲へ絞る代表的な手段は？',
      answer: '作業対象のサブディレクトリから起動する、ルートとディレクトリ別にCLAUDE.mdを分割する、無関係なCLAUDE.mdをclaudeMdExcludesで除外する、生成物やベンダコードへのRead denyルール、言語サーバー連携でファイル走査を置き換える。',
      explanation: '内容検索は.gitignoreを既定で尊重しますが、チェックインされている生成物はdenyルールで明示的に塞ぎます。',
      pitfall: '除外リストはタスクごとに切り替えるものではありません。今日は別パッケージ、なら起動ディレクトリの方を変えます。',
    },
    {
      prompt: 'In a huge repository, what are the standard ways to scope Claude’s reads to what the task touches?',
      answer: 'Start Claude from the target subdirectory, split CLAUDE.md into root plus per-directory files, exclude irrelevant CLAUDE.md files with claudeMdExcludes, add Read deny rules for generated and vendored code, and use language-server code intelligence instead of scanning files.',
      explanation: 'Content searches respect .gitignore by default, but checked-in artifacts need explicit deny rules.',
      pitfall: 'The exclusion list is not a per-task switch. To focus on a different package, change the starting directory instead.',
    },
    ['large-codebases'],
    EXPANSION_VERIFIED_AT,
  ),
  card(
    'd5-research-isolation', 'd5', ['5.4'], 'scenario',
    {
      prompt: '「認証まわりを調査して」と頼むと大量のファイル読取で本編の文脈が溢れそう。定石は？',
      answer: '調査をサブエージェントへ委譲する。探索は別のコンテキストで行われ、本編には発見の要約だけが返るため、実装に使う文脈を温存できる。',
      explanation: 'スコープを絞らない調査依頼は数百ファイルの読取に発散し得ます。調査範囲を明示するか、サブエージェントに隔離するかの少なくとも一方を行います。',
      pitfall: '隔離した探索の詳細は自動では本編に戻りません。後で必要な事実は、要約へ含めるよう指示しておきます。',
    },
    {
      prompt: 'Asking Claude to “investigate the auth area” threatens to flood your main context with file reads. What is the standard move?',
      answer: 'Delegate the investigation to a subagent. The exploration happens in a separate context and only a summary of findings returns, preserving your main context for implementation.',
      explanation: 'An unscoped investigation can sprawl into hundreds of file reads. Either scope it explicitly or isolate it in a subagent — at least one of the two.',
      pitfall: 'Details from the isolated exploration do not flow back automatically. Instruct the subagent to include the facts you will need in its summary.',
    },
    ['subagents', 'code-best-practices'],
    EXPANSION_VERIFIED_AT,
  ),
  card(
    'd5-claim-shape', 'd5', ['5.6'], 'recall',
    {
      prompt: '「各主張に出典IDを必ず対応付ける」を、出力形式のレベルで担保するには？',
      answer: 'structured outputsで、claims配列の各要素にtextとsourceIdsを必須フィールドとして定義する。対応の欠けた形の出力は、そもそも生成されなくなる。',
      explanation: 'スキーマが保証するのは対応の「形」までです。出典が実際にその主張を支えているか、情報が新しいかの検証は別途必要です。',
      pitfall: '本文の末尾にURL一覧を並べる形式は、主張と出典の対応を構造として持たないため、後段の処理で復元できません。',
    },
    {
      prompt: 'How do you guarantee at the output-format level that every claim carries its source IDs?',
      answer: 'With structured outputs, define each element of a claims array with text and sourceIds as required fields. Output missing the mapping simply cannot be generated.',
      explanation: 'The schema guarantees only the shape of the mapping. Whether each source actually supports its claim, and is current, still needs separate verification.',
      pitfall: 'A URL list at the end of the body carries no structural claim-to-source mapping, so downstream processing cannot reconstruct it.',
    },
    ['structured'],
    EXPANSION_VERIFIED_AT,
  ),
];
