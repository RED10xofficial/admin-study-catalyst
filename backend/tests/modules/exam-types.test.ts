import { describe, expect, it, beforeEach } from 'vitest';
import { env, SELF } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@admin-study-catalyst/shared/schema';

async function getAdminToken(): Promise<string> {
  const db = drizzle(env.DB, { schema });
  const { hashPassword } = await import('../../src/lib/hash');
  const { generateId, now } = await import('../../src/lib/id');
  await db
    .insert(schema.users)
    .values({
      id: generateId(),
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
  const body = await res.json<{ accessToken: string }>();
  return body.accessToken;
}

async function clearExamTypes() {
  const db = drizzle(env.DB, { schema });
  await db.delete(schema.studentQuestionProgress);
  await db.delete(schema.questions);
  await db.delete(schema.units);
  await db.delete(schema.examTypes);
}

describe('Exam Types', () => {
  let token: string;
  beforeEach(async () => {
    await clearExamTypes();
    token = await getAdminToken();
  });

  it('creates an exam type', async () => {
    const res = await SELF.fetch('http://localhost/admin/exam-types', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ examName: 'EMREE 2026', examQuestionCount: 20 }),
    });
    expect(res.status).toBe(201);
    const body = await res.json<{ examType: { examName: string } }>();
    expect(body.examType.examName).toBe('EMREE 2026');
  });

  it('returns 409 on duplicate name', async () => {
    const payload = { examName: 'EMREE', examQuestionCount: 10 };
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    await SELF.fetch('http://localhost/admin/exam-types', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const res = await SELF.fetch('http://localhost/admin/exam-types', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(409);
  });

  it('blocks delete when units are linked', async () => {
    const res = await SELF.fetch('http://localhost/admin/exam-types', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ examName: 'Linked', examQuestionCount: 5 }),
    });
    const { examType } = await res.json<{ examType: { id: string } }>();

    const db = drizzle(env.DB, { schema });
    const { generateId, now } = await import('../../src/lib/id');
    await db.insert(schema.units).values({
      id: generateId(),
      unitName: 'Unit 1',
      examTypeId: examType.id,
      accessType: 'free',
      isDeleted: false,
      createdAt: now(),
      updatedAt: now(),
    });

    const delRes = await SELF.fetch(`http://localhost/admin/exam-types/${examType.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(delRes.status).toBe(409);
  });

  it('returns 403 for student trying to access admin route', async () => {
    const email = `s-${crypto.randomUUID()}@test.com`;
    const regRes = await SELF.fetch('http://localhost/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Student',
        email,
        password: 'Stu12345!',
      }),
    });
    expect(regRes.status).toBe(201);
    const loginRes = await SELF.fetch('http://localhost/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'Stu12345!' }),
    });
    expect(loginRes.status).toBe(200);
    const { accessToken } = await loginRes.json<{ accessToken: string }>();
    const res = await SELF.fetch('http://localhost/admin/exam-types', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ examName: 'Hack', examQuestionCount: 5 }),
    });
    expect(res.status).toBe(403);
  });
});
