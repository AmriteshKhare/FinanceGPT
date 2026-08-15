import {
  boolean,
  bigint,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const householdRoleEnum = pgEnum('household_role', ['owner', 'admin', 'member']);

export const categoryKindEnum = pgEnum('category_kind', ['income', 'expense', 'transfer']);

export const accountTypeEnum = pgEnum('account_type', [
  'cash',
  'bank',
  'credit_card',
  'wallet',
  'investment',
  'loan',
]);

export const transactionTypeEnum = pgEnum('transaction_type', [
  'income',
  'expense',
  'transfer',
  'refund',
  'adjustment',
]);

export const transactionStatusEnum = pgEnum('transaction_status', [
  'pending',
  'confirmed',
  'void',
]);

export const transactionSourceEnum = pgEnum('transaction_source', [
  'manual',
  'chat',
  'import',
  'api',
]);

export const csvImportStatusEnum = pgEnum('csv_import_status', [
  'preview',
  'committed',
  'cancelled',
]);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('users_email_uidx').on(table.email)],
);

export const households = pgTable('households', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  timezone: text('timezone').notNull().default('Asia/Kolkata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const householdMembers = pgTable(
  'household_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: householdRoleEnum('role').notNull().default('member'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('household_members_household_user_uidx').on(table.householdId, table.userId),
    index('household_members_user_idx').on(table.userId),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('sessions_token_hash_uidx').on(table.tokenHash),
    index('sessions_user_idx').on(table.userId),
  ],
);

export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    householdId: uuid('household_id').references(() => households.id, { onDelete: 'set null' }),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    entity: text('entity').notNull(),
    payload: jsonb('payload').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('audit_events_household_idx').on(table.householdId),
    index('audit_events_created_at_idx').on(table.createdAt),
  ],
);

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    householdId: uuid('household_id').references(() => households.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    kind: categoryKindEnum('kind').notNull(),
    isSystem: boolean('is_system').notNull().default(false),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('categories_household_slug_uidx').on(table.householdId, table.slug),
    index('categories_household_idx').on(table.householdId),
  ],
);

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: accountTypeEnum('type').notNull(),
    currency: text('currency').notNull().default('INR'),
    openingBalancePaise: bigint('opening_balance_paise', { mode: 'number' }).notNull().default(0),
    isArchived: boolean('is_archived').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('accounts_household_idx').on(table.householdId),
    uniqueIndex('accounts_household_name_uidx').on(table.householdId, table.name),
  ],
);

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'restrict' }),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    type: transactionTypeEnum('type').notNull(),
    amountPaise: bigint('amount_paise', { mode: 'number' }).notNull(),
    currency: text('currency').notNull().default('INR'),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    merchant: text('merchant'),
    note: text('note'),
    status: transactionStatusEnum('status').notNull().default('confirmed'),
    source: transactionSourceEnum('source').notNull().default('manual'),
    transferAccountId: uuid('transfer_account_id').references(() => accounts.id, {
      onDelete: 'set null',
    }),
    transferGroupId: uuid('transfer_group_id'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    voidedAt: timestamp('voided_at', { withTimezone: true }),
    voidReason: text('void_reason'),
  },
  (table) => [
    index('transactions_household_occurred_idx').on(table.householdId, table.occurredAt),
    index('transactions_account_idx').on(table.accountId),
    index('transactions_category_idx').on(table.categoryId),
    index('transactions_transfer_group_idx').on(table.transferGroupId),
    index('transactions_status_idx').on(table.status),
  ],
);

export const csvImportBatches = pgTable(
  'csv_import_batches',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    filename: text('filename').notNull(),
    status: csvImportStatusEnum('status').notNull().default('preview'),
    columnMapping: jsonb('column_mapping').notNull().default({}),
    previewRows: jsonb('preview_rows').notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    committedAt: timestamp('committed_at', { withTimezone: true }),
  },
  (table) => [index('csv_import_batches_household_idx').on(table.householdId)],
);

export type User = typeof users.$inferSelect;
export type Household = typeof households.$inferSelect;
export type HouseholdMember = typeof householdMembers.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type CsvImportBatch = typeof csvImportBatches.$inferSelect;
