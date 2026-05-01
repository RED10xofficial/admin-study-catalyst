import { and, eq } from 'drizzle-orm';
import type { Db } from '../../db/client';
import type { Bindings } from '../../env';
import { bookCodes } from '@admin-study-catalyst/shared/schema';
import { conflict, notFound, badRequest } from '../../lib/errors';
import { generateId, now } from '../../lib/id';
import { getR2PresignConfig, presignR2Get } from '../../lib/r2';

function generateCode(): string {
  return crypto.randomUUID().replace(/-/g, '').toUpperCase().slice(0, 12);
}

async function insertCodeWithRetry(
  db: Db,
  studentOrigin: string,
  expiresAt?: string,
  maxRetries = 3,
) {
  for (let i = 0; i < maxRetries; i++) {
    const code = generateCode();
    const qrUrl = `${studentOrigin}/activate?code=${code}`;
    try {
      const [row] = await db
        .insert(bookCodes)
        .values({
          id: generateId(),
          code,
          qrUrl,
          status: 'unused',
          expiresAt: expiresAt ?? null,
          createdAt: now(),
        })
        .returning();
      return row;
    } catch {
      if (i === maxRetries - 1) throw new Error('Failed to generate unique code after retries');
    }
  }
  throw new Error('Failed to generate unique code after retries');
}

export async function generateSingleCode(db: Db, studentOrigin: string, expiresAt?: string) {
  return insertCodeWithRetry(db, studentOrigin, expiresAt);
}

export async function generateBulkCodes(
  db: Db,
  studentOrigin: string,
  count_: number,
  expiresAt?: string,
) {
  if (count_ > 100) {
    throw badRequest('Bulk generation is limited to 100 codes per request.', 'BULK_LIMIT');
  }

  const BATCH_SIZE = 50;
  let created = 0;

  for (let i = 0; i < count_; i += BATCH_SIZE) {
    const batchSize = Math.min(BATCH_SIZE, count_ - i);
    for (let j = 0; j < batchSize; j++) {
      const code = generateCode();
      const qrUrl = `${studentOrigin}/activate?code=${code}`;
      await db.insert(bookCodes).values({
        id: generateId(),
        code,
        qrUrl,
        status: 'unused',
        expiresAt: expiresAt ?? null,
        createdAt: now(),
      });
      created++;
    }
  }

  return { created };
}

export async function listBookCodes(
  db: Db,
  query: {
    status?: 'unused' | 'used' | 'expired' | 'blocked';
    page: number;
    limit: number;
  },
) {
  const conditions = query.status ? [eq(bookCodes.status, query.status)] : [];
  return db
    .select()
    .from(bookCodes)
    .where(conditions.length ? and(...conditions) : undefined)
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);
}

export async function updateCodeStatus(
  db: Db,
  id: string,
  status: 'blocked' | 'unused' | 'expired',
) {
  const existing = await db.select().from(bookCodes).where(eq(bookCodes.id, id)).get();
  if (!existing) throw notFound('Book code not found');

  const [updated] = await db
    .update(bookCodes)
    .set({ status })
    .where(eq(bookCodes.id, id))
    .returning();
  return updated;
}

export async function deleteBookCode(db: Db, id: string) {
  const existing = await db.select().from(bookCodes).where(eq(bookCodes.id, id)).get();
  if (!existing) throw notFound('Book code not found');
  if (existing.usedByUserId) throw conflict('Cannot delete a code that has been used');
  await db.delete(bookCodes).where(eq(bookCodes.id, id));
}

export async function exportCodesToR2(db: Db, env: Bindings): Promise<string> {
  const cfg = getR2PresignConfig(env);
  if (!cfg) {
    throw badRequest(
      'R2 presign is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.',
      'R2_PRESIGN_CONFIG',
    );
  }

  const allCodes = await db.select().from(bookCodes);
  const csv = ['id,code,qr_url,status,used_at,expires_at,created_at']
    .concat(
      allCodes.map(
        (c) =>
          `${c.id},${c.code},${c.qrUrl},${c.status},${c.usedAt ?? ''},${c.expiresAt ?? ''},${c.createdAt}`,
      ),
    )
    .join('\n');

  const key = `exports/book-codes-${now()}.csv`;
  await env.R2.put(key, csv, { httpMetadata: { contentType: 'text/csv' } });
  return presignR2Get(cfg, key, 60 * 60 * 24);
}
