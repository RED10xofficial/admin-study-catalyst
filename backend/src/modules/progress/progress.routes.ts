import { Hono } from 'hono';
import { getDb } from '../../db/client';
import type { Bindings } from '../../env';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { submitProgressSchema } from '@admin-study-catalyst/shared/validators';
import { PROGRESS_MESSAGES } from '@admin-study-catalyst/shared/messages';
import { zValidate } from '../../lib/validated';
import { created, ok } from '../../lib/response';
import { getUnitProgress, submitProgress } from './progress.service';

const progressApp = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string };
}>();

progressApp.use('*', authMiddleware, requireRole('student'));

progressApp.post('/', zValidate('json', submitProgressSchema), async (c) => {
  const result = await submitProgress(
    getDb(c.env.DB),
    c.env.KV,
    c.get('userId'),
    c.req.valid('json'),
  );
  return created(c, result, PROGRESS_MESSAGES.SUBMITTED);
});

progressApp.get('/unit/:unitId', async (c) => {
  const progress = await getUnitProgress(getDb(c.env.DB), c.get('userId'), c.req.param('unitId'));
  return ok(c, { progress }, PROGRESS_MESSAGES.RETRIEVED);
});

export { progressApp };
