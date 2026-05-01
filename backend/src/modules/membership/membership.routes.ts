import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getDb } from '../../db/client';
import type { Bindings } from '../../env';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { upgradeWithBookCode } from './membership.service';

const membershipApp = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string };
}>();

membershipApp.use('*', authMiddleware, requireRole('student'));

membershipApp.post(
  '/upgrade',
  zValidator('json', z.object({ bookCode: z.string().length(12).toUpperCase() })),
  async (c) => {
    const { bookCode } = c.req.valid('json');
    const result = await upgradeWithBookCode(getDb(c.env.DB), c.env.KV, c.get('userId'), bookCode);
    return c.json(result);
  },
);

export { membershipApp };
