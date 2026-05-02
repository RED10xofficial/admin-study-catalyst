import { env, SELF } from 'cloudflare:test';
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as schema from '@admin-study-catalyst/shared/schema';
import { generateId, now } from '../../src/lib/id';

const TEST_EXAM_TYPE_ID = 'a0000000-0000-4000-8000-000000000001';
const TEST_UNIT_ID = 'b0000000-0000-4000-8000-000000000002';

async function resetExamFixtures() {
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

async function setupPremiumStudentWithCompletedUnit() {
  const db = drizzle(env.DB, { schema });
  const { hashPassword } = await import('../../src/lib/hash');

  const studentId = generateId();
  await db.insert(schema.users).values({
    id: studentId,
    name: 'Premium',
    email: 'premium@test.com',
    passwordHash: await hashPassword('Premium1!'),
    role: 'student',
    membershipType: 'premium',
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
  });

  await db.insert(schema.examTypes).values({
    id: TEST_EXAM_TYPE_ID,
    examName: 'EMREE',
    examQuestionCount: 2,
    createdAt: now(),
    updatedAt: now(),
  });
  await db.insert(schema.units).values({
    id: TEST_UNIT_ID,
    unitName: 'Anatomy',
    examTypeId: TEST_EXAM_TYPE_ID,
    accessType: 'free',
    isDeleted: false,
    createdAt: now(),
    updatedAt: now(),
  });

  const lqId = generateId();
  await db.insert(schema.questions).values({
    id: lqId,
    question: 'LQ',
    option1: 'A',
    option2: 'B',
    option3: 'C',
    option4: 'D',
    correctAnswer: 'A',
    unitId: TEST_UNIT_ID,
    accessType: 'free',
    sequenceOrder: 0,
    isDeleted: false,
    createdAt: now(),
  });
  await db.insert(schema.studentQuestionProgress).values({
    id: generateId(),
    studentId,
    questionId: lqId,
    status: 'answered',
    answeredAt: now(),
  });

  for (let i = 0; i < 3; i++) {
    await db.insert(schema.examQuestions).values({
      id: generateId(),
      question: `EQ${i}`,
      option1: 'A',
      option2: 'B',
      option3: 'C',
      option4: 'D',
      correctAnswer: 'A',
      difficulty: 'easy',
      unitId: TEST_UNIT_ID,
      isDeleted: false,
      createdAt: now(),
    });
  }

  const loginRes = await SELF.fetch('http://localhost/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'premium@test.com', password: 'Premium1!' }),
  });
  const {
    data: { accessToken },
  } = await loginRes.json<{ data: { accessToken: string } }>();
  return { studentId, token: accessToken };
}

describe('Exam System — Creation', () => {
  beforeEach(resetExamFixtures);
  afterEach(resetExamFixtures);

  it('creates an exam for a premium student who has completed the unit', async () => {
    const { token } = await setupPremiumStudentWithCompletedUnit();
    const res = await SELF.fetch('http://localhost/exams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ unitId: TEST_UNIT_ID, difficulty: 'easy' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json<{
      data: { exam: { status: string; totalQuestions: number } };
    }>();
    expect(body.data.exam.status).toBe('active');
    expect(body.data.exam.totalQuestions).toBe(2);
  });

  it('blocks exam creation for normal-membership student', async () => {
    const db = drizzle(env.DB, { schema });
    const { hashPassword } = await import('../../src/lib/hash');

    await db.insert(schema.examTypes).values({
      id: TEST_EXAM_TYPE_ID,
      examName: 'EMREE',
      examQuestionCount: 2,
      createdAt: now(),
      updatedAt: now(),
    });
    await db.insert(schema.units).values({
      id: TEST_UNIT_ID,
      unitName: 'Anatomy',
      examTypeId: TEST_EXAM_TYPE_ID,
      accessType: 'free',
      isDeleted: false,
      createdAt: now(),
      updatedAt: now(),
    });

    await db.insert(schema.users).values({
      id: generateId(),
      name: 'Normal',
      email: 'normal@test.com',
      passwordHash: await hashPassword('Normal12!'),
      role: 'student',
      membershipType: 'normal',
      isActive: true,
      createdAt: now(),
      updatedAt: now(),
    });
    const loginRes = await SELF.fetch('http://localhost/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'normal@test.com', password: 'Normal12!' }),
    });
    const {
      data: { accessToken },
    } = await loginRes.json<{ data: { accessToken: string } }>();
    const res = await SELF.fetch('http://localhost/exams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ unitId: TEST_UNIT_ID, difficulty: 'easy' }),
    });
    expect(res.status).toBe(403);
  });

  it('blocks exam creation if unit learning is not complete', async () => {
    const db = drizzle(env.DB, { schema });
    const { hashPassword } = await import('../../src/lib/hash');

    await db.insert(schema.examTypes).values({
      id: TEST_EXAM_TYPE_ID,
      examName: 'EMREE',
      examQuestionCount: 2,
      createdAt: now(),
      updatedAt: now(),
    });
    await db.insert(schema.units).values({
      id: TEST_UNIT_ID,
      unitName: 'Anatomy',
      examTypeId: TEST_EXAM_TYPE_ID,
      accessType: 'free',
      isDeleted: false,
      createdAt: now(),
      updatedAt: now(),
    });
    const lqId = generateId();
    await db.insert(schema.questions).values({
      id: lqId,
      question: 'LQ',
      option1: 'A',
      option2: 'B',
      option3: 'C',
      option4: 'D',
      correctAnswer: 'A',
      unitId: TEST_UNIT_ID,
      accessType: 'free',
      sequenceOrder: 0,
      isDeleted: false,
      createdAt: now(),
    });

    await db.insert(schema.users).values({
      id: generateId(),
      name: 'NoProg',
      email: 'noprog@test.com',
      passwordHash: await hashPassword('NoProg12!'),
      role: 'student',
      membershipType: 'premium',
      isActive: true,
      createdAt: now(),
      updatedAt: now(),
    });
    const loginRes = await SELF.fetch('http://localhost/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'noprog@test.com', password: 'NoProg12!' }),
    });
    const {
      data: { accessToken },
    } = await loginRes.json<{ data: { accessToken: string } }>();
    const res = await SELF.fetch('http://localhost/exams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ unitId: TEST_UNIT_ID, difficulty: 'easy' }),
    });
    expect(res.status).toBe(422);
  });

  it('blocks retake if exam record already exists', async () => {
    const { token } = await setupPremiumStudentWithCompletedUnit();
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    const body = JSON.stringify({ unitId: TEST_UNIT_ID, difficulty: 'easy' });
    await SELF.fetch('http://localhost/exams', {
      method: 'POST',
      headers,
      body,
    });
    const res = await SELF.fetch('http://localhost/exams', {
      method: 'POST',
      headers,
      body,
    });
    expect(res.status).toBe(409);
  });
});

describe('Exam System — Submission', () => {
  beforeEach(resetExamFixtures);
  afterEach(resetExamFixtures);

  it('submits an exam, calculates score, and updates analytics', async () => {
    const { token } = await setupPremiumStudentWithCompletedUnit();
    const db = drizzle(env.DB, { schema });

    const createRes = await SELF.fetch('http://localhost/exams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ unitId: TEST_UNIT_ID, difficulty: 'easy' }),
    });
    const {
      data: { exam },
    } = await createRes.json<{ data: { exam: { id: string } } }>();

    const answers = await db
      .select({ questionId: schema.studentExamAnswers.questionId })
      .from(schema.studentExamAnswers)
      .where(eq(schema.studentExamAnswers.examId, exam.id));

    const submitRes = await SELF.fetch(`http://localhost/exams/${exam.id}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        answers: answers.map((a) => ({
          questionId: a.questionId,
          selectedAnswer: 'A',
        })),
      }),
    });
    expect(submitRes.status).toBe(200);
    const body = await submitRes.json<{
      data: { exam: { score: number; status: string } };
    }>();
    expect(body.data.exam.status).toBe('submitted');
    expect(body.data.exam.score).toBe(100);

    const stats = await db.select().from(schema.questionStatistics);
    expect(stats.length).toBeGreaterThan(0);
    expect(stats[0]?.totalAttempts).toBe(1);
    expect(stats[0]?.correctAttempts).toBe(1);
  });

  it('blocks double submission', async () => {
    const { token } = await setupPremiumStudentWithCompletedUnit();
    const db = drizzle(env.DB, { schema });

    const createRes = await SELF.fetch('http://localhost/exams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ unitId: TEST_UNIT_ID, difficulty: 'easy' }),
    });
    const {
      data: { exam },
    } = await createRes.json<{ data: { exam: { id: string } } }>();

    const answers = await db
      .select({ questionId: schema.studentExamAnswers.questionId })
      .from(schema.studentExamAnswers)
      .where(eq(schema.studentExamAnswers.examId, exam.id));

    const payload = JSON.stringify({
      answers: answers.map((a) => ({
        questionId: a.questionId,
        selectedAnswer: 'A',
      })),
    });
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    await SELF.fetch(`http://localhost/exams/${exam.id}/submit`, {
      method: 'POST',
      headers,
      body: payload,
    });
    const res = await SELF.fetch(`http://localhost/exams/${exam.id}/submit`, {
      method: 'POST',
      headers,
      body: payload,
    });
    expect(res.status).toBe(409);
  });

  it('rejects answers for question IDs not in the exam', async () => {
    const { token } = await setupPremiumStudentWithCompletedUnit();
    const createRes = await SELF.fetch('http://localhost/exams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ unitId: TEST_UNIT_ID, difficulty: 'easy' }),
    });
    const {
      data: { exam },
    } = await createRes.json<{ data: { exam: { id: string } } }>();

    const res = await SELF.fetch(`http://localhost/exams/${exam.id}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        answers: [
          {
            questionId: '00000000-0000-0000-0000-000000000000',
            selectedAnswer: 'A',
          },
        ],
      }),
    });
    expect(res.status).toBe(422);
  });

  it('recalculates difficulty after submission based on accuracy', async () => {
    const { token } = await setupPremiumStudentWithCompletedUnit();
    const db = drizzle(env.DB, { schema });

    const createRes = await SELF.fetch('http://localhost/exams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ unitId: TEST_UNIT_ID, difficulty: 'easy' }),
    });
    const {
      data: { exam },
    } = await createRes.json<{ data: { exam: { id: string } } }>();
    const assignedAnswers = await db
      .select({ questionId: schema.studentExamAnswers.questionId })
      .from(schema.studentExamAnswers)
      .where(eq(schema.studentExamAnswers.examId, exam.id));

    await SELF.fetch(`http://localhost/exams/${exam.id}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        answers: assignedAnswers.map((a) => ({
          questionId: a.questionId,
          selectedAnswer: 'D',
        })),
      }),
    });

    const assignedIds = assignedAnswers.map((a) => a.questionId);
    const updatedQs = await db
      .select({ difficulty: schema.examQuestions.difficulty })
      .from(schema.examQuestions)
      .where(inArray(schema.examQuestions.id, assignedIds));

    expect(updatedQs.length).toBe(assignedIds.length);
    expect(updatedQs.every((q) => q.difficulty === 'hard')).toBe(true);
  });
});

describe('GET /exams — list student exams', () => {
  beforeEach(resetExamFixtures);

  it('returns an empty list when the student has no exams', async () => {
    const { token } = await setupPremiumStudentWithCompletedUnit();
    const res = await SELF.fetch('http://localhost/exams', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json<{ data: { exams: unknown[] } }>();
    expect(Array.isArray(body.data.exams)).toBe(true);
    expect(body.data.exams).toHaveLength(0);
  });

  it('returns created exams for the student, most recent first', async () => {
    const { token } = await setupPremiumStudentWithCompletedUnit();

    await SELF.fetch('http://localhost/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ unitId: TEST_UNIT_ID, difficulty: 'easy' }),
    });

    const res = await SELF.fetch('http://localhost/exams', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json<{ data: { exams: { status: string }[] } }>();
    expect(body.data.exams).toHaveLength(1);
    expect(body.data.exams[0]?.status).toBe('active');
  });

  it('returns 401 without a token', async () => {
    const res = await SELF.fetch('http://localhost/exams');
    expect(res.status).toBe(401);
  });
});

describe('GET /exams/:id/questions — exam paper', () => {
  beforeEach(resetExamFixtures);

  it('returns questions with options but no correctAnswer for an active exam', async () => {
    const { token } = await setupPremiumStudentWithCompletedUnit();

    const createRes = await SELF.fetch('http://localhost/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ unitId: TEST_UNIT_ID, difficulty: 'easy' }),
    });
    const { data: createData } = await createRes.json<{ data: { exam: { id: string } } }>();

    const res = await SELF.fetch(`http://localhost/exams/${createData.exam.id}/questions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json<{
      data: {
        questions: {
          id: string;
          question: string;
          option1: string;
          option2: string;
          option3: string;
          option4: string;
          selectedAnswer: string | null;
          isCorrect: boolean;
        }[];
      };
    }>();
    expect(body.data.questions.length).toBeGreaterThan(0);
    for (const q of body.data.questions) {
      expect((q as Record<string, unknown>).correctAnswer).toBeUndefined();
      expect(q.selectedAnswer).toBeNull();
    }
  });

  it('includes selectedAnswer and isCorrect after submission', async () => {
    const { token } = await setupPremiumStudentWithCompletedUnit();
    const db = drizzle(env.DB, { schema });

    const createRes = await SELF.fetch('http://localhost/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ unitId: TEST_UNIT_ID, difficulty: 'easy' }),
    });
    const { data: createData } = await createRes.json<{ data: { exam: { id: string } } }>();

    const assigned = await db
      .select({ questionId: schema.studentExamAnswers.questionId })
      .from(schema.studentExamAnswers)
      .where(eq(schema.studentExamAnswers.examId, createData.exam.id));

    await SELF.fetch(`http://localhost/exams/${createData.exam.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        answers: assigned.map((a) => ({ questionId: a.questionId, selectedAnswer: 'A' })),
      }),
    });

    const res = await SELF.fetch(`http://localhost/exams/${createData.exam.id}/questions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json<{
      data: { questions: { selectedAnswer: string | null; isCorrect: boolean }[] };
    }>();
    for (const q of body.data.questions) {
      expect(q.selectedAnswer).toBe('A');
      expect((q as Record<string, unknown>).correctAnswer).toBeUndefined();
    }
  });

  it('returns 404 when exam belongs to a different student', async () => {
    const { token } = await setupPremiumStudentWithCompletedUnit();
    const db = drizzle(env.DB, { schema });
    const { hashPassword } = await import('../../src/lib/hash');

    const createRes = await SELF.fetch('http://localhost/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ unitId: TEST_UNIT_ID, difficulty: 'easy' }),
    });
    const { data: createData } = await createRes.json<{ data: { exam: { id: string } } }>();

    await db.insert(schema.users).values({
      id: generateId(),
      name: 'Other',
      email: 'other@test.com',
      passwordHash: await hashPassword('Other123!'),
      role: 'student',
      membershipType: 'premium',
      isActive: true,
      createdAt: now(),
      updatedAt: now(),
    });
    const loginRes = await SELF.fetch('http://localhost/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'other@test.com', password: 'Other123!' }),
    });
    const { data: loginData } = await loginRes.json<{ data: { accessToken: string } }>();

    const res = await SELF.fetch(`http://localhost/exams/${createData.exam.id}/questions`, {
      headers: { Authorization: `Bearer ${loginData.accessToken}` },
    });
    expect(res.status).toBe(404);
  });

  it('returns 401 without a token', async () => {
    const res = await SELF.fetch('http://localhost/exams/some-id/questions');
    expect(res.status).toBe(401);
  });
});
