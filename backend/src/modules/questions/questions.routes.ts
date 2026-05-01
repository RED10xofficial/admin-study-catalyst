import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { Bindings } from '../../env';
import { getDb } from '../../db/client';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import {
  createQuestionSchema,
  updateQuestionSchema,
  questionListSchema,
  reorderQuestionSchema,
} from '@admin-study-catalyst/shared/validators';
import {
  createQuestion,
  listQuestions,
  getQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
} from './questions.service';

const questionsApp = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string };
}>();

questionsApp.use('*', authMiddleware, requireRole('admin'));

questionsApp.get('/', zValidator('query', questionListSchema), async (c) => {
  const query = c.req.valid('query');
  return c.json({ questions: await listQuestions(getDb(c.env.DB), query) });
});

questionsApp.post('/', zValidator('json', createQuestionSchema), async (c) => {
  const q = await createQuestion(getDb(c.env.DB), c.env.R2, c.req.valid('json'));
  return c.json({ question: q }, 201);
});

questionsApp.patch('/reorder', zValidator('json', reorderQuestionSchema), async (c) => {
  await reorderQuestions(getDb(c.env.DB), c.req.valid('json').questions);
  return c.json({ success: true });
});

questionsApp.get('/:id', async (c) => {
  return c.json({
    question: await getQuestion(getDb(c.env.DB), c.req.param('id')),
  });
});

questionsApp.patch('/:id', zValidator('json', updateQuestionSchema), async (c) => {
  const q = await updateQuestion(getDb(c.env.DB), c.env.R2, c.req.param('id'), c.req.valid('json'));
  return c.json({ question: q });
});

questionsApp.delete('/:id', async (c) => {
  await deleteQuestion(getDb(c.env.DB), c.req.param('id'));
  return c.json({ success: true });
});

export { questionsApp };
