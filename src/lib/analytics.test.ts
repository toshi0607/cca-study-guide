import { describe, expect, it } from 'vitest';
import { parseGoogleAnalyticsId } from './analytics';

describe('Google Analytics configuration', () => {
  it('treats a missing value as analytics disabled', () => {
    expect(parseGoogleAnalyticsId(undefined)).toBeUndefined();
    expect(parseGoogleAnalyticsId('  ')).toBeUndefined();
  });

  it('normalizes a valid GA4 measurement ID', () => {
    expect(parseGoogleAnalyticsId(' g-abc1234567 ')).toBe('G-ABC1234567');
  });

  it('rejects malformed or legacy IDs', () => {
    expect(() => parseGoogleAnalyticsId('UA-123-1')).toThrow(/GA4 measurement ID/);
    expect(() => parseGoogleAnalyticsId('G-short')).toThrow(/GA4 measurement ID/);
  });
});
