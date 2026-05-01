import type { MiddlewareHandler } from 'hono';
import type { Bindings } from '../env';
import { forbidden, unauthorized } from '../lib/errors';

type Variables = { userId: string };
type Role = 'admin' | 'student';

export function requireRole(role: Role): MiddlewareHandler<{
  Bindings: Bindings;
  Variables: Variables;
}> {
  return async (c, next) => {
    const userId = c.get('userId');
    if (!userId) throw unauthorized();

    const result = await c.env.DB.prepare('SELECT role FROM users WHERE id = ?')
      .bind(userId)
      .first<{ role: string }>();

    if (!result) throw unauthorized('User not found');
    if (result.role !== role) throw forbidden(`Requires ${role} role`);

    await next();
  };
}
