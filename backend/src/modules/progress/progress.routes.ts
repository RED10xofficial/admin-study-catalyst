import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { getDb } from '../../db/client';
import type { Bindings } from '../../env';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { submitProgressSchema } from '@admin-study-catalyst/shared/validators';
import { getUnitProgress, submitProgress } from './progress.service';

const progressApp = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string };
}>();

progressApp.use('*', authMiddleware, requireRole('student'));

progressApp.post('/', zValidator('json', submitProgressSchema), async (c) => {
  const result = await submitProgress(
    getDb(c.env.DB),
    c.env.KV,
    c.get('userId'),
    c.req.valid('json'),
  );
  return c.json(result, 201);
});

progressApp.get('/unit/:unitId', async (c) => {
  const progress = await getUnitProgress(getDb(c.env.DB), c.get('userId'), c.req.param('unitId'));
  return c.json({ progress });
});

export { progressApp };
