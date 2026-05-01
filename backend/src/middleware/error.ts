import type { ErrorHandler } from 'hono';
import type { Bindings } from '../env';
import { HttpError } from '../lib/errors';

export const errorHandler: ErrorHandler<{ Bindings: Bindings }> = (err, c) => {
  if (err instanceof HttpError) {
    return c.json({ error: err.message, code: err.code ?? 'ERROR' }, err.status);
  }
  console.error(err);
  return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
};
