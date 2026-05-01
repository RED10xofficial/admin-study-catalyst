import { cors } from 'hono/cors';
import type { MiddlewareHandler } from 'hono';
import type { Bindings } from '../env';

export function corsMiddleware(): MiddlewareHandler<{ Bindings: Bindings }> {
  return async (c, next) => {
    const handler = cors({
      origin: (origin) => {
        const allowed = [c.env.ADMIN_ORIGIN, c.env.STUDENT_ORIGIN];
        return allowed.includes(origin) ? origin : null;
      },
      credentials: true,
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    });
    return handler(c, next);
  };
}
