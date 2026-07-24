import { domains } from '../../content/domains';
import type { ChoiceQuestion, Scenario } from '../../content/types';
import type { Locale } from '../../i18n/locales';
import { localize, type UiCopy } from '../../i18n/ui';
import type { QuizCount, QuizDomainChoice } from '../../lib/quiz';
import type { QuizStat } from '../../lib/storage';
import type { QuizMode } from './types';

const domainBadges = (domainIds: string[]) =>
  domains.filter((domain) => domainIds.includes(domain.id)).map((domain) => <span key={domain.id} class="badge badge--ink">D{domain.number}</span>);

export function QuizSetup({
  copy, locale, mode, count, domainChoice, scenarios, questionsByScenario, quizStats,
  onModeChange, onCountChange, onDomainChoiceChange, onStart, onOpenScenario,
}: {
  copy: UiCopy;
  locale: Locale;
  mode: QuizMode;
  count: QuizCount;
  domainChoice: QuizDomainChoice;
  scenarios: Scenario[];
  questionsByScenario: Map<string, ChoiceQuestion[]>;
  quizStats?: Record<string, QuizStat>;
  onModeChange: (mode: QuizMode) => void;
  onCountChange: (count: QuizCount) => void;
  onDomainChoiceChange: (domainChoice: QuizDomainChoice) => void;
  onStart: () => void;
  onOpenScenario: (scenario: Scenario) => void;
}) {
  const countOptions: Array<{ value: QuizCount; label: string }> = [
    { value: 10, label: copy.quiz.count10 },
    { value: 20, label: copy.quiz.count20 },
    { value: 'all', label: copy.quiz.countAll },
  ];

  return (
    <div class="quiz-setup">
      <fieldset><legend>{copy.quiz.modeLegend}</legend><div class="chips">
        <button type="button" class={`chip${mode === 'random' ? ' is-selected' : ''}`} aria-pressed={mode === 'random'} onClick={() => onModeChange('random')}>{copy.quiz.modeRandom}</button>
        <button type="button" class={`chip${mode === 'scenario' ? ' is-selected' : ''}`} aria-pressed={mode === 'scenario'} onClick={() => onModeChange('scenario')}>{copy.quiz.modeScenario}</button>
      </div></fieldset>
      {mode === 'random' && <>
        <fieldset><legend>{copy.quiz.countLegend}</legend><div class="chips">{countOptions.map((option) => <button key={String(option.value)} type="button" class={`chip${count === option.value ? ' is-selected' : ''}`} aria-pressed={count === option.value} onClick={() => onCountChange(option.value)}>{option.label}</button>)}</div></fieldset>
        <fieldset><legend>{copy.quiz.domainLegend}</legend><div class="chips"><button type="button" class={`chip${domainChoice === 'weighted' ? ' is-selected' : ''}`} aria-pressed={domainChoice === 'weighted'} onClick={() => onDomainChoiceChange('weighted')}>{copy.quiz.weightedDomains}</button>{domains.map((domain) => <button key={domain.id} type="button" class={`chip${domainChoice === domain.id ? ' is-selected' : ''}`} aria-pressed={domainChoice === domain.id} onClick={() => onDomainChoiceChange(domain.id)}>D{domain.number}</button>)}</div></fieldset>
        <button class="btn quiz-start" onClick={onStart}>{copy.quiz.start} <span aria-hidden="true">→</span></button>
      </>}
      {mode === 'scenario' && <>
        <p class="note note--info scenario-note">{copy.quiz.scenarioIntroduction}</p>
        <ul class="scenario-list" aria-label={copy.quiz.scenarioListLabel}>{scenarios.map((entry) => {
          const linked = questionsByScenario.get(entry.id) ?? [];
          const answeredCount = linked.filter((question) => quizStats?.[question.id]).length;
          return <li key={entry.id}>
            <button type="button" class="scenario-item" onClick={() => onOpenScenario(entry)}>
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
    </div>
  );
}
