# Medical LMS — Full System Design Spec

**Date:** 2026-05-01  
**Repo:** admin-study-catalyst  
**Status:** Approved for implementation planning

---

## 1. System Overview

A Medical Learning Management System for students preparing for competitive exams (e.g. EMREE). Learning is question-driven and sequential. Membership determines content access. The system is fully admin-managed with no self-service content creation.

**Two distinct user experiences, one codebase:**
- **Admin Portal** — content management, student monitoring, membership control, analytics
- **Student Portal** — sequential learning, exam attempts, membership upgrade

---

## 2. Architecture Decisions

### 2.1 Project Structure

```
admin-study-catalyst/
  frontend/       # Vue 3 app — two build targets
  backend/        # Hono Worker — modular monolithic
  shared/         # TypeScript types, Zod validators, Drizzle schema
```

### 2.2 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vue 3 + Vite + TypeScript |
| Backend | Hono + Cloudflare Workers + TypeScript |
| Database | Cloudflare D1 (SQLite) |
| ORM | Drizzle ORM |
| Cache | Cloudflare KV |
| Object Storage | Cloudflare R2 |
| Testing | Vitest |

### 2.3 Frontend Build Targets

The `frontend/` folder produces **two separate Vite build outputs** deployed to two Cloudflare Pages projects:

- `frontend/src/admin/` → Admin SPA (deployed to admin Pages project)
- `frontend/src/student/` → Student SPA (deployed to student Pages project)
- `frontend/src/shared/` → Shared components, composables, API client

### 2.4 Backend Module Structure

Modular monolithic. One Cloudflare Worker. Each domain is a Hono sub-app mounted on the root:

```
backend/src/
  modules/
    auth/           routes.ts | service.ts
    users/          routes.ts | service.ts
    book-codes/     routes.ts | service.ts
    exam-types/     routes.ts | service.ts
    units/          routes.ts | service.ts
    questions/      routes.ts | service.ts
    exam-questions/ routes.ts | service.ts
    progress/       routes.ts | service.ts
    exams/          routes.ts | service.ts
    analytics/      routes.ts | service.ts
  middleware/
    auth.ts         # JWT verification
    rbac.ts         # Role + membership enforcement
    validation.ts   # Zod request validation
  db/
    schema.ts       # Drizzle schema (re-exported from shared/)
    migrations/
  lib/
    r2.ts           # R2 upload helpers
    kv.ts           # KV cache helpers
    errors.ts       # Typed error responses
    crypto.ts       # Web Crypto API wrappers (bcrypt, JWT)
  index.ts          # Root app — mounts all modules
```

### 2.5 Authentication Strategy

- **Access token:** Short-lived JWT (15 min), returned in response body, stored in memory by client
- **Refresh token:** Long-lived opaque token, stored in Cloudflare KV, delivered via `httpOnly` cookie
- **Token rotation:** New refresh token issued on each refresh; old token deleted from KV
- **Logout:** Deletes KV refresh entry + clears cookie
- **Role and membership_type are NOT stored in JWT claims.** Always fetched from D1/KV on protected routes to prevent stale claim attacks.

### 2.6 CORS

Worker CORS middleware reads allowed origins from environment variables:
- `ADMIN_ORIGIN` — admin Pages deployment URL
- `STUDENT_ORIGIN` — student Pages deployment URL

Both origins are allowlisted. Credentials (`httpOnly` cookie) are enabled.

---

## 3. Data Model

### 3.1 users

```sql
id                 TEXT PRIMARY KEY
name               TEXT NOT NULL
email              TEXT UNIQUE NOT NULL
phone              TEXT
password_hash      TEXT NOT NULL
role               TEXT NOT NULL CHECK (role IN ('admin', 'student'))
membership_type    TEXT NOT NULL DEFAULT 'normal' CHECK (membership_type IN ('normal', 'premium'))
membership_source  TEXT CHECK (membership_source IN ('direct_registration', 'book_qr', 'manual_upgrade'))
is_active          INTEGER NOT NULL DEFAULT 1
created_at         TEXT NOT NULL
updated_at         TEXT NOT NULL
```

**Rules:**
- `role` is always set server-side. Never accepted from client.
- Students register themselves. Admins are created via seed data only.
- Deletion is soft-only (`is_active = 0`). Hard delete is not permitted.
- The book code a student used is found via `book_codes.used_by_user_id` — no FK from `users` back to `book_codes` (avoids circular reference).

### 3.2 book_codes

```sql
id               TEXT PRIMARY KEY
code             TEXT UNIQUE NOT NULL
qr_url           TEXT NOT NULL
status           TEXT NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'used', 'expired', 'blocked'))
used_by_user_id  TEXT UNIQUE REFERENCES users(id)
used_at          TEXT
expires_at       TEXT
created_at       TEXT NOT NULL
```

**Rules:**
- `UNIQUE` on `used_by_user_id` enforces one-code-per-user at DB level.
- `qr_url` encodes `{STUDENT_ORIGIN}/activate?code={code}`. This URL must never change.
- Codes normalized to UPPERCASE on generation and input.
- Used codes cannot be hard-deleted.

### 3.3 exam_types

```sql
id                    TEXT PRIMARY KEY
exam_name             TEXT UNIQUE NOT NULL
tags                  TEXT  -- JSON array
exam_question_count   INTEGER NOT NULL DEFAULT 10  -- admin-configured per exam
created_at            TEXT NOT NULL
updated_at            TEXT NOT NULL
```

**Note:** `exam_question_count` is stored here. Admin sets it per exam type.

### 3.4 units

```sql
id             TEXT PRIMARY KEY
unit_name      TEXT NOT NULL
image_url      TEXT
exam_type_id   TEXT NOT NULL REFERENCES exam_types(id)
tags           TEXT  -- JSON array
access_type    TEXT NOT NULL DEFAULT 'free' CHECK (access_type IN ('free', 'premium'))
is_deleted     INTEGER NOT NULL DEFAULT 0
created_at     TEXT NOT NULL
updated_at     TEXT NOT NULL
```

**Rules:**
- Soft-delete only (`is_deleted = 1`). Hard delete blocked if student progress exists.
- `image_url` references R2 object key. R2 upload must succeed before INSERT.

### 3.5 questions (learning questions)

```sql
id              TEXT PRIMARY KEY
question        TEXT NOT NULL
option1         TEXT NOT NULL
option2         TEXT NOT NULL
option3         TEXT NOT NULL
option4         TEXT NOT NULL
correct_answer  TEXT NOT NULL CHECK (correct_answer IN (option1, option2, option3, option4))  -- enforced via Zod
description     TEXT  -- sanitized HTML
audio_url       TEXT
unit_id         TEXT NOT NULL REFERENCES units(id)
access_type     TEXT NOT NULL DEFAULT 'free' CHECK (access_type IN ('free', 'premium'))
sequence_order  INTEGER NOT NULL  -- explicit order field for sequential progression
is_deleted      INTEGER NOT NULL DEFAULT 0
created_at      TEXT NOT NULL
```

**Rules:**
- `correct_answer` must equal one of option1–4. Enforced by Zod in shared schema.
- `description` HTML sanitized server-side before storage.
- Soft-delete only. Hard delete blocked if student progress records exist.
- `sequence_order` drives sequential unlocking. Gaps are prevented — reorder required before delete.

### 3.6 exam_questions

```sql
id                TEXT PRIMARY KEY
question          TEXT NOT NULL
option1           TEXT NOT NULL
option2           TEXT NOT NULL
option3           TEXT NOT NULL
option4           TEXT NOT NULL
correct_answer    TEXT NOT NULL
short_description TEXT
difficulty        TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard'))
unit_id           TEXT NOT NULL REFERENCES units(id)
access_type       TEXT
is_deleted        INTEGER NOT NULL DEFAULT 0
created_at        TEXT NOT NULL
```

**Rules:**
- Soft-delete only. Hard delete blocked if question is in an active exam or has historical answers.

### 3.7 student_question_progress

```sql
id           TEXT PRIMARY KEY
student_id   TEXT NOT NULL REFERENCES users(id)
question_id  TEXT NOT NULL REFERENCES questions(id)
status       TEXT NOT NULL DEFAULT 'answered' CHECK (status IN ('answered'))
answered_at  TEXT NOT NULL
UNIQUE (student_id, question_id)
```

**Rules:**
- Any answer (right or wrong) creates a progress record.
- Idempotent upsert: `INSERT OR IGNORE` — double-submits are safe.
- A unit is "complete" when the count of answered questions equals the count of non-deleted questions in the unit.

### 3.8 student_exams

```sql
id               TEXT PRIMARY KEY
student_id       TEXT NOT NULL REFERENCES users(id)
unit_id          TEXT NOT NULL REFERENCES units(id)
difficulty       TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard'))
score            INTEGER
total_questions  INTEGER NOT NULL
correct_answers  INTEGER
status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'submitted', 'abandoned'))
started_at       TEXT NOT NULL
submitted_at     TEXT
UNIQUE (student_id, unit_id)  -- enforces no retakes
```

**Rules:**
- `UNIQUE (student_id, unit_id)` enforces no retakes at DB level.
- Exam creation blocked if student has not completed all learning questions in the unit.
- Exam creation blocked if student already has a record for this unit (even if abandoned).
- Abandoned exams auto-set by a scheduled Worker cron after 24 hours.

### 3.9 student_exam_answers

```sql
id               TEXT PRIMARY KEY
exam_id          TEXT NOT NULL REFERENCES student_exams(id)
question_id      TEXT NOT NULL REFERENCES exam_questions(id)
selected_answer  TEXT
is_correct       INTEGER NOT NULL DEFAULT 0
answered_at      TEXT NOT NULL
UNIQUE (exam_id, question_id)
```

### 3.10 question_statistics

```sql
question_id      TEXT PRIMARY KEY REFERENCES exam_questions(id)
total_attempts   INTEGER NOT NULL DEFAULT 0
correct_attempts INTEGER NOT NULL DEFAULT 0
wrong_attempts   INTEGER NOT NULL DEFAULT 0
```

---

## 4. Module Specifications

### 4.1 Authentication

**Endpoints:**
- `POST /auth/login` — validate email+password, return access token + set refresh cookie
- `POST /auth/refresh` — validate httpOnly cookie refresh token against KV, issue new access token
- `POST /auth/logout` — delete KV refresh token entry, clear cookie
- `POST /auth/forgot-password` — generate reset token (stored in D1 with expiry), send email
- `POST /auth/reset-password` — validate token, update password hash, invalidate token

**Edge case handling:**
- Login: Same error message for wrong email and wrong password (prevent user enumeration)
- Login: KV-based rate limiting per IP+email — lockout after 5 failed attempts, 15-min TTL
- Login: Reject if `is_active = 0`
- Reset token: Single-use — mark consumed atomically; reject reuse
- Reset token: Expire after 1 hour
- JWT: `alg` explicitly set to HS256; `alg:none` rejected
- Refresh: Deletes old KV entry and issues new token on each use (rotation)

### 4.2 Registration

**Endpoints:**
- `POST /auth/register` — direct registration (normal membership)
- `POST /auth/register` with `book_code` field — QR/code registration (premium membership)

**Edge case handling:**
- `role` field from client body is silently ignored; always assigned `student`
- Book code validation + user creation wrapped in a single D1 transaction
- `SELECT book_codes WHERE code = ? AND status = 'unused' AND (expires_at IS NULL OR expires_at > now())` with `FOR UPDATE` equivalent (D1 transaction)
- On collision (409): do not reveal if existing email belongs to admin

### 4.3 Book Code Module

**Admin endpoints:**
- `POST /admin/book-codes` — generate single code
- `POST /admin/book-codes/bulk` — bulk generate (async via Queue for >100 codes)
- `GET /admin/book-codes` — list with filters (status, date range)
- `PATCH /admin/book-codes/:id` — block/unblock/expire
- `GET /admin/book-codes/export` — generates CSV to R2, returns presigned URL

**Edge case handling:**
- Code generation: UUIDv4-based, normalized uppercase, UNIQUE constraint in D1
- Collision: Catch unique constraint error, retry with new code (max 3 retries, log if fails)
- Bulk >100: Offload to Cloudflare Queue; Worker processes in batches of 50 with transactions
- Export: Write CSV to R2; return 24-hour presigned URL — never stream to Worker response
- Block on used code: Allowed with admin warning; does not affect linked user's membership
- Delete: Blocked if `used_by_user_id IS NOT NULL`

### 4.4 Exam Types

**Admin endpoints:** Full CRUD + list with search

**Edge case handling:**
- Delete blocked if units reference this exam type (return 409 with count of linked units)
- Name: UNIQUE constraint in D1
- `exam_question_count`: Required on create, defaults to 10, minimum 1

### 4.5 Units

**Admin endpoints:** Full CRUD + image upload + filter by exam type

**File upload flow:**
1. Client requests presigned R2 upload URL from Worker
2. Client uploads directly to R2
3. Client sends `image_key` to Worker to create unit record
4. Worker verifies R2 object exists, then inserts D1 record
5. On D1 failure: Worker deletes R2 object

**Edge case handling:**
- Delete blocked if student progress exists for any question in this unit
- Delete blocked if unit has questions (must delete questions first, or cascade soft-delete)
- `access_type` change free → premium: Applies to new requests only; students mid-unit continue (grandfathering)
- MIME validation: Read first 8 bytes via R2 metadata, reject non-image types

### 4.6 Learning Questions

**Admin endpoints:** Full CRUD + audio upload + reorder

**Edge case handling:**
- Delete blocked if `student_question_progress` rows exist for question
- Before delete: require admin to reassign `sequence_order` to close gaps
- `correct_answer` validated by Zod in shared schema (must equal one of option1–4)
- HTML description: Sanitized server-side with HTML allowlist before D1 storage
- Audio: R2 presigned upload; MIME validated from first bytes; accepted types: `audio/mpeg`, `audio/mp4`, `audio/ogg`, `audio/wav`
- Sequential access: Server checks `answered_at` for question at `sequence_order - 1` before serving next question

### 4.7 Exam Question Bank

**Admin endpoints:** Full CRUD + filter by difficulty + filter by unit

**Edge case handling:**
- Delete blocked if `status = 'active'` exam references question
- Soft-delete used for questions with historical answers
- Admin warned (not blocked) if fewer questions exist than `exam_question_count` for a given unit+difficulty

### 4.8 Learning Progress

**Endpoint:**
- `POST /student/progress` — `{ question_id, answer }` → upsert progress record

**Edge case handling:**
- Idempotent: `INSERT OR IGNORE INTO student_question_progress` — double-submits safe
- Sequential gate: Server checks previous question is answered before accepting
- Membership revoked mid-unit: Premium questions return 403; free questions continue

### 4.9 Exam System

**Endpoints:**
- `POST /student/exams` — create exam (checks prerequisites, randomizes questions)
- `POST /student/exams/:id/submit` — submit answers, calculate score, update analytics

**Exam creation prerequisites (all server-side):**
1. Student membership type is `premium` — exams are premium-only, no exceptions
2. Student has completed all learning questions in the unit
3. No existing exam record for `(student_id, unit_id)` — enforced by UNIQUE constraint

**Exam creation logic:**
1. Fetch `exam_question_count` from `exam_types.exam_question_count`
2. Query `exam_questions WHERE unit_id = ? AND difficulty = ? AND is_deleted = 0`
3. Return 422 if available questions < `exam_question_count`
4. Randomly select `exam_question_count` questions
5. Insert `student_exams` record (status = active)
6. Insert `student_exam_answers` rows with `selected_answer = NULL`

**Exam submission (single D1 transaction):**
1. Validate exam status = active (reject if already submitted)
2. Validate each submitted `question_id` belongs to this exam
3. For each answer: update `selected_answer`, set `is_correct`
4. Update `student_exams`: `score`, `correct_answers`, `status = submitted`, `submitted_at`
5. Update `question_statistics`: increment `total_attempts` and `correct_attempts`/`wrong_attempts`
6. All of the above in one D1 transaction — all or nothing

**Edge case handling:**
- Double submit: Check `status` before transaction; return 409 if already submitted
- Extra question IDs: Validate against exam's assigned questions; reject unknown IDs
- Blank submission: Allowed — treat all unanswered as wrong; score = 0
- Abandoned exams: Scheduled Worker cron runs every hour, sets `status = abandoned` for exams older than 24 hours

### 4.10 Question Analytics

- Updated inside exam submission transaction (atomic)
- `accuracy = COALESCE(correct_attempts, 0.0) / NULLIF(total_attempts, 0)` — null-safe
- Difficulty recalculation: Run as part of exam submission (same transaction); thresholds:
  - `accuracy > 0.8` → Easy
  - `0.5 ≤ accuracy ≤ 0.8` → Medium
  - `accuracy < 0.5` → Hard

### 4.11 Admin Monitoring

**Endpoints:**
- `GET /admin/students` — list with filters: membership, source, is_active; paginated
- `PATCH /admin/students/:id` — block/unblock, modify membership
- `GET /admin/students/:id/exams` — exam history
- `GET /admin/analytics/questions` — most attempted, most wrong, difficulty breakdown
- `GET /admin/analytics/membership` — totals, normal vs premium, QR vs manual

**Edge case handling:**
- Self-block: Middleware checks `target_id !== authenticated_admin_id`; return 403
- Downgrade mid-exam: Apply membership change; active exam is allowed to complete
- Delete: Soft-delete only (`is_active = 0`); return 409 on any hard-delete attempt
- KV cache invalidation: On membership or is_active change, delete user's KV cache entry immediately
- Large exports: Write to R2, return presigned URL

---

## 5. Access Control

### 5.1 Middleware Stack (applied in order)

1. **`authMiddleware`** — Verify JWT signature and expiry. Fetch `is_active` from KV (TTL 30s). Reject if `is_active = 0`.
2. **`rbacMiddleware`** — Check `role` from D1 (not JWT). Reject if role does not match route requirement.
3. **`membershipMiddleware`** — For content routes, fetch `membership_type` from KV (TTL 30s). Enforce against `access_type` of requested content.

### 5.2 Access Matrix

| Route group | Requires | Membership |
|---|---|---|
| `/auth/*` | None | — |
| `/admin/*` | role = admin | — |
| `/student/register` | None | — |
| `/student/units` (free) | role = student | normal or premium |
| `/student/units` (premium) | role = student | premium only |
| `/student/exams/*` | role = student | premium only |
| `/student/progress` | role = student | per question access_type |

### 5.3 KV Cache Keys

- `user:active:{user_id}` → `"1"` or `"0"` — TTL 30s
- `user:membership:{user_id}` → `"normal"` or `"premium"` — TTL 30s
- `ratelimit:login:{ip}:{email}` → attempt count — TTL 900s (15 min)
- `refresh:{token}` → `user_id` — TTL matches refresh token expiry

---

## 6. File Management

### 6.1 Upload Flow (R2 presigned URL pattern)

1. Client calls `POST /upload/presign` with `{ type: 'unit-image' | 'question-audio', filename, mimeType }`
2. Worker validates MIME type (allowlist check)
3. Worker generates presigned R2 PUT URL with 10-minute expiry; key = `{type}/{uuid}/{sanitized_filename}`
4. Worker returns `{ uploadUrl, key }` to client
5. Client uploads file directly to R2 using presigned URL
6. Client sends `key` as part of create/update entity request
7. Worker verifies R2 object exists (HEAD request), then inserts to D1
8. On D1 failure: Worker issues R2 DELETE for the key

### 6.2 File Type Allowlists

| Context | Allowed MIME types |
|---|---|
| Unit image | `image/jpeg`, `image/png`, `image/webp` |
| Question audio | `audio/mpeg`, `audio/mp4`, `audio/ogg`, `audio/wav` |

### 6.3 Filename Safety

R2 key pattern: `{type}/{uuidv4}/{sanitized_original_name}`  
Sanitization: strip non-alphanumeric except `.` and `-`; lowercase; max 100 chars.

---

## 7. Security Requirements

| Requirement | Implementation |
|---|---|
| Password storage | bcrypt via Web Crypto (cost factor 12) |
| JWT algorithm | HS256 with Worker secret; `alg:none` explicitly rejected |
| Role enforcement | Fetched from D1 on every admin request — never from JWT claim |
| Membership enforcement | Fetched from KV (TTL 30s) — never from JWT claim |
| Input validation | Zod schemas in shared package, applied in Hono middleware |
| HTML sanitization | Allowlist-based sanitizer in Worker before D1 insert |
| Rate limiting | KV counter per IP+email on `/auth/login`; 5 attempts → 15-min lockout |
| File validation | MIME type from magic bytes, not file extension |
| One-time code use | D1 transaction + UNIQUE constraint — never KV for this |
| Book code format | Uppercase alphanumeric, length 12, UUIDv4-derived |

---

## 8. Cloudflare Platform Constraints & Mitigations

| Constraint | Mitigation |
|---|---|
| Workers CPU time limit | Bulk code generation (>100) via Cloudflare Queue; batches of 50 per invocation |
| Workers 128MB memory | Large exports write to R2; paginate all list queries |
| KV eventual consistency | Never use KV for one-time-use validation; D1 + UNIQUE constraint is source of truth |
| No Node.js crypto | Use `crypto.subtle` (Web Crypto API) for all crypto; jose for JWT |
| D1 SQLite limitations | Test all migrations with `wrangler d1 execute --local`; no triggers or PRAGMA changes |
| D1 write latency | Batch all exam submission writes in single D1 transaction |
| CORS (two Pages origins) | Worker reads `ADMIN_ORIGIN` + `STUDENT_ORIGIN` from env; allowlists both |

---

## 9. Seed Data

On first deploy, a seed script creates:
- One admin user with email from `SEED_ADMIN_EMAIL` env var and password from `SEED_ADMIN_PASSWORD` env var
- Both env vars are Wrangler secrets (never in source code)
- Seed script is idempotent: `INSERT OR IGNORE` — safe to re-run

---

## 10. Decisions Log

| Decision | Choice | Rationale |
|---|---|---|
| Learning completion trigger | Any answer (right or wrong) | Keeps progression fluid; exam tests knowledge, not learning questions |
| Exam question count | Admin-configured per exam type | Different exams have different lengths; not hardcoded |
| Exam retakes | Not allowed | One attempt enforced by UNIQUE(student_id, unit_id); encourages preparation |
| First admin | Seed data via Wrangler secrets | Clean, auditable, no special registration endpoint needed |
| Role in JWT | Not stored | Prevents stale-claim privilege escalation |
| Membership in JWT | Not stored | Prevents stale-claim access to premium content after downgrade |
| Deletions | Soft-delete throughout | Preserves analytics, exam history, and progress data integrity |
| Book code race condition | D1 transaction + UNIQUE constraint | KV is eventually consistent and unsafe for one-time validation |
| Large file uploads | R2 presigned URLs | Workers request body limit is 100MB; presigned pattern bypasses this |
| Bulk code export | R2 + presigned download URL | Avoids loading large datasets into Worker memory |
