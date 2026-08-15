import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { createDb, ensureAllHouseholdCategories, type Db } from '@gpt-finance/db';
import { bootstrapAdmin } from './auth.js';
import { corsOrigins, loadEnv, type Env } from './config.js';
import { registerRoutes } from './routes.js';

export type AppDeps = {
  env: Env;
  db: Db;
};

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: deps.env.NODE_ENV === 'test' ? 'error' : 'info',
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'body.password',
          'body.note',
          'body.amount_paise',
        ],
        remove: true,
      },
    },
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(cors, {
    origin: corsOrigins(deps.env.CORS_ORIGIN),
    credentials: true,
  });

  await app.register(cookie, {
    secret: deps.env.SESSION_SECRET,
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Gpt Finance API',
        description:
          'Local-first personal finance copilot. Deterministic finance engine; AI optional and disabled by default.',
        version: '0.1.0',
      },
      servers: [{ url: '/' }],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });

  await registerRoutes(app, deps.db, deps.env);

  app.setErrorHandler((error, _request, reply) => {
    const err = error as { statusCode?: number; message?: string };
    const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
    const message = statusCode >= 500 ? 'Internal server error' : (err.message ?? 'Request error');
    app.log.error(error);
    void reply.status(statusCode).send({
      error: {
        code: statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
        message,
      },
    });
  });

  return app;
}

export async function createAppFromEnv(
  envSource?: NodeJS.ProcessEnv,
): Promise<{ app: FastifyInstance; env: Env; db: Db }> {
  const env = loadEnv(envSource);
  const db = createDb(env.DATABASE_URL);
  await bootstrapAdmin(db, env);
  await ensureAllHouseholdCategories(db);
  const app = await buildApp({ env, db });
  return { app, env, db };
}
