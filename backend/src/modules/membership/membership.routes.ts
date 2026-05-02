import { Hono } from 'hono';
import { z } from 'zod';
import { getDb } from '../../db/client';
import type { Bindings } from '../../env';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { MEMBERSHIP_MESSAGES } from '@admin-study-catalyst/shared/messages';
import { zValidate } from '../../lib/validated';
import { ok } from '../../lib/response';
import { upgradeWithBookCode } from './membership.service';

const membershipApp = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string };
}>();

membershipApp.use('*', authMiddleware, requireRole('student'));

membershipApp.post(
  '/upgrade',
  zValidate('json', z.object({ bookCode: z.string().length(12).toUpperCase() })),
  async (c) => {
    const { bookCode } = c.req.valid('json');
    const result = await upgradeWithBookCode(getDb(c.env.DB), c.env.KV, c.get('userId'), bookCode);
    return ok(c, result, MEMBERSHIP_MESSAGES.UPGRADED);
  },
);

export { membershipApp };
