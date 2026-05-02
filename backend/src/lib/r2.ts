import { AwsClient } from 'aws4fetch';
import type { R2Bucket } from '@cloudflare/workers-types';
import { badRequest } from './errors';

export type UploadType = 'unit-image' | 'question-audio';

const ALLOWED_MIME: Record<UploadType, string[]> = {
  'unit-image': ['image/jpeg', 'image/png', 'image/webp'],
  'question-audio': ['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav'],
};

export type R2PresignConfig = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
};

export function isAllowedMime(type: UploadType, mimeType: string): boolean {
  return ALLOWED_MIME[type].includes(mimeType);
}

export function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replaceAll(/[^a-z0-9.-]/g, '-')
    .slice(0, 100);
}

import { nanoid } from 'nanoid';

export function buildR2Key(type: UploadType, filename: string): string {
  const safe = sanitizeFilename(filename);
  return `${type}/${nanoid()}/${safe}`;
}

export async function objectExists(r2: R2Bucket, key: string): Promise<boolean> {
  const obj = await r2.head(key);
  return obj !== null;
}

export async function deleteObject(r2: R2Bucket, key: string): Promise<void> {
  await r2.delete(key);
}

function encodeR2Path(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

export async function presignR2Put(
  cfg: R2PresignConfig,
  objectKey: string,
  expiresIn: number,
): Promise<string> {
  const client = new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    service: 's3',
    region: 'auto',
  });
  const path = encodeR2Path(objectKey);
  const url = `https://${cfg.accountId}.r2.cloudflarestorage.com/${cfg.bucketName}/${path}?X-Amz-Expires=${expiresIn}`;
  const signed = await client.sign(new Request(url, { method: 'PUT' }), {
    aws: { signQuery: true },
  });
  return signed.url;
}

export async function presignR2Get(
  cfg: R2PresignConfig,
  objectKey: string,
  expiresIn: number,
): Promise<string> {
  const client = new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    service: 's3',
    region: 'auto',
  });
  const path = encodeR2Path(objectKey);
  const url = `https://${cfg.accountId}.r2.cloudflarestorage.com/${cfg.bucketName}/${path}?X-Amz-Expires=${expiresIn}`;
  const signed = await client.sign(new Request(url, { method: 'GET' }), {
    aws: { signQuery: true },
  });
  return signed.url;
}

function matchesMagic(bytes: Uint8Array, expectedMime: string): boolean {
  switch (expectedMime) {
    case 'image/jpeg':
      return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case 'image/png':
      return (
        bytes.length >= 8 &&
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47 &&
        bytes[4] === 0x0d &&
        bytes[5] === 0x0a &&
        bytes[6] === 0x1a &&
        bytes[7] === 0x0a
      );
    case 'image/webp': {
      if (bytes.length < 12) return false;
      const riff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
      const webp =
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
      return riff && webp;
    }
    case 'audio/mpeg':
      if (bytes.length < 3) return false;
      if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return true;
      return bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33; // ID3
    case 'audio/mp4':
    case 'video/mp4':
      if (bytes.length < 12) return false;
      return bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;
    case 'audio/ogg':
      return (
        bytes.length >= 4 &&
        bytes[0] === 0x4f &&
        bytes[1] === 0x67 &&
        bytes[2] === 0x67 &&
        bytes[3] === 0x53
      );
    case 'audio/wav': {
      if (bytes.length < 12) return false;
      const wavRiff =
        bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
      const wave =
        bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45;
      return wavRiff && wave;
    }
    default:
      return true;
  }
}

export async function validateMimeFromBytes(
  r2: R2Bucket,
  key: string,
  expectedMime: string,
): Promise<void> {
  const object = await r2.get(key, { range: { offset: 0, length: 32 } });
  if (!object) {
    throw badRequest('R2 object not found', 'INVALID_OBJECT_KEY');
  }
  const bytes = new Uint8Array(await object.arrayBuffer());
  if (!matchesMagic(bytes, expectedMime)) {
    await r2.delete(key).catch(() => {});
    throw badRequest(
      `File content does not match declared MIME type ${expectedMime}`,
      'MIME_MISMATCH',
    );
  }
}

export function getR2PresignConfig(env: {
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET_NAME: string;
}): R2PresignConfig | null {
  if (
    !env.R2_ACCOUNT_ID?.trim() ||
    !env.R2_ACCESS_KEY_ID?.trim() ||
    !env.R2_SECRET_ACCESS_KEY?.trim()
  ) {
    return null;
  }
  return {
    accountId: env.R2_ACCOUNT_ID.trim(),
    accessKeyId: env.R2_ACCESS_KEY_ID.trim(),
    secretAccessKey: env.R2_SECRET_ACCESS_KEY.trim(),
    bucketName: env.R2_BUCKET_NAME || 'admin-study-catalyst-assets',
  };
}
