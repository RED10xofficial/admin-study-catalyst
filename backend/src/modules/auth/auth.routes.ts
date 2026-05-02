import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { Bindings } from '../../env';
import { authMiddleware } from '../../middleware/auth';
import { getDb } from '../../db/client';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@admin-study-catalyst/shared/validators';
import { AUTH_MESSAGES } from '@admin-study-catalyst/shared/messages';
import { unauthorized } from '../../lib/errors';
import { sendResetEmail } from '../../lib/email';
import { loginRateLimiter } from '../../middleware/rate-limit';
import { zValidate } from '../../lib/validated';
import { created, deleted, ok } from '../../lib/response';
import {
  forgotPassword,
  login,
  logout,
  refresh,
  registerDirect,
  registerWithBookCode,
  resetPassword,
  getMe,
} from './auth.service';

const REFRESH_COOKIE = 'refresh_token';

const authRoutes = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string };
}>();

authRoutes.post('/register', zValidate('json', registerSchema), async (c) => {
  const input = c.req.valid('json');
  const db = getDb(c.env.DB);

  const user = input.bookCode
    ? await registerWithBookCode(db, {
        name: input.name,
        email: input.email,
        phone: input.phone,
        password: input.password,
        bookCode: input.bookCode,
      })
    : await registerDirect(db, {
        name: input.name,
        email: input.email,
        phone: input.phone,
        password: input.password,
      });

  return created(c, { user }, AUTH_MESSAGES.REGISTERED);
});

authRoutes.post('/login', loginRateLimiter(), zValidate('json', loginSchema), async (c) => {
  const input = c.req.valid('json');
  const db = getDb(c.env.DB);
  const { accessToken, refreshToken } = await login(db, c.env.KV, input, c.env.JWT_SECRET);

  setCookie(c, REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return ok(c, { accessToken }, AUTH_MESSAGES.LOGGED_IN);
});

authRoutes.post('/refresh', async (c) => {
  const token = getCookie(c, REFRESH_COOKIE);
  if (!token) throw unauthorized('No refresh token');
  const { accessToken, refreshToken } = await refresh(c.env.KV, token, c.env.JWT_SECRET);

  setCookie(c, REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return ok(c, { accessToken }, AUTH_MESSAGES.REFRESHED);
});

authRoutes.post('/logout', async (c) => {
  const token = getCookie(c, REFRESH_COOKIE);
  if (token) await logout(c.env.KV, token);
  deleteCookie(c, REFRESH_COOKIE, { path: '/' });
  return deleted(c, AUTH_MESSAGES.LOGGED_OUT);
});

authRoutes.post('/forgot-password', zValidate('json', forgotPasswordSchema), async (c) => {
  const { email } = c.req.valid('json');
  const db = getDb(c.env.DB);
  await forgotPassword(db, email, (to, token) =>
    sendResetEmail(to, token, c.env.STUDENT_ORIGIN, c.env.RESEND_API_KEY),
  );
  return ok(c, null, AUTH_MESSAGES.FORGOT_PASSWORD);
});

authRoutes.post('/reset-password', zValidate('json', resetPasswordSchema), async (c) => {
  const input = c.req.valid('json');
  const db = getDb(c.env.DB);
  await resetPassword(db, input);
  return ok(c, null, AUTH_MESSAGES.PASSWORD_RESET);
});

authRoutes.get('/me', authMiddleware, async (c) => {
  const user = await getMe(getDb(c.env.DB), c.get('userId'));
  return ok(c, { user }, AUTH_MESSAGES.ME);
});

export { authRoutes };
