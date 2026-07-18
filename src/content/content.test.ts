import { describe, expect, it } from 'vitest';
import { cards } from './cards';
import { domains } from './domains';
import { questions, standaloneQuestions } from './questions';
import { scenarios } from './scenarios';
import { sources } from './sources';
import { genericSourceIds, validateContent } from './validate';

describe('study content', () => {
  it('matches the July 2026 blueprint shape', () => {
    expect(validateContent()).toEqual({
      sourceCount: sources.length,
      domainCount: 5,
      objectiveCount: 30,
      cardCount: cards.length,
      questionCount: questions.length,
      scenarioCount: scenarios.length,
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
      for (const choice of question.choices) expectLocalizedText(choice.text);
    }
    for (const scenario of scenarios) {
      expectLocalizedText(scenario.title);
      expectLocalizedList(scenario.background);
    }
  });
});
