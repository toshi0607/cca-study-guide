import type { ChoiceQuestion } from '../../content/types';
import type { Locale } from '../../i18n/locales';
import { localize, type UiCopy } from '../../i18n/ui';
import { classifyChoice } from '../../lib/quiz';
import type { RationalesState } from '../../lib/rationales-loader';

// The post-answer review of every choice, shared by the immediate feedback and
// the summary so the two never disagree on what "correct" or "your choice" means.
// Correctness and selection come from the question data and the learner's pick,
// so they render even while the rationale chunk is loading or after it fails —
// only the rationale prose depends on the deferred chunk. State is conveyed by
// text labels and the id badge, never by color alone.
export function ChoiceReview({ question, selectedIds, rationalesState, locale, copy }: {
  question: ChoiceQuestion;
  selectedIds: string[];
  rationalesState: RationalesState;
  locale: Locale;
  copy: UiCopy;
}) {
  const questionRationales = rationalesState.status === 'loaded'
    ? rationalesState.rationales[question.id]
    : undefined;

  return (
    <div class="choice-review">
      {rationalesState.status === 'loading' && <p class="rationale-status" role="status" aria-live="polite">{copy.quiz.rationaleLoading}</p>}
      {rationalesState.status === 'error' && <div class="note note--warn rationale-error" role="alert">
        <p>{copy.quiz.rationaleLoadError}</p>
        <button type="button" class="btn" onClick={() => window.location.reload()}>{copy.quiz.rationaleRetry}</button>
      </div>}
      <ol class="choice-review-list">
        {question.choices.map((choice) => {
          const state = classifyChoice(question.correctChoiceIds, selectedIds, choice.id);
          const isCorrect = state === 'correct-selected' || state === 'correct-unselected';
          const wasSelected = state === 'correct-selected' || state === 'incorrect-selected';
          const rationale = questionRationales?.[choice.id];
          return <li key={choice.id} class={`choice-button ${isCorrect ? 'correct' : 'incorrect'}`}>
            <div class="choice-review-head">
              <span class="badge badge--cyan choice-id" aria-hidden="true">{choice.id.toUpperCase()}</span>
              <span class="choice-text">{localize(choice.text, locale)}</span>
              <span class={`badge badge--outline choice-mark ${isCorrect ? 'choice-mark--correct' : 'choice-mark--incorrect'}`}>{isCorrect ? copy.quiz.choiceCorrectLabel : copy.quiz.choiceIncorrectLabel}</span>
              {wasSelected && <span class="badge badge--outline choice-mark choice-mark--picked">{copy.quiz.yourChoiceLabel}</span>}
            </div>
            {rationale && <p class="choice-rationale">{localize(rationale, locale)}</p>}
          </li>;
        })}
      </ol>
    </div>
  );
}
