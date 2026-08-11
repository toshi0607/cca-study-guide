import type { ChoiceQuestion } from '../../content/types';
import type { AnswerOutcome } from '../../lib/quiz';

// `correct` is kept alongside `outcome` for existing call sites that only need
// a right/wrong split (e.g. summary scoring); `outcome` additionally
// distinguishes a partially-correct multiple-select answer from a fully wrong one.
// `answerToken` is the `lastAnsweredAt` the storage layer assigned to this
// answer, carried so a later confidence pick can prove it still targets this
// exact answer rather than one a newer tab has since overwritten.
export type QuizResult = { question: ChoiceQuestion; selectedIds: string[]; correct: boolean; outcome: AnswerOutcome; answerToken: string };
export type QuizMode = 'random' | 'scenario';
// 'saved' — recorded against the expected answer; 'stale' — the stat has moved
// on to a newer answer, so nothing was written; 'failed' — the save itself failed.
export type ConfidenceOutcome = 'saved' | 'stale' | 'failed';
