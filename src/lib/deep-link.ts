// Hash-based deep links: a URL that names one card, section, hands-on step, or
// practice case.
//
// Why: the app is a single page whose views are internal state, so nothing on it
// had an address. Handing someone "read the escalation guide's loop step" meant
// writing directions ("Guide tab → stage 3 → …") because the internal ids are
// repo vocabulary and appear nowhere in the UI. Bookmarking, sharing, and opening
// the same place on a second device were all impossible for the same reason.
//
// Why a hash and not a router: the site is static, and the persisted content ids
// are already a compatibility contract — they are stable enough to put in a URL
// without a redirect layer. Reading and writing `location.hash` is the entire
// mechanism; the existing typed view targets do the rest.
import type { View } from '../components/app/types';

// Flat rather than a discriminated union: App consumes it by handing each field
// to the matching existing target state, and `quiz` legitimately carries either a
// question id or a scenario id.
export type DeepLink = {
  view: View;
  sectionId?: string;
  cardId?: string;
  questionId?: string;
  scenarioId?: string;
  handsOnGuideId?: string;
  handsOnStepId?: string;
};

// One table, both directions. `maxSegments` is how many segments the route
// accepts in total, including the route itself: exceeding it is an error rather
// than something to silently drop, because a typo in a shared link would
// otherwise open a different place without saying so.
//
// `scenario` is an extra route on the quiz view (a different target than
// `quiz/<questionId>`), so it is marked as not being that view's canonical route
// and never chosen when formatting from a view alone.
const routes = [
  { route: 'today', view: 'today', maxSegments: Infinity },
  { route: 'guide', view: 'guide', maxSegments: 2 },
  { route: 'hands-on', view: 'hands-on', maxSegments: 3 },
  { route: 'official-scenarios', view: 'official-scenarios', maxSegments: Infinity },
  { route: 'practice', view: 'practice', maxSegments: 2 },
  { route: 'quiz', view: 'quiz', maxSegments: 2 },
  { route: 'scenario', view: 'quiz', maxSegments: 2, alias: true },
  { route: 'mock-exam', view: 'mock-exam', maxSegments: Infinity },
  { route: 'progress', view: 'progress', maxSegments: Infinity },
] as const satisfies readonly { route: string; view: View; maxSegments: number; alias?: boolean }[];

type RouteSpec = (typeof routes)[number];

const byRoute = new Map<string, RouteSpec>(routes.map((spec) => [spec.route, spec]));
const viewToRoute = new Map<View, string>();
for (const spec of routes) {
  if (!('alias' in spec)) viewToRoute.set(spec.view, spec.route);
}

// Content ids are kebab-case ASCII, and this is also the guard that keeps a
// crafted hash from reaching the views as an arbitrary string.
const idPattern = /^[a-z0-9][a-z0-9-]{0,63}$/;

function decodeSegment(segment: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    return null;
  }
  return idPattern.test(decoded) ? decoded : null;
}

// Returns null for anything this build does not recognise — an unknown route, a
// malformed id, or a hash written by some other feature — so a bad link leaves
// the learner on the default view instead of on a broken one.
export function parseDeepLink(hash: string): DeepLink | null {
  const trimmed = hash.replace(/^#/, '').replace(/^\//, '');
  if (!trimmed) return null;
  const segments = trimmed.split('/').filter(Boolean);
  const [route, first, second] = segments;
  if (!route) return null;

  const spec = byRoute.get(route);
  if (!spec || segments.length > spec.maxSegments) return null;
  const view = spec.view;
  if (!first) return { view };

  const firstId = decodeSegment(first);
  if (!firstId) return null;

  switch (route) {
    case 'guide': return { view, sectionId: firstId };
    case 'practice': return { view, cardId: firstId };
    case 'quiz': return { view, questionId: firstId };
    case 'scenario': return { view, scenarioId: firstId };
    case 'hands-on': {
      if (!second) return { view, handsOnGuideId: firstId };
      const stepId = decodeSegment(second);
      return stepId ? { view, handsOnGuideId: firstId, handsOnStepId: stepId } : null;
    }
    // Routes with no target ignore trailing segments rather than failing the
    // whole link: `#/today/anything` is still unambiguously "the today view".
    default: return { view };
  }
}

export function formatDeepLink(link: DeepLink): string {
  const route = link.scenarioId ? 'scenario' : viewToRoute.get(link.view)!;
  const parts = [route];
  const id = link.sectionId ?? link.cardId ?? link.questionId ?? link.scenarioId ?? link.handsOnGuideId;
  if (id) parts.push(encodeURIComponent(id));
  if (link.handsOnGuideId && link.handsOnStepId) parts.push(encodeURIComponent(link.handsOnStepId));
  return `#/${parts.join('/')}`;
}

// Absolute URL for the copy-link buttons. `origin + pathname` deliberately drops
// any existing query string and hash so a copied link is the canonical one.
export function buildDeepLinkUrl(baseUrl: { origin: string; pathname: string }, link: DeepLink): string {
  return `${baseUrl.origin}${baseUrl.pathname}${formatDeepLink(link)}`;
}
