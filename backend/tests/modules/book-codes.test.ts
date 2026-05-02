import { describe, expect, it, beforeEach } from 'vitest';
import { env, SELF } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@admin-study-catalyst/shared/schema';
import { generateId, now } from '../../src/lib/id';

async function getAdminToken() {
  const db = drizzle(env.DB, { schema });
  const { hashPassword } = await import('../../src/lib/hash');
  await db
    .insert(schema.users)
    .values({
      id: 'admin-1',
      name: 'Admin',
      email: 'admin@test.com',
      passwordHash: await hashPassword('Admin123!'),
      role: 'admin',
      membershipType: 'normal',
      isActive: true,
      createdAt: now(),
      updatedAt: now(),
    })
    .onConflictDoNothing();
  const res = await SELF.fetch('http://localhost/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@test.com', password: 'Admin123!' }),
  });
  return (await res.json<{ data: { accessToken: string } }>()).data.accessToken;
}

describe('Book Codes', () => {
  let token: string;
  beforeEach(async () => {
    const db = drizzle(env.DB, { schema });
    await db.delete(schema.bookCodes);
    token = await getAdminToken();
  });

  it('generates a single book code', async () => {
    const res = await SELF.fetch('http://localhost/book-codes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(201);
    const body = await res.json<{
      data: { bookCode: { code: string; status: string } };
    }>();
    expect(body.data.bookCode.code).toMatch(/^[A-Z0-9]{12}$/);
    expect(body.data.bookCode.status).toBe('unused');
  });

  it('generates bulk codes (≤100)', async () => {
    const res = await SELF.fetch('http://localhost/book-codes/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ count: 5 }),
    });
    expect(res.status).toBe(201);
    const body = await res.json<{ data: { created: number } }>();
    expect(body.data.created).toBe(5);
  });

  it('blocks hard delete of a used code', async () => {
    const db = drizzle(env.DB, { schema });
    const codeId = generateId();
    await db.insert(schema.bookCodes).values({
      id: codeId,
      code: 'USEDCODE1234',
      qrUrl: 'http://test/activate?code=USEDCODE1234',
      status: 'used',
      usedByUserId: 'admin-1',
      usedAt: now(),
      createdAt: now(),
    });

    const res = await SELF.fetch(`http://localhost/book-codes/${codeId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(409);
  });

  it('blocks a code', async () => {
    const createRes = await SELF.fetch('http://localhost/book-codes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    const {
      data: { bookCode },
    } = await createRes.json<{ data: { bookCode: { id: string } } }>();

    const patchRes = await SELF.fetch(`http://localhost/book-codes/${bookCode.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: 'blocked' }),
    });
    expect(patchRes.status).toBe(200);
    const body = await patchRes.json<{ data: { bookCode: { status: string } } }>();
    expect(body.data.bookCode.status).toBe('blocked');
  });
});
