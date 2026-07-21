import { z } from 'zod';
import type { LocalizedText, QuestionDifficulty } from './types';
import { cards } from './cards';
import { domains } from './domains';
import { handsOnGuides } from './hands-on';
import { questions } from './questions';
import { choiceRationales } from './rationales';
import { officialScenarioById, officialScenarios, scenarios } from './scenarios';
import { skillById, skills } from './skills';
import { sources } from './sources';
import { studyGuideSections } from './study-guide';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
  (value) => new Date(`${value}T00:00:00Z`).toISOString().startsWith(value),
  'must be an existing calendar date',
);
const localizedStringSchema = z.object({
  ja: z.string().trim().min(1),
  en: z.string().trim().min(1),
}).strict();
const localizedStringList = (items: z.ZodArray<z.ZodString>) => z.object({ ja: items, en: items }).strict();
const localizedStringArraySchema = localizedStringList(z.array(z.string().trim().min(1)).min(1));
// `satisfies` keeps this list and the QuestionDifficulty union from drifting apart.
const questionDifficulties = ['foundation', 'application', 'analysis'] as const satisfies readonly QuestionDifficulty[];
const idListSchema = z.array(z.string().min(1));
const requiredIdListSchema = idListSchema.min(1);
const sourceSchema = z.object({ id: z.string().min(1), title: z.string().min(1), publisher: z.enum(['Anthropic', 'MCP Project']), url: z.string().url(), official: z.literal(true), verifiedAt: date });
const objectiveSchema = z.object({ id: z.string().min(1), title: localizedStringSchema, summary: localizedStringSchema, mustKnow: localizedStringArraySchema, sourceIds: requiredIdListSchema, verifiedAt: date });
const domainSchema = z.object({ id: z.string().min(1), number: z.number().int().min(1).max(5), title: localizedStringSchema, weight: z.number().positive(), summary: localizedStringSchema, objectives: z.array(objectiveSchema).min(1) });
const cardSchema = z.object({ id: z.string().min(1), revision: z.number().int().positive(), domainId: z.string().min(1), objectiveIds: requiredIdListSchema, kind: z.enum(['recall', 'contrast', 'scenario']), prompt: localizedStringSchema, answer: localizedStringSchema, explanation: localizedStringSchema, pitfall: localizedStringSchema, sourceIds: requiredIdListSchema, verifiedAt: date });
const choiceQuestionSchema = z.object({
  id: z.string().min(1),
  revision: z.number().int().positive(),
  domainId: z.string().min(1),
  objectiveIds: requiredIdListSchema,
  format: z.enum(['single', 'multiple']),
  difficulty: z.enum(questionDifficulties),
  skills: requiredIdListSchema,
  stem: localizedStringSchema,
  choices: z.array(z.object({ id: z.string().min(1), text: localizedStringSchema }).strict()).min(2),
  correctChoiceIds: requiredIdListSchema,
  explanation: localizedStringSchema,
  sourceIds: requiredIdListSchema,
  verifiedAt: date,
  scenarioId: z.string().min(1).optional(),
});
const scenarioSchema = z.object({
  id: z.string().min(1),
  revision: z.number().int().positive(),
  title: localizedStringSchema,
  background: localizedStringList(z.array(z.string().trim().min(1)).min(2).max(4)),
  domainIds: requiredIdListSchema,
  officialScenarioIds: requiredIdListSchema,
  sourceIds: requiredIdListSchema,
  verifiedAt: date,
});
const officialScenarioSchema = z.object({
  id: z.string().min(1),
  title: localizedStringSchema,
  summary: localizedStringSchema,
  domainIds: requiredIdListSchema,
  sourceIds: requiredIdListSchema,
  verifiedAt: date,
});
const skillSchema = z.object({ id: z.string().min(1), title: localizedStringSchema, summary: localizedStringSchema });
const studyGuideSectionSchema = z.object({
  id: z.string().min(1),
  revision: z.number().int().positive(),
  recommendedOrder: z.number().int().positive(),
  title: localizedStringSchema,
  summary: localizedStringSchema,
  domainIds: requiredIdListSchema,
  taskStatementIds: requiredIdListSchema,
  learningObjectives: localizedStringArraySchema,
  keyPoints: localizedStringArraySchema,
  estimatedMinutes: z.number().int().positive(),
  relatedCardIds: idListSchema,
  relatedQuestionIds: idListSchema,
  sourceIds: requiredIdListSchema,
  verifiedAt: date,
});
const handsOnStepSchema = z.object({
  id: z.string().min(1),
  title: localizedStringSchema,
  instructions: localizedStringArraySchema,
});
const handsOnGuideSchema = z.object({
  id: z.string().min(1),
  revision: z.number().int().positive(),
  title: localizedStringSchema,
  summary: localizedStringSchema,
  domainIds: requiredIdListSchema,
  officialScenarioIds: requiredIdListSchema,
  learningObjectives: localizedStringArraySchema,
  prerequisites: localizedStringArraySchema,
  estimatedMinutes: z.number().int().positive(),
  steps: z.array(handsOnStepSchema).min(1),
  deliverables: localizedStringArraySchema,
  verification: localizedStringArraySchema,
  cleanup: localizedStringArraySchema.optional(),
  relatedCardIds: idListSchema,
  relatedQuestionIds: idListSchema,
  sourceIds: requiredIdListSchema,
  verifiedAt: date,
});

export const genericSourceIds = new Set(['exam-guide', 'cert', 'announcement', 'code-index', 'platform-index']);

const unique = (values: string[], label: string, errors: string[]) => {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  if (duplicates.length) errors.push(`${label} has duplicate IDs: ${[...new Set(duplicates)].join(', ')}`);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Parses each entry on its own so one malformed item cannot hide the problems in
// the rest, and so every message names the content type, the ID, and the field.
function parseEach<T>(schema: z.ZodType<T>, input: unknown, label: string, errors: string[]): T[] {
  if (!Array.isArray(input)) {
    errors.push(`${label}: expected an array`);
    return [];
  }
  const parsed: T[] = [];
  input.forEach((item, index) => {
    const result = schema.safeParse(item);
    const id = isRecord(item) && typeof item.id === 'string' && item.id.trim() ? item.id : `#${index}`;
    if (result.success) {
      parsed.push(result.data);
      return;
    }
    for (const issue of result.error.issues) {
      errors.push(`${label} ${id}: ${issue.path.join('.') || '(root)'} ${issue.message}`);
    }
  });
  return parsed;
}

// Duplicate IDs are checked on the raw input: an entry that fails its schema is
// dropped from `parsed`, and its duplicated ID would otherwise go unreported.
const rawIds = (input: unknown): string[] =>
  Array.isArray(input)
    ? input.flatMap((item) => (isRecord(item) && typeof item.id === 'string' ? [item.id] : []))
    : [];

const checkReferences = (
  ids: string[],
  known: ReadonlySet<string>,
  label: string,
  kind: string,
  errors: string[],
) => {
  for (const id of ids) if (!known.has(id)) errors.push(`${label}: orphan ${kind} ${id}`);
};

// The key list is the definition, so a new reference kind cannot be added to the
// type without becoming overridable in tests.
const contentIndexKeys = ['sourceIds', 'domainIds', 'objectiveIds', 'cardIds', 'questionIds', 'scenarioIds', 'officialScenarioIds', 'skillIds'] as const;

export type ContentIndex = Record<(typeof contentIndexKeys)[number], ReadonlySet<string>>;

// The reference index of the real content. Tests override single entries to
// exercise a broken reference without rebuilding the whole content set.
export function buildContentIndex(overrides: Partial<Record<keyof ContentIndex, Iterable<string>>> = {}): ContentIndex {
  const base: ContentIndex = {
    sourceIds: new Set(sources.map((item) => item.id)),
    domainIds: new Set(domains.map((item) => item.id)),
    objectiveIds: new Set(domains.flatMap((domain) => domain.objectives.map((item) => item.id))),
    cardIds: new Set(cards.map((item) => item.id)),
    questionIds: new Set(questions.map((item) => item.id)),
    scenarioIds: new Set(scenarios.map((item) => item.id)),
    officialScenarioIds: new Set(Object.keys(officialScenarioById)),
    skillIds: new Set(Object.keys(skillById)),
  };
  const merged = { ...base };
  for (const key of contentIndexKeys) {
    const override = overrides[key];
    if (override) merged[key] = new Set(override);
  }
  return merged;
}

const checkSourceIds = (item: { id: string; sourceIds: string[] }, label: string, index: ContentIndex, errors: string[]) => {
  checkReferences(item.sourceIds, index.sourceIds, `${label} ${item.id}`, 'source', errors);
  if (!item.sourceIds.some((sourceId) => !genericSourceIds.has(sourceId))) {
    errors.push(`${label} ${item.id}: missing claim-specific source`);
  }
};

export function validateSources(input: unknown): string[] {
  const errors: string[] = [];
  const parsed = parseEach(sourceSchema, input, 'source', errors);
  unique(rawIds(input), 'sources', errors);
  const allowedHosts = new Set(['anthropic-partners.skilljar.com', 'www.anthropic.com', 'platform.claude.com', 'code.claude.com', 'modelcontextprotocol.io', 'everpath-course-content.s3-accelerate.amazonaws.com']);
  for (const source of parsed) {
    if (!allowedHosts.has(new URL(source.url).hostname)) errors.push(`source ${source.id}: unofficial host`);
  }
  return errors;
}

export function validateDomains(input: unknown, index: ContentIndex): string[] {
  const errors: string[] = [];
  const parsed = parseEach(domainSchema, input, 'domain', errors);
  unique(rawIds(input), 'domains', errors);
  const objectives = parsed.flatMap((domain) => domain.objectives);
  unique(objectives.map((item) => item.id), 'objectives', errors);
  if (parsed.reduce((sum, domain) => sum + domain.weight, 0) !== 100) errors.push('domain weights must total 100');
  if (parsed.length !== 5) errors.push('exactly five domains are required');
  if (objectives.length !== 30) errors.push('exactly 30 objectives are required');
  for (const objective of objectives) checkSourceIds(objective, 'objective', index, errors);
  return errors;
}

export function validateCards(input: unknown, index: ContentIndex): string[] {
  const errors: string[] = [];
  const parsed = parseEach(cardSchema, input, 'card', errors);
  unique(rawIds(input), 'cards', errors);
  for (const card of parsed) {
    checkSourceIds(card, 'card', index, errors);
    checkReferences([card.domainId], index.domainIds, `card ${card.id}`, 'domain', errors);
    checkReferences(card.objectiveIds, index.objectiveIds, `card ${card.id}`, 'objective', errors);
  }
  return errors;
}

export function validateQuestions(input: unknown, index: ContentIndex): string[] {
  const errors: string[] = [];
  const parsed = parseEach(choiceQuestionSchema, input, 'question', errors);
  unique(rawIds(input), 'questions', errors);
  for (const question of parsed) {
    const label = `question ${question.id}`;
    checkSourceIds(question, 'question', index, errors);
    checkReferences([question.domainId], index.domainIds, label, 'domain', errors);
    checkReferences(question.objectiveIds, index.objectiveIds, label, 'objective', errors);
    checkReferences(question.skills, index.skillIds, label, 'skill', errors);
    unique(question.skills, `${label} skills`, errors);

    const choiceIds = question.choices.map((choice) => choice.id);
    unique(choiceIds, `${label} choices`, errors);
    unique(question.correctChoiceIds, `${label} correctChoiceIds`, errors);
    const choiceIdSet = new Set(choiceIds);
    for (const correctId of question.correctChoiceIds) {
      if (!choiceIdSet.has(correctId)) errors.push(`${label}: correctChoiceIds ${correctId} is not a choice`);
    }
    if (question.format === 'single' && question.correctChoiceIds.length !== 1) errors.push(`${label}: single format requires exactly one correct choice`);
    if (question.format === 'multiple' && question.correctChoiceIds.length < 2) errors.push(`${label}: multiple format requires at least two correct choices`);
    if (question.correctChoiceIds.length >= question.choices.length) errors.push(`${label}: at least one choice must be incorrect`);

    if (question.scenarioId !== undefined) {
      checkReferences([question.scenarioId], index.scenarioIds, label, 'scenario', errors);
    }
  }
  return errors;
}

export function validateOfficialScenarios(input: unknown, index: ContentIndex): string[] {
  const errors: string[] = [];
  const parsed = parseEach(officialScenarioSchema, input, 'official scenario', errors);
  unique(rawIds(input), 'official scenarios', errors);
  for (const scenario of parsed) {
    checkSourceIds(scenario, 'official scenario', index, errors);
    checkReferences(scenario.domainIds, index.domainIds, `official scenario ${scenario.id}`, 'domain', errors);
    if (!index.officialScenarioIds.has(scenario.id)) errors.push(`official scenario ${scenario.id}: id is not part of the official scenario set`);
  }
  for (const id of index.officialScenarioIds) {
    if (!parsed.some((scenario) => scenario.id === id)) errors.push(`official scenarios: ${id} is declared but has no entry`);
  }
  return errors;
}

export function validateSkills(input: unknown, index: ContentIndex): string[] {
  const errors: string[] = [];
  const parsed = parseEach(skillSchema, input, 'skill', errors);
  unique(rawIds(input), 'skills', errors);
  for (const skill of parsed) {
    if (!index.skillIds.has(skill.id)) errors.push(`skill ${skill.id}: id is not part of the skill taxonomy`);
  }
  for (const id of index.skillIds) {
    if (!parsed.some((skill) => skill.id === id)) errors.push(`skills: ${id} is declared but has no entry`);
  }
  return errors;
}

// Choice rationales live outside `questions.ts` so the quiz bundle stays lean,
// which means nothing but this check keeps the two in correspondence: every
// choice needs exactly one rationale, and no rationale may exist without a
// choice. Quality rules are enforced here too, since a rationale that repeats a
// sibling, the question explanation, or the other language teaches nothing.
export function validateChoiceRationales(
  input: unknown,
  questionInput: Array<{ id: string; choices: Array<{ id: string }>; explanation: LocalizedText }>,
): string[] {
  const errors: string[] = [];
  if (!isRecord(input)) {
    errors.push('choice rationales: expected an object keyed by question ID');
    return errors;
  }
  const questionIds = new Set(questionInput.map((question) => question.id));
  for (const id of Object.keys(input)) {
    if (!questionIds.has(id)) errors.push(`choice rationales: orphan question ${id}`);
  }
  for (const question of questionInput) {
    const label = `choice rationales ${question.id}`;
    const entry = input[question.id];
    if (!isRecord(entry)) {
      errors.push(`${label}: missing rationales for this question`);
      continue;
    }
    const choiceIds = new Set(question.choices.map((choice) => choice.id));
    for (const id of Object.keys(entry)) {
      if (!choiceIds.has(id)) errors.push(`${label}: orphan choice ${id}`);
    }
    const texts = new Map<string, string>();
    for (const choice of question.choices) {
      const result = localizedStringSchema.safeParse(entry[choice.id]);
      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push(`${label}: choice ${choice.id} ${issue.path.join('.') || '(root)'} ${issue.message}`);
        }
        continue;
      }
      const rationale = result.data;
      if (rationale.ja === rationale.en) errors.push(`${label}: choice ${choice.id} is identical in both languages`);
      for (const locale of ['ja', 'en'] as const) {
        if (rationale[locale] === question.explanation[locale]) {
          errors.push(`${label}: choice ${choice.id} ${locale} repeats the question explanation`);
        }
        const key = `${locale}:${rationale[locale]}`;
        const owner = texts.get(key);
        if (owner) errors.push(`${label}: choice ${choice.id} ${locale} repeats choice ${owner}`);
        else texts.set(key, choice.id);
      }
    }
  }
  return errors;
}

// A skill nobody tags is a classification the later analysis views can never
// report on, so the taxonomy and the question bank have to stay in step.
export function validateSkillCoverage(
  skillInput: Array<{ id: string }>,
  questionInput: Array<{ skills: string[] }>,
): string[] {
  const used = new Set(questionInput.flatMap((question) => question.skills));
  return skillInput
    .filter((skill) => !used.has(skill.id))
    .map((skill) => `skill ${skill.id}: no question uses this skill`);
}

export function validateScenarios(input: unknown, index: ContentIndex): string[] {
  const errors: string[] = [];
  const parsed = parseEach(scenarioSchema, input, 'scenario', errors);
  unique(rawIds(input), 'scenarios', errors);
  for (const scenario of parsed) {
    const label = `scenario ${scenario.id}`;
    checkSourceIds(scenario, 'scenario', index, errors);
    checkReferences(scenario.domainIds, index.domainIds, label, 'domain', errors);
    checkReferences(scenario.officialScenarioIds, index.officialScenarioIds, label, 'official scenario', errors);
    unique(scenario.domainIds, `${label} domainIds`, errors);
    unique(scenario.officialScenarioIds, `${label} officialScenarioIds`, errors);
  }
  return errors;
}

// Scenario practice only works when the case and its questions agree, so the
// linkage is checked across both collections.
export function validateScenarioQuestionLinks(
  scenarioInput: Array<{ id: string; domainIds: string[] }>,
  questionInput: Array<{ id: string; domainId: string; format: string; scenarioId?: string }>,
): string[] {
  const errors: string[] = [];
  const scenarioDomainIds = new Map(scenarioInput.map((scenario) => [scenario.id, new Set(scenario.domainIds)]));
  for (const question of questionInput) {
    if (question.scenarioId === undefined) continue;
    const declared = scenarioDomainIds.get(question.scenarioId);
    if (declared && !declared.has(question.domainId)) {
      errors.push(`question ${question.id}: domain ${question.domainId} is not declared on scenario ${question.scenarioId}`);
    }
  }
  for (const scenario of scenarioInput) {
    const linked = questionInput.filter((question) => question.scenarioId === scenario.id);
    if (linked.length < 3 || linked.length > 5) errors.push(`scenario ${scenario.id}: needs 3-5 questions, has ${linked.length}`);
    if (!linked.some((question) => question.format === 'single') || !linked.some((question) => question.format === 'multiple')) {
      errors.push(`scenario ${scenario.id}: needs both single and multiple questions`);
    }
  }
  return errors;
}

export function validateStudyGuideSections(input: unknown, index: ContentIndex): string[] {
  const errors: string[] = [];
  const parsed = parseEach(studyGuideSectionSchema, input, 'study guide section', errors);
  unique(rawIds(input), 'study guide sections', errors);
  unique(parsed.map((item) => String(item.recommendedOrder)), 'study guide recommendedOrder', errors);
  for (const section of parsed) {
    const label = `study guide section ${section.id}`;
    checkSourceIds(section, 'study guide section', index, errors);
    checkReferences(section.domainIds, index.domainIds, label, 'domain', errors);
    checkReferences(section.taskStatementIds, index.objectiveIds, label, 'task statement', errors);
    checkReferences(section.relatedCardIds, index.cardIds, label, 'card', errors);
    checkReferences(section.relatedQuestionIds, index.questionIds, label, 'question', errors);
  }
  return errors;
}

export function validateHandsOnGuides(input: unknown, index: ContentIndex): string[] {
  const errors: string[] = [];
  const parsed = parseEach(handsOnGuideSchema, input, 'hands-on guide', errors);
  unique(rawIds(input), 'hands-on guides', errors);
  for (const guide of parsed) {
    const label = `hands-on guide ${guide.id}`;
    checkSourceIds(guide, 'hands-on guide', index, errors);
    checkReferences(guide.domainIds, index.domainIds, label, 'domain', errors);
    checkReferences(guide.officialScenarioIds, index.officialScenarioIds, label, 'official scenario', errors);
    checkReferences(guide.relatedCardIds, index.cardIds, label, 'card', errors);
    checkReferences(guide.relatedQuestionIds, index.questionIds, label, 'question', errors);
    unique(guide.officialScenarioIds, `${label} officialScenarioIds`, errors);
    unique(guide.steps.map((step) => step.id), `${label} steps`, errors);
  }
  return errors;
}

export function validateContent() {
  const index = buildContentIndex();
  const errors = [
    ...validateSources(sources),
    ...validateDomains(domains, index),
    ...validateSkills(skills, index),
    ...validateSkillCoverage(skills, questions),
    ...validateCards(cards, index),
    ...validateQuestions(questions, index),
    ...validateChoiceRationales(choiceRationales, questions),
    ...validateOfficialScenarios(officialScenarios, index),
    ...validateScenarios(scenarios, index),
    ...validateScenarioQuestionLinks(scenarios, questions),
    ...validateStudyGuideSections(studyGuideSections, index),
    ...validateHandsOnGuides(handsOnGuides, index),
  ];

  for (const [id, skill] of Object.entries(skillById)) {
    if (skill.id !== id) errors.push(`skill ${id}: record key does not match its id ${skill.id}`);
  }
  for (const [id, scenario] of Object.entries(officialScenarioById)) {
    if (scenario.id !== id) errors.push(`official scenario ${id}: record key does not match its id ${scenario.id}`);
  }

  if (errors.length) throw new Error(`Content validation failed:\n${errors.join('\n')}`);
  return {
    sourceCount: sources.length,
    domainCount: domains.length,
    objectiveCount: index.objectiveIds.size,
    cardCount: cards.length,
    questionCount: questions.length,
    choiceRationaleCount: Object.values(choiceRationales).reduce((sum, entry) => sum + Object.keys(entry).length, 0),
    scenarioCount: scenarios.length,
    officialScenarioCount: officialScenarios.length,
    skillCount: skills.length,
    studyGuideSectionCount: studyGuideSections.length,
    handsOnGuideCount: handsOnGuides.length,
  };
}

export const contentStats = validateContent();
