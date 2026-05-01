import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { Bindings } from '../../env';
import { getDb } from '../../db/client';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import {
  createExamTypeSchema,
  updateExamTypeSchema,
  examTypeListSchema,
} from '@admin-study-catalyst/shared/validators';
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

examTypesApp.get('/', zValidator('query', examTypeListSchema), async (c) => {
  const query = c.req.valid('query');
  const db = getDb(c.env.DB);
  const examTypesList = await listExamTypes(db, query);
  return c.json({ examTypes: examTypesList });
});

examTypesApp.post('/', zValidator('json', createExamTypeSchema), async (c) => {
  const input = c.req.valid('json');
  const db = getDb(c.env.DB);
  const examType = await createExamType(db, input);
  return c.json({ examType }, 201);
});

examTypesApp.get('/:id', async (c) => {
  const db = getDb(c.env.DB);
  const examType = await getExamType(db, c.req.param('id'));
  return c.json({ examType });
});

examTypesApp.patch('/:id', zValidator('json', updateExamTypeSchema), async (c) => {
  const input = c.req.valid('json');
  const db = getDb(c.env.DB);
  const examType = await updateExamType(db, c.req.param('id'), input);
  return c.json({ examType });
});

examTypesApp.delete('/:id', async (c) => {
  const db = getDb(c.env.DB);
  await deleteExamType(db, c.req.param('id'));
  return c.json({ success: true });
});

export { examTypesApp };
