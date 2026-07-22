import { useRef, useState } from 'preact/hooks';
import { studyGuideSections } from '../../content/study-guide';
import { cards } from '../../content/cards';
import { questions } from '../../content/questions';
import { domains } from '../../content/domains';
import { localize, type UiCopy } from '../../i18n/ui';
import {
  deriveStudyGuideProgress,
  getStudyGuideSectionStatus,
} from '../../lib/study-guide-progress';
import type { StudyGuideProgress } from '../../lib/storage';
import { SourceLinks } from '../app/SourceLinks';
import type { Locale } from '../../i18n/locales';

type Props = {
  locale: Locale;
  copy: UiCopy;
  records: Record<string, StudyGuideProgress>;
  onProgressAction: (sectionId: string, revision: number, action: 'start' | 'complete' | 'reconfirm') => boolean;
  onOpenCard: (cardId: string) => void;
  onOpenQuestion: (questionId: string) => void;
  onOpenHandsOn: () => void;
  onOpenOfficialScenarios: () => void;
};

const diagnosisStarts = ['sg-agentic-loop', 'sg-tool-and-mcp', 'sg-context-and-handoff'];

export function GuideView({ locale, copy, records, onProgressAction, onOpenCard, onOpenQuestion, onOpenHandsOn, onOpenOfficialScenarios }: Props) {
  const [diagnosis, setDiagnosis] = useState('');
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const resultRef = useRef<HTMLParagraphElement>(null);
  const summary = deriveStudyGuideProgress(studyGuideSections, records);

  const recommend = (event: Event) => {
    event.preventDefault();
    if (!diagnosis) return;
    setRecommendation(diagnosisStarts[Number(diagnosis)] ?? diagnosisStarts[0]);
    requestAnimationFrame(() => resultRef.current?.focus());
  };

  return (
    <section class="guide-view" aria-labelledby="guide-title">
      <header class="page-header">
        <p class="eyebrow">{copy.guide.eyebrow}</p><h2 id="guide-title">{copy.guide.title}</h2><p>{copy.guide.introduction}</p>
      </header>

      <section class="guide-context" aria-labelledby="guide-service-title">
        <h3 id="guide-service-title">{copy.guide.serviceTitle}</h3><p>{copy.guide.serviceBody}</p>
        <p class="guide-availability">{copy.guide.availabilityNow}</p>
      </section>

      <section class="guide-diagnosis" aria-labelledby="guide-diagnosis-title">
        <h3 id="guide-diagnosis-title">{copy.guide.diagnosisLegend}</h3>
        <form onSubmit={recommend}>
          <fieldset><legend>{copy.guide.diagnosisQuestion}</legend>
            {copy.guide.diagnosisOptions.map((option, index) => <label key={option}><input type="radio" name="guide-diagnosis" value={String(index)} checked={diagnosis === String(index)} onChange={() => setDiagnosis(String(index))}/>{option}</label>)}
          </fieldset>
          <button type="submit" disabled={!diagnosis}>{copy.guide.diagnosisSubmit}</button>
        </form>
        {recommendation && (() => {
          const section = studyGuideSections.find((candidate) => candidate.id === recommendation);
          return section ? <p class="guide-recommendation" tabIndex={-1} ref={resultRef}>{copy.guide.diagnosisResult(localize(section.title, locale))}</p> : null;
        })()}
      </section>

      <section class="guide-path" aria-labelledby="guide-path-title">
        <h3 id="guide-path-title">{copy.guide.pathTitle}</h3>
        <ol>{copy.guide.path.map((stage, index) => (
          <li key={stage.label}>
            <strong>{index + 1}.</strong>{' '}
            {stage.target === 'hands-on'
              ? <button type="button" class="guide-path-link" onClick={onOpenHandsOn}>{stage.label}</button>
              : stage.target === 'official-scenarios'
                ? <button type="button" class="guide-path-link" onClick={onOpenOfficialScenarios}>{stage.label}</button>
                : stage.label}
            <span class={stage.available ? 'guide-now' : 'guide-later'}> — {stage.available ? copy.guide.availabilityNow : copy.guide.availabilityLater}</span>
          </li>
        ))}</ol>
      </section>

      <section class="guide-handson-entry" aria-labelledby="guide-handson-title">
        <h3 id="guide-handson-title">{copy.handsOn.entryTitle}</h3>
        <p>{copy.handsOn.entryBody}</p>
        <button type="button" class="guide-handson-open" onClick={onOpenHandsOn}>{copy.handsOn.openList}</button>
      </section>

      <section class="guide-handson-entry" aria-labelledby="guide-official-title">
        <h3 id="guide-official-title">{copy.officialScenarios.entryTitle}</h3>
        <p>{copy.officialScenarios.entryBody}</p>
        <button type="button" class="guide-handson-open" onClick={onOpenOfficialScenarios}>{copy.officialScenarios.openList}</button>
      </section>

      <section class="guide-calendar" aria-labelledby="guide-calendar-title"><h3 id="guide-calendar-title">{copy.guide.calendarTitle}</h3><p>{copy.guide.calendarBody}</p></section>

      <section class="guide-sections" aria-labelledby="guide-sections-title">
        <div class="guide-section-heading"><div><p class="eyebrow">STUDY GUIDE</p><h3 id="guide-sections-title">{copy.guide.progress(summary.completed, summary.totalSections)}</h3></div><progress value={summary.completionRate} max="1">{Math.round(summary.completionRate * 100)}%</progress></div>
        {studyGuideSections.map((section) => {
          const record = records[section.id];
          const status = getStudyGuideSectionStatus(record, section.revision);
          const title = localize(section.title, locale);
          return <details class="guide-section" key={section.id}>
            <summary><span><code>{section.recommendedOrder}</code> {title}</span><span class={`guide-status status-${status}`}>{copy.guide.status[status]}</span></summary>
            <div class="guide-section-body">
              <p>{localize(section.summary, locale)}</p>
              {status === 'stale' && record && <p class="guide-state-note">{copy.guide.staleNote(copy.guide.status[record.status])}</p>}
              {status === 'future' && record && <p class="guide-state-note">{copy.guide.futureNote(copy.guide.status[record.status])}</p>}
              <h4>{copy.guide.domains}</h4><p class="guide-domain-badges">{domains.filter((domain) => section.domainIds.includes(domain.id)).map((domain) => <span class="card-domain" key={domain.id}>D{domain.number} {localize(domain.title, locale)}</span>)}</p>
              <h4>{copy.guide.statements}</h4><p class="guide-statement-ids">{section.taskStatementIds.map((id) => <code key={id}>{id}</code>)}</p>
              <h4>{copy.guide.mustKnow}</h4><ul>{localize(section.learningObjectives, locale).map((item) => <li key={item}>{item}</li>)}</ul>
              <h4>{copy.guide.keyPoints}</h4><ul>{localize(section.keyPoints, locale).map((item) => <li key={item}>{item}</li>)}</ul>
              <h4>{copy.guide.relatedCards}</h4><div class="guide-targets">{section.relatedCardIds.map((id) => {
                const card = cards.find((candidate) => candidate.id === id);
                return card ? <button type="button" key={id} onClick={() => onOpenCard(id)}>{localize(card.prompt, locale)} <code>{id}</code></button> : null;
              })}</div>
              {section.relatedQuestionIds.length > 0 && <><h4>{copy.guide.relatedQuestions}</h4><div class="guide-targets">{section.relatedQuestionIds.map((id) => {
                const question = questions.find((candidate) => candidate.id === id);
                return question ? <button type="button" key={id} onClick={() => onOpenQuestion(id)}>{localize(question.stem, locale)} <code>{id}</code></button> : null;
              })}</div></>}
              <h4>{copy.guide.officialSources}</h4><SourceLinks ids={section.sourceIds} copy={copy}/>
              <div class="guide-actions">
                {status === 'not_started' && <button type="button" onClick={() => onProgressAction(section.id, section.revision, 'start')}>{copy.guide.start}</button>}
                {status === 'in_progress' && <button type="button" onClick={() => onProgressAction(section.id, section.revision, 'complete')}>{copy.guide.complete}</button>}
                {status === 'stale' && <button type="button" onClick={() => onProgressAction(section.id, section.revision, 'reconfirm')}>{copy.guide.reconfirm}</button>}
              </div>
            </div>
          </details>;
        })}
      </section>
    </section>
  );
}
