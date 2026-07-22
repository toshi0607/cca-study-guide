import { beforeEach, describe, expect, it } from 'vitest';
import { questions } from '../content/questions';
import { classifyChoice, isAnswerCorrect } from './quiz';
import { loadChoiceRationales, resetChoiceRationalesCache } from './rationales-loader';

describe('loadChoiceRationales', () => {
  beforeEach(() => resetChoiceRationalesCache());

  it('resolves to the real rationale map covering every choice of every question', async () => {
    // #when
    const rationales = await loadChoiceRationales();

    // #then — the deferred module carries a rationale for each choice
    for (const question of questions) {
      for (const choice of question.choices) {
        expect(rationales[question.id]?.[choice.id], `${question.id}:${choice.id}`).toBeDefined();
      }
    }
  });

  it('reuses a single import: repeated calls return the same cached promise', () => {
    // #when
    const first = loadChoiceRationales();
    const second = loadChoiceRationales();

    // #then — the same question never re-requests the chunk
    expect(second).toBe(first);
  });

  it('re-imports only after the cache is explicitly reset', () => {
    // #given
    const first = loadChoiceRationales();

    // #when
    resetChoiceRationalesCache();
    const afterReset = loadChoiceRationales();

    // #then
    expect(afterReset).not.toBe(first);
  });
});

describe('answer results are independent of rationale loading', () => {
  it('computes correctness and per-choice state from the question alone', () => {
    // #given — a single-select question, with no rationale map available at all
    const question = questions.find((candidate) => candidate.format === 'single')!;
    const correctId = question.correctChoiceIds[0];

    // #then — the recorded result never depends on the deferred rationale chunk,
    // so a failed rationale load cannot turn a saved answer into a failure
    expect(isAnswerCorrect(question, question.correctChoiceIds)).toBe(true);
    expect(classifyChoice(question.correctChoiceIds, [correctId], correctId)).toBe('correct-selected');
  });
});
