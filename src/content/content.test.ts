import { describe, expect, it } from 'vitest';
import { cards } from './cards';
import { domains } from './domains';
import { handsOnGuides } from './hands-on';
import { questions, standaloneQuestions } from './questions';
import { officialScenarioById, officialScenarios, scenarios } from './scenarios';
import { skillById, skills } from './skills';
import { sources } from './sources';
import { studyGuideSections } from './study-guide';
import {
  buildContentIndex,
  genericSourceIds,
  validateContent,
  validateHandsOnGuides,
  validateOfficialScenarios,
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
      scenarioCount: scenarios.length,
      officialScenarioCount: 6,
      skillCount: 14,
      studyGuideSectionCount: 3,
      handsOnGuideCount: 1,
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
        expectLocalizedText(choice.rationale);
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
      expect(['foundation', 'application', 'analysis'], question.id).toContain(question.difficulty);
      expect(question.skills.length, question.id).toBeGreaterThanOrEqual(1);
      for (const skill of question.skills) expect(knownSkills.has(skill), `${question.id}: ${skill}`).toBe(true);
    }
  });

  it('spreads difficulty across all three levels instead of tagging one value', () => {
    // #when
    const levels = new Set(questions.map((question) => question.difficulty));

    // #then
    expect(levels.size).toBe(3);
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
    for (const question of questions) {
      for (const locale of ['ja', 'en'] as const) {
        // #when
        const rationales = question.choices.map((choice) => choice.rationale[locale]);

        // #then
        expect(new Set(rationales).size, `${question.id} ${locale}`).toBe(rationales.length);
        for (const rationale of rationales) {
          expect(rationale, `${question.id} ${locale}`).not.toBe(question.explanation[locale]);
        }
      }
      for (const choice of question.choices) {
        expect(choice.rationale.ja, `${question.id} ${choice.id}`).not.toBe(choice.rationale.en);
      }
    }
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
      { id: 'a', text: localized('選択肢A', 'Choice A'), rationale: localized('Aが誤りである理由', 'Why A is wrong') },
      { id: 'b', text: localized('選択肢B', 'Choice B'), rationale: localized('Bが正しい理由', 'Why B is right') },
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

  it('rejects a choice whose Japanese rationale is empty', () => {
    // #when
    const errors = withQuestion((question) => { question.choices[0].rationale = localized('  ', 'Why A is wrong'); });

    // #then
    expect(errors).toContain('question q-fixture: choices.0.rationale.ja');
  });

  it('rejects a choice whose English rationale is empty', () => {
    // #when
    const errors = withQuestion((question) => { question.choices[1].rationale = localized('Bが正しい理由', ''); });

    // #then
    expect(errors).toContain('question q-fixture: choices.1.rationale.en');
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

describe('study guide validation', () => {
  const index = buildContentIndex();
  const localized = (ja: string, en: string) => ({ ja, en });
  const localizedList = (ja: string[], en: string[]) => ({ ja, en });
  const validSection = () => ({
    id: 'sg-fixture',
    revision: 1,
    recommendedOrder: 1,
    title: localized('固定のセクション', 'A fixed section'),
    summary: localized('セクションの概要', 'The section summary'),
    domainIds: ['d1'],
    taskStatementIds: ['1.1'],
    learningObjectives: localizedList(['ループを説明できる'], ['Explain the loop']),
    keyPoints: localizedList(['停止理由で分岐する'], ['Branch on the stop reason']),
    estimatedMinutes: 30,
    relatedCardIds: ['d1-loop-stop'],
    relatedQuestionIds: ['q-d1-loop-continue'],
    sourceIds: ['exam-guide', 'stop-reasons'],
    verifiedAt: '2026-07-21',
  });
  const withSection = (change: (section: ReturnType<typeof validSection>) => void) => {
    const section = validSection();
    change(section);
    return validateStudyGuideSections([section], index).join('\n');
  };

  it('accepts the real study guide sections', () => {
    // #then
    expect(validateStudyGuideSections(studyGuideSections, index)).toEqual([]);
  });

  it('accepts a well-formed fixture', () => {
    // #then
    expect(validateStudyGuideSections([validSection()], index)).toEqual([]);
  });

  it('rejects a domain that does not exist', () => {
    // #when
    const errors = withSection((section) => { section.domainIds = ['d9']; });

    // #then
    expect(errors).toContain('study guide section sg-fixture: orphan domain d9');
  });

  it('rejects a source that does not exist', () => {
    // #when
    const errors = withSection((section) => { section.sourceIds = ['exam-guide', 'made-up-doc']; });

    // #then
    expect(errors).toContain('study guide section sg-fixture: orphan source made-up-doc');
  });

  it('rejects a task statement that does not exist', () => {
    // #when
    const errors = withSection((section) => { section.taskStatementIds = ['9.9']; });

    // #then
    expect(errors).toContain('study guide section sg-fixture: orphan task statement 9.9');
  });

  it('rejects a related card that does not exist', () => {
    // #when
    const errors = withSection((section) => { section.relatedCardIds = ['d1-missing-card']; });

    // #then
    expect(errors).toContain('study guide section sg-fixture: orphan card d1-missing-card');
  });

  it('rejects a related question that does not exist', () => {
    // #when
    const errors = withSection((section) => { section.relatedQuestionIds = ['q-missing']; });

    // #then
    expect(errors).toContain('study guide section sg-fixture: orphan question q-missing');
  });

  it('rejects empty learning objectives', () => {
    // #when
    const errors = withSection((section) => { section.learningObjectives = localizedList([], []); });

    // #then
    expect(errors).toContain('study guide section sg-fixture: learningObjectives');
  });

  it('rejects empty key points', () => {
    // #when
    const errors = withSection((section) => { section.keyPoints = localizedList(['停止理由で分岐する'], []); });

    // #then
    expect(errors).toContain('study guide section sg-fixture: keyPoints.en');
  });

  it('rejects a verifiedAt that is not a real calendar date', () => {
    // #when
    const errors = withSection((section) => { section.verifiedAt = '2026-02-31'; });

    // #then
    expect(errors).toContain('study guide section sg-fixture: verifiedAt');
    expect(errors).toContain('existing calendar date');
  });

  it('rejects a duplicated recommended order', () => {
    // #given
    const second = validSection();
    second.id = 'sg-fixture-2';

    // #when
    const errors = validateStudyGuideSections([validSection(), second], index).join('\n');

    // #then
    expect(errors).toContain('study guide recommendedOrder has duplicate IDs: 1');
  });

  it('rejects a non-positive estimated duration', () => {
    // #when
    const errors = withSection((section) => { section.estimatedMinutes = 0; });

    // #then
    expect(errors).toContain('study guide section sg-fixture: estimatedMinutes');
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
    officialScenarioIds: ['claude-code-ci'],
    learningObjectives: localizedList(['非対話実行を説明できる'], ['Explain non-interactive execution']),
    prerequisites: localizedList(['実行できる端末'], ['A machine that can run the CLI']),
    estimatedMinutes: 45,
    steps: [
      {
        id: 'step-one',
        title: localized('手順1', 'Step one'),
        instructions: localizedList(['対象を決める'], ['Decide the target']),
      },
    ],
    deliverables: localizedList(['スクリプト'], ['A script']),
    verification: localizedList(['実行して確認する'], ['Run it and check']),
    cleanup: localizedList(['ジョブを削除する'], ['Delete the job']),
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

  it('rejects duplicated guide IDs', () => {
    // #when
    const errors = validateHandsOnGuides([validGuide(), validGuide()], index).join('\n');

    // #then
    expect(errors).toContain('hands-on guides has duplicate IDs: ho-fixture');
  });
});
