import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { Bindings } from '../../env';
import { getDb } from '../../db/client';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import {
  createExamQuestionSchema,
  updateExamQuestionSchema,
  examQuestionListSchema,
} from '@admin-study-catalyst/shared/validators';
import {
  createExamQuestion,
  listExamQuestions,
  getExamQuestion,
  updateExamQuestion,
  deleteExamQuestion,
} from './exam-questions.service';

const examQuestionsApp = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string };
}>();

examQuestionsApp.use('*', authMiddleware, requireRole('admin'));

examQuestionsApp.get('/', zValidator('query', examQuestionListSchema), async (c) => {
  return c.json({
    examQuestions: await listExamQuestions(getDb(c.env.DB), c.req.valid('query')),
  });
});

examQuestionsApp.post('/', zValidator('json', createExamQuestionSchema), async (c) => {
  const q = await createExamQuestion(getDb(c.env.DB), c.req.valid('json'));
  return c.json({ examQuestion: q }, 201);
});

examQuestionsApp.get('/:id', async (c) => {
  return c.json({
    examQuestion: await getExamQuestion(getDb(c.env.DB), c.req.param('id')),
  });
});

examQuestionsApp.patch('/:id', zValidator('json', updateExamQuestionSchema), async (c) => {
  const q = await updateExamQuestion(getDb(c.env.DB), c.req.param('id'), c.req.valid('json'));
  return c.json({ examQuestion: q });
});

examQuestionsApp.delete('/:id', async (c) => {
  await deleteExamQuestion(getDb(c.env.DB), c.req.param('id'));
  return c.json({ success: true });
});

export { examQuestionsApp };
