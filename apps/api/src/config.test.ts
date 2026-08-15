import { describe, expect, it } from 'vitest';
import { corsOrigins, loadEnv } from '../src/config.js';

describe('loadEnv', () => {
  it('parses required env', () => {
    const env = loadEnv({
      DATABASE_URL: 'postgresql://finance:finance@localhost:5432/finance',
      SESSION_SECRET: 'x'.repeat(32),
      INITIAL_ADMIN_EMAIL: 'admin@finance.local',
      INITIAL_ADMIN_PASSWORD: 'ChangeMeNow!123',
      AI_ENABLED: 'false',
      CORS_ORIGIN: 'http://localhost:3000',
      NODE_ENV: 'test',
      API_PORT: '4000',
    });
    expect(env.AI_ENABLED).toBe(false);
    expect(env.API_PORT).toBe(4000);
  });

  it('rejects short session secret', () => {
    expect(() =>
      loadEnv({
        DATABASE_URL: 'postgresql://x',
        SESSION_SECRET: 'short',
        INITIAL_ADMIN_EMAIL: 'admin@finance.local',
        INITIAL_ADMIN_PASSWORD: 'ChangeMeNow!123',
      }),
    ).toThrow(/Invalid environment/);
  });
});

describe('corsOrigins', () => {
  it('splits allowlist', () => {
    expect(corsOrigins('https://finance.local, http://localhost:3000')).toEqual([
      'https://finance.local',
      'http://localhost:3000',
    ]);
  });
});
