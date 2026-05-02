import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { studentExams } from '@admin-study-catalyst/shared/schema';
import { createExamSchema, submitExamSchema } from '@admin-study-catalyst/shared/validators';
import { EXAM_MESSAGES } from '@admin-study-catalyst/shared/messages';
import { getDb } from '../../db/client';
import type { Bindings } from '../../env';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { notFound } from '../../lib/errors';
import { zValidate } from '../../lib/validated';
import { created, ok } from '../../lib/response';
import { createExam, getExamQuestions, listExams, submitExam } from './exams.service';

const examsApp = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string };
}>();

examsApp.use('*', authMiddleware, requireRole('student'));

examsApp.get('/', async (c) => {
  const exams = await listExams(getDb(c.env.DB), c.get('userId'));
  return ok(c, { exams }, EXAM_MESSAGES.LISTED);
});

examsApp.post('/', zValidate('json', createExamSchema), async (c) => {
  const exam = await createExam(getDb(c.env.DB), c.get('userId'), c.req.valid('json'));
  return created(c, { exam }, EXAM_MESSAGES.CREATED);
});

examsApp.post('/:id/submit', zValidate('json', submitExamSchema), async (c) => {
  const exam = await submitExam(
    getDb(c.env.DB),
    c.get('userId'),
    c.req.param('id'),
    c.req.valid('json'),
  );
  return ok(c, { exam }, EXAM_MESSAGES.SUBMITTED);
});

examsApp.get('/:id/questions', async (c) => {
  const questions = await getExamQuestions(getDb(c.env.DB), c.get('userId'), c.req.param('id'));
  return ok(c, { questions }, EXAM_MESSAGES.QUESTIONS_RETRIEVED);
});

examsApp.get('/:id', async (c) => {
  const db = getDb(c.env.DB);
  const exam = await db
    .select()
    .from(studentExams)
    .where(and(eq(studentExams.id, c.req.param('id')), eq(studentExams.studentId, c.get('userId'))))
    .get();
  if (!exam) throw notFound('Exam not found');
  return ok(c, { exam }, EXAM_MESSAGES.RETRIEVED);
});

export { examsApp };
