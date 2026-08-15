import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createSessionToken, hashSessionToken } from '../src/session-token.js';

describe('session tokens', () => {
  it('creates opaque tokens and stable hashes', () => {
    const token = createSessionToken();
    expect(token.length).toBeGreaterThan(20);
    const hash = hashSessionToken(token);
    expect(hash).toBe(createHash('sha256').update(token).digest('hex'));
    expect(hashSessionToken(token)).toBe(hash);
  });
});
