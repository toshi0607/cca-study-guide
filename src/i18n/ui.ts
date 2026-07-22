import type { LocalizedText } from '../content/types';
import type { Locale } from './locales';

type View = 'today' | 'guide' | 'practice' | 'quiz' | 'progress' | 'hands-on';
type HandsOnStatus = 'not_started' | 'in_progress' | 'completed' | 'stale' | 'future';
type CardKind = 'recall' | 'contrast' | 'scenario';
type QuestionFormat = 'single' | 'multiple';
type ReviewFilter = 'due' | 'all' | 'unseen' | 'reviewed' | 'weak';

export type UiCopy = {
  brand: {
    mark: string;
    fieldNotes: string;
    edition: string;
    unofficial: string;
    affiliationShort: string;
    footer: string;
  };
  aria: {
    mainNavigation: string;
    siteInformation: string;
    languageNavigation: string;
    opensNewTab: string;
  };
  languageNames: Record<Locale, string>;
  views: Record<View, string>;
  pageTitle: string;
  notices: {
    saveFailed: string;
    ratingAgain: string;
    ratingHard: string;
    ratingGood: string;
    exported: string;
    importConfirm: (count: number, exportedAt: string | null) => string;
    importInvalid: string;
    importDone: string;
    resetConfirm: string;
    resetFailed: string;
    resetDone: string;
  };
  today: {
    eyebrow: string;
    titleLead: string;
    titleEmphasis: string;
    introduction: string;
    dueTitle: string;
    dueCount: (count: number) => string;
    startReview: string;
  };
  blueprint: {
    eyebrow: string;
    title: string;
    progressNote: string;
    started: (percent: number) => string;
  };
  weakAreas: {
    eyebrow: string;
    title: string;
    note: string;
    cardCount: (count: number) => string;
    emptyBeforeStartTitle: string;
    emptyBeforeStartDescription: string;
    emptyAllClearTitle: string;
    emptyAllClearDescription: string;
  };
  status: {
    eyebrow: string;
    title: string;
    started: string;
    notStarted: string;
    coverage: string;
    objectives: (count: number) => string;
  };
  guide: {
    eyebrow: string;
    title: string;
    introduction: string;
    openExamGuide: string;
    weight: string;
    mustKnow: string;
    officialSources: string;
    verified: (date: string) => string;
    loading: string;
    loadError: string;
    retry: string;
    progress: (completed: number, total: number) => string;
    status: Record<'not_started' | 'in_progress' | 'completed' | 'stale' | 'future', string>;
    actionDone: Record<'start' | 'complete' | 'reconfirm', string>;
    start: string;
    complete: string;
    reconfirm: string;
    staleNote: (status: string) => string;
    futureNote: (status: string) => string;
    domains: string;
    statements: string;
    keyPoints: string;
    relatedCards: string;
    relatedQuestions: string;
    diagnosisLegend: string;
    diagnosisQuestion: string;
    diagnosisOptions: [string, string, string];
    diagnosisSubmit: string;
    diagnosisResult: (title: string) => string;
    serviceTitle: string;
    serviceBody: string;
    pathTitle: string;
    path: ReadonlyArray<{ label: string; available: boolean; target?: View }>;
    availabilityNow: string;
    availabilityLater: string;
    calendarTitle: string;
    calendarBody: string;
  };
  handsOn: {
    eyebrow: string;
    title: string;
    introduction: string;
    entryTitle: string;
    entryBody: string;
    openList: string;
    loading: string;
    loadError: string;
    retry: string;
    listProgress: (completed: number, total: number) => string;
    minutes: (count: number) => string;
    stepCount: (completed: number, total: number) => string;
    status: Record<HandsOnStatus, string>;
    open: string;
    backToList: string;
    domains: string;
    scenarios: string;
    skills: string;
    taskStatements: string;
    estimatedTime: string;
    objectives: string;
    prerequisites: string;
    environment: string;
    setup: string;
    stepsLegend: string;
    expectedResult: string;
    deliverables: string;
    verification: string;
    troubleshooting: string;
    symptom: string;
    isolation: string;
    security: string;
    cost: string;
    cleanup: string;
    reflection: string;
    relatedCards: string;
    relatedQuestions: string;
    officialSources: string;
    start: string;
    complete: string;
    reconfirm: string;
    completeHint: string;
    staleNote: string;
    futureNote: string;
    actionDone: {
      start: string;
      complete: string;
      reconfirm: string;
      // Step notices carry the running count so the aria-live region re-announces
      // each toggle even when consecutive actions are the same direction.
      step: (completed: number, total: number) => string;
      unstep: (completed: number, total: number) => string;
    };
  };
  practice: {
    eyebrow: string;
    title: string;
    introduction: string;
    searchLabel: string;
    searchPlaceholder: string;
    stateLegend: string;
    domainLegend: string;
    filters: Record<ReviewFilter, string>;
    allDomains: string;
    resultCount: (count: number) => string;
    kinds: Record<CardKind, string>;
    question: string;
    revealAnswer: string;
    hideAnswer: string;
    answer: string;
    pitfall: string;
    officialSources: string;
    verified: (date: string) => string;
    ratingLegend: string;
    ratingAgain: string;
    ratingAgainDelay: string;
    ratingHard: string;
    ratingHardDelay: string;
    ratingGood: string;
    ratingGoodDelay: string;
    ratingGoodExtended: string;
    emptyTitle: string;
    emptyDescription: string;
    targetAnnouncement: (prompt: string) => string;
    showAll: string;
  };
  session: {
    start: string;
    cannotStart: string;
    progress: (current: number, total: number) => string;
    remaining: (count: number) => string;
    cardAnnouncement: (current: number, total: number) => string;
    revealAnnouncement: string;
    shortcutsReveal: string;
    shortcutsRate: string;
    shortcutsQuit: string;
    quit: string;
    abortConfirm: string;
    abortedNotice: string;
    summaryEyebrow: string;
    summaryTitle: string;
    breakdownLegend: string;
    ratedCount: (count: number) => string;
    dueRemaining: (count: number) => string;
    restart: string;
    backToList: string;
  };
  quiz: {
    eyebrow: string;
    title: string;
    introduction: string;
    modeLegend: string;
    modeRandom: string;
    modeScenario: string;
    scenarioIntroduction: string;
    scenarioListLabel: string;
    scenarioQuestionCount: (count: number) => string;
    scenarioAnswered: (answered: number, total: number) => string;
    backgroundTitle: string;
    proceedToQuestions: string;
    backgroundToggle: string;
    countLegend: string;
    count10: string;
    count20: string;
    countAll: string;
    domainLegend: string;
    weightedDomains: string;
    start: string;
    progressLabel: (current: number, total: number) => string;
    formats: Record<QuestionFormat, string>;
    singleHint: string;
    multipleHint: string;
    choicesLegend: string;
    submitAnswer: string;
    resultCorrect: string;
    resultIncorrect: string;
    correctAnswerLabel: string;
    correctBadge: string;
    selectedBadge: string;
    officialSources: string;
    verified: (date: string) => string;
    next: string;
    showResults: string;
    quit: string;
    summaryEyebrow: string;
    summaryTitle: string;
    accuracy: string;
    scoreLine: (correct: number, total: number) => string;
    byDomain: string;
    wrongTitle: string;
    noWrong: string;
    retry: string;
  };
  progress: {
    eyebrow: string;
    title: string;
    introduction: string;
    byDomain: string;
    localData: string;
    localDataDescription: string;
    analyticsDisclosure: string;
    details: string;
    exportJson: string;
    importJson: string;
    reset: string;
    weakCount: (count: number) => string;
    sourcesEyebrow: string;
    sourcesTitle: string;
    sourcesDescription: string;
    verified: (date: string) => string;
    disclaimerTitle: string;
    disclaimerBody: string;
    blueprintVerified: (date: string) => string;
    reportIssueLead: string;
    reportIssueLink: string;
  };
  footer: {
    analytics: string;
    github: string;
  };
};

export const localize = <T>(text: LocalizedText<T>, locale: Locale): T => text[locale];

export const ui = {
  ja: {
    brand: {
      mark: 'CCA',
      fieldNotes: 'FIELD NOTES',
      edition: 'FOUNDATIONS / CCAR-F\n2026年7月版',
      unofficial: '非公式',
      affiliationShort: 'Anthropicとは\n提携していません',
      footer: 'CCA Field Notes · 非公式学習ノート',
    },
    aria: {
      mainNavigation: 'メインナビゲーション',
      siteInformation: 'サイト情報',
      languageNavigation: '表示言語',
      opensNewTab: '（新しいタブで開く）',
    },
    languageNames: { ja: '日本語', en: 'English' },
    views: { today: '今日', guide: 'ガイド', practice: '練習', quiz: '演習', progress: '進捗', 'hands-on': 'ハンズオン' },
    pageTitle: 'CCA Field Notes — Claude Certified Architect非公式学習ガイド',
    notices: {
      saveFailed: '進捗を保存できませんでした。ブラウザのサイトデータ設定または空き容量を確認してください。',
      ratingAgain: '10分後にもう一度表示します。',
      ratingHard: '明日もう一度確認します。',
      ratingGood: 'できた：次の復習日を更新しました。',
      exported: '進捗をJSONで書き出しました。',
      importConfirm: (count, exportedAt) => `${exportedAt ? `${exportedAt}に書き出した進捗` : '読み込んだ進捗'}（復習済みカード${count}枚）で、この端末の現在の進捗を上書きします。よろしいですか？`,
      importInvalid: '進捗データとして読み込めませんでした。このアプリで書き出したJSONファイルを選択してください。',
      importDone: 'JSONから進捗を読み込みました。',
      resetConfirm: 'この端末の学習進捗をすべて削除します。元に戻せません。',
      resetFailed: '進捗を削除できませんでした。ブラウザのサイトデータ設定を確認してください。',
      resetDone: 'この端末の進捗を削除しました。',
    },
    today: {
      eyebrow: '今日',
      titleLead: '思い出してから、',
      titleEmphasis: '答えを開く。',
      introduction: '公開されている出題範囲を、短い想起練習にしました。カードはすべて独自作成です。',
      dueTitle: '今日の復習',
      dueCount: () => '枚のカード',
      startReview: '復習を始める',
    },
    blueprint: {
      eyebrow: 'EXAM BLUEPRINT',
      title: '5領域の設計図',
      progressNote: 'ノード内の帯はカード着手率',
      started: (percent) => `${percent}% 着手`,
    },
    weakAreas: {
      eyebrow: 'WEAK AREAS',
      title: '苦手エリア',
      note: '「もう一度」「難しい」評価や、つまずき2回以上のカードを集計',
      cardCount: (count) => `${count}枚`,
      emptyBeforeStartTitle: '記録はまだありません。',
      emptyBeforeStartDescription: '練習でカードを評価すると、つまずいた領域がここに表示されます。',
      emptyAllClearTitle: '苦手なカードはありません。',
      emptyAllClearDescription: 'この調子で復習を続けましょう。',
    },
    status: {
      eyebrow: 'LOCAL PROGRESS',
      title: 'この端末の進捗',
      started: '着手',
      notStarted: '未着手',
      coverage: '収録範囲',
      objectives: (count) => `${count}項目`,
    },
    guide: {
      eyebrow: 'PUBLIC BLUEPRINT / 30 OBJECTIVES',
      title: '学習ガイド',
      introduction: '公式Exam Guide v1.0の30タスク領域を、公開ドキュメントに基づく独自の短い要約で整理しています。原文は公式ガイドを確認してください。',
      openExamGuide: '公式Exam Guideを開く',
      weight: 'WEIGHT',
      mustKnow: '覚えること',
      officialSources: '公式資料',
      verified: (date) => `最終確認 ${date}`,
      loading: '学習ガイドを読み込んでいます。',
      loadError: '学習ガイドを読み込めませんでした。もう一度お試しください。',
      retry: 'ページを再読み込み',
      progress: (completed, total) => `${total}セクション中${completed}セクションを現行版で完了`,
      status: { not_started: '未着手', in_progress: '進行中', completed: '完了', stale: '更新内容の再確認が必要', future: 'この端末では新しい版の記録' },
      actionDone: { start: 'セクションを開始として記録しました。', complete: 'セクションを完了として記録しました。', reconfirm: '更新内容の再確認を記録しました。' },
      start: 'このセクションを開始', complete: '完了として記録', reconfirm: '更新内容を再確認した',
      futureNote: (status) => `以前の記録は「${status}」です。この版より新しいため、ここでは変更しません。新しい版で開いてください。`,
      staleNote: (status) => `以前の記録は「${status}」として保持されています。内容を確認した後に再確認を記録できます。`,
      domains: '対象ドメイン', statements: '対象タスクステートメント', keyPoints: '設計で確認すること',
      relatedCards: '関連カードを開く', relatedQuestions: '関連設問を開く',
      diagnosisLegend: '最初に取り組む場所を選ぶ', diagnosisQuestion: '今いちばん必要な学習を1つ選んでください。',
      diagnosisOptions: ['エージェントループと委譲の基礎から始めたい', 'ツール契約とMCPの境界を整理したい', 'エスカレーション・人のレビュー・出典追跡を整理したい'],
      diagnosisSubmit: '開始セクションを提案する', diagnosisResult: (title) => `まずは「${title}」から始めることを提案します。これはこの端末に保存されません。`,
      serviceTitle: 'このサービスでできること／できないこと',
      serviceBody: '公開資料に基づく独自のガイド、カード、選択式演習を提供します。非公式であり、実試験問題やexam dumpは使用せず、合格を保証しません。Claude Code、API、MCP、CIの実システム経験は、ご自身の環境で別途行ってください。',
      pathTitle: '8段階の学習パス（独自の学習上の提案）',
      path: [{ label: '初回診断', available: true }, { label: 'D1/D2/D5 基礎', available: true }, { label: 'D3/D4 実装・運用', available: true }, { label: 'Hands-on', available: true, target: 'hands-on' }, { label: 'シナリオ判断', available: true }, { label: '模試', available: false }, { label: '誤答修正', available: false }, { label: '本番直前チェック', available: false }],
      availabilityNow: '現在利用可能: Guide、Hands-on、Practice、Quiz', availabilityLater: 'この段階の詳細機能は今後の学習計画です。実環境での作業はこのサービス外で行ってください。',
      calendarTitle: '8月末までの進め方', calendarBody: '残り期間では、先にガイドで範囲を確認し、カードで想起し、選択式演習で判断を言語化する順に繰り返してください。遅れた場合は未完了セクションを優先し、固定の日数や合格可能性は前提にしません。',
    },
    handsOn: {
      eyebrow: 'HANDS-ON / BUILD IN YOUR OWN ENVIRONMENT',
      title: 'ハンズオン',
      introduction: '試験範囲に対応した設計・実装・検証を、ご自身の環境で再現できるガイドです。ブラウザ内に実行環境は作りません。手順は独自の推奨、技術的事実は公式資料に基づきます。',
      entryTitle: 'ハンズオンで実システムを試す',
      entryBody: '各ガイドは、何を・なぜ・どの順で作り、何をもって成功とするか、どこで失敗しやすいか、どの権限・コスト・セキュリティに注意するかを示します。進捗はこの端末に保存されます。',
      openList: 'ハンズオン一覧へ',
      loading: 'ハンズオンを読み込んでいます。',
      loadError: 'ハンズオンを読み込めませんでした。もう一度お試しください。',
      retry: 'ページを再読み込み',
      listProgress: (completed, total) => `${total}件中${completed}件を現行版で完了`,
      minutes: (count) => `約${count}分`,
      stepCount: (completed, total) => `${total}ステップ中${completed}ステップ完了`,
      status: { not_started: '未着手', in_progress: '進行中', completed: '完了', stale: '更新内容の再確認が必要', future: 'この端末では新しい版の記録' },
      open: 'ガイドを開く',
      backToList: 'ハンズオン一覧に戻る',
      domains: '対象ドメイン',
      scenarios: '公式シナリオ',
      skills: '対応スキル',
      taskStatements: '対象タスクステートメント',
      estimatedTime: '想定所要時間',
      objectives: '学習目的',
      prerequisites: '前提知識',
      environment: '必要な環境',
      setup: '準備',
      stepsLegend: '実装ステップ（完了したものにチェック）',
      expectedResult: '期待結果・確認方法',
      deliverables: '最終成果物',
      verification: '最終確認',
      troubleshooting: '典型的な失敗と切り分け',
      symptom: '症状',
      isolation: '切り分け',
      security: 'セキュリティ上の注意',
      cost: 'コスト上の注意',
      cleanup: '後片付け',
      reflection: '振り返り質問',
      relatedCards: '関連カードを開く',
      relatedQuestions: '関連設問を開く',
      officialSources: '公式資料',
      start: 'このガイドを開始',
      complete: '完了として記録',
      reconfirm: '更新内容を再確認して再開',
      completeHint: 'すべてのステップを完了すると記録できます。',
      staleNote: '内容が更新されています。再確認して再開すると、変更されたステップを確認できます（過去の完了日時は保持されず、進行中として再開します）。',
      futureNote: 'この端末には、この版より新しい記録があります。ここでは変更しません。新しい版で開いてください。',
      actionDone: {
        start: 'ガイドを開始として記録しました。',
        complete: 'ガイドを完了として記録しました。',
        reconfirm: '更新内容を再確認し、進行中として再開しました。',
        step: (completed, total) => `ステップを完了として記録しました（${completed}/${total}）。`,
        unstep: (completed, total) => `ステップの完了を取り消しました（${completed}/${total}）。`,
      },
    },
    practice: {
      eyebrow: 'INDEPENDENT RETRIEVAL PRACTICE',
      title: '練習カード',
      introduction: '実試験の再現ではありません。まず自分の言葉で答えてから開いてください。',
      searchLabel: 'カードを検索',
      searchPlaceholder: '例：MCP、スキーマ、フック',
      stateLegend: '状態',
      domainLegend: '領域',
      filters: { due: '復習対象', all: 'すべて', unseen: '未着手', reviewed: '着手済み', weak: '苦手' },
      allDomains: 'すべて',
      resultCount: (count) => `${count}枚を表示`,
      kinds: { recall: '想起', contrast: '比較', scenario: '場面' },
      question: 'QUESTION',
      revealAnswer: '答えを見る',
      hideAnswer: '答えを隠す',
      answer: 'ANSWER',
      pitfall: '混同注意',
      officialSources: '公式資料',
      verified: (date) => `最終確認 ${date}`,
      ratingLegend: '今の思い出しやすさは？',
      ratingAgain: 'もう一度',
      ratingAgainDelay: '10分後',
      ratingHard: '難しい',
      ratingHardDelay: '明日',
      ratingGood: 'できた',
      ratingGoodDelay: '3日後',
      ratingGoodExtended: '間隔を延長',
      emptyTitle: '該当するカードはありません。',
      emptyDescription: '検索語またはフィルターを変えてください。',
      targetAnnouncement: (prompt) => `関連カードを開きました：${prompt}`,
      showAll: 'カード一覧に戻る',
    },
    session: {
      start: 'セッションを開始',
      cannotStart: '表示中のカードが0枚のため、セッションを開始できません。検索語やフィルターを変えてください。',
      progress: (current, total) => `${current} / ${total}`,
      remaining: (count) => `残り${count}枚`,
      cardAnnouncement: (current, total) => `カード${current} / ${total}を表示中`,
      revealAnnouncement: '答えを表示しました。',
      shortcutsReveal: 'Space / Enter：答えを見る',
      shortcutsRate: '1：もう一度 · 2：難しい · 3：できた',
      shortcutsQuit: 'Esc：中断',
      quit: 'セッションを中断',
      abortConfirm: 'セッションを中断しますか？ここまでの評価は保存されています。',
      abortedNotice: 'セッションを中断しました。ここまでの評価は保存済みです。',
      summaryEyebrow: 'SESSION RESULT',
      summaryTitle: 'セッション完了',
      breakdownLegend: '評価の内訳',
      ratedCount: (count) => `${count}枚を評価`,
      dueRemaining: (count) => `残りの復習対象：${count}枚`,
      restart: 'もう一度セッション',
      backToList: '一覧に戻る',
    },
    quiz: {
      eyebrow: 'INDEPENDENT CHOICE PRACTICE',
      title: '選択式演習',
      introduction: '本試験の再現ではありません。独自作成の選択問題で、単一選択・複数選択の解答形式に慣れるための演習です。',
      modeLegend: '演習モード',
      modeRandom: 'ランダム演習',
      modeScenario: 'シナリオ演習',
      scenarioIntroduction: 'ケース記述を読んでから設問群に答える形式に慣れる演習です。シナリオと設問はすべて公開資料に基づく独自作成で、本試験のシナリオの再現ではありません。',
      scenarioListLabel: 'シナリオ一覧',
      scenarioQuestionCount: (count) => `設問${count}問`,
      scenarioAnswered: (answered, total) => `解答済み ${answered}/${total}`,
      backgroundTitle: 'ケース記述',
      proceedToQuestions: '設問へ進む',
      backgroundToggle: 'ケース記述を開く',
      countLegend: '出題数',
      count10: '10問',
      count20: '20問',
      countAll: '全問',
      domainLegend: '領域',
      weightedDomains: '全領域（重み加重）',
      start: '演習を始める',
      progressLabel: (current, total) => `第${current}問 / 全${total}問`,
      formats: { single: '単一選択', multiple: '複数選択' },
      singleHint: '正しい選択肢を1つ選んでください。選ぶと同時に回答になります。',
      multipleHint: '複数選択：当てはまる選択肢をすべて選び、「回答する」を押してください。',
      choicesLegend: '選択肢',
      submitAnswer: '回答する',
      resultCorrect: '正解！',
      resultIncorrect: '不正解',
      correctAnswerLabel: '正解：',
      correctBadge: '正解',
      selectedBadge: '選択',
      officialSources: '公式資料',
      verified: (date) => `最終確認 ${date}`,
      next: '次の問題へ',
      showResults: '結果を見る',
      quit: '設定に戻る',
      summaryEyebrow: 'QUIZ RESULT',
      summaryTitle: '演習結果',
      accuracy: '正答率',
      scoreLine: (correct, total) => `${total}問中${correct}問正解`,
      byDomain: '領域別の内訳',
      wrongTitle: '間違えた問題',
      noWrong: '全問正解でした。',
      retry: 'もう一度演習する',
    },
    progress: {
      eyebrow: 'STUDY DATA: LOCAL ONLY',
      title: '進捗と資料',
      introduction: '学習データはこのブラウザのlocalStorageだけに保存され、サーバーへ送信されません。',
      byDomain: '領域別の着手',
      localData: 'ローカルデータ',
      localDataDescription: '端末間の同期はありません。ブラウザデータを消す前にJSONを書き出してください。',
      analyticsDisclosure: 'Google Analyticsで基本的なページ閲覧情報を収集します。学習カード、検索語、評価、進捗データは独自イベントとして送信しません。',
      details: '詳細を見る',
      exportJson: '進捗をJSONで書き出す',
      importJson: '進捗をJSONから読み込む',
      reset: 'この端末の進捗を削除',
      weakCount: (count) => `苦手 ${count}`,
      sourcesEyebrow: 'SOURCE REGISTER',
      sourcesTitle: '公式資料',
      sourcesDescription: '説明は公開資料の要約です。仕様変更に備え、学習時はリンク先の最新版も確認してください。',
      verified: (date) => `最終確認 ${date}`,
      disclaimerTitle: '非公式・Anthropicとは提携していません',
      disclaimerBody: '本サイトは個人の学習用ノートです。Anthropicによる承認・後援・提携を示すものではありません。練習カードは公開資料から独自に作成したもので、実試験問題、受験者が記憶した問題、非公開教材、漏えい資料を収録・募集しません。',
      blueprintVerified: (date) => `出題範囲の最終確認：${date}。`,
      reportIssueLead: '誤りやリンク切れは',
      reportIssueLink: 'GitHub Issues',
    },
    footer: { analytics: 'アクセス解析について', github: 'GitHub' },
  },
  en: {
    brand: {
      mark: 'CCA',
      fieldNotes: 'FIELD NOTES',
      edition: 'FOUNDATIONS / CCAR-F\nJULY 2026 EDITION',
      unofficial: 'UNOFFICIAL',
      affiliationShort: 'NOT AFFILIATED\nWITH ANTHROPIC',
      footer: 'CCA Field Notes · Unofficial study notes',
    },
    aria: {
      mainNavigation: 'Main navigation',
      siteInformation: 'Site information',
      languageNavigation: 'Display language',
      opensNewTab: ' (opens in a new tab)',
    },
    languageNames: { ja: '日本語', en: 'English' },
    views: { today: 'Today', guide: 'Guide', practice: 'Practice', quiz: 'Quiz', progress: 'Progress', 'hands-on': 'Hands-on' },
    pageTitle: 'CCA Field Notes — Unofficial Claude Certified Architect study guide',
    notices: {
      saveFailed: 'Your progress could not be saved. Check this browser’s site-data settings or available storage.',
      ratingAgain: 'This card will appear again in 10 minutes.',
      ratingHard: 'This card will appear again tomorrow.',
      ratingGood: 'Got it: the next review date has been updated.',
      exported: 'Your progress was exported as JSON.',
      importConfirm: (count, exportedAt) => `Overwrite the progress on this device with ${exportedAt ? `the progress exported on ${exportedAt}` : 'the imported progress'} (${count} reviewed ${count === 1 ? 'card' : 'cards'})?`,
      importInvalid: 'The file could not be read as progress data. Choose a JSON file exported from this app.',
      importDone: 'Progress was imported from JSON.',
      resetConfirm: 'Delete all study progress on this device? This cannot be undone.',
      resetFailed: 'Your progress could not be deleted. Check this browser’s site-data settings.',
      resetDone: 'Progress on this device was deleted.',
    },
    today: {
      eyebrow: 'TODAY',
      titleLead: 'Recall first.',
      titleEmphasis: 'Then reveal.',
      introduction: 'The public exam scope, recast as short retrieval practice. Every card is independently written.',
      dueTitle: 'Due today',
      dueCount: (count) => `${count === 1 ? 'card' : 'cards'} due`,
      startReview: 'Start review',
    },
    blueprint: {
      eyebrow: 'EXAM BLUEPRINT',
      title: 'Map of the five domains',
      progressNote: 'The band in each node shows cards started',
      started: (percent) => `${percent}% started`,
    },
    weakAreas: {
      eyebrow: 'WEAK AREAS',
      title: 'Struggling areas',
      note: 'Counts cards rated Again or Hard, or lapsed twice or more',
      cardCount: (count) => `${count} ${count === 1 ? 'card' : 'cards'}`,
      emptyBeforeStartTitle: 'Nothing recorded yet.',
      emptyBeforeStartDescription: 'Rate cards in practice and the domains you struggle with will appear here.',
      emptyAllClearTitle: 'No struggling cards.',
      emptyAllClearDescription: 'Nice work — keep reviewing at this pace.',
    },
    status: {
      eyebrow: 'LOCAL PROGRESS',
      title: 'Progress on this device',
      started: 'Started',
      notStarted: 'Not started',
      coverage: 'Coverage',
      objectives: (count) => `${count} objectives`,
    },
    guide: {
      eyebrow: 'PUBLIC BLUEPRINT / 30 OBJECTIVES',
      title: 'Study guide',
      introduction: 'Independent summaries of the 30 task areas in the official Exam Guide v1.0, grounded in public documentation. Refer to the official guide for the source wording.',
      openExamGuide: 'Open the official Exam Guide',
      weight: 'WEIGHT',
      mustKnow: 'What to remember',
      officialSources: 'Official sources',
      verified: (date) => `Last verified ${date}`,
      loading: 'Loading the study guide.',
      loadError: 'The study guide could not be loaded. Try again.',
      retry: 'Reload page',
      progress: (completed, total) => `${completed} of ${total} sections complete at the current revision`,
      status: { not_started: 'Not started', in_progress: 'In progress', completed: 'Completed', stale: 'Review updates required', future: 'Recorded by a newer version' },
      actionDone: { start: 'Section start recorded.', complete: 'Section completion recorded.', reconfirm: 'Updated content review recorded.' },
      start: 'Start this section', complete: 'Mark complete', reconfirm: 'I reviewed the updates',
      futureNote: (status) => `Your earlier record is “${status}.” It is newer than this guide, so it is not changed here. Open a newer app version.`,
      staleNote: (status) => `Your earlier record is retained as “${status}.” You can record a review after checking the updated content.`,
      domains: 'Domains covered', statements: 'Task statements covered', keyPoints: 'Design checks',
      relatedCards: 'Open related cards', relatedQuestions: 'Open related questions',
      diagnosisLegend: 'Choose where to begin', diagnosisQuestion: 'Choose the one learning need that matters most right now.',
      diagnosisOptions: ['I want to start with agent loops and delegation', 'I need to organize tool contracts and MCP boundaries', 'I need to organize escalation, human review, and provenance'],
      diagnosisSubmit: 'Recommend a starting section', diagnosisResult: (title) => `Start with “${title}.” This suggestion is not saved on this device.`,
      serviceTitle: 'What this service provides — and does not',
      serviceBody: 'It provides independently written guides, cards, and choice practice grounded in public sources. It is unofficial, uses no live exam questions or exam dumps, and offers no pass guarantee. Gain real Claude Code, API, MCP, and CI experience separately in your own environment.',
      pathTitle: 'Eight-stage learning path (independent study guidance)',
      path: [{ label: 'Initial orientation', available: true }, { label: 'D1/D2/D5 foundations', available: true }, { label: 'D3/D4 implementation and operations', available: true }, { label: 'Hands-on work', available: true, target: 'hands-on' }, { label: 'Scenario judgment', available: true }, { label: 'Mock exam', available: false }, { label: 'Incorrect-answer repair', available: false }, { label: 'Final check', available: false }],
      availabilityNow: 'Available now: Guide, Hands-on, Practice, and Quiz', availabilityLater: 'Detailed tooling for this stage is a future study-plan step. Do real-environment work outside this service.',
      calendarTitle: 'How to use the time through the end of August', calendarBody: 'Use the remaining time in cycles: map the scope in the guide, retrieve it with cards, then articulate decisions in choice practice. If time gets tight, prioritize unfinished sections; this plan does not assume fixed days or predict an outcome.',
    },
    handsOn: {
      eyebrow: 'HANDS-ON / BUILD IN YOUR OWN ENVIRONMENT',
      title: 'Hands-on',
      introduction: 'Reproducible guides for designing, building, and verifying real systems on the exam scope in your own environment. The app runs no runtime in the browser. The order of work is the recommended sequence; the technical facts are grounded in official sources.',
      entryTitle: 'Build real systems with hands-on guides',
      entryBody: 'Each guide states what to build, why, in what order, what counts as success, where it typically fails, and which permission, cost, and security cautions apply. Progress is saved on this device.',
      openList: 'Go to the hands-on list',
      loading: 'Loading the hands-on guides.',
      loadError: 'The hands-on guides could not be loaded. Try again.',
      retry: 'Reload page',
      listProgress: (completed, total) => `${completed} of ${total} complete at the current revision`,
      minutes: (count) => `about ${count} min`,
      stepCount: (completed, total) => `${completed} of ${total} steps complete`,
      status: { not_started: 'Not started', in_progress: 'In progress', completed: 'Completed', stale: 'Review updates required', future: 'Recorded by a newer version' },
      open: 'Open guide',
      backToList: 'Back to the hands-on list',
      domains: 'Domains covered',
      scenarios: 'Official scenarios',
      skills: 'Skills',
      taskStatements: 'Task statements covered',
      estimatedTime: 'Estimated time',
      objectives: 'Learning objectives',
      prerequisites: 'Prerequisites',
      environment: 'Environment required',
      setup: 'Setup',
      stepsLegend: 'Implementation steps (check off what you finish)',
      expectedResult: 'Expected result and how to verify',
      deliverables: 'Deliverables',
      verification: 'Final verification',
      troubleshooting: 'Typical failures and how to isolate them',
      symptom: 'Symptom',
      isolation: 'Isolation',
      security: 'Security notes',
      cost: 'Cost notes',
      cleanup: 'Cleanup',
      reflection: 'Reflection questions',
      relatedCards: 'Open related cards',
      relatedQuestions: 'Open related questions',
      officialSources: 'Official sources',
      start: 'Start this guide',
      complete: 'Mark complete',
      reconfirm: 'Review updates and resume',
      completeHint: 'You can record completion once every step is done.',
      staleNote: 'This guide has been updated. Reviewing and resuming lets you re-check the changed steps (the earlier completion time is not kept; it resumes as in progress).',
      futureNote: 'This device has a record from a newer version. It is not changed here. Open a newer app version.',
      actionDone: {
        start: 'Guide start recorded.',
        complete: 'Guide completion recorded.',
        reconfirm: 'Updates reviewed; resumed as in progress.',
        step: (completed, total) => `Step marked complete (${completed}/${total}).`,
        unstep: (completed, total) => `Step completion cleared (${completed}/${total}).`,
      },
    },
    practice: {
      eyebrow: 'INDEPENDENT RETRIEVAL PRACTICE',
      title: 'Practice cards',
      introduction: 'These cards do not reproduce the actual exam. Answer in your own words before revealing the response.',
      searchLabel: 'Search cards',
      searchPlaceholder: 'Try: MCP, schema, hooks',
      stateLegend: 'Status',
      domainLegend: 'Domain',
      filters: { due: 'Due', all: 'All', unseen: 'Not started', reviewed: 'Started', weak: 'Struggling' },
      allDomains: 'All',
      resultCount: (count) => `Showing ${count} ${count === 1 ? 'card' : 'cards'}`,
      kinds: { recall: 'Recall', contrast: 'Contrast', scenario: 'Scenario' },
      question: 'QUESTION',
      revealAnswer: 'Reveal answer',
      hideAnswer: 'Hide answer',
      answer: 'ANSWER',
      pitfall: 'Do not confuse',
      officialSources: 'Official sources',
      verified: (date) => `Last verified ${date}`,
      ratingLegend: 'How easy was that to recall?',
      ratingAgain: 'Again',
      ratingAgainDelay: 'In 10 minutes',
      ratingHard: 'Hard',
      ratingHardDelay: 'Tomorrow',
      ratingGood: 'Got it',
      ratingGoodDelay: 'In 3 days',
      ratingGoodExtended: 'Extend interval',
      emptyTitle: 'No cards match.',
      emptyDescription: 'Try a different search term or filter.',
      targetAnnouncement: (prompt) => `Opened related card: ${prompt}`,
      showAll: 'Back to all cards',
    },
    session: {
      start: 'Start a session',
      cannotStart: 'No cards are shown, so a session cannot start. Change the search term or filters.',
      progress: (current, total) => `${current} / ${total}`,
      remaining: (count) => `${count} ${count === 1 ? 'card' : 'cards'} left`,
      cardAnnouncement: (current, total) => `Showing card ${current} of ${total}`,
      revealAnnouncement: 'Answer revealed.',
      shortcutsReveal: 'Space / Enter: reveal',
      shortcutsRate: '1: Again · 2: Hard · 3: Got it',
      shortcutsQuit: 'Esc: stop',
      quit: 'Stop the session',
      abortConfirm: 'Stop this session? Ratings so far are already saved.',
      abortedNotice: 'Session stopped. Ratings up to this point are saved.',
      summaryEyebrow: 'SESSION RESULT',
      summaryTitle: 'Session complete',
      breakdownLegend: 'Rating breakdown',
      ratedCount: (count) => `${count} ${count === 1 ? 'card' : 'cards'} rated`,
      dueRemaining: (count) => `${count} ${count === 1 ? 'card' : 'cards'} still due`,
      restart: 'Run the session again',
      backToList: 'Back to the list',
    },
    quiz: {
      eyebrow: 'INDEPENDENT CHOICE PRACTICE',
      title: 'Choice quiz',
      introduction: 'This quiz does not reproduce the actual exam. It uses independently written questions to practice the single- and multiple-select answer formats.',
      modeLegend: 'Mode',
      modeRandom: 'Random quiz',
      modeScenario: 'Scenario practice',
      scenarioIntroduction: 'Practice reading a case description before answering its question set. Every scenario and question is independently written from public sources; nothing reproduces the live exam scenarios.',
      scenarioListLabel: 'Scenario list',
      scenarioQuestionCount: (count) => `${count} ${count === 1 ? 'question' : 'questions'}`,
      scenarioAnswered: (answered, total) => `Answered ${answered}/${total}`,
      backgroundTitle: 'Case background',
      proceedToQuestions: 'Start the questions',
      backgroundToggle: 'Show the case background',
      countLegend: 'Questions',
      count10: '10 questions',
      count20: '20 questions',
      countAll: 'All questions',
      domainLegend: 'Domain',
      weightedDomains: 'All domains (weighted)',
      start: 'Start quiz',
      progressLabel: (current, total) => `Question ${current} of ${total}`,
      formats: { single: 'Single select', multiple: 'Multiple select' },
      singleHint: 'Choose the one correct option. Selecting it submits your answer.',
      multipleHint: 'Multiple select: choose every option that applies, then press “Submit answer”.',
      choicesLegend: 'Options',
      submitAnswer: 'Submit answer',
      resultCorrect: 'Correct!',
      resultIncorrect: 'Incorrect',
      correctAnswerLabel: 'Correct answer:',
      correctBadge: 'Correct',
      selectedBadge: 'Your pick',
      officialSources: 'Official sources',
      verified: (date) => `Last verified ${date}`,
      next: 'Next question',
      showResults: 'See results',
      quit: 'Back to setup',
      summaryEyebrow: 'QUIZ RESULT',
      summaryTitle: 'Quiz results',
      accuracy: 'Accuracy',
      scoreLine: (correct, total) => `${correct} of ${total} correct`,
      byDomain: 'Breakdown by domain',
      wrongTitle: 'Missed questions',
      noWrong: 'You answered every question correctly.',
      retry: 'Run another quiz',
    },
    progress: {
      eyebrow: 'STUDY DATA: LOCAL ONLY',
      title: 'Progress and sources',
      introduction: 'Study data is stored only in this browser’s localStorage and is never sent to a server.',
      byDomain: 'Started by domain',
      localData: 'Local data',
      localDataDescription: 'Progress does not sync across devices. Export the JSON before clearing browser data.',
      analyticsDisclosure: 'Google Analytics collects basic page-view information. Study cards, search terms, ratings, and progress are not sent as custom events.',
      details: 'View details',
      exportJson: 'Export progress as JSON',
      importJson: 'Import progress from JSON',
      reset: 'Delete progress on this device',
      weakCount: (count) => `${count} struggling`,
      sourcesEyebrow: 'SOURCE REGISTER',
      sourcesTitle: 'Official sources',
      sourcesDescription: 'Explanations summarize public sources. Check the latest linked documentation as you study in case specifications have changed.',
      verified: (date) => `Last verified ${date}`,
      disclaimerTitle: 'Unofficial and not affiliated with Anthropic',
      disclaimerBody: 'This site is a personal study notebook. It is not approved, sponsored, or affiliated with Anthropic. Practice cards are independently written from public sources; the site neither includes nor solicits actual exam questions, questions recalled by candidates, private course materials, or leaked content.',
      blueprintVerified: (date) => `Exam scope last verified ${date}.`,
      reportIssueLead: 'Report errors or broken links in',
      reportIssueLink: 'GitHub Issues',
    },
    footer: { analytics: 'Analytics information', github: 'GitHub' },
  },
} satisfies Record<Locale, UiCopy>;
