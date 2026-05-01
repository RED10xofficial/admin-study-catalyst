import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { getDb } from '../../db/client';
import type { Bindings } from '../../env';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { studentListSchema, updateStudentSchema } from '@admin-study-catalyst/shared/validators';
import {
  getMembershipAnalytics,
  getQuestionAnalytics,
  getStudentExamHistory,
  listStudents,
  updateStudent,
} from './admin.service';

const adminApp = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string };
}>();

adminApp.use('*', authMiddleware, requireRole('admin'));

adminApp.get('/students', zValidator('query', studentListSchema), async (c) => {
  const students = await listStudents(getDb(c.env.DB), c.req.valid('query'));
  return c.json({ students });
});

adminApp.patch('/students/:id', zValidator('json', updateStudentSchema), async (c) => {
  const student = await updateStudent(
    getDb(c.env.DB),
    c.env.KV,
    c.get('userId'),
    c.req.param('id'),
    c.req.valid('json'),
  );
  return c.json({ student });
});

adminApp.get('/students/:id/exams', async (c) => {
  const exams = await getStudentExamHistory(getDb(c.env.DB), c.req.param('id'));
  return c.json({ exams });
});

adminApp.get('/analytics/membership', async (c) => {
  const analytics = await getMembershipAnalytics(getDb(c.env.DB));
  return c.json({ analytics });
});

adminApp.get('/analytics/questions', async (c) => {
  const analytics = await getQuestionAnalytics(getDb(c.env.DB));
  return c.json({ analytics });
});

export { adminApp };
