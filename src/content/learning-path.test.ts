import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  learningPath,
  diagnosisStartSectionIds,
  LEARNING_STAGE_VIEW_TARGETS,
  LEARNING_STAGE_GUIDE_ANCHORS,
  type LearningStageTarget,
} from './learning-path';
import { studyGuideSections } from './study-guide';
import { VERIFIED_AT } from './sources';
import { ui } from '../i18n/ui';
import { locales } from '../i18n/locales';

const readmeText = readFileSync(fileURLToPath(new URL('../../README.md', import.meta.url)), 'utf8');

// The App View union has no runtime form; this mirrors src/components/app/types.ts.
// A stage target that resolves to a view must be one of these.
const KNOWN_VIEWS = ['today', 'guide', 'practice', 'quiz', 'progress', 'hands-on', 'official-scenarios', 'mock-exam'];

// User-facing copy and the README must stay free of person/date-specific framing.
// Scope is deliberately narrow (copy + README), never task plans or commit history.
const FORBIDDEN = [/8月末/, /end of August/i, /残り期間/, /remaining time/i];

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === 'string') { out.push(value); return; }
  if (Array.isArray(value)) { value.forEach((item) => collectStrings(item, out)); return; }
  if (value && typeof value === 'object') { Object.values(value).forEach((item) => collectStrings(item, out)); }
}

describe('learning path (capability single source)', () => {
  it('numbers stages 1..n with no gaps or duplicates', () => {
    // #given the ordered stages
    const orders = learningPath.map((stage) => stage.order);
    // #then order is exactly 1..n, unique and continuous
    expect(orders).toEqual(learningPath.map((_, index) => index + 1));
    expect(new Set(orders).size).toBe(orders.length);
  });

  it('has unique stage ids', () => {
    const ids = learningPath.map((stage) => stage.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('points every stage at a real App view or an in-page Guide anchor', () => {
    for (const stage of learningPath) {
      const anchor = (LEARNING_STAGE_GUIDE_ANCHORS as readonly string[]).includes(stage.target);
      const view = (LEARNING_STAGE_VIEW_TARGETS as Record<string, string>)[stage.target];
      // #then the target resolves to a known destination — never a future/unbuilt feature
      expect(anchor || KNOWN_VIEWS.includes(view)).toBe(true);
    }
  });

  it('maps every view target to a valid App view', () => {
    for (const view of Object.values(LEARNING_STAGE_VIEW_TARGETS)) {
      expect(KNOWN_VIEWS).toContain(view);
    }
  });

  it('references only Study Guide sections that exist', () => {
    const sectionIds = new Set(studyGuideSections.map((section) => section.id));
    for (const id of diagnosisStartSectionIds) {
      expect(sectionIds.has(id)).toBe(true);
    }
  });

  it('gives every stage non-empty title, description, and CTA in every locale', () => {
    for (const locale of locales) {
      for (const stage of learningPath) {
        const text = ui[locale].guide.stages[stage.id];
        // #then no stage is ever rendered without a CTA
        expect(text, `${locale}/${stage.id}`).toBeTruthy();
        expect(text.title.trim().length).toBeGreaterThan(0);
        expect(text.description.trim().length).toBeGreaterThan(0);
        expect(text.cta.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('keeps the stage structure identical across locales', () => {
    // #given the stage id set defined by the typed data
    const expected = [...learningPath.map((stage) => stage.id)].sort();
    // #then each locale's copy exposes exactly that set — no locale-only stage
    for (const locale of locales) {
      expect(Object.keys(ui[locale].guide.stages).sort()).toEqual(expected);
    }
  });

  it('never marks an implemented stage as unavailable (no availability flag on the data)', () => {
    // #then the typed data carries no per-stage availability field — every listed
    // stage is a shipped feature by construction, so drift to "future" is impossible
    for (const stage of learningPath) {
      expect(stage).not.toHaveProperty('available');
    }
  });
});

describe('user-facing copy stays audience-neutral', () => {
  it('contains no person/date-specific framing in any UI string', () => {
    const strings: string[] = [];
    collectStrings(ui, strings);
    for (const pattern of FORBIDDEN) {
      const offenders = strings.filter((value) => pattern.test(value));
      expect(offenders, `pattern ${pattern}`).toEqual([]);
    }
  });

  it('contains no person/date-specific framing in the README', () => {
    for (const pattern of FORBIDDEN) {
      expect(pattern.test(readmeText), `pattern ${pattern}`).toBe(false);
    }
  });

  it('keeps the README official-sources verified date in sync with content', () => {
    // #then the README "最終確認" line matches the single VERIFIED_AT source of truth
    expect(readmeText).toContain(`最終確認: ${VERIFIED_AT}`);
  });
});

describe('learning-path target type', () => {
  it('exhaustively covers view targets and anchors', () => {
    // #given every possible target value
    const all: LearningStageTarget[] = ['guide-diagnosis', 'guide-sections', 'hands-on', 'practice', 'quiz', 'mock-exam', 'mock-exam-analysis'];
    // #then each is either an anchor or a view target — the union has no orphan
    for (const target of all) {
      const anchor = (LEARNING_STAGE_GUIDE_ANCHORS as readonly string[]).includes(target);
      const view = target in LEARNING_STAGE_VIEW_TARGETS;
      expect(anchor || view).toBe(true);
    }
  });
});
