import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Db } from '@gpt-finance/db';
import {
  accountResponseSchema,
  accountsListResponseSchema,
  categoriesListResponseSchema,
  createAccountRequestSchema,
  createTransactionRequestSchema,
  createTransferRequestSchema,
  csvConfirmRequestSchema,
  csvConfirmResponseSchema,
  csvPreviewRequestSchema,
  csvPreviewResponseSchema,
  errorEnvelopeSchema,
  patchAccountRequestSchema,
  patchTransactionRequestSchema,
  transactionResponseSchema,
  transactionsListQuerySchema,
  transactionsListResponseSchema,
  transferResponseSchema,
  voidTransactionRequestSchema,
  type UserPublic,
} from '@gpt-finance/shared';
import { SESSION_COOKIE_NAME, resolveSession } from './auth.js';
import { sendError } from './errors.js';
import {
  confirmCsvImport,
  createAccount,
  createTransaction,
  createTransfer,
  listAccounts,
  listCategories,
  listTransactions,
  patchAccount,
  patchTransaction,
  previewCsvImport,
  voidTransaction,
} from './finance-service.js';

async function attachUser(request: FastifyRequest, db: Db) {
  const token = request.cookies[SESSION_COOKIE_NAME];
  request.user = await resolveSession(db, token);
}

function requireUser(request: FastifyRequest, reply: FastifyReply): UserPublic | null {
  if (!request.user) {
    void sendError(reply, 401, 'UNAUTHENTICATED', 'Authentication required');
    return null;
  }
  return request.user;
}

function httpError(reply: FastifyReply, err: unknown) {
  if (err && typeof err === 'object' && 'statusCode' in err) {
    const e = err as { statusCode: number; code?: string; message: string };
    return sendError(reply, e.statusCode, e.code ?? 'REQUEST_ERROR', e.message);
  }
  throw err;
}

export const financeRoutes: FastifyPluginAsync<{ db: Db }> = async (app, opts) => {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.addHook('preHandler', async (request) => {
    await attachUser(request, opts.db);
  });

  typed.get(
    '/v1/accounts',
    {
      schema: {
        tags: ['accounts'],
        response: { 200: accountsListResponseSchema, 401: errorEnvelopeSchema },
      },
    },
    async (request, reply) => {
      const user = requireUser(request, reply);
      if (!user) return;
      return { accounts: await listAccounts(opts.db, user.householdId) };
    },
  );

  typed.post(
    '/v1/accounts',
    {
      schema: {
        tags: ['accounts'],
        body: createAccountRequestSchema,
        response: { 200: accountResponseSchema, 401: errorEnvelopeSchema },
      },
    },
    async (request, reply) => {
      const user = requireUser(request, reply);
      if (!user) return;
      try {
        return { account: await createAccount(opts.db, user, request.body) };
      } catch (err) {
        return httpError(reply, err);
      }
    },
  );

  typed.patch(
    '/v1/accounts/:id',
    {
      schema: {
        tags: ['accounts'],
        params: z.object({ id: z.string().uuid() }),
        body: patchAccountRequestSchema,
        response: { 200: accountResponseSchema, 401: errorEnvelopeSchema, 404: errorEnvelopeSchema },
      },
    },
    async (request, reply) => {
      const user = requireUser(request, reply);
      if (!user) return;
      try {
        return {
          account: await patchAccount(opts.db, user, request.params.id, request.body),
        };
      } catch (err) {
        return httpError(reply, err);
      }
    },
  );

  typed.get(
    '/v1/categories',
    {
      schema: {
        tags: ['categories'],
        response: { 200: categoriesListResponseSchema, 401: errorEnvelopeSchema },
      },
    },
    async (request, reply) => {
      const user = requireUser(request, reply);
      if (!user) return;
      return { categories: await listCategories(opts.db, user.householdId) };
    },
  );

  typed.get(
    '/v1/transactions',
    {
      schema: {
        tags: ['transactions'],
        querystring: transactionsListQuerySchema,
        response: { 200: transactionsListResponseSchema, 401: errorEnvelopeSchema },
      },
    },
    async (request, reply) => {
      const user = requireUser(request, reply);
      if (!user) return;
      return listTransactions(opts.db, user.householdId, request.query);
    },
  );

  typed.post(
    '/v1/transactions',
    {
      schema: {
        tags: ['transactions'],
        body: createTransactionRequestSchema,
        response: { 200: transactionResponseSchema, 401: errorEnvelopeSchema },
      },
    },
    async (request, reply) => {
      const user = requireUser(request, reply);
      if (!user) return;
      try {
        return { transaction: await createTransaction(opts.db, user, request.body) };
      } catch (err) {
        return httpError(reply, err);
      }
    },
  );

  typed.post(
    '/v1/transfers',
    {
      schema: {
        tags: ['transactions'],
        body: createTransferRequestSchema,
        response: { 200: transferResponseSchema, 401: errorEnvelopeSchema },
      },
    },
    async (request, reply) => {
      const user = requireUser(request, reply);
      if (!user) return;
      try {
        return { transactions: await createTransfer(opts.db, user, request.body) };
      } catch (err) {
        return httpError(reply, err);
      }
    },
  );

  typed.patch(
    '/v1/transactions/:id',
    {
      schema: {
        tags: ['transactions'],
        params: z.object({ id: z.string().uuid() }),
        body: patchTransactionRequestSchema,
        response: { 200: transactionResponseSchema, 401: errorEnvelopeSchema },
      },
    },
    async (request, reply) => {
      const user = requireUser(request, reply);
      if (!user) return;
      try {
        return {
          transaction: await patchTransaction(opts.db, user, request.params.id, request.body),
        };
      } catch (err) {
        return httpError(reply, err);
      }
    },
  );

  typed.post(
    '/v1/transactions/:id/void',
    {
      schema: {
        tags: ['transactions'],
        params: z.object({ id: z.string().uuid() }),
        body: voidTransactionRequestSchema,
        response: {
          200: z.object({ transactions: z.array(transactionResponseSchema.shape.transaction) }),
          401: errorEnvelopeSchema,
        },
      },
    },
    async (request, reply) => {
      const user = requireUser(request, reply);
      if (!user) return;
      try {
        return {
          transactions: await voidTransaction(
            opts.db,
            user,
            request.params.id,
            request.body.reason,
          ),
        };
      } catch (err) {
        return httpError(reply, err);
      }
    },
  );

  typed.post(
    '/v1/imports/csv/preview',
    {
      schema: {
        tags: ['imports'],
        body: csvPreviewRequestSchema,
        response: { 200: csvPreviewResponseSchema, 401: errorEnvelopeSchema },
      },
    },
    async (request, reply) => {
      const user = requireUser(request, reply);
      if (!user) return;
      try {
        return await previewCsvImport(opts.db, user, request.body);
      } catch (err) {
        return httpError(reply, err);
      }
    },
  );

  typed.post(
    '/v1/imports/csv/confirm',
    {
      schema: {
        tags: ['imports'],
        body: csvConfirmRequestSchema,
        response: { 200: csvConfirmResponseSchema, 401: errorEnvelopeSchema },
      },
    },
    async (request, reply) => {
      const user = requireUser(request, reply);
      if (!user) return;
      try {
        return await confirmCsvImport(opts.db, user, request.body);
      } catch (err) {
        return httpError(reply, err);
      }
    },
  );
};
