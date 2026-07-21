import type { ChoiceQuestion } from '../../content/types';

export type QuizResult = { question: ChoiceQuestion; selectedIds: string[]; correct: boolean };
export type QuizMode = 'random' | 'scenario';
