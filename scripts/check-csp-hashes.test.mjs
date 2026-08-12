import { describe, expect, it } from 'vitest';
import { cspScriptHashes, findCspDirective } from './check-csp-hashes.mjs';

function policy(scriptSrc, before = '') {
  return {
    headers: [{
      headers: [{
        key: 'Content-Security-Policy',
        value: `default-src 'self'; ${before} script-src ${scriptSrc}`,
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

  it('selects script-src by exact directive name even after script-src-elem', () => {
    expect(findCspDirective("default-src 'self'; script-src-elem 'none'; script-src 'self' 'sha256-app'", 'script-src')).toBe(
      "script-src 'self' 'sha256-app'",
    );
  });

  it.each(['script-src-elem', 'script-src-attr'])('rejects the override directive %s', (directive) => {
    expect(() => cspScriptHashes(policy("'self' 'sha256-app'", `${directive} 'none';`))).toThrow(
      new RegExp(`${directive}.*must not`),
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
