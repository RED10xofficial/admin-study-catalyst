import type { Context } from 'hono';
import type { ApiResponse } from '@admin-study-catalyst/shared/types';

export function ok<T>(c: Context, data: T, message: string): Response {
  return c.json<ApiResponse<T>>(
    { status: 'success', code: 200, message, data, errors: null, meta: null, links: null },
    200,
  );
}

export function created<T>(c: Context, data: T, message: string): Response {
  return c.json<ApiResponse<T>>(
    { status: 'success', code: 201, message, data, errors: null, meta: null, links: null },
    201,
  );
}

export function deleted(c: Context, message: string): Response {
  return c.json<ApiResponse<null>>(
    { status: 'success', code: 200, message, data: null, errors: null, meta: null, links: null },
    200,
  );
}
