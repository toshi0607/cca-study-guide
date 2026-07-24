import type { MutableRef } from 'preact/hooks';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { domains } from '../../content/domains';
import { questions } from '../../content/questions';
import { skillById } from '../../content/skills';
import type { Locale } from '../../i18n/locales';
import { localize, type UiCopy } from '../../i18n/ui';
import type { MockExamAttempt } from '../../lib/mock-exam';
import {
  analyzeMockExams,
  type MockExamAnalysisRange,
  type MockExamReviewCandidate,
  type MockExamReviewPriority,
} from '../../lib/mock-exam-analysis';
import { MockExamAxisTable } from './MockExamAxisTable';
import { MockExamNextActions } from './MockExamNextActions';
import { MockExamTrend } from './MockExamTrend';

export type MockExamAnalysisProps = {
  locale: Locale;
  copy: UiCopy;
  attempts: readonly MockExamAttempt[];
  headingRef: MutableRef<HTMLHeadingElement | null>;
  onOpenPractice: (domainId?: string) => void;
  onTakeAnother: () => void;
  onBack: () => void;
};

// The learning-analysis view. It owns only the range toggle; every number comes
// from the pure `analyzeMockExams` and is merely displayed here. Domain, skill,
// and difficulty display names are resolved from content at render time — the
// analyzer speaks in ids so it stays content-agnostic and testable. Nothing on
// this screen predicts an official pass/fail, a scaled score, or a readiness
// verdict; the copy repeatedly says so.
export function MockExamAnalysis({ locale, copy, attempts, headingRef, onOpenPractice, onTakeAnother, onBack }: MockExamAnalysisProps) {
  const a = copy.mockExam.analysis;
  const [range, setRange] = useState<MockExamAnalysisRange>('all-time');

  // The view is dynamically imported, so its main heading only exists once this
  // component mounts. Move focus here (not on the phase switch in the parent) so a
  // keyboard/screen-reader user lands on the analysis title, not the loading text.
  useEffect(() => { requestAnimationFrame(() => headingRef.current?.focus()); }, [headingRef]);

  const analysis = useMemo(() => analyzeMockExams(attempts, questions, range), [attempts, range]);

  const domainTitleById = useMemo(() => new Map(domains.map((domain) => [domain.id, localize(domain.title, locale)])), [locale]);
  const domainLabel = (domainId: string): string => domainTitleById.get(domainId) ?? domainId;
  const skillLabel = (skillId: string): string => {
    const skill = skillById[skillId as keyof typeof skillById];
    return skill ? localize(skill.title, locale) : skillId;
  };
  const difficultyLabel = (key: string): string => copy.mockExam.difficulty[key as keyof typeof copy.mockExam.difficulty] ?? key;

  const renderCandidate = (candidate: MockExamReviewCandidate): string =>
    candidate.kind === 'domain' ? domainLabel(candidate.key) : skillLabel(candidate.key);

  const renderPriority = (priority: MockExamReviewPriority, subheading: string, subId: string) => (
    <div class="mock-exam-review-group">
      <h4 id={subId}>{subheading}</h4>
      {priority.status === 'insufficient' && <p class="mock-exam-axis-empty">{a.reviewInsufficient}</p>}
      {priority.status === 'none' && <p class="mock-exam-axis-empty">{a.reviewNone}</p>}
      {priority.status === 'ranked' && (
        <ol class="mock-exam-priority-list" aria-labelledby={subId}>
          {priority.candidates.map((candidate) => (
            <li key={candidate.key} class="mock-exam-priority-item">
              <span class="mock-exam-priority-name">{renderCandidate(candidate)}</span>
              <span class="mock-exam-priority-detail">
                {a.accuracyValue(Math.round(candidate.rawAccuracy * 100))} · {a.colIncorrect} {candidate.incorrect} · {a.colCount} {candidate.compatibleCount}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );

  const stability = a.stability[analysis.stability];

  const isEmpty = analysis.totalAttemptCount === 0;

  return (
    <section class="mock-exam-analysis" aria-labelledby="mock-exam-analysis-title">
      <header class="panel--hero is-compact">
        <p class="eyebrow">{a.eyebrow}</p>
        <h2 id="mock-exam-analysis-title" class="page-title" tabIndex={-1} ref={headingRef}>{a.title}</h2>
        <p>{a.intro}</p>
      </header>

      {isEmpty
        ? <div class="mock-exam-analysis-empty">
            <p class="mock-exam-analysis-empty-title">{a.emptyTitle}</p>
            <p>{a.emptyBody}</p>
          </div>
        : <>
            <div class="mock-exam-range" role="group" aria-label={a.rangeLegend}>
              <span class="mock-exam-range-legend" aria-hidden="true">{a.rangeLegend}</span>
              <button type="button" class={`chip${range === 'all-time' ? ' is-selected' : ''}`} aria-pressed={range === 'all-time'} onClick={() => setRange('all-time')}>{a.rangeAllTime}</button>
              <button type="button" class={`chip${range === 'recent-3' ? ' is-selected' : ''}`} aria-pressed={range === 'recent-3'} onClick={() => setRange('recent-3')}>{a.rangeRecent3}</button>
              <span class="mock-exam-range-summary">{a.rangeSummary(analysis.attemptCount, analysis.totalAttemptCount)}</span>
            </div>

            <p class="mock-exam-analysis-counts">
              <span>{a.compatibleAnswers(analysis.compatibleAnswerCount)}</span>
              <span>{a.staleExcluded(analysis.staleAnswerCount)}</span>
            </p>
            <p class="note note--info mock-exam-analysis-note" role="note">{a.staleNote}</p>

            <section class="panel panel--sm mock-exam-stability" aria-labelledby="mock-exam-analysis-stability-title">
              <h3 id="mock-exam-analysis-stability-title" class="card-title">{a.stabilityHeading}</h3>
              <p class="mock-exam-stability-label"><strong>{stability.label}</strong></p>
              <p>{stability.description}</p>
              <ul class="mock-exam-stability-disclaimers">
                {a.stabilityDisclaimers.map((line) => <li key={line}>{line}</li>)}
              </ul>
            </section>

            <section class="panel panel--sm mock-exam-evidence" aria-labelledby="mock-exam-analysis-evidence-title">
              <h3 id="mock-exam-analysis-evidence-title" class="card-title">{a.evidenceLegend}</h3>
              <p>{a.evidenceExplanation}</p>
              <ul class="mock-exam-evidence-legend">
                <li>{a.evidence.insufficient}</li>
                <li>{a.evidence.limited}</li>
                <li>{a.evidence.sufficient}</li>
              </ul>
            </section>

            <MockExamAxisTable heading={a.domainHeading} headingId="mock-exam-analysis-domain-title" rows={analysis.byDomain} labelFor={domainLabel} copy={copy}/>
            <MockExamAxisTable heading={a.difficultyHeading} headingId="mock-exam-analysis-difficulty-title" rows={analysis.byDifficulty} labelFor={difficultyLabel} copy={copy}/>
            <MockExamAxisTable heading={a.skillHeading} headingId="mock-exam-analysis-skill-title" rows={analysis.bySkill} labelFor={skillLabel} copy={copy} note={a.skillMultiNote}/>

            <section class="panel panel--sm mock-exam-priority" aria-labelledby="mock-exam-analysis-review-title">
              <h3 id="mock-exam-analysis-review-title" class="card-title">{a.reviewHeading}</h3>
              <p class="note note--info mock-exam-analysis-note">{a.reviewNote}</p>
              {renderPriority(analysis.reviewPriority.domain, a.reviewDomainSub, 'mock-exam-analysis-review-domain')}
              {renderPriority(analysis.reviewPriority.skill, a.reviewSkillSub, 'mock-exam-analysis-review-skill')}
            </section>

            <MockExamNextActions actions={analysis.nextActions} copy={copy} domainLabel={domainLabel} skillLabel={skillLabel} onOpenPractice={onOpenPractice} onTakeAnother={onTakeAnother}/>

            <MockExamTrend points={analysis.trend} locale={locale} copy={copy}/>
          </>}

      <button type="button" class="btn--text mock-exam-link" onClick={onBack}>{a.back}</button>
    </section>
  );
}
