import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyRequest,
} from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  authMeResponseSchema,
  errorEnvelopeSchema,
  healthResponseSchema,
  loginRequestSchema,
  loginResponseSchema,
  logoutResponseSchema,
  readyResponseSchema,
  type UserPublic,
} from '@gpt-finance/shared';
import { pingDb, type Db } from '@gpt-finance/db';
import {
  SESSION_COOKIE_NAME,
  authenticateWithPassword,
  resolveSession,
  revokeSession,
} from './auth.js';
import type { Env } from './config.js';
import { sendError } from './errors.js';
import { financeRoutes } from './finance-routes.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: UserPublic | null;
  }
}

export { sendError } from './errors.js';

async function attachUser(request: FastifyRequest, db: Db) {
  const token = request.cookies[SESSION_COOKIE_NAME];
  request.user = await resolveSession(db, token);
}

export const healthRoutes: FastifyPluginAsync<{ db: Db }> = async (app, opts) => {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    '/health',
    {
      schema: {
        tags: ['system'],
        response: { 200: healthResponseSchema },
      },
    },
    async () => ({
      status: 'ok' as const,
      service: 'gpt-finance-api',
      timestamp: new Date().toISOString(),
    }),
  );

  typed.get(
    '/ready',
    {
      schema: {
        tags: ['system'],
        response: {
          200: readyResponseSchema,
          503: readyResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      const up = await pingDb(opts.db);
      const body = {
        status: up ? ('ready' as const) : ('not_ready' as const),
        database: up ? ('up' as const) : ('down' as const),
        timestamp: new Date().toISOString(),
      };
      return reply.status(up ? 200 : 503).send(body);
    },
  );
};

export const authRoutes: FastifyPluginAsync<{ db: Db; env: Env }> = async (app, opts) => {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.addHook('preHandler', async (request) => {
    await attachUser(request, opts.db);
  });

  typed.post(
    '/v1/auth/login',
    {
      schema: {
        tags: ['auth'],
        body: loginRequestSchema,
        response: {
          200: loginResponseSchema,
          401: errorEnvelopeSchema,
        },
      },
    },
    async (request, reply) => {
      const result = await authenticateWithPassword(
        opts.db,
        request.body.email,
        request.body.password,
      );
      if (!result) {
        return sendError(reply, 401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      }

      reply.setCookie(SESSION_COOKIE_NAME, result.token, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: opts.env.COOKIE_SECURE,
        expires: result.expiresAt,
      });

      return { user: result.user };
    },
  );

  typed.post(
    '/v1/auth/logout',
    {
      schema: {
        tags: ['auth'],
        response: { 200: logoutResponseSchema },
      },
    },
    async (request, reply) => {
      const token = request.cookies[SESSION_COOKIE_NAME];
      await revokeSession(opts.db, token, request.user);
      reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
      return { ok: true as const };
    },
  );

  typed.get(
    '/v1/auth/me',
    {
      schema: {
        tags: ['auth'],
        response: {
          200: authMeResponseSchema,
          401: errorEnvelopeSchema,
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        return sendError(reply, 401, 'UNAUTHENTICATED', 'Authentication required');
      }
      return { user: request.user };
    },
  );
};

export async function registerRoutes(app: FastifyInstance, db: Db, env: Env) {
  await app.register(healthRoutes, { db });
  await app.register(authRoutes, { db, env });
  await app.register(financeRoutes, { db });
}
