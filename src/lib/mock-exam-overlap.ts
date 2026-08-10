// The Mock Exam draws from the same question bank the Quiz does, and the bank has
// no surplus: the exam is the whole bank. Every question answered in daily Quiz
// practice is therefore one fewer first-sight question in the exam — and that
// erosion was invisible, so a perfectly natural study plan ("drill weak areas
// daily") silently spent the exam's value as a first-sight measurement.
//
// This reports the overlap as a bare count. It is not a score, a readiness
// signal, or a pass probability; it is the number of exam questions the learner
// has already seen, which only they can decide what to do with.
export function countAnsweredExamQuestions(
  questions: readonly { readonly id: string }[],
  quizStats: Readonly<Record<string, unknown>>,
): number {
  // Own keys only: a question whose id collides with an inherited Object member
  // (`constructor`, `toString`) must not read as answered.
  return questions.filter((question) => Object.hasOwn(quizStats, question.id)).length;
}
