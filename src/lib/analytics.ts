const GOOGLE_ANALYTICS_ID = /^G-[A-Z0-9]{6,}$/;

export function parseGoogleAnalyticsId(raw: unknown) {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  const value = raw.trim().toUpperCase();
  if (!GOOGLE_ANALYTICS_ID.test(value)) {
    throw new Error('PUBLIC_GA_MEASUREMENT_ID must be a GA4 measurement ID such as G-ABC1234567.');
  }
  return value;
}
