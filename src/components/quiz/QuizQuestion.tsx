import type { MutableRef } from 'preact/hooks';
import { formatDate } from '../app/format';
import { SourceLinks } from '../app/SourceLinks';
import { domains } from '../../content/domains';
import type { ChoiceQuestion, Scenario } from '../../content/types';
import type { Locale } from '../../i18n/locales';
import { localize, type UiCopy } from '../../i18n/ui';
import { ScenarioBackground } from './ScenarioBackground';
import type { QuizResult } from './types';

export function QuizQuestion({
  current, index, total, scenario, locale, copy, selected, answered, currentResult, feedbackRef,
  onSelectSingle, onToggleMultiple, onSubmitMultiple, onAdvance, onQuit,
}: {
  current: ChoiceQuestion;
  index: number;
  total: number;
  scenario: Scenario | null;
  locale: Locale;
  copy: UiCopy;
  selected: string[];
  answered: boolean;
  currentResult: QuizResult | undefined;
  feedbackRef: MutableRef<HTMLDivElement | null>;
  onSelectSingle: (choiceId: string) => void;
  onToggleMultiple: (choiceId: string) => void;
  onSubmitMultiple: () => void;
  onAdvance: () => void;
  onQuit: () => void;
}) {
  const answerText = (question: ChoiceQuestion) =>
    question.choices.filter((choice) => question.correctChoiceIds.includes(choice.id)).map((choice) => localize(choice.text, locale)).join(' / ');

  return (
    <article class="quiz-question">
      <header>
        <div><span class="card-domain">D{domains.find((domain) => domain.id === current.domainId)!.number}</span><span>{copy.quiz.formats[current.format]}</span></div>
        <code>{copy.quiz.progressLabel(index + 1, total)}</code>
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
              if (current.format === 'single') onSelectSingle(choice.id);
              else onToggleMultiple(choice.id);
            }}
          >
            <span class="choice-id" aria-hidden="true">{choice.id.toUpperCase()}</span>
            <span class="choice-text">{localize(choice.text, locale)}</span>
            {answered && isCorrectChoice && <span class="choice-mark choice-mark--correct">{copy.quiz.correctBadge}</span>}
            {wasSelected && <span class="choice-mark">{copy.quiz.selectedBadge}</span>}
          </button>;
        })}
      </fieldset>
      {current.format === 'multiple' && !answered && <button class="quiz-submit" disabled={!selected.length} onClick={onSubmitMultiple}>{copy.quiz.submitAnswer}</button>}
      {currentResult && <div class="quiz-feedback" role="status" tabIndex={-1} ref={feedbackRef}>
        <p class={`quiz-verdict ${currentResult.correct ? 'is-correct' : 'is-incorrect'}`}>{currentResult.correct ? copy.quiz.resultCorrect : copy.quiz.resultIncorrect}</p>
        <p class="quiz-correct-answer"><strong>{copy.quiz.correctAnswerLabel}</strong> {answerText(current)}</p>
        <p>{localize(current.explanation, locale)}</p>
        <div class="card-sources"><strong>{copy.quiz.officialSources}</strong><SourceLinks ids={current.sourceIds} copy={copy}/><small>{copy.quiz.verified(formatDate(current.verifiedAt, locale))}</small></div>
        <button class="quiz-next" onClick={onAdvance}>{index + 1 >= total ? copy.quiz.showResults : copy.quiz.next} <span aria-hidden="true">→</span></button>
      </div>}
      <button class="quiz-quit" onClick={onQuit}>{copy.quiz.quit}</button>
    </article>
  );
}
