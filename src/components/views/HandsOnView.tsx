import { useEffect, useRef, useState } from 'preact/hooks';
import { handsOnGuides } from '../../content/hands-on';
import { cards } from '../../content/cards';
import { questions } from '../../content/questions';
import { domains } from '../../content/domains';
import { officialScenarioById } from '../../content/scenarios';
import { skillById } from '../../content/skills';
import { localize, type UiCopy } from '../../i18n/ui';
import {
  deriveHandsOnProgress,
  getHandsOnGuideStatus,
  getHandsOnStepProgress,
} from '../../lib/hands-on-progress';
import type { HandsOnProgress } from '../../lib/storage';
import { SourceLinks } from '../app/SourceLinks';
import { formatDate } from '../app/format';
import type { Locale } from '../../i18n/locales';

type Props = {
  locale: Locale;
  copy: UiCopy;
  records: Record<string, HandsOnProgress>;
  onStart: (guideId: string, revision: number) => boolean;
  onToggleStep: (guideId: string, revision: number, stepIds: string[], stepId: string, complete: boolean) => boolean;
  onComplete: (guideId: string, revision: number, stepIds: string[]) => boolean;
  onReconfirm: (guideId: string, revision: number) => boolean;
  onOpenCard: (cardId: string) => void;
  onOpenQuestion: (questionId: string) => void;
  targetGuideId: string | null;
  onTargetOpened: () => void;
};

export function HandsOnView({ locale, copy, records, onStart, onToggleStep, onComplete, onReconfirm, onOpenCard, onOpenQuestion, targetGuideId, onTargetOpened }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const listHeadingRef = useRef<HTMLHeadingElement>(null);
  const detailHeadingRef = useRef<HTMLHeadingElement>(null);
  const c = copy.handsOn;

  // Exact-target entry from the official scenarios view: open the requested
  // guide's detail directly, then clear the target so a later manual return to
  // the list is not overridden. Focus lands on the detail heading via the effect
  // below, which the back button then returns to the list heading.
  useEffect(() => {
    if (!targetGuideId) return;
    if (handsOnGuides.some((guide) => guide.id === targetGuideId)) setSelectedId(targetGuideId);
    onTargetOpened();
  }, [targetGuideId]);

  const selected = selectedId ? handsOnGuides.find((guide) => guide.id === selectedId) ?? null : null;

  useEffect(() => {
    const target = selected ? detailHeadingRef.current : listHeadingRef.current;
    requestAnimationFrame(() => target?.focus());
  }, [selectedId, selected]);

  if (selected) {
    const stepIds = selected.steps.map((step) => step.id);
    const record = records[selected.id];
    const status = getHandsOnGuideStatus(record, selected.revision);
    const done = new Set(status === 'in_progress' || status === 'completed' ? record?.completedStepIds ?? [] : []);
    const stepProgress = getHandsOnStepProgress(record, selected.revision, stepIds);
    const editable = status === 'in_progress' || status === 'completed';
    const allDone = stepIds.length > 0 && stepIds.every((id) => done.has(id));

    return (
      <section class="handson-view panel-stack" aria-labelledby="handson-detail-title">
        <p class="handson-back"><button type="button" class="btn--text" onClick={() => setSelectedId(null)}>{c.backToList}</button></p>
        <header class="panel--hero is-compact">
          <p class="eyebrow">{c.eyebrow}</p>
          <h2 id="handson-detail-title" class="page-title" tabIndex={-1} ref={detailHeadingRef}>{localize(selected.title, locale)}</h2>
          <p class="hero-lede">{localize(selected.summary, locale)}</p>
          <p class="handson-meta">
            <span class={`status status-${status}`}>{c.status[status]}</span>
            <span class="handson-minutes">{c.estimatedTime}: {c.minutes(selected.estimatedMinutes)}</span>
            {editable && <span class="handson-stepcount">{c.stepCount(stepProgress.completed, stepProgress.total)}</span>}
          </p>
        </header>

        {status === 'stale' && <p class="note note--warn guide-state-note" role="note">{c.staleNote}</p>}
        {status === 'future' && <p class="note note--warn guide-state-note" role="note">{c.futureNote}</p>}
        {status === 'in_progress' && record?.status === 'in_progress' && record.previousCompletedAt && <p class="note note--success guide-state-note--completed" role="note">{c.previouslyCompleted(formatDate(new Date(record.previousCompletedAt), locale))}</p>}

        <div class="panel meta-grid">
          <div><h3 class="sub-title">{c.domains}</h3><p class="domain-labels">{domains.filter((domain) => selected.domainIds.includes(domain.id)).map((domain) => <span class="domain-label" key={domain.id}>D{domain.number} {localize(domain.title, locale)}</span>)}</p></div>
          <div><h3 class="sub-title">{c.taskStatements}</h3><p class="statement-ids">{selected.taskStatementIds.map((id) => <code key={id}>{id}</code>)}</p></div>
          <div><h3 class="sub-title">{c.scenarios}</h3><p>{selected.officialScenarioIds.map((id) => officialScenarioById[id]).filter(Boolean).map((scenario) => localize(scenario.title, locale)).join('・')}</p></div>
          <div><h3 class="sub-title">{c.skills}</h3><p>{selected.skillIds.map((id) => skillById[id]).filter(Boolean).map((skill) => localize(skill.title, locale)).join('・')}</p></div>
        </div>

        <section class="panel" aria-labelledby="handson-objectives"><h3 id="handson-objectives" class="section-title">{c.objectives}</h3><ul>{localize(selected.learningObjectives, locale).map((item) => <li key={item}>{item}</li>)}</ul></section>
        <section class="panel" aria-labelledby="handson-prereq"><h3 id="handson-prereq" class="section-title">{c.prerequisites}</h3><ul>{localize(selected.prerequisites, locale).map((item) => <li key={item}>{item}</li>)}</ul></section>
        <section class="panel" aria-labelledby="handson-env"><h3 id="handson-env" class="section-title">{c.environment}</h3><ul>{localize(selected.environment, locale).map((item) => <li key={item}>{item}</li>)}</ul></section>
        <section class="panel" aria-labelledby="handson-setup"><h3 id="handson-setup" class="section-title">{c.setup}</h3><ol>{localize(selected.setup, locale).map((item) => <li key={item}>{item}</li>)}</ol></section>

        <section class="panel" aria-labelledby="handson-steps-title">
          <h3 id="handson-steps-title" class="section-title">{c.stepsLegend}</h3>
          <fieldset class="handson-steps" disabled={!editable}>
            <legend class="sr-only">{c.stepsLegend}</legend>
            {selected.steps.map((step, index) => {
              const checkboxId = `handson-step-${selected.id}-${step.id}`;
              return (
                <div class="handson-step" key={step.id}>
                  <p class="handson-step-check">
                    <input type="checkbox" id={checkboxId} checked={done.has(step.id)}
                      onChange={(event) => onToggleStep(selected.id, selected.revision, stepIds, step.id, (event.currentTarget as HTMLInputElement).checked)}/>
                    <label for={checkboxId}><span class="handson-step-num">{index + 1}</span> {localize(step.title, locale)}</label>
                  </p>
                  <ol class="handson-step-instructions">{localize(step.instructions, locale).map((item) => <li key={item}>{item}</li>)}</ol>
                  <p class="handson-step-expected"><strong>{c.expectedResult}:</strong></p>
                  <ul class="handson-step-expected-list">{localize(step.expectedResult, locale).map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              );
            })}
          </fieldset>
        </section>

        <section class="panel" aria-labelledby="handson-deliverables"><h3 id="handson-deliverables" class="section-title">{c.deliverables}</h3><ul>{localize(selected.deliverables, locale).map((item) => <li key={item}>{item}</li>)}</ul></section>
        <section class="panel" aria-labelledby="handson-verification"><h3 id="handson-verification" class="section-title">{c.verification}</h3><ul>{localize(selected.verification, locale).map((item) => <li key={item}>{item}</li>)}</ul></section>

        <section class="panel" aria-labelledby="handson-trouble">
          <h3 id="handson-trouble" class="section-title">{c.troubleshooting}</h3>
          <dl class="handson-troubleshooting">{selected.troubleshooting.map((pitfall) => (
            <div key={pitfall.id}>
              <dt>{c.symptom}: {localize(pitfall.symptom, locale)}</dt>
              <dd>{c.isolation}: {localize(pitfall.isolation, locale)}</dd>
            </div>
          ))}</dl>
        </section>

        <section class="panel" aria-labelledby="handson-security"><h3 id="handson-security" class="section-title">{c.security}</h3><ul>{localize(selected.securityNotes, locale).map((item) => <li key={item}>{item}</li>)}</ul></section>
        <section class="panel" aria-labelledby="handson-cost"><h3 id="handson-cost" class="section-title">{c.cost}</h3><ul>{localize(selected.costNotes, locale).map((item) => <li key={item}>{item}</li>)}</ul></section>
        {selected.cleanup && <section class="panel" aria-labelledby="handson-cleanup"><h3 id="handson-cleanup" class="section-title">{c.cleanup}</h3><ul>{localize(selected.cleanup, locale).map((item) => <li key={item}>{item}</li>)}</ul></section>}
        <section class="panel" aria-labelledby="handson-reflection"><h3 id="handson-reflection" class="section-title">{c.reflection}</h3><ul>{localize(selected.reflection, locale).map((item) => <li key={item}>{item}</li>)}</ul></section>

        <section class="panel" aria-labelledby="handson-related-cards"><h3 id="handson-related-cards" class="section-title">{c.relatedCards}</h3><div class="target-list">{selected.relatedCardIds.map((id) => {
          const card = cards.find((candidate) => candidate.id === id);
          return card ? <button type="button" class="btn btn--secondary" key={id} onClick={() => onOpenCard(id)}>{localize(card.prompt, locale)} <code>{id}</code></button> : null;
        })}</div></section>
        <section class="panel" aria-labelledby="handson-related-questions"><h3 id="handson-related-questions" class="section-title">{c.relatedQuestions}</h3><div class="target-list">{selected.relatedQuestionIds.map((id) => {
          const question = questions.find((candidate) => candidate.id === id);
          return question ? <button type="button" class="btn btn--secondary" key={id} onClick={() => onOpenQuestion(id)}>{localize(question.stem, locale)} <code>{id}</code></button> : null;
        })}</div></section>
        <section class="panel" aria-labelledby="handson-sources"><h3 id="handson-sources" class="section-title">{c.officialSources}</h3><SourceLinks ids={selected.sourceIds} copy={copy}/></section>

        <div class="handson-actions">
          {status === 'not_started' && <button type="button" class="btn" onClick={() => onStart(selected.id, selected.revision)}>{c.start}</button>}
          {status === 'in_progress' && <><button type="button" class="btn" disabled={!allDone} onClick={() => onComplete(selected.id, selected.revision, stepIds)}>{c.complete}</button>{!allDone && <span class="handson-complete-hint">{c.completeHint}</span>}</>}
          {status === 'stale' && <button type="button" class="btn" onClick={() => onReconfirm(selected.id, selected.revision)}>{c.reconfirm}</button>}
        </div>
      </section>
    );
  }

  const summary = deriveHandsOnProgress(handsOnGuides, records);
  return (
    <section class="handson-view panel-stack" aria-labelledby="handson-title">
      <header class="panel--hero">
        <p class="eyebrow">{c.eyebrow}</p>
        <h2 id="handson-title" class="page-title" tabIndex={-1} ref={listHeadingRef}>{c.title}</h2>
        <p class="hero-lede">{c.introduction}</p>
      </header>
      <div class="panel">
        <div class="progress-heading">
          <div><p class="eyebrow">{c.listEyebrow}</p><h3 class="section-title">{c.listProgress(summary.completed, summary.totalGuides)}</h3></div>
          <progress value={summary.completionRate} max="1">{Math.round(summary.completionRate * 100)}%</progress>
        </div>
      </div>
      <ul class="handson-list">
        {handsOnGuides.map((guide) => {
          const record = records[guide.id];
          const status = getHandsOnGuideStatus(record, guide.revision);
          const stepIds = guide.steps.map((step) => step.id);
          const stepProgress = getHandsOnStepProgress(record, guide.revision, stepIds);
          return (
            <li class="handson-card panel panel--sm panel--accent" key={guide.id}>
              <div class="entry-card-head">
                <h3 class="card-title"><button type="button" class="btn--text" onClick={() => setSelectedId(guide.id)}>{localize(guide.title, locale)}</button></h3>
                <span class={`status status-${status}`}>{c.status[status]}</span>
              </div>
              <p class="handson-card-summary">{localize(guide.summary, locale)}</p>
              <p class="handson-card-meta">
                <span>{c.minutes(guide.estimatedMinutes)}</span>
                {domains.filter((domain) => guide.domainIds.includes(domain.id)).map((domain) => <span class="badge badge--ink" key={domain.id}>D{domain.number}</span>)}
                <span class="handson-card-scenario">{guide.officialScenarioIds.map((id) => officialScenarioById[id]).filter(Boolean).map((scenario) => localize(scenario.title, locale)).join('・')}</span>
              </p>
              {(status === 'in_progress' || status === 'completed') && <p class="handson-card-steps">{c.stepCount(stepProgress.completed, stepProgress.total)}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
