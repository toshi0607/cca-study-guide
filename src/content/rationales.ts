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
      '責任の明確さは分割の利点の一つですが、操作のたびにエージェント間の呼び出しが発生する往復コストとは別の軸です。上限なく分割を進めると、典型的な作業が何往復も要するようになります。',
      'Clearer responsibility is one benefit of splitting, but it is a different axis from the round-trip cost of an inter-agent call on every operation. Splitting without any cap makes a typical task take many round trips to finish.',
    ),
    b: localized(
      '往復のたびに待ち時間とハンドオフの手間が積み上がるため、典型的な作業をいくつのツール呼び出しで終えられるかを基準に、往復が作業を遅くしない粒度を選ぶのが分割の判断軸になります。',
      'Every round trip adds latency and handoff overhead, so the number of tool calls a typical task needs is the right basis: pick a granularity where the added round trips do not slow that task down.',
    ),
    c: localized(
      '専門エージェントへ分割しても、似た名前・似た粒度の操作が並べば取り違えは残り得ます。分割は取り違えを減らす一手ですが、それだけで問題が消えるとは限らず、往復コストという新たな副作用も生まれます。',
      'Splitting into specialized agents does not guarantee mix-ups disappear if similarly named, similarly grained operations still sit next to each other. Splitting helps, but it is not a guaranteed fix, and it introduces a new side effect: round-trip cost.',
    ),
    d: localized(
      '温度はサンプリングの分散に影響するだけで、分割によって増える往復回数やハンドオフの手間には触れません。分割数を無視してよい理由にはなりません。',
      'Temperature affects sampling spread only; it says nothing about the extra round trips and handoff overhead that come from splitting further. It is not a reason to ignore how far the split goes.',
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
      '成功した項目まで含めて全件を再送すると、同じ配送データが二重登録される可能性があり、レート制限にも再び触れやすくなります。1件の拒否が残り9件の成否情報を消してしまう設計です。',
      'Resubmitting all ten records, including the ones that already succeeded, risks double-registering shipments and makes hitting the rate limit again more likely. One rejection erases the success information for the other nine.',
    ),
    b: localized(
      '項目ごとの成否と再試行可能性が分かれば、エージェントは失敗した項目だけを再試行対象として選べます。構造化されたデータなのでプログラム側の分岐条件としても使えます。',
      'Knowing each record’s outcome and retryability lets the agent select only the failed records for retry. Because the data is structured, it can also be branched on programmatically.',
    ),
    c: localized(
      '成功として返すと、エージェントは10件すべて登録済みとして次の処理へ進みます。拒否された項目は配送データベースに存在しないまま扱われ、次回の定期同期を待つ間に整合性の崩れた状態が続きます。',
      'Reporting success makes the agent proceed as if all ten records were registered. The rejected ones remain absent from the shipment database, and the inconsistency persists until the next scheduled sync catches up.',
    ),
    d: localized(
      '項目ごとの識別子を添えて返せば、エージェントは10件のうちどれが失敗した項目かを取り違えずに特定でき、再送の対象を正確に絞り込めます。識別子がなければ、項目ごとの成否だけを見ても、実際に何を再送すべきかをエージェントが正しく突き合わせられません。',
      'Returning the per-record identifier lets the agent pinpoint exactly which of the ten records failed without mixing it up with another, and target the resubmission precisely. Without an identifier, knowing each record’s success or failure alone does not let the agent correctly match what to actually resend.',
    ),
  },
  'q-sc-mcp-token': {
    a: localized(
      '認証情報を `.mcp.json` に書くと、個人のサンドボックスの資格情報も本番用の資格情報も、プロジェクトを共有する全員に配布されてしまいます。接続定義と秘密情報を同じ場所に置く設計です。',
      'Writing the credential into `.mcp.json` distributes both the personal sandbox credential and the production credential to everyone who shares the project. It puts the connection definition and the secret in the same place.',
    ),
    b: localized(
      '本番用サーバーをlocal scopeに留めると、チーム全員が同じツール定義を使えず、各自が個別に接続設定をやり直すことになります。チーム共有が必要な接続定義まで個人専用にしてしまう設計です。',
      'Keeping the production server at local scope means the team cannot share one tool definition; everyone has to set up the connection separately. It makes even the connection definition that needs sharing personal-only.',
    ),
    c: localized(
      '本番用の接続定義はプロジェクトスコープで共有しつつ認証情報は各自の環境変数から解決させ、個人のサンドボックス用サーバーは共有スコープに置かないという判断は、チーム共有が必要な範囲と個人だけに意味のある範囲を分けています。',
      'Sharing the production connection definition at project scope while resolving the credential from each person’s environment, and keeping the personal sandbox server out of the shared scope, separates what needs team-wide sharing from what is meaningful to only one person.',
    ),
    d: localized(
      '個人のサンドボックスアカウントの認証情報が意味を持つのは本人だけです。それを `.mcp.json` にコミットしてプロジェクトスコープで共有すると、意味のない認証情報が他のメンバー全員に配布されてしまい、本番用の認証情報を各自の環境変数から解決させるという運用とも矛盾します。',
      'A personal sandbox account’s credential is meaningful only to the person who owns it. Committing it into `.mcp.json` and sharing it at project scope distributes that meaningless credential to everyone on the project, and it also conflicts with resolving the production credential from each person’s own environment.',
    ),
  },
  'q-sc-support-parallel': {
    a: localized(
      '本人確認や返金実行は規定によって手順と順序が確定しているので、実行のたびに分解方式を判断させる動的な構成にすると、無用な揺れと確認漏れのリスクが生じます。',
      'Identity verification and refund execution already have a fixed procedure and order under policy, so making the agent re-decide the decomposition every run introduces needless variation and a risk of skipped checks.',
    ),
    b: localized(
      '既知で予測可能な手順は固定のワークフローに、調査結果に応じて変わる部分は実行時の動的な分解にすることで、確実に守るべき手順と、ケースごとに変わる部分を両立できます。',
      'Putting the known, predictable steps into a fixed workflow and decomposing the investigation-dependent part dynamically at runtime lets a mandatory procedure and case-by-case variation coexist.',
    ),
    c: localized(
      '調査で何を確認すべきかは問い合わせごとに変わるため、事前にすべてを固定のフローチャートへ落とし込むと、想定外のケースに対応できません。',
      'What to check during the investigation varies by inquiry, so pre-encoding everything into a fixed flowchart cannot handle cases the flowchart did not anticipate.',
    ),
    d: localized(
      '固定と動的の使い分けは工程の性質で決まるものです。一種類に統一すると、既知の手順まで無駄に動的化するか、逆に調査依存の部分まで無理に固定化するかのどちらかになります。',
      'Choosing fixed vs. dynamic depends on the nature of each step. Forcing one uniform style either dynamically re-decides steps that are already known, or forces the investigation-dependent part into a rigid fixed shape.',
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
      '全体平均の承認率だけでは、特定の金額帯や理由のカテゴリで判断が悪化していても、他のカテゴリの結果に埋もれて見えなくなります。分類別に見て初めて悪化に気づけます。',
      'An overall approval rate alone can hide decisions degrading in a specific amount range or reason category — the drop gets averaged away by other categories. Only a category-level view surfaces it.',
    ),
    b: localized(
      'カテゴリ別に質を評価し、悪化が見つかったカテゴリの指摘をルーティング条件やプロンプトへ反映すると、レビューが一過性の是正で終わらず、運用全体の精度を継続的に引き上げる改善ループになります。',
      'Evaluating quality by category and feeding findings from a degrading category back into the routing conditions or the prompt turns review into an ongoing improvement loop rather than a one-off correction, continuously raising overall accuracy.',
    ),
    c: localized(
      '個別案件の是正だけで終わらせると、同じ種類の誤りが繰り返し起こります。レビューの価値は、恒常的なルールやプロンプトの改善に反映して初めて運用全体に及びます。',
      'Stopping at correcting the individual case lets the same kind of error recur. Review only benefits the whole operation once its findings feed into lasting changes to the rules or prompt.',
    ),
    d: localized(
      '過去に誤りがあった顧客だけをレビュー対象にすると、それ以外の顧客で新たに生じている悪化を見逃します。レビュー対象は特定の顧客ではなく、カテゴリや重大度といった観点で選ぶ必要があります。',
      'Reviewing only customers who had a past mistake misses new degradation affecting other customers. The review pool should be chosen by dimensions like category and severity, not by which specific customers had trouble before.',
    ),
  },
  'q-sc-support-context': {
    a: localized(
      '顧客への約束や注文IDのような値は、後から取り直す方法がありません。要約に紛れ込ませず記録へそのまま残しておけば、翌日の担当者は一字違いの取り違えなく正確な値を引き継げます。',
      'Values such as a promise made to the customer or the order ID have no way to be recovered afterward if lost. Keeping them out of a summary and in the record verbatim lets the next day’s agent inherit the exact value without a one-character slip.',
    ),
    b: localized(
      '配送状況や在庫数は業務システムに照会すれば最新の値を取り直せます。前日時点の値を記録に固定してしまうと、状況が変わっていても古い値がそのまま使われてしまいます。',
      'Delivery status or stock levels can be re-obtained with a fresh lookup against the backend system. Fixing yesterday’s value into the record risks it being used as-is even after the real state has changed.',
    ),
    c: localized(
      '会話ログ全文をそのまま渡すと、やり直しの効かない事実（顧客への約束や注文ID）と、照会し直せば済む情報（配送状況など）の区別が担当者に丸投げされ、長い履歴の中から毎回選り分ける手間が生じます。',
      'Handing over the raw log in full dumps the job of separating facts that cannot be redone — a promise, an order ID — from information that a fresh lookup would resolve — delivery status — onto the agent, who then has to sort them out of the long history every time.',
    ),
    d: localized(
      '前日の照会結果を「現在の状況」として固定すると、実際には状況が変わっていても記録上の古い値がそのまま正として使われ続けます。取り直せる情報はその場で照会し直すべきで、記録に凍結してはいけません。',
      'Freezing yesterday’s lookup result as “the current status” keeps the record’s stale value treated as authoritative even after the real situation has moved on. Information that can be re-obtained should be looked up fresh, not frozen into the record.',
    ),
  },
  'q-sc-code-conventions': {
    a: localized(
      'CLAUDE.local.mdはプロジェクト直下に置く個人用ファイルで、他の開発者やCIには渡りません。しかも個人の好みと決済サービス固有の規約を区別せずに1つへまとめてしまうと、決済サービス固有の規約もチームの誰にも適用されなくなります。',
      'CLAUDE.local.md is a personal file at the project root that never reaches other developers or CI. Lumping personal preferences together with the payments-specific rules without distinguishing them also means no one on the team ever gets the payments-specific rules either.',
    ),
    b: localized(
      '配置が入れ替わっています。~/.claude/CLAUDE.mdは各自の環境にしか存在しないため、決済サービス固有の規約を置いても他の開発者やCIには適用されません。逆にプロジェクトCLAUDE.mdは全員へ配られるため、個人の好みまで共有されてしまいます。',
      'The placements are swapped. ~/.claude/CLAUDE.md exists only on each person’s machine, so payments-specific rules placed there never reach other developers or CI. Conversely, the project CLAUDE.md is distributed to everyone, so personal preferences placed there get shared as well.',
    ),
    c: localized(
      '個人の好みは各自の~/.claude/CLAUDE.md、チーム共通規約はバージョン管理されるプロジェクトCLAUDE.md、特定ディレクトリだけの規約はそのディレクトリ配下のCLAUDE.mdに置くと、適用範囲と共有先が要望どおりになります。これらはCLAUDE.mdの階層として上書きではなく連結して読み込まれるため、互いを消し合いません。',
      'Personal preferences in each developer’s ~/.claude/CLAUDE.md, shared rules in the version-controlled project CLAUDE.md, and directory-only rules in a CLAUDE.md under that directory match the requested scope and audience for each. The CLAUDE.md hierarchy loads these concatenated rather than overriding one another, so none of them erases the others.',
    ),
    d: localized(
      '1つのファイルへ集約すると、決済サービス固有の規約が無関係な作業にも常に適用されるうえ、個人の好みまでバージョン管理下に入り全員へ配られます。要望のどちらも満たせません。',
      'Consolidating into one file applies the payments-specific rules to unrelated work as well, and puts personal preferences under version control where everyone receives them. Neither request is satisfied.',
    ),
  },
  'q-sc-code-e2e-rules': {
    a: localized(
      'globの修正だけでこの規約自体は正しく発火するようになりますが、全体規約との重複を放置すると、どちらかを更新したときに内容が食い違い、実装者がどちらに従うべきか判断できなくなるリスクが残ります。',
      'Fixing only the glob does make this rule fire correctly on its own, but leaving the duplication with the general conventions means the two can drift apart after either is updated, leaving no clear answer for which one to follow.',
    ),
    b: localized(
      'globを実際のE2Eテストの場所に一致させると、パス固有ルールが意図したファイルを扱うときにだけ適用されるようになります。全体規約との重複も合わせて取り除くことで、規約が的確に発火し、かつ矛盾のもとになる二重管理も解消されます。',
      'Matching the glob to the E2E specs’ real location makes the path-specific rule apply exactly when the intended files are in play. Removing the duplication with the general conventions at the same time both makes the rule fire correctly and eliminates the double-maintenance that could cause the two to contradict each other.',
    ),
    c: localized(
      '重複を消しても、globが実際のE2Eテストの場所と一致していない限り、この規約はそもそも一度も適用されません。根本原因である場所の不一致がそのまま残ります。',
      'Removing the duplication does nothing about the fact that the rule never applies in the first place as long as the glob doesn’t match where the E2E specs actually live — the root cause of the path mismatch survives untouched.',
    ),
    d: localized(
      '全体規約へ統合すると常にすべての作業でこの内容が読み込まれるようになり、E2E以外の実装作業にも無関係な規約が影響します。パスで絞り込むという本来の目的に反します。',
      'Merging into the general conventions makes this content load for every task, so unrelated implementation work outside E2E is now affected by rules that don’t apply to it — the opposite of the original point of scoping by path.',
    ),
  },
  'q-sc-code-skill': {
    a: localized(
      'Skillの本体は呼び出されたときだけ読み込まれるため、要点に絞ると起動のたびに読み込まれる量を減らせます。詳しい参照情報は必要な操作にとどめ、無関係な作業のコンテキストを圧迫しない設計になります。',
      'A Skill’s body loads only when it is invoked, so trimming it to essentials reduces how much loads on every run. Keeping detailed reference material to what the operation actually needs avoids crowding the context of unrelated work.',
    ),
    b: localized(
      '説明文はSkillを起動すべきかどうかをClaudeが判断する際に参照するメタデータです。情報を詰め込むほど、無関係な場面でも読み込まれる量が増え、かつ肝心の利用場面の判断材料としてはかえって埋もれます。',
      'The description is metadata Claude consults when deciding whether to invoke the Skill. Piling in information only increases what loads even for unrelated situations, and buries the very cue that should signal when to use the Skill.',
    ),
    c: localized(
      'SKILL.mdは概要と手順だけを持ち、詳しいテンプレートや過去ログは別ファイルへ分けて本体から参照させると、それらのファイルは実際に必要になった操作のときだけ読み込まれます。大きな参照資料を本体に書き込むと、Skillが呼び出されるたびに不要な内容まで一緒に読み込まれてしまいます。',
      'Keeping SKILL.md to an overview plus the procedure, with detailed templates and past logs split into separate files the body references, means those files load only when the operation actually needs them. Writing large reference material directly into the body means every invocation of the Skill loads that unneeded content too.',
    ),
    d: localized(
      '本体は呼び出されたときだけ読み込まれる部分なので、事前にすべての詳細を集約しても「再度参照せずに済む」という利点にはならず、逆に呼び出しのたびに不要な情報まで読み込む設計になります。',
      'The body only loads when the Skill is invoked, so pre-consolidating every detail does not actually save a future lookup — it just means every invocation loads information that is not always needed.',
    ),
  },
  'q-sc-code-ci': {
    a: localized(
      '--output-format json と --json-schema を組み合わせると、file・line・severityなどのフィールドを持つ構造化配列として指摘を受け取れます。severityがhighの指摘があるかどうかで終了状態を分ければ、CIは出力の文面を解釈せずに機械的に合否を判定できます。',
      'Combining --output-format json with --json-schema returns findings as a structured array with fields such as file, line, and severity. Branching the exit status on whether any finding has severity high lets CI decide pass/fail mechanically without parsing prose.',
    ),
    b: localized(
      'レビュー対象をPRの差分に絞ってClaudeへ渡すと、変更していない既存コードを毎回読み込ませずに済みます。',
      'Scoping the review input to the PR diff means Claude doesn’t have to re-read unchanged existing code on every run.',
    ),
    c: localized(
      'レビュー対象をリポジトリ全体へ広げても、severityを基準に機械的に合否判定するという3.6の要件には関係がなく、変更していないファイルまで読み込ませる分だけコストが増えます。',
      'Broadening the review target to the whole repository has nothing to do with 3.6’s requirement of judging pass/fail mechanically by severity, and only adds cost from reading files that were never changed.',
    ),
    d: localized(
      '指摘を保存するだけでCIジョブの成否判定に使わなければ、ジョブは実際には何も検証せずに完了したことになります。指摘が機械可読であっても、それをCIの判定に結び付けなければ3.6の要件を満たしません。',
      'Saving findings without ever using them for the CI verdict means the job effectively completes having validated nothing. Even machine-readable findings satisfy 3.6 only when the CI verdict is actually tied to them.',
    ),
  },
  'q-sc-code-mcp-config': {
    a: localized(
      'リポジトリへのコミットは承認の代わりにはなりません。対話セッションでは、コミット済みの.mcp.jsonであっても最初の利用時に承認プロンプトが表示されます。',
      'Committing to the repository is not a substitute for approval. Even for an already-committed .mcp.json, an interactive session shows an approval prompt the first time it is used.',
    ),
    b: localized(
      'claude -p のような非対話実行では、そもそも承認プロンプトを表示する手段がありません。「承認するまで使われない」という前提のまま非対話実行に組み込むと、CIジョブはMCPサーバーに到達する前に動かなくなります。',
      'A non-interactive run such as claude -p has no way to show an approval prompt at all. Assuming it always waits for approval and then wiring it into non-interactive execution would leave the CI job unable to reach the MCP server.',
    ),
    c: localized(
      '対話セッションでは初回に承認プロンプトが表示されて安全に運用でき、claude -p のような非対話実行ではそのプロンプトを出せないため承認なしで読み込まれます。この非対話時の挙動を前提にCIへ組み込む必要があります。',
      'An interactive session shows an approval prompt the first time, keeping the flow safe, while a non-interactive run like claude -p cannot show that prompt and loads the server without approval. CI integration needs to be designed around that non-interactive behavior.',
    ),
    d: localized(
      '${VAR}形式の環境変数参照は command・args・env・url・headers などで展開されます。展開されないという前提でトークンを直書きすると、秘密情報を設定ファイルに直書きしないという運用に反します。',
      '${VAR}-style environment-variable references are expanded in fields such as command, args, env, url, and headers. Assuming they aren’t expanded and writing the token directly would violate the practice of keeping secrets out of the configuration file.',
    ),
  },
  'q-sc-pipe-validation': {
    a: localized(
      '統合パス専用の指示で「何を矛盾とみなすか」を定めておけば、統合パスは各回の抽出結果をやり直すことなく、回をまたぐ整合性の検証だけに専念できます。各回のパスが確定させた値もそのまま活かされます。',
      'A dedicated instruction stating what counts as a contradiction lets the integration pass focus solely on cross-installment consistency without redoing each installment’s extraction, and keeps the values each installment’s pass already settled intact.',
    ),
    b: localized(
      '抽出用プロンプトをそのまま統合パスでも使うと、統合パスは各回のパスと同じ抽出作業を繰り返すだけになり、回をまたぐ矛盾を検出するという固有の役割を果たせません。',
      'Reusing the extraction prompt for the integration pass just repeats the same extraction work each installment’s pass already did, and does nothing toward the integration pass’s own job of catching cross-installment contradictions.',
    ),
    c: localized(
      '統合パスという工程自体を省くと、回をまたぐ矛盾を検出する場所がどこにもなくなります。各回のパスの出力をただ連結しても、表記揺れや日付の食い違いは残ったままインデクサーへ流れ込みます。',
      'Skipping the integration pass entirely removes the only stage that checks for cross-installment contradictions. Simply concatenating the per-installment outputs lets inconsistent spellings or clashing dates flow straight through to the indexer.',
    ),
    d: localized(
      '統合パスに抽出のやり直しまで担わせると、局所的な抽出と全体の整合確認という役割の分離が崩れ、抽出のやり直しでは各回のパスの結果を壊しかねません。',
      'Loading the integration pass with re-extraction as well collapses the separation between local extraction and global consistency checking, and redoing the extraction risks overwriting what each installment’s pass already got right.',
    ),
  },
  'q-sc-pipe-retry': {
    a: localized(
      '同じ検証に通らない原因が解消されないまま繰り返すと、1件の記事が夜間ジョブを無期限に占有しかねません。上限を設ける目的そのものを無効化します。',
      'Repeating the same retry without addressing why validation keeps failing risks letting one article hold the overnight job hostage indefinitely. It defeats the very purpose of having a cap.',
    ),
    b: localized(
      'デフォルト値は検証を通すための埋め合わせであり、記事の事実を表しません。誤った値が検証を素通りしてそのままインデクサーへ入ります。',
      'A default value only papers over the validation failure; it does not represent a fact about the article. The wrong value slides past validation straight into the indexer.',
    ),
    c: localized(
      '上限に達した記事は自動処理では解決できないと分かった時点で、これ以上の自動リトライを止め、失敗の詳細を添えて人へ引き継ぐのが妥当です。詳細を残すことで、レビューする人が同じ調査をやり直さずに済みます。',
      'Once an article has proven unsolvable by automation up to the cap, the right move is to stop further automated retries and hand off to a person with the failure detail attached. Carrying that detail means the reviewer does not have to redo the same investigation.',
    ),
    d: localized(
      '記録を残さずに飛ばすと、その記事が抽出されなかったこと自体に誰も気づけません。インデックスは欠落したまま気づかれずに残ります。',
      'Skipping without a record means no one notices that the article was never extracted at all. The index is left silently incomplete.',
    ),
  },
  'q-sc-pipe-batch': {
    a: localized(
      'custom_idは結果とリクエストを結びつける唯一の手がかりです。succeeded以外の3種別だけを対象にすれば、既に成功した記事を無駄に再処理せずに済みます。',
      'custom_id is the one reliable link between a result and its request. Targeting only the three non-succeeded types avoids wastefully reprocessing articles that already succeeded.',
    ),
    b: localized(
      'バッチ結果は投入順で返る保証がありません。インデックス位置で対応付けると、公式ドキュメントが明示する挙動に反し、記事を取り違えたまま処理が進みます。',
      'Batch results carry no guarantee of returning in submission order. Matching by index position contradicts the documented behavior and lets articles get silently mismatched.',
    ),
    c: localized(
      '1件のリクエストの失敗は他のリクエストの処理に影響しません。成功済みの記事まで含めて全件を再投入するのは、無駄な処理とコストを生むだけです。',
      'One request failing does not affect the processing of the others. Resubmitting everything, including already-succeeded articles, only creates wasted processing and cost.',
    ),
    d: localized(
      '公式ドキュメントは、失敗したリクエストには呼び出し側で再試行の処理を実装するよう勧めています。追跡と再投入を怠ると、それらの記事は検索基盤に永久に反映されないままになります。',
      'The official guidance recommends implementing retry logic for failed requests on the caller’s side. Skipping tracking and resubmission leaves those articles permanently missing from the search platform.',
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
