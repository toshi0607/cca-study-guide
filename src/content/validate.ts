import { z } from 'zod';
import type { LocalizedText, OfficialScenarioId } from './types';
import { questionDifficulties } from './types';
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
  expectedResult: localizedStringArraySchema,
});
const handsOnPitfallSchema = z.object({
  id: z.string().min(1),
  symptom: localizedStringSchema,
  isolation: localizedStringSchema,
}).strict();
const handsOnGuideSchema = z.object({
  id: z.string().min(1),
  revision: z.number().int().positive(),
  title: localizedStringSchema,
  summary: localizedStringSchema,
  domainIds: requiredIdListSchema,
  taskStatementIds: requiredIdListSchema,
  skillIds: requiredIdListSchema,
  officialScenarioIds: requiredIdListSchema,
  learningObjectives: localizedStringArraySchema,
  prerequisites: localizedStringArraySchema,
  environment: localizedStringArraySchema,
  estimatedMinutes: z.number().int().positive(),
  setup: localizedStringArraySchema,
  steps: z.array(handsOnStepSchema).min(1),
  deliverables: localizedStringArraySchema,
  verification: localizedStringArraySchema,
  troubleshooting: z.array(handsOnPitfallSchema).min(1),
  securityNotes: localizedStringArraySchema,
  costNotes: localizedStringArraySchema,
  cleanup: localizedStringArraySchema.optional(),
  reflection: localizedStringArraySchema,
  relatedCardIds: requiredIdListSchema,
  relatedQuestionIds: requiredIdListSchema,
  sourceIds: requiredIdListSchema,
  verifiedAt: date,
});

export const genericSourceIds = new Set(['exam-guide', 'cert', 'announcement', 'code-index', 'platform-index']);

// The exam guide defines this fixed taxonomy. Counts alone are not enough:
// replacing one ID with another could otherwise leave a seemingly complete
// thirty-objective data set that no longer matches the published blueprint.
const officialDomainBlueprint = [
  { id: 'd1', number: 1, objectiveIds: ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7'] },
  { id: 'd2', number: 2, objectiveIds: ['2.1', '2.2', '2.3', '2.4', '2.5'] },
  { id: 'd3', number: 3, objectiveIds: ['3.1', '3.2', '3.3', '3.4', '3.5', '3.6'] },
  { id: 'd4', number: 4, objectiveIds: ['4.1', '4.2', '4.3', '4.4', '4.5', '4.6'] },
  { id: 'd5', number: 5, objectiveIds: ['5.1', '5.2', '5.3', '5.4', '5.5', '5.6'] },
] as const;
const officialDomainIds = new Set(officialDomainBlueprint.map((domain) => domain.id));
const officialObjectiveIds = new Set(officialDomainBlueprint.flatMap((domain) => domain.objectiveIds));

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
  const parsedDomainIds = new Set(parsed.map((domain) => domain.id));
  if (
    parsedDomainIds.size !== officialDomainIds.size
    || [...officialDomainIds].some((id) => !parsedDomainIds.has(id))
  ) {
    errors.push('domain IDs must exactly match the official blueprint');
  }
  const parsedObjectiveIds = new Set(objectives.map((objective) => objective.id));
  if (
    parsedObjectiveIds.size !== officialObjectiveIds.size
    || [...officialObjectiveIds].some((id) => !parsedObjectiveIds.has(id))
  ) {
    errors.push('objective IDs must exactly match the official blueprint');
  }
  for (const domain of parsed) {
    if (domain.id !== `d${domain.number}`) {
      errors.push(`domain ${domain.id}: ID must match domain number ${domain.number}`);
    }
    for (const objective of domain.objectives) {
      if (!objective.id.startsWith(`${domain.number}.`)) {
        errors.push(`objective ${objective.id}: prefix must match domain ${domain.id}`);
      }
    }
  }
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
    unique(scenario.domainIds, `official scenario ${scenario.id} domainIds`, errors);
    unique(scenario.sourceIds, `official scenario ${scenario.id} sourceIds`, errors);
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
    unique(scenario.sourceIds, `${label} sourceIds`, errors);
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

  const objectiveDomainById = new Map(
    domains.flatMap((domain) => domain.objectives.map((objective) => [objective.id, domain.id] as const)),
  );
  const objectiveById = new Map(domains.flatMap((domain) => domain.objectives.map((objective) => [objective.id, objective] as const)));
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const questionById = new Map(questions.map((question) => [question.id, question]));

  for (const section of parsed) {
    const label = `study guide section ${section.id}`;
    checkSourceIds(section, 'study guide section', index, errors);
    checkReferences(section.domainIds, index.domainIds, label, 'domain', errors);
    checkReferences(section.taskStatementIds, index.objectiveIds, label, 'task statement', errors);
    checkReferences(section.relatedCardIds, index.cardIds, label, 'card', errors);
    checkReferences(section.relatedQuestionIds, index.questionIds, label, 'question', errors);
    for (const [field, ids] of [
      ['domainIds', section.domainIds],
      ['taskStatementIds', section.taskStatementIds],
      ['relatedCardIds', section.relatedCardIds],
      ['relatedQuestionIds', section.relatedQuestionIds],
      ['sourceIds', section.sourceIds],
    ] as const) {
      unique(ids, `${label} ${field}`, errors);
    }

    const taskStatementIds = new Set(section.taskStatementIds);
    const expectedDomainIds = new Set(
      section.taskStatementIds.flatMap((id) => {
        const domainId = objectiveDomainById.get(id);
        return domainId === undefined ? [] : [domainId];
      }),
    );
    const declaredDomainIds = new Set(section.domainIds);
    if (
      expectedDomainIds.size !== declaredDomainIds.size
      || [...expectedDomainIds].some((id) => !declaredDomainIds.has(id))
    ) {
      errors.push(`${label}: domainIds must exactly match the domains of its task statements`);
    }

    for (const [kind, ids, byId] of [
      ['card', section.relatedCardIds, cardById],
      ['question', section.relatedQuestionIds, questionById],
    ] as const) {
      for (const id of ids) {
        const item = byId.get(id);
        if (item && !item.objectiveIds.some((objectiveId) => taskStatementIds.has(objectiveId))) {
          errors.push(`${label}: related ${kind} ${id} does not cover a section task statement`);
        }
        if (item && !declaredDomainIds.has(item.domainId)) {
          errors.push(`${label}: related ${kind} ${id} is outside the section domains`);
        }
      }
    }

    for (const taskStatementId of section.taskStatementIds) {
      const hasRelatedCard = section.relatedCardIds.some((cardId) =>
        cardById.get(cardId)?.objectiveIds.includes(taskStatementId),
      );
      if (!hasRelatedCard) errors.push(`${label}: task statement ${taskStatementId} has no related card`);

      const claimSpecificSourceIds = objectiveById.get(taskStatementId)?.sourceIds
        .filter((sourceId) => !genericSourceIds.has(sourceId)) ?? [];
      if (!section.sourceIds.some((sourceId) => claimSpecificSourceIds.includes(sourceId))) {
        errors.push(`${label}: task statement ${taskStatementId} is missing its claim-specific source`);
      }
    }

    if (section.learningObjectives.ja.length !== section.learningObjectives.en.length) {
      errors.push(`${label}: learningObjectives must have matching Japanese and English item counts`);
    }
    if (section.keyPoints.ja.length !== section.keyPoints.en.length) {
      errors.push(`${label}: keyPoints must have matching Japanese and English item counts`);
    }
  }

  const allTaskStatementIds = parsed.flatMap((section) => section.taskStatementIds);
  unique(allTaskStatementIds, 'study guide task statements', errors);
  const expectedTaskStatementIds = new Set(domains.flatMap((domain) => domain.objectives.map((objective) => objective.id)));
  const actualTaskStatementIds = new Set(allTaskStatementIds);
  if (
    allTaskStatementIds.length !== expectedTaskStatementIds.size
    || actualTaskStatementIds.size !== expectedTaskStatementIds.size
    || [...expectedTaskStatementIds].some((id) => !actualTaskStatementIds.has(id))
  ) {
    errors.push('study guide sections must exactly cover all 30 task statements');
  }

  const coveredDomainIds = new Set(parsed.flatMap((section) => section.domainIds));
  if (coveredDomainIds.size !== index.domainIds.size || [...index.domainIds].some((id) => !coveredDomainIds.has(id))) {
    errors.push('study guide sections must cover all five domains');
  }

  const orders = parsed.map((section) => section.recommendedOrder).sort((left, right) => left - right);
  if (orders.some((order, index) => order !== index + 1)) {
    errors.push(`study guide recommendedOrder must be contiguous from 1 through ${orders.length}`);
  }
  return errors;
}

// The four themes Task 5 must cover, expressed as the official scenario each
// maps to. Every one must be exercised by at least one guide, and the guides
// carrying them must offer distinct implementation experiences.
const requiredHandsOnThemes: OfficialScenarioId[] = [
  'customer-support-resolution',
  'claude-code-ci',
  'structured-data-extraction',
  'multi-agent-research',
];

export function validateHandsOnGuides(input: unknown, index: ContentIndex): string[] {
  const errors: string[] = [];
  const parsed = parseEach(handsOnGuideSchema, input, 'hands-on guide', errors);
  unique(rawIds(input), 'hands-on guides', errors);

  const objectiveDomainById = new Map(
    domains.flatMap((domain) => domain.objectives.map((objective) => [objective.id, domain.id] as const)),
  );
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const questionById = new Map(questions.map((question) => [question.id, question]));

  for (const guide of parsed) {
    const label = `hands-on guide ${guide.id}`;
    checkSourceIds(guide, 'hands-on guide', index, errors);
    checkReferences(guide.domainIds, index.domainIds, label, 'domain', errors);
    checkReferences(guide.taskStatementIds, index.objectiveIds, label, 'task statement', errors);
    checkReferences(guide.skillIds, index.skillIds, label, 'skill', errors);
    checkReferences(guide.officialScenarioIds, index.officialScenarioIds, label, 'official scenario', errors);
    checkReferences(guide.relatedCardIds, index.cardIds, label, 'card', errors);
    checkReferences(guide.relatedQuestionIds, index.questionIds, label, 'question', errors);
    for (const [field, ids] of [
      ['domainIds', guide.domainIds],
      ['taskStatementIds', guide.taskStatementIds],
      ['skillIds', guide.skillIds],
      ['officialScenarioIds', guide.officialScenarioIds],
      ['relatedCardIds', guide.relatedCardIds],
      ['relatedQuestionIds', guide.relatedQuestionIds],
      ['sourceIds', guide.sourceIds],
    ] as const) {
      unique(ids, `${label} ${field}`, errors);
    }
    unique(guide.steps.map((step) => step.id), `${label} steps`, errors);
    unique(guide.troubleshooting.map((pitfall) => pitfall.id), `${label} troubleshooting`, errors);

    // domainIds must be exactly the set of domains its task statements belong to.
    const taskStatementIds = new Set(guide.taskStatementIds);
    const expectedDomainIds = new Set(
      guide.taskStatementIds.flatMap((id) => {
        const domainId = objectiveDomainById.get(id);
        return domainId === undefined ? [] : [domainId];
      }),
    );
    const declaredDomainIds = new Set(guide.domainIds);
    if (
      expectedDomainIds.size !== declaredDomainIds.size
      || [...expectedDomainIds].some((id) => !declaredDomainIds.has(id))
    ) {
      errors.push(`${label}: domainIds must exactly match the domains of its task statements`);
    }

    // Related cards and questions must sit inside the guide's domains and cover
    // at least one of its task statements, so a link never sends the learner to
    // material outside the exercise.
    for (const [kind, ids, byId] of [
      ['card', guide.relatedCardIds, cardById],
      ['question', guide.relatedQuestionIds, questionById],
    ] as const) {
      for (const id of ids) {
        const item = byId.get(id);
        if (item && !item.objectiveIds.some((objectiveId) => taskStatementIds.has(objectiveId))) {
          errors.push(`${label}: related ${kind} ${id} does not cover a guide task statement`);
        }
        if (item && !declaredDomainIds.has(item.domainId)) {
          errors.push(`${label}: related ${kind} ${id} is outside the guide domains`);
        }
      }
    }

    // ja/en lists correspond item by item, so their lengths must match.
    const listFields: Array<[string, LocalizedText<string[]> | undefined]> = [
      ['learningObjectives', guide.learningObjectives],
      ['prerequisites', guide.prerequisites],
      ['environment', guide.environment],
      ['setup', guide.setup],
      ['deliverables', guide.deliverables],
      ['verification', guide.verification],
      ['securityNotes', guide.securityNotes],
      ['costNotes', guide.costNotes],
      ['reflection', guide.reflection],
      ['cleanup', guide.cleanup],
    ];
    for (const step of guide.steps) {
      listFields.push([`step ${step.id} instructions`, step.instructions]);
      listFields.push([`step ${step.id} expectedResult`, step.expectedResult]);
    }
    for (const [field, value] of listFields) {
      if (value && value.ja.length !== value.en.length) {
        errors.push(`${label}: ${field} must have matching Japanese and English item counts`);
      }
    }
  }

  return errors;
}

// A cross-guide check kept apart from per-guide validation: every required theme
// must be present in the full set, and no two distinct guides that carry a
// required theme may share an identical skill set, so they cannot become
// near-duplicate exercises. Guides are deduped by id, so a single guide that
// legitimately spans two themes is compared once, not flagged against itself,
// and every theme-carrying guide is checked (not only the first per theme).
export function validateHandsOnThemes(
  guideInput: Array<{ id: string; officialScenarioIds: string[]; skillIds: string[] }>,
): string[] {
  const errors: string[] = [];
  const themeCarriers = new Map<string, { id: string; skillIds: string[] }>();
  for (const theme of requiredHandsOnThemes) {
    const guides = guideInput.filter((guide) => guide.officialScenarioIds.includes(theme));
    if (guides.length === 0) {
      errors.push(`hands-on guides: required theme ${theme} is not covered by any guide`);
    }
    for (const guide of guides) themeCarriers.set(guide.id, guide);
  }
  const signatureOwner = new Map<string, string>();
  for (const guide of themeCarriers.values()) {
    const signature = [...guide.skillIds].sort().join('+');
    const owner = signatureOwner.get(signature);
    if (owner) {
      errors.push(`hands-on guides: theme guides ${owner} and ${guide.id} share an identical skill set`);
    } else {
      signatureOwner.set(signature, guide.id);
    }
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
    ...validateHandsOnThemes(handsOnGuides),
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
