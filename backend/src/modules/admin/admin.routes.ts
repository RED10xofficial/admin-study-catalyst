import { Hono } from 'hono';
import { getDb } from '../../db/client';
import type { Bindings } from '../../env';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { studentListSchema, updateStudentSchema } from '@admin-study-catalyst/shared/validators';
import { ADMIN_MESSAGES } from '@admin-study-catalyst/shared/messages';
import { zValidate } from '../../lib/validated';
import { ok } from '../../lib/response';
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

adminApp.get('/students', zValidate('query', studentListSchema), async (c) => {
  const students = await listStudents(getDb(c.env.DB), c.req.valid('query'));
  return ok(c, { students }, ADMIN_MESSAGES.STUDENTS_LISTED);
});

adminApp.patch('/students/:id', zValidate('json', updateStudentSchema), async (c) => {
  const student = await updateStudent(
    getDb(c.env.DB),
    c.env.KV,
    c.get('userId'),
    c.req.param('id'),
    c.req.valid('json'),
  );
  return ok(c, { student }, ADMIN_MESSAGES.STUDENT_UPDATED);
});

adminApp.get('/students/:id/exams', async (c) => {
  const exams = await getStudentExamHistory(getDb(c.env.DB), c.req.param('id'));
  return ok(c, { exams }, ADMIN_MESSAGES.STUDENT_EXAM_HISTORY);
});

adminApp.get('/analytics/membership', async (c) => {
  const analytics = await getMembershipAnalytics(getDb(c.env.DB));
  return ok(c, { analytics }, ADMIN_MESSAGES.ANALYTICS_MEMBERSHIP);
});

adminApp.get('/analytics/questions', async (c) => {
  const analytics = await getQuestionAnalytics(getDb(c.env.DB));
  return ok(c, { analytics }, ADMIN_MESSAGES.ANALYTICS_QUESTIONS);
});

export { adminApp };
