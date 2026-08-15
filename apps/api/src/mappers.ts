import type { Account, Category, Transaction } from '@gpt-finance/db';
import type { AccountDto, CategoryDto, TransactionDto } from '@gpt-finance/shared';

export function toIso(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString();
}

export function mapAccount(row: Account): AccountDto {
  return {
    id: row.id,
    householdId: row.householdId,
    name: row.name,
    type: row.type,
    currency: 'INR',
    openingBalancePaise: row.openingBalancePaise,
    isArchived: row.isArchived,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapCategory(row: Category): CategoryDto {
  return {
    id: row.id,
    householdId: row.householdId,
    slug: row.slug,
    name: row.name,
    kind: row.kind,
    isSystem: row.isSystem,
  };
}

export function mapTransaction(row: Transaction): TransactionDto {
  return {
    id: row.id,
    householdId: row.householdId,
    accountId: row.accountId,
    occurredAt: row.occurredAt.toISOString(),
    type: row.type,
    amountPaise: row.amountPaise,
    currency: 'INR',
    categoryId: row.categoryId,
    merchant: row.merchant,
    note: row.note,
    status: row.status,
    source: row.source,
    transferAccountId: row.transferAccountId,
    transferGroupId: row.transferGroupId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    voidedAt: toIso(row.voidedAt),
    voidReason: row.voidReason,
  };
}
