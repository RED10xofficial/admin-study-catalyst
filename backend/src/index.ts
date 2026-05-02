import { Hono } from 'hono';
import { swaggerUI } from '@hono/swagger-ui';
import type { Bindings } from './env';
import type { ApiResponse } from '@admin-study-catalyst/shared/types';
import { COMMON_MESSAGES } from '@admin-study-catalyst/shared/messages';
import { markAbandonedExams } from './cron/abandoned-exams';
import { openApiDocument } from './docs/openapi';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/error';
import { adminApp } from './modules/admin/admin.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { bookCodesApp } from './modules/book-codes/book-codes.routes';
import { examQuestionsApp } from './modules/exam-questions/exam-questions.routes';
import { examTypesApp } from './modules/exam-types/exam-types.routes';
import { examsApp } from './modules/exams/exams.routes';
import { membershipApp } from './modules/membership/membership.routes';
import { questionsApp } from './modules/questions/questions.routes';
import { unitsApp } from './modules/units/units.routes';
import { uploadApp } from './modules/upload/upload.routes';
import { progressApp } from './modules/progress/progress.routes';

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', corsMiddleware());
app.get('/openapi.json', (c) => c.json(openApiDocument));
app.get('/docs', swaggerUI({ url: '/openapi.json' }));
app.get('/health', (c) => c.json({ status: 'ok', ts: new Date().toISOString() }));
app.route('/auth', authRoutes);
app.route('/progress', progressApp);
app.route('/exams', examsApp);
app.route('/membership', membershipApp);
app.route('/upload', uploadApp);
app.route('/exam-types', examTypesApp);
app.route('/units', unitsApp);
app.route('/questions', questionsApp);
app.route('/exam-questions', examQuestionsApp);
app.route('/book-codes', bookCodesApp);
app.route('/', adminApp);

app.onError(errorHandler);
app.notFound((c) =>
  c.json<ApiResponse<null>>(
    {
      status: 'error',
      code: 404,
      message: COMMON_MESSAGES.NOT_FOUND,
      data: null,
      errors: null,
      meta: null,
      links: null,
    },
    404,
  ),
);

export default {
  fetch: app.fetch,
  scheduled: async (_event: ScheduledEvent, env: Bindings, _ctx: ExecutionContext) => {
    await markAbandonedExams(env);
  },
};
