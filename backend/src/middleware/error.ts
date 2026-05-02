import type { ErrorHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { Bindings } from '../env';
import type { ApiResponse } from '@admin-study-catalyst/shared/types';
import { COMMON_MESSAGES } from '@admin-study-catalyst/shared/messages';
import { HttpError } from '../lib/errors';

export const errorHandler: ErrorHandler<{ Bindings: Bindings }> = (err, c) => {
  if (err instanceof HttpError) {
    return c.json<ApiResponse<null>>(
      {
        status: 'error',
        code: err.status,
        message: err.message,
        data: null,
        errors: null,
        meta: null,
        links: null,
      },
      err.status as ContentfulStatusCode,
    );
  }
  console.error(err);
  return c.json<ApiResponse<null>>(
    {
      status: 'error',
      code: 500,
      message: COMMON_MESSAGES.INTERNAL_ERROR,
      data: null,
      errors: null,
      meta: null,
      links: null,
    },
    500,
  );
};
