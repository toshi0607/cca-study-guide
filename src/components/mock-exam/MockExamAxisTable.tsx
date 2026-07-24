import type { UiCopy } from '../../i18n/ui';
import type { MockExamAxisStat } from '../../lib/mock-exam-analysis';

// One axis breakdown (domain / difficulty / skill) rendered as an accessible
// table. The analyzer already excluded stale answers, so every row here counts
// only compatible answers. Accuracy is shown as a number and evidence as text —
// never encoded in color alone — so the table is readable without sight of any
// styling. The table scrolls horizontally inside its own container on narrow
// viewports without dropping columns.
export function MockExamAxisTable({ heading, headingId, rows, labelFor, copy, note }: {
  heading: string;
  headingId: string;
  rows: readonly MockExamAxisStat[];
  labelFor: (key: string) => string;
  copy: UiCopy;
  note?: string;
}) {
  const a = copy.mockExam.analysis;
  const hasData = rows.some((row) => row.total > 0);

  return (
    <section class="panel panel--sm mock-exam-axis" aria-labelledby={headingId}>
      <h3 id={headingId} class="card-title">{heading}</h3>
      {note && <p class="mock-exam-axis-note">{note}</p>}
      {!hasData
        ? <p class="mock-exam-axis-empty">{a.axisEmpty}</p>
        : <div class="mock-exam-table-scroll">
            <table class="mock-exam-axis-table">
              <caption class="sr-only">{heading}</caption>
              <thead>
                <tr>
                  <th scope="col">{a.colArea}</th>
                  <th scope="col">{a.colCount}</th>
                  <th scope="col">{a.colAnswered}</th>
                  <th scope="col">{a.colCorrect}</th>
                  <th scope="col">{a.colIncorrect}</th>
                  <th scope="col">{a.colAccuracy}</th>
                  <th scope="col">{a.colEvidence}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} class={`mock-exam-axis-row evidence-${row.evidenceLevel}`}>
                    <th scope="row">{labelFor(row.key)}</th>
                    <td>{row.compatibleCount}</td>
                    <td>{row.answered}</td>
                    <td>{row.correct}</td>
                    <td>{row.incorrect}</td>
                    <td>{row.total === 0 ? '—' : a.accuracyValue(Math.round(row.rawAccuracy * 100))}</td>
                    <td>{a.evidence[row.evidenceLevel]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
    </section>
  );
}
