export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function badRequest(message: string, code?: string): HttpError {
  return new HttpError(400, message, code);
}

export function unauthorized(message = 'Unauthorized'): HttpError {
  return new HttpError(401, message, 'UNAUTHORIZED');
}

export function forbidden(message = 'Forbidden'): HttpError {
  return new HttpError(403, message, 'FORBIDDEN');
}

export function notFound(message = 'Not found'): HttpError {
  return new HttpError(404, message, 'NOT_FOUND');
}

export function conflict(message: string, code?: string): HttpError {
  return new HttpError(409, message, code);
}

export function unprocessable(message: string, code?: string): HttpError {
  return new HttpError(422, message, code);
}

export function tooManyRequests(message = 'Too many requests'): HttpError {
  return new HttpError(429, message, 'RATE_LIMITED');
}
