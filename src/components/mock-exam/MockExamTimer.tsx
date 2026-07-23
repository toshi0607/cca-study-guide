import type { UiCopy } from '../../i18n/ui';
import { splitMinutesSeconds } from '../../lib/use-mock-exam';

// The visible countdown updates every second but is deliberately NOT inside a
// live region, so a screen reader reads it only when navigated to rather than
// announcing every tick. A separate polite region announces the remaining time
// only at whole-minute boundaries within the final five minutes, so the warning
// is heard a handful of times, never once per second.
export function MockExamTimer({ remainingSeconds, copy }: { remainingSeconds: number; copy: UiCopy }) {
  const { minutes, seconds } = splitMinutesSeconds(remainingSeconds);
  const value = copy.mockExam.timeValue(minutes, seconds);
  const bucket = Math.ceil(remainingSeconds / 60);
  const warning = remainingSeconds > 0 && bucket <= 5 ? copy.mockExam.lowTimeWarning(bucket) : '';
  return (
    <div class={`mock-exam-timer${remainingSeconds <= 300 ? ' is-low' : ''}`}>
      <span class="mock-exam-timer-label">{copy.mockExam.timeRemainingLabel}</span>
      <span class="mock-exam-timer-value" aria-label={`${copy.mockExam.timeRemainingLabel} ${value}`}>{value}</span>
      <span class="sr-only" role="status" aria-live="polite">{warning}</span>
    </div>
  );
}
