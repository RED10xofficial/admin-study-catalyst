import { and, eq, lt } from 'drizzle-orm';
import { studentExams } from '@admin-study-catalyst/shared/schema';
import { getDb } from '../db/client';
import type { Bindings } from '../env';

export async function markAbandonedExams(env: Bindings): Promise<void> {
  const db = getDb(env.DB);
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const result = await db
    .update(studentExams)
    .set({ status: 'abandoned' })
    .where(and(eq(studentExams.status, 'active'), lt(studentExams.startedAt, cutoff)))
    .returning({ id: studentExams.id });

  console.log(`[cron] Marked ${result.length} exam(s) as abandoned`);
}
