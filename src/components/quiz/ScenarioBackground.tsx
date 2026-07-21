import type { Scenario } from '../../content/types';
import type { Locale } from '../../i18n/locales';
import { localize } from '../../i18n/ui';

export function ScenarioBackground({ scenario, locale }: { scenario: Scenario; locale: Locale }) {
  return <>{localize(scenario.background, locale).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</>;
}
