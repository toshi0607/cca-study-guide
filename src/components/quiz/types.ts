import type { ChoiceQuestion } from '../../content/types';
import type { AnswerOutcome } from '../../lib/quiz';

// `correct` is kept alongside `outcome` for existing call sites that only need
// a right/wrong split (e.g. summary scoring); `outcome` additionally
// distinguishes a partially-correct multiple-select answer from a fully wrong one.
export type QuizResult = { question: ChoiceQuestion; selectedIds: string[]; correct: boolean; outcome: AnswerOutcome };
export type QuizMode = 'random' | 'scenario';
