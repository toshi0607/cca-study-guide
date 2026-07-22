import type { ChoiceQuestion, Domain } from '../content/types';

export type QuizCount = 10 | 20 | 'all';
export type QuizDomainChoice = 'weighted' | string;

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export function pickQuizQuestions(
  pool: readonly ChoiceQuestion[],
  domains: readonly Domain[],
  count: QuizCount,
  domainChoice: QuizDomainChoice,
  random: () => number = Math.random,
): ChoiceQuestion[] {
  const limit = count === 'all' ? pool.length : count;

  if (domainChoice !== 'weighted') {
    return shuffle(pool.filter((question) => question.domainId === domainChoice), random).slice(0, limit);
  }

  const buckets = domains.map((domain) => ({
    weight: domain.weight,
    remaining: shuffle(pool.filter((question) => question.domainId === domain.id), random),
  }));
  const picked: ChoiceQuestion[] = [];
  while (picked.length < limit) {
    const candidates = buckets.filter((bucket) => bucket.remaining.length > 0);
    if (!candidates.length) break;
    let roll = random() * candidates.reduce((sum, bucket) => sum + bucket.weight, 0);
    const chosen = candidates.find((bucket) => (roll -= bucket.weight) < 0) ?? candidates[candidates.length - 1];
    picked.push(chosen.remaining.pop()!);
  }
  return picked;
}

export function isAnswerCorrect(question: ChoiceQuestion, selectedChoiceIds: readonly string[]): boolean {
  return selectedChoiceIds.length === question.correctChoiceIds.length
    && question.correctChoiceIds.every((id) => selectedChoiceIds.includes(id));
}

// The four states a single choice can be in once a question is answered. Kept as
// a pure function so the post-answer review and the summary review classify a
// choice identically, and so a partially-correct multiple-select answer is
// distinguished choice by choice (a selected correct answer differs from an
// unselected correct one, and a selected wrong answer from an unselected one).
export type ChoiceReviewState =
  | 'correct-selected'
  | 'correct-unselected'
  | 'incorrect-selected'
  | 'incorrect-unselected';

export function classifyChoice(
  correctChoiceIds: readonly string[],
  selectedChoiceIds: readonly string[],
  choiceId: string,
): ChoiceReviewState {
  const correctness = correctChoiceIds.includes(choiceId) ? 'correct' : 'incorrect';
  const selection = selectedChoiceIds.includes(choiceId) ? 'selected' : 'unselected';
  return `${correctness}-${selection}`;
}
