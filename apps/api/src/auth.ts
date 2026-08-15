import * as argon2 from 'argon2';
import { and, eq, gt, isNull } from 'drizzle-orm';
import {
  auditEvents,
  ensureHouseholdCategories,
  householdMembers,
  households,
  sessions,
  users,
  type Db,
} from '@gpt-finance/db';
import type { UserPublic } from '@gpt-finance/shared';
import type { Env } from './config.js';
import { createSessionToken, hashSessionToken } from './session-token.js';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
export const SESSION_COOKIE_NAME = 'gf_session';

export { createSessionToken, hashSessionToken } from './session-token.js';

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export async function writeAudit(
  db: Db,
  input: {
    householdId?: string | null;
    actorUserId?: string | null;
    action: string;
    entity: string;
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  await db.insert(auditEvents).values({
    householdId: input.householdId ?? null,
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    entity: input.entity,
    payload: input.payload ?? {},
  });
}

export async function bootstrapAdmin(db: Db, env: Env): Promise<void> {
  const existing = await db.select({ id: users.id }).from(users).limit(1);
  if (existing.length > 0) {
    return;
  }

  const passwordHash = await hashPassword(env.INITIAL_ADMIN_PASSWORD);
  const [user] = await db
    .insert(users)
    .values({
      email: env.INITIAL_ADMIN_EMAIL.toLowerCase(),
      passwordHash,
    })
    .returning();

  const [household] = await db
    .insert(households)
    .values({
      name: 'Primary Household',
      timezone: env.HOUSEHOLD_TIMEZONE,
    })
    .returning();

  await db.insert(householdMembers).values({
    householdId: household.id,
    userId: user.id,
    role: 'owner',
  });

  await ensureHouseholdCategories(db, household.id);

  await writeAudit(db, {
    householdId: household.id,
    actorUserId: user.id,
    action: 'bootstrap.admin_created',
    entity: 'user',
    payload: { email: user.email },
  });
}

export async function findUserPublicById(db: Db, userId: string): Promise<UserPublic | null> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      householdId: households.id,
      householdName: households.name,
      role: householdMembers.role,
    })
    .from(users)
    .innerJoin(householdMembers, eq(householdMembers.userId, users.id))
    .innerJoin(households, eq(households.id, householdMembers.householdId))
    .where(eq(users.id, userId))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    email: row.email,
    householdId: row.householdId,
    householdName: row.householdName,
    role: row.role,
  };
}

export async function authenticateWithPassword(
  db: Db,
  email: string,
  password: string,
): Promise<{ user: UserPublic; token: string; expiresAt: Date } | null> {
  const normalized = email.toLowerCase();
  const found = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
  const userRow = found[0];
  if (!userRow) {
    return null;
  }

  const ok = await verifyPassword(userRow.passwordHash, password);
  if (!ok) {
    await writeAudit(db, {
      action: 'auth.login_failed',
      entity: 'session',
      payload: { email: normalized },
    });
    return null;
  }

  const user = await findUserPublicById(db, userRow.id);
  if (!user) {
    return null;
  }

  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessions).values({
    userId: userRow.id,
    tokenHash,
    expiresAt,
  });

  await writeAudit(db, {
    householdId: user.householdId,
    actorUserId: user.id,
    action: 'auth.login',
    entity: 'session',
    payload: { email: user.email },
  });

  return { user, token, expiresAt };
}

export async function resolveSession(
  db: Db,
  token: string | undefined,
): Promise<UserPublic | null> {
  if (!token) {
    return null;
  }
  const tokenHash = hashSessionToken(token);
  const now = new Date();
  const rows = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, now),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }
  return findUserPublicById(db, row.userId);
}

export async function revokeSession(db: Db, token: string | undefined, user: UserPublic | null) {
  if (!token) {
    return;
  }
  const tokenHash = hashSessionToken(token);
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt)));

  await writeAudit(db, {
    householdId: user?.householdId,
    actorUserId: user?.id,
    action: 'auth.logout',
    entity: 'session',
    payload: {},
  });
}
