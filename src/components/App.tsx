import { useEffect, useMemo, useRef, useState, type MutableRef } from 'preact/hooks';
import { cards } from '../content/cards';
import { domains } from '../content/domains';
import { questions, standaloneQuestions } from '../content/questions';
import { scenarios } from '../content/scenarios';
import { sourceById, sources, VERIFIED_AT } from '../content/sources';
import type { Card, ChoiceQuestion, Scenario } from '../content/types';
import { locales, localePaths, type Locale } from '../i18n/locales';
import { localize, ui, type UiCopy } from '../i18n/ui';
import { isAnswerCorrect, pickQuizQuestions, type QuizCount, type QuizDomainChoice } from '../lib/quiz';
import { isDue, scheduleReview, type Rating, type ReviewState } from '../lib/scheduler';
import { emptyTally, rateSessionCard, type SessionTally } from '../lib/session';
import { buildStudyDataExport, createStudyStorage, parseStudyDataImport, type ImportedStudyData, type QuizStat, type StudyData } from '../lib/storage';
import { isWeak } from '../lib/weakness';

type View = 'today' | 'guide' | 'practice' | 'quiz' | 'progress';

const viewKeys: View[] = ['today', 'guide', 'practice', 'quiz', 'progress'];
const stateFilters = ['due', 'all', 'unseen', 'reviewed', 'weak'] as const;
const icons: Record<View, string> = { today: '⌂', guide: '▤', practice: '◇', quiz: '☑', progress: '✓' };

function studyStorage() {
  try {
    return createStudyStorage(window.localStorage);
  } catch {
    return createStudyStorage(undefined);
  }
}

function dateLocale(locale: Locale) {
  return locale === 'ja' ? 'ja-JP' : 'en-US';
}

function formatDate(value: Date | string, locale: Locale) {
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00`) : value;
  return new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: 'long' }).format(date);
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(dateLocale(locale)).format(value);
}

function LanguageNav({ locale, copy, modifier }: { locale: Locale; copy: UiCopy; modifier?: string }) {
  return (
    <nav class={`language-switcher${modifier ? ` language-switcher--${modifier}` : ''}`} aria-label={copy.aria.languageNavigation}>
      {locales.map((option) => (
        <a
          key={option}
          href={localePaths[option].app}
          lang={option}
          hrefLang={option}
          aria-current={locale === option ? 'page' : undefined}
        >
          {copy.languageNames[option]}
        </a>
      ))}
    </nav>
  );
}

function SourceLinks({ ids, copy }: { ids: string[]; copy: UiCopy }) {
  return (
    <ul class="source-links">
      {ids.map((id) => {
        const source = sourceById.get(id);
        return source ? (
          <li key={id}>
            <a href={source.url} target="_blank" rel="noreferrer">
              <span lang="en">{source.title}</span><span class="sr-only">{copy.aria.opensNewTab}</span><span aria-hidden="true"> ↗</span>
            </a>
          </li>
        ) : null;
      })}
    </ul>
  );
}

type QuizResult = { question: ChoiceQuestion; selectedIds: string[]; correct: boolean };
type QuizMode = 'random' | 'scenario';

const questionsByScenario = new Map(
  scenarios.map((scenario) => [scenario.id, questions.filter((question) => question.scenarioId === scenario.id)]),
);

function ScenarioBackground({ scenario, locale }: { scenario: Scenario; locale: Locale }) {
  return <>{localize(scenario.background, locale).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</>;
}

function QuizView({ locale, copy, quizStats, onAnswer }: { locale: Locale; copy: UiCopy; quizStats?: Record<string, QuizStat>; onAnswer: (questionId: string, correct: boolean) => void }) {
  const [phase, setPhase] = useState<'setup' | 'background' | 'question' | 'summary'>('setup');
  const [mode, setMode] = useState<QuizMode>('random');
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [count, setCount] = useState<QuizCount>(10);
  const [domainChoice, setDomainChoice] = useState<QuizDomainChoice>('weighted');
  const [round, setRound] = useState<ChoiceQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const feedbackRef = useRef<HTMLDivElement>(null);
  // Synchronous re-entrancy guard: `answered` only flips on the next render,
  // so a double-fired click could otherwise record the same question twice.
  const answeredIdRef = useRef<string | null>(null);

  const current = phase === 'question' ? round[index] : undefined;
  const lastResult = results[results.length - 1];
  const currentResult = current && lastResult?.question.id === current.id ? lastResult : undefined;
  const answered = Boolean(currentResult);
  const countOptions: Array<{ value: QuizCount; label: string }> = [
    { value: 10, label: copy.quiz.count10 },
    { value: 20, label: copy.quiz.count20 },
    { value: 'all', label: copy.quiz.countAll },
  ];

  const launch = (picked: ChoiceQuestion[]) => {
    if (!picked.length) return;
    answeredIdRef.current = null;
    setRound(picked);
    setIndex(0);
    setSelected([]);
    setResults([]);
    setPhase('question');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const start = () => {
    launch(pickQuizQuestions(standaloneQuestions, domains, count, domainChoice));
  };

  const openScenario = (next: Scenario) => {
    setScenario(next);
    setPhase('background');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const answer = (question: ChoiceQuestion, selectedIds: string[]) => {
    if (answeredIdRef.current === question.id) return;
    answeredIdRef.current = question.id;
    const correct = isAnswerCorrect(question, selectedIds);
    setResults((value) => [...value, { question, selectedIds, correct }]);
    onAnswer(question.id, correct);
    requestAnimationFrame(() => feedbackRef.current?.focus());
  };

  const advance = () => {
    if (index + 1 >= round.length) {
      setPhase('summary');
    } else {
      setIndex(index + 1);
      setSelected([]);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reset = () => {
    setPhase('setup');
    setScenario(null);
    setRound([]);
    setResults([]);
    setSelected([]);
  };

  const correctCount = results.filter((result) => result.correct).length;
  const wrongResults = results.filter((result) => !result.correct);
  const answerText = (question: ChoiceQuestion) =>
    question.choices.filter((choice) => question.correctChoiceIds.includes(choice.id)).map((choice) => localize(choice.text, locale)).join(' / ');
  const domainBadges = (domainIds: string[]) =>
    domains.filter((domain) => domainIds.includes(domain.id)).map((domain) => <span key={domain.id} class="card-domain">D{domain.number}</span>);

  return (
    <section class="quiz-view" aria-labelledby="quiz-title">
      <header class="page-header compact">
        <p class="eyebrow">{copy.quiz.eyebrow}</p><h2 id="quiz-title">{copy.quiz.title}</h2><p>{copy.quiz.introduction}</p>
      </header>

      {phase === 'setup' && <div class="quiz-setup">
        <fieldset><legend>{copy.quiz.modeLegend}</legend><div class="chips">
          <button type="button" class={mode === 'random' ? 'selected' : ''} aria-pressed={mode === 'random'} onClick={() => setMode('random')}>{copy.quiz.modeRandom}</button>
          <button type="button" class={mode === 'scenario' ? 'selected' : ''} aria-pressed={mode === 'scenario'} onClick={() => setMode('scenario')}>{copy.quiz.modeScenario}</button>
        </div></fieldset>
        {mode === 'random' && <>
          <fieldset><legend>{copy.quiz.countLegend}</legend><div class="chips">{countOptions.map((option) => <button key={String(option.value)} type="button" class={count === option.value ? 'selected' : ''} aria-pressed={count === option.value} onClick={() => setCount(option.value)}>{option.label}</button>)}</div></fieldset>
          <fieldset><legend>{copy.quiz.domainLegend}</legend><div class="chips"><button type="button" class={domainChoice === 'weighted' ? 'selected' : ''} aria-pressed={domainChoice === 'weighted'} onClick={() => setDomainChoice('weighted')}>{copy.quiz.weightedDomains}</button>{domains.map((domain) => <button key={domain.id} type="button" class={domainChoice === domain.id ? 'selected' : ''} aria-pressed={domainChoice === domain.id} onClick={() => setDomainChoice(domain.id)}>D{domain.number}</button>)}</div></fieldset>
          <button class="quiz-start" onClick={start}>{copy.quiz.start} <span aria-hidden="true">→</span></button>
        </>}
        {mode === 'scenario' && <>
          <p class="scenario-note">{copy.quiz.scenarioIntroduction}</p>
          <ul class="scenario-list" aria-label={copy.quiz.scenarioListLabel}>{scenarios.map((entry) => {
            const linked = questionsByScenario.get(entry.id) ?? [];
            const answeredCount = linked.filter((question) => quizStats?.[question.id]).length;
            return <li key={entry.id}>
              <button type="button" class="scenario-item" onClick={() => openScenario(entry)}>
                <strong>{localize(entry.title, locale)}</strong>
                <span class="scenario-item-meta">
                  {domainBadges(entry.domainIds)}
                  <span>{copy.quiz.scenarioQuestionCount(linked.length)}</span>
                  <span>{copy.quiz.scenarioAnswered(answeredCount, linked.length)}</span>
                  <span aria-hidden="true">→</span>
                </span>
              </button>
            </li>;
          })}</ul>
        </>}
      </div>}

      {phase === 'background' && scenario && <article class="scenario-brief">
        <p class="eyebrow">{copy.quiz.backgroundTitle}</p>
        <h3>{localize(scenario.title, locale)}</h3>
        <div class="scenario-item-meta">{domainBadges(scenario.domainIds)}<span>{copy.quiz.scenarioQuestionCount((questionsByScenario.get(scenario.id) ?? []).length)}</span></div>
        <ScenarioBackground scenario={scenario} locale={locale}/>
        <button class="quiz-start" onClick={() => launch(questionsByScenario.get(scenario.id) ?? [])}>{copy.quiz.proceedToQuestions} <span aria-hidden="true">→</span></button>
        <button class="quiz-quit" onClick={reset}>{copy.quiz.quit}</button>
      </article>}

      {current && <article class="quiz-question">
        <header>
          <div><span class="card-domain">D{domains.find((domain) => domain.id === current.domainId)!.number}</span><span>{copy.quiz.formats[current.format]}</span></div>
          <code>{copy.quiz.progressLabel(index + 1, round.length)}</code>
        </header>
        {scenario && <details class="scenario-context">
          <summary>{copy.quiz.backgroundToggle}</summary>
          <div><ScenarioBackground scenario={scenario} locale={locale}/></div>
        </details>}
        <div class="card-prompt"><p class="eyebrow">{copy.practice.question}</p><h3>{localize(current.stem, locale)}</h3></div>
        <p class="quiz-hint">{current.format === 'single' ? copy.quiz.singleHint : copy.quiz.multipleHint}</p>
        <fieldset class="choice-list">
          <legend class="sr-only">{copy.quiz.choicesLegend}</legend>
          {current.choices.map((choice) => {
            const isCorrectChoice = current.correctChoiceIds.includes(choice.id);
            const wasSelected = Boolean(currentResult?.selectedIds.includes(choice.id));
            const isSelected = !answered && selected.includes(choice.id);
            const state = answered ? (isCorrectChoice ? ' correct' : wasSelected ? ' incorrect' : '') : isSelected ? ' selected' : '';
            return <button
              key={choice.id}
              type="button"
              class={`choice-button${state}`}
              disabled={answered}
              aria-pressed={current.format === 'multiple' && !answered ? isSelected : undefined}
              onClick={() => {
                if (answered) return;
                if (current.format === 'single') answer(current, [choice.id]);
                else setSelected((value) => (value.includes(choice.id) ? value.filter((id) => id !== choice.id) : [...value, choice.id]));
              }}
            >
              <span class="choice-id" aria-hidden="true">{choice.id.toUpperCase()}</span>
              <span class="choice-text">{localize(choice.text, locale)}</span>
              {answered && isCorrectChoice && <span class="choice-mark choice-mark--correct">{copy.quiz.correctBadge}</span>}
              {wasSelected && <span class="choice-mark">{copy.quiz.selectedBadge}</span>}
            </button>;
          })}
        </fieldset>
        {current.format === 'multiple' && !answered && <button class="quiz-submit" disabled={!selected.length} onClick={() => answer(current, selected)}>{copy.quiz.submitAnswer}</button>}
        {currentResult && <div class="quiz-feedback" role="status" tabIndex={-1} ref={feedbackRef}>
          <p class={`quiz-verdict ${currentResult.correct ? 'is-correct' : 'is-incorrect'}`}>{currentResult.correct ? copy.quiz.resultCorrect : copy.quiz.resultIncorrect}</p>
          <p class="quiz-correct-answer"><strong>{copy.quiz.correctAnswerLabel}</strong> {answerText(current)}</p>
          <p>{localize(current.explanation, locale)}</p>
          <div class="card-sources"><strong>{copy.quiz.officialSources}</strong><SourceLinks ids={current.sourceIds} copy={copy}/><small>{copy.quiz.verified(formatDate(current.verifiedAt, locale))}</small></div>
          <button class="quiz-next" onClick={advance}>{index + 1 >= round.length ? copy.quiz.showResults : copy.quiz.next} <span aria-hidden="true">→</span></button>
        </div>}
        <button class="quiz-quit" onClick={reset}>{copy.quiz.quit}</button>
      </article>}

      {phase === 'summary' && <div class="quiz-summary">
        <section class="quiz-score" aria-labelledby="quiz-score-title">
          <p class="eyebrow" id="quiz-score-title">{copy.quiz.summaryEyebrow}</p>
          <h3>{copy.quiz.summaryTitle}</h3>
          <div class="quiz-score-figure">
            <span>{copy.quiz.accuracy}</span>
            <strong>{results.length ? Math.round((correctCount / results.length) * 100) : 0}%</strong>
            <span>{copy.quiz.scoreLine(correctCount, results.length)}</span>
          </div>
        </section>
        <section class="quiz-domains" aria-labelledby="quiz-domains-title">
          <h3 id="quiz-domains-title">{copy.quiz.byDomain}</h3>
          {domains.map((domain) => {
            const domainResults = results.filter((result) => result.question.domainId === domain.id);
            if (!domainResults.length) return null;
            const domainCorrect = domainResults.filter((result) => result.correct).length;
            return <div class="progress-row" key={domain.id}>
              <span>D{domain.number} {localize(domain.title, locale)}</span>
              <progress value={domainCorrect} max={domainResults.length}>{domainCorrect}/{domainResults.length}</progress>
              <strong>{formatNumber(domainCorrect, locale)}/{formatNumber(domainResults.length, locale)}</strong>
            </div>;
          })}
        </section>
        <section class="quiz-missed" aria-labelledby="quiz-missed-title">
          <h3 id="quiz-missed-title">{copy.quiz.wrongTitle}</h3>
          {wrongResults.length
            ? <ul>{wrongResults.map((result) => <li key={result.question.id}><p>{localize(result.question.stem, locale)}</p><p><strong>{copy.quiz.correctAnswerLabel}</strong> {answerText(result.question)}</p><p>{localize(result.question.explanation, locale)}</p></li>)}</ul>
            : <p>{copy.quiz.noWrong}</p>}
        </section>
        <button class="quiz-start" onClick={reset}>{copy.quiz.retry}</button>
      </div>}
    </section>
  );
}

function CardAnswer({ card, review, locale, copy, id, onRate, answerRef }: {
  card: Card;
  review: ReviewState | undefined;
  locale: Locale;
  copy: UiCopy;
  id: string;
  onRate: (rating: Rating) => void;
  answerRef?: MutableRef<HTMLDivElement | null>;
}) {
  return (
    <div class="answer" id={id} ref={answerRef} tabIndex={answerRef ? -1 : undefined}>
      <p class="eyebrow">{copy.practice.answer}</p><p class="answer-lead">{localize(card.answer, locale)}</p><p>{localize(card.explanation, locale)}</p>
      <div class="pitfall"><strong>{copy.practice.pitfall}</strong><p>{localize(card.pitfall, locale)}</p></div>
      <div class="card-sources"><strong>{copy.practice.officialSources}</strong><SourceLinks ids={card.sourceIds} copy={copy}/><small>{copy.practice.verified(formatDate(card.verifiedAt, locale))}</small></div>
      <fieldset class="rating"><legend>{copy.practice.ratingLegend}</legend><button onClick={() => onRate('again')}>{copy.practice.ratingAgain}<small>{copy.practice.ratingAgainDelay}</small></button><button onClick={() => onRate('hard')}>{copy.practice.ratingHard}<small>{copy.practice.ratingHardDelay}</small></button><button onClick={() => onRate('good')}>{copy.practice.ratingGood}<small>{review?.lastRating === 'good' ? copy.practice.ratingGoodExtended : copy.practice.ratingGoodDelay}</small></button></fieldset>
    </div>
  );
}

function PracticeSession({ locale, copy, initialCards, reviews, dueCount, onRate, onExit }: {
  locale: Locale;
  copy: UiCopy;
  initialCards: Card[];
  reviews: Record<string, ReviewState>;
  dueCount: number;
  onRate: (cardId: string, rating: Rating) => boolean;
  onExit: (aborted: boolean) => void;
}) {
  const [queue, setQueue] = useState<Card[]>(initialCards);
  const [index, setIndex] = useState(0);
  const [tally, setTally] = useState<SessionTally>(emptyTally());
  const [revealed, setRevealed] = useState(false);
  const [liveMessage, setLiveMessage] = useState('');
  const finished = index >= queue.length;
  const revealRef = useRef<HTMLButtonElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLElement>(null);

  const current = finished ? undefined : queue[index];

  useEffect(() => {
    if (finished) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setLiveMessage(copy.session.cardAnnouncement(index + 1, queue.length));
    requestAnimationFrame(() => revealRef.current?.focus());
    // queue.length only grows together with an index change, so index + finished cover every card switch.
  }, [index, finished]);

  const reveal = () => {
    if (revealed || finished) return;
    setRevealed(true);
    setLiveMessage(copy.session.revealAnnouncement);
    requestAnimationFrame(() => answerRef.current?.focus());
  };

  const rate = (rating: Rating) => {
    if (!current || !revealed) return;
    // A failed save keeps the card in place so the rating can be retried.
    if (!onRate(current.id, rating)) return;
    const step = rateSessionCard(queue, index, rating, tally);
    setQueue(step.queue);
    setTally(step.tally);
    setRevealed(false);
    setIndex(step.index);
  };

  const requestAbort = () => {
    if (!window.confirm(copy.session.abortConfirm)) return;
    onExit(true);
  };

  const restart = () => {
    setQueue(initialCards);
    setIndex(0);
    setTally(emptyTally());
    setRevealed(false);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return;
      if (event.key === 'Escape') {
        if (!finished) requestAbort();
        return;
      }
      if (finished) return;
      if (!revealed && (event.key === ' ' || event.key === 'Enter')) {
        // Focused interactive controls (reveal button, links, disclosures) keep their native activation.
        if (target?.closest('button, a, summary')) return;
        event.preventDefault();
        reveal();
        return;
      }
      if (revealed && (event.key === '1' || event.key === '2' || event.key === '3')) {
        event.preventDefault();
        rate(event.key === '1' ? 'again' : event.key === '2' ? 'hard' : 'good');
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  });

  if (finished) {
    return (
      <section class="session-summary" aria-labelledby="session-summary-title" ref={summaryRef} tabIndex={-1}>
        <p class="eyebrow">{copy.session.summaryEyebrow}</p>
        <h3 id="session-summary-title">{copy.session.summaryTitle}</h3>
        <dl class="session-breakdown" aria-label={copy.session.breakdownLegend}>
          <div><dt>{copy.practice.ratingAgain}</dt><dd>{formatNumber(tally.again, locale)}</dd></div>
          <div><dt>{copy.practice.ratingHard}</dt><dd>{formatNumber(tally.hard, locale)}</dd></div>
          <div><dt>{copy.practice.ratingGood}</dt><dd>{formatNumber(tally.good, locale)}</dd></div>
        </dl>
        <p class="session-summary-meta">{copy.session.ratedCount(queue.length)} · {copy.session.dueRemaining(dueCount)}</p>
        <div class="session-summary-actions">
          <button class="quiz-start" onClick={restart}>{copy.session.restart}</button>
          <button class="quiz-quit" onClick={() => onExit(false)}>{copy.session.backToList}</button>
        </div>
      </section>
    );
  }

  const card = current!;
  const domain = domains.find((value) => value.id === card.domainId)!;
  const review = reviews[card.id];

  return (
    <div class="session-view">
      <p class="sr-only" aria-live="polite">{liveMessage}</p>
      <article class="practice-card session-card">
        <header>
          <div><span class="card-domain">D{domain.number}</span><span>{copy.practice.kinds[card.kind]}</span></div>
          <div class="session-progress"><code>{copy.session.progress(index + 1, queue.length)}</code><span>{copy.session.remaining(queue.length - index - 1)}</span></div>
        </header>
        <div class="card-prompt"><p class="eyebrow">{copy.practice.question}</p><h3>{localize(card.prompt, locale)}</h3></div>
        {!revealed && <button class="reveal-button" ref={revealRef} aria-expanded={false} aria-controls="session-answer" onClick={reveal}>{copy.practice.revealAnswer} <span aria-hidden="true">+</span></button>}
        {revealed && <CardAnswer card={card} review={review} locale={locale} copy={copy} id="session-answer" onRate={rate} answerRef={answerRef}/>}
        <button class="quiz-quit" onClick={requestAbort}>{copy.session.quit}</button>
      </article>
      <p class="session-shortcuts">{copy.session.shortcutsReveal} · {copy.session.shortcutsRate} · {copy.session.shortcutsQuit}</p>
    </div>
  );
}

function Blueprint({ reviews, ready, locale, copy }: { reviews: Record<string, ReviewState>; ready: boolean; locale: Locale; copy: UiCopy }) {
  const progress = (domainId: string) => {
    const domainCards = cards.filter((card) => card.domainId === domainId);
    return Math.round((domainCards.filter((card) => reviews[card.id]).length / domainCards.length) * 100);
  };

  return (
    <section class="blueprint" aria-labelledby="coverage-title">
      <div class="section-heading">
        <div><p class="eyebrow">{copy.blueprint.eyebrow}</p><h2 id="coverage-title">{copy.blueprint.title}</h2></div>
        <p>{copy.blueprint.progressNote}</p>
      </div>
      <div class="blueprint-map">
        <svg class="blueprint-lines" viewBox="0 0 1000 300" aria-hidden="true"><path d="M125 88 H380 L500 210 H680 L810 85"/><path d="M380 88 H810"/><circle cx="380" cy="88" r="5"/><circle cx="500" cy="210" r="5"/></svg>
        {domains.map((domain, index) => {
          const percent = ready ? progress(domain.id) : 0;
          return (
            <div class={`blueprint-node node-${index + 1}`} key={domain.id}>
              <div class="node-copy"><span>D{domain.number}</span><strong>{domain.weight}%</strong></div>
              <div class="node-progress" style={{ '--progress': `${percent}%` }}><span>{ready ? copy.blueprint.started(percent) : '—'}</span></div>
              <p>{localize(domain.title, locale)}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function App({ locale, analyticsEnabled = false }: { locale: Locale; analyticsEnabled?: boolean }) {
  const copy = ui[locale];
  const [view, setView] = useState<View>('today');
  const [data, setData] = useState<StudyData>({ version: 1, reviews: {} });
  const [now, setNow] = useState<Date | null>(null);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState<(typeof stateFilters)[number]>('due');
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [sessionCards, setSessionCards] = useState<Card[] | null>(null);
  const [notice, setNotice] = useState('');
  const noticeRef = useRef<HTMLParagraphElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  // Serializes imports: a second file picked while one is still being read
  // would otherwise apply in resolution order, not selection order.
  const importBusyRef = useRef(false);

  useEffect(() => {
    const refreshNow = () => setNow(new Date());
    const refreshWhenVisible = () => {
      if (!document.hidden) refreshNow();
    };

    setData(studyStorage().load());
    refreshNow();
    setReady(true);

    const clock = window.setInterval(refreshNow, 60_000);
    window.addEventListener('focus', refreshNow);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.clearInterval(clock);
      window.removeEventListener('focus', refreshNow);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  const dueCards = now ? cards.filter((card) => isDue(data.reviews[card.id], card.revision, now)) : [];
  const reviewedCount = Object.keys(data.reviews).filter((id) => cards.some((card) => card.id === id)).length;
  const filteredCards = useMemo(() => cards.filter((card) => {
    const text = [card.prompt, card.answer, card.explanation, card.pitfall]
      .map((field) => localize(field, locale))
      .join(' ')
      .toLocaleLowerCase(dateLocale(locale));
    const matchesQuery = text.includes(query.trim().toLocaleLowerCase(dateLocale(locale)));
    const matchesDomain = domainFilter === 'all' || card.domainId === domainFilter;
    const review = data.reviews[card.id];
    const matchesState = stateFilter === 'all' || (stateFilter === 'unseen' ? !review : stateFilter === 'reviewed' ? Boolean(review) : stateFilter === 'weak' ? isWeak(review) : Boolean(now && isDue(review, card.revision, now)));
    return matchesQuery && matchesDomain && matchesState;
  }), [query, domainFilter, stateFilter, data, locale, now]);

  const weakByDomain = useMemo(() => domains
    .map((domain) => ({ domain, count: cards.filter((card) => card.domainId === domain.id && isWeak(data.reviews[card.id])).length }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count), [data]);

  const focusNotice = () => requestAnimationFrame(() => noticeRef.current?.focus());

  const persistRating = (cardId: string, rating: Rating) => {
    const currentCard = cards.find((card) => card.id === cardId)!;
    const reviews = { ...data.reviews, [cardId]: scheduleReview(cardId, currentCard.revision, rating, data.reviews[cardId]) };
    const next = { ...data, reviews };
    if (!studyStorage().save(next)) {
      setNotice(copy.notices.saveFailed);
      focusNotice();
      return false;
    }
    setData(next);
    return true;
  };

  const saveRating = (cardId: string, rating: Rating) => {
    if (!persistRating(cardId, rating)) return;
    setRevealed((value) => ({ ...value, [cardId]: false }));
    setNotice(rating === 'again' ? copy.notices.ratingAgain : rating === 'hard' ? copy.notices.ratingHard : copy.notices.ratingGood);
    focusNotice();
  };

  const endSession = (aborted: boolean) => {
    setSessionCards(null);
    if (aborted) {
      setNotice(copy.session.abortedNotice);
      focusNotice();
    }
  };

  const recordQuizAnswer = (questionId: string, correct: boolean) => {
    const previous = data.quizStats?.[questionId];
    const stat = {
      attempts: (previous?.attempts ?? 0) + 1,
      correct: (previous?.correct ?? 0) + (correct ? 1 : 0),
      lastAnsweredAt: new Date().toISOString(),
      lastCorrect: correct,
    };
    const next = { ...data, quizStats: { ...data.quizStats, [questionId]: stat } };
    if (!studyStorage().save(next)) {
      setNotice(copy.notices.saveFailed);
      focusNotice();
      return;
    }
    setData(next);
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(buildStudyDataExport(data, new Date()), null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cca-field-notes-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    setNotice(copy.notices.exported);
  };

  const applyImport = (imported: ImportedStudyData | null) => {
    if (!imported) {
      setNotice(copy.notices.importInvalid);
      focusNotice();
      return;
    }
    const reviewedTotal = Object.keys(imported.data.reviews).length;
    const exportedAt = imported.exportedAt ? formatDate(new Date(imported.exportedAt), locale) : null;
    if (!window.confirm(copy.notices.importConfirm(reviewedTotal, exportedAt))) return;
    if (!studyStorage().save(imported.data)) {
      setNotice(copy.notices.saveFailed);
      focusNotice();
      return;
    }
    setData(imported.data);
    setRevealed({});
    setNotice(copy.notices.importDone);
    focusNotice();
  };

  const importData = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || importBusyRef.current) return;
    importBusyRef.current = true;
    void file.text()
      .then((text) => applyImport(parseStudyDataImport(text)), () => applyImport(null))
      .finally(() => {
        importBusyRef.current = false;
      });
  };

  const resetData = () => {
    if (!window.confirm(copy.notices.resetConfirm)) return;
    if (!studyStorage().reset()) {
      setNotice(copy.notices.resetFailed);
      focusNotice();
      return;
    }
    setData({ version: 1, reviews: {} });
    setRevealed({});
    setNotice(copy.notices.resetDone);
  };

  const navigate = (next: View) => {
    // Leaving the practice view ends a running session; its ratings are already persisted.
    if (next !== 'practice') setSessionCards(null);
    setView(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openWeakPractice = (domainId: string) => {
    setQuery('');
    setDomainFilter(domainId);
    setStateFilter('weak');
    navigate('practice');
  };

  return (
    <div class="app-shell">
      <header class="mobile-header">
        <div class="wordmark"><b>{copy.brand.mark}</b><span>{copy.brand.fieldNotes}</span></div>
        <div class="mobile-tools"><LanguageNav locale={locale} copy={copy} modifier="mobile"/><span class="unofficial">{copy.brand.unofficial}</span></div>
      </header>
      <aside class="rail">
        <div>
          <div class="wordmark"><b>{copy.brand.mark}</b><span>{copy.brand.fieldNotes}</span></div>
          <p class="edition">{copy.brand.edition}</p>
          <LanguageNav locale={locale} copy={copy} modifier="rail"/>
        </div>
        <nav aria-label={copy.aria.mainNavigation}>
          {viewKeys.map((key) => <button key={key} disabled={!ready} aria-current={view === key ? 'page' : undefined} onClick={() => navigate(key)}><span aria-hidden="true">{icons[key]}</span>{copy.views[key]}</button>)}
        </nav>
        <p class="rail-note"><strong>{copy.brand.unofficial}</strong><br/>{copy.brand.affiliationShort}</p>
      </aside>

      <main id="main-content">
        <h1 class="sr-only">{copy.pageTitle}</h1>
        <p ref={noticeRef} class="notice" tabIndex={-1} aria-live="polite">{notice}</p>
        {view === 'today' && <div class="view-stack">
          <section class="today-hero" aria-labelledby="today-title">
            <div>
              <p class="eyebrow">{copy.today.eyebrow} · {now ? formatDate(now, locale) : '—'}</p>
              <h2 id="today-title">{copy.today.titleLead}<br/><em>{copy.today.titleEmphasis}</em></h2>
              <p>{copy.today.introduction}</p>
            </div>
            <div class="due-block">
              <span>{copy.today.dueTitle}</span>
              <strong>{ready && now ? formatNumber(dueCards.length, locale) : '—'}</strong>
              <span>{ready && now ? copy.today.dueCount(dueCards.length) : '—'}</span>
              <button disabled={!ready} onClick={() => { setQuery(''); setDomainFilter('all'); setStateFilter('due'); setSessionCards(dueCards.length ? dueCards : null); navigate('practice'); }}>{copy.today.startReview} <span aria-hidden="true">→</span></button>
            </div>
          </section>
          <Blueprint reviews={data.reviews} ready={ready} locale={locale} copy={copy}/>
          <section class="weak-areas" aria-labelledby="weak-areas-title">
            <div class="section-heading">
              <div><p class="eyebrow">{copy.weakAreas.eyebrow}</p><h2 id="weak-areas-title">{copy.weakAreas.title}</h2></div>
              <p>{copy.weakAreas.note}</p>
            </div>
            {ready && weakByDomain.length > 0
              ? <div class="weak-list">{weakByDomain.map(({ domain, count }) => <button key={domain.id} type="button" class="weak-row" onClick={() => openWeakPractice(domain.id)}>
                  <span class="weak-row-domain" aria-hidden="true">D{domain.number}</span>
                  <span class="weak-row-title">{localize(domain.title, locale)}</span>
                  <strong>{copy.weakAreas.cardCount(count)}</strong>
                  <span aria-hidden="true">→</span>
                </button>)}</div>
              : <div class="empty-state">
                  <strong>{ready && reviewedCount > 0 ? copy.weakAreas.emptyAllClearTitle : copy.weakAreas.emptyBeforeStartTitle}</strong>
                  <p>{ready && reviewedCount > 0 ? copy.weakAreas.emptyAllClearDescription : copy.weakAreas.emptyBeforeStartDescription}</p>
                </div>}
          </section>
          <section class="status-strip" aria-labelledby="status-title">
            <div><p class="eyebrow">{copy.status.eyebrow}</p><h2 id="status-title">{copy.status.title}</h2></div>
            <dl>
              <div><dt>{copy.status.started}</dt><dd>{ready ? `${formatNumber(reviewedCount, locale)} / ${formatNumber(cards.length, locale)}` : '—'}</dd></div>
              <div><dt>{copy.status.notStarted}</dt><dd>{ready ? formatNumber(cards.length - reviewedCount, locale) : '—'}</dd></div>
              <div><dt>{copy.status.coverage}</dt><dd>{copy.status.objectives(30)}</dd></div>
            </dl>
          </section>
        </div>}

        {view === 'guide' && <section class="guide-view" aria-labelledby="guide-title">
          <header class="page-header">
            <p class="eyebrow">{copy.guide.eyebrow}</p><h2 id="guide-title">{copy.guide.title}</h2><p>{copy.guide.introduction}</p>
            <a class="text-link" href={sourceById.get('exam-guide')?.url} target="_blank" rel="noreferrer">{copy.guide.openExamGuide}<span class="sr-only">{copy.aria.opensNewTab}</span><span aria-hidden="true"> ↗</span></a>
          </header>
          <div class="domain-list">{domains.map((domain) => <section class="domain-section" key={domain.id} aria-labelledby={`${domain.id}-title`}>
            <header><div class="domain-number">D{domain.number}</div><div><p class="eyebrow">{copy.guide.weight} {domain.weight}%</p><h3 id={`${domain.id}-title`}>{localize(domain.title, locale)}</h3><p>{localize(domain.summary, locale)}</p></div></header>
            <div class="objective-grid">{domain.objectives.map((item) => <article class="objective" key={item.id}>
              <div class="objective-title"><code>{item.id}</code><div><h4>{localize(item.title, locale)}</h4></div></div>
              <p>{localize(item.summary, locale)}</p><h5>{copy.guide.mustKnow}</h5><ul>{localize(item.mustKnow, locale).map((point) => <li key={point}>{point}</li>)}</ul>
              <details><summary>{copy.guide.officialSources}</summary><SourceLinks ids={item.sourceIds} copy={copy}/><small>{copy.guide.verified(formatDate(item.verifiedAt, locale))}</small></details>
            </article>)}</div>
          </section>)}</div>
        </section>}

        {view === 'practice' && <section class="practice-view" aria-labelledby="practice-title">
          <header class="page-header compact"><p class="eyebrow">{copy.practice.eyebrow}</p><h2 id="practice-title">{copy.practice.title}</h2><p>{copy.practice.introduction}</p></header>
          {sessionCards && <PracticeSession locale={locale} copy={copy} initialCards={sessionCards} reviews={data.reviews} dueCount={dueCards.length} onRate={persistRating} onExit={endSession}/>}
          {!sessionCards && <><div class="filter-panel">
            <label class="search-label" for="card-search">{copy.practice.searchLabel}<input id="card-search" type="search" value={query} onInput={(event) => setQuery(event.currentTarget.value)} placeholder={copy.practice.searchPlaceholder}/></label>
            <fieldset><legend>{copy.practice.stateLegend}</legend><div class="chips">{stateFilters.map((key) => <button key={key} type="button" class={stateFilter === key ? 'selected' : ''} aria-pressed={stateFilter === key} onClick={() => setStateFilter(key)}>{copy.practice.filters[key]}</button>)}</div></fieldset>
            <fieldset><legend>{copy.practice.domainLegend}</legend><div class="chips"><button type="button" class={domainFilter === 'all' ? 'selected' : ''} aria-pressed={domainFilter === 'all'} onClick={() => setDomainFilter('all')}>{copy.practice.allDomains}</button>{domains.map((domain) => <button key={domain.id} type="button" class={domainFilter === domain.id ? 'selected' : ''} aria-pressed={domainFilter === domain.id} onClick={() => setDomainFilter(domain.id)}>D{domain.number}</button>)}</div></fieldset>
          </div>
          <div class="session-start-row">
            <button class="quiz-start session-start" disabled={!filteredCards.length} onClick={() => setSessionCards(filteredCards)}>{copy.session.start} <span aria-hidden="true">→</span></button>
            {!filteredCards.length && <p class="session-start-hint">{copy.session.cannotStart}</p>}
          </div>
          <p class="result-count">{copy.practice.resultCount(filteredCards.length)}</p>
          <div class="card-stack">{filteredCards.map((card, index) => {
            const domain = domains.find((value) => value.id === card.domainId)!;
            const answerId = `${card.id}-answer`;
            const isOpen = Boolean(revealed[card.id]);
            const review = data.reviews[card.id];
            return <article class="practice-card" key={card.id}>
              <header><div><span class="card-domain">D{domain.number}</span><span>{copy.practice.kinds[card.kind]}</span></div><code>{String(index + 1).padStart(2, '0')} / {String(filteredCards.length).padStart(2, '0')}</code></header>
              <div class="card-prompt"><p class="eyebrow">{copy.practice.question}</p><h3>{localize(card.prompt, locale)}</h3></div>
              <button class="reveal-button" aria-expanded={isOpen} aria-controls={answerId} onClick={() => setRevealed((value) => ({ ...value, [card.id]: !isOpen }))}>{isOpen ? copy.practice.hideAnswer : copy.practice.revealAnswer} <span aria-hidden="true">{isOpen ? '−' : '+'}</span></button>
              {isOpen && <CardAnswer card={card} review={review} locale={locale} copy={copy} id={answerId} onRate={(rating) => saveRating(card.id, rating)}/>}
            </article>;
          })}</div>
          {!filteredCards.length && <div class="empty-state"><strong>{copy.practice.emptyTitle}</strong><p>{copy.practice.emptyDescription}</p></div>}</>}
        </section>}

        {view === 'quiz' && <QuizView locale={locale} copy={copy} quizStats={data.quizStats} onAnswer={recordQuizAnswer}/>}

        {view === 'progress' && <section class="progress-view" aria-labelledby="progress-title">
          <header class="page-header"><p class="eyebrow">{copy.progress.eyebrow}</p><h2 id="progress-title">{copy.progress.title}</h2><p>{copy.progress.introduction}</p></header>
          <section class="progress-panel" aria-labelledby="by-domain"><h3 id="by-domain">{copy.progress.byDomain}</h3>{domains.map((domain) => {
            const list = cards.filter((card) => card.domainId === domain.id);
            const done = list.filter((card) => data.reviews[card.id]).length;
            const weak = list.filter((card) => isWeak(data.reviews[card.id])).length;
            return <div class="progress-row" key={domain.id}><span>D{domain.number} {localize(domain.title, locale)}{weak > 0 && <small class="weak-count">{copy.progress.weakCount(weak)}</small>}</span><progress value={done} max={list.length}>{done}/{list.length}</progress><strong>{formatNumber(done, locale)}/{formatNumber(list.length, locale)}</strong></div>;
          })}</section>
          <section class="data-panel" aria-labelledby="data-title"><div><h3 id="data-title">{copy.progress.localData}</h3><p>{copy.progress.localDataDescription}</p>{analyticsEnabled && <p class="analytics-disclosure">{copy.progress.analyticsDisclosure}<a href={localePaths[locale].privacy}>{copy.progress.details}</a></p>}</div><div class="data-actions"><button onClick={exportData}>{copy.progress.exportJson}</button><button onClick={() => importInputRef.current?.click()}>{copy.progress.importJson}</button><input ref={importInputRef} type="file" accept=".json,application/json" hidden onChange={importData}/><button class="danger" onClick={resetData}>{copy.progress.reset}</button></div></section>
          <section class="sources-panel" aria-labelledby="sources-title"><div><p class="eyebrow">{copy.progress.sourcesEyebrow}</p><h3 id="sources-title">{copy.progress.sourcesTitle}</h3><p>{copy.progress.sourcesDescription}</p></div><div class="source-register">{sources.map((source) => <article key={source.id}><code>{source.id}</code><div><a href={source.url} target="_blank" rel="noreferrer"><span lang="en">{source.title}</span><span class="sr-only">{copy.aria.opensNewTab}</span><span aria-hidden="true"> ↗</span></a><p>{source.publisher} · {copy.progress.verified(formatDate(source.verifiedAt, locale))}</p></div></article>)}</div></section>
          <section class="disclaimer" aria-labelledby="disclaimer-title"><h3 id="disclaimer-title">{copy.progress.disclaimerTitle}</h3><p>{copy.progress.disclaimerBody}</p><p>{copy.progress.blueprintVerified(formatDate(VERIFIED_AT, locale))} {copy.progress.reportIssueLead} <a href="https://github.com/toshi0607/cca-study-guide/issues" target="_blank" rel="noreferrer">{copy.progress.reportIssueLink}<span class="sr-only">{copy.aria.opensNewTab}</span><span aria-hidden="true"> ↗</span></a>.</p></section>
        </section>}
        <footer class="site-footer">
          <span>{copy.brand.footer}</span>
          <nav aria-label={copy.aria.siteInformation}>
            {analyticsEnabled && <a href={localePaths[locale].privacy}>{copy.footer.analytics}</a>}
            <a href="https://github.com/toshi0607/cca-study-guide" target="_blank" rel="noreferrer">{copy.footer.github}<span class="sr-only">{copy.aria.opensNewTab}</span><span aria-hidden="true"> ↗</span></a>
          </nav>
        </footer>
      </main>

      <nav class="bottom-nav" aria-label={copy.aria.mainNavigation}>{viewKeys.map((key) => <button key={key} disabled={!ready} aria-current={view === key ? 'page' : undefined} onClick={() => navigate(key)}><span aria-hidden="true">{icons[key]}</span>{copy.views[key]}</button>)}</nav>
      <div class="persistent-disclaimer">{copy.progress.disclaimerTitle}</div>
    </div>
  );
}

export default App;
