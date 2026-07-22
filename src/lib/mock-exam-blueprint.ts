// The Mock Exam v1 blueprint: how many questions, how long, and how they split
// across domains. Defined once here so nothing (UI, tests, storage) hardcodes
// these numbers a second time — everything reads the exported constants or the
// `defaultMockExamBlueprint`.
//
// The domain split assigns the official percentage weights (D1 27%, D2 18%,
// D3 20%, D4 20%, D5 15%) to a whole 60-question exam. It intentionally does NOT
// try to reproduce the official scaled score or the official "4 of 6 application
// scenarios" selection — Mock Exam v1 is defined as "a 60-question exam that
// reproduces the domain distribution", and scenario selection is out of scope
// (see tasks/task-8a-mock-exam-foundation.md).
import type { MockExamBlueprint, MockExamDomainDistribution } from './mock-exam-types';

export const MOCK_EXAM_QUESTION_COUNT = 60;
export const MOCK_EXAM_DURATION_SECONDS = 120 * 60;

export const MOCK_EXAM_DOMAIN_DISTRIBUTION = {
  d1: 16,
  d2: 11,
  d3: 12,
  d4: 12,
  d5: 9,
} as const;

export const MOCK_EXAM_BLUEPRINT_VERSION = 1;

export const defaultMockExamBlueprint: MockExamBlueprint = {
  version: MOCK_EXAM_BLUEPRINT_VERSION,
  questionCount: MOCK_EXAM_QUESTION_COUNT,
  durationSeconds: MOCK_EXAM_DURATION_SECONDS,
  domainDistribution: { ...MOCK_EXAM_DOMAIN_DISTRIBUTION },
};

// The five official domain ids. A blueprint may not distribute questions to a
// domain outside this set. Kept here (not imported from content) so validation
// stays a pure, content-free check.
export const MOCK_EXAM_DOMAIN_IDS: readonly string[] = ['d1', 'd2', 'd3', 'd4', 'd5'];

// Structural validation of a blueprint, independent of any question bank. Returns
// the list of problems (empty when valid) rather than throwing, so callers can
// surface them as a typed failure. `knownDomainIds` defaults to the five official
// domains; pass a different set only to validate against a custom domain list.
export function validateMockExamBlueprint(
  blueprint: MockExamBlueprint,
  knownDomainIds: ReadonlySet<string> = new Set(MOCK_EXAM_DOMAIN_IDS),
): string[] {
  const errors: string[] = [];

  if (!Number.isInteger(blueprint.version) || blueprint.version <= 0) {
    errors.push('blueprint version must be a positive integer');
  }
  if (!Number.isInteger(blueprint.questionCount) || blueprint.questionCount <= 0) {
    errors.push('blueprint questionCount must be a positive integer');
  }
  if (!Number.isInteger(blueprint.durationSeconds) || blueprint.durationSeconds <= 0) {
    errors.push('blueprint durationSeconds must be a positive finite integer');
  }

  const distribution: MockExamDomainDistribution = blueprint.domainDistribution ?? {};
  const domainIds = Object.keys(distribution);
  if (domainIds.length === 0) {
    errors.push('blueprint domainDistribution must name at least one domain');
  }

  let sum = 0;
  for (const domainId of domainIds) {
    if (!knownDomainIds.has(domainId)) {
      errors.push(`blueprint domainDistribution references unknown domain ${domainId}`);
    }
    const count = distribution[domainId];
    if (!Number.isInteger(count) || count <= 0) {
      errors.push(`blueprint domainDistribution for ${domainId} must be a positive integer`);
    } else {
      sum += count;
    }
  }

  if (errors.length === 0 && sum !== blueprint.questionCount) {
    errors.push(`blueprint domain counts sum to ${sum}, which must equal questionCount ${blueprint.questionCount}`);
  }

  return errors;
}
