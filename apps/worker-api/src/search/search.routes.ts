import { Hono } from 'hono';
import type { AppContext } from '../env';
import { requireAdminToken } from '../shared/auth';
import { searchSchema, searchResponseSchema } from './search.schema';
import { executeSearch } from './search.service';
import { AppError } from '../shared/errors';

export function searchRoutes() {
  const router = new Hono<AppContext>();

  router.get('/search', requireAdminToken, async (context) => {
    // Parse query string safely
    const query = context.req.query();
    const result = searchSchema.safeParse(query);

    if (!result.success) {
      const fields: Record<string, string> = {};
      for (const err of result.error.errors) {
        if (err.path.length > 0) {
          fields[err.path.join('.')] = err.message;
        }
      }
      throw new AppError(
        422,
        'VALIDATION_ERROR',
        'Invalid search parameters',
        fields,
      );
    }

    const searchResponse = await executeSearch(context.env.DB, result.data);

    const payload = {
      data: searchResponse.data,
      meta: {
        ...searchResponse.meta,
        request_id: context.get('requestId') || '',
      },
    };

    const validatedPayload = searchResponseSchema.parse(payload);
    return context.json(validatedPayload);
  });

  return router;
}
