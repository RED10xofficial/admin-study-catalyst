import { describe, expect, it, beforeEach } from 'vitest';
import { env, SELF } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@admin-study-catalyst/shared/schema';
import { generateId, now } from '../../src/lib/id';

const ET_ID = '00000000-0000-4000-8000-000000000001';
const UNIT_ID = '00000000-0000-4000-8000-000000000002';

async function setup() {
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

  await db
    .insert(schema.examTypes)
    .values({
      id: ET_ID,
      examName: 'EMREE',
      tags: '[]',
      examQuestionCount: 5,
      createdAt: now(),
      updatedAt: now(),
    })
    .onConflictDoNothing();

  await db
    .insert(schema.units)
    .values({
      id: UNIT_ID,
      unitName: 'Anatomy',
      examTypeId: ET_ID,
      accessType: 'free',
      isDeleted: false,
      createdAt: now(),
      updatedAt: now(),
    })
    .onConflictDoNothing();

  const loginRes = await SELF.fetch('http://localhost/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@test.com', password: 'Admin123!' }),
  });
  return (await loginRes.json<{ accessToken: string }>()).accessToken;
}

describe('Learning Questions', () => {
  let token: string;
  beforeEach(async () => {
    const db = drizzle(env.DB, { schema });
    await db.delete(schema.studentQuestionProgress);
    await db.delete(schema.questions);
    token = await setup();
  });

  const baseQuestion = {
    question: 'What is the femur?',
    option1: 'A bone',
    option2: 'A muscle',
    option3: 'A nerve',
    option4: 'An organ',
    correctAnswer: 'A bone',
    unitId: UNIT_ID,
    accessType: 'free',
    sequenceOrder: 0,
  };

  it('creates a learning question', async () => {
    const res = await SELF.fetch('http://localhost/admin/questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(baseQuestion),
    });
    expect(res.status).toBe(201);
    const body = await res.json<{ question: { question: string } }>();
    expect(body.question.question).toBe('What is the femur?');
  });

  it('rejects if correctAnswer does not match any option', async () => {
    const res = await SELF.fetch('http://localhost/admin/questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...baseQuestion, correctAnswer: 'Not an option' }),
    });
    expect(res.status).toBe(400);
  });

  it('blocks delete when student progress exists', async () => {
    const db = drizzle(env.DB, { schema });
    const createRes = await SELF.fetch('http://localhost/admin/questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(baseQuestion),
    });
    const { question } = await createRes.json<{ question: { id: string } }>();

    await db.insert(schema.studentQuestionProgress).values({
      id: generateId(),
      studentId: 'admin-1',
      questionId: question.id,
      status: 'answered',
      answeredAt: now(),
    });

    const delRes = await SELF.fetch(`http://localhost/admin/questions/${question.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(delRes.status).toBe(409);
  });
});
