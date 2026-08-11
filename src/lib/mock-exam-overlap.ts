// How many exam questions the learner has already met in the Quiz. A bare count,
// never a score or a readiness signal (see DESIGN.md §Study companion
// affordances for why the overlap is worth surfacing at all).
export function countAnsweredExamQuestions(
  questions: readonly { readonly id: string }[],
  quizStats: Readonly<Record<string, unknown>>,
): number {
  // Own keys only: a question whose id collides with an inherited Object member
  // (`constructor`, `toString`) must not read as answered.
  return questions.filter((question) => Object.hasOwn(quizStats, question.id)).length;
}
