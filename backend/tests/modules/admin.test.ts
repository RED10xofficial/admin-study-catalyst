import { env, SELF } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';
import { beforeEach, describe, expect, it } from 'vitest';
import * as schema from '@admin-study-catalyst/shared/schema';
import { generateId, now } from '../../src/lib/id';

async function clearUsersAndRelated() {
  const db = drizzle(env.DB, { schema });
  await db.delete(schema.studentExamAnswers);
  await db.delete(schema.studentExams);
  await db.delete(schema.studentQuestionProgress);
  await db.delete(schema.questionStatistics);
  await db.delete(schema.examQuestions);
  await db.delete(schema.questions);
  await db.delete(schema.units);
  await db.delete(schema.examTypes);
  await db.delete(schema.users);
}

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
  return (await res.json<{ accessToken: string }>()).accessToken;
}

describe('Admin — Student Management', () => {
  beforeEach(clearUsersAndRelated);

  it('lists all students', async () => {
    const token = await getAdminToken();
    const res = await SELF.fetch('http://localhost/admin/students', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json<{ students: unknown[] }>();
    expect(Array.isArray(body.students)).toBe(true);
  });

  it('blocks admin from blocking themselves', async () => {
    const token = await getAdminToken();
    const res = await SELF.fetch('http://localhost/admin/students/admin-1', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ isActive: false }),
    });
    expect(res.status).toBe(403);
  });

  it('blocks a student and invalidates KV cache', async () => {
    const db = drizzle(env.DB, { schema });
    const { hashPassword } = await import('../../src/lib/hash');
    const studentId = generateId();
    await db.insert(schema.users).values({
      id: studentId,
      name: 'Target',
      email: 'target@test.com',
      passwordHash: await hashPassword('Target12!'),
      role: 'student',
      membershipType: 'normal',
      isActive: true,
      createdAt: now(),
      updatedAt: now(),
    });

    const token = await getAdminToken();
    const res = await SELF.fetch(`http://localhost/admin/students/${studentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ isActive: false }),
    });
    expect(res.status).toBe(200);

    const loginRes = await SELF.fetch('http://localhost/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'target@test.com', password: 'Target12!' }),
    });
    expect(loginRes.status).toBe(401);
  });
});
