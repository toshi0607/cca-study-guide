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

// The six application scenarios named by Exam Guide v1.0 (CCAR-F). They are a
// classification axis for study material, not practice cases of their own; the
// display names live in `scenarios.ts`.
export type OfficialScenarioId =
  | 'customer-support-resolution'
  | 'code-generation-claude-code'
  | 'multi-agent-research'
  | 'developer-productivity'
  | 'claude-code-ci'
  | 'structured-data-extraction';

export type OfficialScenario = {
  id: OfficialScenarioId;
  title: LocalizedText;
  summary: LocalizedText;
  domainIds: string[];
  sourceIds: string[];
  verifiedAt: string;
};

// Practice cases authored for this app. Kept as a closed union so questions and
// hands-on material cannot reference a case that does not exist.
export type PracticeScenarioId =
  | 'sc-mcp-tool-design'
  | 'sc-support-agents'
  | 'sc-code-rollout'
  | 'sc-extraction-pipeline';

export type Scenario = {
  id: PracticeScenarioId;
  revision: number;
  title: LocalizedText;
  // Independently authored fictional case description, split into 2-4 paragraphs.
  background: LocalizedText<string[]>;
  domainIds: string[];
  // Official scenario categories this fictional case practices.
  officialScenarioIds: OfficialScenarioId[];
  sourceIds: string[];
  verifiedAt: string;
};

// What a question demands of the learner. Independent of the domain (the exam
// weighting area) and of the task statement (what the guide covers). The array
// is the single definition: the union is derived from it, so a value can never
// exist in one and not the other.
export const questionDifficulties = ['foundation', 'application', 'analysis'] as const;

export type QuestionDifficulty = (typeof questionDifficulties)[number];

// The capability a question measures. Cross-cutting on purpose: a skill can be
// exercised from several domains. The display names live in `skills.ts`.
export type SkillId =
  | 'agent-loop'
  | 'orchestration'
  | 'workflow-enforcement'
  | 'context-management'
  | 'tool-design'
  | 'mcp-integration'
  | 'failure-handling'
  | 'claude-code-configuration'
  | 'claude-code-workflow'
  | 'prompt-design'
  | 'structured-output'
  | 'evaluation'
  | 'human-oversight'
  | 'throughput-and-cost';

export type Skill = {
  id: SkillId;
  title: LocalizedText;
  summary: LocalizedText;
};

export type Choice = {
  id: string;
  text: LocalizedText;
};

// Why each individual choice is correct or incorrect for its stem, keyed by
// question ID and then by choice ID. Stored apart from the questions (see
// `rationales.ts`) so the quiz bundle does not carry review-only copy;
// validation guarantees the two stay in exact correspondence.
export type ChoiceRationales = Record<string, Record<string, LocalizedText>>;

type ChoiceQuestionBase = {
  id: string;
  revision: number;
  domainId: string;
  objectiveIds: string[];
  format: 'single' | 'multiple';
  difficulty: QuestionDifficulty;
  skills: SkillId[];
  stem: LocalizedText;
  choices: Choice[];
  correctChoiceIds: string[];
  explanation: LocalizedText;
  sourceIds: string[];
  verifiedAt: string;
};

export type StandaloneQuestion = ChoiceQuestionBase & { scenarioId?: undefined };
// Set only on questions that belong to a scenario-practice case.
export type ScenarioQuestion = ChoiceQuestionBase & { scenarioId: PracticeScenarioId };
export type ChoiceQuestion = StandaloneQuestion | ScenarioQuestion;

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

// Ordered reading path over the exam guide: what to study, in which order, and
// how far. Rendered by a later PR; the content model is complete already.
export type StudyGuideSection = {
  id: string;
  revision: number;
  // Position in the recommended reading order; unique across sections.
  recommendedOrder: number;
  title: LocalizedText;
  summary: LocalizedText;
  domainIds: string[];
  // Objective (task statement) IDs such as '1.1'.
  taskStatementIds: string[];
  learningObjectives: LocalizedText<string[]>;
  keyPoints: LocalizedText<string[]>;
  estimatedMinutes: number;
  relatedCardIds: string[];
  relatedQuestionIds: string[];
  sourceIds: string[];
  verifiedAt: string;
};

export type HandsOnStep = {
  id: string;
  title: LocalizedText;
  instructions: LocalizedText<string[]>;
};

// A guided exercise the learner runs in their own environment. The type carries
// no environment-specific settings and never holds credentials.
export type HandsOnGuide = {
  id: string;
  revision: number;
  title: LocalizedText;
  summary: LocalizedText;
  domainIds: string[];
  officialScenarioIds: OfficialScenarioId[];
  learningObjectives: LocalizedText<string[]>;
  prerequisites: LocalizedText<string[]>;
  estimatedMinutes: number;
  steps: HandsOnStep[];
  deliverables: LocalizedText<string[]>;
  verification: LocalizedText<string[]>;
  cleanup?: LocalizedText<string[]>;
  relatedCardIds: string[];
  relatedQuestionIds: string[];
  sourceIds: string[];
  verifiedAt: string;
};
