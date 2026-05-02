/**
 * OpenAPI 3.0 document for HTTP routes. Keep in sync with handlers in src/modules.
 * For generated specs from Zod, consider migrating to @hono/zod-openapi later.
 *
 * Narrative aligns with docs/superpowers/specs/2026-05-01-medical-lms-design.md
 * (Medical LMS: two Vue build targets, sequential learning, premium exams).
 */
const apiOverviewMarkdown = [
  '## Medical LMS API (Study Catalyst)',
  '',
  'Backend for a **question-driven** medical exam prep product. **Admin** manages all curriculum; **students** learn in order, unlock by answering, and take **premium-only** simulated exams per unit (no retakes).',
  '',
  '### Frontends vs this spec',
  '- **Student SPA** — use tags *Auth* (session), *Student progress*, *Student exams*, *Student membership*. Send `Authorization: Bearer <access_token>` on protected routes; include cookies for refresh.',
  '- **Admin SPA** — use *Auth*, *Exam types*, *Units*, *Questions*, *Exam questions*, *Book codes*, *Admin students*, *Admin analytics*, and *Upload* when attaching R2 media.',
  '',
  '### Roles (who can call what)',
  '| Access | Routes |',
  '|--------|--------|',
  '| **Public** (no Bearer) | `GET /health`, `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh` (needs refresh cookie), `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password` |',
  '| **Student** (Bearer + student role) | `GET /auth/me`, `POST /progress`, `GET /progress/unit/{unitId}`, `GET/POST /exams`, `POST /exams/{id}/submit`, `GET /exams/{id}/questions`, `GET /exams/{id}`, `POST /membership/upgrade` |',
  '| **Admin** (Bearer + admin role) | Full CRUD under `/exam-types`, `/units`, `/questions`, `/exam-questions`, `/book-codes`; `GET/PATCH /students…`, `GET /analytics/*`; `POST /upload/presign` |',
  '',
  '### Auth model (why tokens look like this)',
  '- **Access JWT** (~15m) returned in JSON — keep **in memory** on the client.',
  '- **Refresh** is an opaque token in **KV**, delivered as **httpOnly** `refresh_token` cookie and **rotated** on each refresh.',
  '- **Role and membership are not embedded in JWT claims** for authorization; the Worker loads current role/membership from D1/KV so privileges cannot go stale.',
  '',
  '### Student journey (recommended call order)',
  '1. **Onboarding:** `POST /auth/register` (optional `bookCode` for premium at signup) or `POST /auth/login`.',
  '2. **Shell / routing:** `GET /auth/me` for name, role, membership.',
  '3. **Learning loop:** Drive UI from question IDs your product surfaces; **`POST /progress`** records any answer (right or wrong) — idempotent; **`422`** if sequential gate fails (previous question not answered). **`GET /progress/unit/{unitId}`** powers progress bars and “unit complete”.',
  '4. **Premium upgrade after signup:** `POST /membership/upgrade` with 12-char book code.',
  '5. **Exam simulation (premium):** Requires all learning questions in the unit answered; **`POST /exams`** picks a random subset from the exam bank sized by exam type; **`GET /exams/{id}/questions`** for the attempt UI; **`POST /exams/{id}/submit`** grades and persists analytics. One row per `(student, unit)` — no retakes.',
  '',
  '### Admin journey (recommended call order)',
  '1. **Media:** `POST /upload/presign` → PUT file to R2 → pass returned **key** into unit/question payloads.',
  '2. **Curriculum:** CRUD **exam types** (defines exam length) → **units** under a type → **learning questions** (`sequence_order` defines unlock order) → **exam bank questions** tagged by difficulty for exams.',
  '3. **Codes:** Generate/list/export **book codes** for QR/packaging; patch status when blocking unused codes.',
  '4. **Operations:** **Students** list filters + PATCH membership/active; **Analytics** for membership split and question difficulty/attempt insights.',
  '',
  '### Response shape',
  'All JSON uses `{ status, code, message, data, errors, meta, links }`. Errors use the same envelope with `status: error`.',
  '',
  '### Infra',
  'Worker runs on Cloudflare (Hono). Presign/export need R2-related secrets in env.',
].join('\n');

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Admin Study Catalyst API',
    description: apiOverviewMarkdown,
    version: '0.0.1',
  },
  servers: [{ url: '/', description: 'Current deployment (e.g. http://localhost:8787 in dev)' }],
  tags: [
    {
      name: 'Health',
      description:
        'Public liveness — load balancers and ops pings. No auth. Does not validate DB connectivity.',
    },
    {
      name: 'Auth',
      description:
        'Public registration/login/password flows plus authenticated **`GET /auth/me`**. Shared by **both** SPAs; student vs admin is determined after login via `role` on the user object.',
    },
    {
      name: 'Student progress',
      description:
        '**Student SPA only.** Sequential learning: submit answers (`POST /progress`) and read per-unit aggregates (`GET /progress/unit/{unitId}`). Backend enforces premium gates per learning question access type.',
    },
    {
      name: 'Student exams',
      description:
        '**Student SPA only; premium membership required.** Timed exam simulation using the exam **bank** (`exam_questions`). Creation checks unit completion and uniqueness per student+unit.',
    },
    {
      name: 'Student membership',
      description:
        '**Student SPA.** Upgrade existing normal accounts with a printed/book **QR code** string (`POST /membership/upgrade`). Distinct from premium-at-registration via `/auth/register`.',
    },
    {
      name: 'Upload',
      description:
        '**Admin SPA while authoring** (and any authenticated caller): presigned **R2 PUT** URLs for unit hero images and learning-question audio — avoids Worker body limits.',
    },
    {
      name: 'Exam types',
      description:
        '**Admin SPA.** Catalog of exam programs (e.g. EMREE). Holds **`exam_question_count`** — how many bank questions are drawn per exam attempt.',
    },
    {
      name: 'Units',
      description:
        '**Admin SPA.** Learning modules under an exam type; `access_type` free vs premium gates catalog visibility for normal members.',
    },
    {
      name: 'Questions',
      description:
        '**Admin SPA.** Learning (instructional) MCQs tied to a unit. **`sequence_order`** drives unlock order; reorder endpoint maintains contiguous sequencing before deletes.',
    },
    {
      name: 'Exam questions',
      description:
        '**Admin SPA.** Separate **exam bank** MCQs with difficulty; pooled when students start exams. Not the same entity as learning questions.',
    },
    {
      name: 'Book codes',
      description:
        '**Admin SPA.** Issue physical/digital entitlement codes (QR payload); export CSV via R2 presigned URL for fulfilment.',
    },
    {
      name: 'Admin students',
      description:
        '**Admin SPA.** Directory search/filter, manual membership corrections, deactivate accounts (`is_active`), view per-student exam history.',
    },
    {
      name: 'Admin analytics',
      description:
        '**Admin SPA.** Aggregate dashboards: membership mix (QR vs manual vs direct) and exam-question performance signals.',
    },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description:
          '**Roles:** Public. **Use case:** uptime probes and student/admin app bootstrap pings. **Why:** Cheap Worker heartbeat without touching D1.',
        responses: {
          '200': {
            description: 'Service is up',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a student',
        description:
          '**Roles:** Public → creates **student** only (never admin). **Use case:** Student SPA signup screen; optional QR/book flow when user pastes **bookCode** for immediate premium (same intent as printed codes). **Why:** Single endpoint keeps transactional integrity between user insert + code redemption. Unknown JSON ignored; client-supplied role discarded server-side.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } },
          },
        },
        responses: {
          '201': {
            description: 'User created',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/RegisterResponse' } },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '409': { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in',
        description:
          '**Roles:** Public. **Use case:** Both SPAs — credentials gate to Bearer workflow + silent refresh cookie. **Why:** Access JWT stays short-lived in memory; refresh stays httpOnly against XSS. KV rate-limit after repeated failures (`429`). Disabled accounts rejected.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } },
          },
        },
        responses: {
          '200': {
            description: 'OK',
            headers: {
              'Set-Cookie': {
                schema: { type: 'string' },
                description: 'Contains refresh_token=…; HttpOnly; Path=/; …',
              },
            },
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate refresh token',
        description:
          '**Roles:** Public endpoint but practically requires prior login cookie. **Use case:** Student + Admin SPAs renew access token without re-entering password. **Why:** Refresh token rotation invalidates stolen cookies quickly — old KV session deleted each call.',
        parameters: [
          {
            name: 'refresh_token',
            in: 'cookie',
            required: false,
            schema: { type: 'string' },
            description:
              'HttpOnly cookie set by /auth/login. Swagger "Try it out" cannot send this unless your browser already has the cookie for this origin.',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            headers: {
              'Set-Cookie': { schema: { type: 'string' }, description: 'Rotated refresh_token' },
            },
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/RefreshResponse' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Log out',
        description:
          '**Roles:** Public endpoint; accepts cookie when present. **Use case:** Explicit logout UI on either SPA. **Why:** KV refresh mapping deleted so replay stops; cookie cleared client-side.',
        parameters: [
          {
            name: 'refresh_token',
            in: 'cookie',
            required: false,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/NullDataResponse' } },
            },
          },
        },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset',
        description:
          '**Roles:** Public. **Use case:** Student + Admin forgot-password screens. **Why:** Uniform success messaging prevents attackers discovering registered emails; token persisted single-use server-side.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ForgotPasswordRequest' } },
          },
        },
        responses: {
          '200': {
            description: 'Acknowledged (whether or not the email exists)',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/NullDataResponse' } },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password with token',
        description:
          '**Roles:** Public. **Use case:** Deep link from email lands on SPA → submits token + new password. **Why:** Token one-time use closes replay window.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ResetPasswordRequest' } },
          },
        },
        responses: {
          '200': {
            description: 'Password updated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/NullDataResponse' } },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        security: [{ BearerAuth: [] }],
        summary: 'Current authenticated user',
        description:
          '**Roles:** Any authenticated user (student **or** admin). **Use case:** Hydrate nav/profile, branch routing (`role`), show membership badge on Student SPA. **Why:** JWT intentionally omits stale role/membership — this reads authoritative DB snapshot.',
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/MeResponse' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/progress': {
      post: {
        tags: ['Student progress'],
        security: [{ BearerAuth: [] }],
        summary: 'Record answer for a learning question',
        description:
          '**Roles:** Student. **Use case:** Each time learner submits MCQ answer during unit flow (even wrong attempts advance progression policy). **Why:** Upsert progress enables sequential unlock (`422` when prior sequence unanswered); premium-only rows rejected mid-session if membership lapses.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/SubmitProgressRequest' } },
          },
        },
        responses: {
          '201': {
            description: 'Progress recorded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SubmitProgressResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '422': { $ref: '#/components/responses/UnprocessableEntity' },
        },
      },
    },
    '/progress/unit/{unitId}': {
      get: {
        tags: ['Student progress'],
        security: [{ BearerAuth: [] }],
        summary: 'Progress summary for a unit',
        description:
          '**Roles:** Student. **Use case:** Dashboard widgets — answered vs total, disable “Start exam” until complete. **Why:** Lightweight aggregate avoids shipping entire question arrays.',
        parameters: [{ name: 'unitId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['progress'],
                          properties: {
                            progress: { $ref: '#/components/schemas/UnitProgressSummary' },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/exams': {
      get: {
        tags: ['Student exams'],
        security: [{ BearerAuth: [] }],
        summary: 'List my exams',
        description:
          '**Roles:** Student (premium enforcement at creation time). **Use case:** Student history / scores tab. **Why:** Single endpoint surfaces attempts submitted vs abandoned cron.',
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['exams'],
                          properties: { exams: { type: 'array', items: { type: 'object' } } },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
      post: {
        tags: ['Student exams'],
        security: [{ BearerAuth: [] }],
        summary: 'Start a new exam',
        description:
          '**Roles:** Student (**premium**). **Use case:** “Begin assessment” once learning unit finished. **Why:** Draws random subset from exam bank sized by parent exam type; DB uniqueness `(student_id, unit_id)` prevents retakes.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/StudentCreateExamRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Exam created',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['exam'],
                          properties: { exam: { type: 'object' } },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/exams/{id}/submit': {
      post: {
        tags: ['Student exams'],
        security: [{ BearerAuth: [] }],
        summary: 'Submit answers for an exam',
        description:
          '**Roles:** Student. **Use case:** Final submit bar — sends parallel answers map. **Why:** Atomic grading updates score + analytics counters + locks exam row (`409` double-submit). Blank answers allowed (counted incorrect).',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/StudentSubmitExamRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Graded exam result',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['exam'],
                          properties: { exam: { type: 'object' } },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/exams/{id}/questions': {
      get: {
        tags: ['Student exams'],
        security: [{ BearerAuth: [] }],
        summary: 'Questions for an exam (answers omitted)',
        description:
          '**Roles:** Student owner of exam row. **Use case:** Render timed exam UI without leaking solutions. **Why:** Separate fetch keeps payloads smaller than stuffing bank inside creation response.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['questions'],
                          properties: {
                            questions: { type: 'array', items: { type: 'object' } },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/exams/{id}': {
      get: {
        tags: ['Student exams'],
        security: [{ BearerAuth: [] }],
        summary: 'Get exam by id',
        description:
          '**Roles:** Student owner. **Use case:** Poll row for timer/status between steps. **Why:** Confirms attempt belongs to caller before trusting metadata.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['exam'],
                          properties: { exam: { type: 'object' } },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/membership/upgrade': {
      post: {
        tags: ['Student membership'],
        security: [{ BearerAuth: [] }],
        summary: 'Upgrade to premium with a book code',
        description:
          '**Roles:** Student already logged in as normal member. **Use case:** Activate printed QR after registration (`POST /auth/register` handles QR-at-signup separately). **Why:** Burns code transactionally + bumps membership source for analytics.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MembershipUpgradeRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['success', 'membershipType'],
                          properties: {
                            success: { type: 'boolean', example: true },
                            membershipType: { type: 'string', enum: ['premium'] },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '409': { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/upload/presign': {
      post: {
        tags: ['Upload'],
        security: [{ BearerAuth: [] }],
        summary: 'Presign R2 upload (unit image or question audio)',
        description:
          '**Roles:** Authenticated user (typically **Admin SPA** during authoring). **Use case:** Step 1 of media pipeline — PUT bytes straight to R2, then embed returned **key** into `/units` or `/questions`. **Why:** Worker avoids streaming large bodies; MIME allowlists mirror LMS security spec. Requires `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/PresignRequest' } },
          },
        },
        responses: {
          '200': {
            description: 'Presigned PUT URL and key',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/PresignResponse' } },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/exam-types': {
      get: {
        tags: ['Exam types'],
        security: [{ BearerAuth: [] }],
        summary: 'List exam types',
        description:
          '**Roles:** Admin. **Use case:** Exam picker when wiring units + configuring exam draws. **Why:** Pagination + optional search keeps admin grids responsive.',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['examTypes'],
                          properties: {
                            examTypes: { type: 'array', items: { type: 'object' } },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
      post: {
        tags: ['Exam types'],
        security: [{ BearerAuth: [] }],
        summary: 'Create exam type',
        description:
          '**Roles:** Admin. **Use case:** Add cert/program bucket before attaching units. **Why:** Persists **`exam_question_count`** controlling how many bank questions compose each attempt.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateExamTypeRequest' } },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['examType'],
                          properties: { examType: { type: 'object' } },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '409': { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/exam-types/{id}': {
      get: {
        tags: ['Exam types'],
        security: [{ BearerAuth: [] }],
        summary: 'Get exam type',
        description:
          '**Roles:** Admin. **Use case:** Detail drawer / edit forms. **Why:** Canonical record including tags JSON + exam length knob.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['examType'],
                          properties: { examType: { type: 'object' } },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Exam types'],
        security: [{ BearerAuth: [] }],
        summary: 'Update exam type',
        description:
          '**Roles:** Admin. **Use case:** Rename exam or tweak question counts/tags mid-cycle. **Why:** Immediate effect on subsequent student exam draws.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateExamTypeRequest' } },
          },
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['examType'],
                          properties: { examType: { type: 'object' } },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Exam types'],
        security: [{ BearerAuth: [] }],
        summary: 'Delete exam type',
        description:
          '**Roles:** Admin. **Use case:** Remove obsolete catalog entries. **Why:** **`409`** when dependent units exist — guarantees referential sanity.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Deleted',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/NullDataResponse' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/units': {
      get: {
        tags: ['Units'],
        security: [{ BearerAuth: [] }],
        summary: 'List units',
        description:
          '**Roles:** Admin. **Use case:** Curriculum tables filtered by exam type / access tier. **Why:** Powers authoring consoles before drilling into learning questions.',
        parameters: [
          { name: 'examTypeId', in: 'query', schema: { type: 'string' } },
          {
            name: 'accessType',
            in: 'query',
            schema: { type: 'string', enum: ['free', 'premium'] },
          },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['units'],
                          properties: { units: { type: 'array', items: { type: 'object' } } },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
      post: {
        tags: ['Units'],
        security: [{ BearerAuth: [] }],
        summary: 'Create unit',
        description:
          '**Roles:** Admin. **Use case:** After `POST /upload/presign` + PUT to R2, persist hero asset via **imageKey**. **Why:** Worker verifies object existence before insert per LMS media pipeline.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateUnitRequest' } },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['unit'],
                          properties: { unit: { type: 'object' } },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '409': { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/units/{id}': {
      get: {
        tags: ['Units'],
        security: [{ BearerAuth: [] }],
        summary: 'Get unit',
        description:
          '**Roles:** Admin. **Use case:** Detail/edit sheets for sequencing questions. **Why:** Includes metadata student apps gate on (`access_type`).',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['unit'],
                          properties: { unit: { type: 'object' } },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Units'],
        security: [{ BearerAuth: [] }],
        summary: 'Update unit',
        description:
          '**Roles:** Admin. **Use case:** Swap artwork, move between exam types, change premium flag (future catalogs honor new flag). **Why:** Validates uploaded keys same as create.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateUnitRequest' } },
          },
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['unit'],
                          properties: { unit: { type: 'object' } },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Units'],
        security: [{ BearerAuth: [] }],
        summary: 'Soft-delete unit',
        description:
          '**Roles:** Admin. **Use case:** Hide retired modules without shredding analytics. **Why:** **`409`** if undeleted learning questions remain.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Marked deleted',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/NullDataResponse' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/questions': {
      get: {
        tags: ['Questions'],
        security: [{ BearerAuth: [] }],
        summary: 'List learning questions for a unit',
        description:
          '**Roles:** Admin. **Use case:** Question bank grids while authoring instructional flow. **Why:** Requires **unitId** — aligns admin navigation with sequential authoring workflow.',
        parameters: [
          {
            name: 'unitId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['questions'],
                          properties: {
                            questions: { type: 'array', items: { type: 'object' } },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
      post: {
        tags: ['Questions'],
        security: [{ BearerAuth: [] }],
        summary: 'Create learning question',
        description:
          '**Roles:** Admin. **Use case:** Append instructional MCQs + optional sanitized HTML explanation / audio key. **Why:** **`sequence_order`** establishes unlock ordering enforced later by `/progress`.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateQuestionRequest' } },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['question'],
                          properties: { question: { type: 'object' } },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/questions/reorder': {
      patch: {
        tags: ['Questions'],
        security: [{ BearerAuth: [] }],
        summary: 'Reorder learning questions',
        description:
          '**Roles:** Admin. **Use case:** Drag-drop authoring to fix unlock ladder before deletes. **Why:** LMS requires contiguous sequencing — reorder closes gaps enforced during destructive ops.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ReorderQuestionsRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/NullDataResponse' } },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/questions/{id}': {
      get: {
        tags: ['Questions'],
        security: [{ BearerAuth: [] }],
        summary: 'Get learning question',
        description:
          '**Roles:** Admin preview/editor. **Why:** Fetch authoritative fields including privileged explanation HTML.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['question'],
                          properties: { question: { type: 'object' } },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Questions'],
        security: [{ BearerAuth: [] }],
        summary: 'Update learning question',
        description:
          '**Roles:** Admin. **Use case:** Fix copy, rotate assets, toggle premium-only explanations. **Why:** Keeps instructional stack aligned without deleting progress-heavy rows.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateQuestionRequest' } },
          },
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['question'],
                          properties: { question: { type: 'object' } },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Questions'],
        security: [{ BearerAuth: [] }],
        summary: 'Soft-delete learning question',
        description:
          '**Roles:** Admin. **Use case:** Retire broken items once reorder closes gaps. **Why:** **`409`** when student progress references row — preserves audit trail.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/NullDataResponse' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/exam-questions': {
      get: {
        tags: ['Exam questions'],
        security: [{ BearerAuth: [] }],
        summary: 'List exam bank questions',
        description:
          '**Roles:** Admin. **Use case:** QA dashboards filtering bank pool per unit/difficulty before students draw exams. **Why:** Separate dataset from instructional MCQs.',
        parameters: [
          { name: 'unitId', in: 'query', schema: { type: 'string' } },
          {
            name: 'difficulty',
            in: 'query',
            schema: { type: 'string', enum: ['easy', 'medium', 'hard'] },
          },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['examQuestions'],
                          properties: {
                            examQuestions: { type: 'array', items: { type: 'object' } },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
      post: {
        tags: ['Exam questions'],
        security: [{ BearerAuth: [] }],
        summary: 'Create exam bank question',
        description:
          '**Roles:** Admin. **Use case:** Seed difficulty-balanced pools backing `/exams` random selection. **Why:** Submission analytics update difficulty heuristics downstream.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateExamQuestionRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['examQuestion'],
                          properties: { examQuestion: { type: 'object' } },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/exam-questions/{id}': {
      get: {
        tags: ['Exam questions'],
        security: [{ BearerAuth: [] }],
        summary: 'Get exam bank question',
        description:
          '**Roles:** Admin reviewer. **Why:** Full fidelity edit forms including difficulty metadata.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['examQuestion'],
                          properties: { examQuestion: { type: 'object' } },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Exam questions'],
        security: [{ BearerAuth: [] }],
        summary: 'Update exam bank question',
        description:
          '**Roles:** Admin. **Use case:** Tune stems/options after analytics flag confusing items.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateExamQuestionRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['examQuestion'],
                          properties: { examQuestion: { type: 'object' } },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Exam questions'],
        security: [{ BearerAuth: [] }],
        summary: 'Delete or soft-delete exam bank question',
        description:
          '**Roles:** Admin. **Use case:** Remove compromised items or shrink pools. **Why:** Blocks destructive ops when active exams reference rows (`409`).',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/NullDataResponse' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/book-codes': {
      get: {
        tags: ['Book codes'],
        security: [{ BearerAuth: [] }],
        summary: 'List book codes',
        description:
          '**Roles:** Admin fulfilment/support. **Use case:** Paginated ledger with status filters (unused→blocked). **Why:** Operational visibility without exporting CSV.',
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['unused', 'used', 'expired', 'blocked'] },
          },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['bookCodes'],
                          properties: {
                            bookCodes: { type: 'array', items: { type: 'object' } },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
      post: {
        tags: ['Book codes'],
        security: [{ BearerAuth: [] }],
        summary: 'Generate one book code',
        description:
          '**Roles:** Admin. **Use case:** Issue single entitlement links (`qr_url` pairs with STUDENT_ORIGIN). **Why:** Codes uppercase-normalized + collision-retried server-side.',
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/GenerateBookCodeRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['bookCode'],
                          properties: { bookCode: { type: 'object' } },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/book-codes/export': {
      get: {
        tags: ['Book codes'],
        security: [{ BearerAuth: [] }],
        summary: 'Export all book codes as CSV (presigned download URL)',
        description:
          '**Roles:** Admin bulk ops. **Use case:** Printer/partner batches — fetch JSON containing short-lived HTTPS URL to CSV in R2. **Why:** Keeps massive datasets off Worker heap.',
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['downloadUrl'],
                          properties: { downloadUrl: { type: 'string', format: 'uri' } },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/book-codes/bulk': {
      post: {
        tags: ['Book codes'],
        security: [{ BearerAuth: [] }],
        summary: 'Bulk-generate book codes (max 100)',
        description:
          '**Roles:** Admin. **Use case:** Campaign launches needing dozens/hundreds of codes quickly. **Why:** Bounded batch protects Worker CPU — split larger jobs client-side.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/BulkBookCodesRequest' } },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['created'],
                          properties: { created: { type: 'integer' } },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/book-codes/{id}': {
      patch: {
        tags: ['Book codes'],
        security: [{ BearerAuth: [] }],
        summary: 'Update book code status',
        description:
          '**Roles:** Admin compliance. **Use case:** Block leaked batches or mark expiry states without deleting redeemed codes. **Why:** Keeps immutable ledger while controlling redemption eligibility.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateBookCodeRequest' } },
          },
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['bookCode'],
                          properties: { bookCode: { type: 'object' } },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Book codes'],
        security: [{ BearerAuth: [] }],
        summary: 'Delete unused book code',
        description:
          '**Roles:** Admin clean-up. **Use case:** Remove stray unused codes from typos/tests. **Why:** **`409`** if ever redeemed — preserves audit linkage.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/NullDataResponse' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/students': {
      get: {
        tags: ['Admin students'],
        security: [{ BearerAuth: [] }],
        summary: 'List students',
        description:
          '**Roles:** Admin monitoring. **Use case:** CRM-style filters by membership/source/active flag + paging. **Why:** Keeps operational dashboards authoritative vs KV caches.',
        parameters: [
          {
            name: 'membershipType',
            in: 'query',
            schema: { type: 'string', enum: ['normal', 'premium'] },
          },
          {
            name: 'membershipSource',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['direct_registration', 'book_qr', 'manual_upgrade'],
            },
          },
          { name: 'isActive', in: 'query', schema: { type: 'boolean' } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['students'],
                          properties: {
                            students: { type: 'array', items: { type: 'object' } },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/students/{id}': {
      patch: {
        tags: ['Admin students'],
        security: [{ BearerAuth: [] }],
        summary: 'Update student membership or active flag',
        description:
          '**Roles:** Admin success/support. **Use case:** Manual premium grants (`membership_source = manual_upgrade`), deactivate abusive accounts. **Why:** KV membership cache invalidated immediately after PATCH.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateStudentRequest' } },
          },
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['student'],
                          properties: { student: { type: 'object' } },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/students/{id}/exams': {
      get: {
        tags: ['Admin students'],
        security: [{ BearerAuth: [] }],
        summary: 'Exam history for a student',
        description:
          '**Roles:** Admin success/academic ops. **Use case:** Drill into attempts/scores when auditing cheating concerns or coaching effectiveness. **Why:** Mirrors `/exams` student view but scoped cross-user.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['exams'],
                          properties: { exams: { type: 'array', items: { type: 'object' } } },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/analytics/membership': {
      get: {
        tags: ['Admin analytics'],
        security: [{ BearerAuth: [] }],
        summary: 'Membership analytics',
        description:
          '**Roles:** Admin leadership dashboards. **Use case:** Snapshot premium penetration vs QR/manual/direct sourcing. **Why:** Derived strictly from durable D1 membership columns.',
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['analytics'],
                          properties: { analytics: { type: 'object' } },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/analytics/questions': {
      get: {
        tags: ['Admin analytics'],
        security: [{ BearerAuth: [] }],
        summary: 'Question analytics',
        description:
          '**Roles:** Admin curriculum QA. **Use case:** Identify hardest exam-bank questions / imbalance across difficulties. **Why:** Powered by aggregated attempts maintained during `/exams/{id}/submit`.',
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiEnvelope' },
                    {
                      properties: {
                        data: {
                          type: 'object',
                          required: ['analytics'],
                          properties: { analytics: { type: 'object' } },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Short-lived HS256 JWT from POST /auth/login or POST /auth/refresh. Send as Authorization: Bearer <token>. Actual authorization checks student vs admin role from D1/KV — not from decoding claims alone.',
      },
    },
    schemas: {
      // ── Envelope primitives ────────────────────────────────────────────────
      ApiErrorDetail: {
        type: 'object',
        required: ['message', 'code'],
        properties: {
          field: { type: 'string', description: 'Dot-notation path of the invalid field' },
          message: { type: 'string' },
          code: { type: 'string', example: 'invalid_format' },
        },
      },
      /**
       * Base success envelope. Individual responses extend `data` via allOf.
       */
      ApiEnvelope: {
        type: 'object',
        required: ['status', 'code', 'message', 'data', 'errors', 'meta', 'links'],
        properties: {
          status: { type: 'string', enum: ['success'], example: 'success' },
          code: { type: 'integer', example: 200 },
          message: { type: 'string', example: 'Resource retrieved successfully.' },
          data: { nullable: true },
          errors: {
            nullable: true,
            type: 'array',
            items: { $ref: '#/components/schemas/ApiErrorDetail' },
          },
          meta: { nullable: true },
          links: { nullable: true },
        },
      },
      /**
       * Error envelope returned for all 4xx / 5xx responses.
       */
      ApiErrorEnvelope: {
        type: 'object',
        required: ['status', 'code', 'message', 'data', 'errors', 'meta', 'links'],
        properties: {
          status: { type: 'string', enum: ['error'], example: 'error' },
          code: { type: 'integer', example: 400 },
          message: { type: 'string', example: 'Validation failed.' },
          data: { nullable: true },
          errors: {
            nullable: true,
            type: 'array',
            items: { $ref: '#/components/schemas/ApiErrorDetail' },
          },
          meta: { nullable: true },
          links: { nullable: true },
        },
      },
      /**
       * Success response where data is null (delete / action-only endpoints).
       */
      NullDataResponse: {
        allOf: [
          { $ref: '#/components/schemas/ApiEnvelope' },
          {
            properties: {
              data: { nullable: true, type: 'object' },
            },
          },
        ],
      },
      // ── Health ─────────────────────────────────────────────────────────────
      HealthResponse: {
        type: 'object',
        required: ['status', 'ts'],
        properties: {
          status: { type: 'string', example: 'ok' },
          ts: { type: 'string', format: 'date-time' },
        },
      },
      // ── Auth ───────────────────────────────────────────────────────────────
      RegisterRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', maxLength: 20 },
          password: {
            type: 'string',
            minLength: 8,
            description: 'Must include uppercase, digit, and special character',
          },
          bookCode: {
            type: 'string',
            minLength: 12,
            maxLength: 12,
            description: 'Optional; uppercase book code for premium signup',
          },
        },
      },
      UserPublic: {
        type: 'object',
        required: ['id', 'name', 'email', 'role', 'membershipType'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['admin', 'student'] },
          membershipType: { type: 'string', enum: ['normal', 'premium'] },
        },
      },
      RegisterResponse: {
        allOf: [
          { $ref: '#/components/schemas/ApiEnvelope' },
          {
            properties: {
              code: { type: 'integer', example: 201 },
              message: { type: 'string', example: 'User registered successfully.' },
              data: {
                type: 'object',
                required: ['user'],
                properties: { user: { $ref: '#/components/schemas/UserPublic' } },
              },
            },
          },
        ],
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      LoginResponse: {
        allOf: [
          { $ref: '#/components/schemas/ApiEnvelope' },
          {
            properties: {
              message: { type: 'string', example: 'Logged in successfully.' },
              data: {
                type: 'object',
                required: ['accessToken'],
                properties: { accessToken: { type: 'string' } },
              },
            },
          },
        ],
      },
      RefreshResponse: {
        allOf: [
          { $ref: '#/components/schemas/ApiEnvelope' },
          {
            properties: {
              message: { type: 'string', example: 'Token refreshed successfully.' },
              data: {
                type: 'object',
                required: ['accessToken'],
                properties: { accessToken: { type: 'string' } },
              },
            },
          },
        ],
      },
      ForgotPasswordRequest: {
        type: 'object',
        required: ['email'],
        properties: { email: { type: 'string', format: 'email' } },
      },
      ResetPasswordRequest: {
        type: 'object',
        required: ['token', 'password'],
        properties: {
          token: { type: 'string', minLength: 1 },
          password: {
            type: 'string',
            minLength: 8,
            description: 'Must include uppercase, digit, and special character',
          },
        },
      },
      MeResponse: {
        allOf: [
          { $ref: '#/components/schemas/ApiEnvelope' },
          {
            properties: {
              message: { type: 'string', example: 'User retrieved successfully.' },
              data: {
                type: 'object',
                required: ['user'],
                properties: { user: { $ref: '#/components/schemas/UserPublic' } },
              },
            },
          },
        ],
      },
      SubmitProgressRequest: {
        type: 'object',
        required: ['questionId', 'answer'],
        properties: {
          questionId: { type: 'string' },
          answer: { type: 'string', minLength: 1 },
        },
      },
      SubmitProgressResponse: {
        allOf: [
          { $ref: '#/components/schemas/ApiEnvelope' },
          {
            properties: {
              code: { type: 'integer', example: 201 },
              message: { type: 'string' },
              data: {
                type: 'object',
                required: ['success'],
                properties: { success: { type: 'boolean', example: true } },
              },
            },
          },
        ],
      },
      UnitProgressSummary: {
        type: 'object',
        required: ['unitId', 'totalQuestions', 'answeredCount', 'isComplete'],
        properties: {
          unitId: { type: 'string' },
          totalQuestions: { type: 'integer', minimum: 0 },
          answeredCount: { type: 'integer', minimum: 0 },
          isComplete: { type: 'boolean' },
        },
      },
      StudentCreateExamRequest: {
        type: 'object',
        required: ['unitId', 'difficulty'],
        properties: {
          unitId: { type: 'string' },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
        },
      },
      StudentSubmitExamRequest: {
        type: 'object',
        required: ['answers'],
        properties: {
          answers: {
            type: 'array',
            items: {
              type: 'object',
              required: ['questionId', 'selectedAnswer'],
              properties: {
                questionId: { type: 'string' },
                selectedAnswer: { type: 'string', nullable: true },
              },
            },
          },
        },
      },
      MembershipUpgradeRequest: {
        type: 'object',
        required: ['bookCode'],
        properties: {
          bookCode: { type: 'string', minLength: 12, maxLength: 12 },
        },
      },
      UpdateStudentRequest: {
        type: 'object',
        properties: {
          isActive: { type: 'boolean' },
          membershipType: { type: 'string', enum: ['normal', 'premium'] },
          membershipSource: { type: 'string', enum: ['manual_upgrade'] },
        },
      },
      // ── Upload ─────────────────────────────────────────────────────────────
      PresignRequest: {
        type: 'object',
        required: ['type', 'filename', 'mimeType'],
        properties: {
          type: { type: 'string', enum: ['unit-image', 'question-audio'] },
          filename: { type: 'string', minLength: 1, maxLength: 255 },
          mimeType: { type: 'string', minLength: 1 },
        },
      },
      PresignResponse: {
        allOf: [
          { $ref: '#/components/schemas/ApiEnvelope' },
          {
            properties: {
              message: { type: 'string', example: 'Upload URL generated successfully.' },
              data: {
                type: 'object',
                required: ['uploadUrl', 'key'],
                properties: {
                  uploadUrl: { type: 'string', format: 'uri' },
                  key: { type: 'string' },
                },
              },
            },
          },
        ],
      },
      // ── Exam types ─────────────────────────────────────────────────────────
      CreateExamTypeRequest: {
        type: 'object',
        required: ['examName'],
        properties: {
          examName: { type: 'string', minLength: 1, maxLength: 200 },
          tags: { type: 'array', items: { type: 'string' } },
          examQuestionCount: { type: 'integer', minimum: 1, default: 10 },
        },
      },
      UpdateExamTypeRequest: {
        type: 'object',
        properties: {
          examName: { type: 'string', minLength: 1, maxLength: 200 },
          tags: { type: 'array', items: { type: 'string' } },
          examQuestionCount: { type: 'integer', minimum: 1 },
        },
      },
      // ── Units ──────────────────────────────────────────────────────────────
      CreateUnitRequest: {
        type: 'object',
        required: ['unitName', 'examTypeId'],
        properties: {
          unitName: { type: 'string', minLength: 1, maxLength: 200 },
          examTypeId: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          accessType: { type: 'string', enum: ['free', 'premium'], default: 'free' },
          imageKey: { type: 'string' },
          mimeType: { type: 'string' },
        },
      },
      UpdateUnitRequest: {
        type: 'object',
        properties: {
          unitName: { type: 'string' },
          examTypeId: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          accessType: { type: 'string', enum: ['free', 'premium'] },
          imageKey: { type: 'string' },
          mimeType: { type: 'string' },
        },
      },
      // ── Questions ──────────────────────────────────────────────────────────
      CreateQuestionRequest: {
        type: 'object',
        required: [
          'question',
          'option1',
          'option2',
          'option3',
          'option4',
          'correctAnswer',
          'unitId',
          'sequenceOrder',
        ],
        properties: {
          question: { type: 'string', minLength: 1 },
          option1: { type: 'string', minLength: 1 },
          option2: { type: 'string', minLength: 1 },
          option3: { type: 'string', minLength: 1 },
          option4: { type: 'string', minLength: 1 },
          correctAnswer: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          audioKey: { type: 'string' },
          mimeType: { type: 'string' },
          unitId: { type: 'string' },
          accessType: { type: 'string', enum: ['free', 'premium'], default: 'free' },
          sequenceOrder: { type: 'integer', minimum: 0 },
        },
      },
      UpdateQuestionRequest: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          option1: { type: 'string' },
          option2: { type: 'string' },
          option3: { type: 'string' },
          option4: { type: 'string' },
          correctAnswer: { type: 'string' },
          description: { type: 'string' },
          audioKey: { type: 'string' },
          mimeType: { type: 'string' },
          accessType: { type: 'string', enum: ['free', 'premium'] },
          sequenceOrder: { type: 'integer', minimum: 0 },
        },
      },
      ReorderQuestionsRequest: {
        type: 'object',
        required: ['questions'],
        properties: {
          questions: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'sequenceOrder'],
              properties: {
                id: { type: 'string' },
                sequenceOrder: { type: 'integer', minimum: 0 },
              },
            },
          },
        },
      },
      // ── Exam questions ─────────────────────────────────────────────────────
      CreateExamQuestionRequest: {
        type: 'object',
        required: [
          'question',
          'option1',
          'option2',
          'option3',
          'option4',
          'correctAnswer',
          'difficulty',
          'unitId',
        ],
        properties: {
          question: { type: 'string', minLength: 1 },
          option1: { type: 'string', minLength: 1 },
          option2: { type: 'string', minLength: 1 },
          option3: { type: 'string', minLength: 1 },
          option4: { type: 'string', minLength: 1 },
          correctAnswer: { type: 'string', minLength: 1 },
          shortDescription: { type: 'string' },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
          unitId: { type: 'string' },
          accessType: { type: 'string', enum: ['free', 'premium'] },
        },
      },
      UpdateExamQuestionRequest: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          option1: { type: 'string' },
          option2: { type: 'string' },
          option3: { type: 'string' },
          option4: { type: 'string' },
          correctAnswer: { type: 'string' },
          shortDescription: { type: 'string' },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
          accessType: { type: 'string', enum: ['free', 'premium'] },
        },
      },
      // ── Book codes ─────────────────────────────────────────────────────────
      GenerateBookCodeRequest: {
        type: 'object',
        properties: {
          expiresAt: { type: 'string', format: 'date-time' },
        },
      },
      BulkBookCodesRequest: {
        type: 'object',
        required: ['count'],
        properties: {
          count: { type: 'integer', minimum: 1, maximum: 10000 },
          expiresAt: { type: 'string', format: 'date-time' },
        },
      },
      UpdateBookCodeRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['blocked', 'unused', 'expired'] },
        },
      },
    },
    responses: {
      BadRequest: {
        description: 'Validation or domain error',
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ApiErrorEnvelope' } },
        },
      },
      Unauthorized: {
        description: 'Missing or invalid credentials / token',
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ApiErrorEnvelope' } },
        },
      },
      Forbidden: {
        description: 'Authenticated but insufficient permissions',
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ApiErrorEnvelope' } },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ApiErrorEnvelope' } },
        },
      },
      Conflict: {
        description: 'Conflict (e.g. email already registered)',
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ApiErrorEnvelope' } },
        },
      },
      UnprocessableEntity: {
        description: 'Business rule violation (e.g. sequential question gate)',
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ApiErrorEnvelope' } },
        },
      },
      TooManyRequests: {
        description: 'Login rate limited',
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ApiErrorEnvelope' } },
        },
      },
    },
  },
} as const;
