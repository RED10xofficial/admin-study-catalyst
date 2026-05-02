import { Hono } from 'hono';
import type { Bindings } from '../../env';
import { authMiddleware } from '../../middleware/auth';
import { presignSchema } from '@admin-study-catalyst/shared/validators';
import { UPLOAD_MESSAGES } from '@admin-study-catalyst/shared/messages';
import { zValidate } from '../../lib/validated';
import { ok } from '../../lib/response';
import { createPresignedUpload } from './upload.service';
import type { UploadType } from '../../lib/r2';

const uploadApp = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string };
}>();

uploadApp.use('*', authMiddleware);

uploadApp.post('/presign', zValidate('json', presignSchema), async (c) => {
  const input = c.req.valid('json');
  const result = await createPresignedUpload(c.env, c.env.R2, {
    type: input.type as UploadType,
    filename: input.filename,
    mimeType: input.mimeType,
  });
  return ok(c, result, UPLOAD_MESSAGES.PRESIGNED);
});

export { uploadApp };
