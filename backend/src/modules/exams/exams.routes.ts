import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, eq } from 'drizzle-orm';
import { studentExams } from '@admin-study-catalyst/shared/schema';
import { createExamSchema, submitExamSchema } from '@admin-study-catalyst/shared/validators';
import { getDb } from '../../db/client';
import type { Bindings } from '../../env';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { createExam, submitExam } from './exams.service';

const examsApp = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string };
}>();

examsApp.use('*', authMiddleware, requireRole('student'));

examsApp.post('/', zValidator('json', createExamSchema), async (c) => {
  const exam = await createExam(getDb(c.env.DB), c.get('userId'), c.req.valid('json'));
  return c.json({ exam }, 201);
});

examsApp.post('/:id/submit', zValidator('json', submitExamSchema), async (c) => {
  const exam = await submitExam(
    getDb(c.env.DB),
    c.get('userId'),
    c.req.param('id'),
    c.req.valid('json'),
  );
  return c.json({ exam });
});

examsApp.get('/:id', async (c) => {
  const db = getDb(c.env.DB);
  const exam = await db
    .select()
    .from(studentExams)
    .where(and(eq(studentExams.id, c.req.param('id')), eq(studentExams.studentId, c.get('userId'))))
    .get();
  if (!exam) return c.json({ error: 'Not found' }, 404);
  return c.json({ exam });
});

export { examsApp };
