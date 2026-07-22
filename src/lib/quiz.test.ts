import { describe, expect, it } from 'vitest';
import { questions } from '../content/questions';
import { domains } from '../content/domains';
import { classifyChoice, isAnswerCorrect, pickQuizQuestions } from './quiz';

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
