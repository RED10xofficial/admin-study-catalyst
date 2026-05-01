import { eq } from 'drizzle-orm';
import type { KVNamespace } from '@cloudflare/workers-types';
import { bookCodes, users } from '@admin-study-catalyst/shared/schema';
import type { Db } from '../../db/client';
import { badRequest, conflict } from '../../lib/errors';
import { now } from '../../lib/id';
import { invalidateUserCache } from '../../lib/kv';

export async function upgradeWithBookCode(
  db: Db,
  kv: KVNamespace,
  studentId: string,
  rawCode: string,
) {
  const code = rawCode.toUpperCase();

  const user = await db
    .select({ membershipType: users.membershipType })
    .from(users)
    .where(eq(users.id, studentId))
    .get();
  if (user?.membershipType === 'premium') throw conflict('Already a premium member');

  const bookCode = await db.select().from(bookCodes).where(eq(bookCodes.code, code)).get();

  if (!bookCode) throw badRequest('Invalid book code', 'INVALID_CODE');
  if (bookCode.status !== 'unused')
    throw badRequest('Book code already used or blocked', 'CODE_UNAVAILABLE');
  if (bookCode.expiresAt && new Date(bookCode.expiresAt) < new Date()) {
    throw badRequest('Book code has expired', 'CODE_EXPIRED');
  }

  const ts = now();

  await db.batch([
    db
      .update(users)
      .set({
        membershipType: 'premium',
        membershipSource: 'manual_upgrade',
        updatedAt: ts,
      })
      .where(eq(users.id, studentId)),
    db
      .update(bookCodes)
      .set({ status: 'used', usedByUserId: studentId, usedAt: ts })
      .where(eq(bookCodes.code, code)),
  ]);

  await invalidateUserCache(kv, studentId);
  return { success: true, membershipType: 'premium' as const };
}
