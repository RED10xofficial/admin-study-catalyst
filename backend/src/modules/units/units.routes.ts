import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { questions, units, users } from '@admin-study-catalyst/shared/schema';
import {
  COMMON_MESSAGES,
  QUESTION_MESSAGES,
  UNIT_MESSAGES,
} from '@admin-study-catalyst/shared/messages';
import { getDb } from '../../db/client';
import type { Bindings } from '../../env';
import { forbidden, notFound, unauthorized } from '../../lib/errors';
import { kvGet, kvKeys, kvSet, TTL_30S } from '../../lib/kv';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import {
  createUnitSchema,
  updateUnitSchema,
  unitListSchema,
} from '@admin-study-catalyst/shared/validators';
import type { ApiError, ApiResponse } from '@admin-study-catalyst/shared/types';
import { zValidate } from '../../lib/validated';
import { created, deleted, ok } from '../../lib/response';
import { createUnit, listUnits, getUnit, updateUnit, deleteUnit } from './units.service';

const unitsApp = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string };
}>();

unitsApp.use('*', authMiddleware);

async function getMembership(c: {
  env: Bindings;
  get: (key: 'userId') => string;
}): Promise<'normal' | 'premium'> {
  const userId = c.get('userId');
  let membership = await kvGet(c.env.KV, kvKeys.userMembership(userId));
  if (!membership) {
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

// GET / serves admin (full list) and student (membership-filtered list)
unitsApp.get('/', async (c) => {
  const userId = c.get('userId');
  const roleResult = await c.env.DB.prepare('SELECT role FROM users WHERE id = ?')
    .bind(userId)
    .first<{ role: string }>();

  if (!roleResult) throw unauthorized('User not found');

  if (roleResult.role === 'admin') {
    const parsed = unitListSchema.safeParse(c.req.query());
    if (!parsed.success) {
      const errors: ApiError[] = parsed.error.errors.map((e) => {
        const fieldPath = e.path.map(String).join('.');
        return fieldPath
          ? { field: fieldPath, message: e.message, code: e.code }
          : { message: e.message, code: e.code };
      });
      return c.json<ApiResponse<null>>(
        {
          status: 'error',
          code: 400,
          message: COMMON_MESSAGES.VALIDATION_FAILED,
          data: null,
          errors,
          meta: null,
          links: null,
        },
        400,
      );
    }
    const unitsList = await listUnits(getDb(c.env.DB), parsed.data);
    return ok(c, { units: unitsList }, UNIT_MESSAGES.LISTED);
  }

  if (roleResult.role === 'student') {
    const { examTypeId } = z.object({ examTypeId: z.string().optional() }).parse(c.req.query());
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
  }

  throw forbidden('Access denied');
});

// Student-only: get questions for a unit
unitsApp.get('/:id/questions', requireRole('student'), async (c) => {
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

// Admin-only CRUD
unitsApp.post('/', requireRole('admin'), zValidate('json', createUnitSchema), async (c) => {
  const unit = await createUnit(getDb(c.env.DB), c.env.R2, c.req.valid('json'));
  return created(c, { unit }, UNIT_MESSAGES.CREATED);
});

unitsApp.get('/:id', requireRole('admin'), async (c) => {
  const unit = await getUnit(getDb(c.env.DB), c.req.param('id'));
  return ok(c, { unit }, UNIT_MESSAGES.RETRIEVED);
});

unitsApp.patch('/:id', requireRole('admin'), zValidate('json', updateUnitSchema), async (c) => {
  const unit = await updateUnit(getDb(c.env.DB), c.env.R2, c.req.param('id'), c.req.valid('json'));
  return ok(c, { unit }, UNIT_MESSAGES.UPDATED);
});

unitsApp.delete('/:id', requireRole('admin'), async (c) => {
  await deleteUnit(getDb(c.env.DB), c.req.param('id'));
  return deleted(c, UNIT_MESSAGES.DELETED);
});

export { unitsApp };
