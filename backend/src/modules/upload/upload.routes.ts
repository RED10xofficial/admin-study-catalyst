import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { Bindings } from '../../env';
import { authMiddleware } from '../../middleware/auth';
import { presignSchema } from '@admin-study-catalyst/shared/validators';
import { createPresignedUpload } from './upload.service';
import type { UploadType } from '../../lib/r2';

const uploadApp = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string };
}>();

uploadApp.use('*', authMiddleware);

uploadApp.post('/presign', zValidator('json', presignSchema), async (c) => {
  const input = c.req.valid('json');
  const result = await createPresignedUpload(c.env, c.env.R2, {
    type: input.type as UploadType,
    filename: input.filename,
    mimeType: input.mimeType,
  });
  return c.json(result);
});

export { uploadApp };
