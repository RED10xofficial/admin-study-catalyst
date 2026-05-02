# Student Missing APIs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three missing student-facing endpoints: `GET /auth/me` (profile),
`GET /exams` (exam history), and `GET /exams/:id/questions` (exam paper with
answer masking).

**Architecture:** All endpoints reuse existing `authMiddleware` and
`requireRole`. `GET /auth/me` is role-agnostic (admin and student both need it).
`GET /exams` and `GET /exams/:id/questions` are student-only. The exam paper
endpoint joins `student_exam_answers` with `exam_questions` so the client gets
question text + options + the student's own selected answer — but
`correctAnswer` is always stripped (even after submission, to avoid leaking
answers to the frontend). Services are added to the existing service files
keeping each file's responsibility intact.

**Tech Stack:** Hono, Drizzle ORM (D1), Cloudflare Workers, Vitest +
`cloudflare:test`

---

## File Structure

```
shared/src/messages/
  auth.messages.ts          # add ME constant
  exams.messages.ts         # add LISTED + QUESTIONS_RETRIEVED constants

backend/src/modules/auth/
  auth.service.ts           # add getMe()
  auth.routes.ts            # add GET /me

backend/src/modules/exams/
  exams.service.ts          # add listExams() + getExamQuestions()
  exams.routes.ts           # add GET / and GET /:id/questions

backend/tests/modules/
  auth.test.ts              # add GET /auth/me tests
  exams.test.ts             # add GET /exams and GET /exams/:id/questions tests
```

---

## Task 1: Add message constants

**Files:**

- Modify: `shared/src/messages/auth.messages.ts`
- Modify: `shared/src/messages/exams.messages.ts`

- [ ] **Step 1: Update shared/src/messages/auth.messages.ts**

```typescript
export const AUTH_MESSAGES = {
  REGISTERED: 'User registered successfully.',
  LOGGED_IN: 'Logged in successfully.',
  REFRESHED: 'Token refreshed successfully.',
  LOGGED_OUT: 'Logged out successfully.',
  FORGOT_PASSWORD: 'If that email exists, a reset link has been sent.',
  PASSWORD_RESET: 'Password reset successfully.',
  ME: 'Profile retrieved successfully.',
} as const;
```

- [ ] **Step 2: Update shared/src/messages/exams.messages.ts**

```typescript
export const EXAM_MESSAGES = {
  CREATED: 'Exam created successfully.',
  RETRIEVED: 'Exam retrieved successfully.',
  SUBMITTED: 'Exam submitted successfully.',
  LISTED: 'Exams retrieved successfully.',
  QUESTIONS_RETRIEVED: 'Exam questions retrieved successfully.',
} as const;
```

- [ ] **Step 3: Commit**

```bash
git add shared/src/messages/auth.messages.ts shared/src/messages/exams.messages.ts
git commit -m "feat(shared): add ME, LISTED, and QUESTIONS_RETRIEVED message constants"
```

---

## Task 2: GET /auth/me — current user profile

**Files:**

- Modify: `backend/src/modules/auth/auth.service.ts`
- Modify: `backend/src/modules/auth/auth.routes.ts`
- Modify: `backend/tests/modules/auth.test.ts`

- [ ] **Step 1: Write failing tests**

Append the following `describe` block to `backend/tests/modules/auth.test.ts`:

```typescript
describe('GET /auth/me', () => {
  beforeEach(clearAuthTables);

  it('returns profile for an authenticated student', async () => {
    await SELF.fetch('http://localhost/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Meena',
        email: 'meena@test.com',
        password: 'Meena123!',
      }),
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
    // sensitive fields must be absent
    expect(
      (body.data.user as Record<string, unknown>).passwordHash,
    ).toBeUndefined();
    expect(
      (body.data.user as Record<string, unknown>).isActive,
    ).toBeUndefined();
  });

  it('returns 401 when no token is provided', async () => {
    const res = await SELF.fetch('http://localhost/auth/me');
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run — confirm tests fail**

```bash
cd /path/to/backend && yarn test tests/modules/auth.test.ts
```

Expected: FAIL — `GET /auth/me` route does not exist.

- [ ] **Step 3: Add getMe service to backend/src/modules/auth/auth.service.ts**

Append to the file after the last export:

```typescript
export async function getMe(db: Db, userId: string) {
  const user = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      membershipType: users.membershipType,
      membershipSource: users.membershipSource,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!user) throw notFound('User not found');
  return user;
}
```

Also add `notFound` to the imports at the top of the file:

```typescript
import { badRequest, conflict, notFound, unauthorized } from '../../lib/errors';
```

- [ ] **Step 4: Add GET /me route to backend/src/modules/auth/auth.routes.ts**

Add the import for `authMiddleware`, `AUTH_MESSAGES.ME`, and `getMe` at the top
of the file, then append the route before the `export` line:

Add to the existing imports (the `AUTH_MESSAGES` import already exists — update
it to include `ME`):

```typescript
import { AUTH_MESSAGES } from '@admin-study-catalyst/shared/messages';
import { authMiddleware } from '../../middleware/auth';
import { getMe } from './auth.service';
```

Append the route (before `export { authRoutes }`):

```typescript
authRoutes.get('/me', authMiddleware, async (c) => {
  const user = await getMe(getDb(c.env.DB), c.get('userId'));
  return ok(c, { user }, AUTH_MESSAGES.ME);
});
```

- [ ] **Step 5: Run — confirm tests pass**

```bash
cd /path/to/backend && yarn test tests/modules/auth.test.ts
```

Expected: all auth tests pass.

- [ ] **Step 6: Commit**

```bash
git add shared/src/messages/auth.messages.ts \
        backend/src/modules/auth/auth.service.ts \
        backend/src/modules/auth/auth.routes.ts \
        backend/tests/modules/auth.test.ts
git commit -m "feat(auth): add GET /auth/me to return authenticated user profile"
```

---

## Task 3: GET /exams — list student's exam history

**Files:**

- Modify: `backend/src/modules/exams/exams.service.ts`
- Modify: `backend/src/modules/exams/exams.routes.ts`
- Modify: `backend/tests/modules/exams.test.ts`

- [ ] **Step 1: Write failing test**

Append the following `describe` block to `backend/tests/modules/exams.test.ts`:

```typescript
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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
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
```

- [ ] **Step 2: Run — confirm tests fail**

```bash
cd /path/to/backend && yarn test tests/modules/exams.test.ts
```

Expected: FAIL — `GET /exams` route does not exist.

- [ ] **Step 3: Add listExams to backend/src/modules/exams/exams.service.ts**

Append after the existing exports:

```typescript
export async function listExams(db: Db, studentId: string) {
  return db
    .select()
    .from(studentExams)
    .where(eq(studentExams.studentId, studentId))
    .orderBy(studentExams.startedAt);
}
```

- [ ] **Step 4: Add GET / to backend/src/modules/exams/exams.routes.ts**

Add import for `listExams` to the existing import from `./exams.service`:

```typescript
import { createExam, listExams, submitExam } from './exams.service';
```

Append the route before `export { examsApp }`:

```typescript
examsApp.get('/', async (c) => {
  const exams = await listExams(getDb(c.env.DB), c.get('userId'));
  return ok(c, { exams }, EXAM_MESSAGES.LISTED);
});
```

- [ ] **Step 5: Run — confirm tests pass**

```bash
cd /path/to/backend && yarn test tests/modules/exams.test.ts
```

Expected: all exam tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/exams/exams.service.ts \
        backend/src/modules/exams/exams.routes.ts \
        backend/tests/modules/exams.test.ts
git commit -m "feat(exams): add GET /exams to list student's own exam history"
```

---

## Task 4: GET /exams/:id/questions — serve exam paper

**Files:**

- Modify: `backend/src/modules/exams/exams.service.ts`
- Modify: `backend/src/modules/exams/exams.routes.ts`
- Modify: `backend/tests/modules/exams.test.ts`

This endpoint returns the question text + options for the exam assigned to the
student, joined with the student's current answers. `correctAnswer` is **never**
returned, even after submission — this prevents the frontend from leaking the
answer key in the client payload.

For a submitted exam the response also includes `selectedAnswer` and `isCorrect`
from `student_exam_answers` so the result review screen can render per-question
feedback.

- [ ] **Step 1: Write failing tests**

Append the following `describe` block to `backend/tests/modules/exams.test.ts`:

```typescript
describe('GET /exams/:id/questions — exam paper', () => {
  beforeEach(resetExamFixtures);

  it('returns questions with options but no correctAnswer for an active exam', async () => {
    const { token } = await setupPremiumStudentWithCompletedUnit();

    const createRes = await SELF.fetch('http://localhost/exams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ unitId: TEST_UNIT_ID, difficulty: 'easy' }),
    });
    const { data: createData } = await createRes.json<{
      data: { exam: { id: string } };
    }>();

    const res = await SELF.fetch(
      `http://localhost/exams/${createData.exam.id}/questions`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
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
    // correctAnswer must be stripped
    for (const q of body.data.questions) {
      expect((q as Record<string, unknown>).correctAnswer).toBeUndefined();
      // selectedAnswer is null for an active exam (not yet submitted)
      expect(q.selectedAnswer).toBeNull();
    }
  });

  it('includes selectedAnswer and isCorrect after submission', async () => {
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
    const { data: createData } = await createRes.json<{
      data: { exam: { id: string } };
    }>();

    const assigned = await db
      .select({ questionId: schema.studentExamAnswers.questionId })
      .from(schema.studentExamAnswers)
      .where(eq(schema.studentExamAnswers.examId, createData.exam.id));

    await SELF.fetch(`http://localhost/exams/${createData.exam.id}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        answers: assigned.map((a) => ({
          questionId: a.questionId,
          selectedAnswer: 'A',
        })),
      }),
    });

    const res = await SELF.fetch(
      `http://localhost/exams/${createData.exam.id}/questions`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    expect(res.status).toBe(200);
    const body = await res.json<{
      data: {
        questions: { selectedAnswer: string | null; isCorrect: boolean }[];
      };
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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ unitId: TEST_UNIT_ID, difficulty: 'easy' }),
    });
    const { data: createData } = await createRes.json<{
      data: { exam: { id: string } };
    }>();

    // Register a second student
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
    const { data: loginData } = await loginRes.json<{
      data: { accessToken: string };
    }>();

    const res = await SELF.fetch(
      `http://localhost/exams/${createData.exam.id}/questions`,
      {
        headers: { Authorization: `Bearer ${loginData.accessToken}` },
      },
    );
    expect(res.status).toBe(404);
  });

  it('returns 401 without a token', async () => {
    const res = await SELF.fetch('http://localhost/exams/some-id/questions');
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run — confirm tests fail**

```bash
cd /path/to/backend && yarn test tests/modules/exams.test.ts
```

Expected: FAIL — `GET /exams/:id/questions` route does not exist.

- [ ] **Step 3: Add getExamQuestions to
      backend/src/modules/exams/exams.service.ts**

Add `studentExamAnswers` is already imported. Append after `listExams`:

```typescript
export async function getExamQuestions(
  db: Db,
  studentId: string,
  examId: string,
) {
  const exam = await db
    .select({ id: studentExams.id, studentId: studentExams.studentId })
    .from(studentExams)
    .where(
      and(eq(studentExams.id, examId), eq(studentExams.studentId, studentId)),
    )
    .get();
  if (!exam) throw notFound('Exam not found');

  const answers = await db
    .select({
      questionId: studentExamAnswers.questionId,
      selectedAnswer: studentExamAnswers.selectedAnswer,
      isCorrect: studentExamAnswers.isCorrect,
    })
    .from(studentExamAnswers)
    .where(eq(studentExamAnswers.examId, examId));

  const questionIds = answers.map((a) => a.questionId);

  const questionRows = await db
    .select({
      id: examQuestions.id,
      question: examQuestions.question,
      option1: examQuestions.option1,
      option2: examQuestions.option2,
      option3: examQuestions.option3,
      option4: examQuestions.option4,
      shortDescription: examQuestions.shortDescription,
      difficulty: examQuestions.difficulty,
    })
    .from(examQuestions)
    .where(inArray(examQuestions.id, questionIds));

  const answerMap = new Map(answers.map((a) => [a.questionId, a]));

  return questionRows.map((q) => {
    const studentAnswer = answerMap.get(q.id);
    return {
      ...q,
      selectedAnswer: studentAnswer?.selectedAnswer ?? null,
      isCorrect: studentAnswer?.isCorrect ?? false,
    };
  });
}
```

Ensure `inArray` is in the drizzle-orm import at the top of `exams.service.ts`.
It is already imported — no change needed.

- [ ] **Step 4: Add GET /:id/questions to
      backend/src/modules/exams/exams.routes.ts**

Add `getExamQuestions` to the import from `./exams.service`:

```typescript
import {
  createExam,
  getExamQuestions,
  listExams,
  submitExam,
} from './exams.service';
```

Append the route before `export { examsApp }`:

```typescript
examsApp.get('/:id/questions', async (c) => {
  const questions = await getExamQuestions(
    getDb(c.env.DB),
    c.get('userId'),
    c.req.param('id'),
  );
  return ok(c, { questions }, EXAM_MESSAGES.QUESTIONS_RETRIEVED);
});
```

- [ ] **Step 5: Run — confirm tests pass**

```bash
cd /path/to/backend && yarn test tests/modules/exams.test.ts
```

Expected: all exam tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/exams/exams.service.ts \
        backend/src/modules/exams/exams.routes.ts \
        backend/tests/modules/exams.test.ts
git commit -m "feat(exams): add GET /exams/:id/questions to serve exam paper without correct answers"
```

---

## Task 5: Final integration — run full test suite

- [ ] **Step 1: Run all tests**

```bash
cd /path/to/backend && yarn test
```

Expected: all tests pass, 0 failures.

- [ ] **Step 2: Lint check**

```bash
cd /path/to/project-root && yarn lint
```

Expected: no errors.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: verify all tests and lint pass after student missing APIs"
```

---

## Milestone Check

After completing all tasks, the following student APIs are available:

| Method | Path                   | Auth                   | Description                                                             |
| ------ | ---------------------- | ---------------------- | ----------------------------------------------------------------------- |
| `GET`  | `/auth/me`             | any authenticated user | Returns profile (no passwordHash)                                       |
| `GET`  | `/exams`               | student only           | Lists student's own exam sessions                                       |
| `GET`  | `/exams/:id/questions` | student only (owner)   | Returns exam questions + student answers, correctAnswer always stripped |
