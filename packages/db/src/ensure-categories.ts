import { and, eq } from 'drizzle-orm';
import type { Db } from './client.js';
import { SYSTEM_CATEGORY_SEEDS } from './category-seeds.js';
import { categories, households } from './schema.js';

/** Idempotently seed India-friendly system categories for a household. */
export async function ensureHouseholdCategories(db: Db, householdId: string): Promise<void> {
  const existing = await db
    .select({ slug: categories.slug })
    .from(categories)
    .where(and(eq(categories.householdId, householdId), eq(categories.isSystem, true)));

  const have = new Set(existing.map((r) => r.slug));
  const missing = SYSTEM_CATEGORY_SEEDS.filter((c) => !have.has(c.slug));
  if (missing.length === 0) {
    return;
  }

  await db.insert(categories).values(
    missing.map((c) => ({
      householdId,
      slug: c.slug,
      name: c.name,
      kind: c.kind,
      isSystem: true,
    })),
  );
}

/** Seed categories for every household (idempotent). */
export async function ensureAllHouseholdCategories(db: Db): Promise<void> {
  const rows = await db.select({ id: households.id }).from(households);
  for (const row of rows) {
    await ensureHouseholdCategories(db, row.id);
  }
}
