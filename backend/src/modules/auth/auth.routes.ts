import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { Bindings } from '../../env';
import { getDb } from '../../db/client';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@admin-study-catalyst/shared/validators';
import { unauthorized } from '../../lib/errors';
import { sendResetEmail } from '../../lib/email';
import { loginRateLimiter } from '../../middleware/rate-limit';
import {
  forgotPassword,
  login,
  logout,
  refresh,
  registerDirect,
  registerWithBookCode,
  resetPassword,
} from './auth.service';

const REFRESH_COOKIE = 'refresh_token';

const authRoutes = new Hono<{ Bindings: Bindings }>();

authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
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

  return c.json({ user }, 201);
});

authRoutes.post('/login', loginRateLimiter(), zValidator('json', loginSchema), async (c) => {
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

  return c.json({ accessToken });
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

  return c.json({ accessToken });
});

authRoutes.post('/logout', async (c) => {
  const token = getCookie(c, REFRESH_COOKIE);
  if (token) await logout(c.env.KV, token);
  deleteCookie(c, REFRESH_COOKIE, { path: '/' });
  return c.json({ success: true });
});

authRoutes.post('/forgot-password', zValidator('json', forgotPasswordSchema), async (c) => {
  const { email } = c.req.valid('json');
  const db = getDb(c.env.DB);
  await forgotPassword(db, email, (to, token) =>
    sendResetEmail(to, token, c.env.STUDENT_ORIGIN, c.env.RESEND_API_KEY),
  );
  return c.json({ message: 'If that email exists, a reset link has been sent.' });
});

authRoutes.post('/reset-password', zValidator('json', resetPasswordSchema), async (c) => {
  const input = c.req.valid('json');
  const db = getDb(c.env.DB);
  await resetPassword(db, input);
  return c.json({ message: 'Password reset successfully.' });
});

export { authRoutes };
