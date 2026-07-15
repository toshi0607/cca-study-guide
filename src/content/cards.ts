import type { Card, LocalizedText } from './types';
import { VERIFIED_AT } from './sources';

type CardCopy = {
  prompt: string;
  answer: string;
  explanation: string;
  pitfall: string;
};

const localized = <T>(ja: T, en: T): LocalizedText<T> => ({ ja, en });

const card = (
  id: string,
  domainId: string,
  objectiveIds: string[],
  kind: Card['kind'],
  ja: CardCopy,
  en: CardCopy,
  sourceIds: string[],
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
  verifiedAt: VERIFIED_AT,
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
];
