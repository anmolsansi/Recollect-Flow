import type { Context } from 'hono';

export class AppError extends Error {
  constructor(
    public readonly status: 400 | 401 | 403 | 404 | 409 | 413 | 422 | 500 | 503,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export function errorResponse(context: Context, error: unknown) {
  const requestId = context.get('requestId') as string;

  if (error instanceof AppError) {
    return context.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.fields ? { fields: error.fields } : {}),
        },
        meta: { request_id: requestId },
      },
      error.status,
    );
  }

  // Upstream Error objects can carry credentials, private text or full URLs.
  // Log only the stable code and request identifier, never the thrown value.
  console.error(
    JSON.stringify({
      event: 'http_unhandled_error',
      request_id: requestId,
      code: 'INTERNAL_ERROR',
    }),
  );
  return context.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'The request could not be completed.',
      },
      meta: { request_id: requestId },
    },
    500,
  );
}
