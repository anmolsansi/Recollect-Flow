import { Hono } from 'hono';
import { setSignedCookie, deleteCookie } from 'hono/cookie';
import type { AppContext } from '../env';
import { AppError } from '../shared/errors';
import { z } from 'zod';
import { constantTimeEqual } from '../shared/auth';

const loginSchema = z.object({
  token: z.string(),
});

export function authRoutes() {
  const router = new Hono<AppContext>();

  router.post('/admin/session', async (context) => {
    const body = await context.req.json().catch(() => ({}));
    const result = loginSchema.safeParse(body);
    if (!result.success)
      throw new AppError(422, 'VALIDATION_ERROR', 'Invalid payload');

    const match = await constantTimeEqual(
      result.data.token,
      context.env.ADMIN_TOKEN,
    );
    if (!match) throw new AppError(401, 'UNAUTHORIZED', 'Invalid token');

    const secret = context.env.ADMIN_TOKEN;
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours

    await setSignedCookie(context, 'admin_session', 'authenticated', secret, {
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'Strict',
      expires,
    });

    return context.json({ success: true });
  });

  router.delete('/admin/session', async (context) => {
    deleteCookie(context, 'admin_session', { path: '/' });
    return context.json({ success: true });
  });

  return router;
}
