import { useEffect, useRef, useState } from 'preact/hooks';
import { domains } from '../../content/domains';
import { questions, standaloneQuestions } from '../../content/questions';
import { scenarios } from '../../content/scenarios';
import type { ChoiceQuestion, Scenario } from '../../content/types';
import type { Locale } from '../../i18n/locales';
import { localize, type UiCopy } from '../../i18n/ui';
import { isAnswerCorrect, pickQuizQuestions, type QuizCount, type QuizDomainChoice } from '../../lib/quiz';
import { useChoiceRationales } from '../../lib/rationales-loader';
import type { QuizStat } from '../../lib/storage';
import { QuizQuestion } from '../quiz/QuizQuestion';
import { QuizSetup } from '../quiz/QuizSetup';
import { QuizSummary } from '../quiz/QuizSummary';
import { ScenarioBackground } from '../quiz/ScenarioBackground';
import type { QuizMode, QuizResult } from '../quiz/types';

const questionsByScenario = new Map(
  scenarios.map((scenario) => [scenario.id, questions.filter((question) => question.scenarioId === scenario.id)]),
);

const domainBadges = (domainIds: string[]) =>
  domains.filter((domain) => domainIds.includes(domain.id)).map((domain) => <span key={domain.id} class="card-domain">D{domain.number}</span>);

export function QuizView({ locale, copy, quizStats, onAnswer, targetQuestionId, onTargetOpened, targetScenarioId, onTargetScenarioOpened }: { locale: Locale; copy: UiCopy; quizStats?: Record<string, QuizStat>; onAnswer: (questionId: string, correct: boolean) => boolean; targetQuestionId: string | null; onTargetOpened: () => void; targetScenarioId: string | null; onTargetScenarioOpened: () => void }) {
  const [phase, setPhase] = useState<'setup' | 'background' | 'question' | 'summary'>('setup');
  const [mode, setMode] = useState<QuizMode>('random');
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [count, setCount] = useState<QuizCount>(10);
  const [domainChoice, setDomainChoice] = useState<QuizDomainChoice>('weighted');
  const [round, setRound] = useState<ChoiceQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [targetAnnouncement, setTargetAnnouncement] = useState('');
  const [focusBackground, setFocusBackground] = useState(false);
  // Flipped only after the first successful answer, which is what triggers the
  // deferred rationale chunk to load. It stays true across questions and rounds
  // so the cached module is reused rather than re-requested.
  const [rationalesRequested, setRationalesRequested] = useState(false);
  const rationalesState = useChoiceRationales(rationalesRequested);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const targetAnnouncementRef = useRef<HTMLParagraphElement>(null);
  const backgroundHeadingRef = useRef<HTMLHeadingElement>(null);
  // Synchronous re-entrancy guard: `answered` only flips on the next render,
  // so a double-fired click could otherwise record the same question twice.
  const answeredIdRef = useRef<string | null>(null);

  const current = phase === 'question' ? round[index] : undefined;
  const lastResult = results[results.length - 1];
  const currentResult = current && lastResult?.question.id === current.id ? lastResult : undefined;
  const answered = Boolean(currentResult);

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

  useEffect(() => {
    if (!targetQuestionId) return;
    const target = questions.find((question) => question.id === targetQuestionId);
    if (target) {
      setScenario(target.scenarioId ? scenarios.find((candidate) => candidate.id === target.scenarioId) ?? null : null);
      launch([target]);
      setTargetAnnouncement(localize(target.stem, locale));
    }
    onTargetOpened();
  }, [targetQuestionId]);

  useEffect(() => {
    if (targetAnnouncement && phase === 'question') requestAnimationFrame(() => targetAnnouncementRef.current?.focus());
  }, [targetAnnouncement, phase]);

  const start = () => {
    setTargetAnnouncement('');
    launch(pickQuizQuestions(standaloneQuestions, domains, count, domainChoice));
  };

  const openScenario = (next: Scenario) => {
    setScenario(next);
    setPhase('background');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Exact-target entry from the official scenarios view: open the requested
  // practice case's background directly and move focus to its heading, then clear
  // the target. The existing quit button returns the learner to the quiz setup.
  useEffect(() => {
    if (!targetScenarioId) return;
    const target = scenarios.find((candidate) => candidate.id === targetScenarioId);
    if (target) {
      openScenario(target);
      setFocusBackground(true);
    }
    onTargetScenarioOpened();
  }, [targetScenarioId]);

  useEffect(() => {
    if (focusBackground && phase === 'background') {
      requestAnimationFrame(() => backgroundHeadingRef.current?.focus());
      setFocusBackground(false);
    }
  }, [focusBackground, phase]);

  const answer = (question: ChoiceQuestion, selectedIds: string[]) => {
    if (answeredIdRef.current === question.id) return;
    const correct = isAnswerCorrect(question, selectedIds);
    // Save-first: the answered UI (and the rationale request) only advances once
    // the stat is persisted, so a failed save never shows a "recorded" answer.
    if (!onAnswer(question.id, correct)) return;
    answeredIdRef.current = question.id;
    setResults((value) => [...value, { question, selectedIds, correct }]);
    setRationalesRequested(true);
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
    setTargetAnnouncement('');
  };

  const correctCount = results.filter((result) => result.correct).length;
  const wrongResults = results.filter((result) => !result.correct);

  return (
    <section class="quiz-view" aria-labelledby="quiz-title">
      <header class="page-header compact">
        <p class="eyebrow">{copy.quiz.eyebrow}</p><h2 id="quiz-title">{copy.quiz.title}</h2><p>{copy.quiz.introduction}</p>
      </header>
      {targetAnnouncement && phase === 'question' && <p class="quiz-target" tabIndex={-1} role="status" aria-live="polite" ref={targetAnnouncementRef}>{targetAnnouncement}</p>}

      {phase === 'setup' && <QuizSetup
        copy={copy} locale={locale} mode={mode} count={count} domainChoice={domainChoice}
        scenarios={scenarios} questionsByScenario={questionsByScenario} quizStats={quizStats}
        onModeChange={setMode} onCountChange={setCount} onDomainChoiceChange={setDomainChoice}
        onStart={start} onOpenScenario={openScenario}
      />}

      {phase === 'background' && scenario && <article class="scenario-brief">
        <p class="eyebrow">{copy.quiz.backgroundTitle}</p>
        <h3 tabIndex={-1} ref={backgroundHeadingRef}>{localize(scenario.title, locale)}</h3>
        <div class="scenario-item-meta">{domainBadges(scenario.domainIds)}<span>{copy.quiz.scenarioQuestionCount((questionsByScenario.get(scenario.id) ?? []).length)}</span></div>
        <ScenarioBackground scenario={scenario} locale={locale}/>
        <button class="quiz-start" onClick={() => launch(questionsByScenario.get(scenario.id) ?? [])}>{copy.quiz.proceedToQuestions} <span aria-hidden="true">→</span></button>
        <button class="quiz-quit" onClick={reset}>{copy.quiz.quit}</button>
      </article>}

      {current && <QuizQuestion
        current={current} index={index} total={round.length} scenario={scenario} locale={locale} copy={copy}
        selected={selected} answered={answered} currentResult={currentResult} rationalesState={rationalesState} feedbackRef={feedbackRef}
        onSelectSingle={(choiceId) => answer(current, [choiceId])}
        onToggleMultiple={(choiceId) => setSelected((value) => (value.includes(choiceId) ? value.filter((id) => id !== choiceId) : [...value, choiceId]))}
        onSubmitMultiple={() => answer(current, selected)}
        onAdvance={advance}
        onQuit={reset}
      />}

      {phase === 'summary' && <QuizSummary results={results} correctCount={correctCount} wrongResults={wrongResults} rationalesState={rationalesState} locale={locale} copy={copy} onRetry={reset}/>}
    </section>
  );
}
