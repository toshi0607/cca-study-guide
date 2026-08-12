import { useEffect, useState } from 'preact/hooks';
import { cardIndex, domainIndex } from '../../content/card-index';
import { deriveHandsOnProgress } from '../../lib/hands-on-progress';
import type { StudyData } from '../../lib/storage';
import { deriveStudyGuideProgress } from '../../lib/study-guide-progress';
import { buildStudySummary } from '../../lib/study-summary';
import type { View } from './types';

// The pasteable digest is built ahead of the click, not inside it. Safari (and
// iOS in particular) only honours navigator.clipboard.writeText while the user
// gesture is still active, and the content chunks this digest needs are
// dynamically imported — awaiting them inside the handler would routinely spend
// that activation and fail the copy. So the text is precomputed whenever the
// Progress view is open and the document changes, and the button itself does
// nothing but write an already-built string.
//
// content/questions, content/study-guide and content/hands-on stay dynamic so
// none of them reaches the initial landing bundle; cardIndex/domainIndex are the
// lightweight spine already eager in App and cover cards/domains without pulling
// in cards.ts/domains.ts.
//
// Returns null whenever no digest is available — the copy button reports that
// rather than copying a stale or partial summary.
export function useStudySummary({ view, data, dataUnreadable, now }: {
  view: View;
  data: StudyData;
  dataUnreadable: boolean;
  now: Date | null;
}): string | null {
  const [built, setBuilt] = useState<{ data: StudyData; text: string } | null>(null);

  useEffect(() => {
    // Leaving Progress, an unreadable document, or `now` not yet ready means
    // there is no digest to keep available.
    if (view !== 'progress' || dataUnreadable || !now) { setBuilt(null); return; }
    let cancelled = false;
    void Promise.all([
      import('../../content/questions'),
      import('../../content/study-guide'),
      import('../../content/hands-on'),
    ]).then(([{ questions }, { studyGuideSections }, { handsOnGuides }]) => {
      if (cancelled) return;
      const studyGuide = deriveStudyGuideProgress(studyGuideSections, data.studyGuideProgress);
      const handsOn = deriveHandsOnProgress(handsOnGuides, data.handsOnProgress);
      setBuilt({
        data,
        text: buildStudySummary({
          data,
          cards: cardIndex,
          questions,
          domains: domainIndex,
          studyGuideTotal: studyGuide.totalSections,
          studyGuideCompleted: studyGuide.completed,
          handsOnTotal: handsOn.totalGuides,
          handsOnCompleted: handsOn.completed,
          now,
        }),
      });
    }, () => {
      if (!cancelled) setBuilt(null);
    });
    return () => { cancelled = true; };
  }, [view, data, dataUnreadable, now]);

  // The digest is returned only for the exact document it was built from. That
  // makes a changed document (an import, a reset, any answer) uncopyable on the
  // very render it changes, without waiting for the effect above — while a `now`
  // tick, which fires every minute to keep "due now" fresh, leaves the identity
  // intact and so never flashes the digest uncopyable.
  return built && built.data === data ? built.text : null;
}
