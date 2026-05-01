import { describe, expect, it, beforeEach } from 'vitest';
import { env, SELF } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@admin-study-catalyst/shared/schema';
import { generateId, now } from '../../src/lib/id';

const ET_ID = '00000000-0000-4000-8000-000000000001';
const UNIT_ID = '00000000-0000-4000-8000-000000000002';

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
  const res = await SELF.fetch('http://localhost/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@test.com', password: 'Admin123!' }),
  });
  return (await res.json<{ accessToken: string }>()).accessToken;
}

describe('Exam Questions', () => {
  let token: string;
  beforeEach(async () => {
    const db = drizzle(env.DB, { schema });
    await db.delete(schema.studentExamAnswers);
    await db.delete(schema.studentExams);
    await db.delete(schema.examQuestions);
    token = await getAdminToken();
  });

  const baseQ = {
    question: 'What is the patella?',
    option1: 'Kneecap',
    option2: 'Elbow',
    option3: 'Shoulder',
    option4: 'Hip',
    correctAnswer: 'Kneecap',
    difficulty: 'easy' as const,
    unitId: UNIT_ID,
  };

  it('creates an exam question', async () => {
    const res = await SELF.fetch('http://localhost/admin/exam-questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(baseQ),
    });
    expect(res.status).toBe(201);
  });

  it('filters by difficulty', async () => {
    await SELF.fetch('http://localhost/admin/exam-questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(baseQ),
    });
    await SELF.fetch('http://localhost/admin/exam-questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...baseQ,
        question: 'Hard Q?',
        difficulty: 'hard',
      }),
    });

    const res = await SELF.fetch(
      'http://localhost/admin/exam-questions?difficulty=hard&unitId=' + encodeURIComponent(UNIT_ID),
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const body = await res.json<{ examQuestions: unknown[] }>();
    expect(body.examQuestions).toHaveLength(1);
  });

  it('blocks delete if question is in active exam', async () => {
    const db = drizzle(env.DB, { schema });
    const qId = generateId();
    await db.insert(schema.examQuestions).values({
      id: qId,
      ...baseQ,
      isDeleted: false,
      createdAt: now(),
    });
    const examId = generateId();
    await db.insert(schema.studentExams).values({
      id: examId,
      studentId: 'admin-1',
      unitId: UNIT_ID,
      difficulty: 'easy',
      totalQuestions: 1,
      status: 'active',
      startedAt: now(),
    });
    await db.insert(schema.studentExamAnswers).values({
      id: generateId(),
      examId,
      questionId: qId,
      isCorrect: false,
      answeredAt: now(),
    });

    const res = await SELF.fetch(`http://localhost/admin/exam-questions/${qId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(409);
  });
});
