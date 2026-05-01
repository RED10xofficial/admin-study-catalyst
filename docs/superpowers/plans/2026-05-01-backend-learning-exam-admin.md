# Backend — Plan 3: Learning Progress + Exam System + Admin

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** Plans 1 and 2 must be complete and all tests passing.

**Goal:** Implement the student-facing learning flow (sequential progress), the
full exam lifecycle (create, submit, analytics), admin student management, admin
analytics, and the abandoned-exam cron job.

**Architecture:** Student routes protected by
`authMiddleware + requireRole('student')`. Exam submission uses a single D1
transaction covering answers, exam status, and question statistics to guarantee
atomicity. KV cache is invalidated immediately on admin membership/status
changes. Abandoned exam cron runs as a Cloudflare Workers `scheduled` handler.

**Tech Stack:** Hono, Drizzle ORM, D1 transactions, Cloudflare KV, Cloudflare
Cron Triggers

---

## File Structure (additions to Plans 1 and 2)

```
shared/src/validators/
  progress.validators.ts
  exams.validators.ts
  admin.validators.ts
  index.ts                       # updated

backend/src/modules/
  progress/
    progress.routes.ts
    progress.service.ts
  exams/
    exams.routes.ts
    exams.service.ts
  admin/
    admin.routes.ts
    admin.service.ts
  membership/
    membership.routes.ts         # student upgrade-membership endpoint
    membership.service.ts

backend/src/cron/
  abandoned-exams.ts             # scheduled handler

backend/tests/modules/
  progress.test.ts
  exams.test.ts
  admin.test.ts
```

---

## Task 1: Shared validators for learning + exam + admin

**Files:**

- Create: `shared/src/validators/progress.validators.ts`
- Create: `shared/src/validators/exams.validators.ts`
- Create: `shared/src/validators/admin.validators.ts`
- Modify: `shared/src/validators/index.ts`
- **Step 1: Create shared/src/validators/progress.validators.ts**

```typescript
import { z } from 'zod';

export const submitProgressSchema = z.object({
  questionId: z.string().uuid(),
  answer: z.string().min(1),
});

export type SubmitProgressInput = z.infer<typeof submitProgressSchema>;
```

- **Step 2: Create shared/src/validators/exams.validators.ts**

```typescript
import { z } from 'zod';

export const createExamSchema = z.object({
  unitId: z.string().uuid(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

export const submitExamSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      selectedAnswer: z.string().nullable(),
    }),
  ),
});

export type CreateExamInput = z.infer<typeof createExamSchema>;
export type SubmitExamInput = z.infer<typeof submitExamSchema>;
```

- **Step 3: Create shared/src/validators/admin.validators.ts**

```typescript
import { z } from 'zod';

export const studentListSchema = z.object({
  membershipType: z.enum(['normal', 'premium']).optional(),
  membershipSource: z
    .enum(['direct_registration', 'book_qr', 'manual_upgrade'])
    .optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateStudentSchema = z.object({
  isActive: z.boolean().optional(),
  membershipType: z.enum(['normal', 'premium']).optional(),
  membershipSource: z.enum(['manual_upgrade']).optional(),
});

export type StudentListQuery = z.infer<typeof studentListSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
```

- **Step 4: Update shared/src/validators/index.ts**

```typescript
export * from './admin.validators';
export * from './auth.validators';
export * from './book-codes.validators';
export * from './exam-questions.validators';
export * from './exam-types.validators';
export * from './exams.validators';
export * from './progress.validators';
export * from './questions.validators';
export * from './units.validators';
export * from './upload.validators';
```

- **Step 5: Commit**

```bash
git add -A
git commit -m "feat(shared): add validators for progress, exams, and admin modules"
```

---

## Task 2: Learning Progress module

**Files:**

- Create: `backend/src/modules/progress/progress.service.ts`
- Create: `backend/src/modules/progress/progress.routes.ts`
- Create: `backend/tests/modules/progress.test.ts`
- Modify: `backend/src/index.ts`
- **Step 1: Write tests for progress**

```typescript
// backend/tests/modules/progress.test.ts
import { describe, expect, it, beforeEach } from 'vitest';
import { env, SELF } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';
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

  // Question at sequenceOrder 0
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

  // Question at sequenceOrder 1
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
});
```

- **Step 2: Run — confirm tests fail**

```bash
yarn test tests/modules/progress.test.ts
```

Expected: FAIL.

- **Step 3: Create backend/src/modules/progress/progress.service.ts**

```typescript
import { and, eq } from 'drizzle-orm';
import type { Db } from '../../db/client';
import {
  questions,
  studentQuestionProgress,
} from '@admin-study-catalyst/shared/schema';
import type { SubmitProgressInput } from '@admin-study-catalyst/shared/validators';
import { notFound, unprocessable, forbidden } from '../../lib/errors';
import { generateId, now } from '../../lib/id';

export async function submitProgress(
  db: Db,
  studentId: string,
  input: SubmitProgressInput,
) {
  // Load question — check it exists and is accessible
  const question = await db
    .select()
    .from(questions)
    .where(
      and(eq(questions.id, input.questionId), eq(questions.isDeleted, false)),
    )
    .get();
  if (!question) throw notFound('Question not found');

  // Sequential gate: if this is not the first question, ensure the previous one is answered
  if (question.sequenceOrder > 0) {
    const prevQuestion = await db
      .select({ id: questions.id })
      .from(questions)
      .where(
        and(
          eq(questions.unitId, question.unitId),
          eq(questions.sequenceOrder, question.sequenceOrder - 1),
          eq(questions.isDeleted, false),
        ),
      )
      .get();

    if (prevQuestion) {
      const prevProgress = await db
        .select({ id: studentQuestionProgress.id })
        .from(studentQuestionProgress)
        .where(
          and(
            eq(studentQuestionProgress.studentId, studentId),
            eq(studentQuestionProgress.questionId, prevQuestion.id),
          ),
        )
        .get();

      if (!prevProgress) {
        throw unprocessable(
          'You must complete the previous question before answering this one',
          'SEQUENTIAL_GATE',
        );
      }
    }
  }

  // Idempotent upsert — any answer (right or wrong) marks as answered
  await db
    .insert(studentQuestionProgress)
    .values({
      id: generateId(),
      studentId,
      questionId: input.questionId,
      status: 'answered',
      answeredAt: now(),
    })
    .onConflictDoNothing();

  return { success: true };
}

export async function getUnitProgress(
  db: Db,
  studentId: string,
  unitId: string,
) {
  const allQuestions = await db
    .select({ id: questions.id, sequenceOrder: questions.sequenceOrder })
    .from(questions)
    .where(and(eq(questions.unitId, unitId), eq(questions.isDeleted, false)));

  const answeredRows = await db
    .select({ questionId: studentQuestionProgress.questionId })
    .from(studentQuestionProgress)
    .where(eq(studentQuestionProgress.studentId, studentId));

  const answeredIds = new Set(answeredRows.map((r) => r.questionId));
  const totalQuestions = allQuestions.length;
  const answeredCount = allQuestions.filter((q) =>
    answeredIds.has(q.id),
  ).length;

  return {
    unitId,
    totalQuestions,
    answeredCount,
    isComplete: totalQuestions > 0 && answeredCount === totalQuestions,
  };
}
```

- **Step 4: Create backend/src/modules/progress/progress.routes.ts**

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { Bindings } from '../../env';
import { getDb } from '../../db/client';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { submitProgressSchema } from '@admin-study-catalyst/shared/validators';
import { submitProgress, getUnitProgress } from './progress.service';

const progressApp = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string };
}>();

progressApp.use('*', authMiddleware, requireRole('student'));

progressApp.post('/', zValidator('json', submitProgressSchema), async (c) => {
  const result = await submitProgress(
    getDb(c.env.DB),
    c.get('userId'),
    c.req.valid('json'),
  );
  return c.json(result, 201);
});

progressApp.get('/unit/:unitId', async (c) => {
  const progress = await getUnitProgress(
    getDb(c.env.DB),
    c.get('userId'),
    c.req.param('unitId'),
  );
  return c.json({ progress });
});

export { progressApp };
```

- **Step 5: Mount in index.ts**

```typescript
import { progressApp } from './modules/progress/progress.routes';
app.route('/student/progress', progressApp);
```

- **Step 6: Run tests — confirm pass**

```bash
yarn test tests/modules/progress.test.ts
```

Expected: 4 passing tests.

- **Step 7: Commit**

```bash
git add -A
git commit -m "feat(progress): add sequential learning progress with idempotent upsert and gate check"
```

---

## Task 3: Exam System — creation

**Files:**

- Create: `backend/src/modules/exams/exams.service.ts` (partial — create exam)
- Create: `backend/src/modules/exams/exams.routes.ts` (partial)
- Create: `backend/tests/modules/exams.test.ts` (partial)
- Modify: `backend/src/index.ts`
- **Step 1: Write tests for exam creation**

```typescript
// backend/tests/modules/exams.test.ts
import { describe, expect, it, beforeEach } from 'vitest';
import { env, SELF } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@admin-study-catalyst/shared/schema';
import { generateId, now } from '../../src/lib/id';

async function setupPremiumStudentWithCompletedUnit() {
  const db = drizzle(env.DB, { schema });
  const { hashPassword } = await import('../../src/lib/hash');

  const studentId = generateId();
  await db
    .insert(schema.users)
    .values({
      id: studentId,
      name: 'Premium',
      email: 'premium@test.com',
      passwordHash: await hashPassword('Premium1!'),
      role: 'student',
      membershipType: 'premium',
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
      examQuestionCount: 2,
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

  // 1 learning question — mark it answered
  const lqId = generateId();
  await db
    .insert(schema.questions)
    .values({
      id: lqId,
      question: 'LQ',
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
  await db
    .insert(schema.studentQuestionProgress)
    .values({
      id: generateId(),
      studentId,
      questionId: lqId,
      status: 'answered',
      answeredAt: now(),
    })
    .onConflictDoNothing();

  // 3 exam questions (easy)
  for (let i = 0; i < 3; i++) {
    await db
      .insert(schema.examQuestions)
      .values({
        id: generateId(),
        question: `EQ${i}`,
        option1: 'A',
        option2: 'B',
        option3: 'C',
        option4: 'D',
        correctAnswer: 'A',
        difficulty: 'easy',
        unitId: 'unit-1',
        isDeleted: false,
        createdAt: now(),
      })
      .onConflictDoNothing();
  }

  const loginRes = await SELF.fetch('http://localhost/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'premium@test.com', password: 'Premium1!' }),
  });
  const { accessToken } = await loginRes.json<{ accessToken: string }>();
  return { studentId, token: accessToken };
}

describe('Exam System — Creation', () => {
  beforeEach(async () => {
    const db = drizzle(env.DB, { schema });
    await db.delete(schema.studentExams);
    await db.delete(schema.studentExamAnswers);
  });

  it('creates an exam for a premium student who has completed the unit', async () => {
    const { token } = await setupPremiumStudentWithCompletedUnit();
    const res = await SELF.fetch('http://localhost/student/exams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ unitId: 'unit-1', difficulty: 'easy' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json<{
      exam: { status: string; totalQuestions: number };
    }>();
    expect(body.exam.status).toBe('active');
    expect(body.exam.totalQuestions).toBe(2); // examQuestionCount from exam_types
  });

  it('blocks exam creation for normal-membership student', async () => {
    const db = drizzle(env.DB, { schema });
    const { hashPassword } = await import('../../src/lib/hash');
    await db
      .insert(schema.users)
      .values({
        id: generateId(),
        name: 'Normal',
        email: 'normal@test.com',
        passwordHash: await hashPassword('Normal12!'),
        role: 'student',
        membershipType: 'normal',
        isActive: true,
        createdAt: now(),
        updatedAt: now(),
      })
      .onConflictDoNothing();
    const loginRes = await SELF.fetch('http://localhost/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'normal@test.com', password: 'Normal12!' }),
    });
    const { accessToken } = await loginRes.json<{ accessToken: string }>();
    const res = await SELF.fetch('http://localhost/student/exams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ unitId: 'unit-1', difficulty: 'easy' }),
    });
    expect(res.status).toBe(403);
  });

  it('blocks exam creation if unit learning is not complete', async () => {
    const db = drizzle(env.DB, { schema });
    const { hashPassword } = await import('../../src/lib/hash');
    // Premium student but no progress
    await db
      .insert(schema.users)
      .values({
        id: generateId(),
        name: 'NoProg',
        email: 'noprog@test.com',
        passwordHash: await hashPassword('NoProg12!'),
        role: 'student',
        membershipType: 'premium',
        isActive: true,
        createdAt: now(),
        updatedAt: now(),
      })
      .onConflictDoNothing();
    const loginRes = await SELF.fetch('http://localhost/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'noprog@test.com', password: 'NoProg12!' }),
    });
    const { accessToken } = await loginRes.json<{ accessToken: string }>();
    const res = await SELF.fetch('http://localhost/student/exams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ unitId: 'unit-1', difficulty: 'easy' }),
    });
    expect(res.status).toBe(422);
  });

  it('blocks retake if exam record already exists', async () => {
    const { token } = await setupPremiumStudentWithCompletedUnit();
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    const body = JSON.stringify({ unitId: 'unit-1', difficulty: 'easy' });
    await SELF.fetch('http://localhost/student/exams', {
      method: 'POST',
      headers,
      body,
    });
    const res = await SELF.fetch('http://localhost/student/exams', {
      method: 'POST',
      headers,
      body,
    });
    expect(res.status).toBe(409);
  });
});
```

- **Step 2: Run — confirm tests fail**

```bash
yarn test tests/modules/exams.test.ts
```

Expected: FAIL.

- **Step 3: Create backend/src/modules/exams/exams.service.ts (create portion)**

```typescript
import { and, count, eq } from 'drizzle-orm';
import type { Db } from '../../db/client';
import {
  examQuestions,
  examTypes,
  questions,
  studentExamAnswers,
  studentExams,
  studentQuestionProgress,
  units,
  questionStatistics,
} from '@admin-study-catalyst/shared/schema';
import type {
  CreateExamInput,
  SubmitExamInput,
} from '@admin-study-catalyst/shared/validators';
import { conflict, forbidden, notFound, unprocessable } from '../../lib/errors';
import { generateId, now } from '../../lib/id';

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

export async function createExam(
  db: Db,
  studentId: string,
  input: CreateExamInput,
) {
  // 1. Verify premium membership
  const student = await db
    .select({ membershipType: studentExams.studentId }) // fetch from users
    .from(studentExams)
    .where(eq(studentExams.studentId, studentId))
    .get();

  // Re-fetch user membership directly
  const { users } = await import('@admin-study-catalyst/shared/schema');
  const user = await db
    .select({ membershipType: users.membershipType })
    .from(users)
    .where(eq(users.id, studentId))
    .get();
  if (!user) throw notFound('User not found');
  if (user.membershipType !== 'premium')
    throw forbidden('Exams require premium membership');

  // 2. Check unit exists
  const unit = await db
    .select({ id: units.id, examTypeId: units.examTypeId })
    .from(units)
    .where(and(eq(units.id, input.unitId), eq(units.isDeleted, false)))
    .get();
  if (!unit) throw notFound('Unit not found');

  // 3. Check no existing exam for this student + unit
  const existingExam = await db
    .select({ id: studentExams.id })
    .from(studentExams)
    .where(
      and(
        eq(studentExams.studentId, studentId),
        eq(studentExams.unitId, input.unitId),
      ),
    )
    .get();
  if (existingExam)
    throw conflict('You have already attempted or started this exam');

  // 4. Verify unit learning is complete
  const allQs = await db
    .select({ id: questions.id })
    .from(questions)
    .where(
      and(eq(questions.unitId, input.unitId), eq(questions.isDeleted, false)),
    );

  if (allQs.length === 0)
    throw unprocessable('No learning questions in this unit', 'NO_QUESTIONS');

  const [{ answeredCount }] = await db
    .select({ answeredCount: count() })
    .from(studentQuestionProgress)
    .where(
      and(
        eq(studentQuestionProgress.studentId, studentId),
        // Check all questions in unit are answered
      ),
    );

  // More precise check: answered count must equal all non-deleted questions
  const answeredInUnit = await db
    .select({ questionId: studentQuestionProgress.questionId })
    .from(studentQuestionProgress)
    .where(eq(studentQuestionProgress.studentId, studentId));

  const answeredSet = new Set(answeredInUnit.map((r) => r.questionId));
  const allAnswered = allQs.every((q) => answeredSet.has(q.id));

  if (!allAnswered) {
    throw unprocessable(
      'Complete all learning questions in this unit before taking the exam',
      'UNIT_INCOMPLETE',
    );
  }

  // 5. Fetch exam question count from exam type
  const examType = await db
    .select({ examQuestionCount: examTypes.examQuestionCount })
    .from(examTypes)
    .where(eq(examTypes.id, unit.examTypeId))
    .get();
  if (!examType) throw notFound('Exam type not found');

  // 6. Fetch available exam questions
  const available = await db
    .select()
    .from(examQuestions)
    .where(
      and(
        eq(examQuestions.unitId, input.unitId),
        eq(examQuestions.difficulty, input.difficulty),
        eq(examQuestions.isDeleted, false),
      ),
    );

  if (available.length < examType.examQuestionCount) {
    throw unprocessable(
      `Not enough exam questions: need ${examType.examQuestionCount}, only ${available.length} available`,
      'INSUFFICIENT_QUESTIONS',
    );
  }

  // 7. Randomly select questions
  const selected = shuffle(available).slice(0, examType.examQuestionCount);

  // 8. Create exam + answer placeholder rows
  const examId = generateId();
  const ts = now();

  await db.transaction(async (tx) => {
    await tx.insert(studentExams).values({
      id: examId,
      studentId,
      unitId: input.unitId,
      difficulty: input.difficulty,
      totalQuestions: selected.length,
      status: 'active',
      startedAt: ts,
    });

    for (const q of selected) {
      await tx.insert(studentExamAnswers).values({
        id: generateId(),
        examId,
        questionId: q.id,
        selectedAnswer: null,
        isCorrect: false,
        answeredAt: ts,
      });
    }
  });

  return db
    .select()
    .from(studentExams)
    .where(eq(studentExams.id, examId))
    .get();
}
```

- **Step 4: Create backend/src/modules/exams/exams.routes.ts (create portion)**

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { Bindings } from '../../env';
import { getDb } from '../../db/client';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { createExamSchema } from '@admin-study-catalyst/shared/validators';
import { createExam } from './exams.service';

const examsApp = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string };
}>();

examsApp.use('*', authMiddleware, requireRole('student'));

examsApp.post('/', zValidator('json', createExamSchema), async (c) => {
  const exam = await createExam(
    getDb(c.env.DB),
    c.get('userId'),
    c.req.valid('json'),
  );
  return c.json({ exam }, 201);
});

export { examsApp };
```

- **Step 5: Mount in index.ts**

```typescript
import { examsApp } from './modules/exams/exams.routes';
app.route('/student/exams', examsApp);
```

- **Step 6: Run tests — confirm pass**

```bash
yarn test tests/modules/exams.test.ts
```

Expected: 4 passing tests.

- **Step 7: Commit**

```bash
git add -A
git commit -m "feat(exams): add exam creation with prerequisite checks and question randomization"
```

---

## Task 4: Exam System — submission and analytics

**Files:**

- Modify: `backend/src/modules/exams/exams.service.ts`
- Modify: `backend/src/modules/exams/exams.routes.ts`
- Modify: `backend/tests/modules/exams.test.ts`
- **Step 1: Add submission tests**

Append to `backend/tests/modules/exams.test.ts`:

```typescript
describe('Exam System — Submission', () => {
  it('submits an exam, calculates score, and updates analytics', async () => {
    const { token, studentId } = await setupPremiumStudentWithCompletedUnit();
    const db = drizzle(env.DB, { schema });

    // Create exam
    const createRes = await SELF.fetch('http://localhost/student/exams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ unitId: 'unit-1', difficulty: 'easy' }),
    });
    const { exam } = await createRes.json<{ exam: { id: string } }>();

    // Get assigned questions from DB
    const answers = await db
      .select({ questionId: schema.studentExamAnswers.questionId })
      .from(schema.studentExamAnswers)
      .where(eq(schema.studentExamAnswers.examId, exam.id));

    // All answer correctly (correctAnswer = 'A' for all test questions)
    const submitRes = await SELF.fetch(
      `http://localhost/student/exams/${exam.id}/submit`,
      {
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
      },
    );
    expect(submitRes.status).toBe(200);
    const body = await submitRes.json<{
      exam: { score: number; status: string };
    }>();
    expect(body.exam.status).toBe('submitted');
    expect(body.exam.score).toBe(100); // all correct = 100%

    // Verify analytics updated
    const stats = await db.select().from(schema.questionStatistics);
    expect(stats.length).toBeGreaterThan(0);
    expect(stats[0]?.totalAttempts).toBe(1);
    expect(stats[0]?.correctAttempts).toBe(1);
  });

  it('blocks double submission', async () => {
    const { token } = await setupPremiumStudentWithCompletedUnit();
    const db = drizzle(env.DB, { schema });

    const createRes = await SELF.fetch('http://localhost/student/exams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ unitId: 'unit-1', difficulty: 'easy' }),
    });
    const { exam } = await createRes.json<{ exam: { id: string } }>();

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

    await SELF.fetch(`http://localhost/student/exams/${exam.id}/submit`, {
      method: 'POST',
      headers,
      body: payload,
    });
    const res = await SELF.fetch(
      `http://localhost/student/exams/${exam.id}/submit`,
      { method: 'POST', headers, body: payload },
    );
    expect(res.status).toBe(409);
  });

  it('rejects answers for question IDs not in the exam', async () => {
    const { token } = await setupPremiumStudentWithCompletedUnit();
    const createRes = await SELF.fetch('http://localhost/student/exams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ unitId: 'unit-1', difficulty: 'easy' }),
    });
    const { exam } = await createRes.json<{ exam: { id: string } }>();

    const res = await SELF.fetch(
      `http://localhost/student/exams/${exam.id}/submit`,
      {
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
      },
    );
    expect(res.status).toBe(422);
  });
});
```

- **Step 2: Add submit to exams.service.ts**

Append to `backend/src/modules/exams/exams.service.ts`:

```typescript
export async function submitExam(
  db: Db,
  studentId: string,
  examId: string,
  input: SubmitExamInput,
) {
  // 1. Load exam — verify ownership and status
  const exam = await db
    .select()
    .from(studentExams)
    .where(
      and(eq(studentExams.id, examId), eq(studentExams.studentId, studentId)),
    )
    .get();
  if (!exam) throw notFound('Exam not found');
  if (exam.status !== 'active')
    throw conflict('Exam has already been submitted or abandoned');

  // 2. Load assigned questions for this exam
  const assignedAnswers = await db
    .select({ questionId: studentExamAnswers.questionId })
    .from(studentExamAnswers)
    .where(eq(studentExamAnswers.examId, examId));
  const assignedIds = new Set(assignedAnswers.map((a) => a.questionId));

  // 3. Validate submitted question IDs belong to this exam
  for (const answer of input.answers) {
    if (!assignedIds.has(answer.questionId)) {
      throw unprocessable(
        `Question ${answer.questionId} does not belong to this exam`,
        'INVALID_QUESTION',
      );
    }
  }

  // 4. Load correct answers for all assigned questions
  const examQs = await db
    .select({
      id: examQuestions.id,
      correctAnswer: examQuestions.correctAnswer,
    })
    .from(examQuestions)
    .where(
      and(...Array.from(assignedIds).map((id) => eq(examQuestions.id, id))),
    );
  const correctAnswerMap = new Map(examQs.map((q) => [q.id, q.correctAnswer]));

  // 5. Calculate score
  const submittedMap = new Map(
    input.answers.map((a) => [a.questionId, a.selectedAnswer]),
  );
  let correctCount = 0;

  // 6. Atomic transaction: update answers + exam + analytics
  await db.transaction(async (tx) => {
    for (const questionId of assignedIds) {
      const selected = submittedMap.get(questionId) ?? null;
      const correct = correctAnswerMap.get(questionId);
      const isCorrect = selected !== null && selected === correct;
      if (isCorrect) correctCount++;

      await tx
        .update(studentExamAnswers)
        .set({ selectedAnswer: selected, isCorrect, answeredAt: now() })
        .where(
          and(
            eq(studentExamAnswers.examId, examId),
            eq(studentExamAnswers.questionId, questionId),
          ),
        );

      // Upsert question statistics
      const existing = await tx
        .select()
        .from(questionStatistics)
        .where(eq(questionStatistics.questionId, questionId))
        .get();

      if (existing) {
        await tx
          .update(questionStatistics)
          .set({
            totalAttempts: existing.totalAttempts + 1,
            correctAttempts: existing.correctAttempts + (isCorrect ? 1 : 0),
            wrongAttempts: existing.wrongAttempts + (isCorrect ? 0 : 1),
          })
          .where(eq(questionStatistics.questionId, questionId));
      } else {
        await tx.insert(questionStatistics).values({
          questionId,
          totalAttempts: 1,
          correctAttempts: isCorrect ? 1 : 0,
          wrongAttempts: isCorrect ? 0 : 1,
        });
      }
    }

    const score = Math.round((correctCount / assignedIds.size) * 100);

    await tx
      .update(studentExams)
      .set({
        score,
        correctAnswers: correctCount,
        status: 'submitted',
        submittedAt: now(),
      })
      .where(eq(studentExams.id, examId));
  });

  return db
    .select()
    .from(studentExams)
    .where(eq(studentExams.id, examId))
    .get();
}
```

- **Step 3: Add submit route to exams.routes.ts**

Append to `examsApp`:

```typescript
import { submitExamSchema } from '@admin-study-catalyst/shared/validators';
import { submitExam } from './exams.service';

examsApp.post(
  '/:id/submit',
  zValidator('json', submitExamSchema),
  async (c) => {
    const exam = await submitExam(
      getDb(c.env.DB),
      c.get('userId'),
      c.req.param('id'),
      c.req.valid('json'),
    );
    return c.json({ exam });
  },
);

examsApp.get('/:id', async (c) => {
  const db = getDb(c.env.DB);
  const { studentExams } = await import('@admin-study-catalyst/shared/schema');
  const { and, eq } = await import('drizzle-orm');
  const exam = await db
    .select()
    .from(studentExams)
    .where(
      and(
        eq(studentExams.id, c.req.param('id')),
        eq(studentExams.studentId, c.get('userId')),
      ),
    )
    .get();
  if (!exam) return c.json({ error: 'Not found' }, 404);
  return c.json({ exam });
});
```

- **Step 4: Run tests — confirm pass**

```bash
yarn test tests/modules/exams.test.ts
```

Expected: all exam tests pass.

- **Step 5: Commit**

```bash
git add -A
git commit -m "feat(exams): add exam submission with atomic d1 transaction and question analytics update"
```

---

## Task 5: Admin student management

**Files:**

- Create: `backend/src/modules/admin/admin.service.ts`
- Create: `backend/src/modules/admin/admin.routes.ts`
- Create: `backend/tests/modules/admin.test.ts`
- Modify: `backend/src/index.ts`
- **Step 1: Write tests for admin student management**

```typescript
// backend/tests/modules/admin.test.ts
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
  return (await res.json<{ accessToken: string }>()).accessToken;
}

describe('Admin — Student Management', () => {
  let token: string;
  beforeEach(async () => {
    token = await getAdminToken();
  });

  it('lists all students', async () => {
    const res = await SELF.fetch('http://localhost/admin/students', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json<{ students: unknown[] }>();
    expect(Array.isArray(body.students)).toBe(true);
  });

  it('blocks admin from blocking themselves', async () => {
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

    const res = await SELF.fetch(
      `http://localhost/admin/students/${studentId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: false }),
      },
    );
    expect(res.status).toBe(200);

    // Verify blocked student can no longer login
    const loginRes = await SELF.fetch('http://localhost/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'target@test.com', password: 'Target12!' }),
    });
    expect(loginRes.status).toBe(401);
  });
});
```

- **Step 2: Create backend/src/modules/admin/admin.service.ts**

```typescript
import { and, eq } from 'drizzle-orm';
import type { Db } from '../../db/client';
import type { KVNamespace } from '@cloudflare/workers-types';
import { users, studentExams } from '@admin-study-catalyst/shared/schema';
import type {
  StudentListQuery,
  UpdateStudentInput,
} from '@admin-study-catalyst/shared/validators';
import { forbidden, notFound } from '../../lib/errors';
import { invalidateUserCache } from '../../lib/kv';
import { now } from '../../lib/id';

export async function listStudents(db: Db, query: StudentListQuery) {
  const conditions = [eq(users.role, 'student')];
  if (query.membershipType)
    conditions.push(eq(users.membershipType, query.membershipType));
  if (query.membershipSource)
    conditions.push(eq(users.membershipSource, query.membershipSource));
  if (query.isActive !== undefined)
    conditions.push(eq(users.isActive, query.isActive));

  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      membershipType: users.membershipType,
      membershipSource: users.membershipSource,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(...conditions))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);
}

export async function updateStudent(
  db: Db,
  kv: KVNamespace,
  adminId: string,
  targetId: string,
  input: UpdateStudentInput,
) {
  if (targetId === adminId)
    throw forbidden('Admins cannot modify their own account this way');

  const existing = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, targetId))
    .get();
  if (!existing) throw notFound('User not found');

  const [updated] = await db
    .update(users)
    .set({
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.membershipType !== undefined && {
        membershipType: input.membershipType,
      }),
      ...(input.membershipSource !== undefined && {
        membershipSource: input.membershipSource,
      }),
      updatedAt: now(),
    })
    .where(eq(users.id, targetId))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      isActive: users.isActive,
      membershipType: users.membershipType,
    });

  // Immediately invalidate KV cache so next request reflects new status
  await invalidateUserCache(kv, targetId);

  return updated;
}

export async function getStudentExamHistory(db: Db, studentId: string) {
  return db
    .select()
    .from(studentExams)
    .where(eq(studentExams.studentId, studentId))
    .orderBy(studentExams.startedAt);
}

export async function getMembershipAnalytics(db: Db) {
  const allStudents = await db
    .select({
      membershipType: users.membershipType,
      membershipSource: users.membershipSource,
    })
    .from(users)
    .where(eq(users.role, 'student'));

  const total = allStudents.length;
  const normal = allStudents.filter(
    (u) => u.membershipType === 'normal',
  ).length;
  const premium = allStudents.filter(
    (u) => u.membershipType === 'premium',
  ).length;
  const qrRegistrations = allStudents.filter(
    (u) => u.membershipSource === 'book_qr',
  ).length;
  const manualUpgrades = allStudents.filter(
    (u) => u.membershipSource === 'manual_upgrade',
  ).length;

  return { total, normal, premium, qrRegistrations, manualUpgrades };
}

export async function getQuestionAnalytics(db: Db) {
  const { questionStatistics, examQuestions } =
    await import('@admin-study-catalyst/shared/schema');
  const stats = await db
    .select({
      questionId: questionStatistics.questionId,
      question: examQuestions.question,
      totalAttempts: questionStatistics.totalAttempts,
      correctAttempts: questionStatistics.correctAttempts,
      wrongAttempts: questionStatistics.wrongAttempts,
    })
    .from(questionStatistics)
    .innerJoin(
      examQuestions,
      eq(questionStatistics.questionId, examQuestions.id),
    )
    .orderBy(questionStatistics.totalAttempts);

  return stats.map((s) => ({
    ...s,
    accuracy:
      s.totalAttempts > 0
        ? Math.round((s.correctAttempts / s.totalAttempts) * 100)
        : null,
  }));
}
```

- **Step 3: Create backend/src/modules/admin/admin.routes.ts**

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { Bindings } from '../../env';
import { getDb } from '../../db/client';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import {
  studentListSchema,
  updateStudentSchema,
} from '@admin-study-catalyst/shared/validators';
import {
  listStudents,
  updateStudent,
  getStudentExamHistory,
  getMembershipAnalytics,
  getQuestionAnalytics,
} from './admin.service';

const adminApp = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string };
}>();

adminApp.use('*', authMiddleware, requireRole('admin'));

adminApp.get('/students', zValidator('query', studentListSchema), async (c) => {
  const students = await listStudents(getDb(c.env.DB), c.req.valid('query'));
  return c.json({ students });
});

adminApp.patch(
  '/students/:id',
  zValidator('json', updateStudentSchema),
  async (c) => {
    const student = await updateStudent(
      getDb(c.env.DB),
      c.env.KV,
      c.get('userId'),
      c.req.param('id'),
      c.req.valid('json'),
    );
    return c.json({ student });
  },
);

adminApp.get('/students/:id/exams', async (c) => {
  const exams = await getStudentExamHistory(getDb(c.env.DB), c.req.param('id'));
  return c.json({ exams });
});

adminApp.get('/analytics/membership', async (c) => {
  const analytics = await getMembershipAnalytics(getDb(c.env.DB));
  return c.json({ analytics });
});

adminApp.get('/analytics/questions', async (c) => {
  const analytics = await getQuestionAnalytics(getDb(c.env.DB));
  return c.json({ analytics });
});

export { adminApp };
```

- **Step 4: Mount in index.ts**

```typescript
import { adminApp } from './modules/admin/admin.routes';
app.route('/admin', adminApp);
```

- **Step 5: Run tests — confirm pass**

```bash
yarn test tests/modules/admin.test.ts
```

Expected: 3 passing tests.

- **Step 6: Commit**

```bash
git add -A
git commit -m "feat(admin): add student management, membership + question analytics, self-block guard"
```

---

## Task 6: Membership upgrade endpoint (student-facing)

**Files:**

- Create: `backend/src/modules/membership/membership.service.ts`
- Create: `backend/src/modules/membership/membership.routes.ts`
- Modify: `backend/src/index.ts`
- **Step 1: Create backend/src/modules/membership/membership.service.ts**

```typescript
import { eq } from 'drizzle-orm';
import type { Db } from '../../db/client';
import type { KVNamespace } from '@cloudflare/workers-types';
import { users, bookCodes } from '@admin-study-catalyst/shared/schema';
import { badRequest, conflict } from '../../lib/errors';
import { invalidateUserCache } from '../../lib/kv';
import { now } from '../../lib/id';

export async function upgradeWithBookCode(
  db: Db,
  kv: KVNamespace,
  studentId: string,
  rawCode: string,
) {
  const code = rawCode.toUpperCase();

  const user = await db
    .select({ membershipType: users.membershipType })
    .from(users)
    .where(eq(users.id, studentId))
    .get();
  if (user?.membershipType === 'premium')
    throw conflict('Already a premium member');

  await db.transaction(async (tx) => {
    const bookCode = await tx
      .select()
      .from(bookCodes)
      .where(eq(bookCodes.code, code))
      .get();

    if (!bookCode) throw badRequest('Invalid book code', 'INVALID_CODE');
    if (bookCode.status !== 'unused')
      throw badRequest('Book code already used or blocked', 'CODE_UNAVAILABLE');
    if (bookCode.expiresAt && new Date(bookCode.expiresAt) < new Date()) {
      throw badRequest('Book code has expired', 'CODE_EXPIRED');
    }

    const ts = now();
    await tx
      .update(users)
      .set({
        membershipType: 'premium',
        membershipSource: 'manual_upgrade',
        updatedAt: ts,
      })
      .where(eq(users.id, studentId));

    await tx
      .update(bookCodes)
      .set({ status: 'used', usedByUserId: studentId, usedAt: ts })
      .where(eq(bookCodes.code, code));
  });

  await invalidateUserCache(kv, studentId);
  return { success: true, membershipType: 'premium' };
}
```

- **Step 2: Create backend/src/modules/membership/membership.routes.ts**

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Bindings } from '../../env';
import { getDb } from '../../db/client';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { upgradeWithBookCode } from './membership.service';

const membershipApp = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string };
}>();

membershipApp.use('*', authMiddleware, requireRole('student'));

membershipApp.post(
  '/upgrade',
  zValidator(
    'json',
    z.object({ bookCode: z.string().length(12).toUpperCase() }),
  ),
  async (c) => {
    const { bookCode } = c.req.valid('json');
    const result = await upgradeWithBookCode(
      getDb(c.env.DB),
      c.env.KV,
      c.get('userId'),
      bookCode,
    );
    return c.json(result);
  },
);

export { membershipApp };
```

- **Step 3: Mount in index.ts**

```typescript
import { membershipApp } from './modules/membership/membership.routes';
app.route('/student/membership', membershipApp);
```

- **Step 4: Commit**

```bash
git add -A
git commit -m "feat(membership): add student book code upgrade endpoint with transaction guard"
```

---

## Task 7: Abandoned exam cron

**Files:**

- Create: `backend/src/cron/abandoned-exams.ts`
- Modify: `backend/src/index.ts`
- Modify: `backend/wrangler.toml`
- **Step 1: Add cron trigger to wrangler.toml**

Append to `backend/wrangler.toml`:

```toml
[triggers]
crons = ["0 * * * *"]  # run every hour
```

- **Step 2: Create backend/src/cron/abandoned-exams.ts**

```typescript
import { and, eq, lt } from 'drizzle-orm';
import { studentExams } from '@admin-study-catalyst/shared/schema';
import { getDb } from '../db/client';
import type { Bindings } from '../env';

export async function markAbandonedExams(env: Bindings): Promise<void> {
  const db = getDb(env.DB);
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const result = await db
    .update(studentExams)
    .set({ status: 'abandoned' })
    .where(
      and(
        eq(studentExams.status, 'active'),
        lt(studentExams.startedAt, cutoff),
      ),
    )
    .returning({ id: studentExams.id });

  console.log(`[cron] Marked ${result.length} exam(s) as abandoned`);
}
```

- **Step 3: Wire the cron handler into index.ts**

The Cloudflare Worker exports must include a `scheduled` handler:

```typescript
// backend/src/index.ts — add scheduled export alongside default export
import { markAbandonedExams } from './cron/abandoned-exams';

// ... existing app setup ...

export default {
  fetch: app.fetch,
  async scheduled(
    _event: ScheduledEvent,
    env: Bindings,
    _ctx: ExecutionContext,
  ) {
    await markAbandonedExams(env);
  },
};
```

- **Step 4: Test the cron handler manually**

```bash
cd backend
npx wrangler dev --test-scheduled
```

In another terminal:

```bash
curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"
```

Expected: `[cron] Marked 0 exam(s) as abandoned` in dev server logs.

- **Step 5: Commit**

```bash
git add -A
git commit -m "feat(cron): add hourly scheduled handler to mark abandoned exams"
```

---

## Task 8: Student content access (read-only student routes)

**Files:**

- Create: `backend/src/modules/content/content.routes.ts`
- Modify: `backend/src/index.ts`

Students need routes to browse units and questions. These are read-only and
enforce membership access type.

- **Step 1: Create backend/src/modules/content/content.routes.ts**

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import type { Bindings } from '../../env';
import { getDb } from '../../db/client';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import {
  units,
  questions,
  examTypes,
} from '@admin-study-catalyst/shared/schema';
import { kvGet, kvKeys, kvSet, TTL_30S } from '../../lib/kv';
import { forbidden } from '../../lib/errors';

const contentApp = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string };
}>();

contentApp.use('*', authMiddleware, requireRole('student'));

// Get membership from KV cache
async function getMembership(c: {
  env: Bindings;
  get: (key: 'userId') => string;
}): Promise<'normal' | 'premium'> {
  const userId = c.get('userId');
  let membership = await kvGet(c.env.KV, kvKeys.userMembership(userId));
  if (!membership) {
    const { users } = await import('@admin-study-catalyst/shared/schema');
    const db = getDb(c.env.DB);
    const user = await db
      .select({ membershipType: users.membershipType })
      .from(users)
      .where(eq(users.id, userId))
      .get();
    membership = user?.membershipType ?? 'normal';
    await kvSet(c.env.KV, kvKeys.userMembership(userId), membership, TTL_30S);
  }
  return membership as 'normal' | 'premium';
}

contentApp.get(
  '/units',
  zValidator('query', z.object({ examTypeId: z.string().uuid().optional() })),
  async (c) => {
    const { examTypeId } = c.req.valid('query');
    const membership = await getMembership(c);
    const db = getDb(c.env.DB);

    const conditions = [eq(units.isDeleted, false)];
    if (examTypeId) conditions.push(eq(units.examTypeId, examTypeId));
    // Normal members only see free units
    if (membership === 'normal') conditions.push(eq(units.accessType, 'free'));

    const unitList = await db
      .select()
      .from(units)
      .where(and(...conditions));
    return c.json({ units: unitList });
  },
);

contentApp.get('/units/:id/questions', async (c) => {
  const membership = await getMembership(c);
  const db = getDb(c.env.DB);
  const unitId = c.req.param('id');

  // Check unit exists and is accessible
  const unit = await db
    .select({ accessType: units.accessType, isDeleted: units.isDeleted })
    .from(units)
    .where(eq(units.id, unitId))
    .get();
  if (!unit || unit.isDeleted) return c.json({ error: 'Unit not found' }, 404);
  if (unit.accessType === 'premium' && membership !== 'premium')
    throw forbidden('Premium membership required');

  const questionList = await db
    .select()
    .from(questions)
    .where(
      and(
        eq(questions.unitId, unitId),
        eq(questions.isDeleted, false),
        membership === 'normal' ? eq(questions.accessType, 'free') : undefined,
      ),
    )
    .orderBy(questions.sequenceOrder);

  // Strip correct_answer from student response
  return c.json({
    questions: questionList.map(({ correctAnswer: _ca, ...q }) => q),
  });
});

export { contentApp };
```

- **Step 2: Mount in index.ts**

```typescript
import { contentApp } from './modules/content/content.routes';
app.route('/student', contentApp);
```

- **Step 3: Commit**

```bash
git add -A
git commit -m "feat(content): add student read-only unit and question routes with membership enforcement"
```

---

## Task 9: Final integration — run all tests

- **Step 1: Run the full test suite**

```bash
cd backend && yarn test
```

Expected: all tests pass with 0 failures.

- **Step 2: Run lint and format check**

```bash
cd .. && yarn lint && yarn format:check
```

Expected: no lint errors, all files formatted.

- **Step 3: Final commit**

```bash
git add -A
git commit -m "chore(backend): final integration — all backend modules complete and tests passing"
```

---

## Corrections (from self-review)

### Fix 1: Exam submission — auto-recalculate exam question difficulty

The spec requires that after updating `question_statistics`, the difficulty of
the `exam_questions` row is recalculated in the same transaction using accuracy
thresholds.

Inside the `submitExam` transaction loop in
`backend/src/modules/exams/exams.service.ts`, **after** updating
`questionStatistics`, add:

```typescript
// After upserting question_statistics, recalculate difficulty
// Re-read updated stats (inside the same tx)
const updatedStats = existing
  ? {
      totalAttempts: existing.totalAttempts + 1,
      correctAttempts: existing.correctAttempts + (isCorrect ? 1 : 0),
    }
  : { totalAttempts: 1, correctAttempts: isCorrect ? 1 : 0 };

const accuracy =
  updatedStats.totalAttempts > 0
    ? updatedStats.correctAttempts / updatedStats.totalAttempts
    : null;

if (accuracy !== null) {
  const newDifficulty: 'easy' | 'medium' | 'hard' =
    accuracy > 0.8 ? 'easy' : accuracy >= 0.5 ? 'medium' : 'hard';
  await tx
    .update(examQuestions)
    .set({ difficulty: newDifficulty })
    .where(eq(examQuestions.id, questionId));
}
```

Add a test to `backend/tests/modules/exams.test.ts`:

```typescript
it('recalculates difficulty after submission based on accuracy', async () => {
  const { token } = await setupPremiumStudentWithCompletedUnit();
  const db = drizzle(env.DB, { schema });

  const createRes = await SELF.fetch('http://localhost/student/exams', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ unitId: 'unit-1', difficulty: 'easy' }),
  });
  const { exam } = await createRes.json<{ exam: { id: string } }>();
  const assignedAnswers = await db
    .select({ questionId: schema.studentExamAnswers.questionId })
    .from(schema.studentExamAnswers)
    .where(eq(schema.studentExamAnswers.examId, exam.id));

  // All wrong — accuracy = 0 → should recalculate to 'hard'
  await SELF.fetch(`http://localhost/student/exams/${exam.id}/submit`, {
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

  const updatedQs = await db
    .select({ difficulty: schema.examQuestions.difficulty })
    .from(schema.examQuestions)
    .where(eq(schema.examQuestions.unitId, 'unit-1'));

  expect(updatedQs.every((q) => q.difficulty === 'hard')).toBe(true);
});
```

### Fix 2: Learning progress — membership gate for premium questions

The spec states: "Membership revoked mid-unit: Premium questions return 403;
free questions continue." Update `progress.service.ts` to accept `kv` and `env`
parameters and check membership before recording premium question progress.

Change the `submitProgress` signature in
`backend/src/modules/progress/progress.service.ts`:

```typescript
import type { KVNamespace } from '@cloudflare/workers-types';
import { kvGet, kvKeys, kvSet, TTL_30S } from '../../lib/kv';
import { forbidden } from '../../lib/errors';

export async function submitProgress(
  db: Db,
  kv: KVNamespace,
  studentId: string,
  input: SubmitProgressInput,
) {
  const question = await db
    .select()
    .from(questions)
    .where(
      and(eq(questions.id, input.questionId), eq(questions.isDeleted, false)),
    )
    .get();
  if (!question) throw notFound('Question not found');

  // Membership gate — check BEFORE the sequential gate
  if (question.accessType === 'premium') {
    let membership = await kvGet(kv, kvKeys.userMembership(studentId));
    if (membership === null) {
      const { users } = await import('@admin-study-catalyst/shared/schema');
      const user = await db
        .select({ membershipType: users.membershipType })
        .from(users)
        .where(eq(users.id, studentId))
        .get();
      membership = user?.membershipType ?? 'normal';
      await kvSet(kv, kvKeys.userMembership(studentId), membership, TTL_30S);
    }
    if (membership !== 'premium') {
      throw forbidden('Premium membership required to access this question');
    }
  }

  // ... rest of the function unchanged (sequential gate, insert) ...
}
```

Update `backend/src/modules/progress/progress.routes.ts` to pass `c.env.KV`:

```typescript
progressApp.post('/', zValidator('json', submitProgressSchema), async (c) => {
  const result = await submitProgress(
    getDb(c.env.DB),
    c.env.KV, // <-- add this
    c.get('userId'),
    c.req.valid('json'),
  );
  return c.json(result, 201);
});
```

Add a test to `backend/tests/modules/progress.test.ts`:

```typescript
it('blocks normal-membership student from answering a premium question', async () => {
  const db = drizzle(env.DB, { schema });
  const { q1Id, token } = await setupStudentAndQuestion();

  // Change q1 to premium in DB
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
```

---

## Milestone Check — Plan 3 Complete

The full backend is now implemented:

- Learning Progress: sequential gate, idempotent upsert, KV membership check
- Exam Creation: premium guard, unit completion check, retake prevention,
  randomization
- Exam Submission: single D1 transaction (answers + status + analytics)
- Admin Student Management: list, update, self-block guard, KV cache
  invalidation
- Admin Analytics: membership breakdown, question difficulty analytics
- Membership Upgrade: student book-code upgrade with D1 transaction
- Abandoned Exam Cron: scheduled Worker handler marks exams > 24h as abandoned
- Student Content Routes: unit/question browsing with membership enforcement

```bash
cd backend && yarn test
```

Expected: all tests pass.
