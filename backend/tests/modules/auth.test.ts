import { env, SELF } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';
import { describe, expect, it, beforeEach } from 'vitest';
import * as schema from '@admin-study-catalyst/shared/schema';
import { forgotPassword, login, resetPassword } from '../../src/modules/auth/auth.service';
import { getDb } from '../../src/db/client';

async function clearAuthTables() {
  const db = drizzle(env.DB, { schema });
  await db.delete(schema.passwordResetTokens);
  await db.delete(schema.bookCodes);
  await db.delete(schema.users);
}

describe('POST /auth/register', () => {
  beforeEach(clearAuthTables);

  it('registers a student with normal membership on direct signup', async () => {
    const res = await SELF.fetch('http://localhost/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice', email: 'alice@test.com', password: 'Alice123!' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json<{ data: { user: { role: string; membershipType: string } } }>();
    expect(body.data.user.role).toBe('student');
    expect(body.data.user.membershipType).toBe('normal');
  });

  it('returns 409 on duplicate email', async () => {
    const payload = { name: 'Bob', email: 'bob@test.com', password: 'Bob123!@' };
    await SELF.fetch('http://localhost/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const res = await SELF.fetch('http://localhost/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(409);
  });

  it('always assigns student role even if role:admin is sent', async () => {
    const res = await SELF.fetch('http://localhost/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hacker',
        email: 'hacker@test.com',
        password: 'Hack123!@',
        role: 'admin',
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json<{ data: { user: { role: string } } }>();
    expect(body.data.user.role).toBe('student');
  });
});

describe('POST /auth/login', () => {
  beforeEach(clearAuthTables);

  async function createStudent() {
    await SELF.fetch('http://localhost/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Eve', email: 'eve@test.com', password: 'Eve12345!' }),
    });
  }

  it('returns accessToken on valid credentials', async () => {
    await createStudent();
    const res = await SELF.fetch('http://localhost/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'eve@test.com', password: 'Eve12345!' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json<{ data: { accessToken: string } }>();
    expect(typeof body.data.accessToken).toBe('string');
    expect(res.headers.get('Set-Cookie')).toMatch(/refresh_token=/);
  });

  it('returns 401 for wrong password with generic message', async () => {
    await createStudent();
    const res = await SELF.fetch('http://localhost/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'eve@test.com', password: 'WrongPass1!' }),
    });
    expect(res.status).toBe(401);
    const body = await res.json<{ message: string }>();
    expect(body.message).toBe('Invalid email or password');
  });

  it('returns same 401 message for unknown email', async () => {
    const res = await SELF.fetch('http://localhost/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@test.com', password: 'Any12345!' }),
    });
    expect(res.status).toBe(401);
    const body = await res.json<{ message: string }>();
    expect(body.message).toBe('Invalid email or password');
  });
});

describe('POST /auth/forgot-password + /auth/reset-password', () => {
  beforeEach(clearAuthTables);

  it('always returns 200 regardless of email existence (no user enumeration)', async () => {
    const res = await SELF.fetch('http://localhost/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent@test.com' }),
    });
    expect(res.status).toBe(200);
  });

  it('resets password with valid token and rejects reuse', async () => {
    await SELF.fetch('http://localhost/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Frank', email: 'frank@test.com', password: 'Frank123!' }),
    });

    const db = getDb(env.DB);
    let rawToken = '';
    await forgotPassword(db, 'frank@test.com', async (_to, token) => {
      rawToken = token;
    });

    await resetPassword(db, { token: rawToken, password: 'Newfrank123!' });

    const loggedIn = await login(
      db,
      env.KV,
      {
        email: 'frank@test.com',
        password: 'Newfrank123!',
      },
      env.JWT_SECRET,
    );
    expect(loggedIn.accessToken).toBeTruthy();

    await expect(resetPassword(db, { token: rawToken, password: 'Another123!' })).rejects.toThrow();
  });
});

describe('GET /auth/me', () => {
  beforeEach(clearAuthTables);

  it('returns profile for an authenticated student', async () => {
    await SELF.fetch('http://localhost/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Meena', email: 'meena@test.com', password: 'Meena123!' }),
    });
    const loginRes = await SELF.fetch('http://localhost/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'meena@test.com', password: 'Meena123!' }),
    });
    const { data } = await loginRes.json<{ data: { accessToken: string } }>();

    const res = await SELF.fetch('http://localhost/auth/me', {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json<{
      data: {
        user: {
          id: string;
          name: string;
          email: string;
          role: string;
          membershipType: string;
        };
      };
    }>();
    expect(body.data.user.email).toBe('meena@test.com');
    expect(body.data.user.role).toBe('student');
    expect(body.data.user.membershipType).toBe('normal');
    expect((body.data.user as Record<string, unknown>).passwordHash).toBeUndefined();
    expect((body.data.user as Record<string, unknown>).isActive).toBeUndefined();
  });

  it('returns 401 when no token is provided', async () => {
    const res = await SELF.fetch('http://localhost/auth/me');
    expect(res.status).toBe(401);
  });
});
