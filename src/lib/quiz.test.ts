import { describe, expect, it } from 'vitest';
import { questions } from '../content/questions';
import { domains } from '../content/domains';
import type { ChoiceQuestion } from '../content/types';
import { classifyAnswer, classifyChoice, isAnswerCorrect, pickQuizQuestions } from './quiz';

function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe('pickQuizQuestions', () => {
  it('draws the requested number of unique questions across domains in weighted mode', () => {
    // #given
    const random = seededRandom(1);

    // #when
    const picked = pickQuizQuestions(questions, domains, 10, 'weighted', random);

    // #then
    expect(new Set(picked.map((question) => question.id)).size).toBe(10);
  });

  it('returns the whole bank once, without repeats, when asked for all questions', () => {
    // #given
    const random = seededRandom(2);

    // #when
    const picked = pickQuizQuestions(questions, domains, 'all', 'weighted', random);

    // #then
    expect([...new Set(picked.map((question) => question.id))].sort()).toEqual(questions.map((question) => question.id).sort());
  });

  it('limits the draw to the chosen domain and caps at its bank size', () => {
    // #given
    const random = seededRandom(3);

    // #when
    const picked = pickQuizQuestions(questions, domains, 20, 'd5', random);

    // #then
    expect(picked.map((question) => question.domainId)).toEqual(picked.map(() => 'd5'));
    expect(picked.length).toBe(questions.filter((question) => question.domainId === 'd5').length);
  });
});

describe('isAnswerCorrect', () => {
  const single = questions.find((question) => question.format === 'single')!;
  const multiple = questions.find((question) => question.format === 'multiple')!;

  it('accepts the exact correct choice for single format', () => {
    expect(isAnswerCorrect(single, single.correctChoiceIds)).toBe(true);
  });

  it('rejects a wrong choice for single format', () => {
    // #given
    const wrong = single.choices.find((choice) => !single.correctChoiceIds.includes(choice.id))!;

    // #then
    expect(isAnswerCorrect(single, [wrong.id])).toBe(false);
  });

  it('accepts the correct set in any order for multiple format', () => {
    expect(isAnswerCorrect(multiple, [...multiple.correctChoiceIds].reverse())).toBe(true);
  });

  it('rejects partial or superset selections for multiple format', () => {
    // #given
    const extra = multiple.choices.find((choice) => !multiple.correctChoiceIds.includes(choice.id))!;

    // #then
    expect(isAnswerCorrect(multiple, multiple.correctChoiceIds.slice(0, 1))).toBe(false);
    expect(isAnswerCorrect(multiple, [...multiple.correctChoiceIds, extra.id])).toBe(false);
  });

  it('rejects an empty selection', () => {
    expect(isAnswerCorrect(single, [])).toBe(false);
  });
});

describe('classifyChoice', () => {
  it('classifies a single-select answer choice by choice', () => {
    // #given — correct is b, the learner picked b
    const correct = ['b'];
    const selected = ['b'];

    // #then
    expect(classifyChoice(correct, selected, 'b')).toBe('correct-selected');
    expect(classifyChoice(correct, selected, 'a')).toBe('incorrect-unselected');
  });

  it('marks the correct answer a learner missed and the wrong answer they picked', () => {
    // #given — single-select where the learner chose the wrong option a
    const correct = ['b'];
    const selected = ['a'];

    // #then
    expect(classifyChoice(correct, selected, 'b')).toBe('correct-unselected');
    expect(classifyChoice(correct, selected, 'a')).toBe('incorrect-selected');
  });

  it('distinguishes all four states for a partial multiple-select answer', () => {
    // #given — correct are a and b; the learner selected a (a correct one) and c (a wrong one)
    const correct = ['a', 'b'];
    const selected = ['a', 'c'];

    // #then — every choice resolves to its own state
    expect(classifyChoice(correct, selected, 'a')).toBe('correct-selected');
    expect(classifyChoice(correct, selected, 'b')).toBe('correct-unselected');
    expect(classifyChoice(correct, selected, 'c')).toBe('incorrect-selected');
    expect(classifyChoice(correct, selected, 'd')).toBe('incorrect-unselected');
  });
});

describe('classifyAnswer', () => {
  // Fixtures built directly (not drawn from the content bank) so every choice
  // id and the correct set are known exactly, which the partial-vs-incorrect
  // cases below depend on.
  const choice = (id: string): ChoiceQuestion['choices'][number] => ({ id, text: { ja: id, en: id } });
  const singleQuestion: ChoiceQuestion = {
    id: 'fixture-single',
    revision: 1,
    domainId: 'd1',
    objectiveIds: ['o1'],
    format: 'single',
    difficulty: 'foundation',
    skills: [],
    stem: { ja: 'stem', en: 'stem' },
    choices: [choice('a'), choice('b')],
    correctChoiceIds: ['a'],
    explanation: { ja: 'explanation', en: 'explanation' },
    sourceIds: [],
    verifiedAt: '2026-01-01T00:00:00.000Z',
  };
  const multipleQuestion: ChoiceQuestion = {
    ...singleQuestion,
    id: 'fixture-multiple',
    format: 'multiple',
    choices: [choice('a'), choice('b'), choice('c'), choice('d')],
    correctChoiceIds: ['a', 'd'],
  };

  it('classifies a single-format answer as correct when the one correct choice is picked', () => {
    // #given
    const question = singleQuestion;

    // #when
    const outcome = classifyAnswer(question, ['a']);

    // #then
    expect(outcome).toBe('correct');
  });

  it('classifies a single-format answer as incorrect when the wrong choice is picked', () => {
    // #given
    const question = singleQuestion;

    // #when
    const outcome = classifyAnswer(question, ['b']);

    // #then
    expect(outcome).toBe('incorrect');
  });

  it('classifies a multiple-format answer as correct when both correct choices are picked', () => {
    // #given
    const question = multipleQuestion;

    // #when
    const outcome = classifyAnswer(question, ['a', 'd']);

    // #then
    expect(outcome).toBe('correct');
  });

  it('classifies a multiple-format answer as partial when only one of two correct choices is picked', () => {
    // #given
    const question = multipleQuestion;

    // #when
    const outcome = classifyAnswer(question, ['a']);

    // #then
    expect(outcome).toBe('partial');
  });

  it('classifies a multiple-format answer as incorrect when a correct choice is mixed with a wrong one', () => {
    // #given — a is correct, b is wrong: picking any wrong choice disqualifies partial credit
    const question = multipleQuestion;

    // #when
    const outcome = classifyAnswer(question, ['a', 'b']);

    // #then
    expect(outcome).toBe('incorrect');
  });

  it('classifies an empty selection as incorrect', () => {
    // #given
    const question = multipleQuestion;

    // #when
    const outcome = classifyAnswer(question, []);

    // #then
    expect(outcome).toBe('incorrect');
  });

  it('never classifies a single-format answer as partial, across every possible selection', () => {
    // #given — a single-answer question has no non-empty proper subset of its one correct
    // choice, so every possible selection (including the empty one) must be correct or incorrect
    const question = singleQuestion;
    const allSelections: string[][] = [[], ['a'], ['b'], ['a', 'b']];

    // #when / #then
    for (const selection of allSelections) {
      expect(classifyAnswer(question, selection)).not.toBe('partial');
    }
  });
});
