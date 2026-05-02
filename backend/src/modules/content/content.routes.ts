import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { questions, units } from '@admin-study-catalyst/shared/schema';
import { QUESTION_MESSAGES, UNIT_MESSAGES } from '@admin-study-catalyst/shared/messages';
import { getDb } from '../../db/client';
import type { Bindings } from '../../env';
import { forbidden, notFound } from '../../lib/errors';
import { kvGet, kvKeys, kvSet, TTL_30S } from '../../lib/kv';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { zValidate } from '../../lib/validated';
import { ok } from '../../lib/response';

const contentApp = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string };
}>();

contentApp.use('*', authMiddleware, requireRole('student'));

async function getMembership(c: {
  env: Bindings;
  get: (key: 'userId') => string;
}): Promise<'normal' | 'premium'> {
  const userId = c.get('userId');
  let membership = await kvGet(c.env.KV, kvKeys.userMembership(userId));
  if (!membership) {
    const { users } = await import('@admin-study-catalyst/shared/schema');
    const db = getDb(c.env.DB);
    const user = await db
      .select({ membershipType: users.membershipType })
      .from(users)
      .where(eq(users.id, userId))
      .get();
    membership = user?.membershipType ?? 'normal';
    await kvSet(c.env.KV, kvKeys.userMembership(userId), membership, TTL_30S);
  }
  return membership as 'normal' | 'premium';
}

contentApp.get(
  '/units',
  zValidate('query', z.object({ examTypeId: z.string().optional() })),
  async (c) => {
    const { examTypeId } = c.req.valid('query');
    const membership = await getMembership(c);
    const db = getDb(c.env.DB);

    const conditions = [eq(units.isDeleted, false)];
    if (examTypeId) conditions.push(eq(units.examTypeId, examTypeId));
    if (membership === 'normal') conditions.push(eq(units.accessType, 'free'));

    const unitList = await db
      .select()
      .from(units)
      .where(and(...conditions));
    return ok(c, { units: unitList }, UNIT_MESSAGES.LISTED);
  },
);

contentApp.get('/units/:id/questions', async (c) => {
  const membership = await getMembership(c);
  const db = getDb(c.env.DB);
  const unitId = c.req.param('id');

  const unit = await db
    .select({ accessType: units.accessType, isDeleted: units.isDeleted })
    .from(units)
    .where(eq(units.id, unitId))
    .get();
  if (!unit || unit.isDeleted) throw notFound('Unit not found');
  if (unit.accessType === 'premium' && membership !== 'premium') {
    throw forbidden('Premium membership required');
  }

  const qConditions = [eq(questions.unitId, unitId), eq(questions.isDeleted, false)];
  if (membership === 'normal') qConditions.push(eq(questions.accessType, 'free'));

  const questionList = await db
    .select()
    .from(questions)
    .where(and(...qConditions))
    .orderBy(questions.sequenceOrder);

  return ok(
    c,
    { questions: questionList.map(({ correctAnswer: _ca, ...q }) => q) },
    QUESTION_MESSAGES.LISTED,
  );
});

export { contentApp };
