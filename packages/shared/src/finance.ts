import { z } from 'zod';

export const accountTypeSchema = z.enum([
  'cash',
  'bank',
  'credit_card',
  'wallet',
  'investment',
  'loan',
]);

export const categoryKindSchema = z.enum(['income', 'expense', 'transfer']);

export const transactionTypeSchema = z.enum([
  'income',
  'expense',
  'transfer',
  'refund',
  'adjustment',
]);

export const transactionStatusSchema = z.enum(['pending', 'confirmed', 'void']);

export const transactionSourceSchema = z.enum(['manual', 'chat', 'import', 'api']);

export const paiseSchema = z
  .number()
  .int()
  .nonnegative()
  .refine((n) => Number.isSafeInteger(n), 'Amount exceeds safe integer range');

export const positivePaiseSchema = z
  .number()
  .int()
  .positive()
  .refine((n) => Number.isSafeInteger(n), 'Amount exceeds safe integer range');

export const accountSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  name: z.string(),
  type: accountTypeSchema,
  currency: z.literal('INR'),
  openingBalancePaise: paiseSchema,
  isArchived: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type AccountDto = z.infer<typeof accountSchema>;

export const createAccountRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: accountTypeSchema,
  openingBalancePaise: paiseSchema.default(0),
});

export type CreateAccountRequest = z.infer<typeof createAccountRequestSchema>;

export const patchAccountRequestSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  type: accountTypeSchema.optional(),
  openingBalancePaise: paiseSchema.optional(),
  isArchived: z.boolean().optional(),
});

export type PatchAccountRequest = z.infer<typeof patchAccountRequestSchema>;

export const accountsListResponseSchema = z.object({
  accounts: z.array(accountSchema),
});

export const accountResponseSchema = z.object({
  account: accountSchema,
});

export const categorySchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid().nullable(),
  slug: z.string(),
  name: z.string(),
  kind: categoryKindSchema,
  isSystem: z.boolean(),
});

export type CategoryDto = z.infer<typeof categorySchema>;

export const categoriesListResponseSchema = z.object({
  categories: z.array(categorySchema),
});

export const transactionSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  accountId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  type: transactionTypeSchema,
  amountPaise: positivePaiseSchema,
  currency: z.literal('INR'),
  categoryId: z.string().uuid().nullable(),
  merchant: z.string().nullable(),
  note: z.string().nullable(),
  status: transactionStatusSchema,
  source: transactionSourceSchema,
  transferAccountId: z.string().uuid().nullable(),
  transferGroupId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  voidedAt: z.string().datetime().nullable(),
  voidReason: z.string().nullable(),
});

export type TransactionDto = z.infer<typeof transactionSchema>;

export const createTransactionRequestSchema = z
  .object({
    accountId: z.string().uuid(),
    occurredAt: z.string().datetime(),
    type: z.enum(['income', 'expense', 'refund', 'adjustment']),
    amountPaise: positivePaiseSchema,
    categoryId: z.string().uuid().nullable().optional(),
    merchant: z.string().trim().max(200).nullable().optional(),
    note: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

export type CreateTransactionRequest = z.infer<typeof createTransactionRequestSchema>;

export const createTransferRequestSchema = z
  .object({
    fromAccountId: z.string().uuid(),
    toAccountId: z.string().uuid(),
    occurredAt: z.string().datetime(),
    amountPaise: positivePaiseSchema,
    note: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((v) => v.fromAccountId !== v.toAccountId, {
    message: 'Transfer accounts must differ',
    path: ['toAccountId'],
  });

export type CreateTransferRequest = z.infer<typeof createTransferRequestSchema>;

export const patchTransactionRequestSchema = z.object({
  occurredAt: z.string().datetime().optional(),
  amountPaise: positivePaiseSchema.optional(),
  categoryId: z.string().uuid().nullable().optional(),
  merchant: z.string().trim().max(200).nullable().optional(),
  note: z.string().trim().max(2000).nullable().optional(),
});

export type PatchTransactionRequest = z.infer<typeof patchTransactionRequestSchema>;

export const voidTransactionRequestSchema = z.object({
  reason: z.string().trim().min(1).max(500).optional(),
});

export const transactionsListQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  categoryId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  status: transactionStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type TransactionsListQuery = z.infer<typeof transactionsListQuerySchema>;

export const transactionsListResponseSchema = z.object({
  transactions: z.array(transactionSchema),
  total: z.number().int().nonnegative(),
});

export const transactionResponseSchema = z.object({
  transaction: transactionSchema,
});

export const transferResponseSchema = z.object({
  transactions: z.array(transactionSchema).length(2),
});

export const csvColumnMappingSchema = z.object({
  occurredAt: z.string().min(1),
  amount: z.string().min(1),
  type: z.string().optional(),
  merchant: z.string().optional(),
  note: z.string().optional(),
  category: z.string().optional(),
});

export type CsvColumnMapping = z.infer<typeof csvColumnMappingSchema>;

export const csvPreviewRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  csvText: z.string().min(1).max(2_000_000),
  accountId: z.string().uuid(),
  columnMapping: csvColumnMappingSchema,
});

export type CsvPreviewRequest = z.infer<typeof csvPreviewRequestSchema>;

export const csvPreviewRowSchema = z.object({
  rowIndex: z.number().int().nonnegative(),
  occurredAt: z.string().nullable(),
  amountPaise: z.number().int().nullable(),
  type: transactionTypeSchema.nullable(),
  merchant: z.string().nullable(),
  note: z.string().nullable(),
  categorySlug: z.string().nullable(),
  errors: z.array(z.string()),
  isDuplicate: z.boolean(),
  include: z.boolean(),
});

export type CsvPreviewRow = z.infer<typeof csvPreviewRowSchema>;

export const csvPreviewResponseSchema = z.object({
  batchId: z.string().uuid(),
  headers: z.array(z.string()),
  rows: z.array(csvPreviewRowSchema),
  validCount: z.number().int().nonnegative(),
  duplicateCount: z.number().int().nonnegative(),
  errorCount: z.number().int().nonnegative(),
});

export type CsvPreviewResponse = z.infer<typeof csvPreviewResponseSchema>;

export const csvConfirmRequestSchema = z.object({
  batchId: z.string().uuid(),
  skipDuplicates: z.boolean().default(true),
  rowIncludes: z
    .array(
      z.object({
        rowIndex: z.number().int().nonnegative(),
        include: z.boolean(),
      }),
    )
    .optional(),
});

export type CsvConfirmRequest = z.infer<typeof csvConfirmRequestSchema>;

export const csvConfirmResponseSchema = z.object({
  importedCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
});

export type CsvConfirmResponse = z.infer<typeof csvConfirmResponseSchema>;
