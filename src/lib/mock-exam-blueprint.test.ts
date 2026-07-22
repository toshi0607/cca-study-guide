import { describe, expect, it } from 'vitest';
import {
  MOCK_EXAM_DOMAIN_DISTRIBUTION,
  MOCK_EXAM_DURATION_SECONDS,
  MOCK_EXAM_QUESTION_COUNT,
  defaultMockExamBlueprint,
  validateMockExamBlueprint,
} from './mock-exam-blueprint';
import type { MockExamBlueprint } from './mock-exam-types';

const blueprint = (overrides: Partial<MockExamBlueprint> = {}): MockExamBlueprint => ({
  ...defaultMockExamBlueprint,
  domainDistribution: { ...defaultMockExamBlueprint.domainDistribution },
  ...overrides,
});

describe('Mock Exam v1 constants', () => {
  it('fixes 60 questions over 120 minutes', () => {
    expect(MOCK_EXAM_QUESTION_COUNT).toBe(60);
    expect(MOCK_EXAM_DURATION_SECONDS).toBe(7200);
  });

  it('distributes exactly 60 questions across the five domains as 16/11/12/12/9', () => {
    expect(MOCK_EXAM_DOMAIN_DISTRIBUTION).toEqual({ d1: 16, d2: 11, d3: 12, d4: 12, d5: 9 });
    const total = Object.values(MOCK_EXAM_DOMAIN_DISTRIBUTION).reduce((sum, count) => sum + count, 0);
    expect(total).toBe(MOCK_EXAM_QUESTION_COUNT);
  });
});

describe('validateMockExamBlueprint', () => {
  it('accepts the default blueprint', () => {
    expect(validateMockExamBlueprint(defaultMockExamBlueprint)).toEqual([]);
  });

  it('rejects a distribution that does not sum to the question count', () => {
    // #given — d5 dropped from 9 to 8, so the total is 59
    const errors = validateMockExamBlueprint(blueprint({ domainDistribution: { d1: 16, d2: 11, d3: 12, d4: 12, d5: 8 } }));

    // #then
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/sum to 59/);
  });

  it('rejects a question count that does not match the distribution total', () => {
    const errors = validateMockExamBlueprint(blueprint({ questionCount: 50 }));
    expect(errors.some((error) => /must equal questionCount 50/.test(error))).toBe(true);
  });

  it('rejects an unknown domain in the distribution', () => {
    const errors = validateMockExamBlueprint(blueprint({ domainDistribution: { d1: 16, d2: 11, d3: 12, d4: 12, d6: 9 } }));
    expect(errors.some((error) => /unknown domain d6/.test(error))).toBe(true);
  });

  it('rejects a non-positive per-domain count', () => {
    const errors = validateMockExamBlueprint(blueprint({ domainDistribution: { d1: 16, d2: 11, d3: 12, d4: 21, d5: 0 } }));
    expect(errors.some((error) => /for d5 must be a positive integer/.test(error))).toBe(true);
  });

  it('rejects a non-positive or non-integer duration', () => {
    expect(validateMockExamBlueprint(blueprint({ durationSeconds: 0 })).some((error) => /durationSeconds/.test(error))).toBe(true);
    expect(validateMockExamBlueprint(blueprint({ durationSeconds: -1 })).some((error) => /durationSeconds/.test(error))).toBe(true);
    expect(validateMockExamBlueprint(blueprint({ durationSeconds: 1.5 })).some((error) => /durationSeconds/.test(error))).toBe(true);
    expect(validateMockExamBlueprint(blueprint({ durationSeconds: Number.POSITIVE_INFINITY })).some((error) => /durationSeconds/.test(error))).toBe(true);
  });

  it('rejects a non-positive version and question count', () => {
    expect(validateMockExamBlueprint(blueprint({ version: 0 })).some((error) => /version/.test(error))).toBe(true);
    expect(validateMockExamBlueprint(blueprint({ questionCount: -60, domainDistribution: {} })).some((error) => /questionCount/.test(error))).toBe(true);
  });

  it('rejects an empty distribution', () => {
    expect(validateMockExamBlueprint(blueprint({ domainDistribution: {} })).some((error) => /at least one domain/.test(error))).toBe(true);
  });
});
