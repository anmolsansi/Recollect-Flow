import { Hono } from 'hono';
import { deleteCookie, setSignedCookie } from 'hono/cookie';
import { z } from 'zod';

import type { AppContext } from '../env';
import { constantTimeEqual, requireAdminToken } from '../shared/auth';
import { AppError } from '../shared/errors';

const loginSchema = z.object({ token: z.string() }).strict();

export function authRoutes() {
  const router = new Hono<AppContext>();

  router.get('/admin/session', requireAdminToken, async (context) =>
    context.json({
      data: { authenticated: true },
      meta: { request_id: context.get('requestId') || '' },
    }),
  );

  router.post('/admin/session', async (context) => {
    const body = await context.req.json().catch(() => ({}));
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      throw new AppError(422, 'VALIDATION_ERROR', 'Invalid payload');
    }

    const match = await constantTimeEqual(
      result.data.token,
      context.env.ADMIN_TOKEN,
    );
    if (!match) throw new AppError(401, 'UNAUTHORIZED', 'Invalid token');

    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);
    const secure = new URL(context.req.url).protocol === 'https:';

    await setSignedCookie(
      context,
      'admin_session',
      'authenticated',
      context.env.ADMIN_TOKEN,
      {
        path: '/',
        secure,
        httpOnly: true,
        sameSite: 'Strict',
        expires,
      },
    );

    return context.json({
      data: { authenticated: true },
      meta: { request_id: context.get('requestId') || '' },
    });
  });

  router.delete('/admin/session', async (context) => {
    deleteCookie(context, 'admin_session', { path: '/' });
    return context.json({
      data: { authenticated: false },
      meta: { request_id: context.get('requestId') || '' },
    });
  });

  return router;
}
