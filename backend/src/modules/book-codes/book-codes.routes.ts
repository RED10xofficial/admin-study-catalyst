import { Hono } from 'hono';
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
import { BOOK_CODE_MESSAGES } from '@admin-study-catalyst/shared/messages';
import { zValidate } from '../../lib/validated';
import { created, deleted, ok } from '../../lib/response';
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

bookCodesApp.get('/', zValidate('query', codeListSchema), async (c) => {
  return ok(
    c,
    { bookCodes: await listBookCodes(getDb(c.env.DB), c.req.valid('query')) },
    BOOK_CODE_MESSAGES.LISTED,
  );
});

bookCodesApp.get('/export', async (c) => {
  const downloadUrl = await exportCodesToR2(getDb(c.env.DB), c.env);
  return ok(c, { downloadUrl }, BOOK_CODE_MESSAGES.EXPORTED);
});

bookCodesApp.post('/', zValidate('json', generateCodeSchema), async (c) => {
  const { expiresAt } = c.req.valid('json');
  const bookCode = await generateSingleCode(getDb(c.env.DB), c.env.STUDENT_ORIGIN, expiresAt);
  return created(c, { bookCode }, BOOK_CODE_MESSAGES.CREATED);
});

bookCodesApp.post('/bulk', zValidate('json', bulkGenerateSchema), async (c) => {
  const { count, expiresAt } = c.req.valid('json');
  const result = await generateBulkCodes(getDb(c.env.DB), c.env.STUDENT_ORIGIN, count, expiresAt);
  return created(c, result, BOOK_CODE_MESSAGES.BULK_CREATED);
});

bookCodesApp.patch('/:id', zValidate('json', updateCodeSchema), async (c) => {
  const bookCode = await updateCodeStatus(
    getDb(c.env.DB),
    c.req.param('id'),
    c.req.valid('json').status,
  );
  return ok(c, { bookCode }, BOOK_CODE_MESSAGES.UPDATED);
});

bookCodesApp.delete('/:id', async (c) => {
  await deleteBookCode(getDb(c.env.DB), c.req.param('id'));
  return deleted(c, BOOK_CODE_MESSAGES.DELETED);
});

export { bookCodesApp };
