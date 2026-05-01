/**
 * OpenAPI 3.0 document for HTTP routes. Keep in sync with handlers in src/modules.
 * For generated specs from Zod, consider migrating to @hono/zod-openapi later.
 */
export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Admin Study Catalyst API',
    description:
      'Medical LMS backend (Hono on Cloudflare Workers). Auth uses Bearer access tokens; refresh tokens are httpOnly cookies (`refresh_token`). Content admin routes require admin role. R2 presigned uploads require S3 API credentials in worker vars.',
    version: '0.0.1',
  },
  servers: [{ url: '/', description: 'Current deployment (e.g. http://localhost:8787 in dev)' }],
  tags: [
    { name: 'Health', description: 'Liveness' },
    { name: 'Auth', description: 'Registration, session, password reset' },
    { name: 'Upload', description: 'R2 presigned URLs (any authenticated user)' },
    { name: 'Exam types', description: 'Admin — exam catalog CRUD' },
    { name: 'Units', description: 'Admin — units CRUD' },
    { name: 'Questions', description: 'Admin — learning (unit) questions' },
    { name: 'Exam questions', description: 'Admin — exam question bank' },
    { name: 'Book codes', description: 'Admin — book codes lifecycle' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
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
          'Creates a student account. Optional `bookCode` upgrades to premium when valid. Unknown JSON fields are ignored. Role cannot be escalated via this API.',
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
          'Returns a short-lived access token and sets `refresh_token` httpOnly cookie (also returned via Set-Cookie).',
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
          'Requires `refresh_token` cookie from login. Returns new access token; cookie is rotated.',
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
        description: 'Revokes refresh token in KV and clears the cookie.',
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
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { success: { type: 'boolean' } },
                  required: ['success'],
                },
              },
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
          'Always returns 200 with the same message shape to avoid email enumeration. Sends email via Resend when configured.',
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
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { message: { type: 'string' } },
                  required: ['message'],
                },
              },
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
        description: 'Token is delivered out-of-band (email link). Token is single-use.',
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
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { message: { type: 'string' } },
                  required: ['message'],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/upload/presign': {
      post: {
        tags: ['Upload'],
        security: [{ BearerAuth: [] }],
        summary: 'Presign R2 upload (unit image or question audio)',
        description:
          'Returns a time-limited PUT URL and object key. Configure `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`.',
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
    '/admin/exam-types': {
      get: {
        tags: ['Exam types'],
        security: [{ BearerAuth: [] }],
        summary: 'List exam types',
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
                  type: 'object',
                  required: ['examTypes'],
                  properties: { examTypes: { type: 'array', items: { type: 'object' } } },
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
                  type: 'object',
                  required: ['examType'],
                  properties: { examType: { type: 'object' } },
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
    '/admin/exam-types/{id}': {
      get: {
        tags: ['Exam types'],
        security: [{ BearerAuth: [] }],
        summary: 'Get exam type',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['examType'],
                  properties: { examType: { type: 'object' } },
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
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
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
                  type: 'object',
                  required: ['examType'],
                  properties: { examType: { type: 'object' } },
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
        description: '409 if any units reference this exam type.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { success: { type: 'boolean' } },
                  required: ['success'],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/admin/units': {
      get: {
        tags: ['Units'],
        security: [{ BearerAuth: [] }],
        summary: 'List units',
        parameters: [
          { name: 'examTypeId', in: 'query', schema: { type: 'string', format: 'uuid' } },
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
                  type: 'object',
                  required: ['units'],
                  properties: { units: { type: 'array', items: { type: 'object' } } },
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
                  type: 'object',
                  required: ['unit'],
                  properties: { unit: { type: 'object' } },
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
    '/admin/units/{id}': {
      get: {
        tags: ['Units'],
        security: [{ BearerAuth: [] }],
        summary: 'Get unit',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['unit'],
                  properties: { unit: { type: 'object' } },
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
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
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
                  type: 'object',
                  required: ['unit'],
                  properties: { unit: { type: 'object' } },
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
        description: '409 if the unit still has non-deleted learning questions.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Marked deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { success: { type: 'boolean' } },
                  required: ['success'],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/admin/questions': {
      get: {
        tags: ['Questions'],
        security: [{ BearerAuth: [] }],
        summary: 'List learning questions for a unit',
        parameters: [
          {
            name: 'unitId',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'uuid' },
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
                  type: 'object',
                  required: ['questions'],
                  properties: { questions: { type: 'array', items: { type: 'object' } } },
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
                  type: 'object',
                  required: ['question'],
                  properties: { question: { type: 'object' } },
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
    '/admin/questions/reorder': {
      patch: {
        tags: ['Questions'],
        security: [{ BearerAuth: [] }],
        summary: 'Reorder learning questions',
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
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { success: { type: 'boolean' } },
                  required: ['success'],
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
    '/admin/questions/{id}': {
      get: {
        tags: ['Questions'],
        security: [{ BearerAuth: [] }],
        summary: 'Get learning question',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['question'],
                  properties: { question: { type: 'object' } },
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
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
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
                  type: 'object',
                  required: ['question'],
                  properties: { question: { type: 'object' } },
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
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { success: { type: 'boolean' } },
                  required: ['success'],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/admin/exam-questions': {
      get: {
        tags: ['Exam questions'],
        security: [{ BearerAuth: [] }],
        summary: 'List exam bank questions',
        parameters: [
          { name: 'unitId', in: 'query', schema: { type: 'string', format: 'uuid' } },
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
                  type: 'object',
                  required: ['examQuestions'],
                  properties: { examQuestions: { type: 'array', items: { type: 'object' } } },
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
                  type: 'object',
                  required: ['examQuestion'],
                  properties: { examQuestion: { type: 'object' } },
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
    '/admin/exam-questions/{id}': {
      get: {
        tags: ['Exam questions'],
        security: [{ BearerAuth: [] }],
        summary: 'Get exam bank question',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['examQuestion'],
                  properties: { examQuestion: { type: 'object' } },
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
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
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
                  type: 'object',
                  required: ['examQuestion'],
                  properties: { examQuestion: { type: 'object' } },
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
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { success: { type: 'boolean' } },
                  required: ['success'],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/admin/book-codes': {
      get: {
        tags: ['Book codes'],
        security: [{ BearerAuth: [] }],
        summary: 'List book codes',
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
                  type: 'object',
                  required: ['bookCodes'],
                  properties: { bookCodes: { type: 'array', items: { type: 'object' } } },
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
                  type: 'object',
                  required: ['bookCode'],
                  properties: { bookCode: { type: 'object' } },
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
    '/admin/book-codes/export': {
      get: {
        tags: ['Book codes'],
        security: [{ BearerAuth: [] }],
        summary: 'Export all book codes as CSV (presigned download URL)',
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['downloadUrl'],
                  properties: { downloadUrl: { type: 'string' } },
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
    '/admin/book-codes/bulk': {
      post: {
        tags: ['Book codes'],
        security: [{ BearerAuth: [] }],
        summary: 'Bulk-generate book codes (max 100)',
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
                  type: 'object',
                  required: ['created'],
                  properties: { created: { type: 'integer' } },
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
    '/admin/book-codes/{id}': {
      patch: {
        tags: ['Book codes'],
        security: [{ BearerAuth: [] }],
        summary: 'Update book code status',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
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
                  type: 'object',
                  required: ['bookCode'],
                  properties: { bookCode: { type: 'object' } },
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
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { success: { type: 'boolean' } },
                  required: ['success'],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': { $ref: '#/components/responses/Conflict' },
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
        description: '15-minute access token from /auth/login or /auth/refresh',
      },
    },
    schemas: {
      HealthResponse: {
        type: 'object',
        required: ['status', 'ts'],
        properties: {
          status: { type: 'string', example: 'ok' },
          ts: { type: 'string', format: 'date-time' },
        },
      },
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
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['admin', 'student'] },
          membershipType: { type: 'string', enum: ['normal', 'premium'] },
        },
      },
      RegisterResponse: {
        type: 'object',
        required: ['user'],
        properties: { user: { $ref: '#/components/schemas/UserPublic' } },
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
        type: 'object',
        required: ['accessToken'],
        properties: { accessToken: { type: 'string' } },
      },
      RefreshResponse: {
        type: 'object',
        required: ['accessToken'],
        properties: { accessToken: { type: 'string' } },
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
        type: 'object',
        required: ['uploadUrl', 'key'],
        properties: {
          uploadUrl: { type: 'string' },
          key: { type: 'string' },
        },
      },
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
      CreateUnitRequest: {
        type: 'object',
        required: ['unitName', 'examTypeId'],
        properties: {
          unitName: { type: 'string', minLength: 1, maxLength: 200 },
          examTypeId: { type: 'string', format: 'uuid' },
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
          examTypeId: { type: 'string', format: 'uuid' },
          tags: { type: 'array', items: { type: 'string' } },
          accessType: { type: 'string', enum: ['free', 'premium'] },
          imageKey: { type: 'string' },
          mimeType: { type: 'string' },
        },
      },
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
          unitId: { type: 'string', format: 'uuid' },
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
                id: { type: 'string', format: 'uuid' },
                sequenceOrder: { type: 'integer', minimum: 0 },
              },
            },
          },
        },
      },
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
          unitId: { type: 'string', format: 'uuid' },
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
      ErrorBody: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          code: { type: 'string' },
        },
      },
    },
    responses: {
      BadRequest: {
        description: 'Validation or domain error',
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ErrorBody' } },
        },
      },
      Unauthorized: {
        description: 'Missing or invalid credentials / token',
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ErrorBody' } },
        },
      },
      Forbidden: {
        description: 'Authenticated but insufficient permissions',
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ErrorBody' } },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ErrorBody' } },
        },
      },
      Conflict: {
        description: 'Conflict (e.g. email already registered)',
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ErrorBody' } },
        },
      },
      TooManyRequests: {
        description: 'Login rate limited',
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ErrorBody' } },
        },
      },
    },
  },
} as const;
