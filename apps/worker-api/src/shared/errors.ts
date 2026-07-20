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

  console.error(JSON.stringify({ request_id: requestId, error }));
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
