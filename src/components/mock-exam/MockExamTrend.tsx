import type { Locale } from '../../i18n/locales';
import type { UiCopy } from '../../i18n/ui';
import type { MockExamTrendPoint } from '../../lib/mock-exam-analysis';
import { formatDate } from '../app/format';

// The attempt history as an accessible table (oldest first). It intentionally
// uses no chart library: the same facts — completion time, outcome, raw score,
// accuracy, answered/unanswered, and how many answers were stale — are read
// directly from the table, which stays legible to keyboard and screen-reader
// users and scrolls horizontally on narrow screens without losing columns. It
// never projects a future score, a pass probability, or a recommended exam date.
export function MockExamTrend({ points, locale, copy }: {
  points: readonly MockExamTrendPoint[];
  locale: Locale;
  copy: UiCopy;
}) {
  const a = copy.mockExam.analysis;

  return (
    <section class="panel panel--sm mock-exam-trend" aria-labelledby="mock-exam-analysis-trend-title">
      <h3 id="mock-exam-analysis-trend-title" class="card-title">{a.trendHeading}</h3>
      {points.length === 0
        ? <p class="mock-exam-axis-empty">{a.trendEmpty}</p>
        : <div class="mock-exam-table-scroll">
            <table class="mock-exam-trend-table">
              <caption class="sr-only">{a.trendCaption}</caption>
              <thead>
                <tr>
                  <th scope="col">{a.trendColDate}</th>
                  <th scope="col">{a.trendColOutcome}</th>
                  <th scope="col">{a.trendColScore}</th>
                  <th scope="col">{a.trendColAccuracy}</th>
                  <th scope="col">{a.trendColAnswered}</th>
                  <th scope="col">{a.trendColStale}</th>
                </tr>
              </thead>
              <tbody>
                {points.map((point) => (
                  <tr key={point.attemptId}>
                    <th scope="row">{formatDate(new Date(point.completedAt), locale)}</th>
                    <td>{point.outcome === 'expired' ? copy.mockExam.outcomeExpired : copy.mockExam.outcomeSubmitted}</td>
                    <td>{a.countValue(point.correct, point.total)}</td>
                    <td>{a.accuracyValue(Math.round(point.rawAccuracy * 100))}</td>
                    <td>{point.answered} / {point.unanswered}</td>
                    <td>{point.staleCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
    </section>
  );
}
