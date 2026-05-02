import { zValidator } from '@hono/zod-validator';
import type { ZodSchema } from 'zod';
import type { ValidationTargets } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { COMMON_MESSAGES } from '@admin-study-catalyst/shared/messages';
import type { ApiError, ApiResponse } from '@admin-study-catalyst/shared/types';

export function zValidate<T extends ZodSchema>(target: keyof ValidationTargets, schema: T) {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      const errors: ApiError[] = result.error.errors.map((e) => {
        const fieldPath = e.path.map(String).join('.');
        return fieldPath
          ? { field: fieldPath, message: e.message, code: e.code }
          : { message: e.message, code: e.code };
      });
      return c.json<ApiResponse<null>>(
        {
          status: 'error',
          code: 400,
          message: COMMON_MESSAGES.VALIDATION_FAILED,
          data: null,
          errors,
          meta: null,
          links: null,
        },
        400 as ContentfulStatusCode,
      );
    }
  });
}
