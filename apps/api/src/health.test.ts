import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { healthResponseSchema } from '@gpt-finance/shared';

describe('health route shape', () => {
  it('returns ok payload', async () => {
    const app = Fastify().withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    app.get(
      '/health',
      { schema: { response: { 200: healthResponseSchema } } },
      async () => ({
        status: 'ok' as const,
        service: 'gpt-finance-api',
        timestamp: new Date().toISOString(),
      }),
    );

    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { status: string; service: string };
    expect(body.status).toBe('ok');
    expect(body.service).toBe('gpt-finance-api');
    await app.close();
  });
});
