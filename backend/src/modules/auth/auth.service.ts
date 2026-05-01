import { and, eq } from 'drizzle-orm';
import type { KVNamespace } from '@cloudflare/workers-types';
import { bookCodes, passwordResetTokens, users } from '@admin-study-catalyst/shared/schema';
import type { Db } from '../../db/client';
import { badRequest, conflict, unauthorized } from '../../lib/errors';
import { hashPassword, verifyPassword } from '../../lib/hash';
import { generateId, now } from '../../lib/id';
import { generateRefreshToken, signAccessToken } from '../../lib/jwt';
import { kvDel, kvGet, kvKeys, kvSet, TTL_7D } from '../../lib/kv';

export async function registerDirect(
  db: Db,
  input: { name: string; email: string; phone?: string; password: string },
) {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email.toLowerCase()))
    .get();
  if (existing) throw conflict('Email already registered');

  const passwordHash = await hashPassword(input.password);
  const userId = generateId();
  const ts = now();

  const [user] = await db
    .insert(users)
    .values({
      id: userId,
      name: input.name,
      email: input.email.toLowerCase(),
      phone: input.phone,
      passwordHash,
      role: 'student',
      membershipType: 'normal',
      membershipSource: 'direct_registration',
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    })
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      membershipType: users.membershipType,
    });

  return user;
}

export async function registerWithBookCode(
  db: Db,
  input: { name: string; email: string; phone?: string; password: string; bookCode: string },
) {
  const normalizedCode = input.bookCode.toUpperCase();

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email.toLowerCase()))
    .get();
  if (existing) throw conflict('Email already registered');

  const code = await db.select().from(bookCodes).where(eq(bookCodes.code, normalizedCode)).get();

  if (!code) throw badRequest('Invalid book code', 'INVALID_CODE');
  if (code.status !== 'unused')
    throw badRequest('Book code already used or invalid', 'CODE_UNAVAILABLE');
  if (code.expiresAt && new Date(code.expiresAt) < new Date()) {
    throw badRequest('Book code has expired', 'CODE_EXPIRED');
  }

  const passwordHash = await hashPassword(input.password);
  const userId = generateId();
  const ts = now();

  await db.batch([
    db.insert(users).values({
      id: userId,
      name: input.name,
      email: input.email.toLowerCase(),
      phone: input.phone,
      passwordHash,
      role: 'student',
      membershipType: 'premium',
      membershipSource: 'book_qr',
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    }),
    db
      .update(bookCodes)
      .set({ status: 'used', usedByUserId: userId, usedAt: ts })
      .where(eq(bookCodes.code, normalizedCode)),
  ]);

  const user = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      membershipType: users.membershipType,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!user) throw badRequest('Registration failed', 'REGISTRATION_FAILED');

  return user;
}

export async function login(
  db: Db,
  kv: KVNamespace,
  input: { email: string; password: string },
  jwtSecret: string,
) {
  const GENERIC_ERROR = 'Invalid email or password';

  const user = await db
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.email, input.email.toLowerCase()))
    .get();

  if (!user) throw unauthorized(GENERIC_ERROR);
  if (!user.isActive) throw unauthorized(GENERIC_ERROR);

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) throw unauthorized(GENERIC_ERROR);

  const accessToken = await signAccessToken(user.id, jwtSecret);
  const refreshToken = generateRefreshToken();

  await kvSet(kv, kvKeys.refreshToken(refreshToken), user.id, TTL_7D);

  return { accessToken, refreshToken };
}

export async function refresh(
  kv: KVNamespace,
  refreshToken: string,
  jwtSecret: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const userId = await kvGet(kv, kvKeys.refreshToken(refreshToken));
  if (!userId) throw unauthorized('Invalid or expired refresh token');

  await kvDel(kv, kvKeys.refreshToken(refreshToken));
  const newRefreshToken = generateRefreshToken();
  const accessToken = await signAccessToken(userId, jwtSecret);
  await kvSet(kv, kvKeys.refreshToken(newRefreshToken), userId, TTL_7D);

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(kv: KVNamespace, refreshToken: string): Promise<void> {
  await kvDel(kv, kvKeys.refreshToken(refreshToken));
}

async function hashToken(token: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

export async function forgotPassword(
  db: Db,
  email: string,
  sendEmail: (to: string, token: string) => Promise<void>,
): Promise<void> {
  const user = await db
    .select({ id: users.id, email: users.email, isActive: users.isActive })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .get();

  if (!user?.isActive) return;

  const rawToken = generateRefreshToken();
  const tokenHash = await hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  await db.insert(passwordResetTokens).values({
    id: generateId(),
    userId: user.id,
    tokenHash,
    expiresAt,
    consumed: false,
    createdAt: now(),
  });

  await sendEmail(user.email, rawToken);
}

export async function resetPassword(
  db: Db,
  input: { token: string; password: string },
): Promise<void> {
  const tokenHash = await hashToken(input.token);

  const tokenRow = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(eq(passwordResetTokens.tokenHash, tokenHash), eq(passwordResetTokens.consumed, false)),
    )
    .get();

  if (!tokenRow) throw badRequest('Invalid or expired reset token', 'INVALID_RESET_TOKEN');
  if (new Date(tokenRow.expiresAt) < new Date()) {
    throw badRequest('Reset token has expired', 'EXPIRED_RESET_TOKEN');
  }

  const passwordHash = await hashPassword(input.password);
  const ts = now();

  await db.batch([
    db.update(users).set({ passwordHash, updatedAt: ts }).where(eq(users.id, tokenRow.userId)),
    db
      .update(passwordResetTokens)
      .set({ consumed: true })
      .where(eq(passwordResetTokens.id, tokenRow.id)),
  ]);
}
