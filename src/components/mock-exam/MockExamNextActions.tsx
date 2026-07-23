import type { UiCopy } from '../../i18n/ui';
import type { MockExamNextAction } from '../../lib/mock-exam-analysis';

// Renders the rule-based next-action list. The analyzer decided WHICH actions to
// show and in what order; this component only maps each descriptor to copy and to
// an existing in-app destination. It never fabricates a route: a domain action
// preselects that domain in Practice, a skill or under-sampled action opens
// Practice unfiltered (skills are not a Practice filter axis), and the exam
// actions return to the mock-exam start.
export function MockExamNextActions({ actions, copy, domainLabel, skillLabel, onOpenPractice, onTakeAnother }: {
  actions: readonly MockExamNextAction[];
  copy: UiCopy;
  domainLabel: (domainId: string) => string;
  skillLabel: (skillId: string) => string;
  onOpenPractice: (domainId?: string) => void;
  onTakeAnother: () => void;
}) {
  const a = copy.mockExam.analysis;

  const render = (action: MockExamNextAction): { text: string; label: string; onClick: () => void } => {
    switch (action.type) {
      case 'review-domain':
        return { text: a.actionReviewDomain(domainLabel(action.key ?? '')), label: a.openPractice, onClick: () => onOpenPractice(action.key) };
      case 'review-skill':
        return { text: a.actionReviewSkill(skillLabel(action.key ?? '')), label: a.openPractice, onClick: () => onOpenPractice() };
      case 'practice-weak-area':
        return { text: a.actionPracticeWeakArea(domainLabel(action.key ?? '')), label: a.openPractice, onClick: () => onOpenPractice(action.key) };
      case 'take-another-exam':
        return { text: a.actionTakeAnother, label: a.startExam, onClick: onTakeAnother };
      case 'retake-latest':
        return { text: a.actionRetakeLatest, label: a.startExam, onClick: onTakeAnother };
    }
  };

  return (
    <section class="mock-exam-next-actions" aria-labelledby="mock-exam-analysis-actions-title">
      <h3 id="mock-exam-analysis-actions-title">{a.nextActionsHeading}</h3>
      {actions.length === 0
        ? <p class="mock-exam-axis-empty">{a.nextActionsEmpty}</p>
        : <ul class="mock-exam-next-actions-list">
            {actions.map((action, index) => {
              const view = render(action);
              return (
                <li key={`${action.type}:${action.key ?? index}`} class="mock-exam-next-action">
                  <span>{view.text}</span>
                  <button type="button" class="mock-exam-secondary" onClick={view.onClick}>{view.label}</button>
                </li>
              );
            })}
          </ul>}
    </section>
  );
}
