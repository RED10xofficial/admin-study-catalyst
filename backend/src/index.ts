import { Hono } from 'hono';
import { swaggerUI } from '@hono/swagger-ui';
import type { Bindings } from './env';
import { markAbandonedExams } from './cron/abandoned-exams';
import { openApiDocument } from './docs/openapi';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/error';
import { adminApp } from './modules/admin/admin.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { bookCodesApp } from './modules/book-codes/book-codes.routes';
import { contentApp } from './modules/content/content.routes';
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
app.route('/student/progress', progressApp);
app.route('/student/exams', examsApp);
app.route('/student/membership', membershipApp);
app.route('/student', contentApp);
app.route('/upload', uploadApp);
app.route('/admin/exam-types', examTypesApp);
app.route('/admin/units', unitsApp);
app.route('/admin/questions', questionsApp);
app.route('/admin/exam-questions', examQuestionsApp);
app.route('/admin/book-codes', bookCodesApp);
app.route('/admin', adminApp);

app.onError(errorHandler);
app.notFound((c) => c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404));

export default {
  fetch: app.fetch,
  scheduled: async (_event: ScheduledEvent, env: Bindings, _ctx: ExecutionContext) => {
    await markAbandonedExams(env);
  },
};
