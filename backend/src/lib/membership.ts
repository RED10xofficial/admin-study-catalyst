import type { Bindings } from '../env';
import { getDb } from '../db/client';
import { eq } from 'drizzle-orm';
import { users } from '@admin-study-catalyst/shared/schema';
import { kvGet, kvKeys, kvSet, TTL_30S } from './kv';

export async function getMembership(env: Bindings, userId: string): Promise<'normal' | 'premium'> {
  let membership = await kvGet(env.KV, kvKeys.userMembership(userId));
  if (!membership) {
    const db = getDb(env.DB);
    const user = await db
      .select({ membershipType: users.membershipType })
      .from(users)
      .where(eq(users.id, userId))
      .get();
    membership = user?.membershipType ?? 'normal';
    await kvSet(env.KV, kvKeys.userMembership(userId), membership, TTL_30S);
  }
  return membership as 'normal' | 'premium';
}
