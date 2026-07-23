import { describe, expect, it } from 'vitest';
import { cards } from './cards';
import { cardIndex, domainIndex } from './card-index';
import { domains } from './domains';
import { handsOnGuides } from './hands-on';
import { questions, standaloneQuestions } from './questions';
import { choiceRationales } from './rationales';
import { officialScenarioById, officialScenarios, scenarios } from './scenarios';
import { officialScenarioLearnings } from './official-scenarios';
import { skillById, skills } from './skills';
import { questionDifficulties } from './types';
import { sources } from './sources';
import { studyGuideSections } from './study-guide';
import { MOCK_EXAM_DOMAIN_DISTRIBUTION, MOCK_EXAM_QUESTION_COUNT } from '../lib/mock-exam-blueprint';
import {
  buildContentIndex,
  genericSourceIds,
  validateContent,
  validateChoiceRationales,
  validateDomains,
  validateHandsOnGuides,
  validateHandsOnThemes,
  validateOfficialScenarios,
  validateOfficialScenarioLearnings,
  validateOfficialScenarioLearningCoverage,
  validateQuestions,
  validateSkillCoverage,
  validateSkills,
  validateStudyGuideSections,
} from './validate';

describe('study content', () => {
  it('matches the July 2026 blueprint shape', () => {
    expect(validateContent()).toEqual({
      sourceCount: sources.length,
      domainCount: 5,
      objectiveCount: 30,
      cardCount: cards.length,
      questionCount: questions.length,
      choiceRationaleCount: 240,
      scenarioCount: scenarios.length,
      officialScenarioCount: 6,
      officialScenarioLearningCount: 6,
      skillCount: 14,
      studyGuideSectionCount: 8,
      handsOnGuideCount: 4,
    });
    expect(domains.map((domain) => domain.weight)).toEqual([27, 18, 20, 20, 15]);
  });

  it('has independently authored practice coverage in every domain', () => {
    expect(cards.length).toBeGreaterThanOrEqual(15);
    for (const domain of domains) {
      expect(cards.filter((card) => card.domainId === domain.id).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps the standalone question bank sized and distributed like the blueprint', () => {
    // #given — scenario questions are excluded from the random quiz pool, so
    // the blueprint distribution applies to the standalone bank only
    const total = standaloneQuestions.length;

    // #when
    const shareByDomain = domains.map((domain) => ({
      weight: domain.weight,
      share: (standaloneQuestions.filter((question) => question.domainId === domain.id).length / total) * 100,
    }));

    // #then
    expect(total).toBeGreaterThanOrEqual(20);
    for (const { weight, share } of shareByDomain) {
      expect(Math.abs(share - weight)).toBeLessThanOrEqual(6);
    }
  });

  it('supplies the full question bank in exactly the Mock Exam blueprint distribution', () => {
    // #given — the Mock Exam engine buckets the whole bank (standalone + scenario)
    // by domain, so the bank must meet the blueprint counts exactly to build a
    // 60-question exam. Asserted against the blueprint constants, not hardcoded IDs.
    const countByDomain = questions.reduce<Record<string, number>>((counts, question) => {
      counts[question.domainId] = (counts[question.domainId] ?? 0) + 1;
      return counts;
    }, {});

    // #then — total is exactly the blueprint size, and every domain meets its quota
    expect(questions.length).toBe(MOCK_EXAM_QUESTION_COUNT);
    expect(countByDomain).toEqual(MOCK_EXAM_DOMAIN_DISTRIBUTION);
  });

  it('keeps at least 30% of the standalone questions in multiple-select format', () => {
    // #given
    const multipleCount = standaloneQuestions.filter((question) => question.format === 'multiple').length;

    // #then
    expect(multipleCount / standaloneQuestions.length).toBeGreaterThanOrEqual(0.3);
  });

  it('marks correct choices consistently with each question format', () => {
    for (const question of questions) {
      const choiceIds = new Set(question.choices.map((choice) => choice.id));
      // #then
      expect(question.choices.length, question.id).toBeGreaterThanOrEqual(4);
      for (const correctId of question.correctChoiceIds) expect(choiceIds.has(correctId), question.id).toBe(true);
      if (question.format === 'single') expect(question.correctChoiceIds.length, question.id).toBe(1);
      else expect(question.correctChoiceIds.length, question.id).toBeGreaterThanOrEqual(2);
      expect(question.correctChoiceIds.length, question.id).toBeLessThan(question.choices.length);
    }
  });

  it('provides at least three scenarios, each with 3-5 linked questions mixing both formats', () => {
    // #given
    expect(scenarios.length).toBeGreaterThanOrEqual(3);

    for (const scenario of scenarios) {
      // #when
      const linked = questions.filter((question) => question.scenarioId === scenario.id);

      // #then
      expect(linked.length, scenario.id).toBeGreaterThanOrEqual(3);
      expect(linked.length, scenario.id).toBeLessThanOrEqual(5);
      expect(linked.some((question) => question.format === 'single'), scenario.id).toBe(true);
      expect(linked.some((question) => question.format === 'multiple'), scenario.id).toBe(true);
      for (const question of linked) expect(scenario.domainIds, question.id).toContain(question.domainId);
    }
  });

  it('links every scenario question to an existing scenario', () => {
    const scenarioIds = new Set(scenarios.map((scenario) => scenario.id));
    for (const question of questions) {
      if (question.scenarioId) expect(scenarioIds.has(question.scenarioId), question.id).toBe(true);
    }
  });

  it('keeps every scenario background between two and four paragraphs', () => {
    for (const scenario of scenarios) {
      for (const locale of ['ja', 'en'] as const) {
        expect(scenario.background[locale].length, scenario.id).toBeGreaterThanOrEqual(2);
        expect(scenario.background[locale].length, scenario.id).toBeLessThanOrEqual(4);
      }
    }
  });

  it('links every objective to the official exam guide', () => {
    for (const objective of domains.flatMap((domain) => domain.objectives)) {
      expect(objective.sourceIds).toContain('exam-guide');
    }
  });

  it('links every learning claim to at least one claim-specific official page', () => {
    for (const item of [...domains.flatMap((domain) => domain.objectives), ...cards]) {
      expect(item.sourceIds.some((sourceId) => !genericSourceIds.has(sourceId)), item.id).toBe(true);
    }
  });

  it('provides non-empty Japanese and English copy for every localized field', () => {
    const expectLocalizedText = (value: { ja: string; en: string }) => {
      expect(value.ja.trim()).not.toBe('');
      expect(value.en.trim()).not.toBe('');
    };
    const expectLocalizedList = (value: { ja: string[]; en: string[] }) => {
      for (const locale of ['ja', 'en'] as const) {
        expect(value[locale].length).toBeGreaterThan(0);
        for (const item of value[locale]) expect(item.trim()).not.toBe('');
      }
    };

    for (const domain of domains) {
      expectLocalizedText(domain.title);
      expectLocalizedText(domain.summary);
      for (const objective of domain.objectives) {
        expectLocalizedText(objective.title);
        expectLocalizedText(objective.summary);
        expectLocalizedList(objective.mustKnow);
      }
    }
    for (const card of cards) {
      expectLocalizedText(card.prompt);
      expectLocalizedText(card.answer);
      expectLocalizedText(card.explanation);
      expectLocalizedText(card.pitfall);
    }
    for (const question of questions) {
      expectLocalizedText(question.stem);
      expectLocalizedText(question.explanation);
      for (const choice of question.choices) {
        expectLocalizedText(choice.text);
        expectLocalizedText(choiceRationales[question.id][choice.id]);
      }
    }
    for (const scenario of scenarios) {
      expectLocalizedText(scenario.title);
      expectLocalizedList(scenario.background);
    }
  });
});

describe('question assessment metadata', () => {
  it('assigns a difficulty and at least one known skill to every question', () => {
    // #given
    const knownSkills = new Set(Object.keys(skillById));

    for (const question of questions) {
      // #then
      expect(questionDifficulties, question.id).toContain(question.difficulty);
      expect(question.skills.length, question.id).toBeGreaterThanOrEqual(1);
      for (const skill of question.skills) expect(knownSkills.has(skill), `${question.id}: ${skill}`).toBe(true);
    }
  });

  it('spreads difficulty across all three levels instead of tagging one value', () => {
    // #when
    const levels = new Set(questions.map((question) => question.difficulty));

    // #then
    expect(levels.size).toBe(questionDifficulties.length);
  });

  it('does not collapse the skill taxonomy onto the domain axis', () => {
    // #given — a skill used by questions from a single domain only would be a
    // renamed domain rather than a capability
    const domainsBySkill = new Map<string, Set<string>>();
    for (const question of questions) {
      for (const skill of question.skills) {
        domainsBySkill.set(skill, (domainsBySkill.get(skill) ?? new Set()).add(question.domainId));
      }
    }

    // #then
    const crossDomainSkills = [...domainsBySkill.values()].filter((domainIds) => domainIds.size > 1);
    expect(crossDomainSkills.length).toBeGreaterThanOrEqual(5);
  });

  it('gives every choice a rationale that is neither a copy of the explanation nor shared with a sibling', () => {
    // #then
    expect(validateChoiceRationales(choiceRationales, questions)).toEqual([]);
  });
});

describe('taxonomy validation', () => {
  it('rejects a skill entry that is not part of the taxonomy', () => {
    // #given — an index that does not know the skill being validated
    const index = buildContentIndex({ skillIds: ['agent-loop'] });

    // #when
    const errors = validateSkills(skills, index).join('\n');

    // #then
    expect(errors).toContain('is not part of the skill taxonomy');
  });

  it('reports a taxonomy entry that has no data', () => {
    // #given
    const index = buildContentIndex({ skillIds: [...Object.keys(skillById), 'rag-design'] });

    // #when
    const errors = validateSkills(skills, index).join('\n');

    // #then
    expect(errors).toContain('skills: rag-design is declared but has no entry');
  });

  it('reports an official scenario that is declared but missing from the data', () => {
    // #given
    const index = buildContentIndex();

    // #when
    const errors = validateOfficialScenarios(officialScenarios.slice(1), index).join('\n');

    // #then
    expect(errors).toContain('official scenarios: customer-support-resolution is declared but has no entry');
  });

  it('keeps every skill in the taxonomy attached to at least one question', () => {
    // #then
    expect(validateSkillCoverage(skills, questions)).toEqual([]);
  });

  it('reports a skill that no question uses', () => {
    // #given
    const unusedSkill = { id: 'rag-design' };

    // #when
    const errors = validateSkillCoverage([...skills, unusedSkill], questions).join('\n');

    // #then
    expect(errors).toContain('skill rag-design: no question uses this skill');
  });
});

describe('official domain blueprint validation', () => {
  const index = buildContentIndex();

  it('accepts the exact published domain and task-statement IDs', () => {
    expect(validateDomains(domains, index)).toEqual([]);
  });

  it('rejects a replacement domain ID even when the domain count is unchanged', () => {
    const input = structuredClone(domains);
    input[0].id = 'd9';

    const errors = validateDomains(input, index).join('\n');

    expect(errors).toContain('domain IDs must exactly match the official blueprint');
  });

  it('rejects a replacement task-statement ID even when the statement count is unchanged', () => {
    const input = structuredClone(domains);
    input[0].objectives[0].id = '1.9';

    const errors = validateDomains(input, index).join('\n');

    expect(errors).toContain('objective IDs must exactly match the official blueprint');
  });

  it('rejects a valid statement ID placed under the wrong domain', () => {
    const input = structuredClone(domains);
    const first = input[0].objectives[0].id;
    input[0].objectives[0].id = input[1].objectives[0].id;
    input[1].objectives[0].id = first;

    const errors = validateDomains(input, index).join('\n');

    expect(errors).toContain('objective 2.1: prefix must match domain d1');
    expect(errors).toContain('objective 1.1: prefix must match domain d2');
  });
});

describe('official scenario classification', () => {
  it('defines exactly the six official scenarios with matching record keys', () => {
    // #then
    expect(officialScenarios.length).toBe(6);
    for (const [id, scenario] of Object.entries(officialScenarioById)) expect(scenario.id).toBe(id);
  });

  it('maps every practice case onto at least one official scenario', () => {
    // #given
    const officialIds = new Set(Object.keys(officialScenarioById));

    for (const scenario of scenarios) {
      // #then
      expect(scenario.officialScenarioIds.length, scenario.id).toBeGreaterThanOrEqual(1);
      for (const id of scenario.officialScenarioIds) expect(officialIds.has(id), `${scenario.id}: ${id}`).toBe(true);
    }
  });

  it('separates the standalone bank from the scenario bank', () => {
    // #then
    expect(standaloneQuestions.every((question) => question.scenarioId === undefined)).toBe(true);
    expect(standaloneQuestions.length).toBe(questions.filter((question) => !question.scenarioId).length);
  });
});

describe('question validation', () => {
  const index = buildContentIndex();
  const localized = (ja: string, en: string) => ({ ja, en });
  const validQuestion = () => ({
    id: 'q-fixture',
    revision: 1,
    domainId: 'd1',
    objectiveIds: ['1.1'],
    format: 'single',
    difficulty: 'foundation',
    skills: ['agent-loop'],
    stem: localized('固定の設問文', 'A fixed stem'),
    choices: [
      { id: 'a', text: localized('選択肢A', 'Choice A') },
      { id: 'b', text: localized('選択肢B', 'Choice B') },
    ],
    correctChoiceIds: ['b'],
    explanation: localized('全体の解説', 'The overall explanation'),
    sourceIds: ['stop-reasons'],
    verifiedAt: '2026-07-14',
  });
  const withQuestion = (change: (question: ReturnType<typeof validQuestion>) => void) => {
    const question = validQuestion();
    change(question);
    return validateQuestions([question], index).join('\n');
  };

  it('accepts the real question bank', () => {
    // #then
    expect(validateQuestions(questions, index)).toEqual([]);
  });

  it('accepts a well-formed fixture', () => {
    // #then
    expect(validateQuestions([validQuestion()], index)).toEqual([]);
  });

  it('rejects a difficulty outside the taxonomy', () => {
    // #when
    const errors = withQuestion((question) => { question.difficulty = 'hard'; });

    // #then
    expect(errors).toContain('question q-fixture: difficulty');
  });

  it('rejects an empty skill list', () => {
    // #when
    const errors = withQuestion((question) => { question.skills = []; });

    // #then
    expect(errors).toContain('question q-fixture: skills');
  });

  it('rejects a skill that is not in the taxonomy', () => {
    // #when
    const errors = withQuestion((question) => { question.skills = ['prompt-tuning']; });

    // #then
    expect(errors).toContain('question q-fixture: orphan skill prompt-tuning');
  });

  it('rejects a duplicated skill', () => {
    // #when
    const errors = withQuestion((question) => { question.skills = ['agent-loop', 'agent-loop']; });

    // #then
    expect(errors).toContain('question q-fixture skills has duplicate IDs: agent-loop');
  });

  it('rejects a correct choice that does not exist', () => {
    // #when
    const errors = withQuestion((question) => { question.correctChoiceIds = ['z']; });

    // #then
    expect(errors).toContain('question q-fixture: correctChoiceIds z is not a choice');
  });

  it('rejects a single-select question with two correct choices', () => {
    // #when
    const errors = withQuestion((question) => { question.correctChoiceIds = ['a', 'b']; });

    // #then
    expect(errors).toContain('question q-fixture: single format requires exactly one correct choice');
  });

  it('rejects duplicated choice IDs', () => {
    // #when
    const errors = withQuestion((question) => { question.choices[1].id = 'a'; });

    // #then
    expect(errors).toContain('question q-fixture choices has duplicate IDs: a');
  });

  it('rejects a reference to a scenario that does not exist', () => {
    // #when
    const errors = validateQuestions(
      [{ ...validQuestion(), scenarioId: 'sc-does-not-exist' }],
      index,
    ).join('\n');

    // #then
    expect(errors).toContain('question q-fixture: orphan scenario sc-does-not-exist');
  });

  it('rejects duplicated question IDs', () => {
    // #when
    const errors = validateQuestions([validQuestion(), validQuestion()], index).join('\n');

    // #then
    expect(errors).toContain('questions has duplicate IDs: q-fixture');
  });

  it('reports every malformed entry instead of stopping at the first', () => {
    // #given
    const first = validQuestion();
    first.difficulty = 'hard';
    const second = validQuestion();
    second.id = 'q-fixture-2';
    second.skills = [];

    // #when
    const errors = validateQuestions([first, second], index).join('\n');

    // #then
    expect(errors).toContain('question q-fixture: difficulty');
    expect(errors).toContain('question q-fixture-2: skills');
  });
});

describe('choice rationale validation', () => {
  const localized = (ja: string, en: string) => ({ ja, en });
  const validQuestions = () => [{
    id: 'q-fixture',
    choices: [{ id: 'a' }, { id: 'b' }],
    explanation: localized('全体の解説', 'The overall explanation'),
  }];
  const validRationales = (): Record<string, Record<string, { ja: string; en: string }>> => ({
    'q-fixture': {
      a: localized('Aは問題文の条件を満たさない', 'A does not meet the stated condition'),
      b: localized('Bは条件をすべて満たす', 'B satisfies every stated condition'),
    },
  });

  it('accepts the real rationale map', () => {
    // #then
    expect(validateChoiceRationales(choiceRationales, questions)).toEqual([]);
  });

  it('accepts a well-formed fixture', () => {
    // #then
    expect(validateChoiceRationales(validRationales(), validQuestions())).toEqual([]);
  });

  it('rejects a question with no rationales at all', () => {
    // #when
    const errors = validateChoiceRationales({}, validQuestions()).join('\n');

    // #then
    expect(errors).toContain('choice rationales q-fixture: missing rationales for this question');
  });

  it('rejects a choice with no rationale', () => {
    // #given
    const rationales = validRationales();
    delete rationales['q-fixture'].b;

    // #when
    const errors = validateChoiceRationales(rationales, validQuestions()).join('\n');

    // #then
    expect(errors).toContain('choice rationales q-fixture: choice b');
  });

  it('rejects an empty Japanese rationale', () => {
    // #given
    const rationales = validRationales();
    rationales['q-fixture'].a = localized('  ', 'A does not meet the stated condition');

    // #when
    const errors = validateChoiceRationales(rationales, validQuestions()).join('\n');

    // #then
    expect(errors).toContain('choice rationales q-fixture: choice a ja');
  });

  it('rejects an empty English rationale', () => {
    // #given
    const rationales = validRationales();
    rationales['q-fixture'].b = localized('Bは条件をすべて満たす', '');

    // #when
    const errors = validateChoiceRationales(rationales, validQuestions()).join('\n');

    // #then
    expect(errors).toContain('choice rationales q-fixture: choice b en');
  });

  it('rejects a rationale shared by two choices', () => {
    // #given
    const rationales = validRationales();
    rationales['q-fixture'].b = rationales['q-fixture'].a;

    // #when
    const errors = validateChoiceRationales(rationales, validQuestions()).join('\n');

    // #then
    expect(errors).toContain('choice rationales q-fixture: choice b ja repeats choice a');
  });

  it('rejects a rationale copied from the question explanation', () => {
    // #given
    const rationales = validRationales();
    rationales['q-fixture'].a = localized('全体の解説', 'A does not meet the stated condition');

    // #when
    const errors = validateChoiceRationales(rationales, validQuestions()).join('\n');

    // #then
    expect(errors).toContain('choice rationales q-fixture: choice a ja repeats the question explanation');
  });

  it('rejects a rationale that is the same string in both languages', () => {
    // #given
    const rationales = validRationales();
    rationales['q-fixture'].a = localized('same text', 'same text');

    // #when
    const errors = validateChoiceRationales(rationales, validQuestions()).join('\n');

    // #then
    expect(errors).toContain('choice rationales q-fixture: choice a is identical in both languages');
  });

  it('rejects rationales for a question that does not exist', () => {
    // #given
    const rationales = { ...validRationales(), 'q-ghost': { a: localized('あ', 'a') } };

    // #when
    const errors = validateChoiceRationales(rationales, validQuestions()).join('\n');

    // #then
    expect(errors).toContain('choice rationales: orphan question q-ghost');
  });

  it('rejects a rationale for a choice that does not exist', () => {
    // #given
    const rationales = validRationales();
    rationales['q-fixture'].z = localized('存在しない選択肢', 'A choice that does not exist');

    // #when
    const errors = validateChoiceRationales(rationales, validQuestions()).join('\n');

    // #then
    expect(errors).toContain('choice rationales q-fixture: orphan choice z');
  });
});

describe('study guide validation', () => {
  const index = buildContentIndex();
  const validSections = () => structuredClone(studyGuideSections);
  const withSections = (change: (sections: ReturnType<typeof validSections>) => void) => {
    const sections = validSections();
    change(sections);
    return validateStudyGuideSections(sections, index).join('\n');
  };

  it('accepts the complete study guide blueprint', () => {
    expect(validateStudyGuideSections(studyGuideSections, index)).toEqual([]);
  });

  it('rejects orphan references', () => {
    const errors = withSections((sections) => {
      sections[0].domainIds = ['d9'];
      sections[0].taskStatementIds[0] = '9.9';
      sections[0].sourceIds = ['exam-guide', 'made-up-doc'];
      sections[0].relatedCardIds = ['d1-missing-card'];
      sections[0].relatedQuestionIds = ['q-missing'];
    });

    expect(errors).toContain('study guide section sg-agentic-loop: orphan domain d9');
    expect(errors).toContain('study guide section sg-agentic-loop: orphan task statement 9.9');
    expect(errors).toContain('study guide section sg-agentic-loop: orphan source made-up-doc');
    expect(errors).toContain('study guide section sg-agentic-loop: orphan card d1-missing-card');
    expect(errors).toContain('study guide section sg-agentic-loop: orphan question q-missing');
  });

  it('requires exact-once coverage of all 30 task statements', () => {
    const errors = withSections((sections) => { sections[0].taskStatementIds[0] = '1.2'; });

    expect(errors).toContain('study guide sections must exactly cover all 30 task statements');
    expect(errors).toContain('study guide task statements has duplicate IDs: 1.2');
  });

  it('requires every domain to be represented and aligned to its statements', () => {
    const errors = withSections((sections) => {
      sections[0].domainIds = ['d2'];
      sections[4].domainIds = ['d3'];
      sections[6].domainIds = ['d4'];
      sections[7].domainIds = ['d1'];
    });

    expect(errors).toContain('study guide sections must cover all five domains');
    expect(errors).toContain('study guide section sg-agentic-loop: domainIds must exactly match the domains of its task statements');
  });

  it('requires unique, contiguous recommended order beginning at one', () => {
    const duplicateErrors = withSections((sections) => { sections[1].recommendedOrder = 1; });
    const skippedErrors = withSections((sections) => {
      for (const section of sections) section.recommendedOrder += 1;
    });

    expect(duplicateErrors).toContain('study guide recommendedOrder has duplicate IDs: 1');
    expect(skippedErrors).toContain('study guide recommendedOrder must be contiguous from 1 through 8');
  });

  it('requires related cards and questions to intersect section task statements', () => {
    const errors = withSections((sections) => {
      sections[0].relatedCardIds = ['d2-interface'];
      sections[0].relatedQuestionIds = ['q-d2-tool-contract'];
    });

    expect(errors).toContain('study guide section sg-agentic-loop: related card d2-interface does not cover a section task statement');
    expect(errors).toContain('study guide section sg-agentic-loop: related question q-d2-tool-contract does not cover a section task statement');
  });

  it('requires related cards and questions to stay within section domains', () => {
    const card = cards.find((item) => item.id === 'd1-loop-stop');
    const question = questions.find((item) => item.id === 'q-d1-loop-continue');
    expect(card).toBeDefined();
    expect(question).toBeDefined();
    const originalCardDomainId = card!.domainId;
    const originalQuestionDomainId = question!.domainId;
    card!.domainId = 'd2';
    question!.domainId = 'd2';

    try {
      const errors = validateStudyGuideSections(validSections(), index).join('\n');

      expect(errors).toContain('study guide section sg-agentic-loop: related card d1-loop-stop is outside the section domains');
      expect(errors).toContain('study guide section sg-agentic-loop: related question q-d1-loop-continue is outside the section domains');
    } finally {
      card!.domainId = originalCardDomainId;
      question!.domainId = originalQuestionDomainId;
    }
  });

  it('requires a related card for every task statement', () => {
    const errors = withSections((sections) => { sections[0].relatedCardIds = ['d1-orchestration', 'd1-task-agent']; });

    expect(errors).toContain('study guide section sg-agentic-loop: task statement 1.1 has no related card');
  });

  it('requires claim-specific official sources', () => {
    const errors = withSections((sections) => { sections[0].sourceIds = ['exam-guide']; });

    expect(errors).toContain('study guide section sg-agentic-loop: missing claim-specific source');
  });

  it('requires a claim-specific source for every task statement', () => {
    const errors = withSections((sections) => {
      sections[0].sourceIds = ['exam-guide', 'stop-reasons', 'tool-use'];
    });

    expect(errors).toContain('study guide section sg-agentic-loop: task statement 1.2 is missing its claim-specific source');
  });

  it('requires Japanese and English learning-objective and key-point list parity', () => {
    const errors = withSections((sections) => {
      sections[0].learningObjectives.en.pop();
      sections[0].keyPoints.en.pop();
    });

    expect(errors).toContain('study guide section sg-agentic-loop: learningObjectives must have matching Japanese and English item counts');
    expect(errors).toContain('study guide section sg-agentic-loop: keyPoints must have matching Japanese and English item counts');
  });
});

describe('hands-on validation', () => {
  const index = buildContentIndex();
  const localized = (ja: string, en: string) => ({ ja, en });
  const localizedList = (ja: string[], en: string[]) => ({ ja, en });
  const validGuide = () => ({
    id: 'ho-fixture',
    revision: 1,
    title: localized('固定のハンズオン', 'A fixed hands-on guide'),
    summary: localized('ハンズオンの概要', 'The guide summary'),
    domainIds: ['d3'],
    taskStatementIds: ['3.6'],
    skillIds: ['claude-code-workflow'],
    officialScenarioIds: ['claude-code-ci'],
    learningObjectives: localizedList(['非対話実行を説明できる'], ['Explain non-interactive execution']),
    prerequisites: localizedList(['実行できる端末'], ['A machine that can run the CLI']),
    environment: localizedList(['Claude Code CLI'], ['The Claude Code CLI']),
    estimatedMinutes: 45,
    setup: localizedList(['リポジトリを用意する'], ['Prepare a repository']),
    steps: [
      {
        id: 'step-one',
        title: localized('手順1', 'Step one'),
        instructions: localizedList(['対象を決める'], ['Decide the target']),
        expectedResult: localizedList(['対象が決まっている'], ['The target is decided']),
      },
    ],
    deliverables: localizedList(['スクリプト'], ['A script']),
    verification: localizedList(['実行して確認する'], ['Run it and check']),
    troubleshooting: [
      {
        id: 'tp-one',
        symptom: localized('ジョブが止まる', 'The job hangs'),
        isolation: localized('非対話実行か確認する', 'Check it runs non-interactively'),
      },
    ],
    securityNotes: localizedList(['キーをシークレットで渡す'], ['Pass the key as a secret']),
    costNotes: localizedList(['小さな差分で試す'], ['Try a small diff first']),
    cleanup: localizedList(['ジョブを削除する'], ['Delete the job']),
    reflection: localizedList(['ローカルとCIの役割は'], ['What is local versus CI for']),
    relatedCardIds: ['d3-ci'],
    relatedQuestionIds: ['q-d3-ci-design'],
    sourceIds: ['exam-guide', 'headless'],
    verifiedAt: '2026-07-21',
  });
  const withGuide = (change: (guide: ReturnType<typeof validGuide>) => void) => {
    const guide = validGuide();
    change(guide);
    return validateHandsOnGuides([guide], index).join('\n');
  };

  it('accepts the real hands-on guides', () => {
    // #then
    expect(validateHandsOnGuides(handsOnGuides, index)).toEqual([]);
  });

  it('accepts a well-formed fixture', () => {
    // #then
    expect(validateHandsOnGuides([validGuide()], index)).toEqual([]);
  });

  it('rejects a zero estimated duration', () => {
    // #when
    const errors = withGuide((guide) => { guide.estimatedMinutes = 0; });

    // #then
    expect(errors).toContain('hands-on guide ho-fixture: estimatedMinutes');
  });

  it('rejects a negative estimated duration', () => {
    // #when
    const errors = withGuide((guide) => { guide.estimatedMinutes = -30; });

    // #then
    expect(errors).toContain('hands-on guide ho-fixture: estimatedMinutes');
  });

  it('rejects an empty step list', () => {
    // #when
    const errors = withGuide((guide) => { guide.steps = []; });

    // #then
    expect(errors).toContain('hands-on guide ho-fixture: steps');
  });

  it('rejects duplicated step IDs', () => {
    // #when
    const errors = withGuide((guide) => { guide.steps = [guide.steps[0], { ...guide.steps[0] }]; });

    // #then
    expect(errors).toContain('hands-on guide ho-fixture steps has duplicate IDs: step-one');
  });

  it('rejects a step with no instructions', () => {
    // #when
    const errors = withGuide((guide) => { guide.steps[0].instructions = localizedList([], []); });

    // #then
    expect(errors).toContain('hands-on guide ho-fixture: steps.0.instructions');
  });

  it('rejects a step whose title is missing one language', () => {
    // #when
    const errors = withGuide((guide) => { guide.steps[0].title = localized('手順1', ''); });

    // #then
    expect(errors).toContain('hands-on guide ho-fixture: steps.0.title.en');
  });

  it('rejects an official scenario that does not exist', () => {
    // #when
    const errors = withGuide((guide) => { guide.officialScenarioIds = ['agentic-rag']; });

    // #then
    expect(errors).toContain('hands-on guide ho-fixture: orphan official scenario agentic-rag');
  });

  it('rejects a source that does not exist', () => {
    // #when
    const errors = withGuide((guide) => { guide.sourceIds = ['exam-guide', 'made-up-doc']; });

    // #then
    expect(errors).toContain('hands-on guide ho-fixture: orphan source made-up-doc');
  });

  it('rejects a guide backed only by generic sources', () => {
    // #when
    const errors = withGuide((guide) => { guide.sourceIds = ['exam-guide']; });

    // #then
    expect(errors).toContain('hands-on guide ho-fixture: missing claim-specific source');
  });

  it('rejects empty deliverables', () => {
    // #when
    const errors = withGuide((guide) => { guide.deliverables = localizedList([], []); });

    // #then
    expect(errors).toContain('hands-on guide ho-fixture: deliverables');
  });

  it('rejects empty verification steps', () => {
    // #when
    const errors = withGuide((guide) => { guide.verification = localizedList([], []); });

    // #then
    expect(errors).toContain('hands-on guide ho-fixture: verification');
  });

  it('rejects prerequisites that are missing the Japanese list', () => {
    // #when
    const errors = withGuide((guide) => { guide.prerequisites = localizedList([], ['A machine that can run the CLI']); });

    // #then
    expect(errors).toContain('hands-on guide ho-fixture: prerequisites.ja');
  });

  it('rejects a related card that does not exist', () => {
    // #when
    const errors = withGuide((guide) => { guide.relatedCardIds = ['d3-missing-card']; });

    // #then
    expect(errors).toContain('hands-on guide ho-fixture: orphan card d3-missing-card');
  });

  it('rejects a duplicated source reference', () => {
    // #when
    const errors = withGuide((guide) => { guide.sourceIds = ['exam-guide', 'headless', 'headless']; });

    // #then
    expect(errors).toContain('hands-on guide ho-fixture sourceIds has duplicate IDs: headless');
  });

  it('rejects duplicated guide IDs', () => {
    // #when
    const errors = validateHandsOnGuides([validGuide(), validGuide()], index).join('\n');

    // #then
    expect(errors).toContain('hands-on guides has duplicate IDs: ho-fixture');
  });

  it('rejects a task statement that does not exist', () => {
    // #when
    const errors = withGuide((guide) => { guide.taskStatementIds = ['9.9']; guide.domainIds = ['d3']; });

    // #then
    expect(errors).toContain('hands-on guide ho-fixture: orphan task statement 9.9');
  });

  it('rejects a skill that does not exist', () => {
    // #when
    const errors = withGuide((guide) => { guide.skillIds = ['made-up-skill']; });

    // #then
    expect(errors).toContain('hands-on guide ho-fixture: orphan skill made-up-skill');
  });

  it('rejects domainIds that do not match the task statement domains', () => {
    // #given — 3.6 is a domain d3 task statement, but the guide claims d4
    // #when
    const errors = withGuide((guide) => { guide.domainIds = ['d4']; });

    // #then
    expect(errors).toContain('hands-on guide ho-fixture: domainIds must exactly match the domains of its task statements');
  });

  it('rejects a related card outside the guide domains', () => {
    // #given — d1-loop-stop is a domain d1 card, but the guide is d3
    // #when
    const errors = withGuide((guide) => { guide.relatedCardIds = ['d1-loop-stop']; });

    // #then
    expect(errors).toContain('hands-on guide ho-fixture: related card d1-loop-stop is outside the guide domains');
  });

  it('rejects a related card that covers no guide task statement', () => {
    // #given — d3-skills is a domain d3 card for 3.2, but the guide covers 3.6
    // #when
    const errors = withGuide((guide) => { guide.relatedCardIds = ['d3-skills']; });

    // #then
    expect(errors).toContain('hands-on guide ho-fixture: related card d3-skills does not cover a guide task statement');
  });

  it('rejects an empty troubleshooting list', () => {
    // #when
    const errors = withGuide((guide) => { guide.troubleshooting = []; });

    // #then
    expect(errors).toContain('hands-on guide ho-fixture: troubleshooting');
  });

  it('rejects duplicated troubleshooting IDs', () => {
    // #when
    const errors = withGuide((guide) => { guide.troubleshooting = [guide.troubleshooting[0], { ...guide.troubleshooting[0] }]; });

    // #then
    expect(errors).toContain('hands-on guide ho-fixture troubleshooting has duplicate IDs: tp-one');
  });

  it('rejects a step with no expected result', () => {
    // #when
    const errors = withGuide((guide) => { guide.steps[0].expectedResult = localizedList([], []); });

    // #then
    expect(errors).toContain('hands-on guide ho-fixture: steps.0.expectedResult');
  });

  it('rejects a list whose Japanese and English item counts differ', () => {
    // #when
    const errors = withGuide((guide) => { guide.environment = localizedList(['一つ', '二つ'], ['One']); });

    // #then
    expect(errors).toContain('hands-on guide ho-fixture: environment must have matching Japanese and English item counts');
  });

  it('rejects a step whose instruction counts differ across languages', () => {
    // #when
    const errors = withGuide((guide) => { guide.steps[0].instructions = localizedList(['一', '二'], ['One']); });

    // #then
    expect(errors).toContain('hands-on guide ho-fixture: step step-one instructions must have matching Japanese and English item counts');
  });

  it('rejects missing security notes', () => {
    // #when
    const errors = withGuide((guide) => { guide.securityNotes = localizedList([], []); });

    // #then
    expect(errors).toContain('hands-on guide ho-fixture: securityNotes');
  });

  it('reports a required theme that no guide covers', () => {
    // #given — the fixture covers only claude-code-ci
    // #when
    const errors = validateHandsOnThemes([validGuide()]).join('\n');

    // #then
    expect(errors).toContain('hands-on guides: required theme customer-support-resolution is not covered by any guide');
  });

  it('rejects two distinct theme guides that share an identical skill set', () => {
    // #given — two different guides on two required themes with identical skills
    const supportGuide = { id: 'ho-support', officialScenarioIds: ['customer-support-resolution'], skillIds: ['agent-loop'] };
    const ciGuide = { id: 'ho-ci', officialScenarioIds: ['claude-code-ci'], skillIds: ['agent-loop'] };

    // #when
    const errors = validateHandsOnThemes([supportGuide, ciGuide]).join('\n');

    // #then
    expect(errors).toContain('hands-on guides: theme guides ho-support and ho-ci share an identical skill set');
  });

  it('catches a duplicate when a theme has more than one guide', () => {
    // #given — the second claude-code-ci guide duplicates the support guide's skills
    const support = { id: 'ho-a', officialScenarioIds: ['customer-support-resolution'], skillIds: ['agent-loop'] };
    const ciFirst = { id: 'ho-b', officialScenarioIds: ['claude-code-ci'], skillIds: ['orchestration'] };
    const ciSecond = { id: 'ho-c', officialScenarioIds: ['claude-code-ci'], skillIds: ['agent-loop'] };
    const extraction = { id: 'ho-d', officialScenarioIds: ['structured-data-extraction'], skillIds: ['evaluation'] };
    const research = { id: 'ho-e', officialScenarioIds: ['multi-agent-research'], skillIds: ['context-management'] };

    // #when — guides[0]-only logic would miss ho-c; every carrier must be checked
    const errors = validateHandsOnThemes([support, ciFirst, ciSecond, extraction, research]).join('\n');

    // #then
    expect(errors).toContain('hands-on guides: theme guides ho-a and ho-c share an identical skill set');
  });

  it('does not flag a single guide that spans two required themes', () => {
    // #given — one guide carries two themes; deduped by id, it is not compared to itself
    const spanning = { id: 'ho-span', officialScenarioIds: ['customer-support-resolution', 'multi-agent-research'], skillIds: ['agent-loop', 'orchestration'] };
    const ci = { id: 'ho-ci', officialScenarioIds: ['claude-code-ci'], skillIds: ['claude-code-workflow'] };
    const extraction = { id: 'ho-ex', officialScenarioIds: ['structured-data-extraction'], skillIds: ['evaluation'] };

    // #when
    const errors = validateHandsOnThemes([spanning, ci, extraction]).join('\n');

    // #then — every required theme is covered and no distinct-skill error fires
    expect(errors).not.toContain('share an identical skill set');
  });

  it('keeps the ho-ci-review guide ID stable as the CI theme core', () => {
    // #then — the pre-existing guide ID must not be renamed
    expect(handsOnGuides.some((guide) => guide.id === 'ho-ci-review')).toBe(true);
  });

  it('covers four distinct required themes across the real guides', () => {
    // #given
    const themes = new Set(handsOnGuides.flatMap((guide) => guide.officialScenarioIds));

    // #then
    for (const theme of ['customer-support-resolution', 'claude-code-ci', 'structured-data-extraction', 'multi-agent-research']) {
      expect(themes.has(theme as (typeof handsOnGuides)[number]['officialScenarioIds'][number])).toBe(true);
    }
  });
});

describe('official scenario learning validation', () => {
  const index = buildContentIndex();
  const localized = (ja: string, en: string) => ({ ja, en });
  const localizedList = (ja: string[], en: string[]) => ({ ja, en });
  // A well-formed fixture for the customer-support scenario. Its domains
  // (d1/d2/d5) exactly match the domains of its task statements and are a subset
  // of what the classification axis declares.
  const validLearning = () => ({
    id: 'customer-support-resolution' as const,
    revision: 1,
    domainIds: ['d1', 'd2', 'd5'],
    taskStatementIds: ['1.1', '2.1', '5.2'],
    skillIds: ['agent-loop', 'human-oversight'],
    estimatedMinutes: 25,
    learningObjectives: localizedList(['分類できる'], ['Can classify']),
    requirements: localizedList(['曖昧な入力'], ['Ambiguous input']),
    decisionPoints: [
      {
        id: 'dp-one',
        decision: localized('単一かオーケストレーションか', 'Single or orchestration'),
        considerations: localizedList(['独立照会が多いか'], ['Are lookups independent']),
      },
    ],
    recommendedApproach: localizedList(['強い権限を分離する'], ['Isolate strong permissions']),
    rationale: localizedList(['誤選択を減らす'], ['Reduces wrong choices']),
    antiPatterns: [
      {
        id: 'ap-one',
        mistake: localized('全ツールを1エージェントに', 'One agent, all tools'),
        consequence: localized('取り違えが増える', 'More confusion'),
      },
    ],
    tradeoffs: [
      {
        id: 'to-one',
        condition: localized('単一照会が多い場合', 'When lookups are simple'),
        shift: localized('単一構成が妥当になりうる', 'A single agent can be fine'),
      },
    ],
    relatedPracticeScenarioIds: ['sc-support-agents'],
    relatedHandsOnGuideIds: ['ho-support-agent-escalation'],
    relatedCardIds: ['d1-loop-stop', 'd2-interface'],
    relatedQuestionIds: ['q-d1-loop-continue', 'q-d5-escalation'],
    sourceIds: ['exam-guide', 'user-input'],
    verifiedAt: '2026-07-21',
  });
  const withLearning = (change: (learning: ReturnType<typeof validLearning>) => void) => {
    const learning = validLearning();
    change(learning);
    return validateOfficialScenarioLearnings([learning], index).join('\n');
  };

  it('accepts the real official scenario learnings', () => {
    // #then
    expect(validateOfficialScenarioLearnings(officialScenarioLearnings, index)).toEqual([]);
  });

  it('covers exactly the six official scenarios, once each, with matching record keys', () => {
    // #then
    expect(officialScenarioLearnings.length).toBe(6);
    const ids = officialScenarioLearnings.map((learning) => learning.id);
    expect(new Set(ids).size).toBe(6);
    for (const id of Object.keys(officialScenarioById)) {
      expect(ids).toContain(id);
    }
  });

  it('accepts a well-formed fixture', () => {
    // #then
    expect(validateOfficialScenarioLearnings([validLearning()], index)).toEqual([]);
  });

  it('accepts the real coverage across all six scenarios and five domains', () => {
    // #then
    expect(validateOfficialScenarioLearningCoverage(officialScenarioLearnings, index)).toEqual([]);
  });

  it('reports a scenario that is declared but has no learning entry', () => {
    // #when
    const errors = validateOfficialScenarioLearningCoverage(officialScenarioLearnings.slice(1), index).join('\n');

    // #then
    expect(errors).toContain('official scenario learnings: customer-support-resolution is declared but has no learning entry');
  });

  it('reports when the five domains are not fully covered', () => {
    // #when — keep only the customer-support entry (d1/d2/d5); d3 and d4 go uncovered
    const errors = validateOfficialScenarioLearningCoverage(
      officialScenarioLearnings.filter((learning) => learning.id === 'customer-support-resolution'),
      index,
    ).join('\n');

    // #then
    expect(errors).toContain('official scenario learnings must cover all five domains');
  });

  it('rejects an id outside the official scenario set', () => {
    // #when
    const errors = withLearning((learning) => { (learning as { id: string }).id = 'agentic-rag'; });

    // #then
    expect(errors).toContain('official scenario learning agentic-rag: id is not part of the official scenario set');
  });

  it('rejects duplicated learning IDs', () => {
    // #when
    const errors = validateOfficialScenarioLearnings([validLearning(), validLearning()], index).join('\n');

    // #then
    expect(errors).toContain('official scenario learnings has duplicate IDs: customer-support-resolution');
  });

  it('rejects a non-positive revision', () => {
    // #when
    const errors = withLearning((learning) => { learning.revision = 0; });

    // #then
    expect(errors).toContain('official scenario learning customer-support-resolution: revision');
  });

  it('rejects a task statement that does not exist', () => {
    // #when
    const errors = withLearning((learning) => { learning.taskStatementIds = ['1.1', '9.9']; });

    // #then
    expect(errors).toContain('official scenario learning customer-support-resolution: orphan task statement 9.9');
  });

  it('rejects a skill that does not exist', () => {
    // #when
    const errors = withLearning((learning) => { learning.skillIds = ['agent-loop', 'made-up-skill']; });

    // #then
    expect(errors).toContain('official scenario learning customer-support-resolution: orphan skill made-up-skill');
  });

  it('rejects domainIds that do not match the domains of the task statements', () => {
    // #when — task statements are d1/d2/d5, but d3 is added
    const errors = withLearning((learning) => { learning.domainIds = ['d1', 'd2', 'd5', 'd3']; });

    // #then
    expect(errors).toContain('official scenario learning customer-support-resolution: domainIds must exactly match the domains of its task statements');
  });

  it('rejects a domain not declared on the classification axis', () => {
    // #when — d3 tasks and domains are self-consistent but d3 is not on customer-support classification (d1/d2/d5)
    const errors = withLearning((learning) => {
      learning.taskStatementIds = ['1.1', '3.1'];
      learning.domainIds = ['d1', 'd3'];
    });

    // #then
    expect(errors).toContain('official scenario learning customer-support-resolution: domain d3 is not declared on the official scenario classification');
  });

  it('rejects a related practice scenario that does not reference this official scenario', () => {
    // #when — sc-extraction-pipeline exists but does not list customer-support-resolution
    const errors = withLearning((learning) => { learning.relatedPracticeScenarioIds = ['sc-extraction-pipeline']; });

    // #then
    expect(errors).toContain('official scenario learning customer-support-resolution: related practice scenario sc-extraction-pipeline does not reference this official scenario');
  });

  it('rejects a related practice scenario that does not exist', () => {
    // #when
    const errors = withLearning((learning) => { learning.relatedPracticeScenarioIds = ['sc-made-up']; });

    // #then
    expect(errors).toContain('official scenario learning customer-support-resolution: orphan practice scenario sc-made-up');
  });

  it('rejects a related hands-on guide that does not reference this official scenario', () => {
    // #when — ho-ci-review exists but references claude-code-ci, not customer-support
    const errors = withLearning((learning) => { learning.relatedHandsOnGuideIds = ['ho-ci-review']; });

    // #then
    expect(errors).toContain('official scenario learning customer-support-resolution: related hands-on guide ho-ci-review does not reference this official scenario');
  });

  it('rejects a related hands-on guide that does not exist', () => {
    // #when
    const errors = withLearning((learning) => { learning.relatedHandsOnGuideIds = ['ho-made-up']; });

    // #then
    expect(errors).toContain('official scenario learning customer-support-resolution: orphan hands-on guide ho-made-up');
  });

  it('accepts an empty related hands-on guide list', () => {
    // #then — not every official scenario has a hands-on guide
    const errors = withLearning((learning) => { learning.relatedHandsOnGuideIds = []; });
    expect(errors).toBe('');
  });

  it('rejects a related card that does not support a task statement', () => {
    // #when — d3-ci covers 3.6, not any of 1.1/2.1/5.2
    const errors = withLearning((learning) => { learning.relatedCardIds = ['d3-ci']; });

    // #then
    expect(errors).toContain('official scenario learning customer-support-resolution: related card d3-ci does not support a task statement');
  });

  it('rejects a related question that supports neither a task statement nor a skill', () => {
    // #when — q-d3-glob covers 3.3 with skill claude-code-configuration; neither is in the fixture
    const errors = withLearning((learning) => { learning.relatedQuestionIds = ['q-d3-glob']; });

    // #then
    expect(errors).toContain('official scenario learning customer-support-resolution: related question q-d3-glob does not support a task statement or skill');
  });

  it('accepts a related question supported only by a shared skill', () => {
    // #then — q-d5-escalation has skill human-oversight, which the fixture lists
    const errors = withLearning((learning) => { learning.relatedQuestionIds = ['q-d5-escalation']; });
    expect(errors).toBe('');
  });

  it('rejects duplicated decision point IDs', () => {
    // #when
    const errors = withLearning((learning) => { learning.decisionPoints = [learning.decisionPoints[0], { ...learning.decisionPoints[0] }]; });

    // #then
    expect(errors).toContain('official scenario learning customer-support-resolution decisionPoints has duplicate IDs: dp-one');
  });

  it('rejects an empty anti-pattern list', () => {
    // #when
    const errors = withLearning((learning) => { learning.antiPatterns = []; });

    // #then
    expect(errors).toContain('official scenario learning customer-support-resolution: antiPatterns');
  });

  it('rejects a duplicate reference in a related list', () => {
    // #when
    const errors = withLearning((learning) => { learning.relatedCardIds = ['d1-loop-stop', 'd1-loop-stop']; });

    // #then
    expect(errors).toContain('official scenario learning customer-support-resolution relatedCardIds has duplicate IDs: d1-loop-stop');
  });

  it('rejects mismatched Japanese and English item counts', () => {
    // #when
    const errors = withLearning((learning) => { learning.requirements = localizedList(['a', 'b'], ['a']); });

    // #then
    expect(errors).toContain('official scenario learning customer-support-resolution: requirements must have matching Japanese and English item counts');
  });

  it('rejects mismatched item counts inside a decision point', () => {
    // #when
    const errors = withLearning((learning) => { learning.decisionPoints[0].considerations = localizedList(['a', 'b'], ['a']); });

    // #then
    expect(errors).toContain('official scenario learning customer-support-resolution: decisionPoint dp-one considerations must have matching Japanese and English item counts');
  });

  it('rejects an empty string in a learning objective', () => {
    // #when
    const errors = withLearning((learning) => { learning.learningObjectives = localizedList([''], ['']); });

    // #then
    expect(errors).toContain('official scenario learning customer-support-resolution: learningObjectives');
  });

  it('requires at least one claim-specific source', () => {
    // #when — only generic sources
    const errors = withLearning((learning) => { learning.sourceIds = ['exam-guide']; });

    // #then
    expect(errors).toContain('official scenario learning customer-support-resolution: missing claim-specific source');
  });

  it('rejects an invalid verification date', () => {
    // #when
    const errors = withLearning((learning) => { learning.verifiedAt = '2026-02-30'; });

    // #then
    expect(errors).toContain('official scenario learning customer-support-resolution: verifiedAt');
  });
});


describe('content spine (card-index) stays in sync with full content', () => {
  it('cardIndex matches cards one-for-one in order with id/domainId/revision', () => {
    // #then the eager spine never drifts from the single source of truth in cards.ts
    expect(cardIndex).toEqual(cards.map((card) => ({ id: card.id, domainId: card.domainId, revision: card.revision })));
  });

  it('domainIndex matches domains in order with id/number/weight/title', () => {
    // #then Blueprint relies on domain order (node-N classes), so order must match
    expect(domainIndex).toEqual(domains.map((domain) => ({ id: domain.id, number: domain.number, weight: domain.weight, title: domain.title })));
  });
});
