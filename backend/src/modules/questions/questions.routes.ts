import { Hono } from 'hono';
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
import { QUESTION_MESSAGES } from '@admin-study-catalyst/shared/messages';
import { zValidate } from '../../lib/validated';
import { created, deleted, ok } from '../../lib/response';
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

questionsApp.get('/', zValidate('query', questionListSchema), async (c) => {
  return ok(
    c,
    { questions: await listQuestions(getDb(c.env.DB), c.req.valid('query')) },
    QUESTION_MESSAGES.LISTED,
  );
});

questionsApp.post('/', zValidate('json', createQuestionSchema), async (c) => {
  const question = await createQuestion(getDb(c.env.DB), c.env.R2, c.req.valid('json'));
  return created(c, { question }, QUESTION_MESSAGES.CREATED);
});

questionsApp.patch('/reorder', zValidate('json', reorderQuestionSchema), async (c) => {
  await reorderQuestions(getDb(c.env.DB), c.req.valid('json').questions);
  return ok(c, null, QUESTION_MESSAGES.REORDERED);
});

questionsApp.get('/:id', async (c) => {
  const question = await getQuestion(getDb(c.env.DB), c.req.param('id'));
  return ok(c, { question }, QUESTION_MESSAGES.RETRIEVED);
});

questionsApp.patch('/:id', zValidate('json', updateQuestionSchema), async (c) => {
  const question = await updateQuestion(
    getDb(c.env.DB),
    c.env.R2,
    c.req.param('id'),
    c.req.valid('json'),
  );
  return ok(c, { question }, QUESTION_MESSAGES.UPDATED);
});

questionsApp.delete('/:id', async (c) => {
  await deleteQuestion(getDb(c.env.DB), c.req.param('id'));
  return deleted(c, QUESTION_MESSAGES.DELETED);
});

export { questionsApp };
