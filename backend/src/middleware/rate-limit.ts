import type { MiddlewareHandler } from 'hono';
import type { Bindings } from '../env';
import { kvGet, kvKeys, kvSet, TTL_15M } from '../lib/kv';
import { tooManyRequests } from '../lib/errors';

const MAX_ATTEMPTS = 5;

export function loginRateLimiter(): MiddlewareHandler<{ Bindings: Bindings }> {
  return async (c, next) => {
    const body = (await c.req.raw
      .clone()
      .json()
      .catch(() => ({}))) as Record<string, unknown>;
    const email = typeof body['email'] === 'string' ? body['email'].toLowerCase() : 'unknown';
    const ip = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? 'unknown';
    const key = kvKeys.loginRateLimit(ip, email);
    const raw = await kvGet(c.env.KV, key);
    const attempts = raw ? Number.parseInt(raw, 10) : 0;
    if (attempts >= MAX_ATTEMPTS) throw tooManyRequests();
    await next();
    if (c.res.status === 401) {
      await kvSet(c.env.KV, key, String(attempts + 1), TTL_15M);
    }
    if (c.res.status === 200) {
      await c.env.KV.delete(key);
    }
  };
}
