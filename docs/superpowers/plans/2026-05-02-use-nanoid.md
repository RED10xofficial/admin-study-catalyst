# Replace UUID with Nanoid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `crypto.randomUUID()` with `nanoid` for generating IDs on the
backend, and update all Zod validators to accept nanoid strings instead of
UUIDs.

**Architecture:** We will update `backend/src/lib/id.ts` to use `nanoid()`
instead of `crypto.randomUUID()`. We will update all Zod schemas in
`shared/src/validators/` to remove `.uuid()` and use `.string().length(21)` or
just `.string()`. We will update OpenAPI specs to remove `format: 'uuid'`.

**Tech Stack:** Node.js, nanoid, Zod, Hono

---

### Task 1: Update ID generation to use nanoid

**Files:**

- Modify: `backend/src/lib/id.ts`
- Modify: `backend/src/lib/r2.ts`

- [ ] **Step 1: Update `backend/src/lib/id.ts`**

```typescript
import { nanoid } from 'nanoid';

export function generateId(): string {
  return nanoid();
}

export function now(): string {
  return new Date().toISOString();
}
```

- [ ] **Step 2: Update `backend/src/lib/r2.ts`**

```typescript
import { AwsClient } from 'aws4fetch';
import type { R2Bucket } from '@cloudflare/workers-types';
import { badRequest } from './errors';
import { nanoid } from 'nanoid';

export type UploadType = 'unit-image' | 'question-audio';

const ALLOWED_MIME: Record<UploadType, string[]> = {
  'unit-image': ['image/jpeg', 'image/png', 'image/webp'],
  'question-audio': ['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav'],
};

export type R2PresignConfig = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
};

export function isAllowedMime(type: UploadType, mimeType: string): boolean {
  return ALLOWED_MIME[type].includes(mimeType);
}

export function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replaceAll(/[^a-z0-9.-]/g, '-')
    .slice(0, 100);
}

export function buildR2Key(type: UploadType, filename: string): string {
  const safe = sanitizeFilename(filename);
  return `${type}/${nanoid()}/${safe}`;
}

// ... rest of the file remains unchanged ...
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/lib/id.ts backend/src/lib/r2.ts
git commit -m "feat: use nanoid for ID generation"
```

### Task 2: Update validators to remove .uuid()

**Files:**

- Modify: `shared/src/validators/admin.validators.ts`
- Modify: `shared/src/validators/auth.validators.ts`
- Modify: `shared/src/validators/book-codes.validators.ts`
- Modify: `shared/src/validators/exam-questions.validators.ts`
- Modify: `shared/src/validators/exam-types.validators.ts`
- Modify: `shared/src/validators/exams.validators.ts`
- Modify: `shared/src/validators/progress.validators.ts`
- Modify: `shared/src/validators/questions.validators.ts`
- Modify: `shared/src/validators/units.validators.ts`
- Modify: `shared/src/validators/upload.validators.ts`

- [ ] **Step 1: Replace `.uuid()` with `.string()` in all validators**

Update all validators in `shared/src/validators/` to use `.string()` instead of
`.string().uuid()`. This allows both existing UUIDs and new nanoids to be valid.

- [ ] **Step 2: Commit**

```bash
git add shared/src/validators/
git commit -m "feat: remove .uuid() from validators to support nanoid"
```

### Task 3: Update OpenAPI specs

**Files:**

- Modify: `backend/src/docs/openapi.ts`
- Modify: `backend/src/modules/content/content.routes.ts`

- [ ] **Step 1: Remove `format: 'uuid'` from OpenAPI specs**

Update `backend/src/docs/openapi.ts` to remove `format: 'uuid'` from all path
and query parameters.

- [ ] **Step 2: Update `backend/src/modules/content/content.routes.ts`**

Remove `.uuid()` from the validator in `content.routes.ts`.

- [ ] **Step 3: Run tests**

```bash
cd backend && yarn test
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/docs/openapi.ts backend/src/modules/content/content.routes.ts
git commit -m "feat: remove uuid format from openapi specs and routes"
```
