import type { ChoiceRationales, LocalizedText } from './types';

const localized = (ja: string, en: string): LocalizedText => ({ ja, en });

// Why each individual choice is right or wrong for its stem. Kept out of
// `questions.ts` on purpose: the quiz screen never needs this text, so it must
// not ride along in the island bundle. The later answer-review UI loads this
// module on demand; `validate.ts` checks it covers every choice exactly.
export const choiceRationales: ChoiceRationales = {
  'q-d1-loop-continue': {
    a: localized(
      '完了を示す文言は生成のたびに変わる自然文で、モデルがツール実行を要求している状態と対応しません。文面の一致で分岐すると、同じ意味の別表現で判定が崩れます。',
      'Phrases that sound like completion are free-form prose that varies between generations and does not correspond to the model actually requesting a tool call; matching on wording breaks as soon as the same intent is worded differently.',
    ),
    b: localized(
      'stop_reason は API が返す構造化された停止理由で、tool_use はモデルがツール実行を求めている状態を表します。ツールを実行し tool_result を履歴へ返して次の呼び出しへ進む、という分岐条件に直接使えます。',
      'stop_reason is the structured stop reason returned by the API, and tool_use means the model is asking for a tool call. It maps directly onto the branch: run the tool, return tool_result to the history, and call the model again.',
    ),
    c: localized(
      'トークン数はコンテキストの圧縮や打ち切りを検討する材料であり、モデルが今ツール実行を要求しているかどうかとは無関係です。',
      'Token count informs decisions about compacting or truncating context; it says nothing about whether the model is currently requesting a tool call.',
    ),
    d: localized(
      'ツール結果が空かどうかは、実行済みツールの出力の中身に関する情報にすぎず、次に何をすべきかを示しません。空の結果でもループを続けるべき場合があります。',
      'Whether a tool result is empty describes the content of an already-executed call, not what should happen next — an empty result can still be a reason to continue the loop.',
    ),
  },
  'q-d1-fanout': {
    a: localized(
      '所要時間は並列化の動機にはなりますが、可否の判断材料ではありません。依存のあるサブタスクを数の多さだけで並列に流すと、前提となる結果が揃わないまま実行されます。',
      'Elapsed time is a motivation for parallelism, not a criterion for whether it is safe. Fanning out dependent subtasks because there are many of them starts work before the results it relies on exist.',
    ),
    b: localized(
      'パイプラインは前段の出力が確定してはじめて次段を開始できるため、同時に走らせる余地がありません。並列化しても後段は待機するだけです。',
      'A pipeline stage cannot start until the previous stage has produced its output, so there is nothing to overlap. Running the stages concurrently only makes the later ones wait.',
    ),
    c: localized(
      '独立していれば実行順序が結果に影響せず、同時に走らせても互いの前提を壊しません。fan-outして最後に統合する形が成立する条件です。',
      'Independence means execution order does not affect the outcome, so the subtasks can run at the same time without breaking each other’s assumptions. This is the condition that makes fan-out plus a final merge work.',
    ),
    d: localized(
      '同じ状態を順番に更新する処理は、順序そのものが正しさの一部です。並列に実行すると更新順が保証されず、競合や上書きが起きます。',
      'When updates to one piece of state must happen in order, the ordering is part of correctness. Running them concurrently gives no guarantee about update order and invites lost or conflicting writes.',
    ),
  },
  'q-d1-subagent-input': {
    a: localized(
      '入力・出力形式・終了条件の3つが揃うと、サブエージェントは何を受け取り、どこまでやり、何を返すかを自分で判断できます。親は返ってきた結果をそのまま統合できます。',
      'With input, output shape, and stopping conditions all stated, the subagent can decide what it has, how far to go, and what to hand back, and the parent can merge the result without further interpretation.',
    ),
    b: localized(
      '全履歴の共有は、今回の調査に関係のないやり取りまで運び込みます。コンテキストを消費するうえ、無関係な文脈が判断のノイズになります。',
      'Sharing everything carries along exchanges that have nothing to do with this task. It burns context and adds unrelated material that can pull the subagent off target.',
    ),
    c: localized(
      'サブエージェントは独自のコンテキストで動くため、親が持っている前提が自動的に見えるとは限りません。この前提で指示を削ると、必要な情報が欠けたまま作業が始まります。',
      'A subagent runs with its own context, so what the parent knows is not automatically in view. Trimming instructions on that assumption starts the work with information missing.',
    ),
    d: localized(
      '形式が決まっていないと戻り値の構造が呼び出しごとに変わり、親側で解釈し直す手間が発生します。複数のサブエージェントの結果を並べて統合するのが特に難しくなります。',
      'Without an agreed shape, the returned structure varies from call to call and the parent has to re-interpret each one. Combining results from several subagents becomes especially awkward.',
    ),
  },
  'q-d1-enforcement': {
    a: localized(
      'フックはモデルの出力ではなくコード側で条件を評価し、実行前に呼び出しを止められます。モデルがルールを見落とした場合でも返金は実行されません。',
      'The hook evaluates the condition in code rather than in the model’s output and can stop the call before it runs, so a refund does not go through even when the model overlooks the rule.',
    ),
    b: localized(
      '強い言葉は指示の重みを増やしますが、従うかどうかはモデルの生成に委ねられたままです。「必ず」と書いても、逸脱したときにそれを止める仕組みはありません。',
      'Stronger wording raises the salience of an instruction, but compliance still depends on what the model generates. Nothing intercepts the request on the occasions it deviates.',
    ),
    c: localized(
      '認可チェックはエージェントがどの経路で呼んでも必ず通過する場所にあり、条件を満たさない要求をAPI側で拒否できます。エージェント以外の呼び出し元にも同じルールが効きます。',
      'The authorization check sits on a path every refund request must pass through, so the API itself refuses requests that fail the condition — including requests that did not come from the agent.',
    ),
    d: localized(
      '自問はモデル自身の認識を確認するだけで、その認識が誤っていれば誤ったまま先へ進みます。確認していないのに「確認済み」と判断した場合を検出できません。',
      'Self-questioning only surfaces what the model believes. If that belief is wrong, the wrong answer flows straight into the next step, and a mistaken “yes, it was verified” goes undetected.',
    ),
  },
  'q-d1-hook-timing': {
    a: localized(
      'このタイミングで検査できるのは実行済みの結果です。履歴へ返す前に隠しても、破壊的な操作そのものはすでに実行されており取り消せません。',
      'All this point can examine is a result that already exists. Hiding it from the history does not undo the destructive operation that produced it.',
    ),
    b: localized(
      'セッション終了時はさらに遅く、行われた操作の記録や後始末しかできません。実行の可否を左右する位置にありません。',
      'Session end is later still and only supports recording or tidying up after the fact. It has no bearing on whether a call runs.',
    ),
    c: localized(
      '次のメッセージ送信はユーザー側のイベントで、個々のツール呼び出しとは対応していません。どの呼び出しを止めるべきかを判断する情報もありません。',
      'Sending a message is a user-side event that does not line up with individual tool calls, and it carries no information about which call should have been stopped.',
    ),
    d: localized(
      '実行前であれば、呼び出し内容と引数を見てから可否を決められます。条件を満たさない場合は呼び出し自体を開始させずに済みます。',
      'Running before execution means the call and its arguments can be inspected first, and a call that fails the condition never starts.',
    ),
  },
  'q-d1-session-state': {
    a: localized(
      '再開が引き継ぐのは過去のやり取りの記録であって、ツールの実行そのものではありません。再実行されない以上、どこまで完了したかは自分で管理する必要があります。',
      'What a resume brings back is the record of the earlier exchange, not the tool executions themselves. Because nothing re-runs, tracking how far the work got is still your responsibility.',
    ),
    b: localized(
      '決定事項やIDを構造化して持てば、履歴が長くなって要約・圧縮されても失われません。会話文に埋もれた値は、探し直しや読み違いの原因になります。',
      'Decisions and identifiers held as structured state survive summarization and compaction of a long history, whereas the same values buried in prose have to be found and re-read correctly every time.',
    ),
    c: localized(
      '分岐は元のセッションを起点にして別系統を作る操作で、元の履歴を消すものではありません。「破棄されるからエクスポートが必須」という前提が成り立っていません。',
      'A fork branches from the original session rather than replacing it, so the premise that history is discarded — and therefore that an export is mandatory — does not hold.',
    ),
    d: localized(
      '履歴を引き継いだ分岐なら、これまでの文脈を保ったまま別案を試せます。元のセッションはそのまま残るので、失敗しても戻る先があります。',
      'Forking with the inherited history lets an alternative run with all the context so far, and because the original session remains, there is somewhere to return to if the alternative fails.',
    ),
  },
  'q-d2-tool-contract': {
    a: localized(
      'ツールを1つにまとめても曖昧さは消えず、どの操作をしたいかという判断が引数の中へ移るだけです。誤選択が引数の誤りとして現れるようになります。',
      'Collapsing everything into one tool does not remove the ambiguity; the choice of operation simply moves into the arguments, and wrong selections resurface as wrong parameters.',
    ),
    b: localized(
      '外部ドキュメントはツール選択の場面でモデルが読むものではありません。説明を削るほど、選択と引数生成の手がかりが減ります。',
      'External documentation is not what the model consults while selecting a tool. Trimming the description removes the very cues it uses for selection and argument construction.',
    ),
    c: localized(
      '名前と説明が用途を特定し、JSON Schema が引数の型と必須項目を定め、利用条件がいつ使うべきかを示します。選択と入力生成の両方に必要な情報が揃います。',
      'The name and description pin down what the tool is for, the JSON Schema fixes argument types and required fields, and the stated conditions say when to reach for it — covering both selection and input generation.',
    ),
    d: localized(
      '自由記述の文字列はスキーマによる検証が効かず、値の形式が呼び出しごとに変わります。不正な引数を実行前に弾く手立てがなくなります。',
      'Free-form strings cannot be validated against a schema, so value formats drift between calls and there is nothing to reject a malformed argument before execution.',
    ),
  },
  'q-d2-transient-error': {
    a: localized(
      '成功として返すと、エージェントはデータが取得できたものとして次の手順へ進みます。失敗が見えないまま誤った結論が積み上がります。',
      'Reported as a success, the agent proceeds as though it received data. The failure stays invisible while conclusions are built on top of it.',
    ),
    b: localized(
      '一時的なレート制限だと分かり再試行可能だと示されていれば、エージェントは待って再実行するという回復手段を選べます。説明は安全な範囲に限られ、秘密情報を含みません。',
      'Knowing the failure is a temporary rate limit and that the call is retryable lets the agent choose the recovery it needs — wait and try again — and the explanation stays within what is safe to expose.',
    ),
    c: localized(
      '認証ヘッダーは会話履歴に残してはいけない値です。スタックトレースも内部構造を露出させるだけで、エージェントが次に何をすべきかの判断には寄与しません。',
      'Auth headers must never land in the conversation history, and a stack trace exposes internals without telling the agent anything about what to do next.',
    ),
    d: localized(
      '失敗したことしか分からず、待てば直るのか設定が誤っているのかを区別できません。再試行すべきかどうかをモデルが推測するしかなくなります。',
      'A bare failure marker leaves no way to tell a transient limit from a misconfiguration, so whether to retry becomes guesswork.',
    ),
  },
  'q-d2-mcp-secrets': {
    a: localized(
      '接続先やコマンドといった共有してよい定義と、トークンのような秘密情報を分けられます。設定ファイルはそのままレビューでき、値の差し替えは環境ごとに行えます。',
      'This splits what is safe to share — endpoints, commands, arguments — from the credential itself. The configuration stays reviewable, and each environment supplies its own value.',
    ),
    b: localized(
      'リポジトリを非公開にしても、閲覧権を持つ全員に平文のトークンが渡り、履歴にも残ります。アクセス制御は秘密の保管方法の代わりにはなりません。',
      'Making the repository private only limits who can read it; every reader still receives the token in plain text, and it persists in history. Access control is not a storage mechanism for secrets.',
    ),
    c: localized(
      '全プロジェクト共通にすると、そのサーバーを必要としない作業からも接続が見えます。管理の手間は減っても、公開範囲は必要以上に広がります。',
      'A globally shared scope surfaces the connection in work that has no use for it. It saves administration effort at the cost of a wider exposure than the work requires.',
    ),
    d: localized(
      '接続定義ごとに、その定義を必要とする範囲へ限定できます。個人だけが使う接続と、チーム全員が使う接続を同じ場所に置かずに済みます。',
      'Each connection definition is placed where it is actually needed, so a personal connection and a team-wide one do not have to live at the same level.',
    ),
  },
  'q-d2-tool-overload': {
    a: localized(
      '名前はモデルが用途を読み取る手掛かりの一つです。略語にすると意味の手掛かりが減り、似た略語同士がかえって紛らわしくなります。',
      'The name is one of the cues the model uses to infer what a tool is for. Shortening it removes meaning, and similar-looking abbreviations become easier to confuse with each other.',
    ),
    b: localized(
      '入口を1つにしても判断が消えるわけではなく、どの機能を呼ぶかという選択が引数の中へ移るだけです。ツールごとの説明や入力スキーマも書き分けられなくなります。',
      'A single entry point does not remove the decision; it relocates it into the arguments, where per-tool descriptions and input schemas can no longer disambiguate the options.',
    ),
    c: localized(
      '温度は生成のばらつきを調整する設定で、候補が多く互いに似ているという状況そのものは変わりません。紛らわしい選択肢は紛らわしいままです。',
      'Temperature controls variability in generation, not the shape of the candidate set. A crowded set of overlapping tools stays just as easy to confuse.',
    ),
    d: localized(
      '同時に提示される候補の数と重なりを減らせるため、選択ミスの原因に直接効きます。ただし細かく分け過ぎると委譲の往復が増えるため、粒度は合わせて評価します。',
      'This shrinks both the number of simultaneously offered candidates and their overlap, which addresses the actual cause. Weigh it against the extra delegation round trips that over-splitting introduces.',
    ),
  },
  'q-d3-claudemd': {
    a: localized(
      '個人用の設定はリポジトリに含まれないため、新しく参加した開発者やCIには届きません。同期を各自の運用に任せると、規約の版が人ごとにずれます。',
      'Personal settings are not part of the repository, so a new teammate or a CI job never receives them, and leaving synchronization to individuals lets versions drift apart.',
    ),
    b: localized(
      'リポジトリに含まれるので、クローンした全員とCIが同じ内容を読み込みます。変更もレビューと履歴の対象になり、いつ何が変わったかを追えます。',
      'Because it ships with the repository, everyone who clones it and every CI run reads the same content, and edits go through review and history like any other change.',
    ),
    c: localized(
      '貼り忘れや部分的な貼り付けが起きやすく、CIの自動実行には人が介在できません。規約の更新もすべての依頼文へ反映する必要があります。',
      'Manual pasting invites omissions and partial copies, and an automated CI run has nobody to do the pasting. Every update to the rules also has to be propagated into each prompt.',
    ),
    d: localized(
      'READMEは人が読むための文書で、指示として常時読み込まれる場所ではありません。「追加の設定は不要」という前提自体が成り立ちません。',
      'The README is written for humans and is not an instruction source that is always loaded, so the premise that no further setup is needed does not hold.',
    ),
  },
  'q-d3-skill': {
    a: localized(
      '手順とその実行に必要な資源を1つのまとまりとして扱えるため、同じ作業を別のプロジェクトや別のメンバーへ持ち出せます。',
      'Keeping the procedure together with the resources it needs makes the whole capability portable to another project or another teammate.',
    ),
    b: localized(
      '常時読み込まれるのはCLAUDE.mdの性質で、Skillはそれとは別に必要になった時点で読み込まれます。両者を同一視すると、常時読み込みたいルールをSkillへ置く誤りにつながります。',
      'Always-on loading describes CLAUDE.md. A Skill is read when it becomes relevant, and conflating the two leads to putting always-applicable rules in the wrong place.',
    ),
    c: localized(
      '説明文は利用可否の判断材料になるため、対象となる作業や状況が読み取れる書き方が必要です。何をするかだけを書くと、使うべき場面が伝わりません。',
      'The description is what the decision to use the Skill is based on, so it has to convey the situations it applies to — not only what the Skill does.',
    ),
    d: localized(
      '名前の明示は起動手段の1つにすぎません。説明文から適用場面を判断できる以上、明示入力だけに限定されるという前提が誤りです。',
      'Typing the name is one way to invoke a Skill, not the only one. Since the description already signals when it applies, the claim that nothing else can trigger it is wrong.',
    ),
  },
  'q-d3-glob': {
    a: localized(
      '全体規約に混ぜると、E2Eテストと無関係な作業でも常に読み込まれます。適用範囲が広がる分だけ、他の指示との干渉や文脈の消費が増えます。',
      'Mixed into the general conventions, the rule is loaded during work that has nothing to do with E2E tests, adding interference with other instructions and consuming context for no benefit.',
    ),
    b: localized(
      'コメントはそのファイルを開いたときにしか目に入らず、新しいテストファイルを作る場面では存在しません。規約の更新も全ファイルへ手作業で反映することになります。',
      'A comment is only visible once the file is open, and it does not exist yet when a new test file is being created. Updating the rule then means editing every file by hand.',
    ),
    c: localized(
      '対象ファイルを扱うときだけ規約が効くため、適用範囲を意図どおりに絞れます。globが想定したファイルに一致するかは、実際のパスで確認しておきます。',
      'The convention takes effect only while the matching files are in scope, which is exactly the intended range. Confirm the glob against real paths so it matches the files you meant.',
    ),
    d: localized(
      'チャットの投稿は人への周知であり、作業時に参照される指示の置き場所ではありません。流れて見えなくなる点でも規約の保管には向きません。',
      'A chat post informs people; it is not a location that gets consulted during the work, and it scrolls out of view as the channel moves on.',
    ),
  },
  'q-d3-ci-design': {
    a: localized(
      '手元では人が都度判断できますが、CIは無人で動くため同じ権限を渡すと歯止めがありません。失敗を減らす目的で、影響範囲を広げてしまう選択です。',
      'On a workstation a person reviews each action; CI runs unattended, so the same permissions come with no such check. It trades a wider blast radius for fewer permission errors.',
    ),
    b: localized(
      '後続のジョブは出力と終了状態だけを見て次を決めます。形式が実行ごとに変わると、成功したのか失敗したのかをパイプライン側で判定できません。',
      'Downstream steps decide what to do next from the output and the exit state alone. If either varies between runs, the pipeline has no reliable way to tell success from failure.',
    ),
    c: localized(
      'CIランナーには応答する人がいないため、確認待ちに入った時点でジョブは進まず、タイムアウトするまで滞留します。対話を前提にできない実行環境です。',
      'No one is sitting at the runner to answer. The job simply stops at the prompt and stays there until it times out, which is why CI cannot assume an interactive session.',
    ),
    d: localized(
      '無人実行では確認で止まらないことと、権限を作業に必要な範囲へ限定することが前提になります。この2点が揃って初めて自動実行を任せられます。',
      'Unattended execution requires both that nothing blocks on a prompt and that the granted permissions stay within what the job actually needs. Together they make automatic execution safe to delegate.',
    ),
  },
  'q-d4-rubric': {
    a: localized(
      '「良い」の中身を、何を見るか・何を満たせば合格かという確認できる形へ置き換えられます。代表例と境界例が、基準を実際の入力へ当てはめる方法を示します。',
      'It replaces “good” with checkable statements of what to look at and what counts as passing, while the examples demonstrate how those rules apply to concrete input.',
    ),
    b: localized(
      '選び直しは出力後の作業で、生成そのもののばらつきは変わりません。実行回数と人手が毎回必要になり、選ぶ人の判断基準も明文化されないままです。',
      'Picking a winner happens after generation, so the underlying variance is untouched. It also costs repeated runs plus human time, and the picker’s own standard stays unwritten.',
    ),
    c: localized(
      '形容詞は程度を伝えるだけで、何を見るべきかを指定しません。「厳密」の解釈が実行ごとに変わるため、ばらつきの原因はそのまま残ります。',
      'Adjectives express intensity without naming what to inspect. The reading of “rigorous” shifts from run to run, so the source of the inconsistency remains.',
    ),
    d: localized(
      'モデルを変えても、指示に書かれていない基準は補われません。曖昧な指示に対する解釈の幅が残る以上、再現性の問題は解決しません。',
      'A different model does not supply criteria the prompt never stated. As long as the instruction admits several readings, the reproducibility problem survives the switch.',
    ),
  },
  'q-d4-structured-guarantee': {
    a: localized(
      '日付の前後関係のような制約は値どうしの関係であり、スキーマが記述する型や必須項目とは別の層にあります。形式が正しくても不整合な組み合わせは通ります。',
      'Ordering between two dates is a relation among values, which sits on a different layer from the types and required fields a schema describes. A well-formed object can still hold an inconsistent pair.',
    ),
    b: localized(
      '事実かどうかは出力の中身の問題で、構造の記述からは判定できません。正しい形をした誤った値も、スキーマ上は妥当な出力です。',
      'Accuracy is a property of the content, and a structural description cannot decide it. A wrong value in the right shape is still a valid document under the schema.',
    ),
    c: localized(
      'スキーマ準拠までは正しい記述ですが、現実との整合まで含めている点が誤りです。内容の真偽は構造の保証の対象外です。',
      'The first half is right, but extending the guarantee to consistency with reality is not. Truth of the content lies outside what a structural constraint can promise.',
    ),
    d: localized(
      '保証されるのは形、すなわち型・必須項目・列挙値といったスキーマ上の約束です。後段は解析の失敗を心配せずに値を取り出せます。',
      'The guarantee is about shape: the types, required fields, and enum values the schema declares. Downstream code can read the fields without defending against parse failures.',
    ),
  },
  'q-d4-retry-feedback': {
    a: localized(
      '入力が前回と同じであれば、モデルには前回と違う出力を出す手がかりがありません。上限のない再実行は同じ失敗を繰り返しながら時間とコストだけを消費します。',
      'With identical input the model has nothing new to work from, so the same failure is likely to recur. An unbounded loop spends time and tokens without changing the conditions that caused the failure.',
    ),
    b: localized(
      '失敗したフィールドと期待条件・実際の値を渡すと、修正すべき箇所が1つに特定され、他のフィールドを壊さずに直せます。上限とフォールバックがあるため、モデルが直しきれない場合でも呼び出し側は止まらずに終了できます。',
      'Naming the failed field together with the expected condition and the actual value narrows the correction to a single place and leaves the already-valid fields untouched. The cap and fallback keep the caller from hanging when the model cannot fix it.',
    ),
    c: localized(
      '検証は出力が下流で使える形かどうかを判定する境界です。ルールを緩めれば失敗の報告は消えますが、条件を満たさない値がそのまま下流へ流れます。',
      'Validation is the boundary that decides whether the output is usable downstream. Relaxing the rule removes the report of the failure, not the non-conforming value, which then flows on to consumers.',
    ),
    d: localized(
      '失敗したのは1フィールドだけなので、全体の再生成は既に条件を満たしていた部分まで作り直すことになります。修正範囲が広がる分、新たな検証失敗を招きやすくなります。',
      'Only one field was wrong, so regenerating everything rebuilds parts that already satisfied the schema. Widening the scope of change increases the chance of introducing a new validation failure.',
    ),
  },
  'q-d4-batch': {
    a: localized(
      'まとめて非同期に処理する方式なので、結果を受け取るまでの待ち時間を許容できる大量処理と相性が良い、というのがバッチの適用条件そのものです。',
      'Submitting work in bulk and collecting results later is exactly the trade batch processing makes: throughput and cost in exchange for waiting, which fits volume work with no interactive deadline.',
    ),
    b: localized(
      '応答が返るまでの待ち時間はむしろ長くなる方式です。ユーザーが画面の前で応答を待つ対話用途では、レイテンシ短縮の手段になりません。',
      'Batching lengthens rather than shortens the wait for any single answer, so it does not help a user sitting in front of a chat window waiting for a reply.',
    ),
    c: localized(
      'まとめて投げても成否は1件ごとに決まるため、どのリクエストがどの結果になったかを辿れる対応付けが必要です。これがないと失敗した分だけを再投入できません。',
      'Success or failure is still decided per request, so a mapping from request to result is what makes it possible to find the failed ones and resubmit only those.',
    ),
    d: localized(
      'まとめ方を変えても、個々のリクエストが失敗し得るという性質は変わりません。失敗が起きない前提で設計すると、結果の欠落に気付けなくなります。',
      'How requests are grouped does not change whether any one of them can fail. Assuming failures disappear leaves missing results unnoticed.',
    ),
  },
  'q-d5-summarize': {
    a: localized(
      '要約は情報を落とすことで短くする操作なので、何が残るかは生成のたびに変わります。「自然に含まれる」ことを前提にすると、注文番号や金額のような一字違いが致命的な値を静かに失います。',
      'A summary shortens text by dropping detail, and what survives varies from one generation to the next. Relying on prose to carry an order number or an amount loses exactly the values where a single wrong character matters.',
    ),
    b: localized(
      '全文保持は圧縮の必要が生じた理由（長さの上限とコスト）に向き合っていません。関係の薄い過去のやり取りが増えるほど、重要な事実は埋もれていきます。',
      'Keeping everything ignores the reason compression was needed in the first place: context limits and cost. It also buries the important facts among increasingly irrelevant older turns.',
    ),
    c: localized(
      '要約は流れを短くするために使い、失ってはいけない値は要約の対象外の構造化された状態として別に置く、という役割分担になります。圧縮を何度繰り返しても、その値は原文のまま参照できます。',
      'The summary carries the narrative, while values that must not be lost live outside it as structured state. However many times the history is compacted, those values remain readable verbatim.',
    ),
    d: localized(
      '古いかどうかと、以後の処理に必要かどうかは別です。会話の序盤で確定した決定事項ほど後続の判断の前提になっているため、経過時間だけを基準に消すと継続できなくなります。',
      'Age and relevance are different properties. Decisions settled early are often the premises for everything that follows, so deleting by elapsed time alone removes what the session needs to continue.',
    ),
  },
  'q-d5-escalation': {
    a: localized(
      '自己申告の確信度は生成された数値であり、実際の正しさと対応する保証がありません。誤りながら高い確信度を出した高額案件は、この設計では人の目に触れないまま通ってしまいます。',
      'Self-reported confidence is another generated value, with no guaranteed relationship to whether the answer is right. A confidently wrong high-value refund never reaches a reviewer under this rule.',
    ),
    b: localized(
      '全件レビューは見落としこそ減らしますが、低リスクの少額案件にも同じ人手を使います。件数が増えるとレビューが滞り、本当に判断が要る高額案件の確認まで遅れます。',
      'Reviewing everything does catch mistakes, but it spends the same human attention on small, low-risk refunds. As volume grows the queue backs up and the cases that genuinely need judgment wait behind the ones that do not.',
    ),
    c: localized(
      'エスカレーションを事後の回復手段に限定すると、返金という取り消しの難しい操作が実行された後にしか人が関与できません。承認は実行前の制御点として置く必要があります。',
      'Limiting escalation to post-failure recovery means a person can only get involved after a refund — an action that is hard to undo — has already been executed. Approval belongs before execution.',
    ),
    d: localized(
      '金額・権限・例外種別・曖昧さは、モデルの出力に依存せずアプリケーション側で判定できる条件です。同じ入力に対して常に同じ経路になるため、リスクの高い案件だけを確実に人の承認へ回せます。',
      'Amount, permissions, exception type, and ambiguity can all be evaluated by the application without trusting the model’s own output. The same input always takes the same route, so high-risk cases reliably reach a human approver.',
    ),
  },
  'q-d5-provenance': {
    a: localized(
      '一覧だけでは、どのURLがどの主張の根拠なのかを読み手が再構成できません。複数エージェントの結果を混ぜた後は特に、主張と根拠の対応が失われます。',
      'A flat list leaves the reader to guess which URL backs which sentence. Once results from several agents have been merged, that correspondence cannot be reconstructed at all.',
    ),
    b: localized(
      '主張とsource IDの対応を構造として受け取れば、統合はその対応を保ったまま結合する操作になります。後から個々の主張の根拠を機械的に辿れるようになります。',
      'When each claim carries its source ID as structured data, integration becomes a merge that keeps those pairs intact, and any individual claim can later be traced back to its evidence programmatically.',
    ),
    c: localized(
      '出典が付いていることと、その内容が主張を支えていることは別です。引用先が違う話をしている場合や情報が古くなっている場合があるため、対応と鮮度は別に確認します。',
      'Having a source and being supported by that source are two different things: the cited page may discuss something else, or may have gone stale. Support and freshness are checked separately from mere presence.',
    ),
    d: localized(
      '出典の存在は「どこから来たか」を示すだけで、その主張が正しいことの証明にはなりません。検証済みとみなすと、誤った内容が根拠付きという体裁で下流へ伝わります。',
      'A citation records where a claim came from; it does not establish that the claim is true. Treating it as verification lets an incorrect statement travel downstream wearing the appearance of evidence.',
    ),
  },
  'q-sc-mcp-surface': {
    a: localized(
      '取り違えの原因は「updateShipmentStatusV2」のような似た名前が並んでいることであり、略語化はその区別をさらに難しくします。名前や説明が短くなるほど、どのツールがどの場面用かの手掛かりが減ります。',
      'The mix-ups come from near-identical names such as “updateShipmentStatusV2” sitting next to each other, and abbreviating makes them harder to tell apart. Shorter names and descriptions leave fewer cues about which tool fits which situation.',
    ),
    b: localized(
      '選択肢を1つにしても、40エンドポイントぶんの分岐は汎用ツールの引数へ移るだけです。スキーマで表現できる制約が薄くなり、誤りの発生箇所が引数生成へ移動します。',
      'Collapsing the choice does not remove the forty-way decision; it relocates it into the arguments of one tool. Less of the contract can be expressed in the schema, so the errors simply move from selection to argument construction.',
    ),
    c: localized(
      '取り違えは、内部APIの構造をそのまま写した結果として似た粒度・似た名前のツールが大量に並んでいることから生じています。エージェントの仕事の単位でまとめ直せば、同時に見える候補が減り、候補どうしの違いも説明しやすくなります。',
      'The confusion follows directly from mirroring the internal API: forty tools at the same granularity with similar names. Grouping them by the agent’s units of work shrinks the candidate set visible at once and makes the remaining candidates easier to describe distinctly.',
    ),
    d: localized(
      '温度はサンプリングの分散に影響するだけで、候補どうしが区別しにくいという状態は変わりません。区別できない選択肢の中から、より確信を持って誤る方向に働くこともあります。',
      'Temperature affects sampling spread, not whether two candidates are distinguishable. Between options the model cannot tell apart, it may simply pick the wrong one more consistently.',
    ),
  },
  'q-sc-mcp-args': {
    a: localized(
      '自由記述にすると、期待する日付やIDの形式を伝える場所がなくなります。サーバー側の解釈が曖昧さを吸収しても、解釈違いは見えない形で残り、誤った値が正常系として処理されます。',
      'Free-form strings remove the place where the expected date or ID format could have been stated. Lenient server-side parsing absorbs the ambiguity silently, so a misread value is processed as if it were correct.',
    ),
    b: localized(
      'モデルは引数をツール定義から組み立てるため、期待する型・形式・制約をスキーマに書くことが最も直接的な伝達手段です。説明文で利用条件と境界を補うと、スキーマだけでは表せない「いつ何を渡すか」も同じ場所で伝わります。',
      'The model builds arguments from the tool definition, so declaring the type, format, and constraints in the schema is the most direct way to communicate them. The description then covers what a schema cannot — when to use the tool and where its limits are — in the same place.',
    ),
    c: localized(
      'ツール呼び出しの引数を組み立てる時点でモデルが参照するのはツール定義であって、社内Wikiではありません。人が貼り忘れれば同じ誤りが再発するため、対策が個人の運用に依存します。',
      'At the moment the model constructs a call it consults the tool definition, not an internal wiki. If someone forgets to paste the examples the same malformed arguments come back, which makes the fix depend on human routine.',
    ),
    d: localized(
      '検証を外すと、誤った形式の日付やIDがそのまま配送管理プラットフォームへ届きます。エージェントは何が悪かったのかを知らされないまま再試行することになり、同じ誤りを繰り返します。',
      'Without validation, malformed dates and IDs reach the delivery-management platform unchecked. The agent retries without being told what was wrong, so it repeats the same mistake.',
    ),
  },
  'q-sc-mcp-carrier-error': {
    a: localized(
      'レート制限は混雑時間帯に限って起きる一時的な失敗なので、一時的か恒久的かと再試行可能かどうかが分かれば、待って再試行するという正しい回復行動を選べます。分類が構造化されていれば、エージェント側の分岐条件としても使えます。',
      'A rate limit is a transient failure tied to busy hours, so knowing the category and whether the call is retryable points the agent at the correct recovery: back off and try again. Because the category is structured, it can be branched on rather than parsed out of prose.',
    ),
    b: localized(
      '現行実装がスタックトレースをそのまま文字列で返した結果、エージェントは同じ呼び出しを繰り返していました。加えて認証ヘッダーを含めることは、配送業者APIの資格情報をモデルの文脈と会話ログへ流し込むことになります。',
      'Returning raw stack traces as strings is what the current implementation already does, and the agent responded by repeating the same call. Including auth headers additionally pushes the carrier API credentials into the model context and the conversation logs.',
    ),
    c: localized(
      '内部実装に踏み込まずに「何が起きたか」と「次に何ができるか」を伝えれば、待機して再試行するか別手段へ切り替えるかをエージェントが判断できます。秘密や実装詳細を露出せずに回復に必要な情報だけを渡せます。',
      'Describing what happened and what options remain, without exposing internals, is enough for the agent to choose between waiting and switching approaches. It supplies the information recovery needs while keeping secrets and implementation detail out of the response.',
    ),
    d: localized(
      '失敗を成功として返すと、エージェントは配送情報が取得できたものとして次の処理へ進みます。レート制限が解消していないため、後続で誤った結果を出すか、同じ呼び出しを繰り返すことになります。',
      'Reporting a failure as success makes the agent proceed as though shipment data had been retrieved. The rate limit is still in effect, so the run either produces a wrong result downstream or loops back into the same call.',
    ),
  },
  'q-sc-mcp-token': {
    a: localized(
      'コミット済みのトークンは履歴に残るため、無効化と再発行で漏えいした値そのものを使えなくするのが起点になります。そのうえで接続定義だけを共有ファイルに残し、値は環境変数や秘密管理から参照させれば、チームへ配布できる設定と秘密を分離できます。',
      'A committed token stays in history, so revocation is what actually ends the exposure, and reissuing keeps the integration working. Leaving only the connection definition in the shared file and resolving the value from the environment or a secrets manager gives the team something safe to distribute.',
    ),
    b: localized(
      'リポジトリの公開範囲は、閲覧できる人数を絞るだけで、すでに書き込まれた値の有効性には影響しません。社内リポジトリのクローンやCIログ経由でも露出し得るため、失効させない限り漏えいは続いています。',
      'Repository visibility limits who can browse the code; it does nothing to the validity of a value already written into it. Clones and CI logs can still surface the token, so the leak remains live until the token is revoked.',
    ),
    c: localized(
      'base64は誰でも復号できる可逆な符号化で、暗号化でもアクセス制御でもありません。ファイルを読めた相手はそのままトークンを取り出せるため、平文で置くのと危険性は変わりません。',
      'base64 is a reversible encoding that anyone can undo — it is neither encryption nor access control. Whoever can read the file can still recover the token, so the exposure is unchanged.',
    ),
    d: localized(
      'グローバル設定へ移すと、この配送業者トークンが本来関係のないプロジェクトの作業からも参照可能になります。適用範囲を広げる方向の変更で、漏えいしたトークンが失効していない点も未解決のままです。',
      'A global configuration widens the blast radius: work in projects that have nothing to do with logistics could reach the carrier token. It also leaves the original problem untouched, since the committed token is still valid.',
    ),
  },
  'q-sc-support-parallel': {
    a: localized(
      '本人確認は返金実行の前提であり、この2つを同時に走らせると未確認のまま返金が進み得ます。速度のために社内規定が要求する順序を壊す設計です。',
      'Identity verification is a precondition for executing a refund. Running the two concurrently allows a refund to proceed before verification completes, trading a required policy order for latency.',
    ),
    b: localized(
      '逐次実行はデバッグしやすい一方、注文照会と配送照会のように依存のない作業まで待たせ続けます。試作で問題になっている待ち時間がそのまま残るため、移行の目的を満たしません。',
      'Sequential execution is easier to trace, but it also makes independent lookups wait on each other. The latency problem that motivated the migration would survive untouched.',
    ),
    c: localized(
      'サブタスクの件数は、その作業同士が独立かどうかを示しません。件数だけを見て並列化すると、本人確認と返金実行のように順序が必須の組み合わせも同時に走らせてしまいます。',
      'The number of subtasks says nothing about whether they depend on each other. Using count as the trigger will parallelize ordered pairs such as verify-then-refund along with the safe ones.',
    ),
    d: localized(
      '判断の基準はサブタスク間の依存関係です。注文照会と配送照会は互いの結果を必要としないため並列にfan-outでき、本人確認から返金実行へ進む流れは逐次に保てば規定も守れます。',
      'Dependency between subtasks is the criterion. Order and delivery lookups need nothing from each other and can fan out, while the verify-then-refund chain stays sequential and keeps the refund policy intact.',
    ),
  },
  'q-sc-support-worker-contract': {
    a: localized(
      'サブエージェントは独立した文脈で動くため、親が把握している顧客情報や経緯を自動的には持ちません。IDだけを渡すと、ワーカーは何を判断すべきかも、どこまでやれば終わりかも分かりません。',
      'A worker runs in its own context and does not inherit what the parent knows about the customer or the case. An ID alone leaves it without the facts to act on or a definition of when it is done.',
    ),
    b: localized(
      '独立した文脈で動くワーカーには、作業に必要な入力・返してほしい出力の形・どこで完了とみなしどこで失敗とするかを明示する必要があります。出力形式が決まっていれば、オーケストレーターは4分類の結果を同じ手順で統合できます。',
      'Because the worker starts from a separate context, the invocation has to carry the inputs the task needs, the shape of the expected result, and what counts as done versus failed. A fixed result shape lets the orchestrator merge output from all four inquiry categories the same way.',
    ),
    c: localized(
      '全履歴のコピーは必要な情報も雑談も区別せず渡すため、ワーカーのコンテキストを埋めて重要な事実を埋没させます。長引いた問い合わせほど不利になり、試作で起きている取り違えを再現しやすくなります。',
      'Dumping the whole transcript passes chatter along with the relevant facts, filling the worker’s context and burying what matters. The longer the case runs, the worse it gets — exactly the mix-ups the prototype already suffers from.',
    ),
    d: localized(
      '返答の形がワーカーごとに違うと、オーケストレーターは分類ごとに解釈を書き分けねばならず、統合が破綻します。柔軟性はワーカー内部の進め方に持たせるべきで、境界の契約は固定するのが筋です。',
      'If every worker answers in its own shape, the orchestrator needs per-category parsing and integration falls apart. Flexibility belongs inside how a worker does its job, not in the contract at the boundary.',
    ),
  },
  'q-sc-support-escalation': {
    a: localized(
      '自己申告の確信度は生成のたびに揺れる主観的な値で、外部から検証できません。高額返金でもエージェントが自信を持てば承認を素通りするため、規定の適用が確率的になります。',
      'Self-reported confidence is a subjective number that varies between runs and cannot be checked from outside. A large refund would skip approval whenever the agent happens to feel sure, making policy compliance probabilistic.',
    ),
    b: localized(
      '失敗後の引き継ぎでは、規定に反した返金が成功してしまったケースを止められません。人間の承認は事後のリカバリではなく、実行前に置くべき関門です。',
      'Recovery after a failure cannot undo a refund that succeeded in violation of the policy. Human approval belongs in front of the action, not behind it.',
    ),
    c: localized(
      '規定が定めている条件は金額と本人確認状態で、どちらも処理前に確定していて外部から検証できます。この2つを分岐条件にすれば、該当ケースは必ず承認フローへ入り、エージェントの判断のばらつきに左右されません。',
      'The policy is stated in terms of amount and verification status, both of which are known before the refund runs and verifiable outside the model. Branching on them guarantees that matching cases enter the approval flow regardless of how the agent reasons.',
    ),
    d: localized(
      'プロンプトでの強調は、モデルが従いやすくなる働きかけであって、実行を止める仕組みではありません。判断をエージェントに委ねている限り、規定違反の返金が通る経路が残ります。',
      'Emphasis in a prompt increases the odds of compliance but does not stop execution. As long as the agent decides, there is still a path along which a non-compliant refund goes through.',
    ),
  },
  'q-sc-support-context': {
    a: localized(
      '全文保持は履歴の肥大化という試作の前提をそのまま放置します。関連の薄いやり取りが増えるほど重要な事実が埋もれ、取り違えは減らないうえにコストだけが増えます。',
      'Keeping everything preserves the ballooning history the prototype already struggles with. More loosely related turns means the important facts are harder to find, so the mix-ups persist while cost climbs.',
    ),
    b: localized(
      '注文番号や顧客の希望を会話文から取り出して構造化した状態に置けば、参照先が1か所に定まり、長い履歴を読み直して拾い直す必要がなくなります。取り違えの原因そのものに効きます。',
      'Lifting order numbers and stated preferences out of the prose into structured state gives the agent one authoritative place to read them, instead of re-deriving them from a long transcript. That addresses the cause of the mix-ups directly.',
    ),
    c: localized(
      '経過時間だけを基準に消すと、初期に確認した注文番号のように、いま対応を続けるために必要な事実まで失われます。古いことと不要であることは別の性質です。',
      'Deleting by age alone discards facts the case still depends on, such as the order number confirmed in the first few turns. Old is not the same property as irrelevant.',
    ),
    d: localized(
      '圧縮は履歴を短く保つ手段ですが、要約は細部を落とします。継続に必要な事実を要約とは別に保全しておけば、履歴を短くしつつ注文番号や決定事項は確実に残せます。',
      'Compaction keeps the history short, but a summary necessarily loses detail. Preserving continuation-critical facts outside the summary lets the history shrink while order numbers and decisions survive intact.',
    ),
  },
  'q-sc-code-conventions': {
    a: localized(
      '個人用のグローバル設定はリポジトリの外にあり、20名それぞれが手作業で同期する前提になります。更新の取りこぼしが起き、CI実行環境には誰の個人設定も存在しません。',
      'Personal global settings live outside the repository and would rely on twenty developers syncing them by hand. Updates get missed, and the CI environment has no developer’s personal settings at all.',
    ),
    b: localized(
      'プロジェクト層のCLAUDE.mdはリポジトリの一部としてクローンされるため、チーム全員とCIが同じ内容を読み込みます。バージョン管理されるので、規約の変更もレビューを通して同じタイミングで全員に反映されます。',
      'A project-level CLAUDE.md travels with the repository, so every teammate and CI read the same text. Version control also means a change to the conventions lands for everyone at once, through review.',
    ),
    c: localized(
      '共有ドキュメントは規約の正本にはなりますが、適用は毎回の貼り付け作業に依存したままです。貼り忘れや貼る範囲の違いという、パイロットで実際に起きたばらつきの原因が残ります。',
      'A shared document can be the canonical text, but applying it still depends on someone pasting it correctly every time. That is precisely the manual step that produced the inconsistency during the pilot.',
    ),
    d: localized(
      'READMEは人間向けの説明として置かれるファイルで、指示として常時読み込まれる場所ではありません。ここに書いても、規約が確実に適用される保証は得られません。',
      'The README is documentation written for people, not an instruction source that is always loaded. Putting the conventions there gives no guarantee that they are applied.',
    ),
  },
  'q-sc-code-e2e-rules': {
    a: localized(
      '全体規約へ追記すると、E2Eと無関係な実装作業でもこの規約が読み込まれます。適用したい範囲より広く効いてしまい、他の作業への不要な干渉を招きます。',
      'General conventions are read during unrelated implementation work too. The rules would take effect far beyond E2E tests and interfere with tasks they were never meant for.',
    ),
    b: localized(
      'リポジトリ分割はビルドや依存関係まで巻き込む大きな構成変更で、記述規約の適用範囲を絞るという目的に対して代償が大きすぎます。テストと実装が離れる副作用も伴います。',
      'A repository split drags in build and dependency changes, which is a heavy price for scoping a writing convention. It also separates the tests from the code they exercise.',
    ),
    c: localized(
      'globで対象パスを指定すれば、規約はE2Eテストファイルを扱うときだけ適用されます。求めている適用範囲と設定の適用範囲が一致し、他の作業には影響しません。指定したglobが意図したファイルに一致するかは確認が必要です。',
      'A glob ties the rules to the E2E test paths, so they apply when those files are in play and nowhere else. The scope of the configuration matches the scope the team actually wants; the glob itself still needs checking against the real paths.',
    ),
    d: localized(
      '個人設定は各開発者の環境にとどまり、20名で同じ規約が適用される保証がありません。貼り付け運用と同じく、人手に依存したばらつきが残ります。',
      'Personal settings stay on each machine, so there is no guarantee that all twenty developers end up with the same rules. It reproduces the same human-dependent variance as pasting by hand.',
    ),
  },
  'q-sc-code-skill': {
    a: localized(
      '毎回貼り付けている長い手順と、それに付随するテンプレートファイル・整形スクリプトを1つの単位にまとめられます。20名が同じ資源を同じ手順で使えるようになり、貼り付け作業自体がなくなります。',
      'The long procedure and the files it depends on — the template and the formatting script — become one unit instead of something each developer pastes by hand. All 20 people then work from the same resources in the same order.',
    ),
    b: localized(
      'CLAUDE.mdは全セッションで読み込まれるため、リリースノート作成と無関係な作業のときにも長い手順がコンテキストを占有します。特定の定型作業の手順を置く場所としては範囲が広すぎます。',
      'CLAUDE.md is loaded in every session, so a long release-notes procedure would occupy context during unrelated work. It is too broad a home for the steps of one specific routine task.',
    ),
    c: localized(
      '起動方法の周知そのものは無害ですが、前提にある「明示的に名前を入力したときだけ使われる」という理解が誤りです。この前提で運用すると、Skillを用意しても呼ばれない場面が生じます。',
      'Telling the team how to invoke a Skill does no harm, but the premise here is wrong: usage is not restricted to a user typing the name. Operating on that premise leaves the Skill unused in cases where it applies.',
    ),
    d: localized(
      '説明文は、いま扱っている作業がその手順の対象かどうかを判断する手掛かりになります。「リリースノートの下書き」のような利用場面を書いておくと、必要なときに読み込まれる設計が成立します。',
      'The description is what makes it possible to judge whether the task at hand is covered by the procedure. Naming situations such as “drafting release notes” is what lets it be picked up when it is actually needed.',
    ),
  },
  'q-sc-code-ci': {
    a: localized(
      '失敗を減らす目的は理解できますが、セキュリティチームがレビュー対象としているのはCI実行環境に与える権限そのものです。開発者端末の権限をそのまま持ち込むと、要約ジョブに不要な操作までCIから実行可能になります。',
      'Avoiding failures is a reasonable goal, but the permissions given to the CI environment are exactly what the security team asked to review. Carrying workstation-level access into CI makes operations far beyond a summarization job reachable from the pipeline.',
    ),
    b: localized(
      '人の応答を待たない実行形態と、要約ジョブが必要とする範囲に絞った権限は、プルリクエストごとの自動実行とセキュリティレビューの両方を同時に満たします。',
      'An execution mode that never waits for a human, combined with permissions scoped to what the summarization job actually needs, satisfies both per-pull-request automation and the security review at once.',
    ),
    c: localized(
      '確認待ちが発生するとジョブはその場で止まり、プルリクエストごとの自動実行が成立しません。担当者がランナーへ入って応答する運用は、自動化の目的自体を打ち消します。',
      'Any confirmation prompt halts the job where it stands, which defeats running it automatically on every pull request. Having someone log into the runner to answer prompts cancels out the reason for automating it.',
    ),
    d: localized(
      '要約の出力形式と終了状態が固定されていれば、CIは人の目視を介さずにジョブの成否を判定できます。プルリクエストごとに自動で回すための前提条件です。',
      'With a fixed output format and exit behavior, CI can decide pass or fail without a human reading the summary — a prerequisite for running the job on every pull request.',
    ),
  },
  'q-sc-code-mcp-config': {
    a: localized(
      '共有してよい情報（どのサーバーへどう繋ぐか）と、共有してはいけない情報（認証トークン）を別々の置き場所へ分けています。前者はバージョン管理で20名に同一に配られ、後者は各自の手元に留まります。',
      'What may be shared — which server to reach and how — is separated from what must not be: the credential. The former is distributed identically to all 20 members through version control, while the latter stays on each machine.',
    ),
    b: localized(
      'リポジトリがプライベートでも、トークンは閲覧権限を持つ全員とコミット履歴に残り続けます。アクセス制御は秘密情報の管理方法の代わりにはなりません。',
      'Even in a private repository, the token remains visible to everyone with read access and persists in the commit history. Access control does not substitute for handling secrets as secrets.',
    ),
    c: localized(
      'トークンを設定と同じ場所へ置いている点は選択肢bと同じ問題を抱え、さらにグローバルスコープはチケット管理を使わないプロジェクトにまで接続定義を広げます。',
      'Keeping the token in the configuration repeats the problem of option b, and the global scope additionally pushes the connection definition into projects that have nothing to do with the ticket system.',
    ),
    d: localized(
      '手順書からの手動設定は、各自の設定内容が食い違っても気づけず、更新のたびに20名へ再周知が必要です。共有設定として配る方法が既にある状況では選ぶ理由がありません。',
      'Manual setup from a chat message leaves divergent configurations that nobody notices, and every change has to be re-announced to 20 people. There is no reason to choose it when a shared, distributable setting exists.',
    ),
  },
  'q-sc-pipe-validation': {
    a: localized(
      '日付が創刊より前かどうかは、しののめニュース固有の業務知識に依存する判断です。スキーマが表現しているのは型や必須項目といった形であり、この値が成り立たないことをスキーマは知りません。',
      'Whether a date precedes the paper’s founding depends on knowledge specific to Shinonome News. A schema describes shape — types and required fields — and has no way to know that this particular value is impossible.',
    ),
    b: localized(
      '制約を外せばエラー表示は消えますが、成り立たない値はそのまま下流のインデクサーへ流れ込みます。検出できていた問題を見えなくするだけの対応です。',
      'Removing the constraint silences the error while the impossible value flows straight into the downstream indexer. It hides a problem that was already being detected.',
    ),
    c: localized(
      'プロンプトの強調は出力の傾向に影響し得るだけで、個々の値が創刊日より後かを検査する仕組みにはなりません。数万件を自動処理する経路には検査そのものが必要です。',
      'Prompt emphasis can only nudge the tendency of the output; it never becomes a check that compares each date against the founding date. A path processing tens of thousands of items needs the check itself.',
    ),
    d: localized(
      '創刊日との前後比較のようなルールは、アーカイブ側の事実を参照して初めて判定できます。スキーマ検証の後段に業務ルール検証の層を置けば、インデクサー投入前に確実に弾けます。',
      'A rule like comparing against the founding date can only be evaluated against facts the archive side holds. Placing that layer after schema validation stops such records before they reach the indexer.',
    ),
  },
  'q-sc-pipe-retry': {
    a: localized(
      '失敗したのは1フィールドだけなので、そのフィールドと期待条件・実際の値を返せば修正対象が特定されます。上限とフォールバックがあるため、直らない記事が夜間ジョブを占有し続けることもありません。',
      'Only one field failed, so naming that field along with the expected condition and the actual value pins down what has to change. The cap and fallback keep a stubborn article from consuming the overnight job indefinitely.',
    ),
    b: localized(
      '入力もプロンプトも変わらないまま繰り返すため、同じ検証失敗を再現する可能性が高いままです。上限がないので、1件の失敗が夜間ジョブ全体を止め得ます。',
      'With the input and the prompt unchanged, the same validation failure is likely to recur, and without a cap a single problematic article can hold up the whole overnight run.',
    ),
    c: localized(
      '検証を通っていた他のフィールドまで作り直すことになり、正しかった抽出結果が変わってしまう恐れがあります。1フィールドの修正に対して処理量も過大です。',
      'Fields that already passed validation get rebuilt too, so correct extractions can change on the way. It is also a disproportionate amount of work for a one-field correction.',
    ),
    d: localized(
      'ルールを消せば失敗は記録されなくなりますが、値が正しくなるわけではありません。検出されなくなった誤りがそのままインデクサーへ入ります。',
      'Removing the rule stops the failure from being recorded but does nothing to the value itself. The error simply reaches the indexer undetected.',
    ),
  },
  'q-sc-pipe-batch': {
    a: localized(
      '夜間ジョブでは即時応答が不要なので、1件ごとのレイテンシを詰めても得るものがありません。数万件を逐次に回すこと自体が処理時間の制約になります。',
      'The overnight job needs no immediate response, so tuning per-item latency buys nothing, and running tens of thousands of items one after another becomes the limiting factor on total runtime.',
    ),
    b: localized(
      '即時応答が不要な大量処理という条件に非同期のバッチ処理が合致し、リクエストと結果の対応付けによって、どの記事の抽出が失敗したかを後から特定できます。',
      'Asynchronous bulk processing matches the stated conditions — high volume, no need for immediate responses — and keeping request-to-result associations makes it possible to identify afterwards which article failed extraction.',
    ),
    c: localized(
      'まとめて投入しても、個々のリクエストは検証失敗やエラーで完了しないことがあります。追跡を省くと、抽出されなかった記事に気づかないままインデックスが欠けます。',
      'Submitting requests together does not stop individual ones from ending in validation failures or errors. Without tracking, articles that were never extracted go unnoticed and the index silently has gaps.',
    ),
    d: localized(
      '数万件分の記事本文は1回の呼び出しに収まらず、仮に収まっても、どの出力がどの記事に対応するのかを保証できません。1回の失敗で全件を失う構成でもあります。',
      'The full text of tens of thousands of articles will not fit in a single call, and even if it did, nothing guarantees which output belongs to which article. A single failure would also cost the entire run.',
    ),
  },
  'q-sc-pipe-provenance': {
    a: localized(
      '圧縮は履歴を要約する過程で細部を落とすため、初期に確定した記事IDや人物の同定結果も要約に埋もれます。これらを要約の外側の構造化された状態として持てば、連載記事のセッションが長くなっても失われません。',
      'Compaction summarizes history and drops detail along the way, which is how early article IDs and person-identification results get buried. Holding them as structured state outside the summary keeps them intact however long a serialized-article session runs.',
    ),
    b: localized(
      '圧縮を外せば記事IDは残りますが、長い連載記事のセッションでは履歴が際限なく伸び、数万件規模の夜間処理では成立しません。原因を取り除く代わりに、別の制約に突き当たります。',
      'Dropping compaction does keep the IDs, but histories for long serialized articles then grow without bound, which does not hold up across an overnight run of tens of thousands of items. Removing the cause trades one limit for another.',
    ),
    c: localized(
      '事実ごとにsource IDを持たせれば、統合後のレポートでも各事実がどの記事に基づくかを機械的に辿れます。下流のインデクサーが判別できないという課題に直接対応します。',
      'Carrying a source ID on each fact lets any consumer trace, mechanically, which article a fact came from even after integration. That is precisely what the downstream indexer currently cannot do.',
    ),
    d: localized(
      '末尾の一覧は「この記事群を参照した」ことしか示さず、個々の事実とその根拠の対応は復元できません。現状の運用そのものであり、課題は解消しません。',
      'A list at the end shows only that the report drew on some set of articles; the link between an individual fact and its evidence cannot be reconstructed from it. This is the current practice, and it is what created the problem.',
    ),
  },

  // --- Task 8A.1: rationales for the 22 expansion questions. ---
  'q-d1-loop-toolresult': {
    a: localized(
      '結果を1件ずつ別々のメッセージで返すと、同じ応答内で要求された他のtool_useブロックが対応するtool_resultを欠いたまま次の呼び出しへ進み、対応関係が崩れます。',
      'Returning results one message at a time leaves the other tool_use blocks from the same response without their tool_result before the next call, breaking the pairing the API expects.',
    ),
    b: localized(
      '並列に要求された各tool_useに対応するtool_resultを1つのuserメッセージへまとめて返すと、ブロックの対応が保たれたままループを継続できます。',
      'Returning every parallel tool_use’s matching tool_result together in a single user message keeps the blocks paired and lets the loop continue cleanly.',
    ),
    c: localized(
      '最初のツールだけ実行して他を保留すると、残りのtool_useが未応答のまま残り、モデルは欠けた結果を待って停滞します。次のstop_reasonはこの状況では返りません。',
      'Running only the first tool leaves the remaining tool_use blocks unanswered, so the model stalls waiting for results that never arrive; no next stop_reason comes in this state.',
    ),
    d: localized(
      '自然文の要約はtool_resultブロックではないため、モデルはどのツールの結果かを構造的に対応付けられず、ツール実行の往復契約を満たしません。',
      'A prose summary is not a tool_result block, so the model cannot structurally attribute it to a call and the tool round-trip contract is not satisfied.',
    ),
  },
  'q-d1-stop-max-tokens': {
    a: localized(
      'max_tokensは正常な完結ではなく上限での打ち切りを表すため、完結として採用すると欠落した出力をそのまま使うことになります。',
      'max_tokens signals truncation at the limit, not a natural finish, so accepting it as complete uses output that is missing its tail.',
    ),
    b: localized(
      'max_tokensは上限到達による途中終了なので、上限を引き上げるか打ち切られた続きを生成させて欠落を補うのが正しい対応です。',
      'Because max_tokens is an early stop at the limit, raising the limit or continuing the truncated response to recover the missing part is the correct response.',
    ),
    c: localized(
      'ツールを実行して継続すべきなのはstop_reasonがtool_useのときで、max_tokensはツール要求を意味しません。ここでツールを走らせるのは別の停止理由への対応です。',
      'You run a tool and continue when stop_reason is tool_use; max_tokens is not a tool request, so running a tool here answers the wrong stop reason.',
    ),
    d: localized(
      '安全性による拒否はrefusalが示す別の停止理由で、max_tokensとは異なります。フォールバックへの切替はrefusal時の対応であり、打ち切りには効きません。',
      'A safety refusal is the separate refusal stop reason, distinct from max_tokens; switching to a fallback answers a refusal, not truncation.',
    ),
  },
  'q-d1-single-vs-multi': {
    a: localized(
      '密に依存し共有文脈が多い工程を並列サブエージェントに分けると、独立文脈の前提が崩れ、結果統合と文脈受け渡しのコストばかりが増えます。',
      'Splitting tightly coupled, context-heavy steps into parallel subagents breaks the premise of independent context and only adds the cost of integrating results and passing context.',
    ),
    b: localized(
      'サブエージェントを常に工程数だけ用意するのは、依存関係や規模を無視した過剰分割で、いま必要のない調整コストを固定的に抱え込みます。',
      'Always creating one subagent per step over-fragments regardless of dependency or size, locking in coordination cost that this task does not need.',
    ),
    c: localized(
      '依存が密で共有文脈が多く工程も小さい場合、分離のオーバーヘッドが利得を上回るため、単一ループで順に処理する方が無駄がありません。',
      'When steps are tightly coupled, share much context, and are small, the isolation overhead outweighs the benefit, so handling them in one loop is the leaner choice.',
    ),
    d: localized(
      '共有文脈を毎回全文渡して同期する構成は、分離の利点であるコンテキスト節約を打ち消し、往復ごとに同じ文脈を運ぶ無駄を生みます。',
      'Syncing the full shared context on every call cancels the context savings that isolation is meant to provide and repeatedly ships the same context back and forth.',
    ),
  },
  'q-d1-coordination': {
    a: localized(
      '複数サブタスクの出力を1つの成果物へまとめる責任者が要る場合、統合の所有権を中央に置くオーケストレーターが適します。',
      'When one owner must fold several subtasks’ outputs into a single deliverable, a central orchestrator that holds integration ownership fits.',
    ),
    b: localized(
      '各サブタスクが独立して完結し互いの結果を参照しないなら、調整役は不要で、並列に流して個別に返せば足ります。中央化はむしろ不要なボトルネックです。',
      'If each subtask completes independently and never references another’s result, no coordinator is needed — run them in parallel and return each; centralizing would only add a bottleneck.',
    ),
    c: localized(
      '進行を1か所で監視し、失敗時の再割り当てを一元的に判断したい場合、状態を集約する中央オーケストレーターが向きます。',
      'When you want to watch progress in one place and decide reassignment on failure centrally, a central orchestrator that aggregates state is the fit.',
    ),
    d: localized(
      '一方向パイプラインは各段が次段へ直接引き継げるため、途中に調整役を挟む必要がありません。ハンドオフだけで流れます。',
      'A one-way pipeline hands each stage straight to the next, so no coordinator is needed in between; plain handoffs carry it.',
    ),
  },
  'q-d1-subagent-scope': {
    a: localized(
      '読んだ全ファイルと全ツール結果を親履歴へ連結すると、サブエージェントで中間過程を分離した意味が失われ、親のコンテキストが調査の生データで埋まります。',
      'Concatenating every file and tool result into the parent history throws away the isolation the subagent provided and fills the parent’s context with raw research data.',
    ),
    b: localized(
      '中間の思考や全文引用を省かず返すのも同様に親側の負担で、取捨選択を親に押し付けるだけで、要約という委譲の目的を果たしません。',
      'Returning the full reasoning and verbatim quotes similarly burdens the parent, pushing the filtering onto it and defeating the summarization the delegation was for.',
    ),
    c: localized(
      'パス一覧だけでは、親は何が分かったのかを判断できず、結局ファイルを読み直すことになります。結論が欠けているため委譲の成果になりません。',
      'A list of paths alone leaves the parent unable to tell what was learned and forces it to re-read the files; with no conclusion it is not a usable delegation result.',
    ),
    d: localized(
      '判断に必要な結論と根拠だけを要約して返すと、親のコンテキストを浪費せずに成果を統合できます。これがサブエージェントに委譲する本来の目的です。',
      'Returning only the conclusion and the evidence needed to act lets the parent integrate the result without wasting context — the whole point of delegating to a subagent.',
    ),
  },
  'q-d1-handoff-data': {
    a: localized(
      '会話全文を添付し次段に読み取らせる前提は、必要な識別子や決定が長い履歴に埋もれ、取りこぼしや解釈違いを招きます。',
      'Attaching the whole conversation and expecting the next stage to read it out buries the needed identifiers and decisions in a long history, inviting misses and misreads.',
    ),
    b: localized(
      '次段が確実に使う識別子や確定済みの決定事項を構造化フィールドで明示すると、会話に依存せず正確に引き継げます。',
      'Stating the identifiers and settled decisions the next stage will use as explicit structured fields lets the handoff carry them accurately without depending on the conversation.',
    ),
    c: localized(
      '自然文の依頼だけを渡して項目を推測させると、必須データが本文表現に左右され、機械的に取り出せません。人間向けの体裁は引き継ぎの信頼性を保証しません。',
      'Passing only a prose request and letting the next stage infer fields makes required data hinge on wording and impossible to extract mechanically; a human-friendly tone does not guarantee handoff reliability.',
    ),
    d: localized(
      '引き継ぐ理由と、次段が満たすべき前提・完了条件を構造化して渡すと、受け手は何をどこまでやればよいかを曖昧さなく判断できます。',
      'Passing the reason plus the preconditions and completion conditions the next stage must meet, in structured form, lets the receiver tell exactly what to do and how far without ambiguity.',
    ),
  },
  'q-d1-hook-exitcode': {
    a: localized(
      '実行前のPreToolUseフックが終了コード2で終了すると、その呼び出しは開始前に遮断されます。これが決定的にツール実行を止める正しい仕組みです。',
      'A PreToolUse hook that exits with code 2 blocks the call before it starts — the correct, deterministic way to stop the tool execution.',
    ),
    b: localized(
      'PostToolUseは書き込みが済んだ後に走るため、警告を出しても実行済みの操作は巻き戻せません。遮断ではなく事後の記録にしかなりません。',
      'PostToolUse runs after the write has completed, so a warning cannot roll back the operation that already happened; it is after-the-fact logging, not blocking.',
    ),
    c: localized(
      '終了コード0は正常終了で、呼び出しはそのまま継続します。遮断したいときにコード0を返すのは意図と逆の結果になります。',
      'Exit code 0 means success and the call proceeds as normal; returning 0 when you want to block does the opposite of the intent.',
    ),
    d: localized(
      '標準出力へ文言を出すだけでは呼び出しは止まりません。遮断はコード2（またはblock決定の返却）が必要で、単なる出力は情報表示にとどまります。',
      'Printing text to stdout does not stop the call; blocking requires exit code 2 (or a returned block decision), while plain output only surfaces information.',
    ),
  },
  'q-d1-fork-resume': {
    a: localized(
      '同一セッションをresumeして別案に切り替えると、元のスレッドが上書きされ、後で元の続きへ戻れなくなります。分岐ではなく継続だからです。',
      'Resuming the same session and switching to the alternative overwrites the original thread, so you cannot return to it later — resume continues, it does not branch.',
    ),
    b: localized(
      '空のセッションを新規開始すると、これまでの読取や決定といった文脈を失い、手で貼り直す手間とヌケが生じます。継続の利点が消えます。',
      'Starting a blank session loses the prior reading and decisions, forcing error-prone manual re-pasting; the benefit of continuing is gone.',
    ),
    c: localized(
      'forkは元履歴のコピーから分岐した別セッションを作り、元のセッションは変更されません。別案を試しつつ元の続きも保てる、この要件に合う操作です。',
      'Fork creates a separate session branched from a copy of the original history while leaving the original untouched — exactly the action that lets you try an alternative and still keep the original thread.',
    ),
    d: localized(
      '元のセッションを削除すると別案は進められても元の案へ戻る道が失われ、「後で続けられるよう保つ」という要件に反します。',
      'Deleting the original lets you pursue the alternative but destroys the path back, violating the requirement to keep the original available to continue later.',
    ),
  },
  'q-d2-builtin-tools': {
    a: localized(
      '探索を狭く絞った検索から始めると、無関係なファイルを大量に読み込まずに対象へ近づけ、コンテキストを節約できます。',
      'Beginning exploration with a narrow, targeted search reaches the target without pulling in many irrelevant files, saving context.',
    ),
    b: localized(
      '対象を読まずに編集を適用するのは、前提を確認しないまま変更する行為で、失敗時の差分確認では手遅れになりやすく取り返しがつきません。',
      'Editing without reading the target changes code without checking assumptions; catching it only in the diff afterward is often too late to undo cleanly.',
    ),
    c: localized(
      '変更前に対象を読み、変更後に検証を走らせると、意図した変更かを確かめられ、壊れた場合もすぐ気付けます。安全な編集の基本です。',
      'Reading the target before editing and running a verification afterward confirms the change was intended and surfaces breakage quickly — the basis of safe editing.',
    ),
    d: localized(
      '破壊的なコマンドを検査せず実行後ログだけで判断するのは、取り返しのつかない操作を検証前に走らせる運用で、事前遮断の機会を捨てています。',
      'Skipping inspection of destructive commands and judging only from the post-run log runs irreversible operations before validation and throws away the chance to block them beforehand.',
    ),
  },
  'q-d2-tool-disambiguation': {
    a: localized(
      '両方のツールを常に呼んで人が選別するのは、往復と処理を二重化する無駄で、誤選択の原因である説明の曖昧さ自体は残ったままです。',
      'Always calling both tools and having a person sort the results doubles the round trips and work while leaving the real cause — ambiguous descriptions — untouched.',
    ),
    b: localized(
      '各ツールの説明に用途・非用途・入力の意味を具体的に書き分けると、モデルが選択判断に使う契約が明確になり、誤選択が根本から減ります。',
      'Rewriting each description to state its use, non-use, and input meaning gives the model a clear contract to select on, reducing misselection at the source.',
    ),
    c: localized(
      'tool_choiceで常に一方を強制すると、もう一方のツールが必要な場面でも使えなくなり、選択問題を解く代わりに機能を失わせます。',
      'Forcing one tool with tool_choice every time makes the other unusable even when it is needed, losing functionality instead of solving the selection problem.',
    ),
    d: localized(
      'ツール名を似た短い語に揃えると区別の手掛かりがさらに減り、モデルの誤選択を助長します。名前の曖昧さは問題を悪化させます。',
      'Renaming the tools to similar short words removes even more of the cue to tell them apart and worsens misselection; ambiguous names make it harder, not easier.',
    ),
  },
  'q-d3-plan-mode': {
    a: localized(
      '範囲が広く不慣れな変更では、plan modeで読取と設計を実装前に済ませて範囲と検証方法を固めると、誤った問題を解く事故を避けられます。',
      'For a broad, unfamiliar change, using plan mode to read and design before implementing — settling scope and verification — avoids solving the wrong problem.',
    ),
    b: localized(
      '不慣れなまま全ファイルを即編集すると、依存や影響範囲を把握しないまま壊し、修正のやり直しが増えて収束が遅くなります。',
      'Editing all files immediately in unfamiliar code breaks things without grasping dependencies or blast radius, multiplying rework and slowing convergence.',
    ),
    c: localized(
      'plan modeにはオーバーヘッドがあり、些末な変更にまで常時詳細設計を書くのは過剰です。一文で差分を説明できる作業では省くべきです。',
      'Plan mode has overhead, so writing a detailed design for every trivial change is excessive; when you could describe the diff in one sentence, skip it.',
    ),
    d: localized(
      '設計を省きテストを後回しにすると、不慣れな領域ほど誤りが後段まで潜伏し、検証の遅れが手戻りを大きくします。',
      'Skipping design and deferring tests lets mistakes lurk into later stages — worse in unfamiliar areas — and the delayed verification enlarges the rework.',
    ),
  },
  'q-d3-iterative-eval': {
    a: localized(
      '基準を決めず「良くなった感触」で修正を続けると、進捗を客観的に測れず、いつ止めるかも比較もできません。',
      'Revising by “feels better” with no criteria gives no objective measure of progress and no way to know when to stop or to compare approaches.',
    ),
    b: localized(
      '評価基準を反復の前に定義しておくと、各版を同じ物差しで測れ、改善が本物かを客観的に判断できます。',
      'Defining the criteria before iterating lets you measure each version on the same yardstick and judge objectively whether an improvement is real.',
    ),
    c: localized(
      '修正ごとに以前通っていた項目の回帰を確認すると、ある改善が別の箇所を壊す後退を早期に捕まえられます。',
      'Checking regressions in previously passing items after each revision catches backsliding — where one improvement breaks something else — early.',
    ),
    d: localized(
      '大量の変更を一括で入れて最後にまとめて評価すると、どの変更が効いたか切り分けられず、問題箇所の特定が難しくなります。',
      'Bundling many changes and evaluating only at the end makes it impossible to isolate which change helped and hard to locate the problem.',
    ),
  },
  'q-d3-headless-perms': {
    a: localized(
      'すべてのツールを許可して事後に目視するのは、CIで危険な操作まで無制限に走らせ、人手のレビューに頼る点で非対話実行の安全設計に反します。',
      'Allowing all tools and eyeballing afterward lets dangerous operations run unrestricted in CI and leans on manual review, which is against safe non-interactive design.',
    ),
    b: localized(
      '自然文出力を正規表現で抽出する方式は表現の揺れに弱く、CIの合否判定が壊れやすくなります。結果は構造化して受けるべきです。',
      'Extracting a pass/fail from prose with a regex is brittle against wording changes and makes CI gating fragile; results should be received structured.',
    ),
    c: localized(
      'allowedToolsを最小権限に絞り、JSON出力と終了コードで成否を判定すると、CIが機械的かつ安全に結果を扱えます。非対話実行の定石です。',
      'Scoping allowedTools to least privilege and judging success by JSON output and exit code lets CI handle results mechanically and safely — the standard for non-interactive runs.',
    ),
    d: localized(
      '対話的な権限確認をCIで有効にすると、承認する人がいないため実行が停止します。非対話環境では承認待ちが破綻を招きます。',
      'Enabling interactive permission prompts in CI stalls the run because no one is there to approve; waiting on approval breaks in a non-interactive environment.',
    ),
  },
  'q-d3-command-vs-skill': {
    a: localized(
      '.claude/commands/ は互換で動きますが、custom commandはSkillへ統合済みで、両者を別の仕組みとして設計するのは古いモデルです。新規設計はSkillへ一本化し、起動制御はfrontmatterで行います。',
      '.claude/commands/ still works for compatibility, but custom commands are merged into Skills, so designing them as separate mechanisms is the outdated model. New designs consolidate on Skills and control invocation via frontmatter.',
    ),
    b: localized(
      '両方をSkillにするのは正しい方向ですが、明示起動を封じると副作用のあるworkflowを利用者が意図した時に実行できません。既定では利用者もClaudeも起動でき、制御はfrontmatterで絞ります。',
      "Making both Skills is the right direction, but blocking explicit invocation means a side-effect workflow cannot be run when the user intends. By default both the user and Claude can invoke, and you narrow that with frontmatter.",
    ),
    c: localized(
      '手順をすべてCLAUDE.mdに書くと毎セッション常時読み込まれて肥大化し、起動制御も仕組み化されません。再利用手順はSkillにして必要時のみ読み込ませます。',
      'Putting every procedure in CLAUDE.md loads it every session and bloats context, with no built-in invocation control. Reusable procedures belong in Skills that load only when needed.',
    ),
    d: localized(
      '現在のClaude CodeではcommandはSkillへ統合され、副作用のある明示実行workflowは disable-model-invocation: true、Claudeだけが参照する背景知識は user-invocable: false で作り分けます。同じ仕組みの上でfrontmatterが起動者を決めます。',
      'In current Claude Code, commands are merged into Skills; you distinguish a side-effect explicit workflow with disable-model-invocation: true and background knowledge with user-invocable: false. On the same mechanism, frontmatter decides who invokes.',
    ),
  },
  'q-d4-fewshot': {
    a: localized(
      '典型例だけを大量に並べても、判断が割れる境界のケースは示されず、モデルは曖昧な入力への基準を学べません。',
      'Piling up typical examples never shows the borderline cases where judgment splits, so the model gains no criterion for ambiguous input.',
    ),
    b: localized(
      '誤りやすい境界例を望む入出力の対応として加え、指示と矛盾させないと、曖昧な規則が具体化し境界での判断が安定します。',
      'Adding the error-prone borderline cases as input-output pairs, consistent with the instructions, makes the ambiguous rule concrete and steadies borderline judgment.',
    ),
    c: localized(
      '例と指示が矛盾したまま数だけ増やすと、モデルはどちらに従うか迷い、かえって判断が乱れます。数は矛盾の解消にはなりません。',
      'Adding more examples while they contradict the instructions leaves the model unsure which to follow and destabilizes judgment; count does not resolve contradiction.',
    ),
    d: localized(
      '正解ラベルを伏せた入力だけを並べても、望ましい出力が示されず、モデルは基準を推測するしかありません。few-shotの効果を得られません。',
      'Listing inputs with the labels hidden shows no desired output, leaving the model to guess the criterion — the few-shot benefit is lost.',
    ),
  },
  'q-d4-multipass': {
    a: localized(
      '生成する役と評価する役を分けると、モデルが自分の出力を甘く採点する偏りを避けられ、評価の客観性が上がります。',
      'Separating the generating role from the evaluating role avoids the bias of grading one’s own output leniently and makes evaluation more objective.',
    ),
    b: localized(
      'パスを分ければ必ずトークンが減るとは限りません。各パスで文脈を再提示することもあり、コスト削減はパス分離の目的ではありません。',
      'Splitting passes does not necessarily reduce tokens — each pass may re-present context — and cost reduction is not the goal of separating passes.',
    ),
    c: localized(
      'パスを分けても最終統合での全体整合の再確認は不要になりません。局所評価が通っても全体で矛盾しうるため、統合時の確認はむしろ必要です。',
      'Splitting passes does not remove the need to recheck global consistency at integration; local checks can pass while the whole still conflicts, so the integration check is still needed.',
    ),
    d: localized(
      '各パスの役割を明確に分けると、局所評価と全体統合をそれぞれ独立して検証でき、巨大プロンプトに詰め込むより誤りを見つけやすくなります。',
      'Giving each pass a clear role lets you verify focused evaluation and final integration independently, making errors easier to catch than in one huge prompt.',
    ),
  },
  'q-d4-review-criteria': {
    a: localized(
      'レビュアー1人の主観に任せて基準を明文化しないと、判定がその人の裁量に依存し、別のレビュアーとの結果のぶれが解消しません。',
      'Leaving it to one reviewer’s judgment with unwritten criteria makes the verdict depend on their discretion and does not resolve variance against another reviewer.',
    ),
    b: localized(
      '長く詳細なら高品質という規則は、冗長さを品質と取り違えます。観察可能でも品質と相関しない指標で、要件を満たしません。',
      'A rule that longer, more detailed means higher quality mistakes verbosity for quality; it is observable but does not correlate with quality and misses the requirement.',
    ),
    c: localized(
      '「高品質」を観察可能な合否条件や尺度へ分解し評価前に定義すると、誰が見ても同じ基準で判定でき、レビュアー間のぶれが減ります。',
      'Breaking “high quality” into observable pass/fail conditions or a scale, defined before evaluating, lets anyone judge by the same criterion and reduces inter-reviewer variance.',
    ),
    d: localized(
      '評価のたびにその場で基準を変えると、案件間で結果を比較できず、再現性も失われます。基準は評価前に固定すべきです。',
      'Deciding criteria on the spot each time makes results incomparable across cases and non-reproducible; criteria should be fixed before evaluating.',
    ),
  },
  'q-d4-schema-design': {
    a: localized(
      '後段が必要とする項目に絞り深いネストを避けると、スキーマは保守しやすく壊れにくくなります。過度な複雑さはモデルの生成と後段の扱いの双方を難しくします。',
      'Limiting the schema to the fields the downstream needs and avoiding deep nesting keeps it maintainable and less brittle; excess complexity makes both generation and downstream handling harder.',
    ),
    b: localized(
      'additionalProperties: false は構造化出力でも強制され、スキーマに定義していないフィールドの混入を防ぎます。後段が想定した形だけを受け取れる堅い設計です。',
      'additionalProperties: false is enforced by structured outputs and blocks fields not defined in the schema, so the downstream receives only the intended shape — a robust design.',
    ),
    c: localized(
      '全項目を最初から網羅し深くネストするほど良いというのは誤りで、不要な複雑さは脆さとコストを増やします。実際に使う項目に絞るべきです。',
      'Covering every field and nesting deeply is not better; unnecessary complexity adds brittleness and cost, so the schema should be limited to the fields actually used.',
    ),
    d: localized(
      '業務ルールをenumやパターンで表現しても、値の意味的妥当性まではスキーマで保証されません。アプリ側の値検証は依然として必要です。',
      'Expressing business rules as enums or patterns does not make the schema guarantee the semantic validity of values; application-side value validation is still required.',
    ),
  },
  'q-d4-batch-tradeoff': {
    a: localized(
      '即時応答が要る対話パスを同期、待てる夜間処理を非同期バッチにすると、レイテンシとコストの双方の要件を満たせます。',
      'Serving the interactive path synchronously and batching the nightly work asynchronously meets both the latency and the cost requirements.',
    ),
    b: localized(
      '両方を同期にすると、締切のない夜間の大量処理までコストの高い即時経路で流すことになり、バッチの割安さを活かせません。',
      'Handling both synchronously routes even the deadline-free nightly bulk work through the costlier immediate path and forgoes the batch discount.',
    ),
    c: localized(
      '両方をバッチにすると、対話パスの応答がバッチ完了まで待たされ、ユーザーが待つ経路のレイテンシ要件を満たせません。',
      'Batching both makes the interactive response wait until the batch completes, missing the latency requirement of the path where users wait.',
    ),
    d: localized(
      '対話をバッチ、夜間を同期にするのは要件と逆で、待てない経路を遅くし、待てる経路を割高にします。',
      'Batching the interactive path and running the nightly job synchronously is the reverse of the requirements — it slows the path that cannot wait and makes the one that can wait more expensive.',
    ),
  },
  'q-d5-exploration': {
    a: localized(
      '関係しそうなディレクトリを端から全ファイル読むと、コンテキストを大量に消費し、性能低下と無関係情報の混入を招きます。',
      'Reading every file across plausibly related directories consumes a great deal of context, degrading performance and mixing in irrelevant material.',
    ),
    b: localized(
      '検索せず記憶にある一般的構造を前提に変更すると、実際の構造と食い違ったまま進み、誤った箇所を触るリスクが高まります。',
      'Changing code from a remembered general structure without searching proceeds on a possibly wrong picture and raises the risk of touching the wrong place.',
    ),
    c: localized(
      'まず広範囲を書き換えて壊れた箇所から構造を推定するのは、破壊を通じて学ぶ危険な手順で、取り返しのつかない変更を先に入れてしまいます。',
      'Rewriting a broad area first and inferring structure from what breaks learns through damage and lands irreversible changes before understanding.',
    ),
    d: localized(
      '狭い仮説に基づく検索から対象を絞り、変更前に実ファイルで前提を検証すると、コンテキストを浪費せず構造を正確に把握できます。',
      'Focusing from a narrow hypothesis-driven search and verifying assumptions against real files before changing grasps the structure accurately without wasting context.',
    ),
  },
  'q-d5-provenance-carry': {
    a: localized(
      '対立する主張を丸めず、各主張に出典IDを保ったまま両方の根拠を提示すると、どの主張がどの出典に基づくかを後から検証できます。',
      'Not collapsing the conflicting claims and keeping each claim tied to its source ID with both pieces of evidence lets you later verify which claim rests on which source.',
    ),
    b: localized(
      '読みやすさのため片方だけ採用して対応を1つにまとめると、もう一方の主張と出典が消え、来歴が失われます。',
      'Adopting only one claim for readability and collapsing the mapping erases the other claim and its source, losing provenance.',
    ),
    c: localized(
      '両主張を1文に融合し出典を片方だけにすると、どの部分がどの出典由来かの対応が壊れ、追跡できなくなります。',
      'Merging both claims into one sentence with a single source breaks the mapping of which part came from which source and makes it untraceable.',
    ),
    d: localized(
      '対立部分の出典対応を外して要約すると、根拠との結び付きが失われ、後からの人手再付与は誤りやコストを招きます。',
      'Dropping the source mapping for the conflicting part when summarizing severs the link to the evidence, and later manual re-attachment invites errors and cost.',
    ),
  },
  'q-d5-error-propagation': {
    a: localized(
      '元の失敗原因を握りつぶさず分類とともに構造化して返すと、上流は何が起きたかを機械的に判断でき、次の行動を選べます。',
      'Returning the original cause structured with a classification, rather than swallowing it, lets the caller tell mechanically what happened and choose the next action.',
    ),
    b: localized(
      '失敗を空の成功として隠すと、上流は問題に気付けず復旧や再試行の機会を失います。原因を保全すべき場面で情報を消しています。',
      'Hiding the failure as an empty success keeps the caller from noticing and forfeits recovery or retry; it erases information exactly where the cause should be preserved.',
    ),
    c: localized(
      '内部のスタックトレースや秘密情報を全文添付すると、情報漏えいの危険とコンテキストの浪費を招きます。上流に必要なのは原因の分類であって生の内部詳細ではありません。',
      'Attaching the full internal stack trace and secrets risks leaking information and wastes context; the caller needs a classified cause, not raw internal detail.',
    ),
    d: localized(
      '再試行可能かどうかと得られた部分結果を併せて返すと、上流は再試行・代替・打ち切りを的確に選べます。回復判断に必要な情報です。',
      'Returning whether it is retryable together with any partial results lets the caller pick retry, fallback, or stop precisely — the information a recovery decision needs.',
    ),
  },
};
