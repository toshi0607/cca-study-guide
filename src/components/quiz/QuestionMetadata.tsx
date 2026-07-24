import { domains } from '../../content/domains';
import { skillById } from '../../content/skills';
import type { ChoiceQuestion, Skill } from '../../content/types';
import type { Locale } from '../../i18n/locales';
import { localize, type UiCopy } from '../../i18n/ui';

// Domain, difficulty, and skills for a question, all as localized human-readable
// labels — never a raw id. Skills are resolved through `skillById` and filtered,
// so an unexpected id is skipped rather than silenced with a non-null assertion.
// Difficulty renders as a neutral text badge (same weight for every level): it is
// the cognitive demand the question classifies to, not the learner's felt ease.
export function QuestionMetadata({ question, locale, copy }: {
  question: ChoiceQuestion;
  locale: Locale;
  copy: UiCopy;
}) {
  const domain = domains.find((candidate) => candidate.id === question.domainId);
  const skills = question.skills
    .map((id) => skillById[id] as Skill | undefined)
    .filter((skill): skill is Skill => Boolean(skill));

  return (
    <dl class="question-meta">
      {domain && <div class="question-meta-row">
        <dt>{copy.quiz.domainLabel}</dt>
        <dd><span class="badge badge--ink">D{domain.number}</span> <span>{localize(domain.title, locale)}</span></dd>
      </div>}
      <div class="question-meta-row">
        <dt>{copy.quiz.difficultyLegend}</dt>
        <dd><span class="badge badge--outline">{copy.quiz.difficulty[question.difficulty]}</span></dd>
      </div>
      {skills.length > 0 && <div class="question-meta-row">
        <dt>{copy.quiz.skillsLabel}</dt>
        <dd><ul class="skill-tags">{skills.map((skill) => <li key={skill.id}>{localize(skill.title, locale)}</li>)}</ul></dd>
      </div>}
    </dl>
  );
}
