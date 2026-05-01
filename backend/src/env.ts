export type Bindings = {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  JWT_SECRET: string;
  ADMIN_ORIGIN: string;
  STUDENT_ORIGIN: string;
  SEED_ADMIN_EMAIL: string;
  SEED_ADMIN_PASSWORD: string;
  RESEND_API_KEY: string;
  /** S3-compatible API credentials for R2 presigned URLs (PutObject / GetObject). */
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET_NAME: string;
};
