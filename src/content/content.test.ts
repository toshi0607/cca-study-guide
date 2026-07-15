import { describe, expect, it } from 'vitest';
import { cards } from './cards';
import { domains } from './domains';
import { sources } from './sources';
import { genericSourceIds, validateContent } from './validate';

describe('study content', () => {
  it('matches the July 2026 blueprint shape', () => {
    expect(validateContent()).toEqual({
      sourceCount: sources.length,
      domainCount: 5,
      objectiveCount: 30,
      cardCount: cards.length,
    });
    expect(domains.map((domain) => domain.weight)).toEqual([27, 18, 20, 20, 15]);
  });

  it('has independently authored practice coverage in every domain', () => {
    expect(cards.length).toBeGreaterThanOrEqual(15);
    for (const domain of domains) {
      expect(cards.filter((card) => card.domainId === domain.id).length).toBeGreaterThanOrEqual(3);
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
  });
});
