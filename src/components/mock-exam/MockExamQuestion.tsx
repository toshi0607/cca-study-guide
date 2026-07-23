import type { MutableRef } from 'preact/hooks';
import type { ChoiceQuestion } from '../../content/types';
import type { Locale } from '../../i18n/locales';
import { localize, type UiCopy } from '../../i18n/ui';

// The timed question view. Answers are persisted the moment a choice is toggled
// (single overwrites, multiple toggles the set), so there is no per-question
// submit and no local selection state — the selected set comes straight from the
// saved session, which is what makes resume exact. No correctness, rationale, or
// explanation is shown here: feedback is hidden until the exam is graded.
export function MockExamQuestion({ question, selected, flagged, locale, copy, headingRef, onSelect, onToggleFlag }: {
  question: ChoiceQuestion;
  selected: readonly string[];
  flagged: boolean;
  locale: Locale;
  copy: UiCopy;
  headingRef: MutableRef<HTMLHeadingElement | null>;
  onSelect: (choiceId: string) => void;
  onToggleFlag: () => void;
}) {
  return (
    <article class="mock-exam-question">
      <div class="card-prompt">
        <p class="eyebrow">{copy.practice.question}</p>
        <h3 tabIndex={-1} ref={headingRef}>{localize(question.stem, locale)}</h3>
      </div>
      <p class="quiz-hint">{question.format === 'single' ? copy.mockExam.singleHint : copy.mockExam.multipleHint}</p>
      <fieldset class="choice-list">
        <legend class="sr-only">{copy.mockExam.choicesLegend}</legend>
        {question.choices.map((choice) => {
          const isSelected = selected.includes(choice.id);
          return (
            <button
              key={choice.id}
              type="button"
              class={`choice-button${isSelected ? ' selected' : ''}`}
              // Selection state is announced (not conveyed by colour alone) for
              // both single and multiple: a single-answer choice is a toggle whose
              // pressed state a screen reader must hear, since the selection
              // persists on screen until submit.
              aria-pressed={isSelected}
              onClick={() => onSelect(choice.id)}
            >
              <span class="choice-id" aria-hidden="true">{choice.id.toUpperCase()}</span>
              <span class="choice-text">{localize(choice.text, locale)}</span>
            </button>
          );
        })}
      </fieldset>
      <button type="button" class={`mock-exam-flag${flagged ? ' is-flagged' : ''}`} aria-pressed={flagged} onClick={onToggleFlag}>
        {flagged ? copy.mockExam.unflagButton : copy.mockExam.flagButton}
      </button>
    </article>
  );
}
