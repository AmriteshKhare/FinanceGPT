import { randomUUID } from 'node:crypto';
import { and, count, desc, eq, gte, lte, ne, sql } from 'drizzle-orm';
import {
  accounts,
  categories,
  csvImportBatches,
  ensureHouseholdCategories,
  transactions,
  type Db,
} from '@gpt-finance/db';
import {
  assertPositivePaise,
  assertTransferAccountsDiffer,
  duplicateFingerprint,
  MoneyError,
  parseCsv,
  parseInrAmountToPaise,
} from '@gpt-finance/finance-core';
import type {
  CreateAccountRequest,
  CreateTransactionRequest,
  CreateTransferRequest,
  CsvColumnMapping,
  CsvPreviewRow,
  PatchAccountRequest,
  PatchTransactionRequest,
  TransactionDto,
  TransactionsListQuery,
  UserPublic,
} from '@gpt-finance/shared';
import { writeAudit } from './auth.js';
import { mapAccount, mapCategory, mapTransaction } from './mappers.js';

async function getAccountOrThrow(db: Db, householdId: string, accountId: string) {
  const rows = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.householdId, householdId)))
    .limit(1);
  const row = rows[0];
  if (!row) {
    throw Object.assign(new Error('Account not found'), { statusCode: 404, code: 'NOT_FOUND' });
  }
  return row;
}

export async function listAccounts(db: Db, householdId: string) {
  const rows = await db
    .select()
    .from(accounts)
    .where(eq(accounts.householdId, householdId))
    .orderBy(accounts.name);
  return rows.map(mapAccount);
}

export async function createAccount(db: Db, user: UserPublic, body: CreateAccountRequest) {
  const [row] = await db
    .insert(accounts)
    .values({
      householdId: user.householdId,
      name: body.name,
      type: body.type,
      openingBalancePaise: body.openingBalancePaise,
      currency: 'INR',
    })
    .returning();
  await writeAudit(db, {
    householdId: user.householdId,
    actorUserId: user.id,
    action: 'account.created',
    entity: 'account',
    payload: { id: row.id, name: row.name },
  });
  return mapAccount(row);
}

export async function patchAccount(
  db: Db,
  user: UserPublic,
  accountId: string,
  body: PatchAccountRequest,
) {
  await getAccountOrThrow(db, user.householdId, accountId);
  const [row] = await db
    .update(accounts)
    .set({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.type !== undefined ? { type: body.type } : {}),
      ...(body.openingBalancePaise !== undefined
        ? { openingBalancePaise: body.openingBalancePaise }
        : {}),
      ...(body.isArchived !== undefined ? { isArchived: body.isArchived } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(accounts.id, accountId), eq(accounts.householdId, user.householdId)))
    .returning();
  await writeAudit(db, {
    householdId: user.householdId,
    actorUserId: user.id,
    action: 'account.updated',
    entity: 'account',
    payload: { id: accountId },
  });
  return mapAccount(row);
}

export async function listCategories(db: Db, householdId: string) {
  await ensureHouseholdCategories(db, householdId);
  const rows = await db
    .select()
    .from(categories)
    .where(and(eq(categories.householdId, householdId), sql`${categories.archivedAt} is null`))
    .orderBy(categories.name);
  return rows.map(mapCategory);
}

export async function createTransaction(db: Db, user: UserPublic, body: CreateTransactionRequest) {
  assertPositivePaise(body.amountPaise);
  await getAccountOrThrow(db, user.householdId, body.accountId);
  if (body.categoryId) {
    const cats = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, body.categoryId), eq(categories.householdId, user.householdId)))
      .limit(1);
    if (!cats[0]) {
      throw Object.assign(new Error('Category not found'), { statusCode: 400, code: 'INVALID_CATEGORY' });
    }
  }
  const [row] = await db
    .insert(transactions)
    .values({
      householdId: user.householdId,
      accountId: body.accountId,
      occurredAt: new Date(body.occurredAt),
      type: body.type,
      amountPaise: body.amountPaise,
      currency: 'INR',
      categoryId: body.categoryId ?? null,
      merchant: body.merchant ?? null,
      note: body.note ?? null,
      status: 'confirmed',
      source: 'manual',
    })
    .returning();
  await writeAudit(db, {
    householdId: user.householdId,
    actorUserId: user.id,
    action: 'transaction.created',
    entity: 'transaction',
    payload: { id: row.id, type: row.type },
  });
  return mapTransaction(row);
}

export async function createTransfer(db: Db, user: UserPublic, body: CreateTransferRequest) {
  assertPositivePaise(body.amountPaise);
  assertTransferAccountsDiffer(body.fromAccountId, body.toAccountId);
  await getAccountOrThrow(db, user.householdId, body.fromAccountId);
  await getAccountOrThrow(db, user.householdId, body.toAccountId);
  const groupId = randomUUID();
  const occurredAt = new Date(body.occurredAt);
  const inserted = await db
    .insert(transactions)
    .values([
      {
        householdId: user.householdId,
        accountId: body.fromAccountId,
        occurredAt,
        type: 'transfer',
        amountPaise: body.amountPaise,
        currency: 'INR',
        categoryId: null,
        merchant: null,
        note: body.note ?? null,
        status: 'confirmed',
        source: 'manual',
        transferAccountId: body.toAccountId,
        transferGroupId: groupId,
        metadata: { leg: 'out' },
      },
      {
        householdId: user.householdId,
        accountId: body.toAccountId,
        occurredAt,
        type: 'transfer',
        amountPaise: body.amountPaise,
        currency: 'INR',
        categoryId: null,
        merchant: null,
        note: body.note ?? null,
        status: 'confirmed',
        source: 'manual',
        transferAccountId: body.fromAccountId,
        transferGroupId: groupId,
        metadata: { leg: 'in' },
      },
    ])
    .returning();
  await writeAudit(db, {
    householdId: user.householdId,
    actorUserId: user.id,
    action: 'transaction.transfer_created',
    entity: 'transaction',
    payload: { transferGroupId: groupId },
  });
  return inserted.map(mapTransaction);
}

export async function listTransactions(db: Db, householdId: string, query: TransactionsListQuery) {
  const filters = [eq(transactions.householdId, householdId)];
  if (query.from) filters.push(gte(transactions.occurredAt, new Date(query.from)));
  if (query.to) filters.push(lte(transactions.occurredAt, new Date(query.to)));
  if (query.categoryId) filters.push(eq(transactions.categoryId, query.categoryId));
  if (query.accountId) filters.push(eq(transactions.accountId, query.accountId));
  if (query.status) filters.push(eq(transactions.status, query.status));

  const where = and(...filters);
  const [totalRow] = await db.select({ value: count() }).from(transactions).where(where);
  const rows = await db
    .select()
    .from(transactions)
    .where(where)
    .orderBy(desc(transactions.occurredAt))
    .limit(query.limit)
    .offset(query.offset);
  return { transactions: rows.map(mapTransaction), total: Number(totalRow?.value ?? 0) };
}

export async function patchTransaction(
  db: Db,
  user: UserPublic,
  id: string,
  body: PatchTransactionRequest,
) {
  const existing = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.householdId, user.householdId)))
    .limit(1);
  const row = existing[0];
  if (!row) {
    throw Object.assign(new Error('Transaction not found'), { statusCode: 404, code: 'NOT_FOUND' });
  }
  if (row.status === 'void') {
    throw Object.assign(new Error('Cannot edit voided transaction'), {
      statusCode: 400,
      code: 'VOIDED',
    });
  }
  if (row.type === 'transfer') {
    throw Object.assign(new Error('Edit transfer via void + recreate'), {
      statusCode: 400,
      code: 'TRANSFER_IMMUTABLE',
    });
  }
  if (body.amountPaise !== undefined) assertPositivePaise(body.amountPaise);
  const [updated] = await db
    .update(transactions)
    .set({
      ...(body.occurredAt ? { occurredAt: new Date(body.occurredAt) } : {}),
      ...(body.amountPaise !== undefined ? { amountPaise: body.amountPaise } : {}),
      ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
      ...(body.merchant !== undefined ? { merchant: body.merchant } : {}),
      ...(body.note !== undefined ? { note: body.note } : {}),
      updatedAt: new Date(),
    })
    .where(eq(transactions.id, id))
    .returning();
  await writeAudit(db, {
    householdId: user.householdId,
    actorUserId: user.id,
    action: 'transaction.updated',
    entity: 'transaction',
    payload: { id },
  });
  return mapTransaction(updated);
}

export async function voidTransaction(
  db: Db,
  user: UserPublic,
  id: string,
  reason?: string,
): Promise<TransactionDto[]> {
  const existing = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.householdId, user.householdId)))
    .limit(1);
  const row = existing[0];
  if (!row) {
    throw Object.assign(new Error('Transaction not found'), { statusCode: 404, code: 'NOT_FOUND' });
  }
  if (row.status === 'void') {
    return [mapTransaction(row)];
  }
  const now = new Date();
  const voidReason = reason ?? 'User voided';
  if (row.transferGroupId) {
    const updated = await db
      .update(transactions)
      .set({ status: 'void', voidedAt: now, voidReason, updatedAt: now })
      .where(
        and(
          eq(transactions.householdId, user.householdId),
          eq(transactions.transferGroupId, row.transferGroupId),
          ne(transactions.status, 'void'),
        ),
      )
      .returning();
    await writeAudit(db, {
      householdId: user.householdId,
      actorUserId: user.id,
      action: 'transaction.voided_transfer',
      entity: 'transaction',
      payload: { transferGroupId: row.transferGroupId },
    });
    return updated.map(mapTransaction);
  }
  const [updated] = await db
    .update(transactions)
    .set({ status: 'void', voidedAt: now, voidReason, updatedAt: now })
    .where(eq(transactions.id, id))
    .returning();
  await writeAudit(db, {
    householdId: user.householdId,
    actorUserId: user.id,
    action: 'transaction.voided',
    entity: 'transaction',
    payload: { id },
  });
  return [mapTransaction(updated)];
}

function cell(row: string[], headers: string[], column: string | undefined): string {
  if (!column) return '';
  const idx = headers.indexOf(column);
  if (idx < 0) return '';
  return row[idx] ?? '';
}

export async function previewCsvImport(
  db: Db,
  user: UserPublic,
  input: {
    filename: string;
    csvText: string;
    accountId: string;
    columnMapping: CsvColumnMapping;
  },
) {
  await getAccountOrThrow(db, user.householdId, input.accountId);
  await ensureHouseholdCategories(db, user.householdId);
  const { headers, rows } = parseCsv(input.csvText);
  const mapping = input.columnMapping;
  for (const required of [mapping.occurredAt, mapping.amount]) {
    if (!headers.includes(required)) {
      throw Object.assign(new Error(`Missing CSV column: ${required}`), {
        statusCode: 400,
        code: 'CSV_COLUMN',
      });
    }
  }

  const existingTx = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.householdId, user.householdId),
        eq(transactions.accountId, input.accountId),
        ne(transactions.status, 'void'),
      ),
    );
  const existingKeys = new Set(
    existingTx.map((t) =>
      duplicateFingerprint({
        householdId: user.householdId,
        accountId: input.accountId,
        occurredAt: t.occurredAt,
        amountPaise: t.amountPaise,
        merchant: t.merchant,
      }),
    ),
  );

  const catRows = await db
    .select()
    .from(categories)
    .where(eq(categories.householdId, user.householdId));
  const slugToId = new Map(catRows.map((c) => [c.slug, c.id]));

  const previewRows: CsvPreviewRow[] = rows.map((raw, rowIndex) => {
    const errors: string[] = [];
    let occurredAt: string | null = null;
    let amountPaise: number | null = null;
    let type: CsvPreviewRow['type'] = 'expense';
    const merchantRaw = cell(raw, headers, mapping.merchant) || null;
    const noteRaw = cell(raw, headers, mapping.note) || null;
    const categorySlug = (cell(raw, headers, mapping.category) || '').trim().toLowerCase() || null;

    const dateRaw = cell(raw, headers, mapping.occurredAt);
    const parsedDate = new Date(dateRaw);
    if (!dateRaw || Number.isNaN(parsedDate.getTime())) {
      errors.push('Invalid date');
    } else {
      occurredAt = parsedDate.toISOString();
    }

    const amountRaw = cell(raw, headers, mapping.amount);
    try {
      const signed = parseInrAmountToPaise(amountRaw);
      amountPaise = Math.abs(signed);
      if (mapping.type) {
        const t = cell(raw, headers, mapping.type).trim().toLowerCase();
        if (['income', 'expense', 'refund', 'adjustment', 'transfer'].includes(t)) {
          type = t as CsvPreviewRow['type'];
        } else if (signed < 0) {
          type = 'expense';
        } else {
          type = 'income';
        }
      } else if (signed < 0) {
        type = 'expense';
      }
      if (type === 'transfer') {
        errors.push('Transfer type not supported in CSV import');
      }
    } catch (e) {
      errors.push(e instanceof MoneyError ? e.message : 'Invalid amount');
    }

    if (categorySlug && !slugToId.has(categorySlug)) {
      errors.push(`Unknown category slug: ${categorySlug}`);
    }

    let isDuplicate = false;
    if (occurredAt && amountPaise && amountPaise > 0) {
      const fp = duplicateFingerprint({
        householdId: user.householdId,
        accountId: input.accountId,
        occurredAt,
        amountPaise,
        merchant: merchantRaw,
      });
      isDuplicate = existingKeys.has(fp);
    }

    const include = errors.length === 0 && !isDuplicate;
    return {
      rowIndex,
      occurredAt,
      amountPaise,
      type,
      merchant: merchantRaw,
      note: noteRaw,
      categorySlug,
      errors,
      isDuplicate,
      include,
    };
  });

  const [batch] = await db
    .insert(csvImportBatches)
    .values({
      householdId: user.householdId,
      actorUserId: user.id,
      filename: input.filename,
      status: 'preview',
      columnMapping: {
        ...mapping,
        accountId: input.accountId,
      },
      previewRows,
    })
    .returning();

  await writeAudit(db, {
    householdId: user.householdId,
    actorUserId: user.id,
    action: 'import.csv_preview',
    entity: 'csv_import_batch',
    payload: { batchId: batch.id, rows: previewRows.length },
  });

  return {
    batchId: batch.id,
    headers,
    rows: previewRows,
    validCount: previewRows.filter((r) => r.errors.length === 0 && !r.isDuplicate).length,
    duplicateCount: previewRows.filter((r) => r.isDuplicate).length,
    errorCount: previewRows.filter((r) => r.errors.length > 0).length,
  };
}

export async function confirmCsvImport(
  db: Db,
  user: UserPublic,
  input: {
    batchId: string;
    skipDuplicates: boolean;
    rowIncludes?: Array<{ rowIndex: number; include: boolean }>;
  },
) {
  const batches = await db
    .select()
    .from(csvImportBatches)
    .where(
      and(eq(csvImportBatches.id, input.batchId), eq(csvImportBatches.householdId, user.householdId)),
    )
    .limit(1);
  const batch = batches[0];
  if (!batch) {
    throw Object.assign(new Error('Import batch not found'), { statusCode: 404, code: 'NOT_FOUND' });
  }
  if (batch.status !== 'preview') {
    throw Object.assign(new Error('Import batch already finalized'), {
      statusCode: 400,
      code: 'BATCH_STATE',
    });
  }

  const mapping = batch.columnMapping as CsvColumnMapping & { accountId: string };
  const accountId = mapping.accountId;
  await getAccountOrThrow(db, user.householdId, accountId);

  const includeMap = new Map((input.rowIncludes ?? []).map((r) => [r.rowIndex, r.include]));
  const previewRows = batch.previewRows as CsvPreviewRow[];
  const catRows = await db
    .select()
    .from(categories)
    .where(eq(categories.householdId, user.householdId));
  const slugToId = new Map(catRows.map((c) => [c.slug, c.id]));

  let importedCount = 0;
  let skippedCount = 0;

  for (const row of previewRows) {
    const includeOverride = includeMap.get(row.rowIndex);
    let include = includeOverride !== undefined ? includeOverride : row.include;
    if (row.errors.length > 0) {
      skippedCount += 1;
      continue;
    }
    if (row.isDuplicate && input.skipDuplicates && includeOverride === undefined) {
      include = false;
    }
    if (!include || !row.occurredAt || !row.amountPaise || !row.type || row.type === 'transfer') {
      skippedCount += 1;
      continue;
    }
    await db.insert(transactions).values({
      householdId: user.householdId,
      accountId,
      occurredAt: new Date(row.occurredAt),
      type: row.type,
      amountPaise: row.amountPaise,
      currency: 'INR',
      categoryId: row.categorySlug ? (slugToId.get(row.categorySlug) ?? null) : null,
      merchant: row.merchant,
      note: row.note,
      status: 'confirmed',
      source: 'import',
      metadata: { batchId: batch.id, rowIndex: row.rowIndex },
    });
    importedCount += 1;
  }

  await db
    .update(csvImportBatches)
    .set({ status: 'committed', committedAt: new Date() })
    .where(eq(csvImportBatches.id, batch.id));

  await writeAudit(db, {
    householdId: user.householdId,
    actorUserId: user.id,
    action: 'import.csv_committed',
    entity: 'csv_import_batch',
    payload: { batchId: batch.id, importedCount, skippedCount },
  });

  return { importedCount, skippedCount };
}
