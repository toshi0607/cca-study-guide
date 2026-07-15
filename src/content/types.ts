export type Source = {
  id: string;
  title: string;
  publisher: 'Anthropic' | 'MCP Project';
  url: string;
  official: true;
  verifiedAt: string;
};

export type LocalizedText<T = string> = Readonly<{
  ja: T;
  en: T;
}>;

export type Objective = {
  id: string;
  title: LocalizedText;
  summary: LocalizedText;
  mustKnow: LocalizedText<string[]>;
  sourceIds: string[];
  verifiedAt: string;
};

export type Domain = {
  id: string;
  number: 1 | 2 | 3 | 4 | 5;
  title: LocalizedText;
  weight: number;
  summary: LocalizedText;
  objectives: Objective[];
};

export type Card = {
  id: string;
  revision: number;
  domainId: string;
  objectiveIds: string[];
  kind: 'recall' | 'contrast' | 'scenario';
  prompt: LocalizedText;
  answer: LocalizedText;
  explanation: LocalizedText;
  pitfall: LocalizedText;
  sourceIds: string[];
  verifiedAt: string;
};
