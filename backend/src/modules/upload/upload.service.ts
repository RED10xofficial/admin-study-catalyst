import type { R2Bucket } from '@cloudflare/workers-types';
import type { Bindings } from '../../env';
import type { UploadType } from '../../lib/r2';
import { buildR2Key, getR2PresignConfig, isAllowedMime, presignR2Put } from '../../lib/r2';
import { badRequest } from '../../lib/errors';

export async function createPresignedUpload(
  env: Bindings,
  r2: R2Bucket,
  input: { type: UploadType; filename: string; mimeType: string },
): Promise<{ uploadUrl: string; key: string }> {
  if (!isAllowedMime(input.type, input.mimeType)) {
    throw badRequest(
      `MIME type ${input.mimeType} is not allowed for ${input.type}`,
      'INVALID_MIME',
    );
  }

  const cfg = getR2PresignConfig(env);
  if (!cfg) {
    throw badRequest(
      'R2 presign is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.',
      'R2_PRESIGN_CONFIG',
    );
  }

  const key = buildR2Key(input.type, input.filename);
  const uploadUrl = await presignR2Put(cfg, key, 600);
  return { uploadUrl, key };
}
