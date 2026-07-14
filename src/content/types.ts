export type Source = {
  id: string;
  title: string;
  publisher: 'Anthropic' | 'MCP Project';
  url: string;
  official: true;
  verifiedAt: string;
};

export type Objective = {
  id: string;
  title: string;
  titleJa: string;
  summary: string;
  mustKnow: string[];
  sourceIds: string[];
  verifiedAt: string;
};

export type Domain = {
  id: string;
  number: 1 | 2 | 3 | 4 | 5;
  title: string;
  titleJa: string;
  weight: number;
  summary: string;
  objectives: Objective[];
};

export type Card = {
  id: string;
  revision: number;
  domainId: string;
  objectiveIds: string[];
  kind: 'recall' | 'contrast' | 'scenario';
  prompt: string;
  answer: string;
  explanation: string;
  pitfall: string;
  sourceIds: string[];
  verifiedAt: string;
};
