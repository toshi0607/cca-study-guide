import { useEffect, useRef, useState } from 'preact/hooks';
import { studyGuideSections } from '../../content/study-guide';
import { cards } from '../../content/cards';
import { questions } from '../../content/questions';
import { scenarios } from '../../content/scenarios';
import { domains } from '../../content/domains';
import { learningPath, diagnosisStartSectionIds, type LearningStageTarget } from '../../content/learning-path';
import { getLearningStageMinutes } from '../../lib/stage-cost';
import { localize, type UiCopy } from '../../i18n/ui';
import { daysUntilExam, remainingGuideMinutes } from '../../lib/exam-date';
import {
  deriveStudyGuideProgress,
  getStudyGuideSectionStatus,
} from '../../lib/study-guide-progress';
import type { StudyGuideProgress } from '../../lib/storage';
import { SourceLinks } from '../app/SourceLinks';
import { CopyLinkButton } from '../app/CopyLinkButton';
import type { Locale } from '../../i18n/locales';

// View-bound stage targets (in-page anchors are handled locally, never delegated).
export type LearningStageViewTarget = Exclude<LearningStageTarget, 'guide-diagnosis' | 'guide-sections'>;

type Props = {
  locale: Locale;
  copy: UiCopy;
  records: Record<string, StudyGuideProgress>;
  hasMockExamAttempts: boolean;
  examDate: string | null;
  onProgressAction: (sectionId: string, revision: number, action: 'start' | 'complete' | 'reconfirm') => boolean;
  onOpenCard: (cardId: string) => void;
  onOpenCards: (cardIds: string[]) => void;
  onOpenQuestion: (questionId: string) => void;
  onOpenScenario: (scenarioId: string) => void;
  onOpenStage: (target: LearningStageViewTarget) => void;
  onOpenOfficialScenarios: () => void;
  targetSectionId: string | null;
  onTargetSectionOpened: () => void;
};

const diagnosisStarts = diagnosisStartSectionIds;

// Moves the viewport and keyboard focus to an in-page target without changing
// storage. Missing elements are ignored so a content change can never throw.
function focusElement(el: HTMLElement | null) {
  if (!el) return;
  // preventScroll: the smooth scroll above owns positioning; a focus-driven jump
  // would otherwise cancel the animation.
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  el.focus({ preventScroll: true });
}

export function GuideView({ locale, copy, records, hasMockExamAttempts, examDate, onProgressAction, onOpenCard, onOpenCards, onOpenQuestion, onOpenScenario, onOpenStage, onOpenOfficialScenarios, targetSectionId, onTargetSectionOpened }: Props) {
  const [diagnosis, setDiagnosis] = useState('');
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const diagnosisHeadingRef = useRef<HTMLHeadingElement>(null);
  const sectionsHeadingRef = useRef<HTMLHeadingElement>(null);
  const summary = deriveStudyGuideProgress(studyGuideSections, records);

  // A plan line stating only facts: minutes of Study Guide material left, and
  // (if a planned exam date exists and hasn't passed) days remaining. Never a
  // pace, a verdict, or a readiness judgement.
  const remainingMinutes = remainingGuideMinutes(
    studyGuideSections,
    (id, revision) => getStudyGuideSectionStatus(records[id], revision) === 'completed',
  );
  const nextSection = [...studyGuideSections]
    .sort((a, b) => a.recommendedOrder - b.recommendedOrder)
    .find((section) => getStudyGuideSectionStatus(records[section.id], section.revision) !== 'completed');
  const days = daysUntilExam(examDate, new Date());
  const nextSectionTitle = nextSection ? localize(nextSection.title, locale) : null;
  const planLine = days !== null && days >= 0
    ? copy.guide.planWithDate(days, remainingMinutes, nextSectionTitle)
    : remainingMinutes > 0
      ? copy.guide.planWithoutDate(remainingMinutes, nextSectionTitle)
      : null;

  const recommend = (event: Event) => {
    event.preventDefault();
    if (!diagnosis) return;
    setRecommendation(diagnosisStarts[Number(diagnosis)] ?? diagnosisStarts[0]);
    requestAnimationFrame(() => resultRef.current?.focus());
  };

  // Opens a specific Study Guide section: expands the details, scrolls it into
  // view, and moves focus to its summary. Reading recommendation ID must not
  // persist progress — only the explicit Start button does. A missing/unknown
  // section id is a no-op rather than an exception.
  const openSection = (sectionId: string) => {
    const details = document.getElementById(`guide-section-${sectionId}`);
    if (!(details instanceof HTMLDetailsElement)) return;
    details.open = true;
    details.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const summaryEl = details.querySelector('summary');
    if (summaryEl instanceof HTMLElement) summaryEl.focus({ preventScroll: true });
  };

  // Deep-link entry: open the requested section the same way the diagnosis
  // result and Practice/Quiz cross-links do. An unknown id is a no-op inside
  // openSection, so a stale or hand-edited link never throws.
  useEffect(() => {
    if (!targetSectionId) return;
    openSection(targetSectionId);
    onTargetSectionOpened();
  }, [targetSectionId]);

  // Learning-path CTA dispatch. In-page anchors move focus to the matching
  // heading here; every other target is delegated to App navigation.
  const openStage = (target: LearningStageTarget) => {
    if (target === 'guide-diagnosis') { focusElement(diagnosisHeadingRef.current); return; }
    if (target === 'guide-sections') { focusElement(sectionsHeadingRef.current); return; }
    onOpenStage(target);
  };

  return (
    <section class="guide-view panel-stack" aria-labelledby="guide-title">
      <header class="panel--hero">
        <p class="eyebrow">{copy.guide.eyebrow}</p><h2 id="guide-title" class="page-title">{copy.guide.title}</h2><p class="hero-lede">{copy.guide.introduction}</p>
      </header>

      <section class="guide-context panel panel--accent" aria-labelledby="guide-service-title">
        <h3 id="guide-service-title" class="section-title">{copy.guide.serviceTitle}</h3><p>{copy.guide.serviceBody}</p>
        <p class="guide-availability">{copy.guide.availableFeatures}</p>
      </section>

      <section class="guide-path panel" aria-labelledby="guide-path-title">
        <h3 id="guide-path-title" class="section-title">{copy.guide.pathTitle}</h3>
        <p class="guide-path-note">{copy.guide.pathNote}</p>
        <p class="guide-path-note">{copy.guide.stageMinutesNote}</p>

        <div class="guide-diagnosis panel panel--sm panel--accent" aria-labelledby="guide-diagnosis-title">
          <h4 id="guide-diagnosis-title" class="card-title" tabIndex={-1} ref={diagnosisHeadingRef}>{copy.guide.diagnosisLegend}</h4>
          <form onSubmit={recommend}>
            <fieldset><legend>{copy.guide.diagnosisQuestion}</legend>
              {copy.guide.diagnosisOptions.map((option, index) => <label key={option}><input type="radio" name="guide-diagnosis" value={String(index)} checked={diagnosis === String(index)} onChange={() => setDiagnosis(String(index))}/>{option}</label>)}
            </fieldset>
            <button type="submit" class="btn" disabled={!diagnosis}>{copy.guide.diagnosisSubmit}</button>
          </form>
          {recommendation && (() => {
            const section = studyGuideSections.find((candidate) => candidate.id === recommendation);
            if (!section) return null;
            return <div class="note note--success guide-recommendation" tabIndex={-1} ref={resultRef}>
              <p>{copy.guide.diagnosisResult(localize(section.title, locale))}</p>
              <button type="button" class="btn guide-recommendation-open" onClick={() => openSection(section.id)}>{copy.guide.diagnosisOpenSection(localize(section.title, locale))}</button>
            </div>;
          })()}
        </div>

        <ol class="guide-path-list">{learningPath.map((stage) => {
          const text = copy.guide.stages[stage.id];
          // The analysis stage lands on the Mock Exam start screen until an attempt
          // exists (there is nothing to analyze yet), so its CTA states that
          // precondition rather than promising an analysis screen it cannot open.
          const cta = stage.id === 'analysis' && !hasMockExamAttempts ? copy.guide.analysisCtaNoAttempt : text.cta;
          // Minutes appear only for stages whose content declares a duration, so
          // an open-ended stage is silent rather than claiming a total of zero.
          const minutes = getLearningStageMinutes(stage.id);
          return <li key={stage.id}>
            <div class="guide-path-copy"><strong>{text.title}</strong><span class="guide-path-description">{text.description}</span>
              {minutes !== null && <span class="badge badge--outline guide-path-minutes">{copy.guide.stageMinutes(minutes)}</span>}
            </div>
            <button type="button" class="btn--text" onClick={() => openStage(stage.target)}>{cta} <span aria-hidden="true">→</span></button>
          </li>;
        })}</ol>

        <p class="guide-path-aux">{copy.officialScenarios.entryBody}{' '}
          <button type="button" class="btn--text" onClick={onOpenOfficialScenarios}>{copy.officialScenarios.openList}</button>
        </p>
      </section>

      <section class="guide-sections panel" id="guide-sections" aria-labelledby="guide-sections-title">
        <div class="progress-heading"><div><p class="eyebrow">{copy.guide.sectionsEyebrow}</p><h3 id="guide-sections-title" class="section-title" tabIndex={-1} ref={sectionsHeadingRef}>{copy.guide.progress(summary.completed, summary.totalSections)}</h3></div><progress value={summary.completionRate} max="1">{Math.round(summary.completionRate * 100)}%</progress></div>
        {planLine && <p class="note note--info guide-plan-line">{planLine}</p>}
        {studyGuideSections.map((section) => {
          const record = records[section.id];
          const status = getStudyGuideSectionStatus(record, section.revision);
          const title = localize(section.title, locale);
          return <details class="guide-section" id={`guide-section-${section.id}`} key={section.id}>
            <summary><span><code>{section.recommendedOrder}</code> {title}</span><span class={`status status-${status}`}>{copy.guide.status[status]}</span></summary>
            <div class="guide-section-body">
              <p><CopyLinkButton link={{ view: 'guide', sectionId: section.id }} copy={copy} label={title} class="guide-section-copy-link"/></p>
              <p>{localize(section.summary, locale)}</p>
              {status === 'stale' && record && <p class="note note--warn guide-state-note">{copy.guide.staleNote(copy.guide.status[record.status])}</p>}
              {status === 'future' && record && <p class="note note--warn guide-state-note">{copy.guide.futureNote(copy.guide.status[record.status])}</p>}
              <h4 class="sub-title">{copy.guide.domains}</h4><p class="domain-labels">{domains.filter((domain) => section.domainIds.includes(domain.id)).map((domain) => <span class="domain-label" key={domain.id}>D{domain.number} {localize(domain.title, locale)}</span>)}</p>
              <h4 class="sub-title">{copy.guide.statements}</h4><p class="statement-ids">{section.taskStatementIds.map((id) => <code key={id}>{id}</code>)}</p>
              <h4 class="sub-title">{copy.guide.mustKnow}</h4><ul>{localize(section.learningObjectives, locale).map((item) => <li key={item}>{item}</li>)}</ul>
              <h4 class="sub-title">{copy.guide.keyPoints}</h4><ul>{localize(section.keyPoints, locale).map((item) => <li key={item}>{item}</li>)}</ul>
              <h4 class="sub-title">{copy.guide.relatedCards}</h4>
              {section.relatedCardIds.length > 1 && <p><button type="button" class="btn btn--secondary guide-related-open-all" onClick={() => onOpenCards(section.relatedCardIds)}>{copy.guide.relatedCardsOpenAll(section.relatedCardIds.length)}</button></p>}
              <div class="target-list">{section.relatedCardIds.map((id) => {
                const card = cards.find((candidate) => candidate.id === id);
                return card ? <button type="button" class="btn btn--secondary" key={id} onClick={() => onOpenCard(id)}>{localize(card.prompt, locale)} <code>{id}</code></button> : null;
              })}</div>
              {section.relatedQuestionIds.length > 0 && <><h4 class="sub-title">{copy.guide.relatedQuestions}</h4><div class="target-list">{section.relatedQuestionIds.map((id) => {
                const question = questions.find((candidate) => candidate.id === id);
                return question ? <button type="button" class="btn btn--secondary" key={id} onClick={() => onOpenQuestion(id)}>{localize(question.stem, locale)} <code>{id}</code></button> : null;
              })}</div></>}
              {section.relatedScenarioIds.length > 0 && <><h4 class="sub-title">{copy.guide.relatedScenarios}</h4><div class="target-list">{section.relatedScenarioIds.map((id) => {
                const scenario = scenarios.find((candidate) => candidate.id === id);
                return scenario ? <button type="button" class="btn btn--secondary" key={id} onClick={() => onOpenScenario(id)}>{localize(scenario.title, locale)} <code>{id}</code></button> : null;
              })}</div></>}
              <h4 class="sub-title">{copy.guide.officialSources}</h4><SourceLinks ids={section.sourceIds} copy={copy}/>
              <div class="guide-actions">
                {status === 'not_started' && <button type="button" class="btn" onClick={() => onProgressAction(section.id, section.revision, 'start')}>{copy.guide.start}</button>}
                {status === 'in_progress' && <button type="button" class="btn" onClick={() => onProgressAction(section.id, section.revision, 'complete')}>{copy.guide.complete}</button>}
                {status === 'stale' && <button type="button" class="btn" onClick={() => onProgressAction(section.id, section.revision, 'reconfirm')}>{copy.guide.reconfirm}</button>}
              </div>
            </div>
          </details>;
        })}
      </section>
    </section>
  );
}
