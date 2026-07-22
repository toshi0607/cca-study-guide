import { useEffect, useRef, useState } from 'preact/hooks';
import { officialScenarioLearnings } from '../../content/official-scenarios';
import { officialScenarioById, scenarios } from '../../content/scenarios';
import { handsOnGuides } from '../../content/hands-on';
import { cards } from '../../content/cards';
import { questions } from '../../content/questions';
import { domains } from '../../content/domains';
import { skillById } from '../../content/skills';
import { localize, type UiCopy } from '../../i18n/ui';
import { SourceLinks } from '../app/SourceLinks';
import type { Locale } from '../../i18n/locales';

type Props = {
  locale: Locale;
  copy: UiCopy;
  onOpenCard: (cardId: string) => void;
  onOpenQuestion: (questionId: string) => void;
  onOpenPracticeScenario: (scenarioId: string) => void;
  onOpenHandsOnGuide: (guideId: string) => void;
};

const scenarioById = new Map(scenarios.map((scenario) => [scenario.id, scenario]));
const guideById = new Map(handsOnGuides.map((guide) => [guide.id, guide]));
const cardById = new Map(cards.map((card) => [card.id, card]));
const questionById = new Map(questions.map((question) => [question.id, question]));

export function OfficialScenariosView({ locale, copy, onOpenCard, onOpenQuestion, onOpenPracticeScenario, onOpenHandsOnGuide }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const listHeadingRef = useRef<HTMLHeadingElement>(null);
  const detailHeadingRef = useRef<HTMLHeadingElement>(null);
  const c = copy.officialScenarios;

  const selected = selectedId ? officialScenarioLearnings.find((learning) => learning.id === selectedId) ?? null : null;

  useEffect(() => {
    const target = selected ? detailHeadingRef.current : listHeadingRef.current;
    requestAnimationFrame(() => target?.focus());
  }, [selectedId, selected]);

  const domainBadges = (domainIds: string[]) =>
    domains.filter((domain) => domainIds.includes(domain.id)).map((domain) => (
      <span class="card-domain" key={domain.id}>D{domain.number} {localize(domain.title, locale)}</span>
    ));

  if (selected) {
    const axis = officialScenarioById[selected.id];
    return (
      <section class="official-view" aria-labelledby="official-detail-title">
        <p class="official-back"><button type="button" class="link-back" onClick={() => setSelectedId(null)}>{c.backToList}</button></p>
        <header class="page-header">
          <p class="eyebrow">{c.eyebrow}</p>
          <p class="official-badge official-badge--official">{c.officialBadge}</p>
          <h2 id="official-detail-title" tabIndex={-1} ref={detailHeadingRef}>{localize(axis.title, locale)}</h2>
          <p>{localize(axis.summary, locale)}</p>
          <p class="official-meta">
            <span class="official-minutes">{c.estimatedTime}: {c.minutes(selected.estimatedMinutes)}</span>
          </p>
          <p class="official-source-note" role="note">{c.officialNote}</p>
        </header>

        <div class="official-badges">
          <div><h3>{c.domains}</h3><p class="guide-domain-badges">{domainBadges(selected.domainIds)}</p></div>
          <div><h3>{c.taskStatements}</h3><p class="guide-statement-ids">{selected.taskStatementIds.map((id) => <code key={id}>{id}</code>)}</p></div>
          <div><h3>{c.skills}</h3><p>{selected.skillIds.map((id) => skillById[id]).filter(Boolean).map((skill) => localize(skill.title, locale)).join('・')}</p></div>
        </div>

        <section aria-labelledby="official-objectives"><h3 id="official-objectives">{c.objectives}</h3><ul>{localize(selected.learningObjectives, locale).map((item) => <li key={item}>{item}</li>)}</ul></section>
        <section aria-labelledby="official-requirements"><h3 id="official-requirements">{c.requirements}</h3><ul>{localize(selected.requirements, locale).map((item) => <li key={item}>{item}</li>)}</ul></section>

        <section aria-labelledby="official-decisions">
          <h3 id="official-decisions">{c.decisionPoints}</h3>
          <dl class="official-decisions">{selected.decisionPoints.map((point) => (
            <div key={point.id}>
              <dt>{localize(point.decision, locale)}</dt>
              <dd>
                <p class="official-sublabel">{c.considerations}</p>
                <ul>{localize(point.considerations, locale).map((item) => <li key={item}>{item}</li>)}</ul>
              </dd>
            </div>
          ))}</dl>
        </section>

        <section aria-labelledby="official-recommended">
          <h3 id="official-recommended">{c.recommendedApproach}</h3>
          <p class="official-recommendation-note" role="note">{c.recommendationNote}</p>
          <ul>{localize(selected.recommendedApproach, locale).map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
        <section aria-labelledby="official-rationale"><h3 id="official-rationale">{c.rationale}</h3><ul>{localize(selected.rationale, locale).map((item) => <li key={item}>{item}</li>)}</ul></section>

        <section aria-labelledby="official-antipatterns">
          <h3 id="official-antipatterns">{c.antiPatterns}</h3>
          <dl class="official-antipatterns">{selected.antiPatterns.map((pattern) => (
            <div key={pattern.id}>
              <dt><span class="official-sublabel">{c.antiPatternMistake}:</span> {localize(pattern.mistake, locale)}</dt>
              <dd><span class="official-sublabel">{c.antiPatternConsequence}:</span> {localize(pattern.consequence, locale)}</dd>
            </div>
          ))}</dl>
        </section>

        <section aria-labelledby="official-tradeoffs">
          <h3 id="official-tradeoffs">{c.tradeoffs}</h3>
          <dl class="official-tradeoffs">{selected.tradeoffs.map((tradeoff) => (
            <div key={tradeoff.id}>
              <dt><span class="official-sublabel">{c.tradeoffCondition}:</span> {localize(tradeoff.condition, locale)}</dt>
              <dd><span class="official-sublabel">{c.tradeoffShift}:</span> {localize(tradeoff.shift, locale)}</dd>
            </div>
          ))}</dl>
        </section>

        <section aria-labelledby="official-practice">
          <h3 id="official-practice">{c.relatedPracticeScenarios}</h3>
          <p class="official-practice-note" role="note"><span class="official-badge official-badge--practice">{c.practiceBadge}</span> {c.relatedPracticeNote}</p>
          <div class="guide-targets">{selected.relatedPracticeScenarioIds.map((id) => {
            const scenario = scenarioById.get(id);
            return scenario ? <button type="button" key={id} onClick={() => onOpenPracticeScenario(id)}>{localize(scenario.title, locale)}</button> : null;
          })}</div>
        </section>

        <section aria-labelledby="official-handson">
          <h3 id="official-handson">{c.relatedHandsOn}</h3>
          {selected.relatedHandsOnGuideIds.length === 0
            ? <p class="official-empty">{c.noHandsOn}</p>
            : <div class="guide-targets">{selected.relatedHandsOnGuideIds.map((id) => {
                const guide = guideById.get(id);
                return guide ? <button type="button" key={id} onClick={() => onOpenHandsOnGuide(id)}>{localize(guide.title, locale)}</button> : null;
              })}</div>}
        </section>

        <section aria-labelledby="official-cards"><h3 id="official-cards">{c.relatedCards}</h3><div class="guide-targets">{selected.relatedCardIds.map((id) => {
          const card = cardById.get(id);
          return card ? <button type="button" key={id} onClick={() => onOpenCard(id)}>{localize(card.prompt, locale)} <code>{id}</code></button> : null;
        })}</div></section>
        <section aria-labelledby="official-questions"><h3 id="official-questions">{c.relatedQuestions}</h3><div class="guide-targets">{selected.relatedQuestionIds.map((id) => {
          const question = questionById.get(id);
          return question ? <button type="button" key={id} onClick={() => onOpenQuestion(id)}>{localize(question.stem, locale)} <code>{id}</code></button> : null;
        })}</div></section>
        <section aria-labelledby="official-sources"><h3 id="official-sources">{c.officialSources}</h3><SourceLinks ids={selected.sourceIds} copy={copy}/></section>
      </section>
    );
  }

  return (
    <section class="official-view" aria-labelledby="official-title">
      <header class="page-header">
        <p class="eyebrow">{c.eyebrow}</p>
        <h2 id="official-title" tabIndex={-1} ref={listHeadingRef}>{c.title}</h2>
        <p>{c.introduction}</p>
        <p class="official-source-note" role="note">{c.officialNote}</p>
      </header>
      <ul class="official-list">
        {officialScenarioLearnings.map((learning) => {
          const axis = officialScenarioById[learning.id];
          const practiceCount = learning.relatedPracticeScenarioIds.length;
          const handsOnCount = learning.relatedHandsOnGuideIds.length;
          return (
            <li class="official-card" key={learning.id}>
              <div class="official-card-head">
                <span class="official-badge official-badge--official">{c.officialBadge}</span>
                <span class="official-card-minutes">{c.minutes(learning.estimatedMinutes)}</span>
              </div>
              <h3><button type="button" class="official-open" onClick={() => setSelectedId(learning.id)}>{localize(axis.title, locale)}</button></h3>
              <p class="official-card-summary">{localize(axis.summary, locale)}</p>
              <p class="official-card-badges">{domainBadges(learning.domainIds)}</p>
              <p class="official-card-statements">{learning.taskStatementIds.map((id) => <code key={id}>{id}</code>)}</p>
              <p class="official-card-skills">{learning.skillIds.map((id) => skillById[id]).filter(Boolean).map((skill) => localize(skill.title, locale)).join('・')}</p>
              <p class="official-card-related">{c.relatedCounts(handsOnCount, practiceCount)}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
