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
  // One entry per choice, in the same order: why that choice is right or wrong
  // for this stem. Not a copy of the question-level explanation.
  rationales: string[];
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
  choices: ja.choices.map((text, index) => ({
    id: choiceIds[index],
    text: localized(text, en.choices[index]),
    rationale: localized(ja.rationales[index], en.rationales[index]),
  })),
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
      rationales: [
        '完了を示す文言は生成のたびに変わる自然文で、モデルがツール実行を要求している状態と対応しません。文面の一致で分岐すると、同じ意味の別表現で判定が崩れます。',
        'stop_reason は API が返す構造化された停止理由で、tool_use はモデルがツール実行を求めている状態を表します。ツールを実行し tool_result を履歴へ返して次の呼び出しへ進む、という分岐条件に直接使えます。',
        'トークン数はコンテキストの圧縮や打ち切りを検討する材料であり、モデルが今ツール実行を要求しているかどうかとは無関係です。',
        'ツール結果が空かどうかは、実行済みツールの出力の中身に関する情報にすぎず、次に何をすべきかを示しません。空の結果でもループを続けるべき場合があります。',
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
      rationales: [
        'Phrases that sound like completion are free-form prose that varies between generations and does not correspond to the model actually requesting a tool call; matching on wording breaks as soon as the same intent is worded differently.',
        'stop_reason is the structured stop reason returned by the API, and tool_use means the model is asking for a tool call. It maps directly onto the branch: run the tool, return tool_result to the history, and call the model again.',
        'Token count informs decisions about compacting or truncating context; it says nothing about whether the model is currently requesting a tool call.',
        'Whether a tool result is empty describes the content of an already-executed call, not what should happen next — an empty result can still be a reason to continue the loop.',
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
      rationales: [
        '所要時間は並列化の動機にはなりますが、可否の判断材料ではありません。依存のあるサブタスクを数の多さだけで並列に流すと、前提となる結果が揃わないまま実行されます。',
        'パイプラインは前段の出力が確定してはじめて次段を開始できるため、同時に走らせる余地がありません。並列化しても後段は待機するだけです。',
        '独立していれば実行順序が結果に影響せず、同時に走らせても互いの前提を壊しません。fan-outして最後に統合する形が成立する条件です。',
        '同じ状態を順番に更新する処理は、順序そのものが正しさの一部です。並列に実行すると更新順が保証されず、競合や上書きが起きます。',
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
      rationales: [
        'Elapsed time is a motivation for parallelism, not a criterion for whether it is safe. Fanning out dependent subtasks because there are many of them starts work before the results it relies on exist.',
        'A pipeline stage cannot start until the previous stage has produced its output, so there is nothing to overlap. Running the stages concurrently only makes the later ones wait.',
        'Independence means execution order does not affect the outcome, so the subtasks can run at the same time without breaking each other’s assumptions. This is the condition that makes fan-out plus a final merge work.',
        'When updates to one piece of state must happen in order, the ordering is part of correctness. Running them concurrently gives no guarantee about update order and invites lost or conflicting writes.',
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
      rationales: [
        '入力・出力形式・終了条件の3つが揃うと、サブエージェントは何を受け取り、どこまでやり、何を返すかを自分で判断できます。親は返ってきた結果をそのまま統合できます。',
        '全履歴の共有は、今回の調査に関係のないやり取りまで運び込みます。コンテキストを消費するうえ、無関係な文脈が判断のノイズになります。',
        'サブエージェントは独自のコンテキストで動くため、親が持っている前提が自動的に見えるとは限りません。この前提で指示を削ると、必要な情報が欠けたまま作業が始まります。',
        '形式が決まっていないと戻り値の構造が呼び出しごとに変わり、親側で解釈し直す手間が発生します。複数のサブエージェントの結果を並べて統合するのが特に難しくなります。',
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
      rationales: [
        'With input, output shape, and stopping conditions all stated, the subagent can decide what it has, how far to go, and what to hand back, and the parent can merge the result without further interpretation.',
        'Sharing everything carries along exchanges that have nothing to do with this task. It burns context and adds unrelated material that can pull the subagent off target.',
        'A subagent runs with its own context, so what the parent knows is not automatically in view. Trimming instructions on that assumption starts the work with information missing.',
        'Without an agreed shape, the returned structure varies from call to call and the parent has to re-interpret each one. Combining results from several subagents becomes especially awkward.',
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
      rationales: [
        'フックはモデルの出力ではなくコード側で条件を評価し、実行前に呼び出しを止められます。モデルがルールを見落とした場合でも返金は実行されません。',
        '強い言葉は指示の重みを増やしますが、従うかどうかはモデルの生成に委ねられたままです。「必ず」と書いても、逸脱したときにそれを止める仕組みはありません。',
        '認可チェックはエージェントがどの経路で呼んでも必ず通過する場所にあり、条件を満たさない要求をAPI側で拒否できます。エージェント以外の呼び出し元にも同じルールが効きます。',
        '自問はモデル自身の認識を確認するだけで、その認識が誤っていれば誤ったまま先へ進みます。確認していないのに「確認済み」と判断した場合を検出できません。',
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
      rationales: [
        'The hook evaluates the condition in code rather than in the model’s output and can stop the call before it runs, so a refund does not go through even when the model overlooks the rule.',
        'Stronger wording raises the salience of an instruction, but compliance still depends on what the model generates. Nothing intercepts the request on the occasions it deviates.',
        'The authorization check sits on a path every refund request must pass through, so the API itself refuses requests that fail the condition — including requests that did not come from the agent.',
        'Self-questioning only surfaces what the model believes. If that belief is wrong, the wrong answer flows straight into the next step, and a mistaken “yes, it was verified” goes undetected.',
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
      rationales: [
        'このタイミングで検査できるのは実行済みの結果です。履歴へ返す前に隠しても、破壊的な操作そのものはすでに実行されており取り消せません。',
        'セッション終了時はさらに遅く、行われた操作の記録や後始末しかできません。実行の可否を左右する位置にありません。',
        '次のメッセージ送信はユーザー側のイベントで、個々のツール呼び出しとは対応していません。どの呼び出しを止めるべきかを判断する情報もありません。',
        '実行前であれば、呼び出し内容と引数を見てから可否を決められます。条件を満たさない場合は呼び出し自体を開始させずに済みます。',
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
      rationales: [
        'All this point can examine is a result that already exists. Hiding it from the history does not undo the destructive operation that produced it.',
        'Session end is later still and only supports recording or tidying up after the fact. It has no bearing on whether a call runs.',
        'Sending a message is a user-side event that does not line up with individual tool calls, and it carries no information about which call should have been stopped.',
        'Running before execution means the call and its arguments can be inspected first, and a call that fails the condition never starts.',
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
      rationales: [
        '再開が引き継ぐのは過去のやり取りの記録であって、ツールの実行そのものではありません。再実行されない以上、どこまで完了したかは自分で管理する必要があります。',
        '決定事項やIDを構造化して持てば、履歴が長くなって要約・圧縮されても失われません。会話文に埋もれた値は、探し直しや読み違いの原因になります。',
        '分岐は元のセッションを起点にして別系統を作る操作で、元の履歴を消すものではありません。「破棄されるからエクスポートが必須」という前提が成り立っていません。',
        '履歴を引き継いだ分岐なら、これまでの文脈を保ったまま別案を試せます。元のセッションはそのまま残るので、失敗しても戻る先があります。',
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
      rationales: [
        'What a resume brings back is the record of the earlier exchange, not the tool executions themselves. Because nothing re-runs, tracking how far the work got is still your responsibility.',
        'Decisions and identifiers held as structured state survive summarization and compaction of a long history, whereas the same values buried in prose have to be found and re-read correctly every time.',
        'A fork branches from the original session rather than replacing it, so the premise that history is discarded — and therefore that an export is mandatory — does not hold.',
        'Forking with the inherited history lets an alternative run with all the context so far, and because the original session remains, there is somewhere to return to if the alternative fails.',
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
      rationales: [
        'ツールを1つにまとめても曖昧さは消えず、どの操作をしたいかという判断が引数の中へ移るだけです。誤選択が引数の誤りとして現れるようになります。',
        '外部ドキュメントはツール選択の場面でモデルが読むものではありません。説明を削るほど、選択と引数生成の手がかりが減ります。',
        '名前と説明が用途を特定し、JSON Schema が引数の型と必須項目を定め、利用条件がいつ使うべきかを示します。選択と入力生成の両方に必要な情報が揃います。',
        '自由記述の文字列はスキーマによる検証が効かず、値の形式が呼び出しごとに変わります。不正な引数を実行前に弾く手立てがなくなります。',
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
      rationales: [
        'Collapsing everything into one tool does not remove the ambiguity; the choice of operation simply moves into the arguments, and wrong selections resurface as wrong parameters.',
        'External documentation is not what the model consults while selecting a tool. Trimming the description removes the very cues it uses for selection and argument construction.',
        'The name and description pin down what the tool is for, the JSON Schema fixes argument types and required fields, and the stated conditions say when to reach for it — covering both selection and input generation.',
        'Free-form strings cannot be validated against a schema, so value formats drift between calls and there is nothing to reject a malformed argument before execution.',
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
      rationales: [
        '成功として返すと、エージェントはデータが取得できたものとして次の手順へ進みます。失敗が見えないまま誤った結論が積み上がります。',
        '一時的なレート制限だと分かり再試行可能だと示されていれば、エージェントは待って再実行するという回復手段を選べます。説明は安全な範囲に限られ、秘密情報を含みません。',
        '認証ヘッダーは会話履歴に残してはいけない値です。スタックトレースも内部構造を露出させるだけで、エージェントが次に何をすべきかの判断には寄与しません。',
        '失敗したことしか分からず、待てば直るのか設定が誤っているのかを区別できません。再試行すべきかどうかをモデルが推測するしかなくなります。',
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
      rationales: [
        'Reported as a success, the agent proceeds as though it received data. The failure stays invisible while conclusions are built on top of it.',
        'Knowing the failure is a temporary rate limit and that the call is retryable lets the agent choose the recovery it needs — wait and try again — and the explanation stays within what is safe to expose.',
        'Auth headers must never land in the conversation history, and a stack trace exposes internals without telling the agent anything about what to do next.',
        'A bare failure marker leaves no way to tell a transient limit from a misconfiguration, so whether to retry becomes guesswork.',
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
      rationales: [
        '接続先やコマンドといった共有してよい定義と、トークンのような秘密情報を分けられます。設定ファイルはそのままレビューでき、値の差し替えは環境ごとに行えます。',
        'リポジトリを非公開にしても、閲覧権を持つ全員に平文のトークンが渡り、履歴にも残ります。アクセス制御は秘密の保管方法の代わりにはなりません。',
        '全プロジェクト共通にすると、そのサーバーを必要としない作業からも接続が見えます。管理の手間は減っても、公開範囲は必要以上に広がります。',
        '接続定義ごとに、その定義を必要とする範囲へ限定できます。個人だけが使う接続と、チーム全員が使う接続を同じ場所に置かずに済みます。',
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
      rationales: [
        'This splits what is safe to share — endpoints, commands, arguments — from the credential itself. The configuration stays reviewable, and each environment supplies its own value.',
        'Making the repository private only limits who can read it; every reader still receives the token in plain text, and it persists in history. Access control is not a storage mechanism for secrets.',
        'A globally shared scope surfaces the connection in work that has no use for it. It saves administration effort at the cost of a wider exposure than the work requires.',
        'Each connection definition is placed where it is actually needed, so a personal connection and a team-wide one do not have to live at the same level.',
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
      rationales: [
        '名前はモデルが用途を読み取る手掛かりの一つです。略語にすると意味の手掛かりが減り、似た略語同士がかえって紛らわしくなります。',
        '入口を1つにしても判断が消えるわけではなく、どの機能を呼ぶかという選択が引数の中へ移るだけです。ツールごとの説明や入力スキーマも書き分けられなくなります。',
        '温度は生成のばらつきを調整する設定で、候補が多く互いに似ているという状況そのものは変わりません。紛らわしい選択肢は紛らわしいままです。',
        '同時に提示される候補の数と重なりを減らせるため、選択ミスの原因に直接効きます。ただし細かく分け過ぎると委譲の往復が増えるため、粒度は合わせて評価します。',
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
      rationales: [
        'The name is one of the cues the model uses to infer what a tool is for. Shortening it removes meaning, and similar-looking abbreviations become easier to confuse with each other.',
        'A single entry point does not remove the decision; it relocates it into the arguments, where per-tool descriptions and input schemas can no longer disambiguate the options.',
        'Temperature controls variability in generation, not the shape of the candidate set. A crowded set of overlapping tools stays just as easy to confuse.',
        'This shrinks both the number of simultaneously offered candidates and their overlap, which addresses the actual cause. Weigh it against the extra delegation round trips that over-splitting introduces.',
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
      rationales: [
        '個人用の設定はリポジトリに含まれないため、新しく参加した開発者やCIには届きません。同期を各自の運用に任せると、規約の版が人ごとにずれます。',
        'リポジトリに含まれるので、クローンした全員とCIが同じ内容を読み込みます。変更もレビューと履歴の対象になり、いつ何が変わったかを追えます。',
        '貼り忘れや部分的な貼り付けが起きやすく、CIの自動実行には人が介在できません。規約の更新もすべての依頼文へ反映する必要があります。',
        'READMEは人が読むための文書で、指示として常時読み込まれる場所ではありません。「追加の設定は不要」という前提自体が成り立ちません。',
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
      rationales: [
        'Personal settings are not part of the repository, so a new teammate or a CI job never receives them, and leaving synchronization to individuals lets versions drift apart.',
        'Because it ships with the repository, everyone who clones it and every CI run reads the same content, and edits go through review and history like any other change.',
        'Manual pasting invites omissions and partial copies, and an automated CI run has nobody to do the pasting. Every update to the rules also has to be propagated into each prompt.',
        'The README is written for humans and is not an instruction source that is always loaded, so the premise that no further setup is needed does not hold.',
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
      rationales: [
        '手順とその実行に必要な資源を1つのまとまりとして扱えるため、同じ作業を別のプロジェクトや別のメンバーへ持ち出せます。',
        '常時読み込まれるのはCLAUDE.mdの性質で、Skillはそれとは別に必要になった時点で読み込まれます。両者を同一視すると、常時読み込みたいルールをSkillへ置く誤りにつながります。',
        '説明文は利用可否の判断材料になるため、対象となる作業や状況が読み取れる書き方が必要です。何をするかだけを書くと、使うべき場面が伝わりません。',
        '名前の明示は起動手段の1つにすぎません。説明文から適用場面を判断できる以上、明示入力だけに限定されるという前提が誤りです。',
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
      rationales: [
        'Keeping the procedure together with the resources it needs makes the whole capability portable to another project or another teammate.',
        'Always-on loading describes CLAUDE.md. A Skill is read when it becomes relevant, and conflating the two leads to putting always-applicable rules in the wrong place.',
        'The description is what the decision to use the Skill is based on, so it has to convey the situations it applies to — not only what the Skill does.',
        'Typing the name is one way to invoke a Skill, not the only one. Since the description already signals when it applies, the claim that nothing else can trigger it is wrong.',
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
      rationales: [
        '全体規約に混ぜると、E2Eテストと無関係な作業でも常に読み込まれます。適用範囲が広がる分だけ、他の指示との干渉や文脈の消費が増えます。',
        'コメントはそのファイルを開いたときにしか目に入らず、新しいテストファイルを作る場面では存在しません。規約の更新も全ファイルへ手作業で反映することになります。',
        '対象ファイルを扱うときだけ規約が効くため、適用範囲を意図どおりに絞れます。globが想定したファイルに一致するかは、実際のパスで確認しておきます。',
        'チャットの投稿は人への周知であり、作業時に参照される指示の置き場所ではありません。流れて見えなくなる点でも規約の保管には向きません。',
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
      rationales: [
        'Mixed into the general conventions, the rule is loaded during work that has nothing to do with E2E tests, adding interference with other instructions and consuming context for no benefit.',
        'A comment is only visible once the file is open, and it does not exist yet when a new test file is being created. Updating the rule then means editing every file by hand.',
        'The convention takes effect only while the matching files are in scope, which is exactly the intended range. Confirm the glob against real paths so it matches the files you meant.',
        'A chat post informs people; it is not a location that gets consulted during the work, and it scrolls out of view as the channel moves on.',
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
      rationales: [
        '手元では人が都度判断できますが、CIは無人で動くため同じ権限を渡すと歯止めがありません。失敗を減らす目的で、影響範囲を広げてしまう選択です。',
        '後続のジョブは出力と終了状態だけを見て次を決めます。形式が実行ごとに変わると、成功したのか失敗したのかをパイプライン側で判定できません。',
        'CIランナーには応答する人がいないため、確認待ちに入った時点でジョブは進まず、タイムアウトするまで滞留します。対話を前提にできない実行環境です。',
        '無人実行では確認で止まらないことと、権限を作業に必要な範囲へ限定することが前提になります。この2点が揃って初めて自動実行を任せられます。',
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
      rationales: [
        'On a workstation a person reviews each action; CI runs unattended, so the same permissions come with no such check. It trades a wider blast radius for fewer permission errors.',
        'Downstream steps decide what to do next from the output and the exit state alone. If either varies between runs, the pipeline has no reliable way to tell success from failure.',
        'No one is sitting at the runner to answer. The job simply stops at the prompt and stays there until it times out, which is why CI cannot assume an interactive session.',
        'Unattended execution requires both that nothing blocks on a prompt and that the granted permissions stay within what the job actually needs. Together they make automatic execution safe to delegate.',
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
      rationales: [
        '「良い」の中身を、何を見るか・何を満たせば合格かという確認できる形へ置き換えられます。代表例と境界例が、基準を実際の入力へ当てはめる方法を示します。',
        '選び直しは出力後の作業で、生成そのもののばらつきは変わりません。実行回数と人手が毎回必要になり、選ぶ人の判断基準も明文化されないままです。',
        '形容詞は程度を伝えるだけで、何を見るべきかを指定しません。「厳密」の解釈が実行ごとに変わるため、ばらつきの原因はそのまま残ります。',
        'モデルを変えても、指示に書かれていない基準は補われません。曖昧な指示に対する解釈の幅が残る以上、再現性の問題は解決しません。',
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
      rationales: [
        'It replaces “good” with checkable statements of what to look at and what counts as passing, while the examples demonstrate how those rules apply to concrete input.',
        'Picking a winner happens after generation, so the underlying variance is untouched. It also costs repeated runs plus human time, and the picker’s own standard stays unwritten.',
        'Adjectives express intensity without naming what to inspect. The reading of “rigorous” shifts from run to run, so the source of the inconsistency remains.',
        'A different model does not supply criteria the prompt never stated. As long as the instruction admits several readings, the reproducibility problem survives the switch.',
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
      rationales: [
        '日付の前後関係のような制約は値どうしの関係であり、スキーマが記述する型や必須項目とは別の層にあります。形式が正しくても不整合な組み合わせは通ります。',
        '事実かどうかは出力の中身の問題で、構造の記述からは判定できません。正しい形をした誤った値も、スキーマ上は妥当な出力です。',
        'スキーマ準拠までは正しい記述ですが、現実との整合まで含めている点が誤りです。内容の真偽は構造の保証の対象外です。',
        '保証されるのは形、すなわち型・必須項目・列挙値といったスキーマ上の約束です。後段は解析の失敗を心配せずに値を取り出せます。',
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
      rationales: [
        'Ordering between two dates is a relation among values, which sits on a different layer from the types and required fields a schema describes. A well-formed object can still hold an inconsistent pair.',
        'Accuracy is a property of the content, and a structural description cannot decide it. A wrong value in the right shape is still a valid document under the schema.',
        'The first half is right, but extending the guarantee to consistency with reality is not. Truth of the content lies outside what a structural constraint can promise.',
        'The guarantee is about shape: the types, required fields, and enum values the schema declares. Downstream code can read the fields without defending against parse failures.',
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
      rationales: [
        '入力が前回と同じであれば、モデルには前回と違う出力を出す手がかりがありません。上限のない再実行は同じ失敗を繰り返しながら時間とコストだけを消費します。',
        '失敗したフィールドと期待条件・実際の値を渡すと、修正すべき箇所が1つに特定され、他のフィールドを壊さずに直せます。上限とフォールバックがあるため、モデルが直しきれない場合でも呼び出し側は止まらずに終了できます。',
        '検証は出力が下流で使える形かどうかを判定する境界です。ルールを緩めれば失敗の報告は消えますが、条件を満たさない値がそのまま下流へ流れます。',
        '失敗したのは1フィールドだけなので、全体の再生成は既に条件を満たしていた部分まで作り直すことになります。修正範囲が広がる分、新たな検証失敗を招きやすくなります。',
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
      rationales: [
        'With identical input the model has nothing new to work from, so the same failure is likely to recur. An unbounded loop spends time and tokens without changing the conditions that caused the failure.',
        'Naming the failed field together with the expected condition and the actual value narrows the correction to a single place and leaves the already-valid fields untouched. The cap and fallback keep the caller from hanging when the model cannot fix it.',
        'Validation is the boundary that decides whether the output is usable downstream. Relaxing the rule removes the report of the failure, not the non-conforming value, which then flows on to consumers.',
        'Only one field was wrong, so regenerating everything rebuilds parts that already satisfied the schema. Widening the scope of change increases the chance of introducing a new validation failure.',
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
      rationales: [
        'まとめて非同期に処理する方式なので、結果を受け取るまでの待ち時間を許容できる大量処理と相性が良い、というのがバッチの適用条件そのものです。',
        '応答が返るまでの待ち時間はむしろ長くなる方式です。ユーザーが画面の前で応答を待つ対話用途では、レイテンシ短縮の手段になりません。',
        'まとめて投げても成否は1件ごとに決まるため、どのリクエストがどの結果になったかを辿れる対応付けが必要です。これがないと失敗した分だけを再投入できません。',
        'まとめ方を変えても、個々のリクエストが失敗し得るという性質は変わりません。失敗が起きない前提で設計すると、結果の欠落に気付けなくなります。',
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
      rationales: [
        'Submitting work in bulk and collecting results later is exactly the trade batch processing makes: throughput and cost in exchange for waiting, which fits volume work with no interactive deadline.',
        'Batching lengthens rather than shortens the wait for any single answer, so it does not help a user sitting in front of a chat window waiting for a reply.',
        'Success or failure is still decided per request, so a mapping from request to result is what makes it possible to find the failed ones and resubmit only those.',
        'How requests are grouped does not change whether any one of them can fail. Assuming failures disappear leaves missing results unnoticed.',
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
      rationales: [
        '要約は情報を落とすことで短くする操作なので、何が残るかは生成のたびに変わります。「自然に含まれる」ことを前提にすると、注文番号や金額のような一字違いが致命的な値を静かに失います。',
        '全文保持は圧縮の必要が生じた理由（長さの上限とコスト）に向き合っていません。関係の薄い過去のやり取りが増えるほど、重要な事実は埋もれていきます。',
        '要約は流れを短くするために使い、失ってはいけない値は要約の対象外の構造化された状態として別に置く、という役割分担になります。圧縮を何度繰り返しても、その値は原文のまま参照できます。',
        '古いかどうかと、以後の処理に必要かどうかは別です。会話の序盤で確定した決定事項ほど後続の判断の前提になっているため、経過時間だけを基準に消すと継続できなくなります。',
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
      rationales: [
        'A summary shortens text by dropping detail, and what survives varies from one generation to the next. Relying on prose to carry an order number or an amount loses exactly the values where a single wrong character matters.',
        'Keeping everything ignores the reason compression was needed in the first place: context limits and cost. It also buries the important facts among increasingly irrelevant older turns.',
        'The summary carries the narrative, while values that must not be lost live outside it as structured state. However many times the history is compacted, those values remain readable verbatim.',
        'Age and relevance are different properties. Decisions settled early are often the premises for everything that follows, so deleting by elapsed time alone removes what the session needs to continue.',
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
      rationales: [
        '自己申告の確信度は生成された数値であり、実際の正しさと対応する保証がありません。誤りながら高い確信度を出した高額案件は、この設計では人の目に触れないまま通ってしまいます。',
        '全件レビューは見落としこそ減らしますが、低リスクの少額案件にも同じ人手を使います。件数が増えるとレビューが滞り、本当に判断が要る高額案件の確認まで遅れます。',
        'エスカレーションを事後の回復手段に限定すると、返金という取り消しの難しい操作が実行された後にしか人が関与できません。承認は実行前の制御点として置く必要があります。',
        '金額・権限・例外種別・曖昧さは、モデルの出力に依存せずアプリケーション側で判定できる条件です。同じ入力に対して常に同じ経路になるため、リスクの高い案件だけを確実に人の承認へ回せます。',
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
      rationales: [
        'Self-reported confidence is another generated value, with no guaranteed relationship to whether the answer is right. A confidently wrong high-value refund never reaches a reviewer under this rule.',
        'Reviewing everything does catch mistakes, but it spends the same human attention on small, low-risk refunds. As volume grows the queue backs up and the cases that genuinely need judgment wait behind the ones that do not.',
        'Limiting escalation to post-failure recovery means a person can only get involved after a refund — an action that is hard to undo — has already been executed. Approval belongs before execution.',
        'Amount, permissions, exception type, and ambiguity can all be evaluated by the application without trusting the model’s own output. The same input always takes the same route, so high-risk cases reliably reach a human approver.',
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
      rationales: [
        '一覧だけでは、どのURLがどの主張の根拠なのかを読み手が再構成できません。複数エージェントの結果を混ぜた後は特に、主張と根拠の対応が失われます。',
        '主張とsource IDの対応を構造として受け取れば、統合はその対応を保ったまま結合する操作になります。後から個々の主張の根拠を機械的に辿れるようになります。',
        '出典が付いていることと、その内容が主張を支えていることは別です。引用先が違う話をしている場合や情報が古くなっている場合があるため、対応と鮮度は別に確認します。',
        '出典の存在は「どこから来たか」を示すだけで、その主張が正しいことの証明にはなりません。検証済みとみなすと、誤った内容が根拠付きという体裁で下流へ伝わります。',
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
      rationales: [
        'A flat list leaves the reader to guess which URL backs which sentence. Once results from several agents have been merged, that correspondence cannot be reconstructed at all.',
        'When each claim carries its source ID as structured data, integration becomes a merge that keeps those pairs intact, and any individual claim can later be traced back to its evidence programmatically.',
        'Having a source and being supported by that source are two different things: the cited page may discuss something else, or may have gone stale. Support and freshness are checked separately from mere presence.',
        'A citation records where a claim came from; it does not establish that the claim is true. Treating it as verification lets an incorrect statement travel downstream wearing the appearance of evidence.',
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
      rationales: [
        '取り違えの原因は「updateShipmentStatusV2」のような似た名前が並んでいることであり、略語化はその区別をさらに難しくします。名前や説明が短くなるほど、どのツールがどの場面用かの手掛かりが減ります。',
        '選択肢を1つにしても、40エンドポイントぶんの分岐は汎用ツールの引数へ移るだけです。スキーマで表現できる制約が薄くなり、誤りの発生箇所が引数生成へ移動します。',
        '取り違えは、内部APIの構造をそのまま写した結果として似た粒度・似た名前のツールが大量に並んでいることから生じています。エージェントの仕事の単位でまとめ直せば、同時に見える候補が減り、候補どうしの違いも説明しやすくなります。',
        '温度はサンプリングの分散に影響するだけで、候補どうしが区別しにくいという状態は変わりません。区別できない選択肢の中から、より確信を持って誤る方向に働くこともあります。',
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
      rationales: [
        'The mix-ups come from near-identical names such as “updateShipmentStatusV2” sitting next to each other, and abbreviating makes them harder to tell apart. Shorter names and descriptions leave fewer cues about which tool fits which situation.',
        'Collapsing the choice does not remove the forty-way decision; it relocates it into the arguments of one tool. Less of the contract can be expressed in the schema, so the errors simply move from selection to argument construction.',
        'The confusion follows directly from mirroring the internal API: forty tools at the same granularity with similar names. Grouping them by the agent’s units of work shrinks the candidate set visible at once and makes the remaining candidates easier to describe distinctly.',
        'Temperature affects sampling spread, not whether two candidates are distinguishable. Between options the model cannot tell apart, it may simply pick the wrong one more consistently.',
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
      rationales: [
        '自由記述にすると、期待する日付やIDの形式を伝える場所がなくなります。サーバー側の解釈が曖昧さを吸収しても、解釈違いは見えない形で残り、誤った値が正常系として処理されます。',
        'モデルは引数をツール定義から組み立てるため、期待する型・形式・制約をスキーマに書くことが最も直接的な伝達手段です。説明文で利用条件と境界を補うと、スキーマだけでは表せない「いつ何を渡すか」も同じ場所で伝わります。',
        'ツール呼び出しの引数を組み立てる時点でモデルが参照するのはツール定義であって、社内Wikiではありません。人が貼り忘れれば同じ誤りが再発するため、対策が個人の運用に依存します。',
        '検証を外すと、誤った形式の日付やIDがそのまま配送管理プラットフォームへ届きます。エージェントは何が悪かったのかを知らされないまま再試行することになり、同じ誤りを繰り返します。',
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
      rationales: [
        'Free-form strings remove the place where the expected date or ID format could have been stated. Lenient server-side parsing absorbs the ambiguity silently, so a misread value is processed as if it were correct.',
        'The model builds arguments from the tool definition, so declaring the type, format, and constraints in the schema is the most direct way to communicate them. The description then covers what a schema cannot — when to use the tool and where its limits are — in the same place.',
        'At the moment the model constructs a call it consults the tool definition, not an internal wiki. If someone forgets to paste the examples the same malformed arguments come back, which makes the fix depend on human routine.',
        'Without validation, malformed dates and IDs reach the delivery-management platform unchecked. The agent retries without being told what was wrong, so it repeats the same mistake.',
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
      rationales: [
        'レート制限は混雑時間帯に限って起きる一時的な失敗なので、一時的か恒久的かと再試行可能かどうかが分かれば、待って再試行するという正しい回復行動を選べます。分類が構造化されていれば、エージェント側の分岐条件としても使えます。',
        '現行実装がスタックトレースをそのまま文字列で返した結果、エージェントは同じ呼び出しを繰り返していました。加えて認証ヘッダーを含めることは、配送業者APIの資格情報をモデルの文脈と会話ログへ流し込むことになります。',
        '内部実装に踏み込まずに「何が起きたか」と「次に何ができるか」を伝えれば、待機して再試行するか別手段へ切り替えるかをエージェントが判断できます。秘密や実装詳細を露出せずに回復に必要な情報だけを渡せます。',
        '失敗を成功として返すと、エージェントは配送情報が取得できたものとして次の処理へ進みます。レート制限が解消していないため、後続で誤った結果を出すか、同じ呼び出しを繰り返すことになります。',
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
      rationales: [
        'A rate limit is a transient failure tied to busy hours, so knowing the category and whether the call is retryable points the agent at the correct recovery: back off and try again. Because the category is structured, it can be branched on rather than parsed out of prose.',
        'Returning raw stack traces as strings is what the current implementation already does, and the agent responded by repeating the same call. Including auth headers additionally pushes the carrier API credentials into the model context and the conversation logs.',
        'Describing what happened and what options remain, without exposing internals, is enough for the agent to choose between waiting and switching approaches. It supplies the information recovery needs while keeping secrets and implementation detail out of the response.',
        'Reporting a failure as success makes the agent proceed as though shipment data had been retrieved. The rate limit is still in effect, so the run either produces a wrong result downstream or loops back into the same call.',
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
      rationales: [
        'コミット済みのトークンは履歴に残るため、無効化と再発行で漏えいした値そのものを使えなくするのが起点になります。そのうえで接続定義だけを共有ファイルに残し、値は環境変数や秘密管理から参照させれば、チームへ配布できる設定と秘密を分離できます。',
        'リポジトリの公開範囲は、閲覧できる人数を絞るだけで、すでに書き込まれた値の有効性には影響しません。社内リポジトリのクローンやCIログ経由でも露出し得るため、失効させない限り漏えいは続いています。',
        'base64は誰でも復号できる可逆な符号化で、暗号化でもアクセス制御でもありません。ファイルを読めた相手はそのままトークンを取り出せるため、平文で置くのと危険性は変わりません。',
        'グローバル設定へ移すと、この配送業者トークンが本来関係のないプロジェクトの作業からも参照可能になります。適用範囲を広げる方向の変更で、漏えいしたトークンが失効していない点も未解決のままです。',
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
      rationales: [
        'A committed token stays in history, so revocation is what actually ends the exposure, and reissuing keeps the integration working. Leaving only the connection definition in the shared file and resolving the value from the environment or a secrets manager gives the team something safe to distribute.',
        'Repository visibility limits who can browse the code; it does nothing to the validity of a value already written into it. Clones and CI logs can still surface the token, so the leak remains live until the token is revoked.',
        'base64 is a reversible encoding that anyone can undo — it is neither encryption nor access control. Whoever can read the file can still recover the token, so the exposure is unchanged.',
        'A global configuration widens the blast radius: work in projects that have nothing to do with logistics could reach the carrier token. It also leaves the original problem untouched, since the committed token is still valid.',
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
      rationales: [
        '本人確認は返金実行の前提であり、この2つを同時に走らせると未確認のまま返金が進み得ます。速度のために社内規定が要求する順序を壊す設計です。',
        '逐次実行はデバッグしやすい一方、注文照会と配送照会のように依存のない作業まで待たせ続けます。試作で問題になっている待ち時間がそのまま残るため、移行の目的を満たしません。',
        'サブタスクの件数は、その作業同士が独立かどうかを示しません。件数だけを見て並列化すると、本人確認と返金実行のように順序が必須の組み合わせも同時に走らせてしまいます。',
        '判断の基準はサブタスク間の依存関係です。注文照会と配送照会は互いの結果を必要としないため並列にfan-outでき、本人確認から返金実行へ進む流れは逐次に保てば規定も守れます。',
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
      rationales: [
        'Identity verification is a precondition for executing a refund. Running the two concurrently allows a refund to proceed before verification completes, trading a required policy order for latency.',
        'Sequential execution is easier to trace, but it also makes independent lookups wait on each other. The latency problem that motivated the migration would survive untouched.',
        'The number of subtasks says nothing about whether they depend on each other. Using count as the trigger will parallelize ordered pairs such as verify-then-refund along with the safe ones.',
        'Dependency between subtasks is the criterion. Order and delivery lookups need nothing from each other and can fan out, while the verify-then-refund chain stays sequential and keeps the refund policy intact.',
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
      rationales: [
        'サブエージェントは独立した文脈で動くため、親が把握している顧客情報や経緯を自動的には持ちません。IDだけを渡すと、ワーカーは何を判断すべきかも、どこまでやれば終わりかも分かりません。',
        '独立した文脈で動くワーカーには、作業に必要な入力・返してほしい出力の形・どこで完了とみなしどこで失敗とするかを明示する必要があります。出力形式が決まっていれば、オーケストレーターは4分類の結果を同じ手順で統合できます。',
        '全履歴のコピーは必要な情報も雑談も区別せず渡すため、ワーカーのコンテキストを埋めて重要な事実を埋没させます。長引いた問い合わせほど不利になり、試作で起きている取り違えを再現しやすくなります。',
        '返答の形がワーカーごとに違うと、オーケストレーターは分類ごとに解釈を書き分けねばならず、統合が破綻します。柔軟性はワーカー内部の進め方に持たせるべきで、境界の契約は固定するのが筋です。',
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
      rationales: [
        'A worker runs in its own context and does not inherit what the parent knows about the customer or the case. An ID alone leaves it without the facts to act on or a definition of when it is done.',
        'Because the worker starts from a separate context, the invocation has to carry the inputs the task needs, the shape of the expected result, and what counts as done versus failed. A fixed result shape lets the orchestrator merge output from all four inquiry categories the same way.',
        'Dumping the whole transcript passes chatter along with the relevant facts, filling the worker’s context and burying what matters. The longer the case runs, the worse it gets — exactly the mix-ups the prototype already suffers from.',
        'If every worker answers in its own shape, the orchestrator needs per-category parsing and integration falls apart. Flexibility belongs inside how a worker does its job, not in the contract at the boundary.',
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
      rationales: [
        '自己申告の確信度は生成のたびに揺れる主観的な値で、外部から検証できません。高額返金でもエージェントが自信を持てば承認を素通りするため、規定の適用が確率的になります。',
        '失敗後の引き継ぎでは、規定に反した返金が成功してしまったケースを止められません。人間の承認は事後のリカバリではなく、実行前に置くべき関門です。',
        '規定が定めている条件は金額と本人確認状態で、どちらも処理前に確定していて外部から検証できます。この2つを分岐条件にすれば、該当ケースは必ず承認フローへ入り、エージェントの判断のばらつきに左右されません。',
        'プロンプトでの強調は、モデルが従いやすくなる働きかけであって、実行を止める仕組みではありません。判断をエージェントに委ねている限り、規定違反の返金が通る経路が残ります。',
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
      rationales: [
        'Self-reported confidence is a subjective number that varies between runs and cannot be checked from outside. A large refund would skip approval whenever the agent happens to feel sure, making policy compliance probabilistic.',
        'Recovery after a failure cannot undo a refund that succeeded in violation of the policy. Human approval belongs in front of the action, not behind it.',
        'The policy is stated in terms of amount and verification status, both of which are known before the refund runs and verifiable outside the model. Branching on them guarantees that matching cases enter the approval flow regardless of how the agent reasons.',
        'Emphasis in a prompt increases the odds of compliance but does not stop execution. As long as the agent decides, there is still a path along which a non-compliant refund goes through.',
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
      rationales: [
        '全文保持は履歴の肥大化という試作の前提をそのまま放置します。関連の薄いやり取りが増えるほど重要な事実が埋もれ、取り違えは減らないうえにコストだけが増えます。',
        '注文番号や顧客の希望を会話文から取り出して構造化した状態に置けば、参照先が1か所に定まり、長い履歴を読み直して拾い直す必要がなくなります。取り違えの原因そのものに効きます。',
        '経過時間だけを基準に消すと、初期に確認した注文番号のように、いま対応を続けるために必要な事実まで失われます。古いことと不要であることは別の性質です。',
        '圧縮は履歴を短く保つ手段ですが、要約は細部を落とします。継続に必要な事実を要約とは別に保全しておけば、履歴を短くしつつ注文番号や決定事項は確実に残せます。',
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
      rationales: [
        'Keeping everything preserves the ballooning history the prototype already struggles with. More loosely related turns means the important facts are harder to find, so the mix-ups persist while cost climbs.',
        'Lifting order numbers and stated preferences out of the prose into structured state gives the agent one authoritative place to read them, instead of re-deriving them from a long transcript. That addresses the cause of the mix-ups directly.',
        'Deleting by age alone discards facts the case still depends on, such as the order number confirmed in the first few turns. Old is not the same property as irrelevant.',
        'Compaction keeps the history short, but a summary necessarily loses detail. Preserving continuation-critical facts outside the summary lets the history shrink while order numbers and decisions survive intact.',
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
      rationales: [
        '個人用のグローバル設定はリポジトリの外にあり、20名それぞれが手作業で同期する前提になります。更新の取りこぼしが起き、CI実行環境には誰の個人設定も存在しません。',
        'プロジェクト層のCLAUDE.mdはリポジトリの一部としてクローンされるため、チーム全員とCIが同じ内容を読み込みます。バージョン管理されるので、規約の変更もレビューを通して同じタイミングで全員に反映されます。',
        '共有ドキュメントは規約の正本にはなりますが、適用は毎回の貼り付け作業に依存したままです。貼り忘れや貼る範囲の違いという、パイロットで実際に起きたばらつきの原因が残ります。',
        'READMEは人間向けの説明として置かれるファイルで、指示として常時読み込まれる場所ではありません。ここに書いても、規約が確実に適用される保証は得られません。',
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
      rationales: [
        'Personal global settings live outside the repository and would rely on twenty developers syncing them by hand. Updates get missed, and the CI environment has no developer’s personal settings at all.',
        'A project-level CLAUDE.md travels with the repository, so every teammate and CI read the same text. Version control also means a change to the conventions lands for everyone at once, through review.',
        'A shared document can be the canonical text, but applying it still depends on someone pasting it correctly every time. That is precisely the manual step that produced the inconsistency during the pilot.',
        'The README is documentation written for people, not an instruction source that is always loaded. Putting the conventions there gives no guarantee that they are applied.',
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
      rationales: [
        '全体規約へ追記すると、E2Eと無関係な実装作業でもこの規約が読み込まれます。適用したい範囲より広く効いてしまい、他の作業への不要な干渉を招きます。',
        'リポジトリ分割はビルドや依存関係まで巻き込む大きな構成変更で、記述規約の適用範囲を絞るという目的に対して代償が大きすぎます。テストと実装が離れる副作用も伴います。',
        'globで対象パスを指定すれば、規約はE2Eテストファイルを扱うときだけ適用されます。求めている適用範囲と設定の適用範囲が一致し、他の作業には影響しません。指定したglobが意図したファイルに一致するかは確認が必要です。',
        '個人設定は各開発者の環境にとどまり、20名で同じ規約が適用される保証がありません。貼り付け運用と同じく、人手に依存したばらつきが残ります。',
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
      rationales: [
        'General conventions are read during unrelated implementation work too. The rules would take effect far beyond E2E tests and interfere with tasks they were never meant for.',
        'A repository split drags in build and dependency changes, which is a heavy price for scoping a writing convention. It also separates the tests from the code they exercise.',
        'A glob ties the rules to the E2E test paths, so they apply when those files are in play and nowhere else. The scope of the configuration matches the scope the team actually wants; the glob itself still needs checking against the real paths.',
        'Personal settings stay on each machine, so there is no guarantee that all twenty developers end up with the same rules. It reproduces the same human-dependent variance as pasting by hand.',
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
      rationales: [
        '毎回貼り付けている長い手順と、それに付随するテンプレートファイル・整形スクリプトを1つの単位にまとめられます。20名が同じ資源を同じ手順で使えるようになり、貼り付け作業自体がなくなります。',
        'CLAUDE.mdは全セッションで読み込まれるため、リリースノート作成と無関係な作業のときにも長い手順がコンテキストを占有します。特定の定型作業の手順を置く場所としては範囲が広すぎます。',
        '起動方法の周知そのものは無害ですが、前提にある「明示的に名前を入力したときだけ使われる」という理解が誤りです。この前提で運用すると、Skillを用意しても呼ばれない場面が生じます。',
        '説明文は、いま扱っている作業がその手順の対象かどうかを判断する手掛かりになります。「リリースノートの下書き」のような利用場面を書いておくと、必要なときに読み込まれる設計が成立します。',
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
      rationales: [
        'The long procedure and the files it depends on — the template and the formatting script — become one unit instead of something each developer pastes by hand. All 20 people then work from the same resources in the same order.',
        'CLAUDE.md is loaded in every session, so a long release-notes procedure would occupy context during unrelated work. It is too broad a home for the steps of one specific routine task.',
        'Telling the team how to invoke a Skill does no harm, but the premise here is wrong: usage is not restricted to a user typing the name. Operating on that premise leaves the Skill unused in cases where it applies.',
        'The description is what makes it possible to judge whether the task at hand is covered by the procedure. Naming situations such as “drafting release notes” is what lets it be picked up when it is actually needed.',
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
      rationales: [
        '失敗を減らす目的は理解できますが、セキュリティチームがレビュー対象としているのはCI実行環境に与える権限そのものです。開発者端末の権限をそのまま持ち込むと、要約ジョブに不要な操作までCIから実行可能になります。',
        '人の応答を待たない実行形態と、要約ジョブが必要とする範囲に絞った権限は、プルリクエストごとの自動実行とセキュリティレビューの両方を同時に満たします。',
        '確認待ちが発生するとジョブはその場で止まり、プルリクエストごとの自動実行が成立しません。担当者がランナーへ入って応答する運用は、自動化の目的自体を打ち消します。',
        '要約の出力形式と終了状態が固定されていれば、CIは人の目視を介さずにジョブの成否を判定できます。プルリクエストごとに自動で回すための前提条件です。',
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
      rationales: [
        'Avoiding failures is a reasonable goal, but the permissions given to the CI environment are exactly what the security team asked to review. Carrying workstation-level access into CI makes operations far beyond a summarization job reachable from the pipeline.',
        'An execution mode that never waits for a human, combined with permissions scoped to what the summarization job actually needs, satisfies both per-pull-request automation and the security review at once.',
        'Any confirmation prompt halts the job where it stands, which defeats running it automatically on every pull request. Having someone log into the runner to answer prompts cancels out the reason for automating it.',
        'With a fixed output format and exit behavior, CI can decide pass or fail without a human reading the summary — a prerequisite for running the job on every pull request.',
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
      rationales: [
        '共有してよい情報（どのサーバーへどう繋ぐか）と、共有してはいけない情報（認証トークン）を別々の置き場所へ分けています。前者はバージョン管理で20名に同一に配られ、後者は各自の手元に留まります。',
        'リポジトリがプライベートでも、トークンは閲覧権限を持つ全員とコミット履歴に残り続けます。アクセス制御は秘密情報の管理方法の代わりにはなりません。',
        'トークンを設定と同じ場所へ置いている点は選択肢bと同じ問題を抱え、さらにグローバルスコープはチケット管理を使わないプロジェクトにまで接続定義を広げます。',
        '手順書からの手動設定は、各自の設定内容が食い違っても気づけず、更新のたびに20名へ再周知が必要です。共有設定として配る方法が既にある状況では選ぶ理由がありません。',
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
      rationales: [
        'What may be shared — which server to reach and how — is separated from what must not be: the credential. The former is distributed identically to all 20 members through version control, while the latter stays on each machine.',
        'Even in a private repository, the token remains visible to everyone with read access and persists in the commit history. Access control does not substitute for handling secrets as secrets.',
        'Keeping the token in the configuration repeats the problem of option b, and the global scope additionally pushes the connection definition into projects that have nothing to do with the ticket system.',
        'Manual setup from a chat message leaves divergent configurations that nobody notices, and every change has to be re-announced to 20 people. There is no reason to choose it when a shared, distributable setting exists.',
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
      rationales: [
        '日付が創刊より前かどうかは、しののめニュース固有の業務知識に依存する判断です。スキーマが表現しているのは型や必須項目といった形であり、この値が成り立たないことをスキーマは知りません。',
        '制約を外せばエラー表示は消えますが、成り立たない値はそのまま下流のインデクサーへ流れ込みます。検出できていた問題を見えなくするだけの対応です。',
        'プロンプトの強調は出力の傾向に影響し得るだけで、個々の値が創刊日より後かを検査する仕組みにはなりません。数万件を自動処理する経路には検査そのものが必要です。',
        '創刊日との前後比較のようなルールは、アーカイブ側の事実を参照して初めて判定できます。スキーマ検証の後段に業務ルール検証の層を置けば、インデクサー投入前に確実に弾けます。',
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
      rationales: [
        'Whether a date precedes the paper’s founding depends on knowledge specific to Shinonome News. A schema describes shape — types and required fields — and has no way to know that this particular value is impossible.',
        'Removing the constraint silences the error while the impossible value flows straight into the downstream indexer. It hides a problem that was already being detected.',
        'Prompt emphasis can only nudge the tendency of the output; it never becomes a check that compares each date against the founding date. A path processing tens of thousands of items needs the check itself.',
        'A rule like comparing against the founding date can only be evaluated against facts the archive side holds. Placing that layer after schema validation stops such records before they reach the indexer.',
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
      rationales: [
        '失敗したのは1フィールドだけなので、そのフィールドと期待条件・実際の値を返せば修正対象が特定されます。上限とフォールバックがあるため、直らない記事が夜間ジョブを占有し続けることもありません。',
        '入力もプロンプトも変わらないまま繰り返すため、同じ検証失敗を再現する可能性が高いままです。上限がないので、1件の失敗が夜間ジョブ全体を止め得ます。',
        '検証を通っていた他のフィールドまで作り直すことになり、正しかった抽出結果が変わってしまう恐れがあります。1フィールドの修正に対して処理量も過大です。',
        'ルールを消せば失敗は記録されなくなりますが、値が正しくなるわけではありません。検出されなくなった誤りがそのままインデクサーへ入ります。',
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
      rationales: [
        'Only one field failed, so naming that field along with the expected condition and the actual value pins down what has to change. The cap and fallback keep a stubborn article from consuming the overnight job indefinitely.',
        'With the input and the prompt unchanged, the same validation failure is likely to recur, and without a cap a single problematic article can hold up the whole overnight run.',
        'Fields that already passed validation get rebuilt too, so correct extractions can change on the way. It is also a disproportionate amount of work for a one-field correction.',
        'Removing the rule stops the failure from being recorded but does nothing to the value itself. The error simply reaches the indexer undetected.',
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
      rationales: [
        '夜間ジョブでは即時応答が不要なので、1件ごとのレイテンシを詰めても得るものがありません。数万件を逐次に回すこと自体が処理時間の制約になります。',
        '即時応答が不要な大量処理という条件に非同期のバッチ処理が合致し、リクエストと結果の対応付けによって、どの記事の抽出が失敗したかを後から特定できます。',
        'まとめて投入しても、個々のリクエストは検証失敗やエラーで完了しないことがあります。追跡を省くと、抽出されなかった記事に気づかないままインデックスが欠けます。',
        '数万件分の記事本文は1回の呼び出しに収まらず、仮に収まっても、どの出力がどの記事に対応するのかを保証できません。1回の失敗で全件を失う構成でもあります。',
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
      rationales: [
        'The overnight job needs no immediate response, so tuning per-item latency buys nothing, and running tens of thousands of items one after another becomes the limiting factor on total runtime.',
        'Asynchronous bulk processing matches the stated conditions — high volume, no need for immediate responses — and keeping request-to-result associations makes it possible to identify afterwards which article failed extraction.',
        'Submitting requests together does not stop individual ones from ending in validation failures or errors. Without tracking, articles that were never extracted go unnoticed and the index silently has gaps.',
        'The full text of tens of thousands of articles will not fit in a single call, and even if it did, nothing guarantees which output belongs to which article. A single failure would also cost the entire run.',
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
      rationales: [
        '圧縮は履歴を要約する過程で細部を落とすため、初期に確定した記事IDや人物の同定結果も要約に埋もれます。これらを要約の外側の構造化された状態として持てば、連載記事のセッションが長くなっても失われません。',
        '圧縮を外せば記事IDは残りますが、長い連載記事のセッションでは履歴が際限なく伸び、数万件規模の夜間処理では成立しません。原因を取り除く代わりに、別の制約に突き当たります。',
        '事実ごとにsource IDを持たせれば、統合後のレポートでも各事実がどの記事に基づくかを機械的に辿れます。下流のインデクサーが判別できないという課題に直接対応します。',
        '末尾の一覧は「この記事群を参照した」ことしか示さず、個々の事実とその根拠の対応は復元できません。現状の運用そのものであり、課題は解消しません。',
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
      rationales: [
        'Compaction summarizes history and drops detail along the way, which is how early article IDs and person-identification results get buried. Holding them as structured state outside the summary keeps them intact however long a serialized-article session runs.',
        'Dropping compaction does keep the IDs, but histories for long serialized articles then grow without bound, which does not hold up across an overnight run of tens of thousands of items. Removing the cause trades one limit for another.',
        'Carrying a source ID on each fact lets any consumer trace, mechanically, which article a fact came from even after integration. That is precisely what the downstream indexer currently cannot do.',
        'A list at the end shows only that the report drew on some set of articles; the link between an individual fact and its evidence cannot be reconstructed from it. This is the current practice, and it is what created the problem.',
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
