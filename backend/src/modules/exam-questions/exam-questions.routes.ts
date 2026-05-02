import { Hono } from 'hono';
import type { Bindings } from '../../env';
import { getDb } from '../../db/client';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import {
  createExamQuestionSchema,
  updateExamQuestionSchema,
  examQuestionListSchema,
} from '@admin-study-catalyst/shared/validators';
import { EXAM_QUESTION_MESSAGES } from '@admin-study-catalyst/shared/messages';
import { zValidate } from '../../lib/validated';
import { created, deleted, ok } from '../../lib/response';
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

examQuestionsApp.get('/', zValidate('query', examQuestionListSchema), async (c) => {
  return ok(
    c,
    { examQuestions: await listExamQuestions(getDb(c.env.DB), c.req.valid('query')) },
    EXAM_QUESTION_MESSAGES.LISTED,
  );
});

examQuestionsApp.post('/', zValidate('json', createExamQuestionSchema), async (c) => {
  const examQuestion = await createExamQuestion(getDb(c.env.DB), c.req.valid('json'));
  return created(c, { examQuestion }, EXAM_QUESTION_MESSAGES.CREATED);
});

examQuestionsApp.get('/:id', async (c) => {
  const examQuestion = await getExamQuestion(getDb(c.env.DB), c.req.param('id'));
  return ok(c, { examQuestion }, EXAM_QUESTION_MESSAGES.RETRIEVED);
});

examQuestionsApp.patch('/:id', zValidate('json', updateExamQuestionSchema), async (c) => {
  const examQuestion = await updateExamQuestion(
    getDb(c.env.DB),
    c.req.param('id'),
    c.req.valid('json'),
  );
  return ok(c, { examQuestion }, EXAM_QUESTION_MESSAGES.UPDATED);
});

examQuestionsApp.delete('/:id', async (c) => {
  await deleteExamQuestion(getDb(c.env.DB), c.req.param('id'));
  return deleted(c, EXAM_QUESTION_MESSAGES.DELETED);
});

export { examQuestionsApp };
