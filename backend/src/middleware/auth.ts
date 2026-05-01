import type { MiddlewareHandler } from 'hono';
import type { Bindings } from '../env';
import { verifyAccessToken } from '../lib/jwt';
import { kvGet, kvKeys, kvSet, TTL_30S } from '../lib/kv';
import { unauthorized } from '../lib/errors';

type Variables = { userId: string };

export const authMiddleware: MiddlewareHandler<{
  Bindings: Bindings;
  Variables: Variables;
}> = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) throw unauthorized();
  const token = authHeader.slice(7);
  let payload: { sub: string };
  try {
    payload = await verifyAccessToken(token, c.env.JWT_SECRET);
  } catch {
    throw unauthorized('Invalid or expired token');
  }
  const userId = payload.sub;

  let isActive = await kvGet(c.env.KV, kvKeys.userActive(userId));
  if (isActive === null) {
    const result = await c.env.DB.prepare('SELECT is_active FROM users WHERE id = ?')
      .bind(userId)
      .first<{ is_active: number }>();
    if (!result) throw unauthorized('User not found');
    isActive = result.is_active ? '1' : '0';
    await kvSet(c.env.KV, kvKeys.userActive(userId), isActive, TTL_30S);
  }
  if (isActive === '0') throw unauthorized('Account is disabled');

  c.set('userId', userId);
  await next();
};
