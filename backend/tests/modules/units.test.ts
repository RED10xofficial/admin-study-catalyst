import { describe, expect, it, beforeEach } from 'vitest';
import { env, SELF } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@admin-study-catalyst/shared/schema';
import { generateId, now } from '../../src/lib/id';

async function getAdminToken(): Promise<string> {
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

async function createExamType(token: string): Promise<string> {
  const res = await SELF.fetch('http://localhost/exam-types', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ examName: 'Test Exam', examQuestionCount: 5 }),
  });
  return (await res.json<{ data: { examType: { id: string } } }>()).data.examType.id;
}

describe('Units', () => {
  let token: string;
  let examTypeId: string;

  beforeEach(async () => {
    const db = drizzle(env.DB, { schema });
    await db.delete(schema.units);
    await db.delete(schema.examTypes);
    token = await getAdminToken();
    examTypeId = await createExamType(token);
  });

  it('creates a unit', async () => {
    const res = await SELF.fetch('http://localhost/units', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        unitName: 'Anatomy 101',
        examTypeId,
        accessType: 'free',
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json<{ data: { unit: { unitName: string } } }>();
    expect(body.data.unit.unitName).toBe('Anatomy 101');
  });

  it('soft-deletes a unit', async () => {
    const createRes = await SELF.fetch('http://localhost/units', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        unitName: 'To Delete',
        examTypeId,
        accessType: 'free',
      }),
    });
    const {
      data: { unit },
    } = await createRes.json<{ data: { unit: { id: string } } }>();

    const delRes = await SELF.fetch(`http://localhost/units/${unit.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(delRes.status).toBe(200);

    const listRes = await SELF.fetch('http://localhost/units', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const {
      data: { units },
    } = await listRes.json<{ data: { units: { id: string }[] } }>();
    expect(units.find((u) => u.id === unit.id)).toBeUndefined();
  });

  it('blocks delete when student progress exists', async () => {
    const db = drizzle(env.DB, { schema });
    const createRes = await SELF.fetch('http://localhost/units', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        unitName: 'Busy Unit',
        examTypeId,
        accessType: 'free',
      }),
    });
    const {
      data: { unit },
    } = await createRes.json<{ data: { unit: { id: string } } }>();

    const qId = generateId();
    await db.insert(schema.questions).values({
      id: qId,
      question: 'Q?',
      option1: 'A',
      option2: 'B',
      option3: 'C',
      option4: 'D',
      correctAnswer: 'A',
      unitId: unit.id,
      accessType: 'free',
      sequenceOrder: 0,
      isDeleted: false,
      createdAt: now(),
    });
    await db.insert(schema.studentQuestionProgress).values({
      id: generateId(),
      studentId: 'admin-1',
      questionId: qId,
      status: 'answered',
      answeredAt: now(),
    });

    const delRes = await SELF.fetch(`http://localhost/units/${unit.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(delRes.status).toBe(409);
  });

  it('blocks delete when unit has non-deleted questions (even without student progress)', async () => {
    const db = drizzle(env.DB, { schema });
    const createRes = await SELF.fetch('http://localhost/units', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        unitName: 'Has Questions',
        examTypeId,
        accessType: 'free',
      }),
    });
    const {
      data: { unit },
    } = await createRes.json<{ data: { unit: { id: string } } }>();
    await db.insert(schema.questions).values({
      id: generateId(),
      question: 'Q?',
      option1: 'A',
      option2: 'B',
      option3: 'C',
      option4: 'D',
      correctAnswer: 'A',
      unitId: unit.id,
      accessType: 'free',
      sequenceOrder: 0,
      isDeleted: false,
      createdAt: now(),
    });
    const delRes = await SELF.fetch(`http://localhost/units/${unit.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(delRes.status).toBe(409);
  });
});
