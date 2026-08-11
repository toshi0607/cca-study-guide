import { describe, expect, it } from 'vitest';
import { cspScriptHashes } from './check-csp-hashes.mjs';

function policy(scriptSrc) {
  return {
    headers: [{
      headers: [{
        key: 'Content-Security-Policy',
        value: `default-src 'self'; script-src ${scriptSrc}`,
      }],
    }],
  };
}

describe('CSP script capability boundary', () => {
  it('returns every supported hash algorithm', () => {
    expect(cspScriptHashes(policy("'self' 'sha256-a' 'sha384-b' 'sha512-c'"))).toEqual(
      new Set(['sha256-a', 'sha384-b', 'sha512-c']),
    );
  });

  it.each([
    "'self' 'unsafe-inline'",
    "'self' 'nonce-random'",
    "'self' https://www.googletagmanager.com",
  ])('rejects unsupported script capability: %s', (scriptSrc) => {
    expect(() => cspScriptHashes(policy(scriptSrc))).toThrow(/remove hosts, nonces, unsafe-inline/);
  });
});
