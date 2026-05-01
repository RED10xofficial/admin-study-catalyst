import type { KVNamespace } from '@cloudflare/workers-types';

const TTL_30S = 60; // KV `expirationTtl` minimum is 60 in Miniflare / production KV
const TTL_15M = 900;
const TTL_7D = 604_800;

export const kvKeys = {
  userActive: (userId: string) => `user:active:${userId}`,
  userMembership: (userId: string) => `user:membership:${userId}`,
  loginRateLimit: (ip: string, email: string) => `ratelimit:login:${ip}:${email}`,
  refreshToken: (token: string) => `refresh:${token}`,
  passwordReset: (tokenHash: string) => `pwreset:${tokenHash}`,
} as const;

export async function kvGet(kv: KVNamespace, key: string): Promise<string | null> {
  return kv.get(key);
}

export async function kvSet(
  kv: KVNamespace,
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<void> {
  await kv.put(key, value, { expirationTtl: ttlSeconds });
}

export async function kvDel(kv: KVNamespace, key: string): Promise<void> {
  await kv.delete(key);
}

export async function invalidateUserCache(kv: KVNamespace, userId: string): Promise<void> {
  await Promise.all([
    kvDel(kv, kvKeys.userActive(userId)),
    kvDel(kv, kvKeys.userMembership(userId)),
  ]);
}

export { TTL_30S, TTL_15M, TTL_7D };
