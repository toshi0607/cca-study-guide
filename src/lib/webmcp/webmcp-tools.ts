// The tools this page offers to an in-browser agent through WebMCP
// (`document.modelContext`). See DESIGN.md §Study companion affordances.
//
// Every tool is a read over the same state the UI renders, or a navigation
// through the same deep-link path a hash change takes. None of them writes the
// study record, and none derives a score, pass/fail, or readiness: the outputs
// are the raw counts and ids the Progress view already shows, in the stable
// English vocabulary buildStudySummary established for study companions.
import { domainIndex } from '../../content/card-index';
import type { Card, ChoiceQuestion, DomainSpine, HandsOnGuide, LocalizedText, Scenario, StudyGuideSection } from '../../content/types';
import type { Locale } from '../../i18n/locales';
import { localize } from '../../i18n/ui';
import { formatDeepLink, parseDeepLink, type DeepLink } from '../deep-link';
import { deriveHandsOnProgress } from '../hands-on-progress';
import { isDue } from '../scheduler';
import type { StudyData } from '../storage-schema';
import { deriveStudyGuideProgress } from '../study-guide-progress';
import { buildStudySummary, NO_SCORE_NOTE, SUMMARY_ID_LIMIT } from '../study-summary';
import { isWeak } from '../weakness';

// What the tools may touch, handed in by the App island. Reads go through the
// rendered state and navigation through the deep-link path, so a tool can never
// bypass the storage contract or desynchronise the UI.
export type WebMcpBridge = {
  readonly locale: Locale;
  getData(): StudyData;
  getNow(): Date;
  isDataUnreadable(): boolean;
  isPracticeSessionActive(): boolean;
  applyDeepLink(link: DeepLink): void;
};

// Structural minimums (same idea as study-summary's Summary* types) so the tools
// are testable with small fixtures and never read a field they do not need.
export type WebMcpCard = Pick<Card, 'id' | 'domainId' | 'revision' | 'prompt' | 'answer' | 'explanation' | 'pitfall'>;
export type WebMcpQuestion = Pick<ChoiceQuestion, 'id' | 'domainId' | 'format' | 'stem' | 'choices'>;
export type WebMcpSection = Pick<StudyGuideSection, 'id' | 'revision'>;
export type WebMcpGuide = Pick<HandsOnGuide, 'id' | 'revision'> & { readonly steps: readonly { readonly id: string }[] };
export type WebMcpScenario = Pick<Scenario, 'id'>;

// Each content module is fetched by the first call that needs it and kept for
// the page's lifetime, so a lookup of one card never downloads the guides, and a
// learner who never brings an agent downloads nothing for this at all.
export type WebMcpContentSource = {
  readonly domains: readonly DomainSpine[];
  cards(): Promise<readonly WebMcpCard[]>;
  questions(): Promise<readonly WebMcpQuestion[]>;
  sections(): Promise<readonly WebMcpSection[]>;
  guides(): Promise<readonly WebMcpGuide[]>;
  scenarios(): Promise<readonly WebMcpScenario[]>;
};

// Shape accepted by `document.modelContext.registerTool`; kept local so the app
// compiles against the spec surface it uses rather than a package's re-export.
export type WebMcpTool = {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
  readonly annotations: { readonly readOnlyHint: boolean };
  execute(input: Record<string, unknown>): Promise<unknown>;
};

// Chrome's published guidance for tool output. Text is clipped to it with a
// marker; lists are shortened until they fit (see fitToBudget), so a caller's
// `limit` can never push a result past it.
export const TOOL_OUTPUT_CHAR_LIMIT = 1500;
const FIELD_CHAR_LIMIT = 160;
const DETAIL_FIELD_CHAR_LIMIT = 300;
const LIST_DEFAULT_LIMIT = 5;
const DUE_REVIEWS_MAX_LIMIT = 20;
const SEARCH_MAX_LIMIT = 10;
// The digest's id lists are its most actionable part, so when the whole digest
// would not fit they are shortened first, step by step, before any clipping.
const SUMMARY_ID_LIMITS = [SUMMARY_ID_LIMIT, 10, 5, 3, 1] as const;

const UNREADABLE_RESULT = {
  available: false,
  reason: 'The study record stored in this browser could not be read. The app shows the same warning; nothing is derived from it.',
} as const;

// Deep-link routes an agent may open. `scenario` is the quiz view targeted at a
// practice case (see deep-link.ts), so it is listed as its own destination.
// `mock-exam` is absent on purpose: mounting that view finalises an expired
// session, i.e. writes the study record, which no tool may cause.
const OPENABLE_ROUTES = ['today', 'guide', 'hands-on', 'official-scenarios', 'practice', 'quiz', 'scenario', 'progress'] as const;
type OpenableRoute = (typeof OPENABLE_ROUTES)[number];
// Routes whose deep link carries no item: the parser drops any id on them, so
// the tool refuses one rather than echoing back a target that was never used.
const ITEM_ROUTES: readonly OpenableRoute[] = ['guide', 'hands-on', 'practice', 'quiz', 'scenario'];

// A failed chunk load is not remembered, so the next call retries the import.
function once<T>(load: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | null = null;
  return () => {
    pending ??= load().catch((error: unknown) => { pending = null; throw error; });
    return pending;
  };
}

export function createWebMcpContentSource(): WebMcpContentSource {
  return {
    domains: domainIndex,
    cards: once(async () => (await import('../../content/cards')).cards),
    questions: once(async () => (await import('../../content/questions')).questions),
    sections: once(async () => (await import('../../content/study-guide')).studyGuideSections),
    guides: once(async () => (await import('../../content/hands-on')).handsOnGuides),
    scenarios: once(async () => (await import('../../content/scenarios')).scenarios),
  };
}

// Counts code points, not UTF-16 units, so an emoji or a rare ideograph at the
// cut is never split into an unpaired surrogate.
function clip(value: string, limit: number): string {
  const points = Array.from(value);
  return points.length > limit ? `${points.slice(0, limit - 1).join('')}…` : value;
}

function text(value: LocalizedText, locale: Locale, limit: number): string {
  return clip(localize(value, locale), limit);
}

function fitToBudget<T>(items: readonly T[], build: (shown: readonly T[]) => Record<string, unknown>): Record<string, unknown> {
  let shown = items;
  let result = build(shown);
  while (shown.length > 1 && JSON.stringify(result).length > TOOL_OUTPUT_CHAR_LIMIT) {
    shown = shown.slice(0, -1);
    result = build(shown);
  }
  return { ...result, truncated: shown.length < items.length };
}

type Invalid = { ok: false; error: string };

function invalid(error: string): Invalid {
  return { ok: false, error };
}

function isInvalid(value: unknown): value is Invalid {
  return typeof value === 'object' && value !== null && 'ok' in value && (value as { ok: unknown }).ok === false;
}

function readLimit(input: Record<string, unknown>, max: number): number | Invalid {
  const raw = input.limit;
  if (raw === undefined) return LIST_DEFAULT_LIMIT;
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1 || raw > max) return invalid(`limit must be an integer from 1 to ${max}`);
  return raw;
}

function readDomainId(input: Record<string, unknown>, domains: readonly DomainSpine[]): string | undefined | Invalid {
  const raw = input.domainId;
  if (raw === undefined) return undefined;
  if (typeof raw !== 'string' || !domains.some((domain) => domain.id === raw)) return invalid(`domainId must be one of ${domains.map((domain) => domain.id).join(', ')}`);
  return raw;
}

function readRequiredString(input: Record<string, unknown>, key: string): string | Invalid {
  const raw = input[key];
  if (typeof raw !== 'string' || !raw.trim()) return invalid(`${key} must be a non-empty string`);
  return raw.trim();
}

function readOptionalString(input: Record<string, unknown>, key: string): string | undefined | Invalid {
  const raw = input[key];
  if (raw === undefined) return undefined;
  if (typeof raw !== 'string') return invalid(`${key} must be a string`);
  return raw;
}

// The domain ids are part of the schema (an agent can pick one without a round
// trip), read from the eager spine so building the schema loads no content.
const domainIdSchema = { type: 'string', enum: domainIndex.map((domain) => domain.id), description: 'Restrict to one exam domain (d1–d5).' };
const limitSchema = (max: number) => ({ type: 'integer', minimum: 1, maximum: max, default: LIST_DEFAULT_LIMIT, description: `How many items to return (default ${LIST_DEFAULT_LIMIT}); fewer come back if the result would exceed the size budget.` });

// Every term must appear somewhere in the item, in either language, so an agent
// searching in English still finds an item on the Japanese page.
function matchesAll(terms: readonly string[], haystack: readonly string[]): boolean {
  const joined = haystack.join('\n').toLowerCase();
  return terms.every((term) => joined.includes(term));
}

export function createWebMcpTools(bridge: WebMcpBridge, content: WebMcpContentSource = createWebMcpContentSource()): WebMcpTool[] {
  const { locale } = bridge;
  const cardLink = (cardId: string) => formatDeepLink({ view: 'practice', cardId });
  const questionLink = (questionId: string) => formatDeepLink({ view: 'quiz', questionId });

  const getStudySummary: WebMcpTool = {
    name: 'get_study_summary',
    description: 'Read the learner\'s study summary for the CCA Field Notes app open in this tab: cards reviewed/weak/due, quiz counts, guide and hands-on completion, per-domain counts, and the ids of weak cards and low-accuracy questions. Counts only; the app never derives a score, pass/fail, or readiness, and neither should you.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    async execute() {
      if (bridge.isDataUnreadable()) return UNREADABLE_RESULT;
      const [cards, questions, sections, guides] = await Promise.all([content.cards(), content.questions(), content.sections(), content.guides()]);
      const data = bridge.getData();
      const studyGuide = deriveStudyGuideProgress(sections, data.studyGuideProgress);
      const handsOn = deriveHandsOnProgress(guides, data.handsOnProgress);
      const input = {
        data,
        cards,
        questions,
        domains: content.domains,
        studyGuideTotal: studyGuide.totalSections,
        studyGuideCompleted: studyGuide.completed,
        handsOnTotal: handsOn.totalGuides,
        handsOnCompleted: handsOn.completed,
        now: bridge.getNow(),
      };
      let summary = '';
      for (const idLimit of SUMMARY_ID_LIMITS) {
        summary = buildStudySummary({ ...input, idLimit });
        if (summary.length <= TOOL_OUTPUT_CHAR_LIMIT) break;
      }
      return { available: true, summary: clip(summary, TOOL_OUTPUT_CHAR_LIMIT) };
    },
  };

  const getDueReviews: WebMcpTool = {
    name: 'get_due_reviews',
    description: 'List practice cards that are due for review right now (never reviewed, reviewed before the card was revised, or past their scheduled date), in curriculum order. Each item carries the card id, its domain, the prompt, and a deep link that open_view or the browser can follow.',
    inputSchema: { type: 'object', properties: { domainId: domainIdSchema, limit: limitSchema(DUE_REVIEWS_MAX_LIMIT) }, additionalProperties: false },
    annotations: { readOnlyHint: true },
    async execute(input) {
      if (bridge.isDataUnreadable()) return UNREADABLE_RESULT;
      const limit = readLimit(input, DUE_REVIEWS_MAX_LIMIT);
      if (isInvalid(limit)) return limit;
      const domainId = readDomainId(input, content.domains);
      if (isInvalid(domainId)) return domainId;
      const cards = await content.cards();
      const data = bridge.getData();
      const now = bridge.getNow();
      const due = cards.filter((card) => (!domainId || card.domainId === domainId) && isDue(data.reviews[card.id], card.revision, now));
      return fitToBudget(due.slice(0, limit), (shown) => ({
        available: true,
        total: due.length,
        cards: shown.map((card) => ({ id: card.id, domainId: card.domainId, prompt: text(card.prompt, locale, FIELD_CHAR_LIMIT), deepLink: cardLink(card.id) })),
      }));
    },
  };

  const getDomainStats: WebMcpTool = {
    name: 'get_domain_stats',
    description: 'Per exam domain: the published exam weight, practice-card counts (total, reviewed, weak, due now) and quiz counts (questions total/answered, attempts, correct). Raw counts identical to the Progress view; nothing is derived from them.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    async execute() {
      if (bridge.isDataUnreadable()) return UNREADABLE_RESULT;
      const [cards, questions] = await Promise.all([content.cards(), content.questions()]);
      const data = bridge.getData();
      const now = bridge.getNow();
      return {
        available: true,
        note: NO_SCORE_NOTE,
        domains: content.domains.map((domain) => {
          const domainCards = cards.filter((card) => card.domainId === domain.id);
          const domainQuestions = questions.filter((question) => question.domainId === domain.id);
          const stats = domainQuestions.map((question) => data.quizStats[question.id]).filter((stat) => stat !== undefined);
          return {
            id: domain.id,
            number: domain.number,
            title: localize(domain.title, locale),
            examWeightPercent: domain.weight,
            cards: {
              total: domainCards.length,
              reviewed: domainCards.filter((card) => data.reviews[card.id]).length,
              weak: domainCards.filter((card) => isWeak(data.reviews[card.id])).length,
              dueNow: domainCards.filter((card) => isDue(data.reviews[card.id], card.revision, now)).length,
            },
            quiz: {
              total: domainQuestions.length,
              answered: stats.length,
              attempts: stats.reduce((sum, stat) => sum + stat.attempts, 0),
              correct: stats.reduce((sum, stat) => sum + stat.correct, 0),
            },
          };
        }),
      };
    },
  };

  const searchContent: WebMcpTool = {
    name: 'search_content',
    description: 'Search the practice cards and quiz questions by keyword (matched in Japanese and English; every term must match). Returns compact hits — cards first, then questions — each with an id and a deep link; call get_content_item for the full text of one hit. Correct answers to quiz questions are never returned.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 1, description: 'Keywords, e.g. "hook exit code" or "MCP スコープ".' },
        kind: { type: 'string', enum: ['card', 'question', 'all'], default: 'all' },
        domainId: domainIdSchema,
        limit: limitSchema(SEARCH_MAX_LIMIT),
      },
      required: ['query'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    async execute(input) {
      const query = readRequiredString(input, 'query');
      if (isInvalid(query)) return query;
      const kind = readOptionalString(input, 'kind') ?? 'all';
      if (isInvalid(kind)) return kind;
      if (!['card', 'question', 'all'].includes(kind)) return invalid('kind must be card, question, or all');
      const domainId = readDomainId(input, content.domains);
      if (isInvalid(domainId)) return domainId;
      const limit = readLimit(input, SEARCH_MAX_LIMIT);
      if (isInvalid(limit)) return limit;

      const [cards, questions] = await Promise.all([content.cards(), content.questions()]);
      const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
      const inDomain = (item: { domainId: string }) => !domainId || item.domainId === domainId;
      const cardHits = kind === 'question' ? [] : cards.filter((card) => inDomain(card) && matchesAll(terms, [card.id, card.prompt.ja, card.prompt.en, card.answer.ja, card.answer.en]));
      const questionHits = kind === 'card' ? [] : questions.filter((question) => inDomain(question) && matchesAll(terms, [question.id, question.stem.ja, question.stem.en, ...question.choices.flatMap((choice) => [choice.text.ja, choice.text.en])]));
      const hits = [
        ...cardHits.map((card) => ({ kind: 'card', id: card.id, domainId: card.domainId, text: text(card.prompt, locale, FIELD_CHAR_LIMIT), deepLink: cardLink(card.id) })),
        ...questionHits.map((question) => ({ kind: 'question', id: question.id, domainId: question.domainId, text: text(question.stem, locale, FIELD_CHAR_LIMIT), deepLink: questionLink(question.id) })),
      ];
      return fitToBudget(hits.slice(0, limit), (shown) => ({
        query,
        matched: { cards: cardHits.length, questions: questionHits.length },
        hits: shown,
      }));
    },
  };

  const getContentItem: WebMcpTool = {
    name: 'get_content_item',
    description: 'Read one practice card (prompt, answer, explanation, pitfall) or one quiz question (stem and choices) by id, as shown in the app. For questions the correct choices and explanation are deliberately withheld so the learner answers in the app and their statistics stay meaningful.',
    inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'A card or question id from search_content or get_due_reviews.' } }, required: ['id'], additionalProperties: false },
    annotations: { readOnlyHint: true },
    async execute(input) {
      const id = readRequiredString(input, 'id');
      if (isInvalid(id)) return id;
      const card = (await content.cards()).find((item) => item.id === id);
      if (card) {
        return {
          kind: 'card',
          id: card.id,
          domainId: card.domainId,
          prompt: text(card.prompt, locale, DETAIL_FIELD_CHAR_LIMIT),
          answer: text(card.answer, locale, DETAIL_FIELD_CHAR_LIMIT),
          explanation: text(card.explanation, locale, DETAIL_FIELD_CHAR_LIMIT),
          pitfall: text(card.pitfall, locale, DETAIL_FIELD_CHAR_LIMIT),
          deepLink: cardLink(card.id),
        };
      }
      const question = (await content.questions()).find((item) => item.id === id);
      if (question) {
        return {
          kind: 'question',
          id: question.id,
          domainId: question.domainId,
          format: question.format,
          stem: text(question.stem, locale, DETAIL_FIELD_CHAR_LIMIT),
          choices: question.choices.map((choice) => ({ id: choice.id, text: text(choice.text, locale, FIELD_CHAR_LIMIT) })),
          deepLink: questionLink(question.id),
        };
      }
      return invalid(`no card or question has id ${id}`);
    },
  };

  const openView: WebMcpTool = {
    name: 'open_view',
    description: 'Navigate the app in this tab to a view, optionally to one item in it: a Study Guide section (guide + id), a practice card (practice + id), a quiz question (quiz + id), a practice case (scenario + id), or a hands-on guide step (hands-on + id + stepId). today, progress and official-scenarios take no id; the mock exam is not reachable by tool. Changes what the learner sees; never records progress or answers anything, and will not leave a running practice session.',
    inputSchema: {
      type: 'object',
      properties: {
        view: { type: 'string', enum: [...OPENABLE_ROUTES] },
        id: { type: 'string', description: 'Section, card, question, scenario, or hands-on guide id.' },
        stepId: { type: 'string', description: 'A step inside a hands-on guide; requires id.' },
      },
      required: ['view'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
    async execute(input) {
      const view = readRequiredString(input, 'view');
      if (isInvalid(view)) return view;
      if (!(OPENABLE_ROUTES as readonly string[]).includes(view)) return invalid(`view must be one of ${OPENABLE_ROUTES.join(', ')}`);
      const route = view as OpenableRoute;
      const id = readOptionalString(input, 'id');
      if (isInvalid(id)) return id;
      const stepId = readOptionalString(input, 'stepId');
      if (isInvalid(stepId)) return stepId;
      if (stepId && !id) return invalid('stepId requires id');
      if (id && !ITEM_ROUTES.includes(route)) return invalid(`${route} has no addressable item; call open_view with view only`);

      // The hash form runs through exactly the validation a typed URL gets, so a
      // crafted id can reach the views through this tool no more than through
      // the address bar.
      const hash = `#/${[route, id, stepId].filter((part): part is string => Boolean(part)).map(encodeURIComponent).join('/')}`;
      const link = parseDeepLink(hash);
      if (!link) return invalid('unknown destination: ids are lowercase kebab-case, and stepId is only valid for hands-on');
      if (id) {
        const missing = await describeMissingId(route, id, stepId, content);
        if (missing) return invalid(missing);
      }
      // Leaving Practice ends a running review session (see App.navigate); the
      // learner ends it, not an agent working in the background.
      if (bridge.isPracticeSessionActive() && link.view !== 'practice') return invalid('a practice session is running; the learner ends it in the app before the view can change');
      bridge.applyDeepLink(link);
      // The address bar only reflects a hash the session already had (see
      // useDeepLinkRouting), so the link is returned rather than promised there.
      return { ok: true, view: link.view, deepLink: formatDeepLink(link) };
    },
  };

  return [getStudySummary, getDueReviews, getDomainStats, searchContent, getContentItem, openView];
}

async function describeMissingId(route: OpenableRoute, id: string, stepId: string | undefined, content: WebMcpContentSource): Promise<string | null> {
  switch (route) {
    case 'guide': return (await content.sections()).some((section) => section.id === id) ? null : `no Study Guide section has id ${id}`;
    case 'practice': return (await content.cards()).some((card) => card.id === id) ? null : `no practice card has id ${id}`;
    case 'quiz': return (await content.questions()).some((question) => question.id === id) ? null : `no quiz question has id ${id}`;
    case 'scenario': return (await content.scenarios()).some((scenario) => scenario.id === id) ? null : `no practice case has id ${id}`;
    case 'hands-on': {
      const guide = (await content.guides()).find((item) => item.id === id);
      if (!guide) return `no hands-on guide has id ${id}`;
      return !stepId || guide.steps.some((step) => step.id === stepId) ? null : `hands-on guide ${id} has no step ${stepId}`;
    }
    default: return null;
  }
}
