import { describe, expect, it } from 'vitest';
import { buildDeepLinkUrl, formatDeepLink, parseDeepLink, type DeepLink } from './deep-link';

describe('parseDeepLink — one route per view', () => {
  it('parses the today route with no target', () => {
    // #given a hash with no target segment
    // #when
    const result = parseDeepLink('#/today');
    // #then
    expect(result).toEqual({ view: 'today' });
  });

  it('parses a guide route into a sectionId target', () => {
    // #given a Study Guide section deep link
    // #when
    const result = parseDeepLink('#/guide/sg-agentic-loop');
    // #then
    expect(result).toEqual({ view: 'guide', sectionId: 'sg-agentic-loop' });
  });

  it('parses a practice route into a cardId target', () => {
    // #given a practice card deep link
    // #when
    const result = parseDeepLink('#/practice/d1-stop-truncation');
    // #then
    expect(result).toEqual({ view: 'practice', cardId: 'd1-stop-truncation' });
  });

  it('parses a quiz route into a questionId target', () => {
    // #given a quiz question deep link
    // #when
    const result = parseDeepLink('#/quiz/q-abc');
    // #then
    expect(result).toEqual({ view: 'quiz', questionId: 'q-abc' });
  });

  it('parses a scenario route onto the quiz view with a scenarioId target', () => {
    // #given a scenario deep link — its own route because it lands on the quiz
    // view with a different target than quiz/<questionId>
    // #when
    const result = parseDeepLink('#/scenario/sc-abc');
    // #then
    expect(result).toEqual({ view: 'quiz', scenarioId: 'sc-abc' });
  });

  it('parses a hands-on route with only a guideId target', () => {
    // #given a hands-on guide deep link with no step segment
    // #when
    const result = parseDeepLink('#/hands-on/ho-x');
    // #then
    expect(result).toEqual({ view: 'hands-on', handsOnGuideId: 'ho-x' });
  });

  it('parses a hands-on route with both a guideId and a stepId target', () => {
    // #given a hands-on step deep link
    // #when
    const result = parseDeepLink('#/hands-on/ho-x/step-loop');
    // #then
    expect(result).toEqual({ view: 'hands-on', handsOnGuideId: 'ho-x', handsOnStepId: 'step-loop' });
  });

  it('parses the mock-exam route with no target', () => {
    // #given / #when
    const result = parseDeepLink('#/mock-exam');
    // #then
    expect(result).toEqual({ view: 'mock-exam' });
  });

  it('parses the official-scenarios route with no target', () => {
    // #given / #when
    const result = parseDeepLink('#/official-scenarios');
    // #then
    expect(result).toEqual({ view: 'official-scenarios' });
  });

  it('parses the progress route with no target', () => {
    // #given / #when
    const result = parseDeepLink('#/progress');
    // #then
    expect(result).toEqual({ view: 'progress' });
  });
});

describe('parseDeepLink — leading "#" and "/" are optional', () => {
  it('yields the same result whether or not the hash carries a leading "#" and "/"', () => {
    // #given the same route written with and without the leading punctuation
    // #when
    const withHash = parseDeepLink('#/guide/sg-x');
    const withoutHash = parseDeepLink('guide/sg-x');
    const hashNoSlash = parseDeepLink('#guide/sg-x');
    // #then all three parse identically
    expect(withoutHash).toEqual(withHash);
    expect(hashNoSlash).toEqual(withHash);
  });
});

describe('parseDeepLink — rejects empty, unknown, and over-long hashes', () => {
  it('returns null for an empty string and for a bare "#"', () => {
    // #given a hash with nothing after the leading punctuation
    // #when / #then
    expect(parseDeepLink('')).toBeNull();
    expect(parseDeepLink('#')).toBeNull();
  });

  it('returns null for a route this build does not recognise', () => {
    // #given a hash written by some other feature or a stale link
    // #when / #then
    expect(parseDeepLink('#/nope')).toBeNull();
  });

  it('returns null once a hash carries more than three segments', () => {
    // #given a hands-on step link with a trailing extra segment
    // #when / #then
    expect(parseDeepLink('#/hands-on/ho-x/step-loop/extra')).toBeNull();
  });
});

describe('parseDeepLink — rejects malformed ids', () => {
  it('rejects an id with uppercase characters', () => {
    // #given a hand-crafted hash using an uppercase section id
    // #when / #then
    expect(parseDeepLink('#/guide/SG-X')).toBeNull();
  });

  it('rejects an id attempting path traversal', () => {
    // #given a hash trying to smuggle ".." as a segment
    // #when / #then
    expect(parseDeepLink('#/guide/../etc')).toBeNull();
  });

  it('rejects an id longer than 64 characters', () => {
    // #given an id one character past the allowed length
    const overLong = `sg-${'a'.repeat(65)}`;
    // #when / #then
    expect(parseDeepLink(`#/guide/${overLong}`)).toBeNull();
  });

  it('rejects a hash made only of empty segments', () => {
    // #given a hash with no non-empty segment at all
    // #when / #then
    expect(parseDeepLink('#///')).toBeNull();
  });
});

describe('parseDeepLink — routes with no target ignore a trailing segment', () => {
  it('still resolves to the view instead of failing the whole link', () => {
    // #given a target-less route with an extra (unused) segment
    // #when
    const result = parseDeepLink('#/today/whatever');
    // #then
    expect(result).toEqual({ view: 'today' });
  });
});

describe('formatDeepLink', () => {
  it('formats a view with no target', () => {
    expect(formatDeepLink({ view: 'today' })).toBe('#/today');
  });

  it('formats a guide section link', () => {
    expect(formatDeepLink({ view: 'guide', sectionId: 'sg-x' })).toBe('#/guide/sg-x');
  });

  it('formats a practice card link', () => {
    expect(formatDeepLink({ view: 'practice', cardId: 'd1-x' })).toBe('#/practice/d1-x');
  });

  it('formats a quiz question link', () => {
    expect(formatDeepLink({ view: 'quiz', questionId: 'q-abc' })).toBe('#/quiz/q-abc');
  });

  it('formats a scenario link on the "scenario" route, not "quiz"', () => {
    // #given a quiz-view link carrying a scenarioId
    // #then it takes the dedicated scenario route
    expect(formatDeepLink({ view: 'quiz', scenarioId: 'sc-x' })).toBe('#/scenario/sc-x');
  });

  it('formats a hands-on guide link with no step', () => {
    expect(formatDeepLink({ view: 'hands-on', handsOnGuideId: 'ho-x' })).toBe('#/hands-on/ho-x');
  });

  it('formats a hands-on step link with both guideId and stepId', () => {
    expect(formatDeepLink({ view: 'hands-on', handsOnGuideId: 'ho-x', handsOnStepId: 'step-loop' })).toBe('#/hands-on/ho-x/step-loop');
  });
});

describe('parseDeepLink(formatDeepLink(link)) round trip', () => {
  const representativeLinks: DeepLink[] = [
    { view: 'today' },
    { view: 'guide', sectionId: 'sg-x' },
    { view: 'practice', cardId: 'd1-x' },
    { view: 'quiz', questionId: 'q-abc' },
    { view: 'quiz', scenarioId: 'sc-x' },
    { view: 'hands-on', handsOnGuideId: 'ho-x', handsOnStepId: 'step-loop' },
  ];

  it.each(representativeLinks)('is invariant for %j', (link) => {
    // #given a representative deep link
    // #when it is formatted then parsed back
    const result = parseDeepLink(formatDeepLink(link));
    // #then the round trip reproduces the original link exactly
    expect(result).toEqual(link);
  });
});

describe('buildDeepLinkUrl', () => {
  it('joins origin, pathname, and the formatted hash', () => {
    // #given the site root and a guide section target
    // #when
    const url = buildDeepLinkUrl({ origin: 'https://cca.toshi0607.com', pathname: '/' }, { view: 'guide', sectionId: 'sg-x' });
    // #then
    expect(url).toBe('https://cca.toshi0607.com/#/guide/sg-x');
  });

  it('carries a non-root pathname (e.g. the English site) through unchanged', () => {
    // #given the English locale's path prefix
    // #when
    const url = buildDeepLinkUrl({ origin: 'https://cca.toshi0607.com', pathname: '/en/' }, { view: 'guide', sectionId: 'sg-x' });
    // #then
    expect(url).toBe('https://cca.toshi0607.com/en/#/guide/sg-x');
  });
});
