import type { MutableRef } from 'preact/hooks';
import { useState } from 'preact/hooks';
import { formatDate } from '../app/format';
import { SourceLinks } from '../app/SourceLinks';
import type { ChoiceQuestion, Scenario } from '../../content/types';
import type { Locale } from '../../i18n/locales';
import { localize, type UiCopy } from '../../i18n/ui';
import type { RationalesState } from '../../lib/rationales-loader';
import type { QuizConfidence } from '../../lib/storage-schema';
import { AnswerReview } from './AnswerReview';
import { QuestionMetadata } from './QuestionMetadata';
import { ScenarioBackground } from './ScenarioBackground';
import type { QuizResult } from './types';

export function QuizQuestion({
  current, index, total, scenario, locale, copy, selected, answered, currentResult, rationalesState, feedbackRef,
  onSelectSingle, onToggleMultiple, onSubmitMultiple, onAdvance, onQuit, onConfidence,
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
  rationalesState: RationalesState;
  feedbackRef: MutableRef<HTMLDivElement | null>;
  onSelectSingle: (choiceId: string) => void;
  onToggleMultiple: (choiceId: string) => void;
  onSubmitMultiple: () => void;
  onAdvance: () => void;
  onQuit: () => void;
  onConfidence: (confidence: QuizConfidence, wasCorrect: boolean) => boolean;
}) {
  // Which confidence the learner picked for the current answer, if any. Keyed
  // by `index` (not `current.id`, so the same question appearing twice in a
  // round still resets) and derived at render time rather than reset via a
  // `useEffect`, so there is no frame where a prior question's recorded value
  // is still shown for the new one.
  const [recorded, setRecorded] = useState<{ index: number; value: QuizConfidence } | null>(null);
  const recordedConfidence = recorded?.index === index ? recorded.value : null;

  const answerText = (question: ChoiceQuestion) =>
    question.choices.filter((choice) => question.correctChoiceIds.includes(choice.id)).map((choice) => localize(choice.text, locale)).join(' / ');

  return (
    <article class="quiz-question">
      <header>
        <div><span>{copy.quiz.formats[current.format]}</span></div>
        <code>{copy.quiz.progressLabel(index + 1, total)}</code>
      </header>
      <QuestionMetadata question={current} locale={locale} copy={copy}/>
      {scenario && <details class="scenario-context">
        <summary>{copy.quiz.backgroundToggle}</summary>
        <div><ScenarioBackground scenario={scenario} locale={locale}/></div>
      </details>}
      <div class="card-prompt"><p class="eyebrow">{copy.practice.question}</p><h3>{localize(current.stem, locale)}</h3></div>
      {!answered && <>
        <p class="note note--info quiz-hint">{current.format === 'single' ? copy.quiz.singleHint : copy.quiz.multipleHint}</p>
        <fieldset class="choice-list">
          <legend class="sr-only">{copy.quiz.choicesLegend}</legend>
          {current.choices.map((choice) => {
            const isSelected = selected.includes(choice.id);
            return <button
              key={choice.id}
              type="button"
              class={`choice-button${isSelected ? ' selected' : ''}`}
              aria-pressed={current.format === 'multiple' ? isSelected : undefined}
              onClick={() => {
                if (current.format === 'single') onSelectSingle(choice.id);
                else onToggleMultiple(choice.id);
              }}
            >
              <span class="badge badge--cyan choice-id" aria-hidden="true">{choice.id.toUpperCase()}</span>
              <span class="choice-text">{localize(choice.text, locale)}</span>
            </button>;
          })}
        </fieldset>
        {current.format === 'multiple' && <button class="btn btn--wide quiz-submit" disabled={!selected.length} onClick={onSubmitMultiple}>{copy.quiz.submitAnswer}</button>}
      </>}
      {currentResult && <div class="quiz-feedback" role="status" tabIndex={-1} ref={feedbackRef}>
        <p class={`quiz-verdict ${currentResult.outcome === 'correct' ? 'is-correct' : currentResult.outcome === 'partial' ? 'is-partial' : 'is-incorrect'}`}>{currentResult.outcome === 'correct' ? copy.quiz.resultCorrect : currentResult.outcome === 'partial' ? copy.quiz.resultPartial : copy.quiz.resultIncorrect}</p>
        <p class="quiz-correct-answer"><strong>{copy.quiz.correctAnswerLabel}</strong> {answerText(current)}</p>
        {/* The buttons stay mounted after a choice is recorded. Swapping them for
            a confirmation would destroy the element the learner just activated,
            dropping keyboard focus to <body> and restarting the next Tab from the
            top of the page. Instead the pressed state is expressed with
            aria-pressed and a repeat press is ignored, so the count can only ever
            rise once per answer. The confirmation sits inside the quiz-feedback
            live region, so it is announced without a nested one. */}
        <div class="quiz-confidence">
          <p class="quiz-confidence-legend">{copy.quiz.confidenceLegend}</p>
          <div class="quiz-confidence-actions">
            {(['sure', 'unsure', 'guess'] as const).map((value) => (
              <button
                key={value}
                type="button"
                class="btn btn--secondary quiz-confidence-button"
                aria-pressed={recordedConfidence === value}
                onClick={() => {
                  if (recordedConfidence !== null) return;
                  if (onConfidence(value, currentResult.outcome === 'correct')) setRecorded({ index, value });
                }}
              >{copy.quiz.confidence[value]}</button>
            ))}
          </div>
          {recordedConfidence !== null && <p class="note note--info quiz-confidence-recorded">{copy.quiz.confidenceRecorded(copy.quiz.confidence[recordedConfidence])}</p>}
        </div>
        <AnswerReview question={current} selectedIds={currentResult.selectedIds} rationalesState={rationalesState} locale={locale} copy={copy}/>
        <div class="card-sources"><strong>{copy.quiz.officialSources}</strong><SourceLinks ids={current.sourceIds} copy={copy}/><small>{copy.quiz.verified(formatDate(current.verifiedAt, locale))}</small></div>
        <button class="btn btn--wide quiz-next" onClick={onAdvance}>{index + 1 >= total ? copy.quiz.showResults : copy.quiz.next} <span aria-hidden="true">→</span></button>
      </div>}
      <button class="btn--text quiz-quit" onClick={onQuit}>{copy.quiz.quit}</button>
    </article>
  );
}
