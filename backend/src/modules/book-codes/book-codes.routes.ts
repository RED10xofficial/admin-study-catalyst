import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { Bindings } from '../../env';
import { getDb } from '../../db/client';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import {
  generateCodeSchema,
  bulkGenerateSchema,
  updateCodeSchema,
  codeListSchema,
} from '@admin-study-catalyst/shared/validators';
import {
  generateSingleCode,
  generateBulkCodes,
  listBookCodes,
  updateCodeStatus,
  deleteBookCode,
  exportCodesToR2,
} from './book-codes.service';

const bookCodesApp = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string };
}>();

bookCodesApp.use('*', authMiddleware, requireRole('admin'));

bookCodesApp.get('/', zValidator('query', codeListSchema), async (c) => {
  return c.json({
    bookCodes: await listBookCodes(getDb(c.env.DB), c.req.valid('query')),
  });
});

bookCodesApp.get('/export', async (c) => {
  const url = await exportCodesToR2(getDb(c.env.DB), c.env);
  return c.json({ downloadUrl: url });
});

bookCodesApp.post('/', zValidator('json', generateCodeSchema), async (c) => {
  const { expiresAt } = c.req.valid('json');
  const bookCode = await generateSingleCode(getDb(c.env.DB), c.env.STUDENT_ORIGIN, expiresAt);
  return c.json({ bookCode }, 201);
});

bookCodesApp.post('/bulk', zValidator('json', bulkGenerateSchema), async (c) => {
  const { count, expiresAt } = c.req.valid('json');
  const result = await generateBulkCodes(getDb(c.env.DB), c.env.STUDENT_ORIGIN, count, expiresAt);
  return c.json(result, 201);
});

bookCodesApp.patch('/:id', zValidator('json', updateCodeSchema), async (c) => {
  const bookCode = await updateCodeStatus(
    getDb(c.env.DB),
    c.req.param('id'),
    c.req.valid('json').status,
  );
  return c.json({ bookCode });
});

bookCodesApp.delete('/:id', async (c) => {
  await deleteBookCode(getDb(c.env.DB), c.req.param('id'));
  return c.json({ success: true });
});

export { bookCodesApp };
