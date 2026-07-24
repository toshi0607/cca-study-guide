import { useState } from 'preact/hooks';
import type { UiCopy } from '../../i18n/ui';
import type { MockExamQuestionRef } from '../../lib/mock-exam';
import { useModalDialog } from '../../lib/use-mock-exam';

type PaletteFilter = 'all' | 'unanswered' | 'flagged';

// A modal question map. State is conveyed by text/icon/aria-label as well as
// colour, never colour alone: every cell's accessible name spells out its
// current/answered/unanswered/flagged state.
export function MockExamPalette({ open, refs, currentIndex, answered, flagged, copy, onSelect, onClose }: {
  open: boolean;
  refs: readonly MockExamQuestionRef[];
  currentIndex: number;
  answered: ReadonlySet<string>;
  flagged: ReadonlySet<string>;
  copy: UiCopy;
  onSelect: (index: number) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState<PaletteFilter>('all');
  const dialogRef = useModalDialog(open);

  const items = refs.map((ref, index) => ({
    index,
    ref,
    isCurrent: index === currentIndex,
    isAnswered: answered.has(ref.questionId),
    isFlagged: flagged.has(ref.questionId),
  }));
  const filtered = items.filter((item) =>
    filter === 'all' || (filter === 'unanswered' && !item.isAnswered) || (filter === 'flagged' && item.isFlagged),
  );
  const filterLabel: Record<PaletteFilter, string> = {
    all: copy.mockExam.paletteFilterAll,
    unanswered: copy.mockExam.paletteFilterUnanswered,
    flagged: copy.mockExam.paletteFilterFlagged,
  };

  return (
    <dialog ref={dialogRef} class="mock-exam-palette" aria-label={copy.mockExam.paletteTitle} onClose={onClose} onCancel={onClose}>
      <div class="mock-exam-palette-head">
        <h2 class="card-title">{copy.mockExam.paletteTitle}</h2>
        <button type="button" class="btn btn--secondary" onClick={onClose}>{copy.mockExam.paletteClose}</button>
      </div>
      <div class="mock-exam-palette-filters" role="group" aria-label={copy.mockExam.paletteFilterLabel}>
        {(['all', 'unanswered', 'flagged'] as const).map((key) => (
          <button key={key} type="button" class={`chip${filter === key ? ' is-selected' : ''}`} aria-pressed={filter === key} onClick={() => setFilter(key)}>
            {filterLabel[key]}
          </button>
        ))}
      </div>
      {filtered.length === 0
        ? <p class="mock-exam-palette-empty">{filter === 'flagged' ? copy.mockExam.paletteEmptyFlagged : copy.mockExam.paletteEmptyUnanswered}</p>
        : <ul class="mock-exam-palette-grid">
            {filtered.map((item) => {
              const states = [
                item.isCurrent ? copy.mockExam.paletteStateCurrent : null,
                item.isAnswered ? copy.mockExam.paletteStateAnswered : copy.mockExam.paletteStateUnanswered,
                item.isFlagged ? copy.mockExam.paletteStateFlagged : null,
              ].filter(Boolean).join('・');
              return (
                <li key={item.ref.questionId}>
                  <button
                    type="button"
                    class={`chip mock-exam-palette-cell${item.isCurrent ? ' is-current' : ''}${item.isAnswered ? ' is-selected' : ''}${item.isFlagged ? ' is-flagged' : ''}`}
                    aria-current={item.isCurrent ? 'true' : undefined}
                    aria-label={copy.mockExam.paletteQuestionLabel(item.index + 1, states)}
                    onClick={() => onSelect(item.index)}
                  >
                    <span aria-hidden="true">{item.index + 1}</span>
                    {item.isFlagged && <span class="mock-exam-palette-flag" aria-hidden="true">⚑</span>}
                    {item.isAnswered && <span class="mock-exam-palette-check" aria-hidden="true">✓</span>}
                  </button>
                </li>
              );
            })}
          </ul>}
    </dialog>
  );
}
