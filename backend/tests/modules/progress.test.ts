import { env, SELF } from 'cloudflare:test';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { beforeEach, describe, expect, it } from 'vitest';
import * as schema from '@admin-study-catalyst/shared/schema';
import { generateId, now } from '../../src/lib/id';

async function setupStudentAndQuestion() {
  const db = drizzle(env.DB, { schema });
  const { hashPassword } = await import('../../src/lib/hash');

  const studentId = generateId();
  await db
    .insert(schema.users)
    .values({
      id: studentId,
      name: 'Student',
      email: 'student@test.com',
      passwordHash: await hashPassword('Stu12345!'),
      role: 'student',
      membershipType: 'normal',
      isActive: true,
      createdAt: now(),
      updatedAt: now(),
    })
    .onConflictDoNothing();

  await db
    .insert(schema.examTypes)
    .values({
      id: 'et-1',
      examName: 'EMREE',
      examQuestionCount: 5,
      createdAt: now(),
      updatedAt: now(),
    })
    .onConflictDoNothing();

  await db
    .insert(schema.units)
    .values({
      id: 'unit-1',
      unitName: 'Anatomy',
      examTypeId: 'et-1',
      accessType: 'free',
      isDeleted: false,
      createdAt: now(),
      updatedAt: now(),
    })
    .onConflictDoNothing();

  const q1Id = generateId();
  await db
    .insert(schema.questions)
    .values({
      id: q1Id,
      question: 'Q1',
      option1: 'A',
      option2: 'B',
      option3: 'C',
      option4: 'D',
      correctAnswer: 'A',
      unitId: 'unit-1',
      accessType: 'free',
      sequenceOrder: 0,
      isDeleted: false,
      createdAt: now(),
    })
    .onConflictDoNothing();

  const q2Id = generateId();
  await db
    .insert(schema.questions)
    .values({
      id: q2Id,
      question: 'Q2',
      option1: 'A',
      option2: 'B',
      option3: 'C',
      option4: 'D',
      correctAnswer: 'B',
      unitId: 'unit-1',
      accessType: 'free',
      sequenceOrder: 1,
      isDeleted: false,
      createdAt: now(),
    })
    .onConflictDoNothing();

  const loginRes = await SELF.fetch('http://localhost/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@test.com', password: 'Stu12345!' }),
  });
  const { accessToken } = await loginRes.json<{ accessToken: string }>();

  return { studentId, q1Id, q2Id, token: accessToken };
}

describe('Learning Progress', () => {
  beforeEach(async () => {
    const db = drizzle(env.DB, { schema });
    await db.delete(schema.studentQuestionProgress);
  });

  it('records progress for the first question in a unit', async () => {
    const { q1Id, token } = await setupStudentAndQuestion();
    const res = await SELF.fetch('http://localhost/student/progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ questionId: q1Id, answer: 'A' }),
    });
    expect(res.status).toBe(201);
  });

  it('is idempotent — submitting same answer twice returns 200 not 500', async () => {
    const { q1Id, token } = await setupStudentAndQuestion();
    const payload = { questionId: q1Id, answer: 'A' };
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    await SELF.fetch('http://localhost/student/progress', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const res = await SELF.fetch('http://localhost/student/progress', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(201);
  });

  it('blocks access to question 2 before question 1 is answered', async () => {
    const { q2Id, token } = await setupStudentAndQuestion();
    const res = await SELF.fetch('http://localhost/student/progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ questionId: q2Id, answer: 'B' }),
    });
    expect(res.status).toBe(422);
  });

  it('allows question 2 after question 1 is answered', async () => {
    const { q1Id, q2Id, token } = await setupStudentAndQuestion();
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    await SELF.fetch('http://localhost/student/progress', {
      method: 'POST',
      headers,
      body: JSON.stringify({ questionId: q1Id, answer: 'A' }),
    });
    const res = await SELF.fetch('http://localhost/student/progress', {
      method: 'POST',
      headers,
      body: JSON.stringify({ questionId: q2Id, answer: 'B' }),
    });
    expect(res.status).toBe(201);
  });

  it('blocks normal-membership student from answering a premium question', async () => {
    const db = drizzle(env.DB, { schema });
    const { q1Id, token } = await setupStudentAndQuestion();

    await db
      .update(schema.questions)
      .set({ accessType: 'premium' })
      .where(eq(schema.questions.id, q1Id));

    const res = await SELF.fetch('http://localhost/student/progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ questionId: q1Id, answer: 'A' }),
    });
    expect(res.status).toBe(403);
  });
});
