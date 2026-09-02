import { describe, expect, it } from 'vitest';
import type { LocalizedText } from '../../content/types';
import type { Locale } from '../../i18n/locales';
import type { DeepLink } from '../deep-link';
import type { ReviewState } from '../scheduler';
import { createEmptyStudyData, type QuizStat, type StudyData } from '../storage-schema';
import { NO_SCORE_NOTE } from '../study-summary';
import { createWebMcpContentSource, createWebMcpTools, QUERY_MAX_LENGTH, TOOL_OUTPUT_CHAR_LIMIT, type WebMcpBridge, type WebMcpCard, type WebMcpContentSource, type WebMcpQuestion, type WebMcpTool } from './webmcp-tools';

const NOW = new Date('2026-09-02T00:00:00.000Z');

const text = (ja: string, en: string): LocalizedText => ({ ja, en });

const fixtureCards: WebMcpCard[] = [
  { id: 'c-hooks', domainId: 'd1', revision: 1, prompt: text('フックの終了コード', 'Hook exit codes'), answer: text('2 はブロック', 'exit 2 blocks'), explanation: text('説明', 'explanation'), pitfall: text('落とし穴', 'pitfall') },
  { id: 'c-loop', domainId: 'd1', revision: 2, prompt: text('エージェントループ', 'Agent loop'), answer: text('停止条件', 'stop condition'), explanation: text('説明', 'explanation'), pitfall: text('落とし穴', 'pitfall') },
  { id: 'c-scope', domainId: 'd2', revision: 1, prompt: text('MCP スコープ', 'MCP config scope'), answer: text('優先順位', 'precedence'), explanation: text('説明', 'explanation'), pitfall: text('落とし穴', 'pitfall') },
];

const fixtureQuestions: WebMcpQuestion[] = [
  { id: 'q-stop', domainId: 'd1', format: 'single', stem: text('停止理由はどれ', 'Which stop reason'), choices: [{ id: 'a', text: text('end_turn', 'end_turn') }, { id: 'b', text: text('max_tokens', 'max_tokens') }] },
  { id: 'q-scope', domainId: 'd2', format: 'multiple', stem: text('スコープの優先順位', 'Scope precedence'), choices: [{ id: 'a', text: text('ローカル', 'local') }, { id: 'b', text: text('プロジェクト', 'project') }] },
];

function fixtureContent(cards: readonly WebMcpCard[] = fixtureCards, questions: readonly WebMcpQuestion[] = fixtureQuestions): WebMcpContentSource {
  return {
    domains: [
      { id: 'd1', number: 1, weight: 27, title: text('領域1', 'Domain 1') },
      { id: 'd2', number: 2, weight: 18, title: text('領域2', 'Domain 2') },
    ],
    cards: () => Promise.resolve(cards),
    questions: () => Promise.resolve(questions),
    sections: () => Promise.resolve([{ id: 'sg-loop', revision: 1 }]),
    guides: () => Promise.resolve([{ id: 'ho-ci', revision: 1, steps: [{ id: 'step-run' }] }]),
    scenarios: () => Promise.resolve([{ id: 'sc-support-agents' }]),
  };
}

const review = (cardId: string, overrides: Partial<ReviewState> = {}): ReviewState => ({
  cardId, cardRevisionSeen: 1, dueAt: '2099-01-01T00:00:00.000Z', intervalDays: 3, streak: 1, lapses: 0, lastRating: 'good', ...overrides,
});
const stat = (overrides: Partial<QuizStat> = {}): QuizStat => ({ attempts: 1, correct: 1, lastAnsweredAt: '2026-08-01T00:00:00.000Z', lastCorrect: true, ...overrides });

function harness({ data = createEmptyStudyData(), locale = 'ja', unreadable = false, sessionActive = false, content = fixtureContent() }: {
  data?: StudyData; locale?: Locale; unreadable?: boolean; sessionActive?: boolean; content?: WebMcpContentSource;
} = {}) {
  const links: DeepLink[] = [];
  const bridge: WebMcpBridge = {
    locale,
    getData: () => data,
    getNow: () => NOW,
    isDataUnreadable: () => unreadable,
    isPracticeSessionActive: () => sessionActive,
    applyDeepLink: (link) => { links.push(link); },
  };
  const tools = createWebMcpTools(bridge, content);
  const tool = (name: string): WebMcpTool => tools.find((candidate) => candidate.name === name)!;
  const run = (name: string, input: Record<string, unknown> = {}) => tool(name).execute(input);
  return { tools, tool, run, links };
}

// Keys only: NO_SCORE_NOTE legitimately contains these words as a value.
function collectKeys(value: unknown, into: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((item) => collectKeys(item, into));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([key, nested]) => { into.push(key); collectKeys(nested, into); });
  return into;
}

const size = (value: unknown) => JSON.stringify(value).length;

describe('createWebMcpTools', () => {
  it('registers the six tools inside Chrome\'s published budgets, read tools marked read-only', () => {
    // #given
    const { tools } = harness();
    // #then
    expect(tools.map((tool) => tool.name)).toEqual(['get_study_summary', 'get_due_reviews', 'get_domain_stats', 'search_content', 'get_content_item', 'open_view']);
    for (const tool of tools) {
      expect(tool.name).toMatch(/^[a-z_]{1,30}$/);
      expect(tool.description.length).toBeLessThanOrEqual(500);
      expect(tool.inputSchema.type).toBe('object');
      const properties = (tool.inputSchema.properties ?? {}) as Record<string, { description?: string; enum?: unknown[] }>;
      for (const property of Object.values(properties)) {
        expect((property.description ?? '').length).toBeLessThanOrEqual(150);
        if (property.enum) expect(property.enum.length).toBeGreaterThan(0);
      }
      expect(tool.annotations.readOnlyHint).toBe(tool.name !== 'open_view');
    }
  });

  it('reports the unreadable document instead of empty counts', async () => {
    // #given
    const { run } = harness({ unreadable: true });
    // #then
    for (const name of ['get_study_summary', 'get_due_reviews', 'get_domain_stats']) {
      await expect(run(name)).resolves.toEqual(expect.objectContaining({ available: false }));
    }
  });
});

describe('get_study_summary', () => {
  it('returns the companion digest, clipped to the output budget', async () => {
    // #given
    const { run } = harness();
    // #when
    const result = await run('get_study_summary') as { available: boolean; summary: string };
    // #then — measured as the serialised result, wrapper and JSON escaping included
    expect(result.available).toBe(true);
    expect(result.summary).toContain(NO_SCORE_NOTE);
    expect(size(result)).toBeLessThanOrEqual(TOOL_OUTPUT_CHAR_LIMIT);
  });
});

describe('output budget', () => {
  const longId = 'a'.repeat(2000);

  it('rejects an over-long query without echoing it, inside the budget', async () => {
    // #given
    const { run } = harness();
    // #when
    const result = await run('search_content', { query: 'x'.repeat(QUERY_MAX_LENGTH + 1) });
    // #then
    expect(result).toMatchObject({ ok: false });
    expect(size(result)).toBeLessThanOrEqual(TOOL_OUTPUT_CHAR_LIMIT);
    await expect(run('search_content', { query: 'x'.repeat(QUERY_MAX_LENGTH) })).resolves.toMatchObject({ matched: { cards: 0, questions: 0 } });
  });

  it('rejects an over-long or malformed id without echoing it, on every tool that takes one', async () => {
    // #given
    const { run, links } = harness();
    // #then
    for (const [name, input] of [
      ['get_content_item', { id: longId }],
      ['get_content_item', { id: 'Not An Id' }],
      ['open_view', { view: 'practice', id: longId }],
      ['open_view', { view: 'hands-on', id: 'ho-ci', stepId: longId }],
    ] as const) {
      const result = await run(name, { ...input });
      expect(result, name).toMatchObject({ ok: false });
      expect(size(result), name).toBeLessThanOrEqual(TOOL_OUTPUT_CHAR_LIMIT);
      expect(JSON.stringify(result)).not.toContain('aaaaaaaa');
    }
    expect(links).toEqual([]);
  });

  it('replaces a result that still would not fit with an error rather than shipping it', async () => {
    // #given a question whose clipped choices alone exceed the budget
    const bulky: WebMcpQuestion = {
      ...fixtureQuestions[0]!, id: 'q-bulky',
      choices: Array.from({ length: 40 }, (_, index) => ({ id: `c${index}`, text: text('あ'.repeat(150), 'a'.repeat(150)) })),
    };
    const { run } = harness({ content: fixtureContent(fixtureCards, [bulky]) });
    // #when
    const result = await run('get_content_item', { id: 'q-bulky' });
    // #then
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('budget') });
    expect(size(result)).toBeLessThanOrEqual(TOOL_OUTPUT_CHAR_LIMIT);
  });

  it('keeps every tool\'s success and error results inside the budget', async () => {
    // #given
    const { run } = harness();
    // #then
    for (const [name, input] of [
      ['get_study_summary', {}],
      ['get_due_reviews', {}],
      ['get_due_reviews', { limit: 99 }],
      ['get_domain_stats', {}],
      ['search_content', { query: 'スコープ' }],
      ['search_content', { query: '' }],
      ['get_content_item', { id: 'c-hooks' }],
      ['get_content_item', { id: 'c-missing' }],
      ['open_view', { view: 'guide', id: 'sg-loop' }],
      ['open_view', { view: 'nowhere' }],
    ] as const) {
      expect(size(await run(name, { ...input })), `${name} ${JSON.stringify(input)}`).toBeLessThanOrEqual(TOOL_OUTPUT_CHAR_LIMIT);
    }
  });
});

describe('get_due_reviews', () => {
  const data: StudyData = {
    ...createEmptyStudyData(),
    reviews: {
      'c-hooks': review('c-hooks'),
      // Reviewed at revision 1; the card is now revision 2, so it is due again.
      'c-loop': review('c-loop', { cardRevisionSeen: 1 }),
    },
  };

  it('lists never-reviewed and revised cards with prompts in the page locale and a deep link', async () => {
    // #given
    const { run } = harness({ data });
    // #when
    const result = await run('get_due_reviews') as { total: number; truncated: boolean; cards: { id: string; prompt: string; deepLink: string }[] };
    // #then
    expect(result.total).toBe(2);
    expect(result.truncated).toBe(false);
    expect(result.cards.map((card) => card.id)).toEqual(['c-loop', 'c-scope']);
    expect(result.cards[0]).toEqual({ id: 'c-loop', domainId: 'd1', prompt: 'エージェントループ', deepLink: '#/practice/c-loop' });
  });

  it('uses the English text on the English page', async () => {
    // #given
    const { run } = harness({ data, locale: 'en' });
    // #when
    const result = await run('get_due_reviews') as { cards: { prompt: string }[] };
    // #then
    expect(result.cards[0]!.prompt).toBe('Agent loop');
  });

  it('filters by domain and caps the list while reporting the full total', async () => {
    // #given
    const { run } = harness({ data });
    // #then
    await expect(run('get_due_reviews', { domainId: 'd2' })).resolves.toMatchObject({ total: 1, cards: [{ id: 'c-scope' }] });
    const capped = await run('get_due_reviews', { limit: 1 }) as { total: number; cards: unknown[] };
    expect(capped.total).toBe(2);
    expect(capped.cards).toHaveLength(1);
  });

  it('rejects an unknown domain or an out-of-range limit', async () => {
    // #given
    const { run } = harness({ data });
    // #then
    await expect(run('get_due_reviews', { domainId: 'd9' })).resolves.toMatchObject({ ok: false });
    await expect(run('get_due_reviews', { limit: 0 })).resolves.toMatchObject({ ok: false });
    await expect(run('get_due_reviews', { limit: 2.5 })).resolves.toMatchObject({ ok: false });
  });

  it('shortens the list until the result fits the output budget, and says so', async () => {
    // #given twenty due cards whose prompts alone exceed the budget
    const bulky = Array.from({ length: 20 }, (_, index): WebMcpCard => ({
      ...fixtureCards[0]!, id: `c-bulk-${index}`, prompt: text('あ'.repeat(200), 'a'.repeat(200)),
    }));
    const { run } = harness({ content: fixtureContent(bulky) });
    // #when
    const result = await run('get_due_reviews', { limit: 20 }) as { total: number; truncated: boolean; cards: unknown[] };
    // #then
    expect(size(result)).toBeLessThanOrEqual(TOOL_OUTPUT_CHAR_LIMIT);
    expect(result.total).toBe(20);
    expect(result.truncated).toBe(true);
    expect(result.cards.length).toBeGreaterThan(0);
  });

  it('never splits a surrogate pair when clipping a prompt', async () => {
    // #given a prompt of astral-plane characters longer than the field limit
    const emoji = { ...fixtureCards[0]!, id: 'c-emoji', prompt: text('😀'.repeat(200), '😀'.repeat(200)) };
    const { run } = harness({ content: fixtureContent([emoji]) });
    // #when
    const result = await run('get_due_reviews') as { cards: { prompt: string }[] };
    // #then
    expect(result.cards[0]!.prompt.isWellFormed()).toBe(true);
    expect(Array.from(result.cards[0]!.prompt)).toHaveLength(160);
  });
});

describe('get_domain_stats', () => {
  it('returns raw per-domain counts and no derived-score keys', async () => {
    // #given a weak card in d1 and one d1 question attempted three times
    const data: StudyData = {
      ...createEmptyStudyData(),
      reviews: { 'c-hooks': review('c-hooks', { lastRating: 'again' }) },
      quizStats: { 'q-stop': stat({ attempts: 3, correct: 1 }) },
    };
    const { run } = harness({ data });
    // #when
    const result = await run('get_domain_stats') as { note: string; domains: Record<string, unknown>[] };
    // #then
    expect(result.note).toBe(NO_SCORE_NOTE);
    expect(result.domains[0]).toEqual({
      id: 'd1', number: 1, title: '領域1', examWeightPercent: 27,
      cards: { total: 2, reviewed: 1, weak: 1, dueNow: 1 },
      quiz: { total: 1, answered: 1, attempts: 3, correct: 1 },
    });
    expect(collectKeys(result).filter((key) => /score|pass|fail|readiness|probab/i.test(key))).toEqual([]);
  });
});

describe('search_content', () => {
  it('matches in either language regardless of the page locale', async () => {
    // #given the Japanese page
    const { run } = harness();
    // #when searching in English
    const result = await run('search_content', { query: 'hook exit' }) as { matched: { cards: number; questions: number }; hits: { kind: string; id: string; deepLink: string }[] };
    // #then
    expect(result.matched).toEqual({ cards: 1, questions: 0 });
    expect(result.hits).toEqual([{ kind: 'card', id: 'c-hooks', domainId: 'd1', text: 'フックの終了コード', deepLink: '#/practice/c-hooks' }]);
  });

  it('finds cards and questions, cards first, and narrows by kind and domain', async () => {
    // #given
    const { run } = harness();
    // #then
    const both = await run('search_content', { query: 'スコープ' }) as { matched: unknown; hits: { kind: string }[] };
    expect(both.matched).toEqual({ cards: 1, questions: 1 });
    expect(both.hits.map((hit) => hit.kind)).toEqual(['card', 'question']);
    await expect(run('search_content', { query: 'スコープ', kind: 'question' })).resolves.toMatchObject({ matched: { cards: 0, questions: 1 } });
    await expect(run('search_content', { query: 'スコープ', domainId: 'd1' })).resolves.toMatchObject({ matched: { cards: 0, questions: 0 } });
  });

  it('applies limit to the combined hits, never returns correct choices, and rejects an empty query', async () => {
    // #given
    const { run } = harness();
    // #when
    const result = await run('search_content', { query: 'スコープ', limit: 1 }) as { hits: unknown[] };
    // #then
    expect(result.hits).toHaveLength(1);
    expect(collectKeys(result)).not.toContain('correctChoiceIds');
    await expect(run('search_content', { query: '   ' })).resolves.toMatchObject({ ok: false });
    await expect(run('search_content', { query: 'x', kind: 'answer' })).resolves.toMatchObject({ ok: false });
  });
});

describe('get_content_item', () => {
  it('returns a card in full and a question without its answer key', async () => {
    // #given
    const { run } = harness();
    // #then
    await expect(run('get_content_item', { id: 'c-hooks' })).resolves.toEqual({
      kind: 'card', id: 'c-hooks', domainId: 'd1', prompt: 'フックの終了コード', answer: '2 はブロック', explanation: '説明', pitfall: '落とし穴', deepLink: '#/practice/c-hooks',
    });
    const question = await run('get_content_item', { id: 'q-scope' });
    expect(question).toMatchObject({ kind: 'question', format: 'multiple', choices: [{ id: 'a', text: 'ローカル' }, { id: 'b', text: 'プロジェクト' }], deepLink: '#/quiz/q-scope' });
    expect(collectKeys(question)).not.toContain('correctChoiceIds');
    expect(collectKeys(question)).not.toContain('explanation');
    await expect(run('get_content_item', { id: 'nope' })).resolves.toMatchObject({ ok: false });
  });
});

describe('open_view', () => {
  it('navigates through the deep-link path for each addressable destination', async () => {
    // #given
    const { run, links } = harness();
    // #when
    await expect(run('open_view', { view: 'guide', id: 'sg-loop' })).resolves.toEqual({ ok: true, view: 'guide', deepLink: '#/guide/sg-loop' });
    await run('open_view', { view: 'scenario', id: 'sc-support-agents' });
    await run('open_view', { view: 'hands-on', id: 'ho-ci', stepId: 'step-run' });
    await expect(run('open_view', { view: 'progress' })).resolves.toEqual({ ok: true, view: 'progress', deepLink: '#/progress' });
    // #then
    expect(links).toEqual([
      { view: 'guide', sectionId: 'sg-loop' },
      { view: 'quiz', scenarioId: 'sc-support-agents' },
      { view: 'hands-on', handsOnGuideId: 'ho-ci', handsOnStepId: 'step-run' },
      { view: 'progress' },
    ]);
  });

  it('refuses unknown views, malformed or unknown ids, ids on item-less views, and a step without its guide — without navigating', async () => {
    // #given
    const { run, links } = harness();
    // #then
    await expect(run('open_view', { view: 'settings' })).resolves.toMatchObject({ ok: false });
    // Mounting the Mock Exam view can finalise an expired session — a write.
    await expect(run('open_view', { view: 'mock-exam' })).resolves.toMatchObject({ ok: false });
    await expect(run('open_view', { view: 'practice', id: 'Not An Id' })).resolves.toMatchObject({ ok: false });
    await expect(run('open_view', { view: 'practice', id: 'c-missing' })).resolves.toMatchObject({ ok: false });
    await expect(run('open_view', { view: 'today', id: 'c-hooks' })).resolves.toMatchObject({ ok: false });
    await expect(run('open_view', { view: 'hands-on', id: 'ho-ci', stepId: 'step-missing' })).resolves.toMatchObject({ ok: false });
    await expect(run('open_view', { view: 'hands-on', stepId: 'step-run' })).resolves.toMatchObject({ ok: false });
    await expect(run('open_view', { view: 'quiz', id: 'q-stop', stepId: 'x' })).resolves.toMatchObject({ ok: false });
    expect(links).toEqual([]);
  });

  it('will not leave a running practice session, but still opens practice targets', async () => {
    // #given
    const { run, links } = harness({ sessionActive: true });
    // #then
    await expect(run('open_view', { view: 'guide', id: 'sg-loop' })).resolves.toMatchObject({ ok: false });
    expect(links).toEqual([]);
    await expect(run('open_view', { view: 'practice', id: 'c-hooks' })).resolves.toMatchObject({ ok: true });
    expect(links).toEqual([{ view: 'practice', cardId: 'c-hooks' }]);
  });
});

describe('against the real content', () => {
  const content = createWebMcpContentSource();

  it('keeps every result inside the output budget at default and maximum limits', async () => {
    // #given an empty record (every card due) and the shipped content
    const { run } = harness({ content });
    // #then
    for (const [name, input] of [
      ['get_study_summary', {}],
      ['get_due_reviews', {}],
      ['get_due_reviews', { limit: 20 }],
      ['get_domain_stats', {}],
      ['search_content', { query: 'mcp' }],
      ['search_content', { query: 'の', limit: 10 }],
      ['search_content', { query: 'the', limit: 10 }],
      ['search_content', { query: 'x'.repeat(QUERY_MAX_LENGTH), limit: 10 }],
      ['get_content_item', { id: 'no-such-item' }],
    ] as const) {
      expect(size(await run(name, { ...input })), `${name} ${JSON.stringify(input)}`).toBeLessThanOrEqual(TOOL_OUTPUT_CHAR_LIMIT);
    }
  });

  it('keeps the whole digest, id lists included, inside the budget for a saturated record', async () => {
    // #given every card weak and due, every question low-accuracy, close, and lucky-guessed
    const cards = await content.cards();
    const questions = await content.questions();
    const data: StudyData = {
      ...createEmptyStudyData(),
      reviews: Object.fromEntries(cards.map((card) => [card.id, review(card.id, { lastRating: 'again', lapses: 3, dueAt: '2020-01-01T00:00:00.000Z' })])),
      quizStats: Object.fromEntries(questions.map((question) => [question.id, stat({ attempts: 5, correct: 1, lastCorrect: false, partial: 2, guessedCorrect: 1 })])),
    };
    const { run } = harness({ content, data });
    // #when
    const result = await run('get_study_summary') as { summary: string };
    // #then — shortened lists, not a clipped digest: the last label is still whole
    expect(size(result)).toBeLessThanOrEqual(TOOL_OUTPUT_CHAR_LIMIT);
    expect(result.summary.endsWith('…')).toBe(false);
    expect(result.summary.split('\n').at(-1)).toMatch(/^Question ids the learner marked as a lucky guess: /);
    expect(result.summary).toContain('more)');
  });

  it('keeps every card and question item inside the output budget in both locales', async () => {
    // #given
    const ids = [...(await content.cards()).map((card) => card.id), ...(await content.questions()).map((question) => question.id)];
    // #then
    for (const locale of ['ja', 'en'] as const) {
      const { run } = harness({ content, locale });
      for (const id of ids) expect(size(await run('get_content_item', { id })), `${id} (${locale})`).toBeLessThanOrEqual(TOOL_OUTPUT_CHAR_LIMIT);
    }
  });
});
