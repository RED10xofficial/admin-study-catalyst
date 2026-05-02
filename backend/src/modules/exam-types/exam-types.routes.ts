import { Hono } from 'hono';
import type { Bindings } from '../../env';
import { getDb } from '../../db/client';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import {
  createExamTypeSchema,
  updateExamTypeSchema,
  examTypeListSchema,
} from '@admin-study-catalyst/shared/validators';
import { EXAM_TYPE_MESSAGES } from '@admin-study-catalyst/shared/messages';
import { zValidate } from '../../lib/validated';
import { created, deleted, ok } from '../../lib/response';
import {
  createExamType,
  listExamTypes,
  getExamType,
  updateExamType,
  deleteExamType,
} from './exam-types.service';

const examTypesApp = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string };
}>();

examTypesApp.use('*', authMiddleware, requireRole('admin'));

examTypesApp.get('/', zValidate('query', examTypeListSchema), async (c) => {
  const examTypesList = await listExamTypes(getDb(c.env.DB), c.req.valid('query'));
  return ok(c, { examTypes: examTypesList }, EXAM_TYPE_MESSAGES.LISTED);
});

examTypesApp.post('/', zValidate('json', createExamTypeSchema), async (c) => {
  const examType = await createExamType(getDb(c.env.DB), c.req.valid('json'));
  return created(c, { examType }, EXAM_TYPE_MESSAGES.CREATED);
});

examTypesApp.get('/:id', async (c) => {
  const examType = await getExamType(getDb(c.env.DB), c.req.param('id'));
  return ok(c, { examType }, EXAM_TYPE_MESSAGES.RETRIEVED);
});

examTypesApp.patch('/:id', zValidate('json', updateExamTypeSchema), async (c) => {
  const examType = await updateExamType(getDb(c.env.DB), c.req.param('id'), c.req.valid('json'));
  return ok(c, { examType }, EXAM_TYPE_MESSAGES.UPDATED);
});

examTypesApp.delete('/:id', async (c) => {
  await deleteExamType(getDb(c.env.DB), c.req.param('id'));
  return deleted(c, EXAM_TYPE_MESSAGES.DELETED);
});

export { examTypesApp };
