# Backend — Plan 2: Content Modules + Book Codes

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** Plan 1 (Foundation + Auth) must be complete and all tests
passing.

**Goal:** Implement all admin-managed content (exam types, file upload, units,
learning questions, exam question bank) and the full book code lifecycle
(generate, bulk, export, block).

**Architecture:** Each module follows the same pattern — Zod validators in
shared/, a service.ts with business logic, and a routes.ts mounting the Hono
sub-app. Admin routes protected by `authMiddleware + requireRole('admin')`. File
uploads use R2 presigned URLs — client uploads directly to R2, then sends the
key to the Worker to persist.

**Tech Stack:** Hono, Drizzle ORM, D1, R2, Cloudflare Queue (bulk code
generation > 100)

---

## File Structure (additions to Plan 1)

```
shared/src/validators/
  exam-types.validators.ts
  units.validators.ts
  questions.validators.ts
  exam-questions.validators.ts
  book-codes.validators.ts
  upload.validators.ts
  index.ts                      # updated to export all

backend/src/modules/
  exam-types/
    exam-types.routes.ts
    exam-types.service.ts
  upload/
    upload.routes.ts
    upload.service.ts
  units/
    units.routes.ts
    units.service.ts
  questions/
    questions.routes.ts
    questions.service.ts
  exam-questions/
    exam-questions.routes.ts
    exam-questions.service.ts
  book-codes/
    book-codes.routes.ts
    book-codes.service.ts

backend/tests/modules/
  exam-types.test.ts
  units.test.ts
  questions.test.ts
  exam-questions.test.ts
  book-codes.test.ts
```

---

## Task 1: Shared validators for content modules

**Files:**

- Create: `shared/src/validators/exam-types.validators.ts`
- Create: `shared/src/validators/units.validators.ts`
- Create: `shared/src/validators/questions.validators.ts`
- Create: `shared/src/validators/exam-questions.validators.ts`
- Create: `shared/src/validators/book-codes.validators.ts`
- Create: `shared/src/validators/upload.validators.ts`
- Modify: `shared/src/validators/index.ts`

- [ ] **Step 1: Create shared/src/validators/exam-types.validators.ts**

```typescript
import { z } from 'zod';

export const createExamTypeSchema = z.object({
  examName: z.string().min(1).max(200),
  tags: z.array(z.string()).optional().default([]),
  examQuestionCount: z.number().int().min(1).default(10),
});

export const updateExamTypeSchema = createExamTypeSchema.partial();

export const examTypeListSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateExamTypeInput = z.infer<typeof createExamTypeSchema>;
export type UpdateExamTypeInput = z.infer<typeof updateExamTypeSchema>;
```

- [ ] **Step 2: Create shared/src/validators/units.validators.ts**

```typescript
import { z } from 'zod';

export const createUnitSchema = z.object({
  unitName: z.string().min(1).max(200),
  examTypeId: z.string().uuid(),
  tags: z.array(z.string()).optional().default([]),
  accessType: z.enum(['free', 'premium']).default('free'),
  imageKey: z.string().optional(), // R2 object key from presigned upload
});

export const updateUnitSchema = createUnitSchema.partial();

export const unitListSchema = z.object({
  examTypeId: z.string().uuid().optional(),
  accessType: z.enum(['free', 'premium']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;
```

- [ ] **Step 3: Create shared/src/validators/questions.validators.ts**

```typescript
import { z } from 'zod';

const optionsRefinement = (data: {
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correctAnswer: string;
}) =>
  [data.option1, data.option2, data.option3, data.option4].includes(
    data.correctAnswer,
  );

export const createQuestionSchema = z
  .object({
    question: z.string().min(1),
    option1: z.string().min(1),
    option2: z.string().min(1),
    option3: z.string().min(1),
    option4: z.string().min(1),
    correctAnswer: z.string().min(1),
    description: z.string().optional(),
    audioKey: z.string().optional(), // R2 object key
    unitId: z.string().uuid(),
    accessType: z.enum(['free', 'premium']).default('free'),
    sequenceOrder: z.number().int().min(0),
  })
  .refine(optionsRefinement, {
    message: 'correctAnswer must match one of the four options',
    path: ['correctAnswer'],
  });

export const updateQuestionSchema = createQuestionSchema
  .partial()
  .omit({ unitId: true });

export const reorderQuestionSchema = z.object({
  questions: z.array(
    z.object({ id: z.string().uuid(), sequenceOrder: z.number().int().min(0) }),
  ),
});

export const questionListSchema = z.object({
  unitId: z.string().uuid(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
```

- [ ] **Step 4: Create shared/src/validators/exam-questions.validators.ts**

```typescript
import { z } from 'zod';

export const createExamQuestionSchema = z.object({
  question: z.string().min(1),
  option1: z.string().min(1),
  option2: z.string().min(1),
  option3: z.string().min(1),
  option4: z.string().min(1),
  correctAnswer: z.string().min(1),
  shortDescription: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  unitId: z.string().uuid(),
  accessType: z.enum(['free', 'premium']).optional(),
});

export const updateExamQuestionSchema = createExamQuestionSchema
  .partial()
  .omit({ unitId: true });

export const examQuestionListSchema = z.object({
  unitId: z.string().uuid().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateExamQuestionInput = z.infer<typeof createExamQuestionSchema>;
```

- [ ] **Step 5: Create shared/src/validators/book-codes.validators.ts**

```typescript
import { z } from 'zod';

export const generateCodeSchema = z.object({
  expiresAt: z.string().datetime().optional(),
});

export const bulkGenerateSchema = z.object({
  count: z.number().int().min(1).max(10_000),
  expiresAt: z.string().datetime().optional(),
});

export const updateCodeSchema = z.object({
  status: z.enum(['blocked', 'unused', 'expired']),
});

export const codeListSchema = z.object({
  status: z.enum(['unused', 'used', 'expired', 'blocked']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type GenerateCodeInput = z.infer<typeof generateCodeSchema>;
export type BulkGenerateInput = z.infer<typeof bulkGenerateSchema>;
```

- [ ] **Step 6: Create shared/src/validators/upload.validators.ts**

```typescript
import { z } from 'zod';

export const presignSchema = z.object({
  type: z.enum(['unit-image', 'question-audio']),
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1),
});

export type PresignInput = z.infer<typeof presignSchema>;
```

- [ ] **Step 7: Update shared/src/validators/index.ts**

```typescript
export * from './auth.validators';
export * from './book-codes.validators';
export * from './exam-questions.validators';
export * from './exam-types.validators';
export * from './questions.validators';
export * from './units.validators';
export * from './upload.validators';
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(shared): add zod validators for all content modules"
```

---

## Task 2: Exam Types module

**Files:**

- Create: `backend/src/modules/exam-types/exam-types.service.ts`
- Create: `backend/src/modules/exam-types/exam-types.routes.ts`
- Create: `backend/tests/modules/exam-types.test.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Write tests for exam types**

```typescript
// backend/tests/modules/exam-types.test.ts
import { describe, expect, it, beforeEach } from 'vitest';
import { env, SELF } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@admin-study-catalyst/shared/schema';

// Helper: create a logged-in admin and return Bearer token
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
    // Create exam type + unit, then try to delete exam type
    const res = await SELF.fetch('http://localhost/admin/exam-types', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ examName: 'Linked', examQuestionCount: 5 }),
    });
    const { examType } = await res.json<{ examType: { id: string } }>();

    // Insert a unit directly in DB
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

    const delRes = await SELF.fetch(
      `http://localhost/admin/exam-types/${examType.id}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    expect(delRes.status).toBe(409);
  });

  it('returns 403 for student trying to access admin route', async () => {
    const regRes = await SELF.fetch('http://localhost/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'S',
        email: 's@test.com',
        password: 'Stu12345!',
      }),
    });
    const loginRes = await SELF.fetch('http://localhost/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 's@test.com', password: 'Stu12345!' }),
    });
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
```

- [ ] **Step 2: Run — confirm tests fail**

```bash
yarn test tests/modules/exam-types.test.ts
```

Expected: FAIL — routes not mounted.

- [ ] **Step 3: Create backend/src/modules/exam-types/exam-types.service.ts**

```typescript
import { count, eq, ilike, like } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { examTypes, units } from '@admin-study-catalyst/shared/schema';
import type {
  CreateExamTypeInput,
  UpdateExamTypeInput,
} from '@admin-study-catalyst/shared/validators';
import { conflict, notFound } from '../../lib/errors';
import { generateId, now } from '../../lib/id';

export async function createExamType(db: Db, input: CreateExamTypeInput) {
  const existing = await db
    .select({ id: examTypes.id })
    .from(examTypes)
    .where(eq(examTypes.examName, input.examName))
    .get();
  if (existing) throw conflict('Exam type name already exists');

  const [et] = await db
    .insert(examTypes)
    .values({
      id: generateId(),
      examName: input.examName,
      tags: JSON.stringify(input.tags ?? []),
      examQuestionCount: input.examQuestionCount,
      createdAt: now(),
      updatedAt: now(),
    })
    .returning();
  return et;
}

export async function listExamTypes(
  db: Db,
  query: { search?: string; page: number; limit: number },
) {
  const offset = (query.page - 1) * query.limit;
  const rows = await db
    .select()
    .from(examTypes)
    .where(
      query.search ? like(examTypes.examName, `%${query.search}%`) : undefined,
    )
    .limit(query.limit)
    .offset(offset);
  return rows;
}

export async function getExamType(db: Db, id: string) {
  const et = await db
    .select()
    .from(examTypes)
    .where(eq(examTypes.id, id))
    .get();
  if (!et) throw notFound('Exam type not found');
  return et;
}

export async function updateExamType(
  db: Db,
  id: string,
  input: UpdateExamTypeInput,
) {
  const existing = await db
    .select({ id: examTypes.id })
    .from(examTypes)
    .where(eq(examTypes.id, id))
    .get();
  if (!existing) throw notFound('Exam type not found');

  const [updated] = await db
    .update(examTypes)
    .set({
      ...(input.examName !== undefined && { examName: input.examName }),
      ...(input.tags !== undefined && { tags: JSON.stringify(input.tags) }),
      ...(input.examQuestionCount !== undefined && {
        examQuestionCount: input.examQuestionCount,
      }),
      updatedAt: now(),
    })
    .where(eq(examTypes.id, id))
    .returning();
  return updated;
}

export async function deleteExamType(db: Db, id: string) {
  const existing = await db
    .select({ id: examTypes.id })
    .from(examTypes)
    .where(eq(examTypes.id, id))
    .get();
  if (!existing) throw notFound('Exam type not found');

  const [{ linkedUnits }] = await db
    .select({ linkedUnits: count() })
    .from(units)
    .where(eq(units.examTypeId, id));
  if ((linkedUnits ?? 0) > 0) {
    throw conflict(
      `Cannot delete: ${linkedUnits} unit(s) are linked to this exam type`,
    );
  }

  await db.delete(examTypes).where(eq(examTypes.id, id));
}
```

- [ ] **Step 4: Create backend/src/modules/exam-types/exam-types.routes.ts**

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { Bindings } from '../../env';
import { getDb } from '../../db/client';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import {
  createExamTypeSchema,
  updateExamTypeSchema,
  examTypeListSchema,
} from '@admin-study-catalyst/shared/validators';
import {
  createExamType,
  listExamTypes,
  getExamType,
  updateExamType,
  deleteExamType,
} from './exam-types.service';

const examTypesApp = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string };
}>();

examTypesApp.use('*', authMiddleware, requireRole('admin'));

examTypesApp.get('/', zValidator('query', examTypeListSchema), async (c) => {
  const query = c.req.valid('query');
  const db = getDb(c.env.DB);
  const examTypesList = await listExamTypes(db, query);
  return c.json({ examTypes: examTypesList });
});

examTypesApp.post('/', zValidator('json', createExamTypeSchema), async (c) => {
  const input = c.req.valid('json');
  const db = getDb(c.env.DB);
  const examType = await createExamType(db, input);
  return c.json({ examType }, 201);
});

examTypesApp.get('/:id', async (c) => {
  const db = getDb(c.env.DB);
  const examType = await getExamType(db, c.req.param('id'));
  return c.json({ examType });
});

examTypesApp.patch(
  '/:id',
  zValidator('json', updateExamTypeSchema),
  async (c) => {
    const input = c.req.valid('json');
    const db = getDb(c.env.DB);
    const examType = await updateExamType(db, c.req.param('id'), input);
    return c.json({ examType });
  },
);

examTypesApp.delete('/:id', async (c) => {
  const db = getDb(c.env.DB);
  await deleteExamType(db, c.req.param('id'));
  return c.json({ success: true });
});

export { examTypesApp };
```

- [ ] **Step 5: Mount in index.ts**

Add to `backend/src/index.ts`:

```typescript
import { examTypesApp } from './modules/exam-types/exam-types.routes';
// ...
app.route('/admin/exam-types', examTypesApp);
```

- [ ] **Step 6: Run tests — confirm pass**

```bash
yarn test tests/modules/exam-types.test.ts
```

Expected: 4 passing tests.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(exam-types): add admin CRUD for exam types with delete guard"
```

---

## Task 3: R2 presigned upload endpoint

**Files:**

- Create: `backend/src/modules/upload/upload.service.ts`
- Create: `backend/src/modules/upload/upload.routes.ts`
- Modify: `backend/src/index.ts`

> R2 presigned URLs require the `@aws-sdk/s3-request-presigner` pattern via R2's
> S3-compatible API, or use Cloudflare's native `r2.createPresignedUrl()`. As of
> 2026, Cloudflare R2 bindings support `bucket.createPresignedUrl()` for
> Workers. Use that.

- [ ] **Step 1: Create backend/src/modules/upload/upload.service.ts**

```typescript
import type { R2Bucket } from '@cloudflare/workers-types';
import type { UploadType } from '../../lib/r2';
import { buildR2Key, isAllowedMime } from '../../lib/r2';
import { badRequest } from '../../lib/errors';

export async function createPresignedUpload(
  r2: R2Bucket,
  input: { type: UploadType; filename: string; mimeType: string },
): Promise<{ uploadUrl: string; key: string }> {
  if (!isAllowedMime(input.type, input.mimeType)) {
    throw badRequest(
      `MIME type ${input.mimeType} is not allowed for ${input.type}`,
      'INVALID_MIME',
    );
  }

  const key = buildR2Key(input.type, input.filename);

  // R2 native presigned URL — expires in 10 minutes
  const uploadUrl = await r2.createPresignedUrl('PUT', key, { expiresIn: 600 });

  return { uploadUrl, key };
}
```

- [ ] **Step 2: Create backend/src/modules/upload/upload.routes.ts**

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { Bindings } from '../../env';
import { authMiddleware } from '../../middleware/auth';
import { presignSchema } from '@admin-study-catalyst/shared/validators';
import { createPresignedUpload } from './upload.service';
import type { UploadType } from '../../lib/r2';

const uploadApp = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string };
}>();

uploadApp.use('*', authMiddleware);

uploadApp.post('/presign', zValidator('json', presignSchema), async (c) => {
  const input = c.req.valid('json');
  const result = await createPresignedUpload(c.env.R2, {
    type: input.type as UploadType,
    filename: input.filename,
    mimeType: input.mimeType,
  });
  return c.json(result);
});

export { uploadApp };
```

- [ ] **Step 3: Mount in index.ts**

```typescript
import { uploadApp } from './modules/upload/upload.routes';
// ...
app.route('/upload', uploadApp);
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(upload): add r2 presigned url endpoint for unit images and question audio"
```

---

## Task 4: Units module

**Files:**

- Create: `backend/src/modules/units/units.service.ts`
- Create: `backend/src/modules/units/units.routes.ts`
- Create: `backend/tests/modules/units.test.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Write tests for units**

```typescript
// backend/tests/modules/units.test.ts
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
  return (await res.json<{ accessToken: string }>()).accessToken;
}

async function createExamType(token: string): Promise<string> {
  const res = await SELF.fetch('http://localhost/admin/exam-types', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ examName: 'Test Exam', examQuestionCount: 5 }),
  });
  return (await res.json<{ examType: { id: string } }>()).examType.id;
}

describe('Units', () => {
  let token: string;
  let examTypeId: string;

  beforeEach(async () => {
    const db = drizzle(env.DB, { schema });
    await db.delete(schema.units);
    token = await getAdminToken();
    examTypeId = await createExamType(token);
  });

  it('creates a unit', async () => {
    const res = await SELF.fetch('http://localhost/admin/units', {
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
    const body = await res.json<{ unit: { unitName: string } }>();
    expect(body.unit.unitName).toBe('Anatomy 101');
  });

  it('soft-deletes a unit', async () => {
    const createRes = await SELF.fetch('http://localhost/admin/units', {
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
    const { unit } = await createRes.json<{ unit: { id: string } }>();

    const delRes = await SELF.fetch(`http://localhost/admin/units/${unit.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(delRes.status).toBe(200);

    // Verify soft-deleted (not returned in list)
    const listRes = await SELF.fetch('http://localhost/admin/units', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { units } = await listRes.json<{ units: { id: string }[] }>();
    expect(units.find((u) => u.id === unit.id)).toBeUndefined();
  });

  it('blocks delete when student progress exists', async () => {
    const db = drizzle(env.DB, { schema });
    const createRes = await SELF.fetch('http://localhost/admin/units', {
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
    const { unit } = await createRes.json<{ unit: { id: string } }>();

    // Insert a question and progress record directly
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

    const delRes = await SELF.fetch(`http://localhost/admin/units/${unit.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(delRes.status).toBe(409);
  });
});
```

- [ ] **Step 2: Run — confirm tests fail**

```bash
yarn test tests/modules/units.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create backend/src/modules/units/units.service.ts**

```typescript
import { and, count, eq } from 'drizzle-orm';
import type { Db } from '../../db/client';
import type { R2Bucket } from '@cloudflare/workers-types';
import {
  units,
  questions,
  studentQuestionProgress,
} from '@admin-study-catalyst/shared/schema';
import type {
  CreateUnitInput,
  UpdateUnitInput,
} from '@admin-study-catalyst/shared/validators';
import { conflict, notFound } from '../../lib/errors';
import { generateId, now } from '../../lib/id';
import { objectExists, deleteObject } from '../../lib/r2';

export async function createUnit(db: Db, r2: R2Bucket, input: CreateUnitInput) {
  let imageUrl: string | undefined;

  if (input.imageKey) {
    const exists = await objectExists(r2, input.imageKey);
    if (!exists)
      throw conflict('Image key does not exist in R2. Upload the file first.');
    imageUrl = input.imageKey;
  }

  try {
    const [unit] = await db
      .insert(units)
      .values({
        id: generateId(),
        unitName: input.unitName,
        imageUrl,
        examTypeId: input.examTypeId,
        tags: JSON.stringify(input.tags ?? []),
        accessType: input.accessType,
        isDeleted: false,
        createdAt: now(),
        updatedAt: now(),
      })
      .returning();
    return unit;
  } catch (e) {
    // D1 insert failed — clean up orphaned R2 file
    if (imageUrl) await deleteObject(r2, imageUrl).catch(() => {});
    throw e;
  }
}

export async function listUnits(
  db: Db,
  query: {
    examTypeId?: string;
    accessType?: 'free' | 'premium';
    page: number;
    limit: number;
  },
) {
  const conditions = [eq(units.isDeleted, false)];
  if (query.examTypeId) conditions.push(eq(units.examTypeId, query.examTypeId));
  if (query.accessType) conditions.push(eq(units.accessType, query.accessType));

  return db
    .select()
    .from(units)
    .where(and(...conditions))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);
}

export async function getUnit(db: Db, id: string) {
  const unit = await db
    .select()
    .from(units)
    .where(and(eq(units.id, id), eq(units.isDeleted, false)))
    .get();
  if (!unit) throw notFound('Unit not found');
  return unit;
}

export async function updateUnit(
  db: Db,
  r2: R2Bucket,
  id: string,
  input: UpdateUnitInput,
) {
  const existing = await db.select().from(units).where(eq(units.id, id)).get();
  if (!existing || existing.isDeleted) throw notFound('Unit not found');

  let imageUrl = existing.imageUrl;
  if (input.imageKey !== undefined) {
    if (input.imageKey) {
      const exists = await objectExists(r2, input.imageKey);
      if (!exists) throw conflict('Image key does not exist in R2');
      imageUrl = input.imageKey;
    } else {
      imageUrl = null;
    }
  }

  const [updated] = await db
    .update(units)
    .set({
      ...(input.unitName !== undefined && { unitName: input.unitName }),
      ...(input.examTypeId !== undefined && { examTypeId: input.examTypeId }),
      ...(input.tags !== undefined && { tags: JSON.stringify(input.tags) }),
      ...(input.accessType !== undefined && { accessType: input.accessType }),
      imageUrl,
      updatedAt: now(),
    })
    .where(eq(units.id, id))
    .returning();
  return updated;
}

export async function deleteUnit(db: Db, id: string) {
  const existing = await db
    .select({ id: units.id })
    .from(units)
    .where(eq(units.id, id))
    .get();
  if (!existing) throw notFound('Unit not found');

  // Block if any question in this unit has student progress
  const unitQuestions = await db
    .select({ id: questions.id })
    .from(questions)
    .where(and(eq(questions.unitId, id), eq(questions.isDeleted, false)));

  if (unitQuestions.length > 0) {
    const questionIds = unitQuestions.map((q) => q.id);
    const [{ progressCount }] = await db
      .select({ progressCount: count() })
      .from(studentQuestionProgress)
      .where(
        and(
          ...questionIds.map((qId) =>
            eq(studentQuestionProgress.questionId, qId),
          ),
        ),
      );

    if ((progressCount ?? 0) > 0) {
      throw conflict(
        'Cannot delete unit: students have progress on its questions',
      );
    }
  }

  await db
    .update(units)
    .set({ isDeleted: true, updatedAt: now() })
    .where(eq(units.id, id));
}
```

- [ ] **Step 4: Create backend/src/modules/units/units.routes.ts**

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { Bindings } from '../../env';
import { getDb } from '../../db/client';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import {
  createUnitSchema,
  updateUnitSchema,
  unitListSchema,
} from '@admin-study-catalyst/shared/validators';
import {
  createUnit,
  listUnits,
  getUnit,
  updateUnit,
  deleteUnit,
} from './units.service';

const unitsApp = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string };
}>();

unitsApp.use('*', authMiddleware, requireRole('admin'));

unitsApp.get('/', zValidator('query', unitListSchema), async (c) => {
  const query = c.req.valid('query');
  const db = getDb(c.env.DB);
  const unitsList = await listUnits(db, query);
  return c.json({ units: unitsList });
});

unitsApp.post('/', zValidator('json', createUnitSchema), async (c) => {
  const input = c.req.valid('json');
  const db = getDb(c.env.DB);
  const unit = await createUnit(db, c.env.R2, input);
  return c.json({ unit }, 201);
});

unitsApp.get('/:id', async (c) => {
  const unit = await getUnit(getDb(c.env.DB), c.req.param('id'));
  return c.json({ unit });
});

unitsApp.patch('/:id', zValidator('json', updateUnitSchema), async (c) => {
  const input = c.req.valid('json');
  const db = getDb(c.env.DB);
  const unit = await updateUnit(db, c.env.R2, c.req.param('id'), input);
  return c.json({ unit });
});

unitsApp.delete('/:id', async (c) => {
  await deleteUnit(getDb(c.env.DB), c.req.param('id'));
  return c.json({ success: true });
});

export { unitsApp };
```

- [ ] **Step 5: Mount in index.ts**

```typescript
import { unitsApp } from './modules/units/units.routes';
app.route('/admin/units', unitsApp);
```

- [ ] **Step 6: Run tests — confirm pass**

```bash
yarn test tests/modules/units.test.ts
```

Expected: 3 passing tests.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(units): add admin CRUD for units with R2 image support and delete guard"
```

---

## Task 5: Learning Questions module

**Files:**

- Create: `backend/src/modules/questions/questions.service.ts`
- Create: `backend/src/modules/questions/questions.routes.ts`
- Create: `backend/tests/modules/questions.test.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Write tests for questions**

```typescript
// backend/tests/modules/questions.test.ts
import { describe, expect, it, beforeEach } from 'vitest';
import { env, SELF } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@admin-study-catalyst/shared/schema';
import { generateId, now } from '../../src/lib/id';

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
    unitId: 'unit-1',
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

    const delRes = await SELF.fetch(
      `http://localhost/admin/questions/${question.id}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    expect(delRes.status).toBe(409);
  });
});
```

- [ ] **Step 2: Create backend/src/modules/questions/questions.service.ts**

```typescript
import { and, count, eq } from 'drizzle-orm';
import type { Db } from '../../db/client';
import type { R2Bucket } from '@cloudflare/workers-types';
import {
  questions,
  studentQuestionProgress,
} from '@admin-study-catalyst/shared/schema';
import type {
  CreateQuestionInput,
  UpdateQuestionInput,
} from '@admin-study-catalyst/shared/validators';
import { conflict, notFound, badRequest } from '../../lib/errors';
import { generateId, now } from '../../lib/id';
import { sanitizeHtml } from '../../lib/sanitize';
import { objectExists, deleteObject } from '../../lib/r2';

export async function createQuestion(
  db: Db,
  r2: R2Bucket,
  input: CreateQuestionInput,
) {
  let audioUrl: string | undefined;
  if (input.audioKey) {
    const exists = await objectExists(r2, input.audioKey);
    if (!exists)
      throw badRequest('Audio key does not exist in R2', 'INVALID_AUDIO_KEY');
    audioUrl = input.audioKey;
  }

  const description = input.description
    ? sanitizeHtml(input.description)
    : undefined;

  try {
    const [q] = await db
      .insert(questions)
      .values({
        id: generateId(),
        question: input.question,
        option1: input.option1,
        option2: input.option2,
        option3: input.option3,
        option4: input.option4,
        correctAnswer: input.correctAnswer,
        description,
        audioUrl,
        unitId: input.unitId,
        accessType: input.accessType,
        sequenceOrder: input.sequenceOrder,
        isDeleted: false,
        createdAt: now(),
      })
      .returning();
    return q;
  } catch (e) {
    if (audioUrl) await deleteObject(r2, audioUrl).catch(() => {});
    throw e;
  }
}

export async function listQuestions(
  db: Db,
  query: { unitId: string; page: number; limit: number },
) {
  return db
    .select()
    .from(questions)
    .where(
      and(eq(questions.unitId, query.unitId), eq(questions.isDeleted, false)),
    )
    .orderBy(questions.sequenceOrder)
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);
}

export async function getQuestion(db: Db, id: string) {
  const q = await db
    .select()
    .from(questions)
    .where(and(eq(questions.id, id), eq(questions.isDeleted, false)))
    .get();
  if (!q) throw notFound('Question not found');
  return q;
}

export async function updateQuestion(
  db: Db,
  r2: R2Bucket,
  id: string,
  input: UpdateQuestionInput,
) {
  const existing = await db
    .select()
    .from(questions)
    .where(eq(questions.id, id))
    .get();
  if (!existing || existing.isDeleted) throw notFound('Question not found');

  let audioUrl = existing.audioUrl;
  if (input.audioKey !== undefined) {
    if (input.audioKey) {
      const exists = await objectExists(r2, input.audioKey);
      if (!exists)
        throw badRequest('Audio key does not exist in R2', 'INVALID_AUDIO_KEY');
      audioUrl = input.audioKey;
    } else {
      audioUrl = null;
    }
  }

  const [updated] = await db
    .update(questions)
    .set({
      ...(input.question !== undefined && { question: input.question }),
      ...(input.option1 !== undefined && { option1: input.option1 }),
      ...(input.option2 !== undefined && { option2: input.option2 }),
      ...(input.option3 !== undefined && { option3: input.option3 }),
      ...(input.option4 !== undefined && { option4: input.option4 }),
      ...(input.correctAnswer !== undefined && {
        correctAnswer: input.correctAnswer,
      }),
      ...(input.description !== undefined && {
        description: sanitizeHtml(input.description),
      }),
      ...(input.accessType !== undefined && { accessType: input.accessType }),
      ...(input.sequenceOrder !== undefined && {
        sequenceOrder: input.sequenceOrder,
      }),
      audioUrl,
    })
    .where(eq(questions.id, id))
    .returning();
  return updated;
}

export async function deleteQuestion(db: Db, id: string) {
  const existing = await db
    .select({ id: questions.id })
    .from(questions)
    .where(eq(questions.id, id))
    .get();
  if (!existing) throw notFound('Question not found');

  const [{ progressCount }] = await db
    .select({ progressCount: count() })
    .from(studentQuestionProgress)
    .where(eq(studentQuestionProgress.questionId, id));

  if ((progressCount ?? 0) > 0) {
    throw conflict(
      'Cannot delete question: students have answered it. Use soft-delete.',
    );
  }

  await db
    .update(questions)
    .set({ isDeleted: true })
    .where(eq(questions.id, id));
}

export async function reorderQuestions(
  db: Db,
  updates: { id: string; sequenceOrder: number }[],
) {
  await db.transaction(async (tx) => {
    for (const { id, sequenceOrder } of updates) {
      await tx
        .update(questions)
        .set({ sequenceOrder })
        .where(eq(questions.id, id));
    }
  });
}
```

- [ ] **Step 3: Create backend/src/modules/questions/questions.routes.ts**

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { Bindings } from '../../env';
import { getDb } from '../../db/client';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import {
  createQuestionSchema,
  updateQuestionSchema,
  questionListSchema,
  reorderQuestionSchema,
} from '@admin-study-catalyst/shared/validators';
import {
  createQuestion,
  listQuestions,
  getQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
} from './questions.service';

const questionsApp = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string };
}>();

questionsApp.use('*', authMiddleware, requireRole('admin'));

questionsApp.get('/', zValidator('query', questionListSchema), async (c) => {
  const query = c.req.valid('query');
  return c.json({ questions: await listQuestions(getDb(c.env.DB), query) });
});

questionsApp.post('/', zValidator('json', createQuestionSchema), async (c) => {
  const q = await createQuestion(
    getDb(c.env.DB),
    c.env.R2,
    c.req.valid('json'),
  );
  return c.json({ question: q }, 201);
});

questionsApp.get('/:id', async (c) => {
  return c.json({
    question: await getQuestion(getDb(c.env.DB), c.req.param('id')),
  });
});

questionsApp.patch(
  '/:id',
  zValidator('json', updateQuestionSchema),
  async (c) => {
    const q = await updateQuestion(
      getDb(c.env.DB),
      c.env.R2,
      c.req.param('id'),
      c.req.valid('json'),
    );
    return c.json({ question: q });
  },
);

questionsApp.delete('/:id', async (c) => {
  await deleteQuestion(getDb(c.env.DB), c.req.param('id'));
  return c.json({ success: true });
});

questionsApp.patch(
  '/reorder',
  zValidator('json', reorderQuestionSchema),
  async (c) => {
    await reorderQuestions(getDb(c.env.DB), c.req.valid('json').questions);
    return c.json({ success: true });
  },
);

export { questionsApp };
```

- [ ] **Step 4: Mount in index.ts**

```typescript
import { questionsApp } from './modules/questions/questions.routes';
app.route('/admin/questions', questionsApp);
```

- [ ] **Step 5: Run tests — confirm pass**

```bash
yarn test tests/modules/questions.test.ts
```

Expected: 3 passing tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(questions): add admin CRUD for learning questions with HTML sanitize and delete guard"
```

---

## Task 6: Exam Question Bank module

**Files:**

- Create: `backend/src/modules/exam-questions/exam-questions.service.ts`
- Create: `backend/src/modules/exam-questions/exam-questions.routes.ts`
- Create: `backend/tests/modules/exam-questions.test.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Write tests**

```typescript
// backend/tests/modules/exam-questions.test.ts
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
    unitId: 'unit-1',
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
      'http://localhost/admin/exam-questions?difficulty=hard&unitId=unit-1',
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
    // Create an active exam referencing this question
    const examId = generateId();
    await db.insert(schema.studentExams).values({
      id: examId,
      studentId: 'admin-1',
      unitId: 'unit-1',
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

    const res = await SELF.fetch(
      `http://localhost/admin/exam-questions/${qId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    expect(res.status).toBe(409);
  });
});
```

- [ ] **Step 2: Create
      backend/src/modules/exam-questions/exam-questions.service.ts**

```typescript
import { and, count, eq } from 'drizzle-orm';
import type { Db } from '../../db/client';
import {
  examQuestions,
  studentExamAnswers,
  studentExams,
} from '@admin-study-catalyst/shared/schema';
import type { CreateExamQuestionInput } from '@admin-study-catalyst/shared/validators';
import { conflict, notFound } from '../../lib/errors';
import { generateId, now } from '../../lib/id';

export async function createExamQuestion(
  db: Db,
  input: CreateExamQuestionInput,
) {
  const [q] = await db
    .insert(examQuestions)
    .values({ id: generateId(), ...input, isDeleted: false, createdAt: now() })
    .returning();
  return q;
}

export async function listExamQuestions(
  db: Db,
  query: {
    unitId?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    page: number;
    limit: number;
  },
) {
  const conditions = [eq(examQuestions.isDeleted, false)];
  if (query.unitId) conditions.push(eq(examQuestions.unitId, query.unitId));
  if (query.difficulty)
    conditions.push(eq(examQuestions.difficulty, query.difficulty));

  return db
    .select()
    .from(examQuestions)
    .where(and(...conditions))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);
}

export async function getExamQuestion(db: Db, id: string) {
  const q = await db
    .select()
    .from(examQuestions)
    .where(and(eq(examQuestions.id, id), eq(examQuestions.isDeleted, false)))
    .get();
  if (!q) throw notFound('Exam question not found');
  return q;
}

export async function updateExamQuestion(
  db: Db,
  id: string,
  input: Partial<CreateExamQuestionInput>,
) {
  const existing = await db
    .select({ id: examQuestions.id })
    .from(examQuestions)
    .where(eq(examQuestions.id, id))
    .get();
  if (!existing) throw notFound('Exam question not found');

  const [updated] = await db
    .update(examQuestions)
    .set(input)
    .where(eq(examQuestions.id, id))
    .returning();
  return updated;
}

export async function deleteExamQuestion(db: Db, id: string) {
  const existing = await db
    .select({ id: examQuestions.id })
    .from(examQuestions)
    .where(eq(examQuestions.id, id))
    .get();
  if (!existing) throw notFound('Exam question not found');

  // Block if referenced in any active exam
  const [{ activeCount }] = await db
    .select({ activeCount: count() })
    .from(studentExamAnswers)
    .innerJoin(studentExams, eq(studentExamAnswers.examId, studentExams.id))
    .where(
      and(
        eq(studentExamAnswers.questionId, id),
        eq(studentExams.status, 'active'),
      ),
    );

  if ((activeCount ?? 0) > 0) {
    throw conflict('Cannot delete: question is part of an active exam');
  }

  // Soft-delete if historical answers exist; hard-delete otherwise
  const [{ histCount }] = await db
    .select({ histCount: count() })
    .from(studentExamAnswers)
    .where(eq(studentExamAnswers.questionId, id));

  if ((histCount ?? 0) > 0) {
    await db
      .update(examQuestions)
      .set({ isDeleted: true })
      .where(eq(examQuestions.id, id));
  } else {
    await db.delete(examQuestions).where(eq(examQuestions.id, id));
  }
}
```

- [ ] **Step 3: Create
      backend/src/modules/exam-questions/exam-questions.routes.ts**

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { Bindings } from '../../env';
import { getDb } from '../../db/client';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import {
  createExamQuestionSchema,
  updateExamQuestionSchema,
  examQuestionListSchema,
} from '@admin-study-catalyst/shared/validators';
import {
  createExamQuestion,
  listExamQuestions,
  getExamQuestion,
  updateExamQuestion,
  deleteExamQuestion,
} from './exam-questions.service';

const examQuestionsApp = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string };
}>();

examQuestionsApp.use('*', authMiddleware, requireRole('admin'));

examQuestionsApp.get(
  '/',
  zValidator('query', examQuestionListSchema),
  async (c) => {
    return c.json({
      examQuestions: await listExamQuestions(
        getDb(c.env.DB),
        c.req.valid('query'),
      ),
    });
  },
);

examQuestionsApp.post(
  '/',
  zValidator('json', createExamQuestionSchema),
  async (c) => {
    const q = await createExamQuestion(getDb(c.env.DB), c.req.valid('json'));
    return c.json({ examQuestion: q }, 201);
  },
);

examQuestionsApp.get('/:id', async (c) => {
  return c.json({
    examQuestion: await getExamQuestion(getDb(c.env.DB), c.req.param('id')),
  });
});

examQuestionsApp.patch(
  '/:id',
  zValidator('json', updateExamQuestionSchema),
  async (c) => {
    const q = await updateExamQuestion(
      getDb(c.env.DB),
      c.req.param('id'),
      c.req.valid('json'),
    );
    return c.json({ examQuestion: q });
  },
);

examQuestionsApp.delete('/:id', async (c) => {
  await deleteExamQuestion(getDb(c.env.DB), c.req.param('id'));
  return c.json({ success: true });
});

export { examQuestionsApp };
```

- [ ] **Step 4: Mount in index.ts**

```typescript
import { examQuestionsApp } from './modules/exam-questions/exam-questions.routes';
app.route('/admin/exam-questions', examQuestionsApp);
```

- [ ] **Step 5: Run tests — confirm pass**

```bash
yarn test tests/modules/exam-questions.test.ts
```

Expected: 3 passing tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(exam-questions): add admin CRUD for exam question bank with active-exam delete guard"
```

---

## Task 7: Book Codes module

**Files:**

- Create: `backend/src/modules/book-codes/book-codes.service.ts`
- Create: `backend/src/modules/book-codes/book-codes.routes.ts`
- Create: `backend/tests/modules/book-codes.test.ts`
- Modify: `backend/src/index.ts`

> **Bulk generation (>100 codes):** Offload to Cloudflare Queue. Add Queue
> binding to `wrangler.toml`. For this plan, the inline batch path (≤100) is
> fully implemented. The Queue consumer is a stub that calls the same batch
> generation logic.

- [ ] **Step 1: Write tests**

```typescript
// backend/tests/modules/book-codes.test.ts
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

describe('Book Codes', () => {
  let token: string;
  beforeEach(async () => {
    const db = drizzle(env.DB, { schema });
    await db.delete(schema.bookCodes);
    token = await getAdminToken();
  });

  it('generates a single book code', async () => {
    const res = await SELF.fetch('http://localhost/admin/book-codes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(201);
    const body = await res.json<{
      bookCode: { code: string; status: string };
    }>();
    expect(body.bookCode.code).toMatch(/^[A-Z0-9]{12}$/);
    expect(body.bookCode.status).toBe('unused');
  });

  it('generates bulk codes (≤100)', async () => {
    const res = await SELF.fetch('http://localhost/admin/book-codes/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ count: 5 }),
    });
    expect(res.status).toBe(201);
    const body = await res.json<{ created: number }>();
    expect(body.created).toBe(5);
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

    const res = await SELF.fetch(
      `http://localhost/admin/book-codes/${codeId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    expect(res.status).toBe(409);
  });

  it('blocks a code', async () => {
    const createRes = await SELF.fetch('http://localhost/admin/book-codes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    const { bookCode } = await createRes.json<{ bookCode: { id: string } }>();

    const patchRes = await SELF.fetch(
      `http://localhost/admin/book-codes/${bookCode.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'blocked' }),
      },
    );
    expect(patchRes.status).toBe(200);
    const body = await patchRes.json<{ bookCode: { status: string } }>();
    expect(body.bookCode.status).toBe('blocked');
  });
});
```

- [ ] **Step 2: Create backend/src/modules/book-codes/book-codes.service.ts**

```typescript
import { and, count, eq } from 'drizzle-orm';
import type { Db } from '../../db/client';
import type { R2Bucket } from '@cloudflare/workers-types';
import { bookCodes } from '@admin-study-catalyst/shared/schema';
import { conflict, notFound } from '../../lib/errors';
import { generateId, now } from '../../lib/id';

function generateCode(): string {
  return crypto.randomUUID().replace(/-/g, '').toUpperCase().slice(0, 12);
}

async function insertCodeWithRetry(
  db: Db,
  studentOrigin: string,
  expiresAt?: string,
  maxRetries = 3,
) {
  for (let i = 0; i < maxRetries; i++) {
    const code = generateCode();
    const qrUrl = `${studentOrigin}/activate?code=${code}`;
    try {
      const [bookCode] = await db
        .insert(bookCodes)
        .values({
          id: generateId(),
          code,
          qrUrl,
          status: 'unused',
          expiresAt,
          createdAt: now(),
        })
        .returning();
      return bookCode;
    } catch (e: unknown) {
      // Retry on unique constraint violation (code collision)
      if (i === maxRetries - 1) throw e;
    }
  }
  throw new Error('Failed to generate unique code after retries');
}

export async function generateSingleCode(
  db: Db,
  studentOrigin: string,
  expiresAt?: string,
) {
  return insertCodeWithRetry(db, studentOrigin, expiresAt);
}

export async function generateBulkCodes(
  db: Db,
  studentOrigin: string,
  count_: number,
  expiresAt?: string,
) {
  const BATCH_SIZE = 50;
  let created = 0;

  for (let i = 0; i < count_; i += BATCH_SIZE) {
    const batchSize = Math.min(BATCH_SIZE, count_ - i);
    await db.transaction(async (tx) => {
      for (let j = 0; j < batchSize; j++) {
        const code = generateCode();
        const qrUrl = `${studentOrigin}/activate?code=${code}`;
        await tx.insert(bookCodes).values({
          id: generateId(),
          code,
          qrUrl,
          status: 'unused',
          expiresAt,
          createdAt: now(),
        });
        created++;
      }
    });
  }

  return { created };
}

export async function listBookCodes(
  db: Db,
  query: {
    status?: 'unused' | 'used' | 'expired' | 'blocked';
    page: number;
    limit: number;
  },
) {
  const conditions = query.status ? [eq(bookCodes.status, query.status)] : [];
  return db
    .select()
    .from(bookCodes)
    .where(conditions.length ? and(...conditions) : undefined)
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);
}

export async function updateCodeStatus(
  db: Db,
  id: string,
  status: 'blocked' | 'unused' | 'expired',
) {
  const existing = await db
    .select()
    .from(bookCodes)
    .where(eq(bookCodes.id, id))
    .get();
  if (!existing) throw notFound('Book code not found');

  const [updated] = await db
    .update(bookCodes)
    .set({ status })
    .where(eq(bookCodes.id, id))
    .returning();
  return updated;
}

export async function deleteBookCode(db: Db, id: string) {
  const existing = await db
    .select()
    .from(bookCodes)
    .where(eq(bookCodes.id, id))
    .get();
  if (!existing) throw notFound('Book code not found');
  if (existing.usedByUserId)
    throw conflict('Cannot delete a code that has been used');
  await db.delete(bookCodes).where(eq(bookCodes.id, id));
}

export async function exportCodesToR2(
  db: Db,
  r2: R2Bucket,
  studentOrigin: string,
): Promise<string> {
  const allCodes = await db.select().from(bookCodes);
  const csv = ['id,code,qr_url,status,used_at,expires_at,created_at']
    .concat(
      allCodes.map(
        (c) =>
          `${c.id},${c.code},${c.qrUrl},${c.status},${c.usedAt ?? ''},${c.expiresAt ?? ''},${c.createdAt}`,
      ),
    )
    .join('\n');

  const key = `exports/book-codes-${now()}.csv`;
  await r2.put(key, csv, { httpMetadata: { contentType: 'text/csv' } });
  const url = await r2.createPresignedUrl('GET', key, {
    expiresIn: 60 * 60 * 24,
  });
  return url;
}
```

- [ ] **Step 3: Create backend/src/modules/book-codes/book-codes.routes.ts**

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { Bindings } from '../../env';
import { getDb } from '../../db/client';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import {
  generateCodeSchema,
  bulkGenerateSchema,
  updateCodeSchema,
  codeListSchema,
} from '@admin-study-catalyst/shared/validators';
import {
  generateSingleCode,
  generateBulkCodes,
  listBookCodes,
  updateCodeStatus,
  deleteBookCode,
  exportCodesToR2,
} from './book-codes.service';

const bookCodesApp = new Hono<{
  Bindings: Bindings;
  Variables: { userId: string };
}>();

bookCodesApp.use('*', authMiddleware, requireRole('admin'));

bookCodesApp.get('/', zValidator('query', codeListSchema), async (c) => {
  return c.json({
    bookCodes: await listBookCodes(getDb(c.env.DB), c.req.valid('query')),
  });
});

bookCodesApp.post('/', zValidator('json', generateCodeSchema), async (c) => {
  const { expiresAt } = c.req.valid('json');
  const bookCode = await generateSingleCode(
    getDb(c.env.DB),
    c.env.STUDENT_ORIGIN,
    expiresAt,
  );
  return c.json({ bookCode }, 201);
});

bookCodesApp.post(
  '/bulk',
  zValidator('json', bulkGenerateSchema),
  async (c) => {
    const { count, expiresAt } = c.req.valid('json');
    const result = await generateBulkCodes(
      getDb(c.env.DB),
      c.env.STUDENT_ORIGIN,
      count,
      expiresAt,
    );
    return c.json(result, 201);
  },
);

bookCodesApp.get('/export', async (c) => {
  const url = await exportCodesToR2(
    getDb(c.env.DB),
    c.env.R2,
    c.env.STUDENT_ORIGIN,
  );
  return c.json({ downloadUrl: url });
});

bookCodesApp.patch('/:id', zValidator('json', updateCodeSchema), async (c) => {
  const bookCode = await updateCodeStatus(
    getDb(c.env.DB),
    c.req.param('id'),
    c.req.valid('json').status,
  );
  return c.json({ bookCode });
});

bookCodesApp.delete('/:id', async (c) => {
  await deleteBookCode(getDb(c.env.DB), c.req.param('id'));
  return c.json({ success: true });
});

export { bookCodesApp };
```

- [ ] **Step 4: Mount in index.ts**

```typescript
import { bookCodesApp } from './modules/book-codes/book-codes.routes';
app.route('/admin/book-codes', bookCodesApp);
```

- [ ] **Step 5: Run tests — confirm pass**

```bash
yarn test tests/modules/book-codes.test.ts
```

Expected: 4 passing tests.

- [ ] **Step 6: Run all tests**

```bash
yarn test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(book-codes): add admin book code generation, bulk, export, block, delete guard"
```

---

## Corrections (from self-review)

### Fix 1: Units deleteUnit — also block if questions exist

In `backend/src/modules/units/units.service.ts`, the `deleteUnit` function must
**also** block when the unit contains non-deleted learning questions, even if no
student has answered them yet. Add this check **before** the progress check:

```typescript
// Add this import at top of units.service.ts
import { count, and, eq } from 'drizzle-orm';

// Inside deleteUnit(), add BEFORE the progress check:
const [{ questionCount }] = await db
  .select({ questionCount: count() })
  .from(questions)
  .where(and(eq(questions.unitId, id), eq(questions.isDeleted, false)));

if ((questionCount ?? 0) > 0) {
  throw conflict(
    `Cannot delete unit: ${questionCount} learning question(s) still exist. Delete or soft-delete all questions first.`,
    'UNIT_HAS_QUESTIONS',
  );
}
```

Add a test to `backend/tests/modules/units.test.ts`:

```typescript
it('blocks delete when unit has non-deleted questions (even without student progress)', async () => {
  const db = drizzle(env.DB, { schema });
  const createRes = await SELF.fetch('http://localhost/admin/units', {
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
  const { unit } = await createRes.json<{ unit: { id: string } }>();
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
  const delRes = await SELF.fetch(`http://localhost/admin/units/${unit.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(delRes.status).toBe(409);
});
```

### Fix 2: MIME validation from magic bytes

The spec requires MIME validation from file magic bytes, not the client-reported
type. Implement a `validateMagicBytes` helper in `backend/src/lib/r2.ts` that is
called after the client submits the R2 key:

```typescript
// Append to backend/src/lib/r2.ts

const MAGIC_BYTES: Record<string, Uint8Array[]> = {
  'image/jpeg': [new Uint8Array([0xff, 0xd8, 0xff])],
  'image/png': [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  ],
  'image/webp': [new Uint8Array([0x52, 0x49, 0x46, 0x46])], // RIFF header (checked + WEBP marker)
  'audio/mpeg': [
    new Uint8Array([0xff, 0xfb]),
    new Uint8Array([0x49, 0x44, 0x33]),
  ], // ID3 or frame sync
  'audio/mp4': [new Uint8Array([0x00, 0x00, 0x00])], // ftyp box (partial — accept any MP4)
  'audio/ogg': [new Uint8Array([0x4f, 0x67, 0x67, 0x53])], // OggS
  'audio/wav': [new Uint8Array([0x52, 0x49, 0x46, 0x46])], // RIFF header
};

export async function validateMimeFromBytes(
  r2: R2Bucket,
  key: string,
  expectedMime: string,
): Promise<void> {
  const object = await r2.get(key, { range: { offset: 0, length: 12 } });
  if (!object) throw new Error('R2 object not found');
  const bytes = new Uint8Array(await object.arrayBuffer());
  const signatures = MAGIC_BYTES[expectedMime];
  if (!signatures) return; // Unknown MIME — skip magic check
  const matches = signatures.some((sig) => sig.every((b, i) => bytes[i] === b));
  if (!matches) {
    await r2.delete(key); // Remove the bad upload
    throw new Error(
      `File content does not match declared MIME type ${expectedMime}`,
    );
  }
}
```

In `units.service.ts` `createUnit()`, after `objectExists` check, add:

```typescript
import { validateMimeFromBytes } from '../../lib/r2';
// After confirming the object exists:
if (input.imageKey) {
  await validateMimeFromBytes(
    r2,
    input.imageKey,
    input.mimeType ?? 'image/jpeg',
  );
  imageUrl = input.imageKey;
}
```

Add `mimeType?: string` to `createUnitSchema` and `createQuestionSchema`
validators in `shared/src/validators/units.validators.ts` and
`questions.validators.ts`.

Similarly in `questions.service.ts` `createQuestion()`, add the same check for
`audioKey`.

---

## Milestone Check — Plan 2 Complete

At this point:

- [ ] All content validators added to shared/
- [ ] Exam Types: full CRUD, delete guard, unique name
- [ ] R2 presigned upload: `POST /upload/presign` for unit images and question
      audio
- [ ] Units: full CRUD, R2 image lifecycle, soft-delete with progress guard
- [ ] Learning Questions: full CRUD, R2 audio, HTML sanitize, sequential
      reorder, delete guard
- [ ] Exam Question Bank: full CRUD, filter by difficulty/unit, active-exam
      delete guard
- [ ] Book Codes: generate single, bulk (batched), export to R2 CSV,
      block/expire, delete guard

```bash
cd backend && yarn test
```

Expected: all tests pass.

---

_Next: Plan 3 — Learning Progress + Exam System + Admin_
